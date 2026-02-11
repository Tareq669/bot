/**
 * AI System Handlers
 * Handles all AI-related commands including dashboard, analytics, coaching, and motivation
 */

const { logger } = require('../utils/logger');

// Lazy load AI modules
let IntegratedAI, AnalyticsEngine, AIManager, LearningSystem, SmartNotifications;

class AIHandlers {
  /**
   * Initialize AI modules
   */
  static initializeModules() {
    try {
      IntegratedAI = require('../ai/integratedAI');
      AnalyticsEngine = require('../ai/analyticsEngine');
      AIManager = require('../ai/aiManager');
      LearningSystem = require('../ai/learningSystem');
      SmartNotifications = require('../ai/smartNotifications');
      logger.info('AI modules loaded successfully');
    } catch (error) {
      logger.error('Failed to load AI modules:', error);
    }
  }

  /**
   * Register all AI handlers with the bot
   * @param {Telegraf} bot - Telegraf bot instance
   */
  static register(bot) {
    // Initialize modules on first registration
    AIHandlers.initializeModules();

    // AI Commands
    bot.command('dashboard', AIHandlers.handleDashboard);
    bot.command('analytics', AIHandlers.handleAnalytics);
    bot.command('coaching', AIHandlers.handleCoaching);
    bot.command('motivation', AIHandlers.handleMotivation);

    logger.info('AI handlers registered successfully');
  }

  /**
   * Handle dashboard command
   * Generates a smart dashboard with personalized insights
   */
  static async handleDashboard(ctx) {
    try {
      logger.logCommand('dashboard', ctx.from.id);

      if (!IntegratedAI) {
        return ctx.reply('❌ خدمة اللوحة غير متاحة حالياً');
      }

      const dashboard = await IntegratedAI.generateSmartDashboard(ctx.from.id);
      const formatted = IntegratedAI.formatSmartDashboard(dashboard);

      await ctx.reply(formatted, { parse_mode: 'HTML' });

      logger.logCommand('dashboard', ctx.from.id, true);
      logger.logInteraction(ctx.from.id, 'view_dashboard');
    } catch (error) {
      logger.error('Dashboard error:', error);
      ctx.reply('❌ خدمة اللوحة غير متاحة حالياً');
    }
  }

  /**
   * Handle analytics command
   * Generates detailed user analytics report
   */
  static async handleAnalytics(ctx) {
    try {
      logger.logCommand('analytics', ctx.from.id);

      if (!AnalyticsEngine) {
        return ctx.reply('❌ خدمة التحليلات غير متاحة حالياً');
      }

      const report = await AnalyticsEngine.generateUserReport(ctx.from.id);
      const formatted = AnalyticsEngine.formatReport(report);

      await ctx.reply(formatted, { parse_mode: 'HTML' });

      logger.logCommand('analytics', ctx.from.id, true);
      logger.logInteraction(ctx.from.id, 'view_analytics');
    } catch (error) {
      logger.error('Analytics error:', error);
      ctx.reply('❌ خدمة التحليلات غير متاحة حالياً');
    }
  }

  /**
   * Handle coaching command
   * Generates personalized coaching message
   */
  static async handleCoaching(ctx) {
    try {
      logger.logCommand('coaching', ctx.from.id);

      if (!IntegratedAI) {
        return ctx.reply('❌ خدمة التدريب غير متاحة حالياً');
      }

      const message = await IntegratedAI.generateCoachingMessage(ctx.from.id);

      await ctx.reply(message, { parse_mode: 'HTML' });

      logger.logCommand('coaching', ctx.from.id, true);
      logger.logInteraction(ctx.from.id, 'receive_coaching');
    } catch (error) {
      logger.error('Coaching error:', error);
      ctx.reply('❌ خدمة التدريب غير متاحة حالياً');
    }
  }

  /**
   * Handle motivation command
   * Generates motivational message based on user data
   */
  static async handleMotivation(ctx) {
    try {
      logger.logCommand('motivation', ctx.from.id);

      if (!IntegratedAI) {
        return ctx.reply('❌ خدمة التحفيز غير متاحة حالياً');
      }

      const { User } = require('../database/models');
      const user = await User.findOne({ userId: ctx.from.id });

      if (user) {
        const motivation = IntegratedAI.generateMotivation(user);
        await ctx.reply(motivation, { parse_mode: 'HTML' });

        logger.logCommand('motivation', ctx.from.id, true);
        logger.logInteraction(ctx.from.id, 'receive_motivation');
      } else {
        await ctx.reply('❌ لم يتم العثور على بياناتك');
        logger.logDatabase('find', 'User', false, 'User not found');
      }
    } catch (error) {
      logger.error('Motivation error:', error);
      ctx.reply('❌ خدمة التحفيز غير متاحة حالياً');
    }
  }

  /**
   * Get AI Manager instance (for use by other modules)
   * @returns {AIManager|null} AI Manager instance
   */
  static getAIManager() {
    return AIManager || null;
  }

  /**
   * Get Learning System instance (for use by other modules)
   * @returns {LearningSystem|null} Learning System instance
   */
  static getLearningSystem() {
    return LearningSystem || null;
  }

  /**
   * Get Smart Notifications instance (for use by other modules)
   * @returns {SmartNotifications|null} Smart Notifications instance
   */
  static getSmartNotifications() {
    return SmartNotifications || null;
  }
}

module.exports = AIHandlers;
