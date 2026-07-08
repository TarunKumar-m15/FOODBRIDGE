import mongoose from 'mongoose';

const donorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  organizationName: {
    type: String,
    required: [true, 'Please specify your organization or donor name'],
    trim: true,
  },
  donorType: {
    type: String,
    enum: ['individual', 'restaurant', 'hotel', 'corporate', 'household'],
    required: true,
  },
  taxId: {
    type: String,
    default: '',
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Please provide the coordinates [long, lat]'],
    },
    address: {
      type: String,
      required: [true, 'Please provide the formatted address'],
    }
  }
}, {
  timestamps: true,
});

donorSchema.index({ location: '2dsphere' });

const Donor = mongoose.model('Donor', donorSchema);
export default Donor;
