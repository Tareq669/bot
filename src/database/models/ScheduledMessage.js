const mongoose = require('mongoose');

const scheduledMessageSchema = new mongoose.Schema({
  groupId: { type: Number, required: true, index: true },
  message: { type: String, required: true },
  scheduledTime: { type: Date, required: true },
  repeatType: { type: String, enum: ['once', 'daily', 'weekly', 'monthly'], default: 'once' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Index for efficient queries
scheduledMessageSchema.index({ scheduledTime: 1, isActive: 1 });

module.exports = mongoose.model('ScheduledMessage', scheduledMessageSchema);
