/**
 * Payment Integration System
 * نظام الدفع والتحويلات المالية
 */

const { logger } = require('../utils/helpers');
const User = require('../database/models/User');
const Transaction = require('../database/models/Transaction');

class PaymentSystem {
  /**
   * تحويل نقاط
   */
  static async transferPoints(fromUserId, toUserId, amount, reason = 'تحويل') {
    try {
      if (amount <= 0) {
        return { success: false, message: '❌ المبلغ يجب أن يكون أكبر من صفر' };
      }

      const sender = await User.findById(fromUserId);
      const receiver = await User.findById(toUserId);

      if (!sender || !receiver) {
        return { success: false, message: '❌ المستخدم غير موجود' };
      }

      if (sender.coins < amount) {
        return {
          success: false,
          message: `❌ رصيد غير كافي!\nلديك: ${sender.coins}\nالمطلوب: ${amount}`
        };
      }

      // تنفيذ التحويل
      sender.coins -= amount;
      receiver.coins += amount;

      await sender.save();
      await receiver.save();

      // تسجيل العملية
      await Transaction.create({
        userId: fromUserId,
        type: 'transfer_out',
        amount,
        description: `تحويل إلى ${receiver.firstName || 'مستخدم'}: ${reason}`,
        balance: sender.coins
      });

      await Transaction.create({
        userId: toUserId,
        type: 'transfer_in',
        amount,
        description: `تحويل من ${sender.firstName || 'مستخدم'}: ${reason}`,
        balance: receiver.coins
      });

      logger.info(`✅ تم تحويل ${amount} نقطة من ${fromUserId} إلى ${toUserId}`);

      return {
        success: true,
        message: `✅ تم التحويل بنجاح!\n💰 تم تحويل ${amount} نقطة`,
        newBalance: sender.coins
      };
    } catch (error) {
      logger.error(`خطأ في التحويل: ${error.message}`);
      return { success: false, message: '❌ حدث خطأ' };
    }
  }

  /**
   * إضافة رصيد (للإدارة)
   */
  static async addBalance(userId, amount, reason = 'إضافة رصيد') {
    try {
      const user = await User.findById(userId);
      if (!user) return { success: false, message: 'المستخدم غير موجود' };

      user.coins += amount;
      await user.save();

      await Transaction.create({
        userId,
        type: 'admin_add',
        amount,
        description: reason,
        balance: user.coins
      });

      logger.info(`✅ تمت إضافة ${amount} نقطة للمستخدم ${userId}`);
      return { success: true, message: `✅ تمت إضافة ${amount} نقطة` };
    } catch (error) {
      logger.error(`خطأ في إضافة الرصيد: ${error.message}`);
      return { success: false, message: '❌ حدث خطأ' };
    }
  }

  /**
   * خصم رصيد (للإدارة)
   */
  static async deductBalance(userId, amount, reason = 'خصم رصيد') {
    try {
      const user = await User.findById(userId);
      if (!user) return { success: false, message: 'المستخدم غير موجود' };

      if (user.coins < amount) {
        return { success: false, message: 'رصيد غير كافي' };
      }

      user.coins -= amount;
      await user.save();

      await Transaction.create({
        userId,
        type: 'admin_deduct',
        amount,
        description: reason,
        balance: user.coins
      });

      logger.info(`✅ تم خصم ${amount} نقطة من المستخدم ${userId}`);
      return { success: true, message: '✅ تم الخصم بنجاح' };
    } catch (error) {
      logger.error(`خطأ في الخصم: ${error.message}`);
      return { success: false, message: '❌ حدث خطأ' };
    }
  }

  /**
   * تحويل نقاط للخير
   */
  static async donateToCharity(userId, amount, charityType = 'عام') {
    try {
      const user = await User.findById(userId);
      if (!user) return { success: false, message: 'المستخدم غير موجود' };

      if (user.coins < amount) {
        return { success: false, message: 'رصيد غير كافي' };
      }

      user.coins -= amount;
      user.stats = user.stats || {};
      user.stats.totalDonated = (user.stats.totalDonated || 0) + amount;

      await user.save();

      await Transaction.create({
        userId,
        type: 'charity_donation',
        amount,
        description: `تبرع للخير (${charityType})`,
        balance: user.coins
      });

      logger.info(`✅ تبرع ${amount} نقطة من ${userId} للخير`);

      return {
        success: true,
        message: `✅ شكراً لتبرعك!\n💚 تم التبرع بـ ${amount} نقطة\n\nجزاك الله خيراً`,
        newBalance: user.coins
      };
    } catch (error) {
      logger.error(`خطأ في التبرع: ${error.message}`);
      return { success: false, message: '❌ حدث خطأ' };
    }
  }

  /**
   * عرض سجل المعاملات
   */
  static async getTransactionHistory(userId, limit = 10) {
    try {
      const transactions = await Transaction.find({ userId })
        .sort({ date: -1 })
        .limit(limit);

      let text = '📊 <b>سجل المعاملات</b>\n\n';

      transactions.forEach((trans, index) => {
        const date = new Date(trans.date).toLocaleDateString('ar');
        const type = this.getTransactionTypeEmoji(trans.type);

        text += `${index + 1}. ${type} ${trans.description}\n`;
        text += `   💰 ${trans.amount} نقطة | ${date}\n\n`;
      });

      return text || 'لا توجد معاملات';
    } catch (error) {
      logger.error(`خطأ في جلب السجل: ${error.message}`);
      return 'حدث خطأ';
    }
  }

  /**
   * رمز نوع المعاملة
   */
  static getTransactionTypeEmoji(type) {
    const types = {
      'transfer_out': '📤',
      'transfer_in': '📥',
      'admin_add': '➕',
      'admin_deduct': '➖',
      'charity_donation': '❤️',
      'shop_purchase': '🛍️',
      'game_reward': '🎮',
      'daily_reward': '📦'
    };
    return types[type] || '•';
  }

  /**
   * إحصائيات المال
   */
  static async getFinancialStats(userId) {
    try {
      const user = await User.findById(userId);
      const transactions = await Transaction.find({ userId });

      const stats = {
        currentBalance: user.coins,
        totalReceived: 0,
        totalSent: 0,
        totalDonated: user.stats?.totalDonated || 0,
        totalEarned: 0,
        totalSpent: 0
      };

      transactions.forEach(trans => {
        switch (trans.type) {
          case 'transfer_in':
            stats.totalReceived += trans.amount;
            break;
          case 'transfer_out':
            stats.totalSent += trans.amount;
            break;
          case 'game_reward':
          case 'daily_reward':
            stats.totalEarned += trans.amount;
            break;
          case 'shop_purchase':
            stats.totalSpent += trans.amount;
            break;
        }
      });

      return stats;
    } catch (error) {
      logger.error(`خطأ في الإحصائيات: ${error.message}`);
      return null;
    }
  }

  /**
   * تنسيق الإحصائيات المالية
   */
  static async formatFinancialStats(userId) {
    const stats = await this.getFinancialStats(userId);

    return `
💰 <b>إحصائيات مالية</b>

💳 الرصيد الحالي: ${stats.currentBalance}
📥 الإجمالي المستقبل: ${stats.totalReceived}
📤 الإجمالي المرسل: ${stats.totalSent}
❤️ المبلغ المتبرع به: ${stats.totalDonated}
⭐ الأرباح: ${stats.totalEarned}
🛍️ المصروفات: ${stats.totalSpent}
`.trim();
  }
}

module.exports = PaymentSystem;
