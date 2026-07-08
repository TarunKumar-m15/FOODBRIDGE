import mongoose from 'mongoose';

const ngoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  registrationNumber: {
    type: String,
    required: [true, 'Please provide NGO registration number'],
    unique: true,
  },
  documentUrl: {
    type: String,
    required: [true, 'Please upload verification documents'],
  },
  contactPerson: {
    type: String,
    required: [true, 'Please specify contact person name'],
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

ngoSchema.index({ location: '2dsphere' });

const NGO = mongoose.model('NGO', ngoSchema);
export default NGO;
