const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true },
    amount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const auctionSchema = new mongoose.Schema({
  itemId: { type: Number, required: true },
  itemName: { type: String, required: true },
  basePrice: { type: Number, required: true },
  minIncrement: { type: Number, required: true },
  status: { type: String, enum: ['active', 'ended'], default: 'active' },
  highestBid: {
    userId: { type: Number },
    amount: { type: Number }
  },
  bids: { type: [bidSchema], default: [] },
  endAt: { type: Date, required: true },
  lastBidAt: { type: Date },
  lastReminderAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Auction', auctionSchema);
