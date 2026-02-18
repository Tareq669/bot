/**
 * ألعاب المجموعات الجماعية
 * Group Games System
 *
 * الميزات:
 * - تخمين الرقم
 * - أسرع إجابة
 * - أسئلة دينية
 * - تحديات عشوائية
 * - مسابقات جماعية
 * - نظام مكافآت Coins
 */

const { GroupMember } = require('../database/models');

// إعدادات الألعاب
const GAME_CONFIG = {
  // وقت الإجابة بالثواني
  ANSWER_TIMEOUT: 30,
  // نطاق الأرقام للعبة التخمين
  GUESS_MIN: 1,
  GUESS_MAX: 100,
  // المكافآت
  GUESS_REWARD: 50,
  QUIZ_REWARD: 30,
  RELIGIOUS_REWARD: 40,
  CHALLENGE_REWARD: 25,
  // XP إضافي للمكافآت
  RELIGIOUS_XP_BONUS: 15
};

// تخزين الألعاب النشطة
const activeGames = new Map();

// ============================================
// أسئلة الألعاب
// ============================================

// أسئلة عامة
const GENERAL_QUESTIONS = [
  { question: 'ما هي عاصمة مصر؟', answer: ['القاهرة'] },
  { question: 'ما هو أكبر محيط في العالم؟', answer: ['المحيط الهادئ', 'المحيط الهادي'] },
  { question: 'كم عدد ألوان قوس قزح؟', answer: ['7', 'سبعة'] },
  { question: 'من مكتشف أمريكا؟', answer: ['كريستوفر كولومبوس', 'كولومبوس'] },
  { question: 'ما هو أطول نهر في العالم؟', answer: ['النيل'] },
  { question: 'كم عدد قارات العالم؟', answer: ['7', 'سبعة'] },
  { question: 'ما هي أصغر قارة؟', answer: ['أستراليا'] },
  { question: 'من написа رواية دون كيشوت؟', answer: ['ميغيل دي ثيربانتس', 'ثيربانتس'] },
  { question: 'ما هو العنصر الكيميائي الذي رمزه O؟', answer: ['الأكسجين'] },
  { question: 'كم يوم في السنة الكبيسة؟', answer: ['366', 'ستمائة وستون'] },
  { question: 'ما هو أضخم حيوان على الأرض؟', answer: ['الحوت الأزرق'] },
  { question: 'من هو مؤسس شركة آبل؟', answer: ['ستيف جوبز', 'جوبز'] },
  { question: 'ما هي العملة الرسمية لليابان؟', answer: ['الين', 'اليان'] },
  { question: 'كم عدد أسنان الإنسان البالغ؟', answer: ['32', 'ثنان وثلاثون'] },
  { question: 'ما هو أقدم أثر في العالم؟', answer: ['أهرامات الجيزة', 'الأهرامات'] },
  { question: 'من رسم موناليزا؟', answer: ['ليوناردو دا فينشي', 'دا فينشي'] },
  { question: 'ما هي اللغة الأكثر تحدثاً في العالم؟', answer: ['الإنجليزية', 'الانجليزية'] },
  { question: 'كم عدد عظام جسم الإنسان؟', answer: ['206', 'مائتان وستة'] },
  { question: 'ما هو أبعد كوكب عن الشمس؟', answer: ['نبتون'] },
  { question: 'من هو مخترع الطباعة؟', answer: ['غوتنبرغ'] }
];

// أسئلة رياضيات
const MATH_QUESTIONS = [
  { question: 'كم يساوي 7 × 8؟', answer: ['56', 'ستة وخمسون'] },
  { question: 'ما هو الجذر التربيعي لـ 144؟', answer: ['12', 'اثنا عشر'] },
  { question: 'كم يساوي 15 + 27؟', answer: ['42', 'اثنان وأربعون'] },
  { question: 'ما هو 10 تربيع؟', answer: ['100', 'مائة'] },
  { question: 'كم يساوي 100 ÷ 4؟', answer: ['25', 'خمسة وعشرون'] },
  { question: 'ما هو 20% من 50؟', answer: ['10', 'عشرة'] },
  { question: 'كم يساوي 3 تربيع؟', answer: ['9', 'تسعة'] },
  { question: 'ما هو 50% من 80؟', answer: ['40', 'أربعون'] },
  { question: 'كم يساوي 144 ÷ 12؟', answer: ['12', 'اثنا عشر'] },
  { question: 'ما هو 5! (عاملي)؟', answer: ['120', 'مائة وعشرون'] }
];

// أسئلة دينية
const RELIGIOUS_QUESTIONS = [
  { question: 'ما هي آخر سورة نزلت في القرآن؟', answer: ['الناس'] },
  { question: 'كم عدد آيات سورة الفاتحة؟', answer: ['7', 'سبع'] },
  { question: 'من أول شخص أدخل النار؟', answer: ['بلال بن رباح', 'بلال'] },
  { question: 'ما هي أول سورة نزلت كاملة؟', answer: ['الفاتحة'] },
  { question: 'كم عدد أحرف القرآن؟', answer: ['323670'] },
  { question: 'ما اسم النبي الذي ابتلعه الحوت؟', answer: ['يونس', 'نبي يونس'] },
  { question: 'كم مرة ذُكرت الصلاة في القرآن؟', answer: ['5', 'خمسة'] },
  { question: 'ما هي أطول آية في القرآن؟', answer: ['آية الدين', 'البقرة 282'] },
  { question: 'من النبي الذي كلمه الله مباشرة؟', answer: ['موسى', 'موسى عليه السلام'] },
  { question: 'كم عدد الأنبياء المذكورين في القرآن؟', answer: ['25', 'خمسة وعشرون'] },
  { question: 'ما هي ثاني سورة في القرآن؟', answer: ['البقرة'] },
  { question: 'من الصحابي الذي كان يُدعى أسد الله؟', answer: ['حمزة بن عبد المطلب', 'حمزة'] },
  { question: 'ما اسم أم المؤمنين التي تزوجها النبي بعد وفاة خديجة؟', answer: ['عائشة'] },
  { question: 'في أي عام هاجر النبي صلى الله عليه وسلم؟', answer: ['622', 'عام الهجرة'] },
  { question: 'كم عدد الأشهر الحرم في الإسلام؟', answer: ['4', 'أربعة'] },
  { question: 'ما هي أول معركة خاضها النبي؟', answer: ['بدر'] },
  { question: 'من الصحابي الذي كان يُقرأ عليه القرآن في الصلاة؟', answer: ['عبد الله بن مسعود', 'ابن مسعود'] },
  { question: 'ما اسم الحجة التي ألقاها النبي في حجة الوداع؟', answer: ['حجة الوداع'] },
  { question: 'كم عدد كلمات التشهد الأخير؟', answer: ['11', 'أحد عشر'] },
  { question: 'من الصحابي الذي لقبأمين الإسلام؟', answer: ['أبو بكر الصديق', 'أبو بكر'] }
];

// تحديات عشوائية
const RANDOM_CHALLENGES = [
  { challenge: 'من يستطيع كتابة رقم هاتفه خلال 30 ثانية؟', type: 'number' },
  { challenge: 'من يقول مثل شعبي عربي؟', type: 'saying' },
  { challenge: 'من يذكر اسم 3 دول عربية في رسالة واحدة؟', type: 'list' },
  { challenge: 'من يذكر لون предмет حوله الآن؟', type: 'creative' },
  { challenge: 'من يقول اسم طائر باللغة الإنجليزية؟', type: 'word' },
  { challenge: 'من يذكر اسم طبق عربي شعبي؟', type: 'food' },
  { challenge: 'من يقول جملة تحفيزية في 10 ثوانٍ؟', type: 'creative' },
  { challenge: 'من يذكر اسم شخصية كرتونية مشهورة؟', type: 'name' },
  { challenge: 'من يذكر اسم دولة تبدأ بحرف الألف؟', type: 'word' },
  { challenge: 'من يقول أذكروا الله في الرسالة؟', type: 'religious' },
  { challenge: 'من يذكر اسم مشروب شعبي عربي؟', type: 'drink' },
  { challenge: 'من يقول اسم فاكهة تبدأ بحرف الميم؟', type: 'word' },
  { challenge: 'من يذكر اسم بلد يسكن فيه؟', type: 'place' },
  { challenge: 'من يقول كلمة شكر بالإنجليزية؟', type: 'word' },
  { challenge: 'من يذكر اسم مبرمج مشهور؟', type: 'name' }
];

// ============================================
// دوال مساعدة
// ============================================

/**
 * التحقق من أن الأمر في مجموعة
 */
function isGroupChat(ctx) {
  return ctx.chat && ctx.chat.type !== 'private';
}

/**
 * الحصول على عضو المجموعة
 */
async function getMember(groupId, userId) {
  return await GroupMember.findOne({ groupId: String(groupId), userId });
}

/**
 * إضافة Coins للعضو
 */
async function addCoins(groupId, userId, amount) {
  const member = await getMember(groupId, userId);
  if (member) {
    member.coins += amount;
    member.totalCoinsEarned = (member.totalCoinsEarned || 0) + amount;
    await member.save();
  }
}

/**
 * إضافة XP للعضو
 */
async function addXP(groupId, userId, amount) {
  const member = await getMember(groupId, userId);
  if (member) {
    member.xp += amount;
    member.totalXpEarned = (member.totalXpEarned || 0) + amount;

    // حساب المستوى الجديد
    const newLevel = Math.floor(Math.sqrt(member.xp)) + 1;
    member.level = newLevel;
    await member.save();
  }
}

/**
 * اختيار سؤال عشوائي
 */
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * التحقق من صحة الإجابة
 */
function checkAnswer(userAnswer, correctAnswers) {
  const normalizedAnswer = userAnswer.toLowerCase().trim();
  return correctAnswers.some(answer =>
    answer.toLowerCase().trim() === normalizedAnswer
  );
}

// ============================================
// ألعاب التخمين
// ============================================

/**
 * بدء لعبة تخمين الرقم
 */
async function startGuessGame(ctx) {
  if (!isGroupChat(ctx)) {
    await ctx.reply('هذه اللعبة متاحة فقط في المجموعات!');
    return;
  }

  const groupId = String(ctx.chat.id);
  const messageId = ctx.message.message_id;

  // التحقق من وجود لعبة نشطة
  if (activeGames.has(groupId)) {
    await ctx.reply('هناك لعبة نشطة بالفعل! انتظر حتى تنتهي.');
    return;
  }

  // إنشاء اللعبة
  const targetNumber = Math.floor(Math.random() * (GAME_CONFIG.GUESS_MAX - GAME_CONFIG.GUESS_MIN + 1)) + GAME_CONFIG.GUESS_MIN;
  const gameData = {
    type: 'guess',
    targetNumber: targetNumber,
    participants: new Map(),
    startTime: Date.now(),
    messageId: messageId,
    winner: null,
    rewards: GAME_CONFIG.GUESS_REWARD
  };

  activeGames.set(groupId, gameData);

  // إرسال رسالة اللعبة
  const gameMessage = await ctx.reply(
    'لعبة تخمين الرقم!\n\n' +
    `اخترت الرقم بين ${  GAME_CONFIG.GUESS_MIN  } و ${  GAME_CONFIG.GUESS_MAX  }\n` +
    `المكافأة: ${  GAME_CONFIG.GUESS_REWARD  } Coins\n` +
    `الوقت: ${  GAME_CONFIG.ANSWER_TIMEOUT  } ثانية\n\n` +
    'حاول تخمين الرقم! ارسل الرقم الآن!'
  );

  // مؤقت انتهاء اللعبة
  setTimeout(async () => {
    const game = activeGames.get(groupId);
    if (game && !game.winner) {
      activeGames.delete(groupId);
      try {
        await ctx.reply(
          'انتهى الوقت!\n\n' +
          'لم يخمن أحد الرقم الصحيح!\n' +
          `الرقم كان: ${  targetNumber}`
        );
      } catch (e) {
        // تجاهل الأخطاء
      }
    }
  }, GAME_CONFIG.ANSWER_TIMEOUT * 1000);
}

/**
 * معالجة تخمين المستخدم
 */
async function handleGuess(ctx) {
  if (!isGroupChat(ctx)) return;

  const groupId = String(ctx.chat.id);
  const userId = ctx.from.id;
  const guess = parseInt(ctx.message.text);

  const game = activeGames.get(groupId);
  if (!game || game.type !== 'guess') return;
  if (game.winner) return;

  // التحقق من صحة التخمين
  if (isNaN(guess) || guess < GAME_CONFIG.GUESS_MIN || guess > GAME_CONFIG.GUESS_MAX) {
    return;
  }

  // التحقق من المحاولات
  if (!game.participants.has(userId)) {
    game.participants.set(userId, 0);
  }

  const attempts = game.participants.get(userId) + 1;
  game.participants.set(userId, attempts);

  // التحقق من الفوز
  if (guess === game.targetNumber) {
    game.winner = userId;
    activeGames.delete(groupId);

    // إضافة المكافأة
    await addCoins(groupId, userId, game.rewards);

    const user = ctx.from;
    await ctx.reply(
      'تهانينا!\n\n' +
      `الفائز: @${  user.username || user.first_name  }\n` +
      `الرقم الصحيح: ${  game.targetNumber  }\n` +
      `عدد المحاولات: ${  attempts  }\n` +
      `المكافأة: ${  game.rewards  } Coins`
    );
  } else {
    // تلميح
    const hint = guess < game.targetNumber ? 'اكبر' : 'اصغر';
    await ctx.reply(`${hint  }! حاول مرة أخرى!`, { reply_to_message_id: ctx.message.message_id });
  }
}

// ============================================
// لعبة أسرع إجابة
// ============================================

/**
 * بدء سؤال سريع
 */
async function startQuizGame(ctx) {
  if (!isGroupChat(ctx)) {
    await ctx.reply('هذه اللعبة متاحة فقط في المجموعات!');
    return;
  }

  const groupId = String(ctx.chat.id);

  // التحقق من وجود لعبة نشطة
  if (activeGames.has(groupId)) {
    await ctx.reply('هناك لعبة نشطة بالفعل! انتظر حتى تنتهي.');
    return;
  }

  // اختيار سؤال عشوائي
  const allQuestions = [...GENERAL_QUESTIONS, ...MATH_QUESTIONS];
  const questionData = getRandomItem(allQuestions);

  const gameData = {
    type: 'quiz',
    question: questionData.question,
    answer: questionData.answer,
    startTime: Date.now(),
    winner: null,
    rewards: GAME_CONFIG.QUIZ_REWARD
  };

  activeGames.set(groupId, gameData);

  // إرسال السؤال
  await ctx.reply(
    `سؤال سريع!\n\n${
      questionData.question  }\n\n` +
    `المكافأة: ${  GAME_CONFIG.QUIZ_REWARD  } Coins\n` +
    `الوقت: ${  GAME_CONFIG.ANSWER_TIMEOUT  } ثانية`
  );

  // مؤقت انتهاء اللعبة
  setTimeout(async () => {
    const game = activeGames.get(groupId);
    if (game && !game.winner) {
      activeGames.delete(groupId);
      try {
        await ctx.reply(
          'انتهى الوقت!\n\n' +
          'لم يجب أحد!\n' +
          `الاجابة الصحيحة: ${  game.answer.join(' أو ')}`
        );
      } catch (e) {
        // تجاهل الأخطاء
      }
    }
  }, GAME_CONFIG.ANSWER_TIMEOUT * 1000);
}

/**
 * معالجة إجابة المستخدم
 */
async function handleQuizAnswer(ctx) {
  if (!isGroupChat(ctx)) return;

  const groupId = String(ctx.chat.id);
  const userId = ctx.from.id;
  const userAnswer = ctx.message.text;

  const game = activeGames.get(groupId);
  if (!game || game.type !== 'quiz') return;
  if (game.winner) return;

  // التحقق من الإجابة
  if (checkAnswer(userAnswer, game.answer)) {
    game.winner = userId;
    activeGames.delete(groupId);

    // إضافة المكافأة
    await addCoins(groupId, userId, game.rewards);

    const user = ctx.from;
    await ctx.reply(
      'اجابة صحيحة!\n\n' +
      `الفائز: @${  user.username || user.first_name  }\n` +
      `الاجابة: ${  userAnswer  }\n` +
      `المكافأة: ${  game.rewards  } Coins`
    );
  }
}

// ============================================
// الأسئلة الدينية
// ============================================

/**
 * بدء سؤال ديني
 */
async function startReligiousGame(ctx) {
  if (!isGroupChat(ctx)) {
    await ctx.reply('هذه اللعبة متاحة فقط في المجموعات!');
    return;
  }

  const groupId = String(ctx.chat.id);

  // التحقق من وجود لعبة نشطة
  if (activeGames.has(groupId)) {
    await ctx.reply('هناك لعبة نشطة بالفعل! انتظر حتى تنتهي.');
    return;
  }

  // اختيار سؤال ديني عشوائي
  const questionData = getRandomItem(RELIGIOUS_QUESTIONS);

  const gameData = {
    type: 'religious',
    question: questionData.question,
    answer: questionData.answer,
    startTime: Date.now(),
    winner: null,
    rewards: GAME_CONFIG.RELIGIOUS_REWARD,
    xpBonus: GAME_CONFIG.RELIGIOUS_XP_BONUS
  };

  activeGames.set(groupId, gameData);

  // إرسال السؤال
  await ctx.reply(
    `سؤال ديني!\n\n${
      questionData.question  }\n\n` +
    `المكافأة: ${  GAME_CONFIG.RELIGIOUS_REWARD  } Coins + ${  GAME_CONFIG.RELIGIOUS_XP_BONUS  } XP\n` +
    `الوقت: ${  GAME_CONFIG.ANSWER_TIMEOUT  } ثانية`
  );

  // مؤقت انتهاء اللعبة
  setTimeout(async () => {
    const game = activeGames.get(groupId);
    if (game && !game.winner) {
      activeGames.delete(groupId);
      try {
        await ctx.reply(
          'انتهى الوقت!\n\n' +
          'لم يجب أحد!\n' +
          `الاجابة الصحيحة: ${  game.answer.join(' أو ')}`
        );
      } catch (e) {
        // تجاهل الأخطاء
      }
    }
  }, GAME_CONFIG.ANSWER_TIMEOUT * 1000);
}

/**
 * معالجة إجابة المستخدم الدينية
 */
async function handleReligiousAnswer(ctx) {
  if (!isGroupChat(ctx)) return;

  const groupId = String(ctx.chat.id);
  const userId = ctx.from.id;
  const userAnswer = ctx.message.text;

  const game = activeGames.get(groupId);
  if (!game || game.type !== 'religious') return;
  if (game.winner) return;

  // التحقق من الإجابة
  if (checkAnswer(userAnswer, game.answer)) {
    game.winner = userId;
    activeGames.delete(groupId);

    // إضافة المكافأة
    await addCoins(groupId, userId, game.rewards);
    await addXP(groupId, userId, game.xpBonus);

    const user = ctx.from;
    await ctx.reply(
      'اجابة صحيحة!\n\n' +
      `الفائز: @${  user.username || user.first_name  }\n` +
      `الاجابة: ${  userAnswer  }\n` +
      `المكافأة: ${  game.rewards  } Coins\n` +
      `XP اضافي: ${  game.xpBonus  } XP`
    );
  }
}

// ============================================
// التحديات العشوائية
// ============================================

/**
 * بدء تحدي عشوائي
 */
async function startChallenge(ctx) {
  if (!isGroupChat(ctx)) {
    await ctx.reply('هذه اللعبة متاحة فقط في المجموعات!');
    return;
  }

  const groupId = String(ctx.chat.id);

  // التحقق من وجود لعبة نشطة
  if (activeGames.has(groupId)) {
    await ctx.reply('هناك لعبة نشطة بالفعل! انتظر حتى تنتهي.');
    return;
  }

  // اختيار تحدي عشوائي
  const challengeData = getRandomItem(RANDOM_CHALLENGES);

  const gameData = {
    type: 'challenge',
    challenge: challengeData.challenge,
    challengeType: challengeData.type,
    startTime: Date.now(),
    firstResponder: null,
    rewards: GAME_CONFIG.CHALLENGE_REWARD
  };

  activeGames.set(groupId, gameData);

  // إرسال التحدي
  await ctx.reply(
    `تحدي عشوائي!\n\n${
      challengeData.challenge  }\n\n` +
    `المكافأة: ${  GAME_CONFIG.CHALLENGE_REWARD  } Coins\n` +
    `الوقت: ${  GAME_CONFIG.ANSWER_TIMEOUT  } ثانية\n\n` +
    'اول شخص يشارك يفوز!'
  );

  // مؤقت انتهاء اللعبة
  setTimeout(async () => {
    const game = activeGames.get(groupId);
    if (game && !game.firstResponder) {
      activeGames.delete(groupId);
      try {
        await ctx.reply(
          'انتهى الوقت!\n\n' +
          'لم يشارك أحد في التحدي!'
        );
      } catch (e) {
        // تجاهل الأخطاء
      }
    }
  }, GAME_CONFIG.ANSWER_TIMEOUT * 1000);
}

/**
 * معالجة رد المستخدم على التحدي
 */
async function handleChallengeResponse(ctx) {
  if (!isGroupChat(ctx)) return;

  const groupId = String(ctx.chat.id);
  const userId = ctx.from.id;

  const game = activeGames.get(groupId);
  if (!game || game.type !== 'challenge') return;
  if (game.firstResponder) return;

  // تسجيل أول مشارك
  game.firstResponder = userId;
  activeGames.delete(groupId);

  // إضافة المكافأة
  await addCoins(groupId, userId, game.rewards);

  const user = ctx.from;
  await ctx.reply(
    'فزت بالتحدي!\n\n' +
    `الفائز: @${  user.username || user.first_name  }\n` +
    `المكافأة: ${  game.rewards  } Coins`
  );
}

// ============================================
// عرض قائمة الألعاب
// ============================================

/**
 * عرض قائمة الألعاب المتاحة
 */
async function showGamesList(ctx) {
  if (!isGroupChat(ctx)) {
    await ctx.reply('هذه الألعاب متاحة فقط في المجموعات!');
    return;
  }

  await ctx.reply(
    'قائمة الألعاب الجماعية\n\n' +
    '---------------------------\n\n' +
    'تخمين الرقم\n' +
    '- تخمن رقم بين 1 و 100\n' +
    `- المكافأة: ${  GAME_CONFIG.GUESS_REWARD  } Coins\n` +
    '- الأمر: /guess أو /تخمين\n\n' +
    'أسرع إجابة\n' +
    '- سؤال عام أو رياضيات\n' +
    `- المكافأة: ${  GAME_CONFIG.QUIZ_REWARD  } Coins\n` +
    '- الأمر: /quiz أو /سؤال\n\n' +
    'الأسئلة الدينية\n' +
    '- أسئلة عن القرآن والسنة\n' +
    `- المكافأة: ${  GAME_CONFIG.RELIGIOUS_REWARD  } Coins + ${  GAME_CONFIG.RELIGIOUS_XP_BONUS  } XP\n` +
    '- الأمر: /religious أو /ديني\n\n' +
    'التحدي العشوائي\n' +
    '- تحدي تفاعلي سريع\n' +
    `- المكافأة: ${  GAME_CONFIG.CHALLENGE_REWARD  } Coins\n` +
    '- الأمر: /challenge أو /تحدي\n\n' +
    '---------------------------\n\n' +
    `وقت الإجابة: ${  GAME_CONFIG.ANSWER_TIMEOUT  } ثانية\n` +
    'الألعاب للمجموعات فقط!\n\n' +
    'لإنهاء لعبة نشطة: /endgame'
  );
}

// ============================================
// إنهاء اللعبة
// ============================================

/**
 * إنهاء اللعبة النشطة (للمشرفين)
 */
async function endGame(ctx) {
  if (!isGroupChat(ctx)) {
    await ctx.reply('هذا الأمر متاح فقط في المجموعات!');
    return;
  }

  const groupId = String(ctx.chat.id);
  const userId = ctx.from.id;

  // التحقق من صلاحيات المشرف
  try {
    const chatMember = await ctx.telegram.getChatMember(groupId, userId);
    if (!['creator', 'administrator'].includes(chatMember.status)) {
      await ctx.reply('هذا الأمر للمشرفين فقط!');
      return;
    }
  } catch (error) {
    await ctx.reply('حدث خطأ في التحقق من الصلاحيات!');
    return;
  }

  // إنهاء اللعبة
  if (activeGames.has(groupId)) {
    const game = activeGames.get(groupId);
    activeGames.delete(groupId);

    await ctx.reply(
      'تم إنهاء اللعبة!\n\n' +
      `المنهي: @${  ctx.from.username || ctx.from.first_name  }\n` +
      `نوع اللعبة: ${  game.type}`
    );
  } else {
    await ctx.reply('لا توجد لعبة نشطة الآن!');
  }
}

// ============================================
// معالجة الرسائل للألعاب
// ============================================

/**
 * معالجة رسالة المستخدم للتحقق من اللعبة النشطة
 */
async function handleGameMessage(ctx) {
  if (!isGroupChat(ctx)) return;

  const groupId = String(ctx.chat.id);
  const text = ctx.message.text;

  const game = activeGames.get(groupId);
  if (!game) return;

  // التحقق من أن المستخدم ليس البوت
  if (ctx.from.id === ctx.botInfo.id) return;

  switch (game.type) {
    case 'guess':
      // التحقق إذا كانت الرسالة رقم
      if (/^\d+$/.test(text)) {
        await handleGuess(ctx);
      }
      break;

    case 'quiz':
      await handleQuizAnswer(ctx);
      break;

    case 'religious':
      await handleReligiousAnswer(ctx);
      break;

    case 'challenge':
      // في التحديات، أي رسالة تحسب كمشاركة
      await handleChallengeResponse(ctx);
      break;
  }
}

// ============================================
// تسجيل الأوامر
// ============================================

/**
 * تسجيل أوامر الألعاب
 */
function registerGameCommands(bot) {
  // أمر تخمين الرقم
  bot.command(['guess', 'تخمين'], async (ctx) => {
    await startGuessGame(ctx);
  });

  // أمر السؤال السريع
  bot.command(['quiz', 'سؤال'], async (ctx) => {
    await startQuizGame(ctx);
  });

  // أمر الأسئلة الدينية
  bot.command(['religious', 'ديني'], async (ctx) => {
    await startReligiousGame(ctx);
  });

  // أمر التحدي العشوائي
  bot.command(['challenge', 'تحدي'], async (ctx) => {
    await startChallenge(ctx);
  });

  // أمر عرض قائمة الألعاب
  bot.command(['game', 'games'], async (ctx) => {
    await showGamesList(ctx);
  });

  // أمر إنهاء اللعبة
  bot.command(['endgame', 'انهاء'], async (ctx) => {
    await endGame(ctx);
  });

  // معالجة الرسائل للألعاب
  bot.on('message', async (ctx) => {
    if (!ctx.message || !ctx.message.text) return;

    // تجاهل الأوامر
    if (ctx.message.text.startsWith('/')) return;

    await handleGameMessage(ctx);
  });
}

// ============================================
// تصدير الدوال
// ============================================

module.exports = {
  registerGameCommands,
  // تصدير للدوال الاختبارية
  startGuessGame,
  startQuizGame,
  startReligiousGame,
  startChallenge,
  showGamesList,
  endGame,
  handleGameMessage,
  activeGames,
  GAME_CONFIG
};
