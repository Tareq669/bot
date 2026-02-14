const { GameStats } = require('../database/models');
const Formatter = require('../ui/formatter');

class GameManager {
  // Rock Paper Scissors Game
  static async playRockPaperScissors(userId, userChoice) {
    const choices = ['🪨', '📄', '✂️'];
    const choiceTexts = ['حجر', 'ورق', 'مقص'];
    const idx = Math.floor(Math.random() * 3);

    const botChoice = choices[idx];
    const botText = choiceTexts[idx];

    let userIdx = -1;
    if (userChoice.includes('rock')) userIdx = 0;
    else if (userChoice.includes('paper')) userIdx = 1;
    else if (userChoice.includes('scissors')) userIdx = 2;

    const userChoiceStr = userIdx >= 0 ? choices[userIdx] : userChoice;

    const result = this.determineRPS(userIdx, idx);
    let prize = 0;

    if (result === 'win') prize = Math.floor(Math.random() * 21) + 10;

    await this.updateGameStats(userId, 'حجر_ورق_مقص', result, prize);

    return {
      playerChoice: userChoiceStr,
      botChoice: botChoice,
      result: result,
      prize: prize,
      message: `
🪨 **حجر ورق مقص**

🙂 أنت: ${userChoiceStr}
🤖 أنا: ${botChoice}

${result === 'win' ? `✅ انتصرت! +${prize} عملة` : result === 'lost' ? '❌ خسرت' : '🤝 تعادل'}
      `
    };
  }

  // Guess Number Game
  static async playGuessNumber(userId, userGuess, gameNumber) {
    let result = 'lost';
    let prize = 0;

    const userNum = parseInt(userGuess);

    if (userNum === gameNumber) {
      result = 'win';
      prize = Math.floor(Math.random() * 21) + 20;
    } else if (userNum > gameNumber) {
      return {
        result: 'playing',
        hint: '📉 الرقم أقل من اختيارك',
        prize: 0
      };
    } else {
      return {
        result: 'playing',
        hint: '📈 الرقم أكثر من اختيارك',
        prize: 0
      };
    }

    await this.updateGameStats(userId, 'التخمين', result, prize);

    return {
      gameNumber: gameNumber,
      userGuess: userNum,
      result: result,
      prize: prize,
      message: `
🎮 لعبة التخمين

🎯 الرقم: ${gameNumber}
🔢 اختيارك: ${userNum}

${Formatter.formatGameResult('أنت', result, prize)}
      `
    };
  }

  // Luck Game
  static async playLuck(userId) {
    const random = Math.random();
    let result = 'lost';
    let prize = 0;

    if (random > 0.7) {
      result = 'win';
      prize = Math.floor(Math.random() * 31) + 20;
    }

    await this.updateGameStats(userId, 'الحظ', result, prize);

    return {
      result: result,
      prize: prize,
      message: `
🎮 لعبة الحظ
${'🍀'.repeat(Math.floor(Math.random() * 10) + 1)}

${Formatter.formatGameResult('أنت', result, prize)}
      `
    };
  }

  // Quiz Game
  static async playQuiz(userId, quizData) {
    const { correctAnswer, userAnswer } = quizData;
    const result = correctAnswer === userAnswer ? 'win' : 'lost';
    const prize = result === 'win' ? 20 : 0;

    await this.updateGameStats(userId, 'اسئلة_ثقافية', result, prize);

    return {
      result: result,
      prize: prize,
      correctAnswer: correctAnswer,
      message: `
🧠 سؤال ثقافي

✅ الإجابة الصحيحة: ${correctAnswer}
📝 إجابتك: ${userAnswer}

${Formatter.formatGameResult('أنت', result, prize)}
      `
    };
  }

  // Dice Roll
  static async playDice(userId) {
    const roll = Math.floor(Math.random() * 6) + 1;
    const result = roll >= 4 ? 'win' : 'lost';
    const prize = result === 'win' ? Math.floor(Math.random() * 16) + 10 : 0;

    await this.updateGameStats(userId, 'رول_نرد', result, prize);

    return {
      roll: roll,
      result: result,
      prize: prize,
      message: `
🎲 رول النرد

🎲 النتيجة: ${roll}

${Formatter.formatGameResult('أنت', result, prize)}
      `
    };
  }

  // Helper: Determine RPS winner
  static determineRPS(userIdx, botIdx) {
    if (userIdx === botIdx) return 'draw';

    // 0 = rock, 1 = paper, 2 = scissors
    if (userIdx === 0) {
      return botIdx === 2 ? 'win' : 'lost';
    }
    if (userIdx === 1) {
      return botIdx === 0 ? 'win' : 'lost';
    }
    if (userIdx === 2) {
      return botIdx === 1 ? 'win' : 'lost';
    }

    return 'lost';
  }

  // Update game statistics
  static async updateGameStats(userId, gameName, result, prize) {
    try {
      let stats = await GameStats.findOne({ userId, gameName });

      if (!stats) {
        stats = new GameStats({
          userId,
          gameName
        });
      }

      stats.played += 1;
      if (result === 'win') {
        stats.won += 1;
        stats.coinsEarned += prize;
      } else if (result === 'lost') {
        stats.lost += 1;
      } else if (result === 'draw') {
        stats.draw += 1;
      }

      stats.xpEarned += 10;
      stats.lastPlayed = new Date();

      await stats.save();
    } catch (error) {
      console.error('Error updating game stats:', error);
    }
  }

  // Get available questions (mock data)
  static getQuizQuestions() {
    return [
      {
        question: 'كم عدد سور القرآن الكريم؟',
        options: ['٧٢', '١١٤', '١٥٢', '٢٠٠'],
        answer: '١١٤'
      },
      {
        question: 'ما هي أطول سورة في القرآن؟',
        options: ['الفاتحة', 'البقرة', 'آل عمران', 'النساء'],
        answer: 'البقرة'
      },
      {
        question: 'كم عدد أركان الإسلام؟',
        options: ['٣', '٤', '٥', '٦'],
        answer: '٥'
      },
      {
        question: 'كم عدد الصلوات المفروضة يومياً؟',
        options: ['٣', '٤', '٥', '٦'],
        answer: '٥'
      },
      {
        question: 'في أي شهر يصوم المسلمون؟',
        options: ['شعبان', 'رمضان', 'محرم', 'ذو الحجة'],
        answer: 'رمضان'
      },
      {
        question: 'ما هي قبلة المسلمين؟',
        options: ['المسجد الأقصى', 'المسجد النبوي', 'الكعبة', 'جبل أحد'],
        answer: 'الكعبة'
      },
      {
        question: 'ما أول سورة في المصحف؟',
        options: ['البقرة', 'الفاتحة', 'آل عمران', 'الناس'],
        answer: 'الفاتحة'
      },
      {
        question: 'ما آخر سورة في المصحف؟',
        options: ['الإخلاص', 'الفلق', 'الناس', 'الكوثر'],
        answer: 'الناس'
      },
      {
        question: 'كم عدد آيات سورة الفاتحة؟',
        options: ['٥', '٦', '٧', '٨'],
        answer: '٧'
      },
      {
        question: 'ما السورة التي تسمى قلب القرآن؟',
        options: ['يس', 'البقرة', 'الكهف', 'الملك'],
        answer: 'يس'
      },
      {
        question: 'ما السورة التي لا تبدأ ببسم الله؟',
        options: ['الأنفال', 'التوبة', 'الفتح', 'الحديد'],
        answer: 'التوبة'
      },
      {
        question: 'ما اسم ليلة نزول القرآن؟',
        options: ['ليلة النصف من شعبان', 'ليلة القدر', 'ليلة الإسراء', 'ليلة الجمعة'],
        answer: 'ليلة القدر'
      },
      {
        question: 'كم عدد الأشهر الحرم؟',
        options: ['٢', '٣', '٤', '٥'],
        answer: '٤'
      },
      {
        question: 'من النبي الذي ابتلعه الحوت؟',
        options: ['يونس', 'أيوب', 'إبراهيم', 'نوح'],
        answer: 'يونس'
      },
      {
        question: 'من النبي الذي كلمه الله؟',
        options: ['عيسى', 'موسى', 'محمد', 'إبراهيم'],
        answer: 'موسى'
      },
      {
        question: 'من بنى الكعبة مع ابنه؟',
        options: ['آدم', 'إبراهيم', 'نوح', 'موسى'],
        answer: 'إبراهيم'
      },
      {
        question: 'ما اسم المسجد الذي فيه الكعبة؟',
        options: ['المسجد الأقصى', 'المسجد النبوي', 'المسجد الحرام', 'مسجد قباء'],
        answer: 'المسجد الحرام'
      },
      {
        question: 'أين يقع المسجد الأقصى؟',
        options: ['مكة', 'المدينة', 'القدس', 'الطائف'],
        answer: 'القدس'
      },
      {
        question: 'ما أول ما نزل من القرآن؟',
        options: ['الفاتحة', 'اقرأ', 'المدثر', 'المزمل'],
        answer: 'اقرأ'
      },
      {
        question: 'كم عدد أبواب الجنة؟',
        options: ['٦', '٧', '٨', '٩'],
        answer: '٨'
      },
      {
        question: 'كم عدد أبواب النار؟',
        options: ['٥', '٦', '٧', '٨'],
        answer: '٧'
      },
      {
        question: 'ما المدينة التي هاجر إليها النبي ﷺ؟',
        options: ['الطائف', 'المدينة المنورة', 'خَيْبر', 'تبوك'],
        answer: 'المدينة المنورة'
      },
      {
        question: 'من أول الخلفاء الراشدين؟',
        options: ['عمر', 'عثمان', 'علي', 'أبو بكر'],
        answer: 'أبو بكر'
      }
      }
    ];
  }
}

module.exports = GameManager;
