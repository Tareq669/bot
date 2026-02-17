/**
 * New Features Module - Quran, Adhkar, Admin, and Games
 * Includes: Tafsir, Tajweed, Memorization, Quizzes
 * Morning/Evening Tracker, Istighfar, Tasbih
 * Auto-mod, Welcome Messages, Reports, Broadcast
 * Trivia, Puzzles, Surah Games
 */

const { User, Group } = require('../database/models');

// ============================================
// QURAN FEATURES - التفسير والتجويد والحفظ
// ============================================

class QuranTafsirFeature {
  // Get tafsir for a specific verse
  static async getTafsir(surahNumber, ayahNumber, mufasir = 'السعدي') {
    const tafsirDatabase = {
      'السعدي': {
        '1:1': 'بسم الله الرحمن الرحيم: هذا ذكر الله تعالى لعباده بما يجب أن يذكروه به, ولهذا بدأ الله تعالى كتابه بهذه البشارة العظيمة.',
        '2:255': 'آية الكرسي: فيها описа величия الله وعظمته، وهو الحي القيوم الذي لا تأخذه سنة ولا نوم.',
        '2:256': 'لا إكراه في الدين: من أسلم فلنفسه ومن كفر فعليها، والله سميع عليم.',
        '3:26': 'اللهم مالك الملك: تقرير لملك الله وتdol ему власти давать и отбирать.'
      },
      'ابن كثير': {
        '1:1': 'قال ابن كثير: بسم الله الرحمن الرحيم اسم الله تعالى أعلى وأعظم الأسماء.',
        '2:255': 'قوله تعالى: الله لا إله إلا هو الحي القيوم - هذا وصف الله تعالى بصفات كاملة.'
      },
      'القرطبي': {
        '1:1': 'البسملة آية من آيات القرآن وهي سبب البركة في كل شيء.'
      }
    };

    const key = `${surahNumber}:${ayahNumber}`;
    const tafsirs = tafsirDatabase[mufasir] || tafsirDatabase['السعدي'];

    return {
      surah: surahNumber,
      ayah: ayahNumber,
      mufasir: mufasir,
      tafsir: tafsirs[key] || 'تفسير هذه الآية غير متوفر حالياً',
      sources: ['تفسير السعدي', 'تفسير ابن كثير', 'تفسير القرطبي']
    };
  }

  // Get list of available tafsir scholars
  static getAvailableMufassireen() {
    return [
      { name: 'السعدي', description: 'تيسير الكريم المنان في تفسير كلام الرحمن' },
      { name: 'ابن كثير', description: 'تفسير القرآن العظيم' },
      { name: 'القرطبي', description: 'الجامع لأحكام القرآن' }
    ];
  }
}

class TajweedLessonsFeature {
  // Get tajweed rules
  static getTajweedRules() {
    return {
      rules: [
        {
          name: 'المد',
          types: ['مد طبيعي', 'مد لازم', 'مد عارض للسكون'],
          description: 'إطالة الصوت بحرف المد',
          examples: [
            { verse: 'الرحمن', rule: 'مد طبيعي', explanation: 'حرف المد بعد فتحة' },
            { verse: 'الصاد', rule: 'مد لازم', explanation: 'حرف المد قبل حرف ساكن' }
          ]
        },
        {
          name: 'النون الساكنة',
          types: ['إظهار', 'إدغام', 'قلب'],
          description: 'أحكام النون الساكنة والتنوين',
          examples: [
            { verse: 'من昼', rule: 'إظهار', explanation: 'النون الساكنة قبل حروف الحلق' },
            { verse: 'من مال', rule: 'إدغام', explanation: 'النون الساكنة قبل حرف ميم' }
          ]
        },
        {
          name: 'الميم الساكنة',
          types: ['إظهار', 'إدغام', 'قلب'],
          description: 'أحكام الميم الساكنة',
          examples: [
            { verse: 'هم', rule: 'إظهار', explanation: 'الميم الساكنة قبل حروف الحلق' },
            { verse: 'عالمين', rule: 'إدغام', explanation: 'الميم الساكنة قبل ميم' }
          ]
        },
        {
          name: 'الهمزة',
          types: ['همزة القطع', 'همزة الوصل'],
          description: 'أحكام الهمزة',
          examples: [
            { verse: 'أأنذرتهم', rule: 'همزة القطع', explanation: 'الهمزة فيbeginning of word' },
            { verse: 'استغفر', rule: 'همزة الوصل', explanation: 'الهمزة التي تسقط فيbeginning' }
          ]
        },
        {
          name: 'الراءات',
          types: ['راء الإشمام', 'راء الروم'],
          description: 'أحكام حرف الراء',
          examples: [
            { verse: 'بر', rule: 'راء الإشمام', explanation: 'ضمة شفهية مع الراء' },
            { verse: '大国', rule: 'راء الروم', explanation: 'ضمة ملفوظة مع الراء' }
          ]
        }
      ],
      tips: [
        'تعلم مخارج الحروف أولاً',
        'استمع إلى قراءاة محترفة',
        'تدرب على كل قاعدة منفصلة',
        'لا تتعجل في الجمع بين القواعد'
      ]
    };
  }

  // Get lesson by level
  static getLessonByLevel(level) {
    const lessons = {
      beginner: {
        title: 'مستوى المبتدئين',
        content: [
          'تعلم مخارج الحروف الأساسية',
          'التعرف على حروف المد',
          'ممارسة السكتات الأساسية'
        ],
        duration: 'أسبوع واحد'
      },
      intermediate: {
        title: 'المستوى المتوسط',
        content: [
          'أحكام النون الساكنة',
          'أحكام الميم الساكنة',
          'تطبيقات عملية'
        ],
        duration: 'أسبوعان'
      },
      advanced: {
        title: 'المستوى المتقدم',
        content: [
          'الراءات والهمزات المتقدمة',
          'الاغلاط الشائعة',
          'المراجعة الشاملة'
        ],
        duration: 'ثلاثة أسابيع'
      }
    };
    return lessons[level] || lessons.beginner;
  }
}

class QuranQuizFeature {
  // Generate a quiz question
  static generateQuiz(difficulty = 'easy') {
    const questions = {
      easy: [
        {
          question: 'ما هي أول سورة في القرآن؟',
          options: ['الفاتحة', 'البقرة', 'العلق', 'الزخرف'],
          answer: 0,
          explanation: 'سورة الفاتحة هي أول سورة في القرآن الكريم'
        },
        {
          question: 'كم عدد آيات سورةالفاتحة؟',
          options: ['5', '6', '7', '8'],
          answer: 2,
          explanation: 'سورة الفاتحة تتكون من 7 آيات'
        },
        {
          question: 'ما اسم السورة التي تسمى المعوذتين؟',
          options: ['الفلق', 'الناس', 'الإخلاص', 'كلاهما'],
          answer: 3,
          explanation: 'المعوذتان هما سورتا الفلق والناس'
        }
      ],
      medium: [
        {
          question: 'في أي سورة توجد آية الكرسي؟',
          options: ['آل عمران', 'البقرة', 'النساء', 'المائدة'],
          answer: 1,
          explanation: 'آية الكرسي في سورة البقرة الآية 255'
        },
        {
          question: 'كم عدد سور القرآن الكريم؟',
          options: ['113', '114', '115', '112'],
          answer: 1,
          explanation: 'القرآن الكريم يتكون من 114 سورة'
        },
        {
          question: 'ما أطول سورة في القرآن؟',
          options: ['الأنعام', 'البقرة', 'الأعراف', 'يونس'],
          answer: 1,
          explanation: 'سورة البقرة هي longest سورة في القرآن'
        }
      ],
      hard: [
        {
          question: 'ما ترتيب سورة الحجر بين السور؟',
          options: ['14', '15', '16', '17'],
          answer: 1,
          explanation: 'سورة الحجر هي السورة رقم 15'
        },
        {
          question: 'كم عدد آيات سورة التكوير؟',
          options: ['29', '28', '27', '26'],
          answer: 0,
          explanation: 'سورة التكوير تتكون من 29 آية'
        },
        {
          question: 'في أي سورة بدأت القصة بخلف؟',
          options: ['يونس', 'هود', 'يوسف', 'ابراهيم'],
          answer: 2,
          explanation: 'قصة يوسف عليه السلام في سورة يوسف'
        }
      ]
    };

    const difficultyQuestions = questions[difficulty] || questions.easy;
    const randomIndex = Math.floor(Math.random() * difficultyQuestions.length);
    return difficultyQuestions[randomIndex];
  }

  // Check answer
  static checkAnswer(question, selectedAnswer) {
    return {
      correct: question.answer === selectedAnswer,
      explanation: question.explanation
    };
  }
}

// ============================================
// ADHKAR FEATURES - الأذكار والتسبيح
// ============================================

class MorningEveningTracker {
  static async getTrackerData(userId) {
    const user = await User.findOne({ userId });
    if (!user) return null;

    const today = new Date().toDateString();
    const lastUpdate = user.lastAdhkarUpdate?.toDateString();

    return {
      morning: user.morningAdhkar || false,
      evening: user.eveningAdhkar || false,
      morningCompleted: user.morningAdhkar && lastUpdate === today,
      eveningCompleted: user.eveningAdhkar && lastUpdate === today,
      streak: user.adhkarStreak || 0
    };
  }

  static async completeMorningAdhkar(userId) {
    const user = await User.findOne({ userId });
    const today = new Date().toDateString();
    const lastUpdate = user?.lastAdhkarUpdate?.toDateString();

    if (!user) {
      await User.create({
        userId,
        morningAdhkar: true,
        eveningAdhkar: false,
        lastAdhkarUpdate: new Date(),
        adhkarStreak: 1
      });
      return { success: true, streak: 1, isNew: true };
    }

    // Check if already completed today
    if (lastUpdate === today && user.morningAdhkar) {
      return { success: false, message: 'Already completed morning adhkar today' };
    }

    // Update streak if yesterday was completed
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    const yesterdayCompleted = user.lastAdhkarUpdate?.toDateString() === yesterdayStr;

    user.morningAdhkar = true;
    user.lastAdhkarUpdate = new Date();
    user.adhkarStreak = yesterdayCompleted ? (user.adhkarStreak || 0) + 1 : 1;
    await user.save();

    return { success: true, streak: user.adhkarStreak };
  }

  static async completeEveningAdhkar(userId) {
    const user = await User.findOne({ userId });
    const today = new Date().toDateString();
    const lastUpdate = user?.lastAdhkarUpdate?.toDateString();

    if (!user) {
      await User.create({
        userId,
        morningAdhkar: false,
        eveningAdhkar: true,
        lastAdhkarUpdate: new Date(),
        adhkarStreak: 1
      });
      return { success: true, streak: 1, isNew: true };
    }

    if (lastUpdate === today && user.eveningAdhkar) {
      return { success: false, message: 'Already completed evening adhkar today' };
    }

    user.eveningAdhkar = true;
    user.lastAdhkarUpdate = new Date();
    await user.save();

    return { success: true, streak: user.adhkarStreak || 1 };
  }

  static getMorningAdhkar() {
    return [
      'أصبحنا وأصبح الملك لله والحمد لله',
      'لا إله إلا الله وحده لا شريك له',
      'أعوذ بكلمات الله التامات',
      'اللهم إني أسألك العافية',
      'بسم الله الذي لا يضر مع اسمه شيء'
    ];
  }

  static getEveningAdhkar() {
    return [
      'أمسينا وأمسى الملك لله',
      'لا إله إلا الله وحده لا شريك له',
      'أعوذ بكلمات الله التامات',
      'اللهم إني أسألك العافية',
      'بسم الله الذي لا يضر مع اسمه شيء'
    ];
  }
}

class IstighfarCounter {
  static async countIstighfar(userId, count = 1) {
    let user = await User.findOne({ userId });

    if (!user) {
      user = await User.create({
        userId,
        istighfarCount: count
      });
    } else {
      user.istighfarCount = (user.istighfarCount || 0) + count;
      await user.save();
    }

    return {
      total: user.istighfarCount,
      goal: 100,
      progress: Math.min(100, Math.round((user.istighfarCount / 100) * 100))
    };
  }

  static async getStats(userId) {
    const user = await User.findOne({ userId });
    return {
      total: user?.istighfarCount || 0,
      today: user?.todayIstighfar || 0,
      goal: 100
    };
  }

  static getIstighfarVariants() {
    return [
      'استغفر الله',
      'أستغفر الله',
      'استغفر الله العظيم',
      'أستغفر الله رب العالمين'
    ];
  }
}

class DigitalTasbih {
  static createSession(userId) {
    return {
      userId,
      count: 0,
      startTime: new Date(),
      isActive: true
    };
  }

  static async increment(session) {
    session.count++;
    return session;
  }

  static async endSession(session) {
    session.isActive = false;
    session.endTime = new Date();

    // Save to user history
    const user = await User.findOne({ userId: session.userId });
    if (user) {
      user.tasbihHistory = user.tasbihHistory || [];
      user.tasbihHistory.push({
        count: session.count,
        date: new Date(),
        duration: (session.endTime - session.startTime) / 1000
      });
      user.totalTasbih = (user.totalTasbih || 0) + session.count;
      await user.save();
    }

    return session;
  }

  static async getHistory(userId, limit = 10) {
    const user = await User.findOne({ userId });
    if (!user?.tasbihHistory) return [];

    return user.tasbihHistory
      .slice(-limit)
      .reverse();
  }

  static getTasbihDhikr() {
    return [
      'سبحان الله',
      'الحمد لله',
      'لا إله إلا الله',
      'الله أكبر',
      'سبحان الله وبحمده',
      'سبحان الله العظيم'
    ];
  }
}

// ============================================
// ADMIN FEATURES - الإدارة والإشراف
// ============================================

class AutoModeration {
  static async checkMessage(message, groupSettings) {
    const issues = [];

    if (!groupSettings?.autoModEnabled) {
      return { allowed: true, issues: [] };
    }

    // Check for spam
    if (this.isSpam(message)) {
      issues.push({ type: 'spam', severity: 'high' });
    }

    // Check for inappropriate content
    if (this.hasInappropriateContent(message)) {
      issues.push({ type: 'inappropriate', severity: 'high' });
    }

    // Check for links (if not allowed)
    if (groupSettings?.noLinks && this.hasLinks(message)) {
      issues.push({ type: 'links', severity: 'medium' });
    }

    // Check for caps (if enabled)
    if (groupSettings?.noCaps && this.isExcessiveCaps(message)) {
      issues.push({ type: 'caps', severity: 'low' });
    }

    return {
      allowed: issues.length === 0,
      issues,
      shouldDelete: issues.some(i => i.severity === 'high'),
      shouldWarn: issues.length > 0
    };
  }

  static isSpam(message) {
    const spamPatterns = [
      /(.)\1{5,}/, // Repeated characters
      /forward|forwarded/i,
      /make money fast/i
    ];
    return spamPatterns.some(pattern => pattern.test(message));
  }

  static hasInappropriateContent(message) {
    const inappropriatePatterns = [
      /fuck|shit|damn/i,
      /NSFW|adult/i
    ];
    return inappropriatePatterns.some(pattern => pattern.test(message));
  }

  static hasLinks(message) {
    const linkPattern = /https?:\/\/[^\s]+|www\.[^\s]+/;
    return linkPattern.test(message);
  }

  static isExcessiveCaps(message) {
    const capsCount = (message.match(/[A-Z]/g) || []).length;
    const totalLength = message.replace(/[^a-zA-Z]/g, '').length;
    return totalLength > 10 && capsCount / totalLength > 0.7;
  }
}

class WelcomeSystem {
  static async sendWelcome(ctx, user, groupSettings) {
    if (!groupSettings?.welcomeEnabled) return;

    const welcomeMessage = groupSettings.welcomeMessage ||
      'أهلاً وسهلاً بك {username}! 🎉\nمرحباً بك في المجموعة.';

    const message = welcomeMessage
      .replace('{username}', user.first_name)
      .replace('{title}', ctx.chat.title);

    await ctx.reply(message, { parse_mode: 'HTML' });
  }

  static async sendGoodbye(ctx, user, groupSettings) {
    if (!groupSettings?.goodbyeEnabled) return;

    const goodbyeMessage = groupSettings.goodbyeMessage ||
      'وداعاً {username}! 👋\nنأمل أن نراك قريباً.';

    const message = goodbyeMessage
      .replace('{username}', user.first_name);

    await ctx.reply(message, { parse_mode: 'HTML' });
  }
}

class UserReports {
  static async createReport(reporterId, reportedUserId, groupId, reason) {
    const { Report } = require('../database/models');

    const report = await Report.create({
      reporterId,
      reportedUserId,
      groupId,
      reason,
      status: 'pending',
      createdAt: new Date()
    });

    return report;
  }

  static async getReportsByGroup(groupId, status = 'pending') {
    const { Report } = require('../database/models');
    return Report.find({ groupId, status }).sort({ createdAt: -1 });
  }

  static async resolveReport(reportId, adminId, resolution) {
    const { Report } = require('../database/models');
    return Report.findByIdAndUpdate(reportId, {
      status: 'resolved',
      resolvedBy: adminId,
      resolution,
      resolvedAt: new Date()
    });
  }
}

class BroadcastSystem {
  static async broadcast(bot, adminId, message, targetChats = 'all') {
    const { Group } = require('../database/models');

    let groups;
    if (targetChats === 'all') {
      groups = await Group.find({});
    } else if (Array.isArray(targetChats)) {
      groups = await Group.find({ chatId: { $in: targetChats } });
    }

    const results = {
      success: 0,
      failed: 0,
      total: groups.length
    };

    for (const group of groups) {
      try {
        await bot.telegram.sendMessage(group.chatId, message, { parse_mode: 'HTML' });
        results.success++;
      } catch (error) {
        results.failed++;
        console.error(`Failed to send to ${group.chatId}:`, error);
      }
    }

    return results;
  }
}

// ============================================
// GAMES FEATURES - الألعاب الإسلامية
// ============================================

class IslamicTriviaGame {
  static questions = {
    history: [
      {
        question: 'من كان أول خليفة بعد النبي صلى الله عليه وسلم؟',
        options: ['أبو بكر الصديق', 'عمر بن الخطاب', 'عثمان بن عفان', 'علي بن أبي طالب'],
        answer: 0,
        category: 'التاريخ الإسلامي'
      },
      {
        question: 'في أي عام هاجر النبي صلى الله عليه وسلم إلى المدينة؟',
        options: ['620م', '622م', '624م', '630م'],
        answer: 1,
        category: 'التاريخ الإسلامي'
      },
      {
        question: 'من كانت أول امرأة تؤمن بالنبي صلى الله عليه وسلم؟',
        options: ['خديجة بنت خويلد', 'عائشة بنت أبي بكر', 'أم سلمة', 'زينب بنت جحش'],
        answer: 0,
        category: 'التاريخ الإسلامي'
      }
    ],
    aqeedah: [
      {
        question: 'كم عدد أركان الإيمان؟',
        options: ['4', '5', '6', '7'],
        answer: 2,
        category: 'العقيدة'
      },
      {
        question: 'ما هي أعظم آية في القرآن؟',
        options: ['آية الكرسي', 'آخر آية من البقرة', 'الإخلاص', 'المعوذتين'],
        answer: 0,
        category: 'العقيدة'
      },
      {
        question: 'من أين نؤمن بالجنة والنار؟',
        options: ['بالعقل', 'بالقرآن والسنة', '+بالتجربة', 'لا نؤمن'],
        answer: 1,
        category: 'العقيدة'
      }
    ],
    fiqh: [
      {
        question: 'كم عدد الصلوات المفروضة يومياً؟',
        options: ['3', '5', '7', '9'],
        answer: 1,
        category: 'الفقه'
      },
      {
        question: 'ما هو حكم اللهو المحرم؟',
        options: ['مكروه', 'حلال', 'حرام', 'مباح'],
        answer: 2,
        category: 'الفقه'
      },
      {
        question: 'متى يجب الزكاة؟',
        options: ['كل شهر', 'كل سنة', 'عند الحاجة', 'كل جمعة'],
        answer: 1,
        category: 'الفقه'
      }
    ]
  };

  static getQuestion(category = 'all') {
    let pool;
    if (category === 'all') {
      const allCategories = Object.values(this.questions);
      pool = allCategories.flat();
    } else {
      pool = this.questions[category] || [];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  static checkAnswer(question, answer) {
    return {
      correct: question.answer === answer,
      correctAnswer: question.options[question.answer],
      explanation: `الإجابة الصحيحة: ${question.options[question.answer]}`
    };
  }
}

class WordPuzzleGame {
  static puzzles = [
    {
      word: 'قرآن',
      hint: 'الكتاب المنزل من الله',
      letters: ['ق', 'ر', 'أ', 'ن'],
      category: 'إسلامي'
    },
    {
      word: 'صلاة',
      hint: 'أحد أركان الإسلام الخمسة',
      letters: ['ص', 'ل', 'ا', 'ة'],
      category: 'إسلامي'
    },
    {
      word: 'صيام',
      hint: 'ركن من أركان الإسلام في رمضان',
      letters: ['ص', 'ي', 'ا', 'م'],
      category: 'إسلامي'
    },
    {
      word: 'حج',
      trip: 'ركن من أركان الإسلام',
      letters: ['ح', 'ج'],
      category: 'إسلامي'
    },
    {
      word: 'زكاة',
      hint: 'إخراج مال للفقراء',
      letters: ['ز', 'ك', 'ا', 'ة'],
      category: 'إسلامي'
    },
    {
      word: 'مسلم',
      hint: 'من يؤمن بالله ورسوله',
      letters: ['م', 'س', 'ل', 'م'],
      category: 'إسلامي'
    },
    {
      word: 'جنة',
      hint: 'المكان الذي يدخله المؤمنون',
      letters: ['ج', 'ن', 'ة'],
      category: 'إسلامي'
    },
    {
      word: 'نار',
      hint: 'مكان للعاصين',
      letters: ['ن', 'ا', 'ر'],
      category: 'إسلامي'
    }
  ];

  static getRandomPuzzle() {
    return this.puzzles[Math.floor(Math.random() * this.puzzles.length)];
  }

  static checkAnswer(puzzle, guess) {
    return puzzle.word === guess;
  }
}

class SurahIdentificationGame {
  static surahs = [
    { name: 'الفاتحة', number: 1, verses: 7, type: 'مكية', meaning: 'الافتتاح' },
    { name: 'البقرة', number: 2, verses: 286, type: 'مدنية', meaning: 'البقرة' },
    { name: 'آل عمران', number: 3, verses: 200, type: 'مدنية', meaning: 'آل عمران' },
    { name: 'النساء', number: 4, verses: 176, type: 'مدنية', meaning: 'النساء' },
    { name: 'المائدة', number: 5, verses: 120, type: 'مدنية', meaning: 'الموائد' },
    { name: 'الأنعام', number: 6, verses: 165, type: 'مكية', meaning: 'المواشي' },
    { name: 'الأعراف', number: 7, verses: 206, type: 'مكية', meaning: 'المواضع' },
    { name: 'الأنفال', number: 8, verses: 75, type: 'مدنية', meaning: 'الغنائم' },
    { name: 'التوبة', number: 9, verses: 129, type: 'مدنية', meaning: 'التوبة' },
    { name: 'يونس', number: 10, verses: 109, type: 'مكية', meaning: 'يونس' }
  ];

  static getSurahQuiz() {
    const surah = this.surahs[Math.floor(Math.random() * this.surahs.length)];
    const wrongOptions = this.surahs
      .filter(s => s.number !== surah.number)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    const options = [surah, ...wrongOptions].sort(() => 0.5 - Math.random());

    return {
      question: `ما اسم السورة التي عدد آياتها ${surah.verses}؟`,
      options: options.map(s => s.name),
      correctAnswer: surah.name,
      surah: surah
    };
  }

  static checkAnswer(quiz, answer) {
    return quiz.correctAnswer === answer;
  }
}

class RacingGame {
  static async startRace(userId) {
    return {
      userId,
      startTime: new Date(),
      currentPosition: 0,
      targetPosition: 100,
      checkpoints: [
        { position: 25, reward: 10 },
        { position: 50, reward: 20 },
        { position: 75, reward: 30 },
        { position: 100, reward: 50 }
      ],
      currentCheckpoint: 0,
      completed: false
    };
  }

  static async progress(race, steps = 10) {
    race.currentPosition += steps;

    // Check for checkpoint rewards
    const nextCheckpoint = race.checkpoints[race.currentCheckpoint];
    let reward = 0;

    if (nextCheckpoint && race.currentPosition >= nextCheckpoint.position) {
      reward = nextCheckpoint.reward;
      race.currentCheckpoint++;
    }

    // Check if completed
    if (race.currentPosition >= race.targetPosition) {
      race.completed = true;
      race.endTime = new Date();
    }

    return { race, reward, completed: race.completed };
  }
}

module.exports = {
  // Quran Features
  QuranTafsirFeature,
  TajweedLessonsFeature,
  QuranQuizFeature,

  // Adhkar Features
  MorningEveningTracker,
  IstighfarCounter,
  DigitalTasbih,

  // Admin Features
  AutoModeration,
  WelcomeSystem,
  UserReports,
  BroadcastSystem,

  // Games Features
  IslamicTriviaGame,
  WordPuzzleGame,
  SurahIdentificationGame,
  RacingGame
};
