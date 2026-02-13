/**
 * 🎮 نظام الألعاب القرآنية المتكامل
 * Integrated Quranic Games System
 * 
 * يحتوي على 4 ألعاب:
 * 1. أكمل الآية - Complete the Verse
 * 2. اكتشف الفرق - Spot the Difference  
 * 3. معلومات قرآنية - Quran Trivia
 * 4. عد الآيات - Count Verses
 */

const { logger } = require('../utils/helpers');
const User = require('../database/models/User');

class QuranicGames {
  /**
   * 1️⃣ لعبة أكمل الآية
   * المستخدم يكمل الآية الناقصة
   */
  static getCompleteVerseGame() {
    const games = [
      { partial: 'الحمد لله رب...', answer: 'العالمين', reward: 10, surah: 'الفاتحة' },
      { partial: 'قل هو الله...', answer: 'أحد', reward: 10, surah: 'الإخلاص' },
      { partial: 'إنا أعطيناك...', answer: 'الكوثر', reward: 15, surah: 'الكوثر' },
      { partial: 'إن مع العسر...', answer: 'يسرا', reward: 10, surah: 'الشرح' },
      { partial: 'والعصر إن الإنسان لفي...', answer: 'خسر', reward: 15, surah: 'العصر' },
      { partial: 'ومن يتق الله يجعل له...', answer: 'مخرجا', reward: 20, surah: 'الطلاق' }
    ];
    
    const game = games[Math.floor(Math.random() * games.length)];
    return {
      type: 'complete_verse',
      question: game.partial,
      answer: game.answer,
      reward: game.reward,
      surah: game.surah
    };
  }

  /**
   * 2️⃣ لعبة اكتشف الفرق
   * المستخدم يحدد إذا كانت الآية صحيحة أم محرفة
   */
  static getSpotDifferenceGame() {
    const games = [
      {
        correct: 'قل هو الله أحد',
        wrong: 'قل هو الله واحد',
        reward: 15,
        surah: 'الإخلاص'
      },
      {
        correct: 'الحمد لله رب العالمين',
        wrong: 'الحمد لله رب السماوات',
        reward: 15,
        surah: 'الفاتحة'
      },
      {
        correct: 'وما خلقت الجن والإنس إلا ليعبدون',
        wrong: 'وما خلقت الجن والإنس إلا ليطيعون',
        reward: 20,
        surah: 'الذاريات'
      },
      {
        correct: 'فإن مع العسر يسرا',
        wrong: 'فإن مع الصبر يسرا',
        reward: 15,
        surah: 'الشرح'
      },
      {
        correct: 'ربنا آتنا في الدنيا حسنة',
        wrong: 'ربنا آتنا في الحياة حسنة',
        reward: 20,
        surah: 'البقرة'
      }
    ];
    
    const game = games[Math.floor(Math.random() * games.length)];
    const isCorrect = Math.random() < 0.5; // 50% صحيحة، 50% خاطئة
    
    return {
      type: 'spot_difference',
      question: isCorrect ? game.correct : game.wrong,
      answer: isCorrect, // true or false
      correctVerse: game.correct,
      reward: game.reward,
      surah: game.surah
    };
  }

  /**
   * 3️⃣ لعبة معلومات قرآنية
   * أسئلة اختيار من متعدد
   */
  static getTriviaGame() {
    const games = [
      {
        question: 'كم عدد سور القرآن الكريم؟',
        options: ['114', '100', '120', '110'],
        answerIndex: 0,
        reward: 10
      },
      {
        question: 'ما أقصر سورة في القرآن؟',
        options: ['النصر', 'الكوثر', 'الإخلاص', 'الفلق'],
        answerIndex: 1,
        reward: 10
      },
      {
        question: 'كم عدد أحزاب القرآن الكريم؟',
        options: ['60', '30', '45', '90'],
        answerIndex: 1,
        reward: 10
      },
      {
        question: 'ما أطول آية في القرآن؟',
        options: ['آية الدين', 'آية الكرسي', 'أول آية في البقرة', 'آخر آية في البقرة'],
        answerIndex: 0,
        reward: 15
      },
      {
        question: 'كم عدد آيات القرآن الكريم تقريباً؟',
        options: ['6236', '5000', '7000', '4500'],
        answerIndex: 0,
        reward: 15
      },
      {
        question: 'ما السورة التي تسمى قلب القرآن؟',
        options: ['الفاتحة', 'يس', 'الملك', 'الرحمن'],
        answerIndex: 1,
        reward: 10
      }
    ];
    
    const game = games[Math.floor(Math.random() * games.length)];
    return {
      type: 'trivia',
      question: game.question,
      options: game.options,
      answer: game.options[game.answerIndex], // الإجابة الصحيحة كنص
      reward: game.reward
    };
  }

  /**
   * 4️⃣ لعبة عد الآيات
   * المستخدم يخمن عدد آيات سورة معينة
   */
  static getCountVersesGame() {
    const games = [
      { surah: 'الفاتحة', count: 7, reward: 10 },
      { surah: 'البقرة', count: 286, reward: 20 },
      { surah: 'آل عمران', count: 200, reward: 15 },
      { surah: 'النساء', count: 176, reward: 15 },
      { surah: 'المائدة', count: 120, reward: 15 },
      { surah: 'الأنعام', count: 165, reward: 15 },
      { surah: 'الكهف', count: 110, reward: 15 },
      { surah: 'يس', count: 83, reward: 15 },
      { surah: 'الملك', count: 30, reward: 10 },
      { surah: 'الإخلاص', count: 4, reward: 10 }
    ];
    
    const game = games[Math.floor(Math.random() * games.length)];
    return {
      type: 'count_verses',
      question: `كم عدد آيات سورة ${game.surah}؟`,
      answer: game.count,
      reward: game.reward,
      surah: game.surah
    };
  }

  /**
   * 📊 تسجيل نتيجة اللعبة
   */
  static async recordGameResult(userId, gameType, reward, won) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return false;

      // تهيئة gameStats إذا لم يكن موجوداً
      user.gameStats = user.gameStats || {};
      user.gameStats.quranic = user.gameStats.quranic || {
        played: 0,
        won: 0,
        totalPoints: 0
      };

      // تحديث الإحصائيات
      user.gameStats.quranic.played++;
      if (won) {
        user.gameStats.quranic.won++;
        user.gameStats.quranic.totalPoints += reward;
      }

      await user.save();
      return true;
    } catch (error) {
      logger.error(`خطأ في تسجيل نتيجة اللعبة: ${error.message}`);
      return false;
    }
  }

  /**
   * 📝 قائمة الألعاب
   */
  static getGamesList() {
    return `🎮 <b>الألعاب القرآنية</b>

اختبر معلوماتك القرآنية واحصل على النقاط!

1️⃣ <b>أكمل الآية</b> ✍️
   أكمل الآية الناقصة

2️⃣ <b>اكتشف الفرق</b> 🔍
   حدد إذا كانت الآية صحيحة

3️⃣ <b>معلومات قرآنية</b> 🧠
   أسئلة اختيار من متعدد

4️⃣ <b>عد الآيات</b> 📊
   خمن عدد آيات السورة

💰 كل إجابة صحيحة = نقاط!`;
  }

  /**
   * ✅ التحقق من الإجابة
   */
  static checkAnswer(userAnswer, correctAnswer, gameType) {
    // تنظيف الإجابات
    const cleanUser = String(userAnswer).trim().toLowerCase();
    const cleanCorrect = String(correctAnswer).trim().toLowerCase();
    
    if (gameType === 'spot_difference') {
      // للعبة اكتشف الفرق: true/false
      return cleanUser === cleanCorrect;
    } else if (gameType === 'count_verses') {
      // للعبة عد الآيات: أرقام
      return parseInt(cleanUser) === parseInt(cleanCorrect);
    } else {
      // للألعاب النصية: مقارنة نصية
      return cleanUser === cleanCorrect;
    }
  }
}

module.exports = QuranicGames;
