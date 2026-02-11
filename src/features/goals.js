const { User } = require('../database/models');

class GoalsManager {
  /**
   * Create a new goal for user
   */
  static async createGoal(userId, goalData) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return { success: false, message: 'المستخدم غير موجود' };

      user.goals = user.goals || [];

      const newGoal = {
        id: Date.now().toString(),
        type: goalData.type, // 'khatma', 'adhkar', 'quran_pages', 'games'
        title: goalData.title,
        description: goalData.description,
        target: goalData.target,
        current: 0,
        period: goalData.period, // 'daily', 'weekly', 'monthly', 'yearly'
        startDate: new Date(),
        endDate: this.calculateEndDate(goalData.period),
        reward: goalData.reward || 100,
        status: 'active',
        createdAt: new Date()
      };

      user.goals.push(newGoal);
      await user.save();

      return {
        success: true,
        message: '✅ تم إنشاء الهدف بنجاح',
        goal: newGoal
      };
    } catch (error) {
      console.error('Create goal error:', error);
      return { success: false, message: 'حدث خطأ' };
    }
  }

  /**
   * Update goal progress
   */
  static async updateGoalProgress(userId, goalId, progress) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return { success: false };

      const goal = user.goals.find(g => g.id === goalId && g.status === 'active');
      if (!goal) return { success: false, message: 'الهدف غير موجود' };

      goal.current += progress;

      // Check if goal completed
      if (goal.current >= goal.target) {
        goal.status = 'completed';
        goal.completedAt = new Date();

        // Give reward
        user.coins += goal.reward;
        user.xp += goal.reward;

        await user.save();

        return {
          success: true,
          completed: true,
          message: `🎉 مبروك! أكملت هدف "${goal.title}"\n💰 +${goal.reward} عملة\n⭐ +${goal.reward} نقطة`,
          goal
        };
      }

      await user.save();
      return {
        success: true,
        completed: false,
        message: `✅ تم تحديث التقدم: ${goal.current}/${goal.target}`,
        goal
      };
    } catch (error) {
      console.error('Update goal progress error:', error);
      return { success: false, message: 'حدث خطأ' };
    }
  }

  /**
   * Get all user goals
   */
  static async getUserGoals(userId, status = null) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return [];

      let goals = user.goals || [];

      if (status) {
        goals = goals.filter(g => g.status === status);
      }

      return goals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('Get user goals error:', error);
      return [];
    }
  }

  /**
   * Delete a goal
   */
  static async deleteGoal(userId, goalId) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return { success: false };

      user.goals = user.goals.filter(g => g.id !== goalId);
      await user.save();

      return { success: true, message: '✅ تم حذف الهدف' };
    } catch (error) {
      console.error('Delete goal error:', error);
      return { success: false, message: 'حدث خطأ' };
    }
  }

  /**
   * Format goals for display
   */
  static formatGoals(goals, type = 'active') {
    if (goals.length === 0) {
      return type === 'active'
        ? '📋 لا توجد أهداف نشطة\n\nأنشئ هدفاً جديداً وابدأ التحدي!'
        : '✅ لا توجد أهداف مكتملة بعد';
    }

    let message = type === 'active'
      ? `🎯 <b>أهدافك النشطة (${goals.length})</b>\n\n`
      : `✅ <b>أهداف مكتملة (${goals.length})</b>\n\n`;

    goals.forEach((goal, i) => {
      const progress = Math.min(100, Math.round((goal.current / goal.target) * 100));
      const progressBar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));

      message += `${i + 1}. <b>${goal.title}</b>\n`;
      message += `   ${this.getGoalIcon(goal.type)} ${goal.description}\n`;
      message += `   ${progressBar} ${progress}%\n`;
      message += `   📊 ${goal.current}/${goal.target}\n`;
      message += `   💰 المكافأة: ${goal.reward}\n`;

      if (goal.status === 'active') {
        const daysLeft = Math.ceil((new Date(goal.endDate) - new Date()) / (1000 * 60 * 60 * 24));
        message += `   ⏰ الوقت المتبقي: ${daysLeft} يوم\n`;
      } else {
        message += `   ✅ مكتمل في: ${new Date(goal.completedAt).toLocaleDateString('ar-EG')}\n`;
      }

      message += '\n';
    });

    return message;
  }

  /**
   * Calculate end date based on period
   */
  static calculateEndDate(period) {
    const date = new Date();

    switch (period) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }

    return date;
  }

  /**
   * Get icon for goal type
   */
  static getGoalIcon(type) {
    const icons = {
      'khatma': '📖',
      'adhkar': '📿',
      'quran_pages': '📚',
      'games': '🎮',
      'prayers': '🕌',
      'charity': '💝',
      'learning': '🎓'
    };
    return icons[type] || '🎯';
  }

  /**
   * Get suggested goals templates
   */
  static getSuggestedGoals() {
    return [
      {
        type: 'khatma',
        title: 'ختمة كاملة',
        description: 'إكمال ختمة كاملة من القرآن',
        target: 604,
        period: 'monthly',
        reward: 1000,
        icon: '📖'
      },
      {
        type: 'adhkar',
        title: 'أذكار يومية',
        description: 'المواظبة على الأذكار لمدة أسبوع',
        target: 7,
        period: 'weekly',
        reward: 500,
        icon: '📿'
      },
      {
        type: 'quran_pages',
        title: 'قراءة يومية',
        description: 'قراءة 10 صفحات يومياً',
        target: 10,
        period: 'daily',
        reward: 100,
        icon: '📚'
      },
      {
        type: 'prayers',
        title: 'الصلوات الخمس',
        description: 'المحافظة على الصلوات الخمس',
        target: 35,
        period: 'weekly',
        reward: 750,
        icon: '🕌'
      },
      {
        type: 'games',
        title: 'ألعاب تعليمية',
        description: 'لعب 20 لعبة تعليمية',
        target: 20,
        period: 'monthly',
        reward: 400,
        icon: '🎮'
      },
      {
        type: 'charity',
        title: 'أعمال الخير',
        description: 'القيام بـ 5 أعمال خيرية',
        target: 5,
        period: 'monthly',
        reward: 600,
        icon: '💝'
      }
    ];
  }
}

module.exports = GoalsManager;
