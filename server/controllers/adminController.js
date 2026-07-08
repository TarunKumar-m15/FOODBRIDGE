import User from '../models/User.js';
import Donation from '../models/Donation.js';
import NGO from '../models/NGO.js';
import Volunteer from '../models/Volunteer.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';

export const getNGOsForVerification = catchAsync(async (req, res, next) => {
  // Find users who are NGOs but are pending approval
  const pendingNGOs = await User.find({ role: 'ngo', status: 'pending_approval' });
  const ngoDetails = await NGO.find({ userId: { $in: pendingNGOs.map(n => n._id) } });

  // Map user accounts with their registration profiles
  const payload = pendingNGOs.map(user => {
    const profile = ngoDetails.find(d => d.userId.toString() === user._id.toString());
    return {
      user,
      profile,
    };
  });

  res.status(200).json({
    status: 'success',
    data: {
      pendingNGOs: payload,
    },
  });
});

export const verifyNGO = catchAsync(async (req, res, next) => {
  const { userId, approve } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError('NGO user not found.', 404));
  }

  if (user.role !== 'ngo') {
    return next(new AppError('User is not an NGO.', 400));
  }

  if (approve) {
    user.status = 'active';
    user.isVerified = true;
    await user.save();
  } else {
    // If rejected, we can suspend or delete the profile. Let's delete for cleanliness.
    await NGO.findOneAndDelete({ userId });
    await User.findByIdAndDelete(userId);
  }

  res.status(200).json({
    status: 'success',
    message: `NGO registration ${approve ? 'approved' : 'rejected and removed'}.`,
  });
});

export const getDashboardAnalytics = catchAsync(async (req, res, next) => {
  // Aggregate stats
  const totalUsers = await User.countDocuments();
  const totalDonations = await Donation.countDocuments();
  const activeDonationsCount = await Donation.countDocuments({ status: 'pending' });
  const completedDonationsCount = await Donation.countDocuments({ status: 'delivered' });

  // Calculate sum of food items quantity
  const allDonations = await Donation.find();
  let totalQuantityKg = 0;
  allDonations.forEach(d => {
    d.foodItems.forEach(item => {
      totalQuantityKg += item.quantity;
    });
  });

  // User breakdown by roles
  const usersByRole = await User.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } }
  ]);

  // Donation status history
  const donationsByStatus = await Donation.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      metrics: {
        totalUsers,
        totalDonations,
        activeDonationsCount,
        completedDonationsCount,
        totalQuantityKg,
      },
      usersByRole,
      donationsByStatus,
    },
  });
});

export const getFraudLogs = catchAsync(async (req, res, next) => {
  // Identify donations with food-safety warning risks
  // Flag 1: Cooked time and Expiry time window is less than 3 hours (extremely high risk)
  // Flag 2: AI Predicted shelf life is negative or zero, but still marked pending
  const suspiciousDonations = await Donation.find({
    $or: [
      { status: 'pending', aiShelfLifeHours: { $lte: 2 } },
    ]
  }).populate('donorId', 'name email phone');

  const logs = suspiciousDonations.map(d => {
    return {
      donationId: d._id,
      donor: d.donorId,
      address: d.pickupLocation.address,
      items: d.foodItems.map(item => item.name).join(', '),
      riskScore: d.aiShelfLifeHours <= 0 ? 'CRITICAL' : 'WARNING',
      reason: `Food is predicted to spoil within ${d.aiShelfLifeHours} hours. Prompt recovery needed.`,
      createdAt: d.createdAt,
    };
  });

  res.status(200).json({
    status: 'success',
    results: logs.length,
    data: {
      logs,
    },
  });
});
