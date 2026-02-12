const { GameStats } = require('../database/models');
const Formatter = require('../ui/formatter');
const LanguageManager = require('../utils/languageManager');

const languageManager = global.languageManager || new LanguageManager();
global.languageManager = languageManager;

class GameManager {
  // Rock Paper Scissors Game
  static async playRockPaperScissors(userId, userChoice) {
    const language = await languageManager.getUserLanguage(userId);
    const choices = ['🪨', '📄', '✂️'];
    const choiceTexts = language === 'en' ? ['Rock', 'Paper', 'Scissors'] : ['حجر', 'ورق', 'مقص'];
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

    if (result === 'win') prize = Math.floor(Math.random() * 100) + 50;

    await this.updateGameStats(userId, 'حجر_ورق_مقص', result, prize);

    return {
      playerChoice: userChoiceStr,
      botChoice: botChoice,
      result: result,
      prize: prize,
      message: `
${await languageManager.tForUser(userId, 'game_rps_title')}

${await languageManager.tForUser(userId, 'rps_you_label')} ${userChoiceStr}
${await languageManager.tForUser(userId, 'rps_bot_label')} ${botChoice}

${result === 'win'
  ? await languageManager.tForUser(userId, 'rps_win_line', { prize })
  : result === 'lost'
    ? await languageManager.tForUser(userId, 'rps_loss_line')
    : await languageManager.tForUser(userId, 'rps_draw_line')}
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
      prize = Math.floor(Math.random() * 200) + 100;
    } else if (userNum > gameNumber) {
      return {
        result: 'playing',
        hint: await languageManager.tForUser(userId, 'guess_hint_lower'),
        prize: 0
      };
    } else {
      return {
        result: 'playing',
        hint: await languageManager.tForUser(userId, 'guess_hint_higher'),
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
${await languageManager.tForUser(userId, 'guess_result_title')}

${await languageManager.tForUser(userId, 'guess_number_label')} ${gameNumber}
${await languageManager.tForUser(userId, 'guess_choice_label')} ${userNum}

${Formatter.formatGameResult(
  await languageManager.tForUser(userId, 'you_name'),
  result,
  prize,
  (await languageManager.getTranslationsForUser(userId)).translations
)}
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
      prize = Math.floor(Math.random() * 500) + 200;
    }

    await this.updateGameStats(userId, 'الحظ', result, prize);

    return {
      result: result,
      prize: prize,
      message: `
${await languageManager.tForUser(userId, 'luck_title')}
${'🍀'.repeat(Math.floor(Math.random() * 10) + 1)}

${Formatter.formatGameResult(
  await languageManager.tForUser(userId, 'you_name'),
  result,
  prize,
  (await languageManager.getTranslationsForUser(userId)).translations
)}
      `
    };
  }

  // Quiz Game
  static async playQuiz(userId, quizData) {
    const { correctAnswer, userAnswer } = quizData;
    const result = correctAnswer === userAnswer ? 'win' : 'lost';
    const prize = result === 'win' ? 100 : 0;

    await this.updateGameStats(userId, 'اسئلة_ثقافية', result, prize);

    return {
      result: result,
      prize: prize,
      correctAnswer: correctAnswer,
      message: `
${await languageManager.tForUser(userId, 'game_quiz_title')}

${await languageManager.tForUser(userId, 'game_quiz_correct')} ${correctAnswer}
${await languageManager.tForUser(userId, 'game_quiz_answer')} ${userAnswer}

${Formatter.formatGameResult(
  await languageManager.tForUser(userId, 'you_name'),
  result,
  prize,
  (await languageManager.getTranslationsForUser(userId)).translations
)}
      `
    };
  }

  // Dice Roll
  static async playDice(userId) {
    const roll = Math.floor(Math.random() * 6) + 1;
    const result = roll >= 4 ? 'win' : 'lost';
    const prize = result === 'win' ? Math.floor(Math.random() * 150) + 50 : 0;

    await this.updateGameStats(userId, 'رول_نرد', result, prize);

    return {
      roll: roll,
      result: result,
      prize: prize,
      message: `
${await languageManager.tForUser(userId, 'dice_title')}

${await languageManager.tForUser(userId, 'dice_result_label')} ${roll}

${Formatter.formatGameResult(
  await languageManager.tForUser(userId, 'you_name'),
  result,
  prize,
  (await languageManager.getTranslationsForUser(userId)).translations
)}
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
  static getQuizQuestions(languageCode = 'ar') {
    if (languageCode === 'en') {
      return [
        {
          question: 'How many chapters are in the Quran?',
          options: ['72', '114', '152', '200'],
          answer: '114'
        },
        {
          question: 'What is the longest chapter in the Quran?',
          options: ['Al-Fatiha', 'Al-Baqarah', 'Al Imran', 'An-Nisa'],
          answer: 'Al-Baqarah'
        },
        {
          question: 'How many pillars of Islam are there?',
          options: ['3', '4', '5', '6'],
          answer: '5'
        }
      ];
    }

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
      }
    ];
  }
}

module.exports = GameManager;
