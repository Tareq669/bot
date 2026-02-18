const mongoose = require('mongoose');

const User = require('./User');
const Group = require('./Group');
const Transaction = require('./Transaction');
const GameStats = require('./GameStats');
const Content = require('./Content');
const Config = require('./Config');
const Team = require('./Team');
const Event = require('./Event');
const Auction = require('./Auction');
const ScheduledMessage = require('./ScheduledMessage');
const SmartReply = require('./SmartReply');
const GroupMember = require('./GroupMember');
const GroupShop = require('./GroupShop');

module.exports = {
  User,
  Group,
  Transaction,
  GameStats,
  Content,
  Config,
  Team,
  Event,
  Auction,
  ScheduledMessage,
  SmartReply,
  GroupMember,
  GroupShop
};
