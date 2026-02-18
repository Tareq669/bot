const { User } = require('../database/models');

class AIManager {
  // Smart response based on user input
  static async generateSmartResponse(userId, userMessage) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return this.getDefaultResponse(userMessage);

      // Get smart response based on message
      const response = this.getContextualResponse(userMessage, user);
      return response;
    } catch (error) {
      console.error('AI Error:', error);
      return this.getDefaultResponse(userMessage);
    }
  }

  // Contextual response based on intent
  static getContextualResponse(message, user) {
    const msg = message.toLowerCase().trim();

    // Greeting responses
    if (this.isGreeting(msg)) {
      return this.generateGreeting(user);
    }

    // Help request
    if (this.isHelpRequest(msg)) {
      return this.generateHelp(user);
    }

    // Khatma-related
    if (this.isKhatmaRelated(msg)) {
      return this.generateKhatmaAdvice(user);
    }

    // Game-related
    if (this.isGameRelated(msg)) {
      return this.generateGameAdvice(user);
    }

    // Economy-related
    if (this.isEconomyRelated(msg)) {
      return this.generateEconomyAdvice(user);
    }

    // Motivation/Encouragement
    if (this.isMotivationRequest(msg)) {
      return this.generateMotivation(user);
    }

    // Stats inquiry
    if (this.isStatsInquiry(msg)) {
      return this.generateStatsResponse(user);
    }

    // Islamic content request
    if (this.isIslamicRequest(msg)) {
      return this.generateIslamicResponse();
    }

    // Default friendly response
    return this.generateFriendlyResponse(user, message);
  }

  // Intent detection methods
  static isGreeting(msg) {
    const greetings = ['السلام عليكم', 'مرحبا', 'هلا', 'احلا', 'كيفك', 'كيف حالك', 'كيفك انت', 'شنو أخبارك', 'صباح'];
    return greetings.some(g => msg.includes(g));
  }

  static isHelpRequest(msg) {
    const helps = ['ساعدني', 'ايش الاوامر', 'ايش الاشياء', 'ما فهمت', 'كيف استخدم', 'شنو الفايدة', 'شرح لي'];
    return helps.some(h => msg.includes(h));
  }

  static isKhatmaRelated(msg) {
    const khatma = ['ختمة', 'قرآن', 'صفحة', 'اقرأ', 'قراءة', 'سورة', 'آية'];
    return khatma.some(k => msg.includes(k));
  }

  static isGameRelated(msg) {
    const games = ['لعب', 'لعبة', 'العب', 'تحدي', 'ربح', 'عملات', 'نقاط'];
    return games.some(g => msg.includes(g));
  }

  static isEconomyRelated(msg) {
    const economy = ['عملات', 'أموال', 'رصيد', 'توفير', 'شراء', 'متجر'];
    return economy.some(e => msg.includes(e));
  }

  static isMotivationRequest(msg) {
    const motivation = ['تحفيز', 'تشجيع', 'الهمني', 'نصيحة', 'فكرة', 'همة', 'عزيمة'];
    return motivation.some(m => msg.includes(m));
  }

  static isStatsInquiry(msg) {
    const stats = ['إحصائيات', 'احصائيات', 'كم', 'مستوى', 'ترتيب', 'تقدم', 'مكاسبي', 'انجازاتي'];
    return stats.some(s => msg.includes(s));
  }

  static isIslamicRequest(msg) {
    const islamic = ['أدعية', 'دعاء', 'آية', 'سورة', 'حديث', 'قرآن', 'ذكر', 'دين', 'إسلام', 'نصيحة دينية'];
    return islamic.some(i => msg.includes(i));
  }

  // Response generators
  static generateGreeting(user) {
    const greetings = [
      `وعليكم السلام ورحمة الله وبركاته ${user.firstName}! 👋\n\nكيف حالك اليوم؟ هل تريد اللعب أم القراءة أم شيء آخر؟`,
      `مرحبا ${user.firstName}! 😊\n\nسعيد بلقيائك! ماذا تريد أن تفعل اليوم؟`,
      `السلام عليكم ${user.firstName}! 🌟\n\nأتمنى أن تكون بألف خير!`,
      `هلا وأهلا ${user.firstName}! 🎉\n\nدايم متفائل! إن شاء الله يومك ممتاز!`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  static generateHelp(user) {
    return `📚 ياله من سؤال ذكي ${user.firstName}!\n\n
يمكنك استخدام:\n
🕌 <b>الختمة</b> - لتتبع قراءتك للقرآن\n
📿 <b>الأذكار</b> - لأذكار يومية\n
📖 <b>القرآن</b> - لآيات قرآنية يومية\n
💭 <b>الاقتباسات</b> - لاقتباسات تحفيزية\n
🎮 <b>الألعاب</b> - للعب وربح عملات\n
💰 <b>الاقتصاد</b> - لإدارة عملاتك\n
👤 <b>حسابي</b> - لمعلومات ملفك\n
🏆 <b>المتصدرين</b> - لترتيب اللاعبين\n\nجرب أي شيء يعجبك! 🚀`;
  }

  static generateKhatmaAdvice(user) {
    const page = user.khatmaProgress?.currentPage || 1;
    const percent = Math.round((page / 604) * 100);

    let advice = '';
    if (percent < 10) {
      advice = 'أنت في بداية رحلة عظيمة! استمر فقط وستصل! 💪';
    } else if (percent < 50) {
      advice = 'تقدم رائع! أنت في المنتصف تقريباً، لا تستسلم! 🚀';
    } else if (percent < 90) {
      advice = 'قريب جداً! إن شاء الله تنهي الختمة قريباً! 🎯';
    } else {
      advice = 'مبروك! أنت على وشك إكمال الختمة! 🏆';
    }

    return `📖 <b>نصيحة الختمة</b>\n\n${advice}\n\nالصفحة الحالية: ${page}/604\nالنسبة: ${percent}%\n\nجزاك الله خيراً! 🌟`;
  }

  static generateGameAdvice(user) {
    const wins = user.gamesPlayed?.wins || 0;
    const total = user.gamesPlayed?.total || 0;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    let advice = '';
    if (winRate > 70) {
      advice = 'أنت لاعب محترف! جرب ألعاب أصعب! 🏅';
    } else if (winRate > 50) {
      advice = 'أداء جيد! استمر في التدريب! 💪';
    } else {
      advice = 'لا تستسلم! كل محاولة ستحسن مهاراتك! 🎮';
    }

    return `🎮 <b>نصيحة الألعاب</b>\n\n${advice}\n\nإحصائياتك: ${wins}/${total}\nنسبة النجاح: ${winRate}%\n\nاللعب يعطيك عملات وخبرة! 🪙`;
  }

  static generateEconomyAdvice(user) {
    const coins = user.coins || 0;

    let advice = '';
    if (coins > 1000) {
      advice = 'عندك رصيد عالي! تسوق الآن واستمتع بالمزايا! 💎';
    } else if (coins > 500) {
      advice = 'رصيدك متوسط، جمِّع المزيد من الألعاب! 🎮';
    } else if (coins > 100) {
      advice = 'ابدأ بالمهام اليومية لزيادة رصيدك! 📈';
    } else {
      advice = 'كل ما تلعب تربح أكثر! جرب الألعاب الآن! 🏃';
    }

    return `💰 <b>نصيحة الاقتصاد</b>\n\n${advice}\n\nرصيدك الحالي: ${coins.toLocaleString()} عملة\n\nالمزايا تنتظرك! 🛍️`;
  }

  static generateMotivation(user) {
    const motivations = [
      `${user.firstName}، أنت أقوى من تظن! 💪\n\nكل يوم تصبح أفضل من بالأمس. استمر وستحقق أحلامك! 🌟`,
      `النجاح هو رحلة وليس وجهة! 🎯\n\n${user.firstName} أنت في الطريق الصحيح، فقط استمر! 🚀`,
      `الإصرار هو سر النجاح! 🔥\n\nأنت تستطيع ${user.firstName}، ولن تعرف طاقتك إلا عندما تجربها! 💎`,
      `كل تحدي هو فرصة! 🌈\n\n${user.firstName} استقبل التحديات بابتسامة لأنها تصنع منك أقوى! 🏆`,
      `الوقت هو أثمن شيء! ⏰\n\nاستمتع بكل لحظة وزد من إنتاجيتك! ${user.firstName} أنت قادر على أكثر مما تتخيل! 🌟`
    ];
    return motivations[Math.floor(Math.random() * motivations.length)];
  }

  static generateStatsResponse(user) {
    const xpPercent = Math.round((user.xp / (user.level * 1000)) * 100);
    const daysActive = Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)) || 1;
    const avgXpDaily = Math.floor(user.xp / daysActive);

    return `📊 <b>إحصائياتك الشاملة</b>\n\n
🎖️ المستوى: ${user.level}
⭐ النقاط: ${user.xp.toLocaleString()} (${xpPercent}%)
💰 العملات: ${user.coins.toLocaleString()}
📅 أيام النشاط: ${daysActive}
📈 متوسط يومي: +${avgXpDaily} نقطة\n
🔥 أنت بتقدم رائع! استمر هكذا! 🚀`;
  }

  static generateIslamicResponse() {
    const responses = [
      '📖 <b>محتوى ديني قيّم</b>\n\nاستمع للقرآن وتأمل في آياته، فهناك سلام عظيم ينتظرك! 🕌\n\nجزاك الله خيراً على اهتمامك بالعلم الديني! 📚',
      `🤲 <b>نصيحتك الدينية اليومية</b>\n\nلا تنسَ ذكر الله في كل وقت، فذكر الله يريح النفس ويطمئن القلب! 💚\n\nأستودعك الله يا ${user?.firstName}! 🌙`,
      '📿 <b>فائدة دينية</b>\n\nالدعاء هو سلاح المؤمن، فلا تتردد في طلب حاجتك من الله! 🙏\n\nاللهم استجب دعاءنا جميعاً! 🌟'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  static generateFriendlyResponse(user, message) {
    const responses = [
      `😊 <b>ردك يعجبني!</b>\n\n"${message}"\n\nفي واحد ذكي قاعد يتكلم! دعني أساعدك بأحسن طريقة! 🚀`,
      '👍 <b>فهمت اللي تقول!</b>\n\nأنا هنا لمساعدتك في كل شيء! اختر من الأزرار أو اطلب اللي تبيه! 💪',
      '🎯 <b>فكرة ذكية!</b>\n\nأنت صاحب ذوق عالي! جرب إحدى المزايا الرائعة! 🌟',
      '💡 <b>تحتاج مساعدة؟</b>\n\nأنا هنا لك! اختر الخيار اللي يناسبك من الأزرار وسأساعدك! 🤝'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  static getDefaultResponse(message) {
    return '👋 شكراً على رسالتك!\n\nأنا هنا لمساعدتك! استخدم الأزرار أسفل الشاشة أو اطلب من الأوامر! 🚀';
  }

  // User learning system
  static async recordUserInteraction(userId, action, value = 1) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return;

      // Record interaction patterns
      if (!user.interactions) {
        user.interactions = {};
      }

      user.interactions[action] = (user.interactions[action] || 0) + value;
      await user.save();
    } catch (error) {
      console.error('Error recording interaction:', error);
    }
  }

  // Personalized recommendation
  static async getPersonalizedRecommendation(userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return null;

      const recommendations = [];

      // Based on activity level
      if (user.level < 5 && (!user.interactions?.['game:played'] || user.interactions['game:played'] < 5)) {
        recommendations.push('🎮 جرب الألعاب! هي طريقة ممتعة لرفع مستواك!');
      }

      // Based on Khatma progress
      if (user.khatmaProgress?.currentPage < 50 && user.khatmaProgress?.currentPage > 0) {
        recommendations.push('📖 استمر في قراءة القرآن! تقدمك رائع!');
      }

      // Based on coins
      if (user.coins < 100 && user.gamesPlayed?.total > 0) {
        recommendations.push('💰 العب مزيد من الألعاب لجمع عملات أكثر!');
      }

      // Daily motivation
      recommendations.push('🌟 تذكر أن كل يوم فرصة جديدة لتحسين نفسك!');

      return recommendations[Math.floor(Math.random() * recommendations.length)];
    } catch (error) {
      console.error('Error getting recommendation:', error);
      return null;
    }
  }
}

module.exports = AIManager;
