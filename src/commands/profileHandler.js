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
        return ctx.reply('❌ لم يتم العثور على ملفك');
      }

      const message = `
╔════════════════════════════════════╗
    ║     📊 معلومات ملفك     
╠════════════════════════════════════╣
    ║ 🆔 المعرف: ${user.userId}
    ║ 📝 الاسم: ${user.firstName || 'غير معروف'} ${user.lastName || ''}
    ║ @${user.username || 'بدون username'}
    ║ 🎖️ المستوى: ${user.level}
    ║ ⭐ النقاط: ${user.xp}
    ║ 💰 العملات: ${user.coins}
    ║ 📅 تاريخ الانضمام: ${new Date(user.createdAt).toLocaleDateString('ar-SA')}
╚════════════════════════════════════╝
      `;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ رجوع', 'menu:profile')]
      ]);

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  // Handle badges
  static async handleBadges(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) {
        return ctx.reply('❌ لم يتم العثور على ملفك');
      }

      let message = `
🏅 شاراتك:

`;
      if (user.badges.length === 0) {
        message += '❌ لم تحصل على أي شارات بعد\n\nابدأ باللعب لتحصل على شارات!';
      } else {
        user.badges.forEach(badge => {
          message += `✅ ${badge}\n`;
        });
      }

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ رجوع', 'menu:profile')]
      ]);

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  // Handle game stats
  static async handleGameStats(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) {
        return ctx.reply('❌ لم يتم العثور على ملفك');
      }

      const message = `
    📊 إحصائيات الألعاب:

    🎮 الألعاب الممارسة: ${user.gamesPlayed.total}
    🏆 الانتصارات: ${user.gamesPlayed.wins}
    📈 نسبة الفوز: ${user.gamesPlayed.total > 0 ? Math.round((user.gamesPlayed.wins / user.gamesPlayed.total) * 100) : 0}%
      `;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ رجوع', 'menu:profile')]
      ]);

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  // Handle gifts
  static async handleGifts(ctx) {
    try {
      const message = `
🎁 الهدايا:

لا توجد هدايا متاحة حالياً.
      `;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ رجوع', 'menu:profile')]
      ]);

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }
}

module.exports = ProfileHandler;
