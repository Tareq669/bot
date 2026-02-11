/**
 * In-App Shop System
 * متجر داخل البوت لشراء الميزات والعناصر
 */

const { logger } = require('../utils/helpers');
const User = require('../database/models/User');

class ShopSystem {
  /**
   * قائمة السلع المتاحة
   */
  static SHOP_ITEMS = {
    // شارات خاصة
    'premium_badge': {
      name: '⭐ شارة فريميوم',
      price: 500,
      type: 'badge',
      description: 'شارة حصرية لتمييزك عن باقي المستخدمين'
    },
    'vip_badge': {
      name: '👑 شارة VIP',
      price: 1000,
      type: 'badge',
      description: 'شارة VIP مميزة وحصرية'
    },
    'legend_badge': {
      name: '🏆 شارة الأسطورة',
      price: 2000,
      type: 'badge',
      description: 'أعلى شارة في النظام'
    },
    // boost للألعاب
    'game_boost_2x': {
      name: '2️⃣ ضعف النقاط - 24 ساعة',
      price: 300,
      type: 'boost',
      duration: 86400,
      description: 'احصل على ضعف نقاط الألعاب'
    },
    'game_boost_3x': {
      name: '3️⃣ ثلاثة أضعاف النقاط - 24 ساعة',
      price: 500,
      type: 'boost',
      duration: 86400,
      description: 'احصل على 3 أضعاف نقاط الألعاب'
    },
    // إضافات للحساب
    'extra_daily_reward': {
      name: '📦 مكافأة يومية إضافية',
      price: 200,
      type: 'daily_bonus',
      description: 'احصل على 25% إضافي من المكافأة اليومية'
    },
    // أسلحة ألعاب
    'special_weapon': {
      name: '⚔️ سلاح خاص',
      price: 400,
      type: 'game_item',
      description: 'سلاح قوي للاستخدام في الألعاب'
    }
  };

  /**
   * عرض المتجر
   */
  static formatShopMenu() {
    let text = '🛍️ <b>المتجر الإسلامي</b>\n\n';
    text += 'اختر واشتري ما يعجبك:\n\n';

    let index = 1;
    for (const [key, item] of Object.entries(this.SHOP_ITEMS)) {
      text += `${index}️⃣ <b>${item.name}</b>\n`;
      text += `💰 السعر: <code>${item.price}</code> نقطة\n`;
      text += `📝 ${item.description}\n\n`;
      index++;
    }

    text += '💡 اشتر من المتجر بأوامر مثل: <code>/shop buy premium_badge</code>';
    return text;
  }

  /**
   * شراء عنصر
   */
  static async buyItem(userId, itemKey) {
    try {
      const item = this.SHOP_ITEMS[itemKey];
      if (!item) return { success: false, message: '❌ العنصر غير موجود' };

      const user = await User.findById(userId);
      if (user.coins < item.price) {
        return {
          success: false,
          message: `❌ رصيد غير كافي!\nلديك: ${user.coins} نقطة\nالمطلوب: ${item.price} نقطة`
        };
      }

      // خصم من حساب المستخدم
      user.coins -= item.price;

      // إضافة العنصر
      if (item.type === 'badge') {
        user.badgeDetails.push({
          name: item.name,
          obtainedDate: new Date(),
          rarity: 'special'
        });
      } else if (item.type === 'boost') {
        user.activeBoosts = user.activeBoosts || [];
        user.activeBoosts.push({
          type: itemKey,
          endDate: new Date(Date.now() + item.duration * 1000),
          multiplier: itemKey.includes('3x') ? 3 : 2
        });
      } else if (item.type === 'game_item') {
        user.inventory = user.inventory || [];
        user.inventory.push({
          itemId: itemKey,
          name: item.name,
          purchased: new Date()
        });
      }

      await user.save();

      return {
        success: true,
        message: `✅ تم الشراء بنجاح!\n\n🎉 ${item.name}\n💰 تم خصم ${item.price} نقطة\n\nرصيدك الآن: ${user.coins} نقطة`
      };

    } catch (error) {
      logger.error(`خطأ في شراء العنصر: ${error.message}`);
      return { success: false, message: '❌ حدث خطأ أثناء الشراء' };
    }
  }

  /**
   * الحصول على تفاصيل العنصر
   */
  static getItemDetails(itemKey) {
    const item = this.SHOP_ITEMS[itemKey];
    if (!item) return null;

    let text = `<b>${item.name}</b>\n\n`;
    text += `💰 <b>السعر:</b> ${item.price} نقطة\n`;
    text += `📝 <b>الوصف:</b> ${item.description}\n`;
    text += `🏷️ <b>النوع:</b> ${item.type}\n\n`;
    text += `للشراء: <code>/shop buy ${itemKey}</code>`;

    return text;
  }

  /**
   * عرض المشتريات السابقة للمستخدم
   */
  static async getUserPurchases(userId) {
    try {
      const user = await User.findById(userId);

      if (!user.badgeDetails || user.badgeDetails.length === 0) {
        return '📦 لم تشترِ أي عناصر حتى الآن';
      }

      let text = '📦 <b>مشترياتك</b>\n\n';
      user.badgeDetails.forEach((badge, index) => {
        const date = new Date(badge.obtainedDate).toLocaleDateString('ar');
        text += `${index + 1}. ${badge.name} - ${date}\n`;
      });

      if (user.activeBoosts && user.activeBoosts.length > 0) {
        text += '\n⚡ <b>الـ Boosts النشطة:</b>\n';
        user.activeBoosts.forEach((boost, index) => {
          const endDate = new Date(boost.endDate).toLocaleDateString('ar');
          text += `${index + 1}. x${boost.multiplier} نقاط حتى ${endDate}\n`;
        });
      }

      return text;
    } catch (error) {
      logger.error(`خطأ في عرض المشتريات: ${error.message}`);
      return '❌ حدث خطأ';
    }
  }

  /**
   * حساب النقاط مع الـ Boost
   */
  static async calculatePointsWithBoost(userId, basePoints) {
    try {
      const user = await User.findById(userId);

      // تنظيف الـ Boosts المنتهية
      if (user.activeBoosts) {
        user.activeBoosts = user.activeBoosts.filter(b => new Date(b.endDate) > new Date());
      }

      // حساب الضارب الأعلى
      let multiplier = 1;
      if (user.activeBoosts && user.activeBoosts.length > 0) {
        multiplier = Math.max(...user.activeBoosts.map(b => b.multiplier));
      }

      return basePoints * multiplier;
    } catch (error) {
      logger.error(`خطأ في حساب النقاط: ${error.message}`);
      return basePoints;
    }
  }

  /**
   * عرض أفضل العناصر مبيعاً
   */
  static getTopSellingItems() {
    let text = '📈 <b>أفضل العناصر مبيعاً</b>\n\n';

    const items = Object.entries(this.SHOP_ITEMS)
      .slice(0, 5)
      .map(([key, item]) => `⭐ ${item.name} - ${item.price} نقطة`);

    text += `${items.join('\n')  }\n\n`;
    text += 'استخدم: <code>/shop</code> لعرض جميع العناصر';

    return text;
  }
}

module.exports = ShopSystem;
