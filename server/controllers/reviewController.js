import Review from '../models/Review.js';
import Donation from '../models/Donation.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';

// Create a review for a completed donation
export const createReview = catchAsync(async (req, res, next) => {
  const { donationId, rating, comment } = req.body;
  const senderId = req.user._id;

  if (!donationId || !rating) {
    return next(new AppError('Please provide a donationId and a rating (1-5).', 400));
  }

  const donation = await Donation.findById(donationId);
  if (!donation) {
    return next(new AppError('No donation found with that ID.', 404));
  }

  // Ensure donation is delivered/completed
  if (donation.status !== 'delivered') {
    return next(new AppError('You can only review completed (delivered) donations.', 400));
  }

  // Determine recipient based on roles
  let recipientId = null;
  if (req.user.role === 'donor') {
    // Donor reviews the NGO
    if (donation.donorId.toString() !== senderId.toString()) {
      return next(new AppError('You are not the donor of this donation.', 403));
    }
    recipientId = donation.assignedNgoId;
    if (!recipientId) {
      return next(new AppError('No NGO was assigned to this donation.', 400));
    }
  } else if (req.user.role === 'ngo') {
    // NGO reviews the Volunteer
    if (donation.assignedNgoId.toString() !== senderId.toString()) {
      return next(new AppError('You are not the NGO assigned to this donation.', 403));
    }
    recipientId = donation.assignedVolunteerId;
    if (!recipientId) {
      return next(new AppError('No Volunteer was assigned to this donation.', 400));
    }
  } else if (req.user.role === 'volunteer') {
    // Volunteer reviews the Donor
    if (donation.assignedVolunteerId.toString() !== senderId.toString()) {
      return next(new AppError('You are not the volunteer assigned to this donation.', 403));
    }
    recipientId = donation.donorId;
  } else {
    return next(new AppError('This role is not authorized to leave reviews.', 403));
  }

  // Check if a review already exists from this sender for this donation
  const existingReview = await Review.findOne({ senderId, donationId });
  if (existingReview) {
    return next(new AppError('You have already submitted a review for this donation.', 400));
  }

  const review = await Review.create({
    senderId,
    recipientId,
    donationId,
    rating,
    comment: comment || '',
  });

  res.status(201).json({
    status: 'success',
    data: {
      review,
    },
  });
});

// Get reviews received by a user (recipient)
export const getReviewsForUser = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  const reviews = await Review.find({ recipientId: userId })
    .populate('senderId', 'name role profileImage')
    .sort({ createdAt: -1 });

  // Calculate average rating
  let averageRating = 0;
  if (reviews.length > 0) {
    const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    averageRating = parseFloat((sum / reviews.length).toFixed(1));
  }

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews,
      averageRating,
    },
  });
});

// Get reviews submitted for a specific donation
export const getReviewsForDonation = catchAsync(async (req, res, next) => {
  const { donationId } = req.params;

  const reviews = await Review.find({ donationId })
    .populate('senderId', 'name role profileImage')
    .populate('recipientId', 'name role profileImage');

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews,
    },
  });
});
