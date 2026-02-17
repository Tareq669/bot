const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  firstName: String,
  lastName: String,
  username: String,
  profilePic: String,
  bio: String,
  location: String,
  dateOfBirth: Date,
  joinDate: {
    type: Date,
    default: Date.now
  },

  // Legacy core stats
  level: {
    type: Number,
    default: 1
  },
  xp: {
    type: Number,
    default: 0
  },
  coins: {
    type: Number,
    default: 100
  },
  totalEarnings: {
    type: Number,
    default: 100
  },
  totalSpending: {
    type: Number,
    default: 0
  },

  dailyReward: {
    lastClaimed: Date,
    streak: {
      type: Number,
      default: 0
    }
  },

  gamesPlayed: {
    total: {
      type: Number,
      default: 0
    },
    wins: {
      type: Number,
      default: 0
    },
    favorite: String,
    lastPlayDate: Date
  },

  inventory: [{
    itemId: String,
    itemName: String,
    quantity: Number,
    boughtAt: Date
  }],

  khatmaProgress: {
    currentPage: {
      type: Number,
      default: 1
    },
    percentComplete: {
      type: Number,
      default: 0
    },
    startDate: Date,
    endDate: Date,
    lastRead: Date,
    lastNotified: Date,
    completionCount: {
      type: Number,
      default: 0
    },
    daysActive: {
      type: Number,
      default: 0
    }
  },

  badges: [String],
  badgeDetails: [{
    id: String,
    name: String,
    description: String,
    icon: String,
    earnedAt: Date,
    source: String
  }],
  achievements: [String],

  savedKhatmas: [{
    savedAt: Date,
    page: Number,
    percent: Number,
    note: String
  }],

  streak: {
    current: {
      type: Number,
      default: 0
    },
    longest: {
      type: Number,
      default: 0
    },
    lastActiveDay: Date
  },

  interactions: {
    gamesPlayed: { type: Number, default: 0 },
    messagesRead: { type: Number, default: 0 },
    commandsUsed: { type: Number, default: 0 },
    contentViewed: { type: Number, default: 0 }
  },

  preferences: {
    favoriteGame: String,
    favoriteContent: String,
    notifications: {
      type: Boolean,
      default: true
    },
    prayerNotifications: {
      type: Boolean,
      default: false
    },
    prayerLocation: {
      city: String,
      country: String
    },
    khatmaSettings: {
      notify: { type: Boolean, default: false },
      dailyIncrement: { type: Number, default: 0 },
      timezone: { type: String, default: 'UTC' },
      notifyTime: { type: String, default: '08:00' },
      notifyWindowMinutes: { type: Number, default: 60 }
    }
  },

  notifications: {
    enabled: { type: Boolean, default: true },
    adhkarReminder: { type: Boolean, default: false },
    prayerReminder: { type: Boolean, default: false },
    eventReminder: { type: Boolean, default: false },
    motivational: { type: Boolean, default: false },
    gameUpdates: { type: Boolean, default: false },
    rewardUpdates: { type: Boolean, default: false },
    auctionUpdates: { type: Boolean, default: false }
  },

  notificationsLog: [{
    message: String,
    timestamp: Date,
    read: { type: Boolean, default: false }
  }],

  // Goals System
  goals: [{
    title: String,
    description: String,
    type: String,
    target: Number,
    current: { type: Number, default: 0 },
    status: { type: String, default: 'active' },
    period: String,
    reward: { coins: Number, xp: Number },
    createdAt: Date,
    deadline: Date,
    completedAt: Date
  }],

  // Memorization System
  memorization: {
    verses: [{
      surah: Number,
      surahName: String,
      fromAyah: Number,
      toAyah: Number,
      status: String,
      addedDate: Date,
      lastReview: Date,
      reviewCount: { type: Number, default: 0 },
      masteryLevel: { type: Number, default: 0 },
      notes: String
    }],
    reviewSchedule: [{
      memorizationId: mongoose.Schema.Types.ObjectId,
      dueDate: Date,
      notified: Boolean
    }],
    stats: {
      totalVerses: { type: Number, default: 0 },
      mastered: { type: Number, default: 0 },
      reviewing: { type: Number, default: 0 }
    }
  },

  // Charity Tracker
  charity: [{
    type: String,
    description: String,
    amount: Number,
    date: Date,
    isPrivate: Boolean,
    category: String
  }],

  // Rewards
  rewards: {
    lastDailyClaim: Date,
    dailyStreak: { type: Number, default: 0 },
    lastSpin: Date
  },

  // Referral System
  referral: {
    code: String,
    referredBy: Number,
    referrals: [{
      userId: Number,
      username: String,
      date: Date,
      rewardsClaimed: { type: Number, default: 0 }
    }],
    totalRewards: { type: Number, default: 0 },
    tier: { type: Number, default: 1 }
  },

  // Dua tracking
  duaProgress: mongoose.Schema.Types.Mixed,

  // Activity history
  loginHistory: [Date],
  monthlyStats: mongoose.Schema.Types.Mixed,

  lastActive: Date,
  lastDailyReward: Date,
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: String,
  restrictions: {
    canUseGames: {
      type: Boolean,
      default: true
    },
    canTrade: {
      type: Boolean,
      default: true
    },
    canChat: {
      type: Boolean,
      default: true
    }
  },

  // Transfer and economy tracking
  transfersCount: {
    type: Number,
    default: 0
  },
  receivedTransfers: {
    type: Number,
    default: 0
  },
  lastTransferDate: Date,
  totalTransferred: {
    type: Number,
    default: 0
  },
  totalReceived: {
    type: Number,
    default: 0
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { minimize: false });

userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
