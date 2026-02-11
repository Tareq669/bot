/**
 * Moderation Handlers
 * Handles all moderation-related actions for group management
 */

const { logger } = require('../utils/logger');
const { ERROR_MESSAGES } = require('../config/constants');

class ModerationHandlers {
  /**
   * Register all moderation handlers with the bot
   */
  static register() {
    // Note: Most moderation is handled through ModerationManager
    // This is a placeholder for future moderation action handlers

    logger.info('Moderation handlers registered successfully');
  }

  /**
   * Check if user has moderation permissions
   * @param {Object} ctx - Telegram context
   * @param {number} groupId - Group ID
   * @returns {Promise<boolean>} True if user has permissions
   */
  static async hasModPermissions(ctx, groupId) {
    try {
      const member = await ctx.telegram.getChatMember(groupId, ctx.from.id);
      return ['creator', 'administrator'].includes(member.status);
    } catch (error) {
      logger.error('Permission check error:', error);
      return false;
    }
  }

  /**
   * Handle ban user action
   * @param {Object} ctx - Telegram context
   * @param {number} userId - User ID to ban
   * @param {string} reason - Ban reason
   */
  static async handleBan(ctx, userId, reason = 'غير محدد') {
    try {
      const hasPermission = await ModerationHandlers.hasModPermissions(ctx, ctx.chat.id);

      if (!hasPermission) {
        return ctx.reply(ERROR_MESSAGES.NO_PERMISSION);
      }

      await ctx.telegram.banChatMember(ctx.chat.id, userId);

      logger.logInteraction(ctx.from.id, 'ban_user', {
        bannedUserId: userId,
        reason
      });

      await ctx.reply(`✅ تم حظر المستخدم\nالسبب: ${reason}`);
    } catch (error) {
      logger.error('Ban handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle kick user action
   * @param {Object} ctx - Telegram context
   * @param {number} userId - User ID to kick
   */
  static async handleKick(ctx, userId) {
    try {
      const hasPermission = await ModerationHandlers.hasModPermissions(ctx, ctx.chat.id);

      if (!hasPermission) {
        return ctx.reply(ERROR_MESSAGES.NO_PERMISSION);
      }

      await ctx.telegram.banChatMember(ctx.chat.id, userId);
      await ctx.telegram.unbanChatMember(ctx.chat.id, userId);

      logger.logInteraction(ctx.from.id, 'kick_user', { kickedUserId: userId });

      await ctx.reply('✅ تم طرد المستخدم');
    } catch (error) {
      logger.error('Kick handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle mute user action
   * @param {Object} ctx - Telegram context
   * @param {number} userId - User ID to mute
   * @param {number} duration - Mute duration in seconds
   */
  static async handleMute(ctx, userId, duration = 3600) {
    try {
      const hasPermission = await ModerationHandlers.hasModPermissions(ctx, ctx.chat.id);

      if (!hasPermission) {
        return ctx.reply(ERROR_MESSAGES.NO_PERMISSION);
      }

      const until = Math.floor(Date.now() / 1000) + duration;

      await ctx.telegram.restrictChatMember(ctx.chat.id, userId, {
        permissions: {
          can_send_messages: false
        },
        until_date: until
      });

      logger.logInteraction(ctx.from.id, 'mute_user', {
        mutedUserId: userId,
        duration
      });

      await ctx.reply(`✅ تم كتم المستخدم لمدة ${Math.floor(duration / 60)} دقيقة`);
    } catch (error) {
      logger.error('Mute handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle unmute user action
   * @param {Object} ctx - Telegram context
   * @param {number} userId - User ID to unmute
   */
  static async handleUnmute(ctx, userId) {
    try {
      const hasPermission = await ModerationHandlers.hasModPermissions(ctx, ctx.chat.id);

      if (!hasPermission) {
        return ctx.reply(ERROR_MESSAGES.NO_PERMISSION);
      }

      await ctx.telegram.restrictChatMember(ctx.chat.id, userId, {
        permissions: {
          can_send_messages: true,
          can_send_media_messages: true,
          can_send_polls: true,
          can_send_other_messages: true,
          can_add_web_page_previews: true,
          can_change_info: false,
          can_invite_users: true,
          can_pin_messages: false
        }
      });

      logger.logInteraction(ctx.from.id, 'unmute_user', { unmutedUserId: userId });

      await ctx.reply('✅ تم إلغاء كتم المستخدم');
    } catch (error) {
      logger.error('Unmute handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle warn user action
   * @param {Object} ctx - Telegram context
   * @param {number} userId - User ID to warn
   * @param {string} reason - Warning reason
   */
  static async handleWarn(ctx, userId, reason = 'غير محدد') {
    try {
      const hasPermission = await ModerationHandlers.hasModPermissions(ctx, ctx.chat.id);

      if (!hasPermission) {
        return ctx.reply(ERROR_MESSAGES.NO_PERMISSION);
      }

      const { User } = require('../database/models');
      const user = await User.findOne({ userId });

      if (user) {
        user.warnings = (user.warnings || 0) + 1;
        await user.save();

        logger.logInteraction(ctx.from.id, 'warn_user', {
          warnedUserId: userId,
          warnings: user.warnings,
          reason
        });

        await ctx.reply(
          '⚠️ تحذير للمستخدم\n' +
          `السبب: ${reason}\n` +
          `عدد التحذيرات: ${user.warnings}/3`
        );

        // Auto-ban after 3 warnings
        if (user.warnings >= 3) {
          await ModerationHandlers.handleBan(ctx, userId, 'تجاوز عدد التحذيرات المسموح');
        }
      }
    } catch (error) {
      logger.error('Warn handler error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }
}

module.exports = ModerationHandlers;
