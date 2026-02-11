const Event = require('../database/models/Event');

class EventsSystem {
  /**
   * Create a new event
   */
  static async createEvent(eventData) {
    try {
      const event = new Event(eventData);
      await event.save();

      return {
        success: true,
        message: '✅ تم إنشاء الحدث بنجاح!',
        event
      };
    } catch (error) {
      console.error('Error creating event:', error);
      return {
        success: false,
        message: '❌ حدث خطأ أثناء إنشاء الحدث'
      };
    }
  }

  /**
   * Join an event
   */
  static async joinEvent(userId, eventId) {
    try {
      const { User } = require('../database/models');

      const event = await Event.findById(eventId);
      if (!event) {
        return { success: false, message: '❌ الحدث غير موجود' };
      }

      // Check if event is active
      if (event.status !== 'active') {
        return { success: false, message: '❌ الحدث غير نشط حالياً' };
      }

      // Check if already joined
      if (event.participants.some(p => p.userId === userId)) {
        return { success: false, message: '❌ أنت مشترك بالفعل' };
      }

      // Check max participants
      if (event.requirements.maxParticipants &&
          event.participants.length >= event.requirements.maxParticipants) {
        return { success: false, message: '❌ الحدث ممتلئ' };
      }

      // Check user level
      const user = await User.findOne({ userId });
      if (!user) {
        return { success: false, message: '❌ مستخدم غير موجود' };
      }

      const userLevel = user.level || Math.floor(user.xp / 1000);
      if (userLevel < event.requirements.minLevel) {
        return {
          success: false,
          message: `❌ تحتاج إلى المستوى ${event.requirements.minLevel} للمشاركة`
        };
      }

      // Check entry fee
      if (event.requirements.entryFee > 0) {
        if (user.coins < event.requirements.entryFee) {
          return {
            success: false,
            message: `❌ تحتاج إلى ${event.requirements.entryFee} عملة للمشاركة`
          };
        }
        user.coins -= event.requirements.entryFee;
        await user.save();
      }

      // Add participant
      event.participants.push({
        userId,
        joinedAt: new Date(),
        score: 0,
        progress: {}
      });

      event.stats.totalParticipants++;
      await event.save();

      return {
        success: true,
        message: `✅ تم الانضمام إلى "${event.title}" بنجاح!`,
        event
      };
    } catch (error) {
      console.error('Error joining event:', error);
      return { success: false, message: '❌ حدث خطأ' };
    }
  }

  /**
   * Update participant progress
   */
  static async updateProgress(userId, eventId, progressData) {
    try {
      const event = await Event.findById(eventId);
      if (!event) return { success: false };

      const participant = event.participants.find(p => p.userId === userId);
      if (!participant) return { success: false };

      // Update progress
      Object.assign(participant.progress, progressData);

      // Calculate score based on progress
      participant.score = this.calculateEventScore(event.type, participant.progress);

      await event.save();

      return { success: true, score: participant.score };
    } catch (error) {
      console.error('Error updating progress:', error);
      return { success: false };
    }
  }

  /**
   * Calculate event score
   */
  static calculateEventScore(eventType, progress) {
    let score = 0;

    switch (eventType) {
      case 'competition':
        score = (progress.wins || 0) * 100 + (progress.games || 0) * 10;
        break;
      case 'challenge':
        score = (progress.completed || 0) * 50 + (progress.attempts || 0) * 5;
        break;
      case 'seasonal':
        score = (progress.days || 0) * 20 + (progress.actions || 0) * 2;
        break;
      case 'community':
        score = (progress.contributions || 0) * 30;
        break;
    }

    return score;
  }

  /**
   * Get active events
   */
  static async getActiveEvents() {
    try {
      const events = await Event.find({ status: 'active' })
        .sort({ startDate: -1 });
      return events;
    } catch (error) {
      console.error('Error getting active events:', error);
      return [];
    }
  }

  /**
   * Get event leaderboard
   */
  static async getEventLeaderboard(eventId, limit = 10) {
    try {
      const { User } = require('../database/models');

      const event = await Event.findById(eventId);
      if (!event) return [];

      // Sort participants by score
      const sorted = event.participants
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Get user details
      const leaderboard = await Promise.all(
        sorted.map(async (p) => {
          const user = await User.findOne({ userId: p.userId });
          return {
            userId: p.userId,
            firstName: user?.firstName || 'Unknown',
            score: p.score,
            progress: p.progress
          };
        })
      );

      return leaderboard;
    } catch (error) {
      console.error('Error getting event leaderboard:', error);
      return [];
    }
  }

  /**
   * End event and distribute prizes
   */
  static async endEvent(eventId) {
    try {
      const { User } = require('../database/models');

      const event = await Event.findById(eventId);
      if (!event) return { success: false };

      event.status = 'ended';

      // Get final leaderboard
      const leaderboard = await this.getEventLeaderboard(eventId, event.prizes.length);

      // Distribute prizes
      const winners = [];
      for (let i = 0; i < Math.min(leaderboard.length, event.prizes.length); i++) {
        const participant = leaderboard[i];
        const prize = event.prizes[i];

        const user = await User.findOne({ userId: participant.userId });
        if (user) {
          user.coins += prize.coins || 0;
          user.xp += prize.xp || 0;

          if (prize.badge) {
            if (!user.badgeDetails) user.badgeDetails = [];
            user.badgeDetails.push({
              id: `event_${event._id}_${i + 1}`,
              name: prize.badge,
              description: `جائزة من حدث ${event.title}`,
              icon: '🏆',
              earnedAt: new Date(),
              source: `event_${event.title}`
            });
          }

          await user.save();

          winners.push({
            rank: i + 1,
            user: participant,
            prize
          });
        }
      }

      await event.save();

      return {
        success: true,
        winners
      };
    } catch (error) {
      console.error('Error ending event:', error);
      return { success: false };
    }
  }

  /**
   * Format event display
   */
  static formatEvent(event) {
    if (!event) return '❌ الحدث غير موجود';

    const statusEmoji = {
      'upcoming': '🔜',
      'active': '🔥',
      'ended': '✅'
    };

    const typeEmoji = {
      'competition': '🏆',
      'challenge': '⚡',
      'seasonal': '🌟',
      'community': '👥'
    };

    let message = `${typeEmoji[event.type]} <b>${event.title}</b> ${statusEmoji[event.status]}\n\n`;

    if (event.description) {
      message += `📝 ${event.description}\n\n`;
    }

    message += `📅 <b>البداية:</b> ${new Date(event.startDate).toLocaleDateString('ar-SA')}\n`;
    message += `📅 <b>النهاية:</b> ${new Date(event.endDate).toLocaleDateString('ar-SA')}\n\n`;

    message += `👥 <b>المشاركون:</b> ${event.stats.totalParticipants}`;
    if (event.requirements.maxParticipants) {
      message += `/${event.requirements.maxParticipants}`;
    }
    message += '\n\n';

    if (event.requirements.minLevel > 0) {
      message += `📊 <b>المستوى المطلوب:</b> ${event.requirements.minLevel}\n`;
    }

    if (event.requirements.entryFee > 0) {
      message += `💰 <b>رسوم الاشتراك:</b> ${event.requirements.entryFee} عملة\n`;
    }

    if (event.prizes && event.prizes.length > 0) {
      message += '\n🏆 <b>الجوائز:</b>\n';
      event.prizes.forEach(prize => {
        const rankEmoji = prize.rank === 1 ? '🥇' : prize.rank === 2 ? '🥈' : prize.rank === 3 ? '🥉' : `${prize.rank}.`;
        message += `${rankEmoji} `;
        const rewards = [];
        if (prize.coins) rewards.push(`${prize.coins} عملة`);
        if (prize.xp) rewards.push(`${prize.xp} XP`);
        if (prize.badge) rewards.push(prize.badge);
        message += `${rewards.join(' + ')  }\n`;
      });
    }

    return message;
  }

  /**
   * Format event leaderboard
   */
  static formatEventLeaderboard(event, leaderboard) {
    if (!leaderboard || leaderboard.length === 0) {
      return '❌ لا يوجد مشاركون بعد';
    }

    let message = `🏆 <b>المتصدرون - ${event.title}</b>\n\n`;

    leaderboard.forEach((participant, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;

      message += `${medal} <b>${participant.firstName}</b>\n`;
      message += `   └ ${participant.score} نقطة\n\n`;
    });

    return message;
  }

  /**
   * Get predefined event templates
   */
  static getEventTemplates() {
    return {
      ramadan: {
        title: 'تحدي رمضان',
        description: 'أكمل أكبر عدد من الختمات في رمضان',
        type: 'seasonal',
        prizes: [
          { rank: 1, coins: 5000, xp: 2000, badge: '🌙 بطل رمضان' },
          { rank: 2, coins: 3000, xp: 1500, badge: '⭐ نجم رمضان' },
          { rank: 3, coins: 2000, xp: 1000, badge: '✨ نجم صاعد' }
        ]
      },
      quran: {
        title: 'مسابقة حفظ القرآن',
        description: 'من يحفظ ويراجع أكثر؟',
        type: 'competition',
        prizes: [
          { rank: 1, coins: 3000, xp: 1500, badge: '📖 حافظ متميز' },
          { rank: 2, coins: 2000, xp: 1000, badge: '📗 حافظ نشيط' },
          { rank: 3, coins: 1000, xp: 500, badge: '📕 حافظ مجتهد' }
        ]
      },
      charity: {
        title: 'شهر الخير',
        description: 'سجل أكبر عدد من الصدقات',
        type: 'community',
        prizes: [
          { rank: 1, coins: 2000, xp: 1000, badge: '💝 متصدق كبير' },
          { rank: 2, coins: 1500, xp: 750, badge: '🎁 متصدق نشيط' },
          { rank: 3, coins: 1000, xp: 500, badge: '💰 متصدق' }
        ]
      }
    };
  }
}

module.exports = EventsSystem;
