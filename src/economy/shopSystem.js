const { ShopItem, User, Transaction } = require('../database/models');
const { logger } = require('../utils/helpers');

/**
 * نظام المتجر الكامل
 * إدارة البيع والشراء والعروض
 */
class ShopSystem {
  /**
   * الحصول على جميع عناصر المتجر النشطة
   */
  static async getAllShopItems() {
    try {
      const items = await ShopItem.find({ active: true })
        .sort({ category: 1, price: 1 });
      return items || [];
    } catch (error) {
      logger.error('خطأ في الحصول على عناصر المتجر:', error);
      return [];
    }
  }

  /**
   * الحصول على عناصر المتجر حسب الفئة
   */
  static async getItemsByCategory(category) {
    try {
      if (!category) return [];

      const items = await ShopItem.find({
        category: category,
        active: true
      }).sort({ price: 1 });

      return items || [];
    } catch (error) {
      logger.error('خطأ في الحصول على عناصر الفئة:', error);
      return [];
    }
  }

  /**
   * شراء عنصر من المتجر
   */
  static async buyItem(userId, itemId) {
    try {
      const item = await ShopItem.findById(itemId);
      if (!item) {
        return {
          success: false,
          message: '❌ العنصر غير موجود'
        };
      }

      if (!item.active) {
        return {
          success: false,
          message: '❌ هذا العنصر غير متاح حالياً'
        };
      }

      const user = await User.findOne({ userId });
      if (!user) {
        return {
          success: false,
          message: '❌ لم يتم العثور على ملفك الشخصي'
        };
      }

      // التحقق من الرصيد
      if (user.coins < item.price) {
        const needed = item.price - user.coins;
        return {
          success: false,
          message: `❌ رصيدك غير كافي!\n\nتحتاج: ${item.price} عملة\nلديك: ${user.coins} عملة\nناقص: ${needed} عملة`
        };
      }

      // تنفيذ الشراء
      user.coins -= item.price;
      user.totalSpent = (user.totalSpent || 0) + item.price;
      user.inventory = user.inventory || [];
      user.inventory.push({
        itemId: item._id,
        name: item.name,
        purchasedAt: new Date()
      });

      await user.save();

      // تسجيل المعاملة
      await Transaction.create({
        userId,
        type: 'purchase',
        amount: item.price,
        description: `شراء: ${item.name}`,
        itemId: item._id,
        timestamp: new Date()
      });

      logger.info(`المستخدم ${userId} اشترى: ${item.name}`);

      return {
        success: true,
        message: `✅ تم الشراء بنجاح!\n\n📦 <b>${item.name}</b>\n💰 السعر: ${item.price} عملة\n💵 الرصيد المتبقي: ${user.coins}`
      };
    } catch (error) {
      logger.error('خطأ في شراء العنصر:', error);
      return {
        success: false,
        message: '❌ حدث خطأ أثناء الشراء'
      };
    }
  }

  /**
   * إضافة عنصر جديد للمتجر (سلطة المسؤول فقط)
   */
  static async addItem(itemData) {
    try {
      const newItem = await ShopItem.create({
        name: itemData.name,
        description: itemData.description,
        price: itemData.price,
        category: itemData.category,
        icon: itemData.icon || '📦',
        active: true,
        limited: itemData.limited || false,
        createdAt: new Date()
      });

      logger.info(`تم إضافة عنصر جديد: ${itemData.name}`);
      return newItem;
    } catch (error) {
      logger.error('خطأ في إضافة العنصر:', error);
      return null;
    }
  }

  /**
   * تحديث سعر العنصر
   */
  static async updateItemPrice(itemId, newPrice) {
    try {
      if (newPrice < 0) return null;

      const item = await ShopItem.findByIdAndUpdate(
        itemId,
        { price: newPrice },
        { new: true }
      );

      logger.info(`تم تحديث سعر: ${item?.name} إلى ${newPrice}`);
      return item;
    } catch (error) {
      logger.error('خطأ في تحديث السعر:', error);
      return null;
    }
  }

  /**
   * تعطيل عنصر في المتجر
   */
  static async deactivateItem(itemId) {
    try {
      const item = await ShopItem.findByIdAndUpdate(
        itemId,
        { active: false },
        { new: true }
      );

      logger.info(`تم تعطيل: ${item?.name}`);
      return item;
    } catch (error) {
      logger.error('خطأ في تعطيل العنصر:', error);
      return null;
    }
  }

  /**
   * تفعيل عنصر في المتجر
   */
  static async activateItem(itemId) {
    try {
      const item = await ShopItem.findByIdAndUpdate(
        itemId,
        { active: true },
        { new: true }
      );

      logger.info(`تم تفعيل: ${item?.name}`);
      return item;
    } catch (error) {
      logger.error('خطأ في تفعيل العنصر:', error);
      return null;
    }
  }

  /**
   * حساب إجمالي القيمة المباعة
   */
  static async getTotalSales() {
    try {
      const result = await Transaction.aggregate([
        { $match: { type: 'purchase' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      return result[0]?.total || 0;
    } catch (error) {
      logger.error('خطأ في حساب المبيعات:', error);
      return 0;
    }
  }

  /**
   * الحصول على إحصائيات المتجر الكاملة
   */
  static async getShopStats() {
    try {
      const totalItems = await ShopItem.countDocuments({ active: true });
      const totalSales = await this.getTotalSales();
      const totalTransactions = await Transaction.countDocuments({ type: 'purchase' });

      return {
        totalItems,
        totalSales,
        totalTransactions,
        averagePrice: totalTransactions > 0 ? Math.round(totalSales / totalTransactions) : 0,
        lastUpdate: new Date()
      };
    } catch (error) {
      logger.error('خطأ في الحصول على إحصائيات المتجر:', error);
      return null;
    }
  }

  /**
   * الحصول على عناصر المخزون الخاصة بالمستخدم
   */
  static async getUserInventory(userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return [];

      return user.inventory || [];
    } catch (error) {
      logger.error('خطأ في الحصول على المخزون:', error);
      return [];
    }
  }

  /**
   * حذف عنصر من المخزون
   */
  static async removeFromInventory(userId, inventoryIndex) {
    try {
      const user = await User.findOne({ userId });
      if (!user || !user.inventory) return false;

      if (inventoryIndex < 0 || inventoryIndex >= user.inventory.length) {
        return false;
      }

      user.inventory.splice(inventoryIndex, 1);
      await user.save();

      return true;
    } catch (error) {
      logger.error('خطأ في حذف العنصر من المخزون:', error);
      return false;
    }
  }

  /**
   * الحصول على أفضل العناصر المباعة
   */
  static async getTopSellingItems(limit = 5) {
    try {
      const topItems = await Transaction.aggregate([
        { $match: { type: 'purchase' } },
        { $group: {
          _id: '$itemId',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$amount' }
        }},
        { $sort: { count: -1 } },
        { $limit: limit }
      ]);

      return topItems;
    } catch (error) {
      logger.error('خطأ في الحصول على أفضل العناصر:', error);
      return [];
    }
  }
}

module.exports = ShopSystem;