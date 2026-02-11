class Formatter {
  // AI Smart Greeting
  static getSmartGreeting(user) {
    const hour = new Date().getHours();
    let greeting = '';

    if (hour < 6) greeting = '🌙 ليل الخير';
    else if (hour < 12) greeting = '☀️ صباح الخير';
    else if (hour < 17) greeting = '🌤️ ظهر الخير';
    else greeting = '🌅 مساء الخير';

    return `${greeting} ${user.firstName || 'صديقي'}! 👋`;
  }

  // AI Recommendations
  static getSmartRecommendations(user) {
    const recommendations = [];

    // توصيات بناءً على النشاط
    if (user.khatmaProgress?.currentPage < 50) {
      recommendations.push('📖 يبدو أنك جديد في الختمة، ابدأ رحلتك اليوم!');
    }

    if (user.level < 5 && user.gamesPlayed?.total < 10) {
      recommendations.push('🎮 لعب بعض الألعاب لرفع مستواك!');
    }

    if (user.coins < 100) {
      recommendations.push('💰 جمِّع عملات من المهام اليومية!');
    }

    const lastDaily = new Date(user.lastDailyReward);
    const now = new Date();
    if ((now - lastDaily) / (1000 * 60 * 60) >= 24) {
      recommendations.push('🎁 لم تأخذ مكافأتك اليومية بعد!');
    }

    return recommendations.slice(0, 3);
  }

  // Smart Dashboard
  static formatSmartDashboard(user) {
    const nextLevel = user.level * 1000;
    const xpProgress = Math.round((user.xp / nextLevel) * 100);
    const progressBar = this.getProgressBar(xpProgress);
    const recommendations = this.getSmartRecommendations(user);

    const message = `${this.getSmartGreeting(user)}

╔════════════════════════════════════╗
║  📊 لوحة معلومات ذكية  
╠════════════════════════════════════╣
║ 🎖️ المستوى: ${user.level} | 💰 العملات: ${user.coins.toLocaleString()}
║ ⭐ النقاط: ${user.xp}/${nextLevel}
${progressBar}
║ 🎮 الألعاب: ${user.gamesPlayed?.total || 0} | 🏆 انتصارات: ${user.gamesPlayed?.wins || 0}
║ 📖 الختمة: صفحة ${user.khatmaProgress?.currentPage || 1}/604
╠════════════════════════════════════╣
║ 💡 التوصيات الذكية:
${recommendations.map(rec => `║ ${rec}`).join('\n')}
╚════════════════════════════════════╝`;

    return message.trim();
  }

  // Format user profile message
  static formatProfileMessage(user) {
    const message = `
╔════════════════════════════════════╗
║     👤 ملفك الشخصي     
╠════════════════════════════════════╣
║ 🆔 المعرف: ${user.userId}
║ 📝 الاسم: ${user.firstName || 'غير معروف'} ${user.lastName || ''}
║ 🎖️ المستوى: ${user.level}
║ ⭐ النقاط: ${user.xp}/${(user.level * 1000)}
║ 💰 العملات: ${user.coins.toLocaleString()}
║ 🎮 الألعاب: ${user.gamesPlayed.total} (${user.gamesPlayed.wins} انتصار)
║ 📅 التاريخ: ${new Date(user.createdAt).toLocaleDateString('ar-SA')}
╚════════════════════════════════════╝
    `;
    return message.trim();
  }

  // Format leaderboard
  static formatLeaderboard(users, type = 'xp') {
    let title = '';
    let getter = (u) => u.xp;

    if (type === 'coins') {
      title = '💰 أغنى المستخدمين';
      getter = (u) => u.coins;
    } else if (type === 'level') {
      title = '🏆 أعلى المستويات';
      getter = (u) => u.level;
    } else {
      title = '⭐ الأكثر نقاط';
    }

    let message = `\n╔════════════════════════════════════╗\n║     ${title}\n╠════════════════════════════════════╣\n`;

    users.slice(0, 10).forEach((user, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      message += `║ ${medal} ${user.firstName} - ${getter(user).toLocaleString()}\n`;
    });

    message += '╚════════════════════════════════════╝';
    return message;
  }

  // Format game result
  static formatGameResult(playerName, result, prize = 0) {
    const resultEmoji = result === 'win' ? '🎉' : result === 'draw' ? '🤝' : '😔';
    const resultText = result === 'win' ? 'انتصار!' : result === 'draw' ? 'تعادل!' : 'هزيمة!';

    const message = `
${resultEmoji} ${resultText}

🎮 اللاعب: ${playerName}
🏆 النتيجة: ${resultText}
${prize > 0 ? `💰 الجائزة: +${prize} عملات` : ''}
    `;
    return message.trim();
  }

  // Format balance info
  static formatBalanceInfo(user) {
    const message = `
╔════════════════════════════════════╗
║     💰 رصيدك المالي     
╠════════════════════════════════════╣
║ 💵 الرصيد الحالي: ${user.coins.toLocaleString()}
║ 📈 الدخل اليومي: 50
║ 💸 الإنفاق: ${user.gamesPlayed.total * 10}
║ 📊 إجمالي المعاملات: (من DB)
╚════════════════════════════════════╝
    `;
    return message.trim();
  }

  // Format content item
  static formatContent(content) {
    return `
📌 ${content.title || content.contentType}

${content.content}

⭐ التقييم: ${content.rating}/5
👁️ المشاهدات: ${content.views}
    `.trim();
  }

  // Format Khatma progress
  static formatKhatmaProgress(khatma) {
    const progressBar = this.getProgressBar(khatma.percentComplete);
    const message = `
╔════════════════════════════════════╗
║     🕌 تقدم الختمة     
╠════════════════════════════════════╣
║ 📖 الصفحة الحالية: ${khatma.currentPage}/604
║ ${progressBar}
║ 📊 النسبة: ${khatma.percentComplete}%
║ ✅ الختمات المكتملة: ${khatma.completionCount}
║ 📅 آخر قراءة: ${khatma.lastRead ? new Date(khatma.lastRead).toLocaleDateString('ar-SA') : 'لم تبدأ'}
╚════════════════════════════════════╝
    `;
    return message.trim();
  }

  // Progress bar generator
  static getProgressBar(percentage) {
    const filled = Math.floor(percentage / 10);
    const empty = 10 - filled;
    return `║ ${'█'.repeat(filled)}${'░'.repeat(empty)} ${percentage}%`;
  }

  // Smart Statistics Format
  static formatSmartStats(user) {
    const totalGames = user.gamesPlayed?.total || 0;
    const wins = user.gamesPlayed?.wins || 0;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    const daysActive = Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)) || 1;

    let level_status = '';
    if (user.level >= 20) level_status = '👑 محترف';
    else if (user.level >= 10) level_status = '🌟 متقدم';
    else if (user.level >= 5) level_status = '⭐ نشط';
    else level_status = '🌱 مبتدئ';

    return `
╔════════════════════════════════════╗
║  📊 إحصائيات شاملة  
╠════════════════════════════════════╣
║ ${level_status} - المستوى: ${user.level}
║ ⭐ النقاط: ${user.xp.toLocaleString()}
║ 💰 العملات: ${user.coins.toLocaleString()}
║ 🎮 الألعاب: ${totalGames} (نسبة النجاح: ${winRate}%)
║ 📅 أيام النشاط: ${daysActive}
║ 📈 متوسط النقاط يومياً: ${Math.floor(user.xp / daysActive)}
╚════════════════════════════════════╝`.trim();
  }

  // Daily Quest Recommendations
  static formatDailyQuests(user) {
    const quests = [];

    if (!user.lastDailyReward || (new Date() - new Date(user.lastDailyReward)) / (1000 * 60 * 60) >= 24) {
      quests.push('✅ خذ مكافأتك اليومية (50 عملة)');
    }

    if ((user.gamesPlayed?.total || 0) < (user.gamesPlayed?.total || 0) + 3) {
      quests.push('🎮 العب 3 ألعاب (+30 نقطة)');
    }

    if ((user.khatmaProgress?.currentPage || 0) < ((this.lastKhatmaPage || 0) + 5)) {
      quests.push('📖 اقرأ 5 صفحات من القرآن (+20 نقطة)');
    }

    return `
🎯 **مهام يومك الموصى بها:**

${quests.map((q, i) => `${i + 1}. ${q}`).join('\n')}

اكمل المهام لتحصل على مكافآت إضافية! 🏆`.trim();
  }

  // Achievement Display
  static formatAchievements(user) {
    const achievements = [];

    if (user.level >= 5) achievements.push('🌟 المستكشف: وصلت للمستوى 5');
    if (user.level >= 10) achievements.push('💎 المحترف: وصلت للمستوى 10');
    if (user.gamesPlayed?.wins >= 10) achievements.push('🏆 الفائز: فزت في 10 ألعاب');
    if (user.khatmaProgress?.completionCount >= 1) achievements.push('📖 الختّام: أكملت ختمة واحدة');
    if (user.coins >= 500) achievements.push('💰 المليونير: جمعت 500 عملة');

    if (achievements.length === 0) {
      return '🚀 لم تحقق أي إنجازات بعد، ابدأ الآن!';
    }

    return `
🏅 **إنجازاتك:**

${achievements.map((a, i) => `${i + 1}. ${a}`).join('\n')}
    `.trim();
  }

  // Format error message
  static formatError(errorMessage) {
    return `❌ خطأ: ${errorMessage}`;
  }

  // Format success message
  static formatSuccess(message) {
    return `✅ ${message}`;
  }

}

module.exports = Formatter;
