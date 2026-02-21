const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  groupId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  groupTitle: String,
  groupType: {
    type: String,
    enum: ['group', 'supergroup', 'channel'],
    default: 'group'
  },
  settings: {
    language: {
      type: String,
      default: 'ar'
    },
    welcomeMessage: String,
    goodbyeMessage: String,
    filterBadWords: {
      type: Boolean,
      default: true
    },
    floodProtection: {
      type: Boolean,
      default: true
    },
    lockLinks: {
      type: Boolean,
      default: false
    },
    lockMedia: {
      type: Boolean,
      default: false
    },
    warningPolicy: {
      enabled: {
        type: Boolean,
        default: true
      },
      muteAt: {
        type: Number,
        default: 2
      },
      banAt: {
        type: Number,
        default: 3
      },
      muteMinutes: {
        type: Number,
        default: 10
      }
    }
  },
  admins: [
    {
      userId: Number,
      username: String,
      permissions: [String],
      addedAt: Date
    }
  ],
  bannedUsers: [
    {
      userId: Number,
      reason: String,
      bannedAt: Date,
      bannedBy: Number
    }
  ],
  warnings: [
    {
      userId: Number,
      count: Number,
      lastWarning: Date
    }
  ],
  moderationLogs: [
    {
      action: String,
      actorId: Number,
      targetId: Number,
      reason: String,
      metadata: mongoose.Schema.Types.Mixed,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  gameSystem: {
    settings: {
      enabled: {
        type: Boolean,
        default: true
      },
      autoQuestions: {
        type: Boolean,
        default: false
      },
      intervalMinutes: {
        type: Number,
        default: 15
      },
      questionTimeoutSec: {
        type: Number,
        default: 25
      }
    },
    state: {
      lastAutoAt: Date,
      lastDailyKey: {
        type: String,
        default: ''
      },
      weekKey: {
        type: String,
        default: ''
      }
    },
    scores: [
      {
        userId: Number,
        username: String,
        points: {
          type: Number,
          default: 0
        },
        weeklyPoints: {
          type: Number,
          default: 0
        },
        wins: {
          type: Number,
          default: 0
        },
        streak: {
          type: Number,
          default: 0
        },
        bestStreak: {
          type: Number,
          default: 0
        },
        lastWinDate: Date,
        updatedAt: Date
      }
    ],
    teams: [
      {
        name: String,
        captainId: Number,
        members: [Number],
        points: {
          type: Number,
          default: 0
        },
        wins: {
          type: Number,
          default: 0
        },
        createdAt: Date,
        updatedAt: Date
      }
    ],
    tournament: {
      active: {
        type: Boolean,
        default: false
      },
      season: {
        type: Number,
        default: 1
      },
      startedAt: Date,
      endedAt: Date,
      rewards: {
        first: {
          type: Number,
          default: 100
        },
        second: {
          type: Number,
          default: 60
        },
        third: {
          type: Number,
          default: 40
        }
      }
    }
  },
  statistics: {
    messagesCount: {
      type: Number,
      default: 0
    },
    membersCount: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Group', groupSchema);
