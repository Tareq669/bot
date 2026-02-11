/**
 * Quranic Games System
 * نظام الألعاب القرآنية الجديدة
 */

const { logger } = require('../utils/helpers');
const User = require('../database/models/User');

class QuranicGames {
  /**
   * لعبة تخمين الآية (Quran Verse Guessing)
   */
  static async guessTheVerse() {
    const verses = [
      {
        clue: 'أول سورة في القرآن الكريم',
        answer: 'الفاتحة',
        surahNumber: 1,
        points: 10
      },
      {
        clue: 'أطول سورة في القرآن الكريم',
        answer: 'البقرة',
        surahNumber: 2,
        points: 15
      },
      {
        clue: 'سورة سميت باسم حيوان',
        answer: 'النحل',
        surahNumber: 16,
        points: 10
      },
      {
        clue: 'سورة بها سجدة في الآية 15',
        answer: 'مريم',
        surahNumber: 19,
        points: 20
      },
      {
        clue: 'سورة نزلت كاملة واحدة',
        answer: 'الفاتحة',
        surahNumber: 1,
        points: 15
      }
    ];

    const random = verses[Math.floor(Math.random() * verses.length)];
    return {
      gameType: 'guess_verse',
      clue: random.clue,
      correctAnswer: random.answer,
      reward: random.points,
      difficulty: 'سهل'
    };
  }

  /**
   * لعبة الآية الكاملة (Complete the Verse)
   */
  static async completeTheVerse() {
    const verses = [
      {
        partial: 'الحمد لله رب...',
        complete: 'العالمين',
        points: 10,
        surah: 'الفاتحة'
      },
      {
        partial: 'بسم الله الرحمن...',
        complete: 'الرحيم',
        points: 10,
        surah: 'متعدد'
      },
      {
        partial: 'قل هو الله...',
        complete: 'أحد',
        points: 15,
        surah: 'الإخلاص'
      },
      {
        partial: 'يا أيها الناس إنا خلقناكم من...',
        complete: 'ذكر وأنثى',
        points: 20,
        surah: 'الحجرات'
      }
    ];

    const random = verses[Math.floor(Math.random() * verses.length)];
    return {
      gameType: 'complete_verse',
      partial: random.partial,
      correctAnswer: random.complete,
      reward: random.points,
      surah: random.surah
    };
  }

  /**
   * لعبة الخطأ في الآية (Spot the Difference)
   */
  static async spotTheDifference() {
    const verses = [
      {
        correct: 'قل هو الله أحد',
        wrong: 'قل هو الله واحد',
        points: 15,
        surah: 'الإخلاص'
      },
      {
        correct: 'الحمد لله رب العالمين',
        wrong: 'الحمد لله رب السماوات',
        points: 15,
        surah: 'الفاتحة'
      },
      {
        correct: 'ربنا آتنا في الدنيا حسنة',
        wrong: 'ربنا آتنا في الحياة حسنة',
        points: 20,
        surah: 'البقرة'
      }
    ];

    const random = verses[Math.floor(Math.random() * verses.length)];
    const isWrong = Math.random() < 0.5;

    return {
      gameType: 'spot_difference',
      verse: isWrong ? random.wrong : random.correct,
      isCorrect: !isWrong,
      correctVerse: random.correct,
      reward: random.points,
      surah: random.surah
    };
  }

  /**
   * لعبة أسرار القرآن (Quran Trivia)
   */
  static async qurranTrivia() {
    const questions = [
      {
        question: 'كم عدد سور القرآن الكريم؟',
        options: ['114', '100', '120', '110'],
        answer: 0,
        points: 10
      },
      {
        question: 'كم عدد آيات القرآن الكريم تقريباً؟',
        options: ['6100', '5000', '7000', '4500'],
        answer: 0,
        points: 15
      },
      {
        question: 'كم عدد أحزاب القرآن الكريم؟',
        options: ['60', '30', '45', '90'],
        answer: 1,
        points: 10
      },
      {
        question: 'ما أقصر سورة في القرآن؟',
        options: ['النصر', 'الكوثر', 'الإخلاص', 'الفلق'],
        answer: 0,
        points: 10
      },
      {
        question: 'كم سورة مكية في القرآن؟',
        options: ['86', '28', '70', '44'],
        answer: 0,
        points: 20
      }
    ];

    const random = questions[Math.floor(Math.random() * questions.length)];
    return {
      gameType: 'quran_trivia',
      question: random.question,
      options: random.options,
      correctAnswer: random.answer,
      reward: random.points
    };
  }

  /**
   * لعبة السورة والعدد (Surah & Count)
   */
  static async surahCount() {
    const verses = [
      { surah: 'الفاتحة', verses: 7, points: 10 },
      { surah: 'البقرة', verses: 286, points: 10 },
      { surah: 'آل عمران', verses: 200, points: 10 },
      { surah: 'النساء', verses: 176, points: 15 },
      { surah: 'المائدة', verses: 120, points: 15 },
      { surah: 'الأنعام', verses: 165, points: 10 }
    ];

    const random = verses[Math.floor(Math.random() * verses.length)];

    return {
      gameType: 'surah_count',
      surah: random.surah,
      correctAnswer: random.verses,
      question: `كم عدد آيات سورة ${random.surah}؟`,
      reward: random.points
    };
  }

  /**
   * معلومات اللعبة
   */
  static getGameInfo(gameType) {
    const games = {
      guess_verse: {
        name: '🎯 تخمين الآية',
        description: 'خمن السورة من الدليل المعطى',
        difficulty: 'سهل',
        rewards: '10-20 نقطة'
      },
      complete_verse: {
        name: '✍️ أكمل الآية',
        description: 'أكمل باقي الآية القرآنية',
        difficulty: 'متوسط',
        rewards: '10-20 نقطة'
      },
      spot_difference: {
        name: '🔍 اكتشف الفرق',
        description: 'حدد الآية الصحيحة من آيتين',
        difficulty: 'صعب',
        rewards: '15-20 نقطة'
      },
      quran_trivia: {
        name: '🧠 معلومات قرآنية',
        description: 'أجب على أسئلة عن القرآن الكريم',
        difficulty: 'متوسط',
        rewards: '10-20 نقطة'
      },
      surah_count: {
        name: '📊 عد الآيات',
        description: 'كم عدد آيات السورة المعطاة؟',
        difficulty: 'متوسط',
        rewards: '10-15 نقطة'
      }
    };

    return games[gameType] || null;
  }

  /**
   * قائمة الألعاب القرآنية
   */
  static formatGamesList() {
    let text = '🎮 <b>الألعاب القرآنية</b>\n\n';

    text += '1️⃣ 🎯 <b>تخمين الآية</b>\n';
    text += '   خمن السورة من الدليل\n\n';

    text += '2️⃣ ✍️ <b>أكمل الآية</b>\n';
    text += '   أكمل باقي الآية القرآنية\n\n';

    text += '3️⃣ 🔍 <b>اكتشف الفرق</b>\n';
    text += '   حدد الآية الصحيحة\n\n';

    text += '4️⃣ 🧠 <b>معلومات قرآنية</b>\n';
    text += '   أجب على أسئلة عن القرآن\n\n';

    text += '5️⃣ 📊 <b>عد الآيات</b>\n';
    text += '   كم عدد آيات السورة؟\n\n';

    text += '💡 <i>كل لعبة تعطيك نقاط للفوز!</i>';

    return text;
  }

  /**
   * سجل إحصائيات الألعاب
   */
  static async recordGameResult(userId, gameType, points, won) {
    try {
      const user = await User.findById(userId);
      if (!user) return false;

      user.gameStats = user.gameStats || {};
      user.gameStats[gameType] = user.gameStats[gameType] || {
        played: 0,
        won: 0,
        totalPoints: 0
      };

      user.gameStats[gameType].played++;
      if (won) {
        user.gameStats[gameType].won++;
        user.gameStats[gameType].totalPoints += points;
        user.coins += points;
      }

      await user.save();
      return true;
    } catch (error) {
      logger.error(`خطأ في تسجيل نتيجة اللعبة: ${error.message}`);
      return false;
    }
  }
}

module.exports = QuranicGames;
