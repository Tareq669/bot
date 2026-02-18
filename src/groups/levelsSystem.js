/**
 * نظام المستويات والتفاعل للمجموعات
 * Levels and Interaction System for Groups
 */

const { GroupMember } = require('../database/models');

// إعدادات النظام
const CONFIG = {
  // XP لكل رسالة
  XP_PER_MESSAGE: 5,
  // Coins لكل رسالة
  COINS_PER_MESSAGE: 2,
  // Coins يومية أساسية
  DAILY_BASE_REWARD: 50,
  // Coins إضافية لكل يوم متتالي
  DAILY_STREAK_BONUS: 10,
  // الحد الأقصى streak
  MAX_STREAK_BONUS: 100,
  // وقت إعادة تعيين streak (بالساعات)
  STREAK_RESET_HOURS: 24
};

// الألقاب حسب المستوى
const TITLES = {
  NEW_USER: { min: 1, max: 5, title: 'مستخدم جديد' },
  ACTIVE_MEMBER: { min: 6, max: 10, title: 'عضو نشط' },
  DISTINGUISHED_MEMBER: { min: 11, max: 20, title: 'عضو مميز' },
  VIP_MEMBER: { min: 21, max: 30, title: 'عضو VIP' },
  GOLDEN_MEMBER: { min: 31, max: 50, title: 'عضو ذهبي' },
  DIAMOND_MEMBER: { min: 51, max: Infinity, title: 'عضو ماسي' }
};

/**
 * حساب المستوى بناءً على XP
 * @param {number} xp - XP التراكمي
 * @returns {number} المستوى
 */
function calculateLevel(xp) {
  if (xp < 0) return 1;
  // استخدام الجذر التربيعي لحساب المستوى
  // المستوى = sqrt(XP) + 1
  return Math.floor(Math.sqrt(xp)) + 1;
}

/**
 * حساب XP المطلوب للمستوى التالي
 * @param {number} level - المستوى الحالي
 * @returns {number} XP المطلوب
 */
function xpForNextLevel(level) {
  return Math.pow(level, 2);
}

/**
 * الحصول على اللقب بناءً على المستوى
 * @param {number} level - المستوى
 * @returns {string} اللقب
 */
function getTitleByLevel(level) {
  for (const key in TITLES) {
    const range = TITLES[key];
    if (level >= range.min && level <= range.max) {
      return range.title;
    }
  }
  return TITLES.NEW_USER.title;
}

/**
 * الحصول على عضو المجموعة أو إنشاء جديد
 * @param {string} groupId - معرف المجموعة
 * @param {number} userId - معرف المستخدم
 * @returns {Promise<Object>} عضو المجموعة
 */
async function getOrCreateMember(groupId, userId) {
  let member = await GroupMember.findOne({ groupId, userId });

  if (!member) {
    member = new GroupMember({
      groupId,
      userId,
      xp: 0,
      level: 1,
      coins: 0,
      title: getTitleByLevel(1),
      messagesCount: 0,
      dailyStreak: 0,
      lastDaily: null
    });
    await member.save();
  }

  return member;
}

/**
 * إضافة XP والـ Coins للعضو
 * @param {string} groupId - معرف المجموعة
 * @param {number} userId - معرف المستخدم
 * @returns {Promise<Object>} بيانات العضو المحدثة
 */
async function addXpAndCoins(groupId, userId) {
  const member = await getOrCreateMember(groupId, userId);

  // إضافة XP
  member.xp += CONFIG.XP_PER_MESSAGE;
  member.totalXpEarned += CONFIG.XP_PER_MESSAGE;

  // إضافة Coins
  member.coins += CONFIG.COINS_PER_MESSAGE;
  member.totalCoinsEarned += CONFIG.COINS_PER_MESSAGE;

  // زيادة عدد الرسائل
  member.messagesCount += 1;
  member.lastActivity = new Date();

  // حساب المستوى الجديد
  const newLevel = calculateLevel(member.xp);

  // إذا تغير المستوى
  if (newLevel > member.level) {
    member.level = newLevel;
    member.title = getTitleByLevel(newLevel);
  }

  await member.save();

  return {
    member,
    levelUp: newLevel > member.level - (member.level - newLevel),
    oldLevel: member.level - (newLevel > member.level ? 1 : 0),
    newLevel
  };
}

/**
 * معالجة المكافأة اليومية
 * @param {string} groupId - معرف المجموعة
 * @param {number} userId - معرف المستخدم
 * @returns {Promise<Object>} نتيجة المكافأة
 */
async function claimDailyReward(groupId, userId) {
  const member = await getOrCreateMember(groupId, userId);
  const now = new Date();

  // التحقق من最后一次 المطالبة
  if (member.lastDaily) {
    const lastClaim = new Date(member.lastDaily);
    const hoursSinceLastClaim = (now - lastClaim) / (1000 * 60 * 60);

    // إذا مر أقل من 24 ساعة
    if (hoursSinceLastClaim < CONFIG.STREAK_RESET_HOURS) {
      const nextClaimTime = new Date(lastClaim.getTime() + (CONFIG.STREAK_RESET_HOURS * 60 * 60 * 1000));
      const remainingHours = Math.ceil((nextClaimTime - now) / (1000 * 60 * 60));

      return {
        success: false,
        message: `⏰ يمكنك المطالبة بالمكافأة التالية بعد ${remainingHours} ساعة`,
        canClaim: false
      };
    }

    // إذا مر أكثر من 24 ساعة، إعادة تعيين streak
    if (hoursSinceLastClaim >= CONFIG.STREAK_RESET_HOURS && hoursSinceLastClaim < 48) {
      member.dailyStreak += 1;
    } else {
      // streak انقطع
      member.dailyStreak = 1;
    }
  } else {
    // أول مرة
    member.dailyStreak = 1;
  }

  // حساب المكافأة
  const streakBonus = Math.min(
    member.dailyStreak * CONFIG.DAILY_STREAK_BONUS,
    CONFIG.MAX_STREAK_BONUS
  );
  const totalReward = CONFIG.DAILY_BASE_REWARD + streakBonus;

  // إضافةCoins
  member.coins += totalReward;
  member.totalCoinsEarned += totalReward;
  member.lastDaily = now;

  await member.save();

  return {
    success: true,
    message: `🎉 تم منحك ${totalReward}Coins!\n📅 streak: ${member.dailyStreak} يوم متتالي\n🎁 المكافأة الأساسية: ${CONFIG.DAILY_BASE_REWARD}Coins\n➕ مكافأة streak: ${streakBonus}Coins`,
    canClaim: true,
    reward: totalReward,
    streak: member.dailyStreak,
    streakBonus
  };
}

/**
 * الحصول على قائمة أفضل 10 أعضاء
 * @param {string} groupId - معرف المجموعة
 * @returns {Promise<Array>} قائمة أفضل الأعضاء
 */
async function getTopMembers(groupId, limit = 10) {
  const members = await GroupMember.find({ groupId })
    .sort({ xp: -1 })
    .limit(limit)
    .lean();

  return members.map((member, index) => ({
    rank: index + 1,
    userId: member.userId,
    xp: member.xp,
    level: member.level,
    coins: member.coins,
    title: member.title || getTitleByLevel(member.level),
    messagesCount: member.messagesCount
  }));
}

/**
 * الحصول على ترتيب المستخدم
 * @param {string} groupId - معرف المجموعة
 * @param {number} userId - معرف المستخدم
 * @returns {Promise<Object>} الترتيب
 */
async function getUserRank(groupId, userId) {
  const member = await getOrCreateMember(groupId, userId);

  // الحصول على ترتيب المستخدم
  const rank = await GroupMember.countDocuments({
    groupId,
    xp: { $gt: member.xp }
  }) + 1;

  // إجمالي عدد الأعضاء
  const totalMembers = await GroupMember.countDocuments({ groupId });

  // XP للمستوى التالي
  const nextLevelXp = xpForNextLevel(member.level);
  const currentLevelXp = xpForNextLevel(member.level - 1);
  const xpInCurrentLevel = member.xp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const progress = Math.round((xpInCurrentLevel / xpNeeded) * 100);

  return {
    rank,
    totalMembers,
    xp: member.xp,
    level: member.level,
    coins: member.coins,
    title: member.title || getTitleByLevel(member.level),
    messagesCount: member.messagesCount,
    xpInCurrentLevel,
    xpNeeded,
    progress,
    nextLevelXp,
    streak: member.dailyStreak,
    lastDaily: member.lastDaily
  };
}

/**
 * تحديث اللقب المخصص
 * @param {string} groupId - معرف المجموعة
 * @param {number} userId - معرف المستخدم
 * @param {string} newTitle - اللقب الجديد
 * @returns {Promise<Object}> النتيجة
 */
async function setCustomTitle(groupId, userId, newTitle) {
  const member = await getOrCreateMember(groupId, userId);

  member.customTitle = newTitle;
  member.title = newTitle || getTitleByLevel(member.level);

  await member.save();

  return {
    success: true,
    message: `✅ تم تحديث اللقب إلى: ${member.title}`,
    title: member.title
  };
}

/**
 * معالجة رسالة في المجموعة
 * @param {Object} ctx - سياق Telegram
 * @returns {Promise<void>}
 */
async function processGroupMessage(ctx) {
  // التأكد من أن الرسالة في مجموعة
  if (!ctx.chat || ctx.chat.type === 'private') {
    return;
  }

  const groupId = ctx.chat.id.toString();
  const userId = ctx.from.id;

  // تجاهل رسائل البوت
  if (ctx.from.is_bot) {
    return;
  }

  try {
    const result = await addXpAndCoins(groupId, userId);

    // إرسال رسالة ترقيته_level إذا وصل لمستوى جديد
    if (result.levelUp && result.newLevel > 1) {
      const titles = {
        6: '🎉 تهانينا! لقد أصبحت عضواً نشطاً!',
        11: '⭐ تهانينا! لقد أصبحت عضواً مميزاً!',
        21: '👑 تهانينا! لقد أصبحت عضو VIP!',
        31: '🌟 تهانينا!你已经成为了成员 ذهبي!',
        51: '💎 تهانينا!你已经成为了成员 ماسي!'
      };

      if (titles[result.newLevel]) {
        try {
          await ctx.reply(`🎊 ${ctx.from.first_name} ${titles[result.newLevel]}\n📊 المستوى الجديد: ${result.newLevel}`);
        } catch (e) {
          // تجاهل أخطاء الإرسال
        }
      }
    }
  } catch (error) {
    console.error('خطأ في معالجة رسالة المجموعة:', error);
  }
}

/**
 * إنشاء لوحة الملف الشخصي
 * @param {Object} ctx - سياق Telegram
 * @returns {Promise<void>}
 */
async function showProfile(ctx) {
  // التأكد من أن الأمر في مجموعة
  if (!ctx.chat || ctx.chat.type === 'private') {
    await ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
    return;
  }

  const groupId = ctx.chat.id.toString();
  const userId = ctx.from.id;

  try {
    const member = await getOrCreateMember(groupId, userId);
    const rank = await getUserRank(groupId, userId);

    // XP للمستوى الحالي والتالي
    const currentLevelXp = xpForNextLevel(member.level - 1);
    const nextLevelXp = xpForNextLevel(member.level);
    const xpProgress = member.xp - currentLevelXp;
    const xpNeeded = nextLevelXp - currentLevelXp;
    const progressPercent = Math.round((xpProgress / xpNeeded) * 100);

    let profileText = '👤 *ملفك الشخصي*\n';
    profileText += '━━━━━━━━━━━━━━━━━━\n';
    profileText += `📛 الاسم: ${ctx.from.first_name}${ctx.from.last_name ? ` ${  ctx.from.last_name}` : ''}\n`;
    profileText += `🏷️ اللقب: ${member.title || getTitleByLevel(member.level)}\n`;
    profileText += '━━━━━━━━━━━━━━━━━━\n';
    profileText += '📊 *الإحصائيات:*\n';
    profileText += `⭐ المستوى: ${member.level}\n`;
    profileText += `✨ XP: ${member.xp} / ${nextLevelXp}\n`;
    profileText += `🔄 التقدم: ${progressPercent}%\n`;
    profileText += `💰 Coins: ${member.coins}\n`;
    profileText += `📝 الرسائل: ${member.messagesCount}\n`;
    profileText += `🏆 الترتيب: #${rank.rank} من ${rank.totalMembers}\n`;
    profileText += `🔥 Streak: ${member.dailyStreak} يوم\n`;

    if (member.customTitle) {
      profileText += `✨ اللقب المخصص: ${member.customTitle}\n`;
    }

    profileText += '━━━━━━━━━━━━━━━━━━\n';
    profileText += `📅 آخر نشاط: ${member.lastActivity ? new Date(member.lastActivity).toLocaleDateString('ar-EG') : 'جديد'}`;

    await ctx.reply(profileText, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('خطأ في عرض الملف الشخصي:', error);
    await ctx.reply('❌ حدث خطأ في عرض الملف الشخصي.');
  }
}

/**
 * عرض المستوى الحالي
 * @param {Object} ctx - سياق Telegram
 * @returns {Promise<void>}
 */
async function showLevel(ctx) {
  if (!ctx.chat || ctx.chat.type === 'private') {
    await ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
    return;
  }

  const groupId = ctx.chat.id.toString();
  const userId = ctx.from.id;

  try {
    const member = await getOrCreateMember(groupId, userId);
    const currentLevelXp = xpForNextLevel(member.level - 1);
    const nextLevelXp = xpForNextLevel(member.level);
    const xpProgress = member.xp - currentLevelXp;
    const xpNeeded = nextLevelXp - currentLevelXp;
    const progressPercent = Math.round((xpProgress / xpNeeded) * 100);

    // إنشاء شريط التقدم
    const barLength = 20;
    const filledLength = Math.round((progressPercent / 100) * barLength);
    const progressBar = '▓'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    let levelText = '📊 *معلومات المستوى*\n';
    levelText += '━━━━━━━━━━━━━━━━━━\n';
    levelText += `⭐ المستوى الحالي: ${member.level}\n`;
    levelText += `🏷️ اللقب: ${member.title || getTitleByLevel(member.level)}\n`;
    levelText += '━━━━━━━━━━━━━━━━━━\n';
    levelText += `✨ XP: ${member.xp}\n`;
    levelText += '📈 التقدم للمستوى التالي:\n';
    levelText += `[${progressBar}] ${progressPercent}%\n`;
    levelText += `🔹 ${xpProgress} / ${xpNeeded} XP\n`;
    levelText += '━━━━━━━━━━━━━━━━━━\n';
    levelText += `📝 الرسائل: ${member.messagesCount}`;

    await ctx.reply(levelText, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('خطأ في عرض المستوى:', error);
    await ctx.reply('❌ حدث خطأ في عرض المستوى.');
  }
}

/**
 * عرض XP الحالي
 * @param {Object} ctx - سياق Telegram
 * @returns {Promise<void>}
 */
async function showXp(ctx) {
  if (!ctx.chat || ctx.chat.type === 'private') {
    await ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
    return;
  }

  const groupId = ctx.chat.id.toString();
  const userId = ctx.from.id;

  try {
    const member = await getOrCreateMember(groupId, userId);
    const rank = await getUserRank(groupId, userId);

    let xpText = '✨ *معلومات XP*\n';
    xpText += '━━━━━━━━━━━━━━━━━━\n';
    xpText += `💎 XP الحالي: ${member.xp}\n`;
    xpText += `📈 إجمالي XP المكتسب: ${member.totalXpEarned}\n`;
    xpText += `🏆 ترتيبك: #${rank.rank}\n`;
    xpText += '━━━━━━━━━━━━━━━━━━\n';
    xpText += `📊 المستوى: ${member.level}\n`;
    xpText += `✨ XP للمستوى التالي: ${rank.nextLevelXp - member.xp}`;

    await ctx.reply(xpText, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('خطأ في عرض XP:', error);
    await ctx.reply('❌ حدث خطأ في عرض XP.');
  }
}

/**
 * المطالبة بالمكافأة اليومية
 * @param {Object} ctx - سياق Telegram
 * @returns {Promise<void>}
 */
async function handleDaily(ctx) {
  if (!ctx.chat || ctx.chat.type === 'private') {
    await ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
    return;
  }

  const groupId = ctx.chat.id.toString();
  const userId = ctx.from.id;

  try {
    const result = await claimDailyReward(groupId, userId);
    await ctx.reply(result.message);
  } catch (error) {
    console.error('خطأ في المكافأة اليومية:', error);
    await ctx.reply('❌ حدث خطأ في المطالبة بالمكافأة.');
  }
}

/**
 * عرض أفضل 10 أعضاء
 * @param {Object} ctx - سياق Telegram
 * @returns {Promise<void>}
 */
async function showTop(ctx) {
  if (!ctx.chat || ctx.chat.type === 'private') {
    await ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
    return;
  }

  const groupId = ctx.chat.id.toString();

  try {
    const topMembers = await getTopMembers(groupId, 10);

    if (topMembers.length === 0) {
      await ctx.reply('📊 لا يوجد أعضاء في قائمة المتصدرين بعد!');
      return;
    }

    let topText = '🏆 *قائمة أفضل 10 أعضاء*\n';
    topText += '━━━━━━━━━━━━━━━━━━\n';

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    for (const member of topMembers) {
      topText += `${medals[member.rank - 1]} #${member.rank} - ${member.title || getTitleByLevel(member.level)}\n`;
      topText += `   ⭐ المستوى: ${member.level} | ✨ XP: ${member.xp}\n`;
      topText += `   💰 Coins: ${member.coins} | 📝 رسائل: ${member.messagesCount}\n`;
      topText += '━━━━━━━━━━━━━━━━━━\n';
    }

    await ctx.reply(topText, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('خطأ في عرض القائمة:', error);
    await ctx.reply('❌ حدث خطأ في عرض القائمة.');
  }
}

/**
 * عرض الترتيب
 * @param {Object} ctx - سياق Telegram
 * @returns {Promise<void>}
 */
async function showRank(ctx) {
  if (!ctx.chat || ctx.chat.type === 'private') {
    await ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
    return;
  }

  const groupId = ctx.chat.id.toString();
  const userId = ctx.from.id;

  try {
    const rank = await getUserRank(groupId, userId);

    // شريط التقدم
    const barLength = 15;
    const filledLength = Math.round((rank.progress / 100) * barLength);
    const progressBar = '▓'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    let rankText = '🏆 *ترتيبك في المجموعة*\n';
    rankText += '━━━━━━━━━━━━━━━━━━\n';
    rankText += `📊 الترتيب: #${rank.rank} من ${rank.totalMembers}\n`;
    rankText += '━━━━━━━━━━━━━━━━━━\n';
    rankText += `⭐ المستوى: ${rank.level}\n`;
    rankText += `✨ XP: ${rank.xp}\n`;
    rankText += `📈 التقدم: [${progressBar}] ${rank.progress}%\n`;
    rankText += `   ${rank.xpInCurrentLevel} / ${rank.xpNeeded} XP\n`;
    rankText += '━━━━━━━━━━━━━━━━━━\n';
    rankText += `💰 Coins: ${rank.coins}\n`;
    rankText += `📝 الرسائل: ${rank.messagesCount}\n`;
    rankText += `🔥 Streak: ${rank.streak} يوم`;

    await ctx.reply(rankText, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('خطأ في عرض الترتيب:', error);
    await ctx.reply('❌ حدث خطأ في عرض الترتيب.');
  }
}

/**
 * التحقق من صلاحيات الأدمن لتعيين اللقب
 * @param {Object} ctx - سياق Telegram
 * @returns {Promise<boolean>}
 */
async function checkAdminPermission(ctx) {
  if (!ctx.chat || ctx.chat.type === 'private') {
    return false;
  }

  try {
    const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
    return ['creator', 'administrator'].includes(chatMember.status);
  } catch (error) {
    return false;
  }
}

/**
 * تعيين لقب مستخدم (لأدمن فقط)
 * @param {Object} ctx - سياق Telegram
 * @param {string} title - اللقب الجديد
 * @returns {Promise<void>}
 */
async function setUserTitle(ctx, title) {
  if (!ctx.chat || ctx.chat.type === 'private') {
    await ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
    return;
  }

  // التحقق من صلاحيات الأدمن
  const isAdmin = await checkAdminPermission(ctx);
  if (!isAdmin) {
    await ctx.reply('❌ هذا الأمر متاح فقط للمشرفين!');
    return;
  }

  // الحصول على المستخدم المذكور
  if (!ctx.message.reply_to_message) {
    await ctx.reply('⚠️ يرجى الرد على رسالة المستخدم لتعيين لقبه!');
    return;
  }

  const targetUserId = ctx.message.reply_to_message.from.id;
  const groupId = ctx.chat.id.toString();

  try {
    const result = await setCustomTitle(groupId, targetUserId, title);
    await ctx.reply(result.message);
  } catch (error) {
    console.error('خطأ في تعيين اللقب:', error);
    await ctx.reply('❌ حدث خطأ في تعيين اللقب.');
  }
}

module.exports = {
  // الإعدادات
  CONFIG,
  TITLES,

  // الوظائف الرئيسية
  calculateLevel,
  xpForNextLevel,
  getTitleByLevel,
  getOrCreateMember,
  addXpAndCoins,
  claimDailyReward,
  getTopMembers,
  getUserRank,
  setCustomTitle,

  // معالجات الأوامر
  processGroupMessage,
  showProfile,
  showLevel,
  showXp,
  handleDaily,
  showTop,
  showRank,
  setUserTitle,
  checkAdminPermission
};
