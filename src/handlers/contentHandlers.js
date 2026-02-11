/**
 * Content Handlers
 * Handles all content-related actions including Adhkar, Quran, quotes, poetry, etc.
 */

const { logger } = require('../utils/logger');
const ContentHandler = require('../commands/contentHandler');
const { ERROR_MESSAGES } = require('../config/constants');

class ContentHandlers {
  /**
   * Register all content handlers with the bot
   * @param {Telegraf} bot - Telegraf bot instance
   */
  static register(bot) {
    // Adhkar handlers
    bot.action('adhkar:morning', ContentHandlers.handleMorningAdhkar);
    bot.action('adhkar:evening', ContentHandlers.handleEveningAdhkar);
    bot.action('adhkar:sleep', ContentHandlers.handleSleepAdhkar);
    bot.action('adhkar:stats', ContentHandlers.handleAdhkarStats);

    // Content menu handlers
    bot.action('menu:baqfat', ContentHandlers.handleBaqfat);
    bot.action('menu:avatars', ContentHandlers.handleAvatars);
    bot.action('menu:tweets', ContentHandlers.handleTweets);
    bot.action('menu:books', ContentHandlers.handleBooks);
    bot.action('menu:stories', ContentHandlers.handleStories);
    bot.action('menu:movies', ContentHandlers.handleMovies);
    bot.action('menu:wallpapers', ContentHandlers.handleWallpapers);
    bot.action('menu:headers', ContentHandlers.handleHeaders);
    bot.action('menu:songs', ContentHandlers.handleSongs);
    bot.action('menu:entertainment', ContentHandlers.handleEntertainment);

    // Quranic games command
    bot.command('qgames', ContentHandlers.handleQGamesCommand);

    logger.info('Content handlers registered successfully');
  }

  /**
   * Handle morning Adhkar
   */
  static async handleMorningAdhkar(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'view_morning_adhkar');
      await ContentHandler.handleMorningAdhkar(ctx);
    } catch (error) {
      logger.error('Morning adhkar handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle evening Adhkar
   */
  static async handleEveningAdhkar(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'view_evening_adhkar');
      await ContentHandler.handleEveningAdhkar(ctx);
    } catch (error) {
      logger.error('Evening adhkar handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle sleep Adhkar
   */
  static async handleSleepAdhkar(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'view_sleep_adhkar');
      await ContentHandler.handleSleepAdhkar(ctx);
    } catch (error) {
      logger.error('Sleep adhkar handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle Adhkar stats
   */
  static async handleAdhkarStats(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'view_adhkar_stats');
      await ContentHandler.handleAdhkarStats(ctx);
    } catch (error) {
      logger.error('Adhkar stats handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle Baqfat content
   */
  static async handleBaqfat(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'view_baqfat');
      await ContentHandler.handleBaqfat(ctx);
    } catch (error) {
      logger.error('Baqfat handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle Avatars content
   */
  static async handleAvatars(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'view_avatars');
      await ContentHandler.handleAvatars(ctx);
    } catch (error) {
      logger.error('Avatars handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle Tweets content
   */
  static async handleTweets(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'view_tweets');
      await ContentHandler.handleTweets(ctx);
    } catch (error) {
      logger.error('Tweets handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle Books content
   */
  static async handleBooks(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'view_books');
      await ContentHandler.handleBooks(ctx);
    } catch (error) {
      logger.error('Books handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle Stories content
   */
  static async handleStories(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'view_stories');
      await ContentHandler.handleStories(ctx);
    } catch (error) {
      logger.error('Stories handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle Movies content
   */
  static async handleMovies(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'view_movies');
      await ContentHandler.handleMovies(ctx);
    } catch (error) {
      logger.error('Movies handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle Wallpapers content
   */
  static async handleWallpapers(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'view_wallpapers');
      await ContentHandler.handleWallpapers(ctx);
    } catch (error) {
      logger.error('Wallpapers handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle Headers content
   */
  static async handleHeaders(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'view_headers');
      await ContentHandler.handleHeaders(ctx);
    } catch (error) {
      logger.error('Headers handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle Songs content
   */
  static async handleSongs(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'view_songs');
      await ContentHandler.handleSongs(ctx);
    } catch (error) {
      logger.error('Songs handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle Entertainment content
   */
  static async handleEntertainment(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'view_entertainment');
      await ContentHandler.handleEntertainment(ctx);
    } catch (error) {
      logger.error('Entertainment handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle Quranic games command
   */
  static async handleQGamesCommand(ctx) {
    try {
      logger.logCommand('qgames', ctx.from.id);

      const QuranicGames = require('../games/quranicGames');
      const menu = QuranicGames.formatGamesList();

      await ctx.reply(menu, { parse_mode: 'HTML' });

      logger.logCommand('qgames', ctx.from.id, true);
    } catch (error) {
      logger.error('QGames command error:', error);
      ctx.reply('❌ خدمة الألعاب غير متاحة');
    }
  }
}

module.exports = ContentHandlers;
