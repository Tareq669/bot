const mongoose = require('mongoose');

/**
 * ============================================
 * نموذج إعدادات المجموعة - GroupSettings
 * ============================================
 * يحتوي على جميع إعدادات وإعدادات الحماية والترحيب
 */
const groupSettingsSchema = new mongoose.Schema({
  // معلومات المجموعة الأساسية
  groupId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    default: 'مجموعة جديدة'
  },
  type: {
    type: String,
    enum: ['group', 'supergroup', 'channel'],
    default: 'group'
  },
  description: String,
  inviteLink: String,
  photo: String,
  memberCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  language: {
    type: String,
    default: 'ar'
  },

  // نظام الصلاحيات والأدوار
  permissions: {
    //مالك المجموعة
    owner: {
      userId: Number,
      username: String,
      name: String,
      addedAt: Date
    },
    // قائمة المشرفين
    admins: [{
      userId: Number,
      username: String,
      name: String,
      addedAt: Date,
      permissions: {
        canDeleteMessages: Boolean,
        canChangeInfo: Boolean,
        canInviteUsers: Boolean,
        canRestrictMembers: Boolean,
        canPinMessages: Boolean,
        canPromoteMembers: Boolean
      }
    }],
    // قائمة المراقبين
    moderators: [{
      userId: Number,
      username: String,
      name: String,
      addedAt: Date,
      canWarn: Boolean,
      canMute: Boolean,
      canBan: Boolean
    }],
    // الأعضاء المميزين (VIP)
    vipMembers: [{
      userId: Number,
      username: String,
      name: String,
      addedAt: Date,
      expireAt: Date,
      level: {
        type: Number,
        default: 1
      }
    }]
  },

  // إعدادات الحماية
  protection: {
    // فلتر الروابط
    linkFilter: {
      enabled: {
        type: Boolean,
        default: false
      },
      whitelist: [String], // قائمة بيضاء للروابط المسموحة
      blacklist: [String], // قائمة سوداء للروابط المحظورة
      action: {
        type: String,
        enum: ['delete', 'warn', 'kick', 'ban'],
        default: 'delete'
      }
    },
    // حماية من الرسائل المتكررة
    spamProtection: {
      enabled: {
        type: Boolean,
        default: false
      },
      maxMessages: {
        type: Number,
        default: 5
      },
      timeWindow: {
        type: Number,
        default: 5 // بالثواني
      },
      action: {
        type: String,
        enum: ['delete', 'warn', 'mute', 'kick', 'ban'],
        default: 'delete'
      }
    },
    // منع Flood
    antiFlood: {
      enabled: {
        type: Boolean,
        default: false
      },
      sensitivity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      },
      maxConsecutive: {
        type: Number,
        default: 3
      },
      action: {
        type: String,
        enum: ['delete', 'warn', 'mute'],
        default: 'delete'
      }
    },
    // حماية من الحسابات الوهمية
    fakeAccountProtection: {
      enabled: {
        type: Boolean,
        default: false
      },
      minAccountAge: {
        type: Number,
        default: 30 // بالأيام
      },
      action: {
        type: String,
        enum: ['warn', 'kick', 'ban'],
        default: 'kick'
      }
    },
    // قفل المجموعة
    locked: {
      type: Boolean,
      default: false
    },
    // وضع الصمت
    silentMode: {
      type: Boolean,
      default: false
    }
  },

  // إعدادات الترحيب والوداع
  greetings: {
    welcome: {
      enabled: {
        type: Boolean,
        default: true
      },
      message: {
        type: String,
        default: 'أهلاً بك {username} في المجموعة!'
      },
      type: {
        type: String,
        enum: ['text', 'photo', 'video', 'sticker'],
        default: 'text'
      },
      media: String,
      buttons: mongoose.Schema.Types.Mixed,
      deleteAfter: {
        type: Number,
        default: 0 // بالثواني، 0 يعني عدم الحذف
      }
    },
    farewell: {
      enabled: {
        type: Boolean,
        default: true
      },
      message: {
        type: String,
        default: 'وداعاً {username}، ننتظر عودتك!'
      },
      type: {
        type: String,
        enum: ['text', 'photo', 'video', 'sticker'],
        default: 'text'
      },
      media: String
    },
    // رسالة عند رفع شخص
    promote: {
      enabled: {
        type: Boolean,
        default: true
      },
      message: String
    },
    // رسالة عند تنزيل شخص
    demote: {
      enabled: {
        type: Boolean,
        default: true
      },
      message: String
    }
  },

  // نظام القواعد
  rules: {
    enabled: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: 'قوانين المجموعة'
    },
    content: String,
    acceptRequired: {
      type: Boolean,
      default: false
    },
    lastUpdated: Date,
    updatedBy: Number
  },

  // إعدادات الإحصائيات
  stats: {
    enabled: {
      type: Boolean,
      default: true
    },
    trackMessages: {
      type: Boolean,
      default: true
    },
    trackCommands: {
      type: Boolean,
      default: true
    },
    trackMedia: {
      type: Boolean,
      default: true
    },
    topChatters: {
      type: Boolean,
      default: true
    },
    dailyReset: {
      type: Boolean,
      default: true
    }
  },

  // نظام الأتمتة
  automation: {
    // الأوامر التلقائية
    autoReply: [{
      trigger: String,
      response: String,
      type: {
        type: String,
        enum: ['exact', 'contains', 'regex'],
        default: 'contains'
      },
      enabled: {
        type: Boolean,
        default: true
      }
    }],
    // ردود فعل تلقائية
    autoReact: [{
      trigger: String,
      emoji: String,
      enabled: {
        type: Boolean,
        default: true
      }
    }],
    // حذف الرسائل التلقائي
    autoDelete: [{
      type: {
        type: String,
        enum: ['links', 'photos', 'videos', 'documents', 'voices', 'stickers']
      },
      enabled: {
        type: Boolean,
        default: false
      },
      after: {
        type: Number,
        default: 0 // بالثواني
      }
    }],
    // جدولة الرسائل
    scheduledMessages: [{
      message: String,
      schedule: String, // cron expression
      enabled: {
        type: Boolean,
        default: true
      },
      lastSent: Date,
      nextSend: Date
    }]
  },

  // نظام التقييم والسمعة
  reputation: {
    enabled: {
      type: Boolean,
      default: true
    },
    // نقاط التقييم
    ratings: {
      enabled: {
        type: Boolean,
        default: true
      },
      allowNegative: {
        type: Boolean,
        default: false
      },
      maxPerDay: {
        type: Number,
        default: 3
      }
    },
    // شارات المجموعة
    badges: [{
      id: String,
      name: String,
      icon: String,
      earnedAt: Date
    }],
    //排行榜
    leaderboard: {
      enabled: {
        type: Boolean,
        default: true
      },
      type: {
        type: String,
        enum: ['messages', 'reputation', 'rewards'],
        default: 'messages'
      }
    }
  },

  // إعدادات إضافية
  features: {
    games: {
      enabled: {
        type: Boolean,
        default: true
      }
    },
    economy: {
      enabled: {
        type: Boolean,
        default: true
      }
    },
    content: {
      enabled: {
        type: Boolean,
        default: true
      }
    },
    events: {
      enabled: {
        type: Boolean,
        default: true
      }
    }
  },

  // معلومات إضافية
  tags: [String],
  category: String,
  isVerified: {
    type: Boolean,
    default: false
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  premiumExpire: Date,
  notes: String,

  // التواريخ
  lastActivity: Date,
  lastStatsUpdate: Date,
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { minimize: false });

/**
 * ============================================
 * نموذج العضو - GroupMember
 * ============================================
 * يحتوي على معلومات كل عضو في المجموعة
 */
const groupMemberSchema = new mongoose.Schema({
  // معلومات العضو
  userId: {
    type: Number,
    required: true,
    index: true
  },
  groupId: {
    type: Number,
    required: true,
    index: true
  },
  username: String,
  firstName: String,
  lastName: String,
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastSeen: Date,
  isActive: {
    type: Boolean,
    default: true
  },

  // الدور والصلاحيات
  role: {
    type: String,
    enum: ['owner', 'admin', 'moderator', 'vip', 'member', 'restricted'],
    default: 'member'
  },
  customTitle: String,
  permissions: {
    canSendMessages: {
      type: Boolean,
      default: true
    },
    canSendMedia: {
      type: Boolean,
      default: true
    },
    canSendPolls: {
      type: Boolean,
      default: true
    },
    canAddMembers: {
      type: Boolean,
      default: false
    },
    canPinMessages: {
      type: Boolean,
      default: false
    },
    canChangeInfo: {
      type: Boolean,
      default: false
    }
  },

  // النقاط والمستوى
  points: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  xp: {
    type: Number,
    default: 0
  },
  reputation: {
    type: Number,
    default: 0
  },
  // الأوسمة
  badges: [{
    id: String,
    name: String,
    icon: String,
    earnedAt: Date
  }],

  // التحذيرات والعقوبات
  warnings: [{
    reason: String,
    warnedBy: Number,
    warnedAt: Date,
    expiresAt: Date,
    active: {
      type: Boolean,
      default: true
    }
  }],
  activeWarningCount: {
    type: Number,
    default: 0
  },
  // العقوبات
  penalties: [{
    type: {
      type: String,
      enum: ['mute', 'ban', 'kick', 'warn']
    },
    reason: String,
    issuedBy: Number,
    issuedAt: Date,
    expiresAt: Date,
    active: {
      type: Boolean,
      default: true
    }
  }],
  // العقوبات المنتهية
  pastPenalties: [{
    type: String,
    reason: String,
    issuedBy: Number,
    issuedAt: Date,
    endedAt: Date
  }],

  // نشاط العضو
  activity: {
    messagesCount: {
      type: Number,
      default: 0
    },
    mediaCount: {
      type: Number,
      default: 0
    },
    commandsUsed: {
      type: Number,
      default: 0
    },
    gamesPlayed: {
      type: Number,
      default: 0
    },
    gamesWon: {
      type: Number,
      default: 0
    },
    // السلسلة
    streak: {
      current: {
        type: Number,
        default: 0
      },
      longest: {
        type: Number,
        default: 0
      },
      lastActiveDate: Date
    },
    // آخر نشاط
    lastMessageAt: Date,
    lastMediaAt: Date,
    lastGameAt: Date,
    // متوسط النشاط اليومي
    avgDailyMessages: {
      type: Number,
      default: 0
    },
    // أكثر أوقات النشاط
    peakHours: [Number],
    // أيام النشاط
    activeDays: {
      type: Number,
      default: 0
    }
  },

  // إحصائيات رضا المجموعة
  groupRatings: {
    given: {
      type: Number,
      default: 0,
      min: -1,
      max: 1
    },
    received: {
      type: Number,
      default: 0
    },
    totalRatings: {
      type: Number,
      default: 0
    }
  },

  // التفاعل مع المحتوى
  content: {
    adhkarRead: {
      type: Number,
      default: 0
    },
    quranRead: {
      type: Number,
      default: 0
    },
    khatmaJoined: {
      type: Number,
      default: 0
    },
    khatmaCompleted: {
      type: Number,
      default: 0
    }
  },

  // القيود
  restrictions: {
    isMuted: {
      type: Boolean,
      default: false
    },
    muteExpiresAt: Date,
    isBanned: {
      type: Boolean,
      default: false
    },
    banExpiresAt: Date,
    banReason: String,
    canJoin: {
      type: Boolean,
      default: true
    }
  },

  // معلومات إضافية
  isFavorite: {
    type: Boolean,
    default: false
  },
  notes: String,
  tags: [String],

  // التواريخ
  promotedAt: Date,
  demotedAt: Date,
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { minimize: false });

// فهارس GroupMember
groupMemberSchema.index({ userId: 1, groupId: 1 }, { unique: true });
groupMemberSchema.index({ groupId: 1, points: -1 });
groupMemberSchema.index({ groupId: 1, activity: -1 });
groupMemberSchema.index({ groupId: 1, level: -1 });

/**
 * ============================================
 * نموذج إحصائيات المجموعة - GroupStats
 * ============================================
 * يحتوي على إحصائيات المجموعة اليومية والشهرية
 */
const groupStatsSchema = new mongoose.Schema({
  // معلومات المجموعة
  groupId: {
    type: Number,
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'daily'
  },

  // إحصائيات الرسائل
  messages: {
    total: {
      type: Number,
      default: 0
    },
    text: {
      type: Number,
      default: 0
    },
    media: {
      type: Number,
      default: 0
    },
    voice: {
      type: Number,
      default: 0
    },
    document: {
      type: Number,
      default: 0
    }
  },

  // إحصائيات المستخدمين
  users: {
    total: {
      type: Number,
      default: 0
    },
    new: {
      type: Number,
      default: 0
    },
    left: {
      type: Number,
      default: 0
    },
    active: {
      type: Number,
      default: 0
    }
  },

  // أكثر المشاركين
  topParticipants: [{
    userId: Number,
    username: String,
    messageCount: {
      type: Number,
      default: 0
    }
  }],

  // تقارير النشاط
  activity: {
    peakHour: {
      type: Number,
      default: 0
    },
    peakHourCount: {
      type: Number,
      default: 0
    },
    avgResponseTime: {
      type: Number,
      default: 0
    },
    // توزيع النشاط على مدار اليوم
    hourlyDistribution: {
      type: Map,
      of: Number
    },
    // توزيع النشاط على أيام الأسبوع
    dailyDistribution: {
      type: Map,
      of: Number
    }
  },

  // إحصائيات التفاعل
  interactions: {
    commandsUsed: {
      type: Number,
      default: 0
    },
    gamesPlayed: {
      type: Number,
      default: 0
    },
    gamesWon: {
      type: Number,
      default: 0
    },
    contentViewed: {
      type: Number,
      default: 0
    },
    adhkarRead: {
      type: Number,
      default: 0
    },
    quranRead: {
      type: Number,
      default: 0
    }
  },

  // إحصائيات الإعدادات
  moderation: {
    warningsIssued: {
      type: Number,
      default: 0
    },
    bansIssued: {
      type: Number,
      default: 0
    },
    kicksIssued: {
      type: Number,
      default: 0
    },
    mutesIssued: {
      type: Number,
      default: 0
    },
    messagesDeleted: {
      type: Number,
      default: 0
    }
  },

  // الإحصائيات المالية
  economy: {
    coinsEarned: {
      type: Number,
      default: 0
    },
    coinsSpent: {
      type: Number,
      default: 0
    },
    transactions: {
      type: Number,
      default: 0
    }
  },

  // حالة النظام
  system: {
    uptime: {
      type: Number,
      default: 0
    },
    errors: {
      type: Number,
      default: 0
    },
    warnings: {
      type: Number,
      default: 0
    }
  },

  // معلومات إضافية
  generatedAt: {
    type: Date,
    default: Date.now
  },

  // الإحصائيات اليومية المباشرة (للتحديث التلقائي السريع)
  daily: {
    messages: {
      type: Number,
      default: 0
    },
    activeUsers: {
      type: Number,
      default: 0
    },
    interactions: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }
}, { minimize: false });

// فهارس GroupStats
groupStatsSchema.index({ groupId: 1, date: -1 });
groupStatsSchema.index({ groupId: 1, period: 1, date: -1 });
groupStatsSchema.index({ groupId: 1, 'daily.lastUpdated': -1 });

/**
 * ============================================
 * دوال مساعدة للنماذج
 * ============================================
 */

// دوال GroupSettings
groupSettingsSchema.methods.hasPermission = function(userId, permission) {
  // التحقق من المالك
  if (this.permissions.owner && this.permissions.owner.userId === userId) {
    return true;
  }

  // التحقق من المشرفين
  if (this.permissions.admins) {
    const admin = this.permissions.admins.find(a => a.userId === userId);
    if (admin && admin.permissions && admin.permissions[permission]) {
      return true;
    }
  }

  // التحقق من المراقبين
  if (this.permissions.moderators) {
    const mod = this.permissions.moderators.find(m => m.userId === userId);
    if (mod && mod[permission]) {
      return true;
    }
  }

  return false;
};

groupSettingsSchema.methods.isOwner = function(userId) {
  return this.permissions.owner && this.permissions.owner.userId === userId;
};

groupSettingsSchema.methods.isAdmin = function(userId) {
  return this.permissions.admins && this.permissions.admins.some(a => a.userId === userId);
};

groupSettingsSchema.methods.isModerator = function(userId) {
  return this.permissions.moderators && this.permissions.moderators.some(m => m.userId === userId);
};

groupSettingsSchema.methods.isVip = function(userId) {
  return this.permissions.vipMembers && this.permissions.vipMembers.some(v => v.userId === userId);
};

// دوال GroupMember
groupMemberSchema.methods.addWarning = function(reason, warnedBy) {
  const warning = {
    reason,
    warnedBy,
    warnedAt: new Date(),
    active: true
  };
  this.warnings.push(warning);
  this.activeWarningCount += 1;
  return warning;
};

groupMemberSchema.methods.removeWarning = function(warningId) {
  const warning = this.warnings.id(warningId);
  if (warning && warning.active) {
    warning.active = false;
    this.activeWarningCount = Math.max(0, this.activeWarningCount - 1);
  }
  return warning;
};

groupMemberSchema.methods.addPenalty = function(type, reason, issuedBy, duration) {
  const penalty = {
    type,
    reason,
    issuedBy,
    issuedAt: new Date(),
    expiresAt: duration ? new Date(Date.now() + duration) : null,
    active: true
  };
  this.penalties.push(penalty);

  if (type === 'mute') {
    this.restrictions.isMuted = true;
    this.restrictions.muteExpiresAt = penalty.expiresAt;
  } else if (type === 'ban') {
    this.restrictions.isBanned = true;
    this.restrictions.banExpiresAt = penalty.expiresAt;
  }

  return penalty;
};

groupMemberSchema.methods.addPoints = function(amount) {
  this.points += amount;
  // التحقق من مستوى جديد
  const xpNeeded = this.level * 100;
  if (this.xp >= xpNeeded) {
    this.level += 1;
    this.xp = 0;
  }
  return { points: this.points, level: this.level };
};

groupMemberSchema.methods.incrementActivity = function(type) {
  switch (type) {
    case 'message':
      this.activity.messagesCount += 1;
      this.activity.lastMessageAt = new Date();
      break;
    case 'media':
      this.activity.mediaCount += 1;
      this.activity.lastMediaAt = new Date();
      break;
    case 'command':
      this.activity.commandsUsed += 1;
      break;
    case 'game':
      this.activity.gamesPlayed += 1;
      this.activity.lastGameAt = new Date();
      break;
  }
};

// دوال GroupStats
groupStatsSchema.methods.addMessage = function(type = 'text') {
  this.messages.total += 1;
  if (this.messages[type] !== undefined) {
    this.messages[type] += 1;
  }
};

groupStatsSchema.methods.addUser = function(status) {
  if (this.users[status] !== undefined) {
    this.users[status] += 1;
  }
};

groupStatsSchema.methods.updateTopParticipants = function(userId, username) {
  const existing = this.topParticipants.find(p => p.userId === userId);
  if (existing) {
    existing.messageCount += 1;
  } else {
    this.topParticipants.push({
      userId,
      username,
      messageCount: 1
    });
  }
  // ترتيب حسب عدد الرسائل
  this.topParticipants.sort((a, b) => b.messageCount - a.messageCount);
  // الاحتفاظ بأعلى 10
  this.topParticipants = this.topParticipants.slice(0, 10);
};

// Middleware للتحديث التلقائي
groupSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

groupMemberSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  // التحقق من انتهاء العقوبات
  if (this.restrictions.muteExpiresAt && this.restrictions.muteExpiresAt < new Date()) {
    this.restrictions.isMuted = false;
    this.restrictions.muteExpiresAt = null;
  }
  if (this.restrictions.banExpiresAt && this.restrictions.banExpiresAt < new Date()) {
    this.restrictions.isBanned = false;
    this.restrictions.banExpiresAt = null;
  }
  next();
});

/**
 * ============================================
 * تصدير النماذج
 * ============================================
 */
const GroupSettings = mongoose.models.GroupSettings || mongoose.model('GroupSettings', groupSettingsSchema);
const GroupMember = mongoose.models.GroupMember || mongoose.model('GroupMember', groupMemberSchema);
const GroupStats = mongoose.models.GroupStats || mongoose.model('GroupStats', groupStatsSchema);

module.exports = {
  GroupSettings,
  GroupMember,
  GroupStats
};
