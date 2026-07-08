import mongoose from 'mongoose';

const pickupSchema = new mongoose.Schema({
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
  pickupVerifiedAt: {
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

const Pickup = mongoose.model('Pickup', pickupSchema);
export default Pickup;
