import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ['donor', 'ngo', 'volunteer', 'admin', 'super-admin'],
    required: [true, 'Please choose a role'],
  },
  phone: {
    type: String,
    required: [true, 'Please provide a phone number'],
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'pending_approval'],
    default: function() {
      // NGOs require admin approval; others start as active for simplified onboarding/demonstration
      return this.role === 'ngo' ? 'pending_approval' : 'active';
    },
  },
  profileImage: {
    type: String,
    default: '',
  },
  refreshToken: {
    type: String,
    select: false,
  }
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method to check password match
userSchema.methods.comparePassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model('User', userSchema);
export default User;
