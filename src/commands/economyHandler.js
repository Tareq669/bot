const EconomyManager = require('../economy/economyManager');
const Formatter = require('../ui/formatter');
const Markup = require('telegraf/markup');
const { User } = require('../database/models');

class EconomyHandler {
  static async handleBalance(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) {
        return ctx.reply('❌ لم يتم العثور على ملفك');
      }

      const message = Formatter.formatBalanceInfo(user);
      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('💸 تحويل', 'eco:transfer')],
        [Markup.button.callback('⬅️ رجوع', 'menu:economy')]
      ]);

      try {
        await ctx.editMessageText(message, buttons);
      } catch (error) {
        // Ignore "message not modified" error - it's expected when content hasn't changed
        if (!error.message.includes('message is not modified')) {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleShop(ctx) {
    try {
      const items = EconomyManager.getShopItems();
      let message = '🏪 المتجر\n\n';

      items.forEach((item, index) => {
        message += `${index + 1}. ${item.name} - ${item.price} عملة\n`;
      });

      const buttons = Markup.inlineKeyboard([
        [
          Markup.button.callback('1️⃣', 'shop:buy:1'),
          Markup.button.callback('2️⃣', 'shop:buy:2'),
          Markup.button.callback('3️⃣', 'shop:buy:3')
        ],
        [
          Markup.button.callback('4️⃣', 'shop:buy:4'),
          Markup.button.callback('5️⃣', 'shop:buy:5')
        ],
        [Markup.button.callback('⬅️ رجوع', 'menu:economy')]
      ]);

      try {
        await ctx.editMessageText(message, buttons);
      } catch (error) {
        // Ignore "message not modified" error - it's expected when shop content hasn't changed
        if (!error.message.includes('message is not modified')) {
          console.error('Error editing shop message:', error);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleBuyItem(ctx, itemId) {
    try {
      const result = await EconomyManager.buyItem(ctx.from.id, itemId);

      if (result.success) {
        await ctx.answerCbQuery(result.message || '✅');
      } else {
        await ctx.answerCbQuery(result.message || '❌ خطأ');
      }

      // Refresh the shop display (handles "message not modified" gracefully)
      await this.handleShop(ctx);
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleInventory(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) {
        return ctx.reply('❌ لم يتم العثور على ملفك');
      }

      let message = '📦 حقيبتك\n\n';

      if (user.inventory.length === 0) {
        message += '❌ حقيبتك فارغة';
      } else {
        user.inventory.forEach((item, index) => {
          message += `${index + 1}. ${item.itemName} x${item.quantity}\n`;
        });
      }

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ رجوع', 'menu:economy')]
      ]);

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleDailyReward(ctx) {
    try {
      const result = await EconomyManager.claimDailyReward(ctx.from.id);

      if (result.success) {
        await ctx.reply(result.message);
      } else {
        await ctx.reply(result.message);
      }
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleEconomyStats(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) {
        return ctx.reply('❌ لم يتم العثور على ملفك');
      }

      // حساب الإحصائيات
      const totalEarnings = user.totalEarnings || user.coins;
      const totalSpending = user.totalSpending || 0;
      const netProfit = totalEarnings - totalSpending;
      const dailyAverage = Math.floor(totalEarnings / (Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)) || 1));

      const message = '📊 <b>إحصائيات الاقتصاد</b>\n\n' +
        `💰 <b>الرصيد الحالي:</b> ${user.coins.toLocaleString()} عملة\n\n` +
        '📈 <b>الإحصائيات العامة:</b>\n' +
        `• الإجمالي المكتسب: ${totalEarnings.toLocaleString()} عملة\n` +
        `• الإجمالي المُنفق: ${totalSpending.toLocaleString()} عملة\n` +
        `• الربح الصافي: ${netProfit.toLocaleString()} عملة\n` +
        `• المتوسط اليومي: ${dailyAverage.toLocaleString()} عملة\n\n` +
        '🏪 <b>نشاطك:</b>\n' +
        `• عمليات الشراء: ${user.purchasesCount || 0}\n` +
        `• التحويلات: ${user.transfersCount || 0}\n` +
        `• الألعاب اللعوب: ${user.gamesPlayed?.total || 0}\n\n` +
        '💎 <b>الترتيب:</b>\n' +
        '• الثروة: قيد التحديث\n' +
        `• الإنجازات: ${user.badges?.length || 0}`;

      const buttons = Markup.inlineKeyboard([
        [
          Markup.button.callback('💰 الرصيد', 'eco:balance'),
          Markup.button.callback('🏪 المتجر', 'eco:shop')
        ],
        [
          Markup.button.callback('📦 الحقيبة', 'eco:inventory'),
          Markup.button.callback('💸 تحويل', 'eco:transfer')
        ],
        [Markup.button.callback('⬅️ رجوع', 'menu:economy')]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleTransferStats(ctx) {
    try {
      const Transaction = require('../database/models/Transaction');
      const user = await User.findOne({ userId: ctx.from.id });

      // Get transfer statistics
      const sentTransfers = await Transaction.find({
        userId: ctx.from.id,
        type: 'transfer'
      });

      const receivedTransfers = await Transaction.find({
        relatedUserId: ctx.from.id,
        type: 'transfer'
      });

      const totalSent = sentTransfers.reduce((sum, t) => sum + t.amount, 0);
      const totalReceived = receivedTransfers.reduce((sum, t) => sum + t.amount, 0);

      const message = '💸 <b>إحصائيات التحويلات</b>\n\n' +
        '📤 <b>التحويلات التي أرسلتها:</b>\n' +
        `• العدد: ${sentTransfers.length}\n` +
        `• المبلغ الإجمالي: ${totalSent} عملة\n\n` +
        '📥 <b>التحويلات التي استقبلتها:</b>\n' +
        `• العدد: ${receivedTransfers.length}\n` +
        `• المبلغ الإجمالي: ${totalReceived} عملة\n\n` +
        `💰 <b>الرصيد الحالي:</b> ${user.coins || 0} عملة`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ رجوع', 'menu:economy')]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      console.error('Error in handleTransferStats:', error);
      ctx.reply('❌ حدث خطأ في عرض الإحصائيات');
    }
  }
}

module.exports = EconomyHandler;
