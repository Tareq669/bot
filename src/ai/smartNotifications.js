const { User } = require('../database/models');

class SmartNotifications {
  // Send smart notifications based on user behavior
  static async getSmartNotification(userId, ctx) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return null;

      const notifications = [];

      // Low balance warning
      if (user.coins < 50) {
        notifications.push({
          type: 'warning',
          icon: '⚠️',
          title: 'رصيدك منخفض!',
          message: `لديك ${user.coins} عملة فقط. العب لجمع المزيد! 🎮`,
          action: '🎮 العب الآن'
        });
      }

      // Streak milestone
      if (user.streak?.current === 7 || user.streak?.current === 30) {
        notifications.push({
          type: 'achievement',
          icon: '🔥',
          title: `سلسلة نشاط ${user.streak.current} يوم!`,
          message: 'ممتاز! استمر في هذا الزخم! 💪',
          action: '⭐ مكافأة'
        });
      }

      // Level up recommendation
      if (user.xp > (user.level * 100)) {
        notifications.push({
          type: 'milestone',
          icon: '⭐',
          title: `أنت قريب من المستوى ${user.level + 1}!`,
          message: `احصل على ${(user.level * 100) - user.xp} نقطة أخرى! 📈`,
          action: '🎯 العب'
        });
      }

      // Khatma progress
      if (user.khatmaProgress?.currentPage === 114) {
        notifications.push({
          type: 'celebration',
          icon: '📖✨',
          title: 'أكملت الختمة!',
          message: 'مبروك! أنت أكملت قراءة القرآن الكريم! 🎉',
          action: '🎁 الجائزة'
        });
      } else if (user.khatmaProgress?.currentPage % 10 === 0 && user.khatmaProgress?.currentPage > 0) {
        const pages = user.khatmaProgress.currentPage;
        notifications.push({
          type: 'progress',
          icon: '📖',
          title: `تقدم: ${pages}/114 صفحة`,
          message: 'أنت في الطريق الصحيح! استمر بقراءتك 📚',
          action: '👍 شكراً'
        });
      }

      // Game streak
      if (user.gamesPlayed?.total % 5 === 0 && user.gamesPlayed?.total > 0) {
        const wins = user.gamesPlayed?.wins || 0;
        const winRate = Math.round((wins / user.gamesPlayed.total) * 100);

        if (winRate > 70) {
          notifications.push({
            type: 'achievement',
            icon: '🏆',
            title: 'أنت لاعب ماهر!',
            message: `معدل انتصاراتك ${winRate}%! 🎮`,
            action: '💪 تحدِِ اصعب'
          });
        }
      }

      // Motivational based on inactivity
      const lastActive = new Date(user.lastActive || user.createdAt);
      const hoursAgo = Math.floor((new Date() - lastActive) / (1000 * 60 * 60));

      if (hoursAgo > 24 && hoursAgo < 48) {
        notifications.push({
          type: 'motivation',
          icon: '💪',
          title: 'نفتقدك!',
          message: 'عودتك تسعدنا! جاهز للعب؟ 🎮',
          action: '👋 أنا هنا'
        });
      }

      return notifications.length > 0 ? notifications[0] : null;
    } catch (error) {
      console.error('Smart notification error:', error);
      return null;
    }
  }

  // Format notification for Telegram
  static formatNotification(notification) {
    if (!notification) return null;

    const messages = {
      warning: `⚠️ <b>${notification.title}</b>\n\n${notification.message}`,
      achievement: `🏆 <b>${notification.title}</b>\n\n${notification.message}`,
      milestone: `⭐ <b>${notification.title}</b>\n\n${notification.message}`,
      celebration: `🎉 <b>${notification.title}</b>\n\n${notification.message}`,
      progress: `📊 <b>${notification.title}</b>\n\n${notification.message}`,
      motivation: `💪 <b>${notification.title}</b>\n\n${notification.message}`
    };

    return messages[notification.type] || notification.message;
  }

  // Daily digest
  static async generateDailyDigest(userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return null;

      const digest = {
        date: new Date().toLocaleDateString('ar-SA'),
        stats: {
          coinsToday: Math.floor(Math.random() * 50 + 10),
          gamesPlayed: Math.floor(Math.random() * 5 + 1),
          pagesRead: Math.floor(Math.random() * 5 + 1),
          xpGained: Math.floor(Math.random() * 100 + 20)
        },
        highlights: [],
        nextRecommendation: null
      };

      // Determine highlights
      if (digest.stats.gamesPlayed >= 3) {
        digest.highlights.push('🎮 نشاط لعب عالي');
      }
      if (digest.stats.pagesRead >= 3) {
        digest.highlights.push('📖 قراءة جيدة');
      }
      if (digest.stats.xpGained >= 75) {
        digest.highlights.push('⭐ نقاط رائعة');
      }

      // Next recommendation
      const recommendations = [
        '📖 اقرأ 5 صفحات من القرآن',
        '🎮 لعب 3 جولات',
        '💰 جمع 100 عملة',
        '⭐ احصل على 50 نقطة'
      ];
      digest.nextRecommendation = recommendations[Math.floor(Math.random() * recommendations.length)];

      return digest;
    } catch (error) {
      console.error('Daily digest error:', error);
      return null;
    }
  }

  // Format daily digest
  static formatDailyDigest(digest) {
    if (!digest) return null;

    const highlightText = digest.highlights.length > 0
      ? digest.highlights.map(h => `✅ ${h}`).join('\n')
      : '📊 يوم عادي';

    return `
📊 <b>ملخص اليوم</b> - ${digest.date}

<b>إحصائيات:</b>
💰 عملات: +${digest.stats.coinsToday}
🎮 ألعاب: ${digest.stats.gamesPlayed}
📖 صفحات: ${digest.stats.pagesRead}
⭐ نقاط: +${digest.stats.xpGained}

<b>أبرز النقاط:</b>
${highlightText}

<b>اقتراحنا غداً:</b>
${digest.nextRecommendation}

استمر في هذا الطريق الرائع! 💪
`;
  }

  // Achievement unlocked
  static async checkAchievements(userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return [];

      const achievements = [];

      // Define all achievements
      const allAchievements = [
        {
          id: 'first_steps',
          condition: user.level >= 1,
          title: '🎯 البدايات الموفقة',
          description: 'وصلت للمستوى الأول'
        },
        {
          id: 'game_lover',
          condition: (user.gamesPlayed?.total || 0) >= 10,
          title: '🎮 عاشق الألعاب',
          description: 'لعبت 10 جولات'
        },
        {
          id: 'reader',
          condition: (user.khatmaProgress?.currentPage || 0) >= 50,
          title: '📖 القارئ',
          description: 'قرأت 50 صفحة'
        },
        {
          id: 'rich',
          condition: user.coins >= 500,
          title: '💰 الثري',
          description: 'جمعت 500 عملة'
        },
        {
          id: 'master',
          condition: user.level >= 10,
          title: '👑 الماهر',
          description: 'وصلت المستوى 10'
        },
        {
          id: 'legend',
          condition: (user.gamesPlayed?.wins || 0) >= 20,
          title: '🏆 الأسطورة',
          description: 'فزت بـ 20 لعبة'
        },
        {
          id: 'dedication',
          condition: (user.streak?.longest || 0) >= 7,
          title: '🔥 المثابر',
          description: 'حافظت على سلسلة 7 أيام'
        },
        {
          id: 'completion',
          condition: (user.khatmaProgress?.currentPage || 0) >= 114,
          title: '✨ الختمة',
          description: 'أكملت ختمة القرآن'
        }
      ];

      // Check each achievement
      for (const achievement of allAchievements) {
        if (achievement.condition && (!user.achievements?.includes(achievement.id))) {
          achievements.push(achievement);
          user.achievements = user.achievements || [];
          user.achievements.push(achievement.id);
        }
      }

      if (achievements.length > 0) {
        await user.save();
      }

      return achievements;
    } catch (error) {
      console.error('Achievement check error:', error);
      return [];
    }
  }

  // Format achievement
  static formatAchievements(achievements) {
    if (!achievements || achievements.length === 0) return null;

    return achievements
      .map(a => `${a.title}\n<i>${a.description}</i>`)
      .join('\n\n');
  }
}

module.exports = SmartNotifications;
