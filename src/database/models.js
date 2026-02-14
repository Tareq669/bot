const mongoose = require('mongoose');
const Auction = require('./models/Auction');

/**
 * نموذج المستخدم
 */
const userSchema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true },
  firstName: String,
  username: String,
  coins: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  gamesComplayed: { type: Number, default: 0 },
  khatmaCount: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  inventory: [
    {
      itemId: String,
      itemName: String,
      quantity: { type: Number, default: 1 },
      boughtAt: Date
    }
  ],
  dailyQuests: {
    games: { type: Boolean, default: false },
    quran: { type: Boolean, default: false },
    adhkar: { type: Boolean, default: false },
    interact: { type: Boolean, default: false }
  },
  lastDailyReward: { type: Date, default: null },
  lastActivity: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

/**
 * نموذج المجموعات
 */
const groupSchema = new mongoose.Schema({
  groupId: { type: Number, required: true, unique: true },
  groupName: String,
  settings: {
    antiSpam: { type: Boolean, default: true },
    antiLink: { type: Boolean, default: false },
    welcomeMessage: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now }
});

/**
 * نموذج المعاملات
 */
const transactionSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  type: {
    type: String,
    enum: ['earn', 'spend', 'purchase', 'transfer', 'reward', 'penalty'],
    required: true
  },
  amount: { type: Number, required: true },
  description: String,
  reason: String,
  relatedUserId: Number,
  itemId: mongoose.Schema.Types.ObjectId,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  },
  timestamp: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

/**
 * نموذج عناصر المتجر
 */
const shopItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['weapon', 'armor', 'potion', 'cosmetic', 'other']
  },
  icon: {
    type: String,
    default: '📦'
  },
  active: {
    type: Boolean,
    default: true
  },
  limited: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * نموذج إحصائيات اللعبة
 */
const gameStatsSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  gameType: String,
  score: Number,
  reward: Number,
  playedAt: { type: Date, default: Date.now }
});

// إنشاء النماذج
const User = mongoose.model('User', userSchema);
const Group = mongoose.model('Group', groupSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const ShopItem = mongoose.model('ShopItem', shopItemSchema);
const GameStats = mongoose.model('GameStats', gameStatsSchema);

// تصدير جميع النماذج
module.exports = {
  User,
  Group,
  Transaction,
  ShopItem,
  GameStats,
  Auction
};