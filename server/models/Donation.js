import mongoose from 'mongoose';

const foodItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, default: 'kg' },
  foodType: { type: String, enum: ['veg', 'non-veg', 'vegan', 'mixed'], required: true },
  shelfLifeHours: { type: Number, default: 24 }
});

const donationSchema = new mongoose.Schema({
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  foodItems: [foodItemSchema],
  cookedAt: {
    type: Date,
    required: [true, 'Please provide the cooked time'],
  },
  expiryTime: {
    type: Date,
    required: [true, 'Please provide the expiry time'],
  },
  pickupLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
    address: {
      type: String,
      required: true,
    }
  },
  imageUrl: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'picking_up', 'picked_up', 'delivering', 'delivered', 'cancelled'],
    default: 'pending',
  },
  qrCodeSecret: {
    type: String,
    required: true,
  },
  assignedVolunteerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  assignedNgoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  manufacturingDate: {
    type: Date,
    default: null,
  },
  donationDate: {
    type: Date,
    default: Date.now,
  },
  storageMethod: {
    type: String,
    enum: ['Room Temperature', 'Refrigerator', 'Freezer'],
    default: 'Room Temperature',
  },
  temperature: {
    type: Number,
    default: 22.0,
  },
  humidity: {
    type: Number,
    default: 50.0,
  },
  packagingType: {
    type: String,
    enum: ['Open', 'Sealed', 'Vacuum Packed'],
    default: 'Open',
  },
  freshnessScore: {
    type: Number,
    min: 1,
    max: 10,
    default: 7,
  },
  aiClassification: {
    type: String,
    default: 'pending_classification',
  },
  aiConfidence: {
    type: Number,
    default: 0.0,
  },
  aiShelfLifeHours: {
    type: Number,
    default: null,
  },
  aiPredictedShelfLifeDays: {
    type: Number,
    default: null,
  },
  aiEstimatedExpiryDate: {
    type: Date,
    default: null,
  },
  aiFreshnessPercentage: {
    type: Number,
    default: null,
  },
  aiSpoilageRisk: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Low',
  },
  aiRecommendation: {
    type: String,
    default: 'Safe to Donate',
  }
}, {
  timestamps: true,
});

donationSchema.index({ pickupLocation: '2dsphere' });
donationSchema.index({ status: 1 });
donationSchema.index({ donorId: 1 });

const Donation = mongoose.model('Donation', donationSchema);
export default Donation;
