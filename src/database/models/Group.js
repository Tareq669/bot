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
    welcomeEnabled: {
      type: Boolean,
      default: false
    },
    welcomeTemplate: {
      type: String,
      default: '👋 أهلًا {name} في {group}\n🆔 {id}\nنتمنى لك وقتًا ممتعًا معنا.'
    },
    suggestionCooldownSeconds: {
      type: Number,
      default: 90
    },
    blockDuplicateSuggestions: {
      type: Boolean,
      default: true
    },
    filterBadWords: {
      type: Boolean,
      default: true
    },
    blockExplicitContent: {
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
    exemptAdminsFromProtection: {
      type: Boolean,
      default: false
    },
    lockMedia: {
      type: Boolean,
      default: false
    },
    lockStickers: {
      type: Boolean,
      default: false
    },
    blockForwards: {
      type: Boolean,
      default: false
    },
    blockChannelEdits: {
      type: Boolean,
      default: false
    },
    requireNewsSubscription: {
      type: Boolean,
      default: false
    },
    tournamentEnabled: {
      type: Boolean,
      default: true
    },
    blockedTournamentIds: {
      type: [String],
      default: []
    },
    blockLongMessages: {
      type: Boolean,
      default: true
    },
    tierUpRewards: {
      silver: {
        type: Number,
        default: 10
      },
      gold: {
        type: Number,
        default: 20
      },
      platinum: {
        type: Number,
        default: 35
      },
      diamond: {
        type: Number,
        default: 60
      }
    },
    maxMessageLength: {
      type: Number,
      default: 700
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
    },
    protectionPresetLevel: {
      type: Number,
      default: 0
    },
    requireReasonsForModeration: {
      type: Boolean,
      default: false
    },
    disableGameEngagement: {
      type: Boolean,
      default: false
    },
    notifyAdminLeave: {
      type: Boolean,
      default: false
    },
    detectForAdminsOnly: {
      type: Boolean,
      default: false
    },
    onlineForOwnersOnly: {
      type: Boolean,
      default: false
    },
    primaryOwnerId: {
      type: Number,
      default: null
    },
    basicOwnerIds: {
      type: [Number],
      default: []
    },
    basicOwnerId: {
      type: Number,
      default: null
    },
    ownerIds: {
      type: [Number],
      default: []
    },
    managerIds: {
      type: [Number],
      default: []
    },
    adminIds: {
      type: [Number],
      default: []
    },
    premiumMemberIds: {
      type: [Number],
      default: []
    },
    exceptions: [Number],
    templates: {
      member: {
        image: String,
        caption: String,
        buttonText: String,
        buttonUrl: String
      },
      admin: {
        image: String,
        caption: String,
        buttonText: String,
        buttonUrl: String
      }
    },
    faqTriggers: [
      {
        trigger: {
          type: String,
          default: ''
        },
        response: {
          type: String,
          default: ''
        },
        isSpecial: {
          type: Boolean,
          default: false
        },
        responseType: {
          type: String,
          default: 'text'
        },
        fileId: {
          type: String,
          default: ''
        },
        createdBy: {
          type: Number,
          default: null
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    faqMatchMode: {
      type: String,
      enum: ['bounded', 'exact'],
      default: 'bounded'
    },
    idealMemberId: Number,
    idealAdminId: Number
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
  suggestions: [
    {
      suggestionId: {
        type: Number,
        required: true
      },
      text: {
        type: String,
        default: ''
      },
      createdBy: {
        type: Number,
        default: null
      },
      createdByName: {
        type: String,
        default: ''
      },
      status: {
        type: String,
        enum: ['open', 'closed'],
        default: 'open'
      },
      votesUp: [Number],
      votesDown: [Number],
      createdAt: {
        type: Date,
        default: Date.now
      },
      closedAt: Date
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
      },
      genderWords: {
        boys: {
          type: [String],
          default: []
        },
        girls: {
          type: [String],
          default: []
        }
      },
      genderReplies: {
        boys: {
          type: [String],
          default: []
        },
        girls: {
          type: [String],
          default: []
        }
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
      },
      monthKey: {
        type: String,
        default: ''
      },
      lastMonthlyRewardKey: {
        type: String,
        default: ''
      },
      storySession: {
        active: {
          type: Boolean,
          default: false
        },
        hostUserId: {
          type: Number,
          default: null
        },
        hostName: {
          type: String,
          default: ''
        },
        expectedLetter: {
          type: String,
          default: ''
        },
        startedAt: Date,
        endsAt: Date,
        lastEntryAt: Date,
        acceptedCount: {
          type: Number,
          default: 0
        },
        entries: [
          {
            userId: Number,
            username: String,
            text: String,
            startsWith: String,
            endsWith: String,
            createdAt: {
              type: Date,
              default: Date.now
            }
          }
        ],
        participantIds: [Number]
      }
    },
    scores: [
      {
        userId: Number,
        username: String,
        gender: {
          type: String,
          default: ''
        },
        points: {
          type: Number,
          default: 0
        },
        weeklyPoints: {
          type: Number,
          default: 0
        },
        monthlyPoints: {
          type: Number,
          default: 0
        },
        xp: {
          type: Number,
          default: 0
        },
        level: {
          type: Number,
          default: 1
        },
        tier: {
          type: String,
          default: '\u0628\u0631\u0648\u0646\u0632\u064a'
        },
        title: {
          type: String,
          default: '\u0645\u0628\u062a\u062f\u0626'
        },
        customTitle: {
          type: Boolean,
          default: false
        },
        activeBoost: {
          multiplier: {
            type: Number,
            default: 1
          },
          expiresAt: Date
        },
        giftsSent: {
          type: Number,
          default: 0
        },
        giftsReceived: {
          type: Number,
          default: 0
        },
        giftInventory: [
          {
            key: String,
            name: String,
            count: {
              type: Number,
              default: 0
            }
          }
        ],
        scratchDayKey: {
          type: String,
          default: ''
        },
        scratchPlaysToday: {
          type: Number,
          default: 0
        },
        scratchLastPlayAt: Date,
        scratchTotalPlays: {
          type: Number,
          default: 0
        },
        scratchTotalWins: {
          type: Number,
          default: 0
        },
        scratchTotalPayout: {
          type: Number,
          default: 0
        },
        luckDayKey: {
          type: String,
          default: ''
        },
        luckPlaysToday: {
          type: Number,
          default: 0
        },
        luckLastPlayAt: Date,
        luckTotalPlays: {
          type: Number,
          default: 0
        },
        luckTotalWins: {
          type: Number,
          default: 0
        },
        luckTotalPayout: {
          type: Number,
          default: 0
        },
        luckUsedDayKey: {
          type: String,
          default: ''
        },
        luckUsedNumbers: [Number],
        castleCreated: {
          type: Boolean,
          default: false
        },
        castleLevel: {
          type: Number,
          default: 1
        },
        castleLastUpgradeAt: Date,
        castleResources: {
          wood: { type: Number, default: 0 },
          stone: { type: Number, default: 0 },
          food: { type: Number, default: 0 },
          iron: { type: Number, default: 0 },
          gold: { type: Number, default: 0 }
        },
        barracksCreated: {
          type: Boolean,
          default: false
        },
        barracksLevel: {
          type: Number,
          default: 1
        },
        armyUnits: {
          type: Number,
          default: 0
        },
        armyPower: {
          type: Number,
          default: 0
        },
        shieldCards: {
          type: Number,
          default: 0
        },
        shieldUntil: Date,
        treasureLastAt: Date,
        duelWins: {
          type: Number,
          default: 0
        },
        duelLosses: {
          type: Number,
          default: 0
        },
        arenaJoined: {
          type: Boolean,
          default: false
        },
        investDayKey: {
          type: String,
          default: ''
        },
        investLastAt: Date,
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
