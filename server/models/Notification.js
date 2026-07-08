import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['donation', 'pickup', 'system'],
    default: 'system',
  },
  read: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true,
});

notificationSchema.index({ recipientId: 1, read: 1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
