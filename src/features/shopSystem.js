/**
 * In-app shop system (new features menu)
 * Handles shop catalog, purchasing, and inventory summary.
 */

const { logger } = require('../utils/helpers');
const User = require('../database/models/User');

class ShopSystem {
  static SHOP_ITEMS = {
    premium_badge: {
      key: 'premium_badge',
      emoji: '⭐',
      name: 'شارة بريميوم',
      price: 500,
      type: 'badge',
      description: 'شارة مميزة لتزيين ملفك الشخصي.'
    },
    vip_badge: {
      key: 'vip_badge',
      emoji: '👑',
      name: 'شارة VIP',
      price: 1000,
      type: 'badge',
      description: 'شارة VIP حصرية للمستخدمين المميزين.'
    },
    legend_badge: {
      key: 'legend_badge',
      emoji: '🏆',
      name: 'شارة الأسطورة',
      price: 2000,
      type: 'badge',
      description: 'واحدة من أندر الأوسمة في النظام.'
    },
    game_boost_2x: {
      key: 'game_boost_2x',
      emoji: '2️⃣',
      name: 'معزز نقاط 2x (24 ساعة)',
      price: 300,
      type: 'boost',
      multiplier: 2,
      duration: 86400,
      description: 'يضاعف نقاط الألعاب لمدة 24 ساعة.'
    },
    game_boost_3x: {
      key: 'game_boost_3x',
      emoji: '3️⃣',
      name: 'معزز نقاط 3x (24 ساعة)',
      price: 500,
      type: 'boost',
      multiplier: 3,
      duration: 86400,
      description: 'يضاعف نقاط الألعاب 3 مرات لمدة 24 ساعة.'
    },
    extra_daily_reward: {
      key: 'extra_daily_reward',
      emoji: '🎁',
      name: 'مكافأة يومية إضافية',
      price: 200,
      type: 'daily_bonus',
      description: 'عنصر مكافآت إضافي داخل الحقيبة.'
    },
    special_weapon: {
      key: 'special_weapon',
      emoji: '⚔️',
      name: 'أداة ألعاب خاصة',
      price: 400,
      type: 'game_item',
      description: 'أداة نادرة للاستخدام داخل الألعاب.'
    }
  };

  static SHOP_CATEGORY_TYPES = {
    badges: ['badge'],
    boosts: ['boost'],
    rewards: ['daily_bonus'],
    weapons: ['game_item']
  };

  static SHOP_CATEGORY_LABELS = {
    badges: 'الأوسمة',
    boosts: 'المعززات',
    rewards: 'الجوائز',
    weapons: 'أدوات الألعاب',
    all: 'كل العناصر'
  };

  static getShopTypeLabel(type) {
    const labels = {
      badge: 'وسام',
      boost: 'معزز',
      daily_bonus: 'جائزة',
      game_item: 'أداة لعبة'
    };
    return labels[type] || type;
  }

  static getShopCategoryLabel(category) {
    return this.SHOP_CATEGORY_LABELS[category] || this.SHOP_CATEGORY_LABELS.all;
  }

  static getAllShopItems() {
    return Object.entries(this.SHOP_ITEMS).map(([key, item]) => ({
      key,
      ...item
    }));
  }

  static getShopItemsByCategory(category) {
    if (!category || category === 'all') {
      return this.getAllShopItems();
    }

    const allowedTypes = this.SHOP_CATEGORY_TYPES[category];
    if (!allowedTypes) {
      return [];
    }

    return this.getAllShopItems().filter((item) => allowedTypes.includes(item.type));
  }

  static formatShopMenu() {
    let text = '🛍️ <b>متجر البوت</b>\n\n';
    text += 'العناصر المتاحة حالياً:\n\n';

    this.getAllShopItems().forEach((item, index) => {
      text += `${index + 1}. ${item.emoji} <b>${item.name}</b>\n`;
      text += `💰 السعر: <code>${item.price}</code> عملة\n`;
      text += `📝 ${item.description}\n\n`;
    });

    text += 'للشراء من الأزرار التفاعلية افتح: <code>/features</code> ثم المتجر.';
    return text;
  }

  static addInventoryItem(user, item) {
    user.inventory = user.inventory || [];

    const existing = user.inventory.find((entry) => entry.itemId === item.key);
    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
      existing.boughtAt = new Date();
      existing.itemName = item.name;
    } else {
      user.inventory.push({
        itemId: item.key,
        itemName: item.name,
        quantity: 1,
        boughtAt: new Date()
      });
    }
  }

  static async buyItem(userId, itemKey) {
    try {
      const item = this.SHOP_ITEMS[itemKey];
      if (!item) {
        return { success: false, message: '❌ العنصر غير موجود.' };
      }

      const user = await User.findOne({ userId });
      if (!user) {
        return { success: false, message: '❌ لم يتم العثور على حسابك.' };
      }

      if ((user.coins || 0) < item.price) {
        return {
          success: false,
          message: `❌ رصيد غير كاف.\nرصيدك: ${user.coins || 0}\nالمطلوب: ${item.price}`
        };
      }

      if (item.type === 'badge') {
        user.badges = user.badges || [];

        if (user.badges.includes(item.key)) {
          return { success: false, message: 'ℹ️ هذا الوسام موجود لديك بالفعل.' };
        }
      }

      user.coins = (user.coins || 0) - item.price;
      user.totalSpending = (user.totalSpending || 0) + item.price;

      if (item.type === 'badge') {
        user.badgeDetails = user.badgeDetails || [];
        user.badges.push(item.key);
        user.badgeDetails.push({
          id: item.key,
          name: item.name,
          description: item.description,
          icon: item.emoji || '🏅',
          earnedAt: new Date(),
          source: 'shop'
        });
      } else if (item.type === 'boost') {
        const now = Date.now();
        user.activeBoosts = (user.activeBoosts || []).filter(
          (boost) => new Date(boost.endDate).getTime() > now
        );
        user.activeBoosts.push({
          boostKey: item.key,
          multiplier: item.multiplier || 1,
          endDate: new Date(now + (item.duration || 0) * 1000),
          boughtAt: new Date()
        });
      } else {
        this.addInventoryItem(user, item);
      }

      await user.save();

      return {
        success: true,
        message:
          '✅ تم الشراء بنجاح!\n\n' +
          `${item.emoji} ${item.name}\n` +
          `💰 السعر: ${item.price} عملة\n` +
          `💵 الرصيد الحالي: ${user.coins} عملة`
      };
    } catch (error) {
      logger.error(`Shop buyItem error: ${error.message}`);
      return { success: false, message: '❌ حدث خطأ أثناء عملية الشراء.' };
    }
  }

  static getItemDetails(itemKey) {
    const item = this.SHOP_ITEMS[itemKey];
    if (!item) {
      return null;
    }

    return (
      `${item.emoji} <b>${item.name}</b>\n\n` +
      `💰 <b>السعر:</b> ${item.price} عملة\n` +
      `🏷️ <b>النوع:</b> ${this.getShopTypeLabel(item.type)}\n` +
      `📝 <b>الوصف:</b> ${item.description}`
    );
  }

  static async getUserPurchases(userId) {
    return this.getUserInventorySummary(userId);
  }

  static async getUserInventorySummary(userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user) {
        return '❌ لم يتم العثور على حسابك.';
      }

      const now = Date.now();
      const existingBoosts = user.activeBoosts || [];
      const activeBoosts = existingBoosts.filter(
        (boost) => new Date(boost.endDate).getTime() > now
      );

      if (activeBoosts.length !== existingBoosts.length) {
        user.activeBoosts = activeBoosts;
        await user.save();
      }

      const badges = user.badgeDetails || [];
      const inventory = user.inventory || [];

      if (badges.length === 0 && inventory.length === 0 && activeBoosts.length === 0) {
        return '🎒 <b>حقيبتك فارغة</b>\n\nلم تشترِ أي عناصر بعد.';
      }

      let text = '🎒 <b>حقيبتي</b>\n\n';

      if (badges.length > 0) {
        text += '👑 <b>الأوسمة:</b>\n';
        badges.forEach((badge, index) => {
          text += `${index + 1}. ${badge.icon || '🏅'} ${badge.name}\n`;
        });
        text += '\n';
      }

      if (activeBoosts.length > 0) {
        text += '⚡ <b>المعززات النشطة:</b>\n';
        activeBoosts.forEach((boost, index) => {
          const until = new Date(boost.endDate).toLocaleString('ar');
          text += `${index + 1}. x${boost.multiplier || 1} حتى ${until}\n`;
        });
        text += '\n';
      }

      if (inventory.length > 0) {
        text += '🎁 <b>العناصر:</b>\n';
        inventory.forEach((item, index) => {
          text += `${index + 1}. ${item.itemName} × ${item.quantity || 1}\n`;
        });
      }

      return text.trim();
    } catch (error) {
      logger.error(`Shop getUserInventorySummary error: ${error.message}`);
      return '❌ حدث خطأ أثناء جلب الحقيبة.';
    }
  }

  static async calculatePointsWithBoost(userId, basePoints) {
    try {
      const user = await User.findOne({ userId });
      if (!user) {
        return basePoints;
      }

      const now = Date.now();
      const boosts = (user.activeBoosts || []).filter(
        (boost) => new Date(boost.endDate).getTime() > now
      );

      if ((user.activeBoosts || []).length !== boosts.length) {
        user.activeBoosts = boosts;
        await user.save();
      }

      const multiplier =
        boosts.length > 0 ? Math.max(...boosts.map((boost) => boost.multiplier || 1)) : 1;

      return Math.round(basePoints * multiplier);
    } catch (error) {
      logger.error(`Shop calculatePointsWithBoost error: ${error.message}`);
      return basePoints;
    }
  }

  static getTopSellingItems() {
    const top = this.getAllShopItems()
      .sort((a, b) => b.price - a.price)
      .slice(0, 5);

    let text = '📈 <b>أعلى عناصر المتجر</b>\n\n';
    top.forEach((item, index) => {
      text += `${index + 1}. ${item.emoji} ${item.name} - ${item.price} عملة\n`;
    });
    return text.trim();
  }
}

module.exports = ShopSystem;
