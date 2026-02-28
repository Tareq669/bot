const mongoose = require('mongoose');

const tournamentQuestionSchema = new mongoose.Schema({
  prompt: {
    type: String,
    default: ''
  },
  answers: {
    type: [String],
    default: []
  }
}, { _id: false });

const tournamentParticipantSchema = new mongoose.Schema({
  userId: Number,
  name: String,
  score: {
    type: Number,
    default: 0
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const tournamentGroupSchema = new mongoose.Schema({
  groupId: String,
  groupTitle: String,
  joinedAt: {
    type: Date,
    default: Date.now
  },
  enabled: {
    type: Boolean,
    default: true
  },
  blocked: {
    type: Boolean,
    default: false
  },
  alertFiveSent: {
    type: Boolean,
    default: false
  },
  countdownSent: {
    type: Boolean,
    default: false
  },
  pinnedMessageId: {
    type: Number,
    default: null
  },
  score: {
    type: Number,
    default: 0
  },
  participants: {
    type: [tournamentParticipantSchema],
    default: []
  },
  currentAttemptUserIds: {
    type: [Number],
    default: []
  },
  currentAnsweredUserIds: {
    type: [Number],
    default: []
  }
}, { _id: false });

const tournamentSchema = new mongoose.Schema({
  ownerId: {
    type: Number,
    required: true,
    index: true
  },
  ownerName: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    required: true
  },
  timeText: {
    type: String,
    default: ''
  },
  scheduledAt: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'completed', 'cancelled'],
    default: 'scheduled',
    index: true
  },
  questions: {
    type: [tournamentQuestionSchema],
    default: []
  },
  groups: {
    type: [tournamentGroupSchema],
    default: []
  },
  currentQuestionIndex: {
    type: Number,
    default: -1
  },
  questionStartedAt: Date,
  startedAt: Date,
  finishedAt: Date
}, {
  timestamps: true,
  minimize: false
});

module.exports = mongoose.models.Tournament || mongoose.model('Tournament', tournamentSchema);
