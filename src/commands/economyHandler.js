const EconomyManager = require('../economy/economyManager');
const Formatter = require('../ui/formatter');
const Markup = require('telegraf/markup');
const { User } = require('../database/models');

class EconomyHandler {
  static async handleBalance(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) {
        return ctx.reply(ctx.t('user_not_found'));
      }

      const message = Formatter.formatBalanceInfo(user, ctx.tr);
      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback(ctx.t('transfer_button'), 'eco:transfer')],
        [Markup.button.callback(ctx.t('back'), 'menu:economy')]
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
      ctx.reply(ctx.t('error'));
    }
  }

  static async handleShop(ctx) {
    try {
      const items = EconomyManager.getShopItems(ctx.lang);
      let message = `${ctx.t('economy_shop_title')}\n\n`;

      items.forEach((item, index) => {
        message += ctx.t('economy_shop_item_line', {
          index: index + 1,
          name: item.name,
          price: item.price
        }) + '\n';
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
        [Markup.button.callback(ctx.t('back'), 'menu:economy')]
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
      ctx.reply(ctx.t('error'));
    }
  }

  static async handleBuyItem(ctx, itemId) {
    try {
      const result = await EconomyManager.buyItem(ctx.from.id, itemId);

      if (result.success) {
        await ctx.answerCbQuery(result.message || '✅');
      } else {
        await ctx.answerCbQuery(result.message || ctx.t('error'));
      }

      // Refresh the shop display (handles "message not modified" gracefully)
      await this.handleShop(ctx);
    } catch (error) {
      console.error('Error:', error);
      ctx.reply(ctx.t('error'));
    }
  }

  static async handleInventory(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) {
        return ctx.reply(ctx.t('user_not_found'));
      }

      let message = `${ctx.t('economy_inventory_title')}\n\n`;

      if (user.inventory.length === 0) {
        message += ctx.t('economy_inventory_empty');
      } else {
        user.inventory.forEach((item, index) => {
          message += ctx.t('economy_inventory_item_line', {
            index: index + 1,
            name: item.itemName,
            quantity: item.quantity
          }) + '\n';
        });
      }

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback(ctx.t('back'), 'menu:economy')]
      ]);

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      console.error('Error:', error);
      ctx.reply(ctx.t('error'));
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
      ctx.reply(ctx.t('error'));
    }
  }

  static async handleEconomyStats(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) {
        return ctx.reply(ctx.t('user_not_found'));
      }

      // حساب الإحصائيات
      const totalEarnings = user.totalEarnings || user.coins;
      const totalSpending = user.totalSpending || 0;
      const netProfit = totalEarnings - totalSpending;
      const dailyAverage = Math.floor(totalEarnings / (Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)) || 1));

      const message = `${ctx.t('economy_stats_title')}\n\n` +
        `${ctx.t('economy_stats_current_balance')} ${user.coins.toLocaleString()}\n\n` +
        `${ctx.t('economy_stats_general')}\n` +
        `${ctx.t('economy_stats_total_earnings')} ${totalEarnings.toLocaleString()}\n` +
        `${ctx.t('economy_stats_total_spending')} ${totalSpending.toLocaleString()}\n` +
        `${ctx.t('economy_stats_net_profit')} ${netProfit.toLocaleString()}\n` +
        `${ctx.t('economy_stats_daily_avg')} ${dailyAverage.toLocaleString()}\n\n` +
        `${ctx.t('economy_stats_activity')}\n` +
        `${ctx.t('economy_stats_purchases')} ${user.purchasesCount || 0}\n` +
        `${ctx.t('economy_stats_transfers')} ${user.transfersCount || 0}\n` +
        `${ctx.t('economy_stats_games')} ${user.gamesPlayed?.total || 0}\n\n` +
        `${ctx.t('economy_stats_ranking')}\n` +
        `${ctx.t('economy_stats_wealth')} ${ctx.t('economy_stats_wealth_pending')}\n` +
        `${ctx.t('economy_stats_achievements')} ${user.badges?.length || 0}`;

      const buttons = Markup.inlineKeyboard([
        [
          Markup.button.callback(ctx.t('balance_title'), 'eco:balance'),
          Markup.button.callback(ctx.t('economy_shop_title'), 'eco:shop')
        ],
        [
          Markup.button.callback(ctx.t('economy_inventory_title'), 'eco:inventory'),
          Markup.button.callback(ctx.t('transfer_button'), 'eco:transfer')
        ],
        [Markup.button.callback(ctx.t('back'), 'menu:economy')]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      console.error('Error:', error);
      ctx.reply(ctx.t('error'));
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

      const message = `${ctx.t('transfer_stats_title')}\n\n` +
        `${ctx.t('transfer_sent')}\n` +
        `${ctx.t('transfer_sent_count')} ${sentTransfers.length}\n` +
        `${ctx.t('transfer_sent_amount')} ${totalSent}\n\n` +
        `${ctx.t('transfer_received')}\n` +
        `${ctx.t('transfer_received_count')} ${receivedTransfers.length}\n` +
        `${ctx.t('transfer_received_amount')} ${totalReceived}\n\n` +
        `${ctx.t('transfer_balance')} ${user.coins || 0}`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback(ctx.t('back'), 'menu:economy')]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      console.error('Error in handleTransferStats:', error);
      ctx.reply(ctx.t('error'));
    }
  }
}

module.exports = EconomyHandler;
