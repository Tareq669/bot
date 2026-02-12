const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['earn', 'spend', 'transfer', 'reward'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  reason: String,
  relatedUserId: Number,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
