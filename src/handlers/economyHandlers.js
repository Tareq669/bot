/**
 * Economy Handlers
 * Handles all economy-related actions including shop, balance, transfers, etc.
 */

const { logger } = require('../utils/logger');
const EconomyHandler = require('../commands/economyHandler');
const { ERROR_MESSAGES } = require('../config/constants');

class EconomyHandlers {
  /**
   * Register all economy handlers with the bot
   * @param {Telegraf} bot - Telegraf bot instance
   */
  static register(bot) {
    // Economy actions
    bot.action('eco:balance', EconomyHandlers.handleBalance);
    bot.action('eco:shop', EconomyHandlers.handleShop);
    bot.action(/shop:buy:(\d+)/, EconomyHandlers.handleBuyItem);
    bot.action('eco:inventory', EconomyHandlers.handleInventory);
    bot.action('eco:stats', EconomyHandlers.handleEconomyStats);

    // Shop system command
    bot.command('shop', EconomyHandlers.handleShopCommand);

    // Transfer command
    bot.command('transfer', EconomyHandlers.handleTransferCommand);

    logger.info('Economy handlers registered successfully');
  }

  /**
   * Handle balance action
   */
  static async handleBalance(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'view_balance');
      await EconomyHandler.handleBalance(ctx);
    } catch (error) {
      logger.error('Balance handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle shop action
   */
  static async handleShop(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'view_shop');
      await EconomyHandler.handleShop(ctx);
    } catch (error) {
      logger.error('Shop handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle buy item action
   */
  static async handleBuyItem(ctx) {
    try {
      const itemId = parseInt(ctx.match[1]);
      logger.logInteraction(ctx.from.id, 'buy_item', { itemId });
      await EconomyHandler.handleBuyItem(ctx, itemId);
    } catch (error) {
      logger.error('Buy item handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle inventory action
   */
  static async handleInventory(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'view_inventory');
      await EconomyHandler.handleInventory(ctx);
    } catch (error) {
      logger.error('Inventory handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle economy stats action
   */
  static async handleEconomyStats(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'view_economy_stats');
      await EconomyHandler.handleEconomyStats(ctx);
    } catch (error) {
      logger.error('Economy stats handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle shop command
   */
  static async handleShopCommand(ctx) {
    try {
      logger.logCommand('shop', ctx.from.id);

      const ShopSystem = require('../features/shopSystem');
      const menu = ShopSystem.formatShopMenu();

      await ctx.reply(menu, { parse_mode: 'HTML' });

      logger.logCommand('shop', ctx.from.id, true);
    } catch (error) {
      logger.error('Shop command error:', error);
      ctx.reply('❌ خدمة المتجر غير متاحة');
    }
  }

  /**
   * Handle transfer command
   */
  static async handleTransferCommand(ctx) {
    try {
      logger.logCommand('transfer', ctx.from.id);

      // Payment system integration would go here
      const msg = ctx.message.text.split(' ');

      if (msg.length < 3) {
        return ctx.reply(
          '📝 <b>طريقة التحويل:</b>\n\n' +
          'استخدم: /transfer @username amount\n' +
          'مثال: /transfer @user 100',
          { parse_mode: 'HTML' }
        );
      }

      await ctx.reply('🔄 جاري معالجة التحويل...');

      logger.logInteraction(ctx.from.id, 'transfer_initiated', {
        to: msg[1],
        amount: msg[2]
      });
    } catch (error) {
      logger.error('Transfer command error:', error);
      ctx.reply('❌ حدث خطأ في التحويل');
    }
  }
}

module.exports = EconomyHandlers;
