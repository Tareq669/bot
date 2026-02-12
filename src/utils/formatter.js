/**
 * Formatter Utility - تنسيق الرسائل والبيانات
 * يستخدم في جميع أنحاء البوت لتنسيق الرسائل
 */

class Formatter {
  /**
   * تنسيق معلومات المستخدم الكاملة
   */
  static formatUserProfile(user) {
    const level = Math.floor((user.xp || 0) / 100) + 1;
    return `
👤 <b>ملفك الشخصي</b>

👤 الاسم: ${user.firstName || 'مستخدم'}
🆔 المعرّف: @${user.username || 'بدون معرّف'}
⭐ المستوى: ${level}
💰 العملات: ${user.coins || 0}
📊 نقاط الخبرة: ${user.xp || 0}
🎮 الألعاب المكملة: ${user.gamesCompleted || 0}
📖 الختمات: ${user.khatmaCount || 0}

تاريخ الانضمام: ${new Date(user.createdAt).toLocaleDateString('ar-SA')}
    `.trim();
  }

  /**
   * تنسيق الإحصائيات الذكية للمستخدم
   */
  static formatSmartStats(user) {
    const totalActivity = (user.gamesCompleted || 0) + (user.khatmaCount || 0);
    const level = Math.floor((user.xp || 0) / 100) + 1;
    const nextLevelXp = (level * 100);
    const currentLevelXp = ((level - 1) * 100);
    const xpProgress = user.xp - currentLevelXp;
    const xpNeeded = nextLevelXp - currentLevelXp;
    const progressPercent = Math.round((xpProgress / xpNeeded) * 100);

    return `
📊 <b>إحصائياتك الذكية</b>

⭐ المستوى: ${level}
📈 التقدم: ${progressPercent}% (${xpProgress}/${xpNeeded})
💰 الرصيد: ${user.coins || 0} عملة
🎮 النشاط الكلي: ${totalActivity}
🏆 الترتيب: #${user.rank || 'غير معروف'}

آخر نشاط: ${user.lastActivity ? new Date(user.lastActivity).toLocaleDateString('ar-SA') : 'لا يوجد'}
    `.trim();
  }

  /**
   * تنسيق المهام اليومية الخاصة بالمستخدم
   */
  static formatDailyQuests(user) {
    const quests = [
      {
        id: 1,
        name: '🎮 لعب لعبة',
        reward: 20,
        completed: user.dailyQuests?.games || false
      },
      {
        id: 2,
        name: '📖 قراءة صورة من القرآن',
        reward: 30,
        completed: user.dailyQuests?.quran || false
      },
      {
        id: 3,
        name: '📿 قول أذكار الصباح/المساء',
        reward: 25,
        completed: user.dailyQuests?.adhkar || false
      },
      {
        id: 4,
        name: '💬 التفاعل في المجموعة',
        reward: 15,
        completed: user.dailyQuests?.interact || false
      }
    ];

    let message = '📋 <b>المهام اليومية</b>\n\n';

    quests.forEach(quest => {
      const status = quest.completed ? '✅' : '⏳';
      message += `${status} ${quest.name} - <b>+${quest.reward}</b> عملة\n`;
    });

    const completedCount = quests.filter(q => q.completed).length;
    const totalReward = quests
      .filter(q => q.completed)
      .reduce((sum, q) => sum + q.reward, 0);

    message += `\n✨ المكتملة: ${completedCount}/${quests.length}`;
    if (completedCount > 0) {
      message += `\n💰 المكافآت المجمعة: ${totalReward} عملة`;
    }

    return message;
  }

  /**
   * تنسيق لوحة المتصدرين العامة
   */
  static formatLeaderboard(users, type = 'xp') {
    let message = '🏆 <b>لوحة المتصدرين</b>\n\n';

    if (type === 'xp') {
      message += '<b>أفضل 10 لاعبين بنقاط الخبرة:</b>\n\n';
    } else if (type === 'coins') {
      message += '<b>أغنى 10 لاعبين:</b>\n\n';
    }

    users.slice(0, 10).forEach((user, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const value = type === 'xp' ? user.xp || 0 : user.coins || 0;
      const icon = type === 'xp' ? '⭐' : '💰';
      message += `${medal} ${user.firstName || 'مستخدم'} - ${icon} ${value}\n`;
    });

    return message;
  }

  /**
   * تنسيق رسالة الخطأ
   */
  static formatError(message) {
    return `❌ <b>خطأ</b>\n\n${message}`;
  }

  /**
   * تنسيق رسالة النجاح
   */
  static formatSuccess(message) {
    return `✅ <b>تم بنجاح</b>\n\n${message}`;
  }

  /**
   * تنسيق معلومات اللعبة الواحدة
   */
  static formatGameInfo(game) {
    return `
🎮 <b>${game.name || 'لعبة'}</b>

📝 ${game.description || 'لا توجد وصف'}

👥 اللاعبون: ${game.players || 0}
💰 المكافأة: ${game.reward || 0} عملة
⏱️ المدة: ${game.duration || 'متغيرة'}

الحالة: ${game.active ? '✅ نشطة' : '❌ مغلقة'}
    `.trim();
  }

  /**
   * تنسيق عنصر من عناصر المتجر
   */
  static formatShopItem(item) {
    return `
🛍️ <b>${item.name}</b>

📝 ${item.description}
💰 السعر: <b>${item.price}</b> عملة

${item.limited ? '⚠️ عرض محدود الوقت!' : ''}
    `.trim();
  }

  /**
   * تنسيق شاشة الاقتصاد والرصيد
   */
  static formatEconomyStats(user) {
    return `
💰 <b>إحصائائيات الاقتصاد</b>

💵 الرصيد الحالي: ${user.coins || 0}
📊 الإنفاق الكلي: ${user.totalSpent || 0}
📈 المكاسب الكلية: ${user.totalEarned || 0}
🎁 الإعطاءات: ${user.gifted || 0}

المحفظة: ${user.wallet ? '✅ مفعلة' : '❌ معطلة'}
    `.trim();
  }

  /**
   * تنسيق الإنجازات التي حققها المستخدم
   */
  static formatAchievements(achievements) {
    let message = '🏅 <b>الإنجازات</b>\n\n';

    if (!achievements || achievements.length === 0) {
      return `${message}لا توجد إنجازات حالياً. استمر في اللعب!`;
    }

    achievements.forEach(ach => {
      message += `🏅 <b>${ach.name}</b>\n`;
      message += `   📝 ${ach.description}\n`;
      message += `   🎁 المكافأة: ${ach.reward} عملة\n\n`;
    });

    return message;
  }

  /**
   * قص النصوص الطويلة جداً
   */
  static truncate(text, length = 4096) {
    if (!text) return '';
    if (text.length <= length) return text;
    return `${text.substring(0, length - 3)}...`;
  }

  /**
   * تنسيق رسالة التحويل بين المستخدمين
   */
  static formatTransfer(from, to, amount) {
    return `
💸 <b>تحويل أموال</b>

من: <b>${from.firstName}</b>
إلى: <b>${to.firstName}</b>
المبلغ: <b>${amount}</b> عملة

✅ تم التحويل بنجاح!
    `.trim();
  }

  /**
   * تنسيق رسالة قائمة المتجر الكاملة
   */
  static formatShopList(items) {
    let message = '🛍️ <b>المتجر - العناصر المتاحة</b>\n\n';

    if (!items || items.length === 0) {
      return `${message}❌ لا توجد عناصر متاحة حالياً`;
    }

    items.forEach((item, index) => {
      message += `${index + 1}. ${item.icon || '📦'} <b>${item.name}</b>\n`;
      message += `   💰 السعر: ${item.price} عملة\n`;
      message += `   📝 ${item.description}\n\n`;
    });

    return message;
  }

  /**
   * تنسيق آخر معاملة للمستخدم
   */
  static formatLastTransaction(transaction) {
    const date = new Date(transaction.timestamp).toLocaleDateString('ar-SA');
    const time = new Date(transaction.timestamp).toLocaleTimeString('ar-SA');

    return `
📋 <b>آخر معاملة</b>

نوع العملية: ${transaction.type}
المبلغ: ${transaction.amount}
الوصف: ${transaction.description}
التاريخ: ${date} ${time}
    `.trim();
  }

  /**
   * تنسيق إشعار المستخدم
   */
  static formatNotification(title, content) {
    return `
📢 <b>${title}</b>

${content}
    `.trim();
  }
}

module.exports = Formatter;