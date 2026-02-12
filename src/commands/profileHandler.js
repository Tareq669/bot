const Markup = require('telegraf/markup');
const { User } = require('../database/models');
const Formatter = require('../ui/formatter');
const GameManager = require('../games/gameManager');

class ProfileHandler {
  // Handle profile info
  static async handleProfileInfo(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) {
        return ctx.reply(ctx.t('user_not_found'));
      }

      const unknown = ctx.t('profile_unknown');
      const noUsername = ctx.t('profile_no_username');
      const message = `
╔════════════════════════════════════╗
║     ${ctx.t('profile_info_title')}     
╠════════════════════════════════════╣
║ ${ctx.t('profile_id_label')} ${user.userId}
║ ${ctx.t('profile_name_label')} ${user.firstName || unknown} ${user.lastName || ''}
║ @${user.username || noUsername}
║ ${ctx.t('profile_level_label')} ${user.level}
║ ${ctx.t('profile_xp_label')} ${user.xp}
║ ${ctx.t('profile_coins_label')} ${user.coins}
║ ${ctx.t('profile_joined_label')} ${new Date(user.createdAt).toLocaleDateString('ar-SA')}
╚════════════════════════════════════╝
      `;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback(ctx.t('back'), 'menu:profile')]
      ]);

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      console.error('Error:', error);
      ctx.reply(ctx.t('error'));
    }
  }

  // Handle badges
  static async handleBadges(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) {
        return ctx.reply(ctx.t('user_not_found'));
      }

      let message = `
${ctx.t('profile_badges_title')}

`;
      if (user.badges.length === 0) {
        message += `${ctx.t('profile_no_badges')}\n\n${ctx.t('profile_no_badges_hint')}`;
      } else {
        user.badges.forEach(badge => {
          message += `✅ ${badge}\n`;
        });
      }

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback(ctx.t('back'), 'menu:profile')]
      ]);

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      console.error('Error:', error);
      ctx.reply(ctx.t('error'));
    }
  }

  // Handle game stats
  static async handleGameStats(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) {
        return ctx.reply(ctx.t('user_not_found'));
      }

      const message = `
${ctx.t('profile_games_title')}

${ctx.t('profile_games_played')} ${user.gamesPlayed.total}
${ctx.t('profile_games_wins')} ${user.gamesPlayed.wins}
${ctx.t('profile_games_win_rate')} ${user.gamesPlayed.total > 0 ? Math.round((user.gamesPlayed.wins / user.gamesPlayed.total) * 100) : 0}%
      `;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback(ctx.t('back'), 'menu:profile')]
      ]);

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      console.error('Error:', error);
      ctx.reply(ctx.t('error'));
    }
  }

  // Handle gifts
  static async handleGifts(ctx) {
    try {
      const message = `
${ctx.t('profile_gifts_title')}

${ctx.t('profile_gifts_none')}
      `;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback(ctx.t('back'), 'menu:profile')]
      ]);

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      console.error('Error:', error);
      ctx.reply(ctx.t('error'));
    }
  }
}

module.exports = ProfileHandler;
