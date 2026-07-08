import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  donationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donation',
    required: true,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: [true, 'Please provide a rating between 1 and 5'],
  },
  comment: {
    type: String,
    trim: true,
    default: '',
  }
}, {
  timestamps: true,
});

reviewSchema.index({ recipientId: 1 });

const Review = mongoose.model('Review', reviewSchema);
export default Review;
