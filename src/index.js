const isRailwayEnvironment = Boolean(
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.RAILWAY_PROJECT_ID ||
  process.env.RAILWAY_SERVICE_ID ||
  process.env.RAILWAY_GIT_REPO_NAME
);

require('dns').setDefaultResultOrder('ipv4first');
if (!isRailwayEnvironment) { require('dotenv').config(); }

const { Telegraf, session, Markup } = require('telegraf');
const express = require('express');
const https = require('https');
const Database = require('./database/db');
const CommandHandler = require('./commands/commandHandler');
const MenuHandler = require('./commands/menuHandler');
const GameHandler = require('./commands/gameHandler');
const NewGamesHandler = require('./commands/newGamesHandler');
const GroupAdminHandler = require('./commands/groupAdminHandler');
const GroupGamesHandler = require('./commands/groupGamesHandler');
const WhisperHandler = require('./commands/whisperHandler');
const QuranicGamesHandler = require('./commands/quranicGamesHandler');
const BankGameHandler = require('./commands/bankGameHandler');
const TournamentChallengeHandler = require('./commands/tournamentChallengeHandler');
const EconomyHandler = require('./commands/economyHandler');
const ContentHandler = require('./commands/contentHandler');
const ProfileHandler = require('./commands/profileHandler');
const ChatGamesUtilityHandler = require('./commands/chatGamesUtilityHandler');
const SponsoredAdsSystem = require('./features/sponsoredAdsSystem');
const { logger } = require('./utils/helpers');
const ReconnectManager = require('./utils/reconnect');
const connectionMonitor = require('./utils/connectionMonitor');
const healthMonitor = require('./utils/healthMonitor');
const { User, Group } = require('./database/models');

const bot = new Telegraf(process.env.BOT_TOKEN);

// --- WEBHOOK SETUP ---
const PORT = process.env.PORT || 3000;
const WEBHOOK_DOMAIN = 'https://proud-phones-feel.loca.lt'; 
const WEBHOOK_PATH = `/telegraf/${bot.token}`;

const app = express();
app.use(express.json());
app.use(bot.webhookCallback(WEBHOOK_PATH));

// --- BOT LOGIC ---
bot.use(session());
bot.use(async (ctx, next) => {
  if (ctx.from) setImmediate(() => {
    User.findOneAndUpdate({ userId: ctx.from.id }, { firstName: ctx.from.first_name, username: ctx.from.username, lastActive: new Date() }, { upsert: true }).catch(()=>{});
  });
  return next();
});

// Register all original handlers
GroupGamesHandler.setup(bot);
TournamentChallengeHandler.setup(bot);

bot.command('ping', (ctx) => ctx.reply('pong! 🚀 (Oracle Webhook Mode)'));

bot.on('message', async (ctx) => {
  try {
    await CommandHandler.handleStart(ctx); // Default handler
  } catch (error) {
    logger.error('Error:', error);
  }
});

const startBot = async () => {
  try {
    await Database.connect(process.env.MONGODB_URI);
    app.listen(PORT, async () => {
      logger.info(`🌐 Server running on port ${PORT}`);
      await bot.telegram.setWebhook(`${WEBHOOK_DOMAIN}${WEBHOOK_PATH}`);
      logger.info(`✅ Webhook active: ${WEBHOOK_DOMAIN}`);
    });
  } catch (error) {
    logger.error('Start Error:', error);
    setTimeout(startBot, 5000);
  }
};

startBot();
