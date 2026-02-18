const mongoose = require('mongoose');

const groupMemberSchema = new mongoose.Schema({
  groupId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: Number,
    required: true,
    index: true
  },
  // نظام XP والمستويات
  xp: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  // نظام العملات الخاص بالمجموعة
  coins: {
    type: Number,
    default: 0
  },
  // معلومات اللقب
  title: {
    type: String,
    default: ''
  },
  customTitle: {
    type: String,
    default: ''
  },
  // إحصائيات الرسائل
  messagesCount: {
    type: Number,
    default: 0
  },
  // نظام المكافآت اليومية
  dailyStreak: {
    type: Number,
    default: 0
  },
  lastDaily: {
    type: Date,
    default: null
  },
  // معلومات إضافية
  firstJoin: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  // إجمالي XP المكتسب (للإحصائيات)
  totalXpEarned: {
    type: Number,
    default: 0
  },
  // إجمالي العملات المكتسبة
  totalCoinsEarned: {
    type: Number,
    default: 0
  },
  // نظام البنك
  bankBalance: {
    type: Number,
    default: 0
  },
  bankDepositsTotal: {
    type: Number,
    default: 0
  },
  lastBankInterest: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Compound index for efficient queries
groupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });
groupMemberSchema.index({ groupId: 1, xp: -1 }); // For leaderboard queries

module.exports = mongoose.models.GroupMember || mongoose.model('GroupMember', groupMemberSchema);
