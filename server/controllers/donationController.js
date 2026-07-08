import Donation from '../models/Donation.js';
import User from '../models/User.js';
import NGO from '../models/NGO.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { generateQRCodeDataURL } from '../services/qrService.js';
import { classifyFoodImage, predictShelfLifeHours, predictShelfLifeJS } from '../services/aiPredictor.js';
import { sendNewDonationAlert, sendDonationClaimedAlert, sendDeliveryUpdateAlert } from '../services/emailService.js';
import { uploadToCloudinary } from '../middleware/upload.js';

export const createDonation = catchAsync(async (req, res, next) => {
  const {
    foodItems,
    cookedAt,
    expiryTime,
    pickupLocation,
    imageUrl,
    category,
    manufacturingDate,
    storageMethod,
    temperature,
    humidity,
    packagingType,
    freshnessScore
  } = req.body;
  
  const donorId = req.user._id;

  let finalImageUrl = imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
  if (req.file) {
    try {
      finalImageUrl = await uploadToCloudinary(req.file.buffer);
    } catch (err) {
      console.error('Cloudinary upload failure:', err.message);
    }
  }

  // 1) Compute base classification
  const sampleFoodName = foodItems[0]?.name || '';
  const aiClassResult = classifyFoodImage(sampleFoodName);

  // Map JS classification tags to Python ML category names
  const detectedCategory = category || {
    'veg': 'Vegetable',
    'non-veg': 'Meat',
    'vegan': 'Vegetable',
    'mixed': 'Cooked Food'
  }[aiClassResult.classification] || 'Cooked Food';

  // 2) Query the Python ML microservice with fallbacks
  let mlResult = null;
  const predictionPayload = {
    foodName: sampleFoodName,
    category: detectedCategory,
    storageMethod: storageMethod || 'Room Temperature',
    temperature: temperature !== undefined ? parseFloat(temperature) : undefined,
    humidity: humidity !== undefined ? parseFloat(humidity) : undefined,
    packaging: packagingType || 'Open',
    freshnessScore: freshnessScore !== undefined ? parseInt(freshnessScore) : 7,
    donationDate: new Date().toISOString()
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
    const mlResponse = await fetch(`${mlServiceUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(predictionPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (mlResponse.ok) {
      const mlData = await mlResponse.json();
      mlResult = mlData.data;
      console.log('🤖 [AI Service] Python ML prediction retrieved successfully.');
    } else {
      console.warn('⚠ [AI Service] Flask returned an error status. Using JS fallback.');
    }
  } catch (error) {
    console.warn('ℹ [AI Service] Flask microservice offline or timed out. Falling back to local JS rule engine.');
  }

  // If ML service is offline or fails, execute local JS engine
  if (!mlResult) {
    mlResult = predictShelfLifeJS({
      category: detectedCategory,
      storageMethod: predictionPayload.storageMethod,
      freshnessScore: predictionPayload.freshnessScore,
      packagingType: predictionPayload.packaging,
      donationDate: new Date()
    });
  }

  // 3) Generate QR Code secret
  const uniqueSecret = `zh_don_${donorId}_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

  const newDonation = await Donation.create({
    donorId,
    foodItems,
    cookedAt,
    expiryTime: new Date(mlResult.estimatedExpiryDate),
    pickupLocation,
    imageUrl: finalImageUrl,
    qrCodeSecret: uniqueSecret,
    manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
    storageMethod: predictionPayload.storageMethod,
    temperature: predictionPayload.temperature || 22.0,
    humidity: predictionPayload.humidity || 50.0,
    packagingType: predictionPayload.packaging,
    freshnessScore: predictionPayload.freshnessScore,
    aiClassification: aiClassResult.classification,
    aiConfidence: mlResult.confidenceScore,
    aiShelfLifeHours: Math.round(mlResult.predictedShelfLifeDays * 24),
    aiPredictedShelfLifeDays: mlResult.predictedShelfLifeDays,
    aiEstimatedExpiryDate: new Date(mlResult.estimatedExpiryDate),
    aiFreshnessPercentage: mlResult.freshnessPercentage,
    aiSpoilageRisk: mlResult.spoilageRisk,
    aiRecommendation: mlResult.recommendation
  });

  // 5) Generate base64 QR Code string
  const qrCodeImage = await generateQRCodeDataURL(uniqueSecret);

  // Dispatch background email notifications to nearby/active NGOs and Volunteers
  User.find({ role: { $in: ['ngo', 'volunteer'] }, status: 'active' })
    .then((users) => {
      users.forEach((u) => {
        sendNewDonationAlert(u.email, newDonation).catch(err => console.error(err.message));
      });
    })
    .catch((err) => console.error('Alerts dispatch error:', err.message));

  // Broadcast new donation via Socket.io
  req.io.emit('donation_created', newDonation);

  res.status(201).json({
    status: 'success',
    data: {
      donation: newDonation,
      qrCodeImage,
    },
  });
});

export const getDonations = catchAsync(async (req, res, next) => {
  const { lng, lat, radius, status, search, category, minQuantity, sortBy } = req.query;
  const filter = {};

  // Status filtering
  if (status) {
    filter.status = status;
  }

  // Keyword search on food item names
  if (search) {
    filter['foodItems.name'] = { $regex: search, $options: 'i' };
  }

  // Category filtering matching AI classification (veg, non-veg, vegan, mixed)
  if (category) {
    filter.aiClassification = category;
  }

  // Minimum quantity filter
  if (minQuantity) {
    // Check if foodItems array has at least one item meeting the threshold
    filter['foodItems.quantity'] = { $gte: parseFloat(minQuantity) };
  }

  // Geospatial filtering if lng and lat are provided
  if (lng && lat) {
    const longitude = parseFloat(lng);
    const latitude = parseFloat(lat);
    const maxDistanceKm = parseFloat(radius) || 10; // Default 10km radius

    filter.pickupLocation = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistanceKm * 1000, // Distance in meters
      },
    };
  }

  // Configure sorting options
  let sortOption = { createdAt: -1 };
  if (sortBy === 'expiry') {
    sortOption = { expiryTime: 1 }; // soonest expiring first
  } else if (sortBy === 'quantity') {
    sortOption = { 'foodItems.quantity': -1 }; // largest quantity first
  }

  const donations = await Donation.find(filter)
    .populate('donorId', 'name phone profileImage')
    .populate('assignedNgoId', 'name phone')
    .populate('assignedVolunteerId', 'name phone')
    .sort(sortOption);

  const ngoIds = donations.map(d => d.assignedNgoId?._id || d.assignedNgoId).filter(Boolean);
  const ngos = await NGO.find({ userId: { $in: ngoIds } });
  const ngoMap = ngos.reduce((acc, n) => {
    acc[n.userId.toString()] = n.location;
    return acc;
  }, {});

  const processedDonations = donations.map(d => {
    const json = d.toJSON();
    if (json.assignedNgoId) {
      const ngoLoc = ngoMap[json.assignedNgoId._id.toString()];
      if (ngoLoc) {
        json.ngoLocation = ngoLoc;
      }
    }
    return json;
  });

  res.status(200).json({
    status: 'success',
    results: processedDonations.length,
    data: {
      donations: processedDonations,
    },
  });
});

export const getDonationById = catchAsync(async (req, res, next) => {
  const donation = await Donation.findById(req.params.id)
    .populate('donorId', 'name phone email profileImage')
    .populate('assignedNgoId', 'name phone email')
    .populate('assignedVolunteerId', 'name phone email');

  if (!donation) {
    return next(new AppError('No donation found with that ID', 404));
  }

  const json = donation.toJSON();
  if (json.assignedNgoId) {
    const ngoProfile = await NGO.findOne({ userId: json.assignedNgoId._id || json.assignedNgoId });
    if (ngoProfile) {
      json.ngoLocation = ngoProfile.location;
    }
  }

  res.status(200).json({
    status: 'success',
    data: {
      donation: json,
    },
  });
});

export const claimDonationNGO = catchAsync(async (req, res, next) => {
  const donation = await Donation.findById(req.params.id);

  if (!donation) {
    return next(new AppError('No donation found with that ID', 404));
  }

  if (donation.status !== 'pending') {
    return next(new AppError('This donation has already been claimed or cancelled.', 400));
  }

  donation.assignedNgoId = req.user._id;
  donation.status = 'accepted';
  await donation.save();

  // Send claimed notification to donor
  User.findById(donation.donorId)
    .then((donor) => {
      if (donor) {
        sendDonationClaimedAlert(donor.email, donation, req.user.name).catch(err => console.error(err.message));
      }
    })
    .catch((err) => console.error('Failed to notify donor of claim:', err.message));

  // Broadcast status change via Socket.io
  req.io.emit('donation_status_changed', { donationId: donation._id, status: 'accepted', donation });

  res.status(200).json({
    status: 'success',
    data: {
      donation,
    },
  });
});

export const claimPickupVolunteer = catchAsync(async (req, res, next) => {
  const donation = await Donation.findById(req.params.id);

  if (!donation) {
    return next(new AppError('No donation found with that ID', 404));
  }

  if (donation.status !== 'accepted') {
    return next(new AppError('This donation must be accepted by an NGO before it can be picked up.', 400));
  }

  donation.assignedVolunteerId = req.user._id;
  donation.status = 'picking_up';
  await donation.save();

  // Dispatch background update notifications to Donor and NGO
  User.findById(donation.donorId)
    .then((donor) => {
      if (donor) {
        sendDeliveryUpdateAlert(donor.email, donation, 'picking_up', req.user.name).catch(err => console.error(err.message));
      }
    })
    .catch((err) => console.error(err.message));

  if (donation.assignedNgoId) {
    User.findById(donation.assignedNgoId)
      .then((ngo) => {
        if (ngo) {
          sendDeliveryUpdateAlert(ngo.email, donation, 'picking_up', req.user.name).catch(err => console.error(err.message));
        }
      })
      .catch((err) => console.error(err.message));
  }

  // Broadcast status change via Socket.io
  req.io.emit('donation_status_changed', { donationId: donation._id, status: 'picking_up', donation });

  res.status(200).json({
    status: 'success',
    data: {
      donation,
    },
  });
});

export const getPublicStats = catchAsync(async (req, res, next) => {
  // 1) All registered volunteers count
  const activeVolunteersCount = await User.countDocuments({ role: 'volunteer' });

  // 2) Meals redirected/recovered (Sum of all foodItem quantities where status is not cancelled)
  const activeDonations = await Donation.find({ status: { $ne: 'cancelled' } });
  let mealsRecovered = 0;
  activeDonations.forEach(d => {
    d.foodItems.forEach(item => {
      mealsRecovered += item.quantity;
    });
  });

  // 3) Avg delivery duration (in minutes)
  const deliveredDonations = await Donation.find({ status: 'delivered' });
  let avgDeliveryDurationMins = 35; // Default fallback metric
  if (deliveredDonations.length > 0) {
    let totalDuration = 0;
    deliveredDonations.forEach(d => {
      const duration = (new Date(d.updatedAt) - new Date(d.createdAt)) / (1000 * 60);
      totalDuration += duration;
    });
    avgDeliveryDurationMins = Math.round(totalDuration / deliveredDonations.length);
  }

  // 4) Verified handoffs percent (percentage of delivered/picked_up out of all claimed)
  const claimedCount = await Donation.countDocuments({ status: { $in: ['accepted', 'picking_up', 'picked_up', 'delivering', 'delivered'] } });
  const verifiedCount = await Donation.countDocuments({ status: 'delivered' });
  const verifiedHandoffsPercent = claimedCount > 0 ? Math.round((verifiedCount / claimedCount) * 100) : 100;

  res.status(200).json({
    status: 'success',
    data: {
      activeVolunteers: activeVolunteersCount || 0,
      mealsRecovered: mealsRecovered || 0,
      avgDeliveryDurationMins,
      verifiedHandoffsPercent,
    }
  });
});
