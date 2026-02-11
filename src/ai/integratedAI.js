const LearningSystem = require('./learningSystem');
const SmartNotifications = require('./smartNotifications');
const AnalyticsEngine = require('./analyticsEngine');
const { User } = require('../database/models');

class IntegratedAI {
  // Main dashboard with all AI insights
  static async generateSmartDashboard(userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return null;

      // Gather all AI insights
      const behavior = await LearningSystem.analyzeUserBehavior(userId);
      const notification = await SmartNotifications.getSmartNotification(userId);
      const achievements = await SmartNotifications.checkAchievements(userId);
      const report = await AnalyticsEngine.generateUserReport(userId);
      const streak = await LearningSystem.updateUserStreak(userId);

      const dashboard = {
        userId,
        timestamp: new Date(),
        behavior,
        notification,
        achievements,
        report,
        streak,
        recommendations: this.generateSmartRecommendations(behavior, report, user)
      };

      return dashboard;
    } catch (error) {
      console.error('Smart dashboard error:', error);
      return null;
    }
  }

  // Generate smart recommendations
  static generateSmartRecommendations(behavior, report, user) {
    const recommendations = [];

    // Based on behavior preferences
    if (behavior?.preferences?.includes('قارئ قرآن نشط')) {
      recommendations.push({
        priority: 'عالية',
        icon: '📖',
        title: 'استمر في القراءة',
        action: 'من الرائع أنك تقرأ بانتظام! استمر هكذا'
      });
    }

    if (behavior?.preferences?.includes('لاعب متحمس')) {
      recommendations.push({
        priority: 'عالية',
        icon: '🎮',
        title: 'تحديات جديدة',
        action: 'جاهز لتحديات أصعب؟ 🏆'
      });
    }

    // Based on activity level
    if (behavior?.activityLevel === 'منخفض 😴') {
      recommendations.push({
        priority: 'عالية',
        icon: '💪',
        title: 'العودة القوية',
        action: 'نفتقدك! عد للنشاط'
      });
    }

    // Based on weaknesses
    if (behavior?.weaknesses?.length > 0) {
      behavior.weaknesses.slice(0, 2).forEach(weakness => {
        recommendations.push({
          priority: 'متوسطة',
          icon: '🎯',
          title: weakness,
          action: 'حسِّن هذا الجانب'
        });
      });
    }

    // Based on engagement
    if (behavior?.engagement < 40) {
      recommendations.push({
        priority: 'عالية',
        icon: '⚡',
        title: 'نقص المشاركة',
        action: 'شارك أكثر لتحسين مستواك! 🚀'
      });
    }

    return recommendations;
  }

  // Format complete dashboard
  static formatSmartDashboard(dashboard) {
    if (!dashboard) return null;

    let message = '🤖 <b>لوحة القيادة الذكية</b>\n\n';

    // Header with streak
    message += `🔥 <b>سلسلة الاستمرارية:</b> ${dashboard.streak?.current || 0} أيام\n`;
    message += `📊 <b>مستوى النشاط:</b> ${dashboard.behavior?.activityLevel}\n`;
    message += `📈 <b>المشاركة:</b> ${dashboard.behavior?.engagement}%\n\n`;

    // Quick stats
    message += '<b>📋 ملخص سريع:</b>\n';
    message += `💰 الرصيد: ${dashboard.report?.overview?.totalCoins || 0}\n`;
    message += `⭐ المستوى: ${dashboard.report?.overview?.totalLevel || 0}\n`;
    message += `🎮 ألعاب: ${dashboard.report?.gameStats?.totalGames || 0}\n`;
    message += `📖 قراءة: ${dashboard.report?.readingStats?.currentPage || 0}/114\n\n`;

    // Achievements
    if (dashboard.achievements?.length > 0) {
      message += '<b>🏆 إنجازات جديدة!</b>\n';
      dashboard.achievements.slice(0, 2).forEach(achievement => {
        message += `✅ ${achievement.title}\n`;
      });
      message += '\n';
    }

    // Notification
    if (dashboard.notification) {
      message += '<b>📢 إشعار مهم:</b>\n';
      message += `${SmartNotifications.formatNotification(dashboard.notification)}\n\n`;
    }

    // Recommendations
    if (dashboard.recommendations?.length > 0) {
      message += '<b>💡 اقتراحاتنا الذكية:</b>\n';
      dashboard.recommendations.slice(0, 3).forEach(rec => {
        message += `${rec.icon} <b>${rec.title}</b>\n${rec.action}\n`;
      });
    }

    message += '\n✨ <i>استمر في هذا الطريق الرائع!</i>';

    return message;
  }

  // Predict user needs
  static async predictUserNeeds(userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return null;

      const predictions = {
        userId,
        nextAction: LearningSystem.predictNextAction(user),
        likelyInterest: this.predictNextInterest(user),
        estimatedEngagement: this.estimateNextEngagement(user),
        suggestedTime: this.suggestBestTime(user)
      };

      return predictions;
    } catch (error) {
      console.error('Prediction error:', error);
      return null;
    }
  }

  // Predict next interest
  static predictNextInterest(user) {
    const interests = [];

    if ((user.gamesPlayed?.total || 0) > (user.khatmaProgress?.currentPage || 0)) {
      interests.push('🎮 ستريد لعبة');
    } else {
      interests.push('📖 ستريد القراءة');
    }

    if (user.coins < 100) {
      interests.push('💰 تريد جمع عملات');
    }

    return interests;
  }

  // Estimate engagement
  static estimateNextEngagement(user) {
    const activityLevel = (user.gamesPlayed?.total || 0) + (user.khatmaProgress?.currentPage || 0);

    if (activityLevel > 50) return '🔥 عالي جداً';
    if (activityLevel > 20) return '💪 عالي';
    if (activityLevel > 5) return '👍 متوسط';
    return '🌱 منخفض';
  }

  // Suggest best time
  static suggestBestTime(user) {
    return 'المساء بين 7 و10 مساءً هو أفضل وقت للعب 🌙';
  }

  // Send smart coaching message
  static async generateCoachingMessage(userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return null;

      const insights = await LearningSystem.analyzeUserBehavior(userId);
      const predictions = await this.predictUserNeeds(userId);

      let message = '🏆 <b>رسالة تدريبية ذكية</b>\n\n';

      // Personalized coaching
      if (insights.strengths?.length > 0) {
        message += '<b>نقاط قوتك:</b>\n';
        insights.strengths.forEach(strength => {
          message += `✅ ${strength}\n`;
        });
        message += '\n';
      }

      if (insights.weaknesses?.length > 0) {
        message += '<b>يمكنك التحسن في:</b>\n';
        insights.weaknesses.forEach(weakness => {
          message += `📍 ${weakness}\n`;
        });
        message += '\n';
      }

      message += '<b>ما تتوقعنا:</b>\n';
      predictions.nextAction.split('🎯')[1] && (message += `🎯 ${predictions.nextAction}\n`);
      message += `📊 المشاركة المتوقعة: ${predictions.estimatedEngagement}\n\n`;

      message += '💪 تذكر: النجاح يأتي من الاستمرار والمثابرة!\n';
      message += '🚀 ركز على أهدافك وحققها واحدة تلو الأخرى!';

      return message;
    } catch (error) {
      console.error('Coaching message error:', error);
      return null;
    }
  }

  // Generate motivation based on performance
  static generateMotivation(user) {
    const level = user.level;
    const winRate = (user.gamesPlayed?.wins || 0) / Math.max(1, user.gamesPlayed?.total || 1);
    const readProgress = (user.khatmaProgress?.currentPage || 0) / 114;

    let motivation = '💪 <b>رسالتك التحفيزية اليومية</b>\n\n';

    // Dynamic motivation
    if (level > 15) {
      motivation += `أنت وصلت للمستوى ${level}! استمر في هذا الزخم! 🚀\n`;
    } else if (level > 10) {
      motivation += `مستوى ${level}! أنت في الطريق الصحيح! 🎯\n`;
    } else {
      motivation += 'كل خطوة تقربك من الهدف! استمر! 🌱\n';
    }

    if (winRate > 0.7) {
      motivation += `معدل فوزك ${Math.round(winRate * 100)}%! أنت محترف! 🏆\n`;
    } else if (winRate > 0.5) {
      motivation += 'تحسن ملحوظ في أدائك! استمر! 📈\n';
    }

    if (readProgress > 0.8) {
      motivation += 'أنت قريب من إكمال الختمة! استمر! 🎉\n';
    } else if (readProgress > 0.5) {
      motivation += 'نصفك الثاني من القرآن! قوي! 📖\n';
    }

    motivation += '\nتذكر: <i>كل محاولة تقربك من النجاح! 🌟</i>';

    return motivation;
  }
}

module.exports = IntegratedAI;
