const Team = require('../database/models/Team');
const { User } = require('../database/models');

class TeamManager {
  /**
   * Create a new team
   */
  static async createTeam(userId, teamName, description = '') {
    try {
      // Check if user already has a team
      const existingTeam = await Team.findOne({
        'members.userId': userId
      });

      if (existingTeam) {
        return {
          success: false,
          message: '❌ أنت عضو في فريق بالفعل. اترك فريقك الحالي أولاً.'
        };
      }

      // Check if team name exists
      const nameExists = await Team.findOne({ name: teamName });
      if (nameExists) {
        return {
          success: false,
          message: '❌ اسم الفريق موجود بالفعل. اختر اسماً آخر.'
        };
      }

      // Create team
      const team = new Team({
        name: teamName,
        description,
        leader: userId,
        members: [{
          userId,
          role: 'leader',
          joinedAt: new Date()
        }]
      });

      await team.save();

      return {
        success: true,
        message: `✅ تم إنشاء فريق "${teamName}" بنجاح!`,
        team
      };
    } catch (error) {
      console.error('Error creating team:', error);
      return {
        success: false,
        message: '❌ حدث خطأ أثناء إنشاء الفريق.'
      };
    }
  }

  /**
   * Join a team
   */
  static async joinTeam(userId, teamName) {
    try {
      // Check if already in a team
      const existingMembership = await Team.findOne({
        'members.userId': userId
      });

      if (existingMembership) {
        return {
          success: false,
          message: '❌ أنت عضو في فريق بالفعل.'
        };
      }

      // Find team
      const team = await Team.findOne({ name: teamName });
      if (!team) {
        return {
          success: false,
          message: '❌ الفريق غير موجود.'
        };
      }

      // Check if team is full
      if (team.members.length >= team.settings.maxMembers) {
        return {
          success: false,
          message: '❌ الفريق ممتلئ.'
        };
      }

      // Add member
      team.members.push({
        userId,
        role: 'member',
        joinedAt: new Date()
      });

      await team.save();

      return {
        success: true,
        message: `✅ تم الانضمام إلى فريق "${teamName}" بنجاح!`,
        team
      };
    } catch (error) {
      console.error('Error joining team:', error);
      return {
        success: false,
        message: '❌ حدث خطأ أثناء الانضمام للفريق.'
      };
    }
  }

  /**
   * Leave team
   */
  static async leaveTeam(userId) {
    try {
      const team = await Team.findOne({ 'members.userId': userId });

      if (!team) {
        return {
          success: false,
          message: '❌ أنت لست عضواً في أي فريق.'
        };
      }

      // Check if user is leader
      if (team.leader === userId) {
        // Transfer leadership or delete team
        if (team.members.length > 1) {
          // Transfer to oldest admin or member
          const newLeader = team.members.find(m => m.userId !== userId);
          team.leader = newLeader.userId;
          newLeader.role = 'leader';
        } else {
          // Delete team if leader is only member
          await Team.deleteOne({ _id: team._id });
          return {
            success: true,
            message: '✅ تم حذف الفريق.'
          };
        }
      }

      // Remove member
      team.members = team.members.filter(m => m.userId !== userId);
      await team.save();

      return {
        success: true,
        message: '✅ تم مغادرة الفريق بنجاح.'
      };
    } catch (error) {
      console.error('Error leaving team:', error);
      return {
        success: false,
        message: '❌ حدث خطأ أثناء مغادرة الفريق.'
      };
    }
  }

  /**
   * Get team info
   */
  static async getTeamInfo(teamNameOrUserId) {
    try {
      let team;

      // Check if searching by name or user ID
      if (typeof teamNameOrUserId === 'string') {
        team = await Team.findOne({ name: teamNameOrUserId });
      } else {
        team = await Team.findOne({ 'members.userId': teamNameOrUserId });
      }

      if (!team) return null;

      // Get member details
      const memberDetails = await Promise.all(
        team.members.map(async (m) => {
          const user = await User.findOne({ userId: m.userId });
          return {
            userId: m.userId,
            username: user?.username || 'Unknown',
            firstName: user?.firstName || 'User',
            role: m.role,
            xp: user?.xp || 0,
            coins: user?.coins || 0
          };
        })
      );

      return {
        ...team.toObject(),
        memberDetails
      };
    } catch (error) {
      console.error('Error getting team info:', error);
      return null;
    }
  }

  /**
   * Update team stats when members perform actions
   */
  static async updateTeamStats(userId, statsUpdate) {
    try {
      const team = await Team.findOne({ 'members.userId': userId });
      if (!team) return;

      // Update stats
      if (statsUpdate.xp) team.stats.totalXP += statsUpdate.xp;
      if (statsUpdate.coins) team.stats.totalCoins += statsUpdate.coins;
      if (statsUpdate.khatmaPages) team.stats.totalKhatmaPages += statsUpdate.khatmaPages;
      if (statsUpdate.gamePlayed) team.stats.gamesPlayed += 1;
      if (statsUpdate.gameWon) team.stats.gamesWon += 1;

      await team.save();
    } catch (error) {
      console.error('Error updating team stats:', error);
    }
  }

  /**
   * Get team leaderboard
   */
  static async getTeamLeaderboard(limit = 10) {
    try {
      const teams = await Team.find()
        .sort({ 'stats.totalXP': -1 })
        .limit(limit);

      return teams;
    } catch (error) {
      console.error('Error getting team leaderboard:', error);
      return [];
    }
  }

  /**
   * Format team display
   */
  static formatTeamInfo(teamData) {
    if (!teamData) return '❌ لم يتم العثور على الفريق';

    let message = `🏆 <b>${teamData.name}</b>\n\n`;

    if (teamData.description) {
      message += `📝 ${teamData.description}\n\n`;
    }

    message += `👑 <b>القائد:</b> ${teamData.memberDetails.find(m => m.role === 'leader')?.firstName || 'Unknown'}\n`;
    message += `👥 <b>الأعضاء:</b> ${teamData.members.length}/${teamData.settings.maxMembers}\n\n`;

    message += '📊 <b>إحصائيات الفريق:</b>\n';
    message += `⭐ نقاط الخبرة: ${teamData.stats.totalXP.toLocaleString()}\n`;
    message += `💰 العملات: ${teamData.stats.totalCoins.toLocaleString()}\n`;
    message += `📖 صفحات الختمة: ${teamData.stats.totalKhatmaPages.toLocaleString()}\n`;
    message += `🎮 ألعاب: ${teamData.stats.gamesPlayed} (${teamData.stats.gamesWon} فوز)\n\n`;

    message += '👥 <b>أعضاء الفريق:</b>\n';
    teamData.memberDetails
      .sort((a, b) => b.xp - a.xp)
      .forEach((member, index) => {
        const roleEmoji = member.role === 'leader' ? '👑' : member.role === 'admin' ? '⭐' : '👤';
        message += `${index + 1}. ${roleEmoji} ${member.firstName}\n`;
        message += `   └ XP: ${member.xp.toLocaleString()} | 💰 ${member.coins.toLocaleString()}\n`;
      });

    if (teamData.achievements && teamData.achievements.length > 0) {
      message += '\n🏅 <b>الإنجازات:</b>\n';
      teamData.achievements.forEach(a => {
        message += `• ${a.name}\n`;
      });
    }

    return message;
  }

  /**
   * Format team leaderboard
   */
  static formatTeamLeaderboard(teams) {
    if (!teams || teams.length === 0) {
      return '❌ لا توجد فرق بعد';
    }

    let message = '🏆 <b>لوحة المتصدرين - الفرق</b>\n\n';

    teams.forEach((team, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;

      message += `${medal} <b>${team.name}</b>\n`;
      message += `   👥 ${team.members.length} عضو | ⭐ ${team.stats.totalXP.toLocaleString()} XP\n\n`;
    });

    return message;
  }

  /**
   * Create team challenge
   */
  static async createChallenge(teamId, challengeData) {
    try {
      const team = await Team.findById(teamId);
      if (!team) return { success: false, message: 'الفريق غير موجود' };

      // Add challenge logic here
      // This is a placeholder for future implementation

      return { success: true, message: 'تم إنشاء التحدي بنجاح' };
    } catch (error) {
      console.error('Error creating challenge:', error);
      return { success: false, message: 'حدث خطأ' };
    }
  }
}

module.exports = TeamManager;
