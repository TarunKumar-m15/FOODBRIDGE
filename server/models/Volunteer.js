import mongoose from 'mongoose';

const volunteerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  vehicleType: {
    type: String,
    enum: ['bicycle', 'motorcycle', 'car', 'walk'],
    required: [true, 'Please select your vehicle type'],
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0],
    }
  }
}, {
  timestamps: true,
});

volunteerSchema.index({ currentLocation: '2dsphere' });

const Volunteer = mongoose.model('Volunteer', volunteerSchema);
export default Volunteer;
