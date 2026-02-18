/**
 * نموذج حماية المجموعات
 * Group Protection Model
 */
const mongoose = require('mongoose');

const groupProtectionSchema = new mongoose.Schema({
  groupId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  groupTitle: {
    type: String,
    default: ''
  },
  // إعدادات القفل
  locks: {
    // القفل الأساسي
    chat: { type: Boolean, default: false },
    usernames: { type: Boolean, default: false },
    photos: { type: Boolean, default: false },
    uploading: { type: Boolean, default: false },
    voice: { type: Boolean, default: false },
    greeting: { type: Boolean, default: false },
    leaving: { type: Boolean, default: false },
    whispers: { type: Boolean, default: false },
    songs: { type: Boolean, default: false },
    translation: { type: Boolean, default: false },
    replies: { type: Boolean, default: false },
    forwarding: { type: Boolean, default: false },
    notifications: { type: Boolean, default: false },
    tags: { type: Boolean, default: false },
    deleteLink: { type: Boolean, default: false },
    kickMe: { type: Boolean, default: false },
    whoAdded: { type: Boolean, default: false },
    games: { type: Boolean, default: false },
    stories: { type: Boolean, default: false },
    horoscopes: { type: Boolean, default: false },
    nameMeanings: { type: Boolean, default: false },
    welcome: { type: Boolean, default: false },

    // طريقة المنع
    lockMethod: { type: String, enum: ['mute', 'kick'], default: 'mute' }
  },

  // المحظورات
  prohibited: {
    links: { type: Boolean, default: false },
    forwarding: { type: Boolean, default: false },
    popcorn: { type: Boolean, default: false },
    bots: { type: Boolean, default: false },
    custom: { type: [String], default: [] }
  },

  // إعدادات التحذيرات
  warnings: [{
    userId: Number,
    reason: String,
    warnedBy: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  maxWarnings: { type: Number, default: 3 },
  autoAction: { type: String, enum: ['mute', 'kick', 'ban'], default: 'kick' },

  // إعدادات إضافية
  settings: {
    welcomeMessage: { type: String, default: '' },
    farewellMessage: { type: String, default: '' },
    antiFlood: { type: Boolean, default: false },
    floodLimit: { type: Number, default: 5 }
  },

  // معلومات المالك والأدمنز
  ownerId: { type: Number, default: null },
  ownerName: { type: String, default: '' },
  admins: [{
    userId: Number,
    name: String,
    username: String
  }],

  // نظام القواعد
  rules: { type: String, default: '' },
  requireAcceptRules: { type: Boolean, default: false },

  // نظام الترحيب
  welcome: {
    enabled: { type: Boolean, default: false },
    message: { type: String, default: '' },
    showJoinInfo: { type: Boolean, default: true },
    buttons: { type: Boolean, default: false }
  },
  farewell: {
    enabled: { type: Boolean, default: false },
    message: { type: String, default: '' }
  },

  // إعدادات تتبع الكلمات المفتاحية
  keywordAlerts: [{
    keyword: { type: String, required: true },
    notifyAdmins: { type: Boolean, default: true },
    action: { type: String, enum: ['notify', 'delete', 'warn'], default: 'notify' },
    addedBy: { type: Number, default: null },
    addedAt: { type: Date, default: Date.now }
  }],
  notifyOnKeywords: { type: Boolean, default: true },

  // وقت الإنشاء والتحديث
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  // نظام الأذونات والصلاحيات
  permissions: {
    // أذونات عامة
    canWarn: { type: Boolean, default: true },
    canMute: { type: Boolean, default: true },
    canKick: { type: Boolean, default: false },
    canBan: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: true },
    canPin: { type: Boolean, default: false },
    canChangeInfo: { type: Boolean, default: false },
    // أذونات الألعاب
    canPlayGames: { type: Boolean, default: true },
    canUseCommands: { type: Boolean, default: true },
    canSendMedia: { type: Boolean, default: true },
    canSendPolls: { type: Boolean, default: true },
    canSendInvites: { type: Boolean, default: false },
    // أذونات التفاعل
    canReact: { type: Boolean, default: true },
    canUseBot: { type: Boolean, default: true }
  }
});

module.exports = mongoose.model('GroupProtection', groupProtectionSchema);
