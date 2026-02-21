const Markup = require('telegraf/markup');
const { User } = require('../database/models');

class ProfileHandler {
  static escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  static formatDate(value) {
    if (!value) return 'غير متاح';
    return new Date(value).toLocaleDateString('ar-SA');
  }

  static async editOrReply(ctx, text, keyboard) {
    const extra = {
      parse_mode: 'HTML',
      reply_markup: keyboard.reply_markup
    };

    try {
      if (ctx.callbackQuery) {
        await ctx.editMessageText(text, extra);
      } else {
        await ctx.reply(text, extra);
      }
    } catch (error) {
      if (error?.description && String(error.description).includes('message is not modified')) {
        try {
          await ctx.answerCbQuery('✅');
        } catch (_err) {
          // ignore
        }
        return;
      }
      await ctx.reply(text, extra);
    }

    if (ctx.callbackQuery) {
      try {
        await ctx.answerCbQuery('✅');
      } catch (_err) {
        // ignore
      }
    }
  }

  static async handleProfileInfo(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) {
        return ctx.reply('❌ لم يتم العثور على ملفك');
      }

      const level = Number.isInteger(user.level) ? user.level : 1;
      const xp = Number.isFinite(user.xp) ? user.xp : 0;
      const coins = Number.isFinite(user.coins) ? user.coins : 0;
      const fullName = [user.firstName || 'غير معروف', user.lastName || ''].join(' ').trim();
      const username = user.username ? `@${this.escapeHtml(user.username)}` : 'بدون اسم مستخدم';
      const joinDate = this.formatDate(user.joinDate || user.createdAt);
      const lastActive = this.formatDate(user.lastActive || user.updatedAt || user.createdAt);
      const isBanned = Boolean(user.isBanned || user.banned);

      const message =
        '📊 <b>معلومات ملفك</b>\n\n' +
        `🆔 المعرّف: <code>${user.userId}</code>\n` +
        `👤 الاسم: ${this.escapeHtml(fullName)}\n` +
        `📛 المعرف: ${username}\n` +
        `🎖️ المستوى: ${level}\n` +
        `⭐ النقاط: ${xp.toLocaleString()}\n` +
        `💰 العملات: ${coins.toLocaleString()}\n` +
        `🚫 الحالة: ${isBanned ? 'محظور' : 'نشط'}\n` +
        `📅 تاريخ الانضمام: ${joinDate}\n` +
        `🕒 آخر نشاط: ${lastActive}`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🎮 الإحصائيات', 'profile:stats')],
        [Markup.button.callback('⬅️ رجوع', 'menu:profile')]
      ]);

      await this.editOrReply(ctx, message, buttons);
    } catch (error) {
      console.error('Profile info error:', error);
      ctx.reply('❌ حدث خطأ في عرض معلومات الحساب');
    }
  }

  static async handleBadges(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) {
        return ctx.reply('❌ لم يتم العثور على ملفك');
      }

      const badgeDetails = Array.isArray(user.badgeDetails) ? user.badgeDetails : [];
      const badgeNames = Array.isArray(user.badges) ? user.badges : [];

      let message = '🏅 <b>شاراتك</b>\n\n';

      if (badgeDetails.length === 0 && badgeNames.length === 0) {
        message +=
          'ℹ️ لا توجد شارات حالياً.\n\n' +
          'جرّب اللعب، إكمال الأهداف، والمشاركة في الميزات للحصول على شارات جديدة.';
      } else {
        const rendered = new Set();

        badgeDetails.forEach((badge, index) => {
          const name = badge?.name || `شارة ${index + 1}`;
          const icon = badge?.icon || '🏅';
          const source = badge?.source ? ` (${this.escapeHtml(badge.source)})` : '';
          rendered.add(name);
          message += `${index + 1}. ${icon} <b>${this.escapeHtml(name)}</b>${source}\n`;
        });

        badgeNames.forEach((name) => {
          if (!name || rendered.has(name)) return;
          message += `• 🏅 ${this.escapeHtml(name)}\n`;
        });
      }

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ رجوع', 'menu:profile')]
      ]);

      await this.editOrReply(ctx, message, buttons);
    } catch (error) {
      console.error('Badges error:', error);
      ctx.reply('❌ حدث خطأ في عرض الشارات');
    }
  }

  static async handleGameStats(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) {
        return ctx.reply('❌ لم يتم العثور على ملفك');
      }

      const { GameStats } = require('../database/models');

      const [summary] = await GameStats.aggregate([
        { $match: { userId: ctx.from.id } },
        {
          $group: {
            _id: null,
            played: { $sum: '$played' },
            won: { $sum: '$won' },
            lost: { $sum: '$lost' },
            draw: { $sum: '$draw' },
            coinsEarned: { $sum: '$coinsEarned' },
            xpEarned: { $sum: '$xpEarned' }
          }
        }
      ]);

      const [topGame] = await GameStats.aggregate([
        { $match: { userId: ctx.from.id } },
        { $group: { _id: '$gameName', played: { $sum: '$played' } } },
        { $sort: { played: -1 } },
        { $limit: 1 }
      ]);

      const fallbackPlayed = user.gamesPlayed?.total || 0;
      const fallbackWon = user.gamesPlayed?.wins || 0;
      const played = summary?.played ?? fallbackPlayed;
      const won = summary?.won ?? fallbackWon;
      const lost = summary?.lost ?? Math.max(played - won, 0);
      const draw = summary?.draw ?? 0;
      const coinsEarned = summary?.coinsEarned ?? 0;
      const xpEarned = summary?.xpEarned ?? 0;
      const winRate = played > 0 ? Math.round((won / played) * 100) : 0;
      const favoriteGame = topGame?._id || user.gamesPlayed?.favorite || 'لا يوجد';

      const message =
        '🎮 <b>إحصائيات ألعابك</b>\n\n' +
        `▶️ عدد المباريات: ${played}\n` +
        `🏆 مرات الفوز: ${won}\n` +
        `💥 مرات الخسارة: ${lost}\n` +
        `🤝 التعادل: ${draw}\n` +
        `📈 نسبة الفوز: ${winRate}%\n` +
        `💰 العملات المكتسبة: ${coinsEarned}\n` +
        `⭐ XP المكتسب من الألعاب: ${xpEarned}\n` +
        `🎯 لعبتك المفضلة: ${this.escapeHtml(String(favoriteGame))}`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ رجوع', 'menu:profile')]
      ]);

      await this.editOrReply(ctx, message, buttons);
    } catch (error) {
      console.error('Game stats error:', error);
      ctx.reply('❌ حدث خطأ في عرض الإحصائيات');
    }
  }

  static async handleGifts(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) {
        return ctx.reply('❌ لم يتم العثور على ملفك');
      }

      const ShopSystem = require('../features/shopSystem');
      const bagSummary = await ShopSystem.getUserInventorySummary(ctx.from.id);
      const streak = user.dailyReward?.streak || 0;
      const referralCount = user.referral?.referrals?.length || 0;

      let message = '🎁 <b>الهدايا والمقتنيات</b>\n\n';
      message += `${bagSummary}\n\n`;
      message += `🔥 سلسلة المكافآت اليومية: ${streak}\n`;
      message += `👥 عدد الإحالات: ${referralCount}`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🏅 شاراتي', 'profile:badges')],
        [Markup.button.callback('⬅️ رجوع', 'menu:profile')]
      ]);

      await this.editOrReply(ctx, message, buttons);
    } catch (error) {
      console.error('Gifts error:', error);
      ctx.reply('❌ حدث خطأ في عرض الهدايا');
    }
  }
}

module.exports = ProfileHandler;
