import mongoose from 'mongoose';

const deliverySchema = new mongoose.Schema({
  donationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donation',
    required: true,
    unique: true,
  },
  volunteerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ngoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  deliveryVerifiedAt: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'failed'],
    default: 'pending',
  }
}, {
  timestamps: true,
});

const Delivery = mongoose.model('Delivery', deliverySchema);
export default Delivery;
