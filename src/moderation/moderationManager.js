const { User, Group } = require('../database/models');

class ModerationManager {
  // Ban user
  static async banUser(userId, groupId, reason = 'No reason provided') {
    try {
      const user = await User.findOne({ userId });
      const group = await Group.findOne({ groupId });

      if (!user || !group) return { success: false };

      // Add to banned list
      group.bannedUsers.push({
        userId,
        reason,
        bannedAt: new Date(),
        bannedBy: null
      });

      // Update user restrictions
      user.isBanned = true;
      user.banReason = reason;

      await user.save();
      await group.save();

      return { success: true, message: `✅ تم حظر المستخدم: ${reason}` };
    } catch (error) {
      console.error('Error banning user:', error);
      return { success: false };
    }
  }

  // Unban user
  static async unbanUser(userId, groupId) {
    try {
      const user = await User.findOne({ userId });
      const group = await Group.findOne({ groupId });

      if (!user || !group) return { success: false };

      // Remove from banned list
      group.bannedUsers = group.bannedUsers.filter(b => b.userId !== userId);

      // Update user
      user.isBanned = false;
      user.banReason = null;

      await user.save();
      await group.save();

      return { success: true, message: '✅ تم رفع الحظر عن المستخدم' };
    } catch (error) {
      console.error('Error unbanning user:', error);
      return { success: false };
    }
  }

  // Warn user
  static async warnUser(userId, groupId, _reason = '') {
    try {
      const group = await Group.findOne({ groupId });
      if (!group) return { success: false };

      let warning = group.warnings.find(w => w.userId === userId);
      if (!warning) {
        warning = { userId, count: 0, lastWarning: new Date() };
        group.warnings.push(warning);
      }

      warning.count += 1;
      warning.lastWarning = new Date();
      await group.save();

      return {
        success: true,
        count: warning.count,
        message: `⚠️ تحذير للمستخدم. التحذيرات: ${warning.count}/3`
      };
    } catch (error) {
      console.error('Error warning user:', error);
      return { success: false };
    }
  }

  // Mute user
  static async muteUser(userId, groupId, duration = 3600) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return { success: false };

      user.restrictions.canChat = false;
      await user.save();

      // Set expiration timer
      setTimeout(async () => {
        user.restrictions.canChat = true;
        await user.save();
      }, duration * 1000);

      return { success: true, message: '🤐 تم كتم صوت المستخدم' };
    } catch (error) {
      console.error('Error muting user:', error);
      return { success: false };
    }
  }

  // Clear messages
  static async clearMessages(groupId, count = 10) {
    try {
      const group = await Group.findOne({ groupId });
      if (!group) return { success: false };

      group.statistics.messagesCount = Math.max(0, group.statistics.messagesCount - count);
      await group.save();

      return { success: true, message: `✅ تم حذف ${count} رسالة` };
    } catch (error) {
      console.error('Error clearing messages:', error);
      return { success: false };
    }
  }

  // Filter bad words
  static filterBadWords(text) {
    const badWords = ['كلمة سيئة', 'لغة غير أدبية'];
    let filtered = text;

    badWords.forEach(word => {
      const regex = new RegExp(word, 'gi');
      filtered = filtered.replace(regex, '*'.repeat(word.length));
    });

    return filtered;
  }

  // Check flood protection
  static async checkFloodProtection(userId, groupId) {
    try {
      const key = `flood_${groupId}_${userId}`;
      const messageCount = await this.getMessageCount(key);

      if (messageCount > 10) {
        return { isFlooding: true, message: '🛑 أنت تراسل بسرعة كبيرة، يرجى الانتظار' };
      }

      await this.incrementMessageCount(key);
      return { isFlooding: false };
    } catch (error) {
      console.error('Error checking flood protection:', error);
      return { isFlooding: false };
    }
  }

  // Add admin permission
  static async addAdmin(userId, groupId, permissions = []) {
    try {
      const group = await Group.findOne({ groupId });
      if (!group) return { success: false };

      const admin = group.admins.find(a => a.userId === userId);
      if (admin) {
        return { success: false, message: '❌ المستخدم مشرف بالفعل' };
      }

      group.admins.push({
        userId,
        username: '',
        permissions,
        addedAt: new Date()
      });

      await group.save();
      return { success: true, message: '✅ تم تعيين المشرف' };
    } catch (error) {
      console.error('Error adding admin:', error);
      return { success: false };
    }
  }

  // Remove admin
  static async removeAdmin(userId, groupId) {
    try {
      const group = await Group.findOne({ groupId });
      if (!group) return { success: false };

      group.admins = group.admins.filter(a => a.userId !== userId);
      await group.save();

      return { success: true, message: '✅ تم إزالة صلاحيات المشرف' };
    } catch (error) {
      console.error('Error removing admin:', error);
      return { success: false };
    }
  }

  // Get permission level
  static async getPermissionLevel(userId, groupId) {
    try {
      // Check if bot owner
      if (process.env.BOT_OWNERS?.split(',').includes(userId.toString())) {
        return 3; // Owner
      }

      const group = await Group.findOne({ groupId });
      if (!group) return 0;

      const admin = group.admins.find(a => a.userId === userId);
      if (admin) return 2; // Group admin

      return 1; // Regular user
    } catch (error) {
      console.error('Error getting permission level:', error);
      return 0;
    }
  }

  // Mock functions for demonstration
  static async getMessageCount(_key) {
    return Math.floor(Math.random() * 5);
  }

  static async incrementMessageCount(_key) {
    return true;
  }
}

module.exports = ModerationManager;
