const Markup = require('telegraf/markup');
const UIManager = require('../ui/keyboards');
const Formatter = require('../ui/formatter');
const { User } = require('../database/models');
const EconomyManager = require('../economy/economyManager');

class CommandHandler {
  static async handleStart(ctx) {
    const user = ctx.from;

    try {
      let dbUser = await User.findOne({ userId: user.id });
      if (!dbUser) {
        dbUser = await EconomyManager.createUser(user.id, user);
      }

      // Check if owner
      const isOwner = UIManager.isOwner(ctx.from.id);

      // Simple welcome message with keyboard
      let message = `👋 مرحباً ${dbUser.firstName || 'صديقي'}!\n\n🎯 اختر من لوحة المفاتيح:`;

      if (isOwner) {
        message = `👑 أهلاً بك يا مالك البوت ${dbUser.firstName}!\n\n⚡ لديك صلاحيات كاملة على النظام\n🎯 اختر من لوحة المفاتيح الخاصة:`;
      }

      const keyboard = UIManager.mainReplyKeyboard(ctx.from.id);

      await ctx.reply(message, keyboard);
    } catch (error) {
      console.error('Error in handleStart:', error);
      ctx.reply('❌ خطأ');
    }
  }

  static async handleHelp(ctx) {
    const helpMessage = `📚 **الأوامر المتاحة:**

/start - البدء
/profile - ملفك
/balance - رصيدك
/daily - مكافأة يومية
/leaderboard - الترتيب`;

    await ctx.reply(helpMessage);
  }

  static async handleBalance(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) {
        return ctx.reply('❌ لم يتم العثور على ملفك الشخصي');
      }

      const balanceMessage = Formatter.formatBalanceInfo(user);
      await ctx.reply(balanceMessage);
    } catch (error) {
      console.error('Error in handleBalance:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleLeaderboard(ctx) {
    try {
      const users = await User.find().sort({ xp: -1 });
      if (users.length === 0) {
        return ctx.reply('❌ لا توجد بيانات في اللوحة الصدارة');
      }

      const leaderboardMessage = Formatter.formatLeaderboard(users, 'xp');
      await ctx.reply(leaderboardMessage);
    } catch (error) {
      console.error('Error in handleLeaderboard:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleDailyReward(ctx) {
    try {
      const result = await EconomyManager.claimDailyReward(ctx.from.id);
      if (result.success) {
        await ctx.reply(`✅ ${result.message}`);
      } else {
        await ctx.reply(`⏰ ${result.message}`);
      }
    } catch (error) {
      console.error('Error in handleDailyReward:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  // ===== OWNER ONLY COMMANDS =====

  static async handleOwnerPanel(ctx) {
    try {
      if (!UIManager.isOwner(ctx.from.id)) {
        return ctx.reply('❌ هذا الأمر متاح للمالك فقط');
      }

      const message = '👑 <b>لوحة تحكم المالك</b>\n\n' +
        '⚡ مرحباً في لوحة التحكم الكاملة\n' +
        '🎯 اختر العملية التي تريد القيام بها:\n\n' +
        '📊 إحصائيات البوت\n' +
        '👥 إدارة المستخدمين\n' +
        '💰 إدارة الاقتصاد\n' +
        '🗄️ إدارة قاعدة البيانات\n' +
        '📢 بث الرسائل\n' +
        '⚙️ صيانة النظام';

      const keyboard = UIManager.ownerControlPanel();

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } catch (e) {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      }
    } catch (error) {
      console.error('Error in handleOwnerPanel:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleOwnerStats(ctx) {
    try {
      if (!UIManager.isOwner(ctx.from.id)) {
        if (ctx.callbackQuery) {
          await ctx.answerCbQuery('❌ غير مصرح');
        }
        return ctx.reply('❌ ليس لديك صلاحية');
      }

      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({
        lastActiveDay: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });
      const bannedUsers = await User.countDocuments({ banned: true });

      const totalCoins = await User.aggregate([
        { $group: { _id: null, total: { $sum: '$coins' } } }
      ]);

      const totalXP = await User.aggregate([
        { $group: { _id: null, total: { $sum: '$xp' } } }
      ]);

      const { GameStats, Transaction } = require('../database/models');
      const totalGames = await GameStats.countDocuments();
      const totalTransactions = await Transaction.countDocuments();

      const mongoose = require('mongoose');
      const dbName = mongoose.connection.db.databaseName;
      const dbSize = await mongoose.connection.db.stats();

      const message = '📊 <b>إحصائيات البوت الشاملة</b>\n\n' +
        '👥 <b>المستخدمون:</b>\n' +
        `   • الكل: ${totalUsers}\n` +
        `   • نشطون (7 أيام): ${activeUsers}\n` +
        `   • محظورون: ${bannedUsers}\n\n` +
        '💰 <b>الاقتصاد:</b>\n' +
        `   • مجموع العملات: ${totalCoins[0]?.total || 0}\n` +
        `   • مجموع النقاط: ${totalXP[0]?.total || 0}\n` +
        `   • المعاملات: ${totalTransactions}\n\n` +
        '🎮 <b>الألعاب:</b>\n' +
        `   • إحصائيات محفوظة: ${totalGames}\n\n` +
        '🗄️ <b>قاعدة البيانات:</b>\n' +
        `   • الاسم: ${dbName}\n` +
        `   • الحجم: ${(dbSize.dataSize / 1024 / 1024).toFixed(2)} MB\n` +
        `   • المستندات: ${dbSize.objects}\n\n` +
        `⏰ آخر تحديث: ${new Date().toLocaleString('ar-EG')}`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 تحديث', 'owner:stats')],
        [Markup.button.callback('⬅️ رجوع', 'owner:panel')]
      ]);

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } catch (e) {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      }
    } catch (error) {
      console.error('Error in handleOwnerStats:', error);
      ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  static async handleOwnerUsers(ctx) {
    try {
      if (!UIManager.isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ غير مصرح');
      }

      const message = '👥 <b>إدارة المستخدمين</b>\n\n' +
        'اختر العملية:\n\n' +
        '👁️ عرض جميع المستخدمين\n' +
        '🔍 البحث عن مستخدم\n' +
        '🚫 حظر/إلغاء حظر\n' +
        '💎 إعطاء عملات أو XP\n' +
        '🔄 إعادة تعيين بيانات\n' +
        '🗑️ حذف مستخدمين';

      const keyboard = UIManager.ownerUsersManagement();

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } catch (e) {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      }
    } catch (error) {
      console.error('Error in handleOwnerUsers:', error);
      ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  static async handleOwnerBroadcast(ctx) {
    try {
      if (!UIManager.isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ غير مصرح');
      }

      ctx.session = ctx.session || {};
      ctx.session.ownerAwait = { type: 'broadcast' };

      if (ctx.callbackQuery) {
        await ctx.answerCbQuery('✅ جاهز');
      }
      await ctx.reply(
        '📢 <b>بث رسالة لجميع المستخدمين</b>\n\n' +
        'اكتب الرسالة التي تريد إرسالها:\n\n' +
        '💡 يمكنك استخدام HTML للتنسيق\n' +
        '❌ اكتب /cancel للإلغاء',
        { parse_mode: 'HTML' }
      );
    } catch (error) {
      console.error('Error in handleOwnerBroadcast:', error);
      ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  static async handleOwnerEconomy(ctx) {
    try {
      if (!UIManager.isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ غير مصرح');
      }

      const richest = await User.find().sort({ coins: -1 }).limit(5);
      const poorest = await User.find().sort({ coins: 1 }).limit(5);

      let message = '💰 <b>إدارة الاقتصاد</b>\n\n';
      message += '<b>أغنى 5 مستخدمين:</b>\n';
      richest.forEach((u, i) => {
        message += `${i + 1}. ${u.firstName} - 💰${u.coins}\n`;
      });

      message += '\n<b>أفقر 5 مستخدمين:</b>\n';
      poorest.forEach((u, i) => {
        message += `${i + 1}. ${u.firstName} - 💰${u.coins}\n`;
      });

      const keyboard = UIManager.ownerEconomyManagement();

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } catch (e) {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      }
    } catch (error) {
      console.error('Error in handleOwnerEconomy:', error);
      ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  static async handleOwnerDatabase(ctx) {
    try {
      if (!UIManager.isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ غير مصرح');
      }

      const mongoose = require('mongoose');
      const collections = await mongoose.connection.db.listCollections().toArray();

      let message = '🗄️ <b>إدارة قاعدة البيانات</b>\n\n';
      message += '<b>المجموعات (Collections):</b>\n';

      for (const col of collections) {
        const count = await mongoose.connection.db.collection(col.name).countDocuments();
        message += `• ${col.name}: ${count} مستند\n`;
      }

      const keyboard = UIManager.ownerDatabaseManagement();

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } catch (e) {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      }
    } catch (error) {
      console.error('Error in handleOwnerDatabase:', error);
      ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  static async handleOwnerLogs(ctx) {
    try {
      if (!UIManager.isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ غير مصرح');
      }

      const healthMonitor = require('../utils/healthMonitor');
      const stats = healthMonitor.stats;

      const message = '📝 <b>سجلات النظام</b>\n\n' +
        `⏰ وقت التشغيل: ${Math.floor(stats.uptime / 60)} دقيقة\n` +
        `✅ الطلبات الناجحة: ${stats.successfulRequests}\n` +
        `❌ الأخطاء: ${stats.errors}\n` +
        `🔄 محاولات إعادة الاتصال: ${stats.reconnectAttempts}\n` +
        `📊 آخر فحص صحة: ${stats.lastHealthCheck ? new Date(stats.lastHealthCheck).toLocaleTimeString('ar-EG') : 'لم يتم'}\n\n` +
        `💾 الذاكرة المستخدمة: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 تحديث', 'owner:logs')],
        [Markup.button.callback('⬅️ رجوع', 'owner:panel')]
      ]);

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } catch (e) {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      }
    } catch (error) {
      console.error('Error in handleOwnerLogs:', error);
      ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  static async handleOwnerViewAllUsers(ctx) {
    try {
      if (!UIManager.isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ غير مصرح');
      }

      const users = await User.find().sort({ createdAt: -1 }).limit(20);

      let message = '👥 <b>آخر 20 مستخدماً</b>\n\n';
      users.forEach((u, i) => {
        const status = u.banned ? '🚫' : '✅';
        message += `${i + 1}. ${status} ${u.firstName} (@${u.username || 'لا يوجد'})\n`;
        message += `   ID: <code>${u.userId}</code>\n`;
        message += `   💰${u.coins} - ⭐${u.xp} - 🎖️${u.level}\n\n`;
      });

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ رجوع', 'owner:users')]
      ]);

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } catch (e) {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      }
    } catch (error) {
      console.error('Error in handleOwnerViewAllUsers:', error);
      ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  static async handleOwnerGiveCoins(ctx) {
    try {
      if (!UIManager.isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ غير مصرح');
      }

      ctx.session = ctx.session || {};
      ctx.session.ownerAwait = { type: 'givecoins' };

      await ctx.answerCbQuery('✅ جاهز');
      await ctx.reply(
        '💎 <b>إعطاء عملات لمستخدم</b>\n\n' +
        'أرسل ID المستخدم، ثم المبلغ\n' +
        'مثال: 123456789 1000\n\n' +
        '❌ اكتب /cancel للإلغاء',
        { parse_mode: 'HTML' }
      );
    } catch (error) {
      console.error('Error in handleOwnerGiveCoins:', error);
      if (ctx.callbackQuery) {
        ctx.answerCbQuery('❌ حدث خطأ');
      } else {
        ctx.reply('❌ حدث خطأ');
      }
    }
  }

  // ==================== NEW FEATURES HANDLERS ====================

  static async handleProfile(ctx) {
    try {
      const AdvancedProfileSystem = require('../features/advancedProfileSystem');
      const profileData = await AdvancedProfileSystem.getProfileData(ctx.from.id);

      if (!profileData) {
        await ctx.reply('❌ لم يتم العثور على الملف الشخصي');
        return;
      }

      const message = AdvancedProfileSystem.formatProfile(profileData);
      await ctx.reply(message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Error in handleProfile:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleGoals(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) {
        await ctx.reply('❌ مستخدم غير موجود');
        return;
      }

      const goals = user.goals || [];
      const activeGoals = goals.filter(g => g.status === 'active');

      let message = '🎯 <b>أهدافك</b>\n\n';

      if (activeGoals.length === 0) {
        message += '📋 لا توجد أهداف نشطة حالياً\n\n';
      } else {
        activeGoals.forEach((goal, index) => {
          const progress = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
          message += `${index + 1}. ${goal.title}\n`;
          message += `   └ ${goal.current}/${goal.target} (${progress}%)\n\n`;
        });
      }

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('➕ إضافة هدف', 'add_goal')],
        [Markup.button.callback('⬅️ رجوع', 'menu')]
      ]);

      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch (error) {
      console.error('Error in handleGoals:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleCharity(ctx) {
    try {
      const CharityTracker = require('../features/charityTracker');
      const data = await CharityTracker.getCharityHistory(ctx.from.id);

      const message = CharityTracker.formatCharityHistory(data);
      const keyboard = UIManager.charityTypesKeyboard();

      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup });
    } catch (error) {
      console.error('Error in handleCharity:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleMemorization(ctx) {
    try {
      const MemorizationSystem = require('../features/memorizationSystem');
      const user = await User.findOne({ userId: ctx.from.id });

      if (!user || !user.memorization) {
        await ctx.reply('📖 لم تضف أي آيات للحفظ بعد');
        return;
      }

      const stats = await MemorizationSystem.getMemorizationStats(ctx.from.id);
      const message = MemorizationSystem.formatStats(stats);

      const keyboard = UIManager.memorizationActionsKeyboard();

      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup });
    } catch (error) {
      console.error('Error in handleMemorization:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleDua(ctx) {
    try {
      const DuaSystem = require('../features/duaSystem');
      const collections = DuaSystem.getDuaCollections();
      const totalDuas = Object.values(collections).reduce(
        (sum, collection) => sum + collection.duas.length,
        0
      );

      const message =
        '🤲 <b>مكتبة الأدعية</b>\n\n' +
        'اختر الفئة التي تريدها، وسيتم عرض دعاء كامل مع إمكانية جلب دعاء جديد من نفس الفئة.\n\n' +
        `📚 إجمالي الأدعية المتاحة: <b>${totalDuas}</b>`;

      const keyboard = UIManager.duaCollectionsKeyboard();

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } catch (_e) {
        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup });
      }
    } catch (error) {
      console.error('Error in handleDua:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleReferral(ctx) {
    try {
      const ReferralSystem = require('../features/referralSystem');

      // Check if user has a code
      let stats = await ReferralSystem.getReferralStats(ctx.from.id);

      if (!stats.code) {
        await ReferralSystem.generateReferralCode(ctx.from.id);
        stats = await ReferralSystem.getReferralStats(ctx.from.id);
      }

      const message = ReferralSystem.formatReferralStats(stats);

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📊 اللوحة', 'referral_leaderboard')],
        [Markup.button.callback('ℹ️ معلومات', 'referral_info')],
        [Markup.button.callback('⬅️ رجوع', 'menu')]
      ]);

      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch (error) {
      console.error('Error in handleReferral:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleRewards(ctx) {
    try {
      const RewardsSystem = require('../features/rewardsSystem');
      const message = RewardsSystem.getRewardsInfo();

      const keyboard = UIManager.rewardsButtonsKeyboard();

      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup });
    } catch (error) {
      console.error('Error in handleRewards:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleEvents(ctx) {
    try {
      const EventsSystem = require('../features/eventsSystem');
      const events = await EventsSystem.getActiveEvents();

      if (events.length === 0) {
        await ctx.reply('❌ لا توجد أحداث نشطة حالياً');
        return;
      }

      let message = '🏆 <b>الأحداث النشطة</b>\n\n';

      events.forEach((event, index) => {
        message += `${index + 1}. ${event.title}\n`;
        message += `   └ ${event.stats.totalParticipants} مشترك\n\n`;
      });

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📊 لوحة المتصدرين', 'events_leaderboard')],
        [Markup.button.callback('⬅️ رجوع', 'menu')]
      ]);

      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch (error) {
      console.error('Error in handleEvents:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleStats(ctx) {
    try {
      const AdvancedStatsSystem = require('../features/advancedStatsSystem');
      const report = await AdvancedStatsSystem.generateStatsReport(ctx.from.id);

      if (!report) {
        await ctx.reply('❌ لم يتم العثور على الإحصائيات');
        return;
      }

      const message = AdvancedStatsSystem.formatStatsReport(report);

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ رجوع', 'menu')]
      ]);

      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch (error) {
      console.error('Error in handleStats:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleLibrary(ctx) {
    try {
      const IslamicLibrary = require('../features/islamicLibrary');
      const stats = IslamicLibrary.getLibraryStats();

      let message = '📚 <b>المكتبة الإسلامية</b>\n\n';
      message += 'نظام العرض: <b>عنصر واحد كامل في كل مرة</b> (مثل نظام الأدعية).\n\n';
      message += `📦 <b>إجمالي المحتوى:</b> ${stats.totalItems}\n`;
      message += `📖 التفسير: ${stats.byCategory.tafsir || 0}\n`;
      message += `📿 الأحاديث: ${stats.byCategory.hadith || 0}\n`;
      message += `📚 الفقه: ${stats.byCategory.fiqh || 0}\n`;
      message += `📕 القصص: ${stats.byCategory.stories || 0}\n`;
      message += `👤 الصحابة: ${stats.byCategory.sahabi || 0}\n`;
      message += `🤲 الأوراد: ${stats.byCategory.awrad || 0}\n\n`;
      message += 'اختر الفئة التي تريدها:';

      const keyboard = UIManager.islamicContentKeyboard();

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } catch (_e) {
        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup });
      }
    } catch (error) {
      console.error('Error in handleLibrary:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleTeams(ctx) {
    try {
      const TeamManager = require('../features/teamManager');
      const teamData = await TeamManager.getTeamInfo(ctx.from.id);

      let message = '';
      if (teamData) {
        message = TeamManager.formatTeamInfo(teamData);
      } else {
        message = '👥 <b>نظام الفرق</b>\n\nلا تنتمي إلى أي فريق بعد.';
      }

      const keyboard = UIManager.teamsManagementKeyboard();
      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup });
    } catch (error) {
      console.error('Error in handleTeams:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleFeaturesMenu(ctx) {
    try {
      const keyboard = UIManager.advancedFeaturesKeyboard();
      await ctx.reply('✨ <b>الميزات المتقدمة</b>\n\nاختر ما تريد:', {
        parse_mode: 'HTML',
        reply_markup: keyboard.reply_markup
      });
    } catch (error) {
      console.error('Error in handleFeaturesMenu:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }
}

module.exports = CommandHandler;
