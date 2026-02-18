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

  // إعدادات إضافية
  settings: {
    welcomeMessage: { type: String, default: '' },
    farewellMessage: { type: String, default: '' },
    maxWarnings: { type: Number, default: 3 },
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

  // وقت الإنشاء والتحديث
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GroupProtection', groupProtectionSchema);
