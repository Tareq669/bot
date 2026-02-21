const GameManager = require('../games/gameManager');
const EconomyManager = require('../economy/economyManager');
const QuranicGames = require('../games/quranicGames');
const Formatter = require('../ui/formatter');
const Markup = require('telegraf/markup');

const BOMB_QUESTIONS = [
  {
    question: 'Ã™â€¦Ã˜Â§ Ã™â€ Ã˜Â§Ã˜ÂªÃ˜Â¬ 7 + 8 Ã˜Å¸',
    options: ['13', '14', '15', '16'],
    correctIndex: 2
  },
  {
    question: 'Ã™Æ’Ã™â€¦ Ã˜Â¹Ã˜Â¯Ã˜Â¯ Ã˜Â­Ã˜Â±Ã™Ë†Ã™Â Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â© "Ã˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡"Ã˜Å¸',
    options: ['3', '4', '5', '6'],
    correctIndex: 1
  },
  {
    question: 'Ã˜Â£Ã™Å  Ã™Æ’Ã™Ë†Ã™Æ’Ã˜Â¨ Ã™Å Ã™ÂÃ˜Â¹Ã˜Â±Ã™Â Ã˜Â¨Ã˜Â§Ã™â€žÃ™Æ’Ã™Ë†Ã™Æ’Ã˜Â¨ Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â­Ã™â€¦Ã˜Â±Ã˜Å¸',
    options: ['Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â´Ã˜ÂªÃ˜Â±Ã™Å ', 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã™Å Ã˜Â®', 'Ã˜Â¹Ã˜Â·Ã˜Â§Ã˜Â±Ã˜Â¯', 'Ã˜Â§Ã™â€žÃ˜Â²Ã™â€¡Ã˜Â±Ã˜Â©'],
    correctIndex: 1
  },
  {
    question: 'Ã™â€¦Ã˜Â§ Ã˜Â¹Ã™Æ’Ã˜Â³ Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â© "Ã˜Â³Ã˜Â±Ã™Å Ã˜Â¹"Ã˜Å¸',
    options: ['Ã™â€šÃ™Ë†Ã™Å ', 'Ã˜Â¶Ã˜Â¹Ã™Å Ã™Â', 'Ã˜Â¨Ã˜Â·Ã™Å Ã˜Â¡', 'Ã˜ÂµÃ˜ÂºÃ™Å Ã˜Â±'],
    correctIndex: 2
  },
  {
    question: 'Ã™Æ’Ã™â€¦ Ã˜Â«Ã˜Â§Ã™â€ Ã™Å Ã˜Â© Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜Â¯Ã™â€šÃ™Å Ã™â€šÃ˜Â©Ã˜Å¸',
    options: ['30', '45', '60', '90'],
    correctIndex: 2
  }
];

const MIND_PUZZLES = [
  {
    question: 'Ã˜Â´Ã™Å Ã˜Â¡ Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â§ Ã˜Â£Ã˜Â®Ã˜Â°Ã˜Âª Ã™â€¦Ã™â€ Ã™â€¡ Ã™Æ’Ã˜Â¨Ã˜Â±Ã˜Å’ Ã™â€¦Ã˜Â§ Ã™â€¡Ã™Ë†Ã˜Å¸',
    options: ['Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â­Ã˜Â±', 'Ã˜Â§Ã™â€žÃ˜Â­Ã™ÂÃ˜Â±Ã˜Â©', 'Ã˜Â§Ã™â€žÃ˜Â¬Ã˜Â¨Ã™â€ž', 'Ã˜Â§Ã™â€žÃ™â€ Ã™Ë†Ã˜Â±'],
    correctIndex: 1,
    explanation: 'Ã˜Â§Ã™â€žÃ˜Â­Ã™ÂÃ˜Â±Ã˜Â© Ã˜ÂªÃ™Æ’Ã˜Â¨Ã˜Â± Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â§ Ã˜Â£Ã˜Â®Ã˜Â°Ã˜Âª Ã™â€¦Ã™â€ Ã™â€¡Ã˜Â§.'
  },
  {
    question: 'Ã˜Â±Ã™â€šÃ™â€¦ Ã˜Â¥Ã˜Â°Ã˜Â§ Ã˜Â¶Ã˜Â±Ã˜Â¨Ã˜ÂªÃ™â€¡ Ã™ÂÃ™Å  Ã™â€ Ã™ÂÃ˜Â³Ã™â€¡ Ã™Æ’Ã˜Â§Ã™â€  81Ã˜Å’ Ã™â€¦Ã˜Â§ Ã™â€¡Ã™Ë†Ã˜Å¸',
    options: ['7', '8', '9', '10'],
    correctIndex: 2,
    explanation: '9 Ãƒâ€” 9 = 81'
  },
  {
    question: 'Ã˜Â¥Ã˜Â°Ã˜Â§ Ã™Æ’Ã˜Â§Ã™â€  Ã˜Â§Ã™â€žÃ™Å Ã™Ë†Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â«Ã™â€ Ã™Å Ã™â€ Ã˜Å’ Ã™ÂÃ™â€¦Ã˜Â§ Ã˜Â§Ã™â€žÃ™Å Ã™Ë†Ã™â€¦ Ã˜Â¨Ã˜Â¹Ã˜Â¯ 10 Ã˜Â£Ã™Å Ã˜Â§Ã™â€¦Ã˜Å¸',
    options: ['Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â±Ã˜Â¨Ã˜Â¹Ã˜Â§Ã˜Â¡', 'Ã˜Â§Ã™â€žÃ˜Â®Ã™â€¦Ã™Å Ã˜Â³', 'Ã˜Â§Ã™â€žÃ˜Â¬Ã™â€¦Ã˜Â¹Ã˜Â©', 'Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â¨Ã˜Âª'],
    correctIndex: 1,
    explanation: '10 Ã˜Â£Ã™Å Ã˜Â§Ã™â€¦ = Ã˜Â£Ã˜Â³Ã˜Â¨Ã™Ë†Ã˜Â¹ + 3 Ã˜Â£Ã™Å Ã˜Â§Ã™â€¦Ã˜Å’ Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â«Ã™â€ Ã™Å Ã™â€  + 3 = Ã˜Â§Ã™â€žÃ˜Â®Ã™â€¦Ã™Å Ã˜Â³.'
  },
  {
    question: 'Ã˜Â£Ã™Å Ã™â€¡Ã™â€¦ Ã™â€žÃ˜Â§ Ã™Å Ã™â€ Ã˜ÂªÃ™â€¦Ã™Å : Ã˜ÂªÃ™ÂÃ˜Â§Ã˜Â­Ã˜Å’ Ã™â€¦Ã™Ë†Ã˜Â²Ã˜Å’ Ã˜Â¬Ã˜Â²Ã˜Â±Ã˜Å’ Ã˜Â¹Ã™â€ Ã˜Â¨Ã˜Å¸',
    options: ['Ã˜ÂªÃ™ÂÃ˜Â§Ã˜Â­', 'Ã™â€¦Ã™Ë†Ã˜Â²', 'Ã˜Â¬Ã˜Â²Ã˜Â±', 'Ã˜Â¹Ã™â€ Ã˜Â¨'],
    correctIndex: 2,
    explanation: 'Ã˜Â§Ã™â€žÃ˜Â¬Ã˜Â²Ã˜Â± Ã˜Â®Ã˜Â¶Ã˜Â§Ã˜Â± Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â§Ã™â€šÃ™Å  Ã™ÂÃ™Ë†Ã˜Â§Ã™Æ’Ã™â€¡.'
  },
  {
    question: 'Ã™â€¦Ã˜Â§ Ã˜Â§Ã™â€žÃ˜Â¹Ã˜Â¯Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â§Ã™â€žÃ™Å  Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ™â€ Ã™â€¦Ã˜Â·: 2Ã˜Å’ 4Ã˜Å’ 8Ã˜Å’ 16Ã˜Å’ Ã˜Å¸',
    options: ['18', '24', '30', '32'],
    correctIndex: 3,
    explanation: 'Ã˜Â§Ã™â€žÃ™â€ Ã™â€¦Ã˜Â· Ã™Å Ã˜ÂªÃ˜Â¶Ã˜Â§Ã˜Â¹Ã™Â Ã™Æ’Ã™â€ž Ã™â€¦Ã˜Â±Ã˜Â©.'
  }
];

const CARD_POOL = [
  { name: 'Ã™â€¦Ã˜Â­Ã˜Â§Ã˜Â±Ã˜Â¨ Ã˜Â§Ã™â€žÃ˜Â±Ã™â€¦Ã™â€ž', attack: 11, defense: 8, rarity: 'common', emoji: 'Ã¢Å¡â€Ã¯Â¸Â' },
  { name: 'Ã˜Â­Ã˜Â§Ã˜Â±Ã˜Â³ Ã˜Â§Ã™â€žÃ™â€šÃ™â€žÃ˜Â¹Ã˜Â©', attack: 9, defense: 12, rarity: 'common', emoji: 'Ã°Å¸â€ºÂ¡Ã¯Â¸Â' },
  { name: 'Ã˜Â³Ã™â€¡Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â±Ã™â€š', attack: 13, defense: 7, rarity: 'common', emoji: 'Ã°Å¸ÂÂ¹' },
  { name: 'Ã™ÂÃ˜Â§Ã˜Â±Ã˜Â³ Ã˜Â§Ã™â€žÃ™â€žÃ™Å Ã™â€ž', attack: 15, defense: 10, rarity: 'rare', emoji: 'Ã°Å¸Å’â„¢' },
  { name: 'Ã˜Â¹Ã™Å Ã™â€  Ã˜Â§Ã™â€žÃ˜ÂµÃ™â€šÃ˜Â±', attack: 16, defense: 9, rarity: 'rare', emoji: 'Ã°Å¸Â¦â€¦' },
  { name: 'Ã˜Â¯Ã˜Â±Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¹Ã˜Â§Ã˜ÂµÃ™ÂÃ˜Â©', attack: 12, defense: 15, rarity: 'rare', emoji: 'Ã°Å¸Å’Â©Ã¯Â¸Â' },
  { name: 'Ã˜ÂªÃ™â€ Ã™Å Ã™â€  Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â³Ã˜Â§Ã˜Â·Ã™Å Ã˜Â±', attack: 19, defense: 16, rarity: 'legendary', emoji: 'Ã°Å¸Ââ€°' },
  { name: 'Ã™â€¦Ã™â€žÃ™Æ’ Ã˜Â§Ã™â€žÃ˜Â¹Ã™Ë†Ã˜Â§Ã˜ÂµÃ™Â', attack: 20, defense: 15, rarity: 'legendary', emoji: 'Ã°Å¸â€˜â€˜' }
];

const CARD_RARITY = {
  common: { label: 'Ã˜Â¹Ã˜Â§Ã˜Â¯Ã™Å ', emoji: 'Ã°Å¸Å¸Â¦', powerBonus: 0 },
  rare: { label: 'Ã™â€ Ã˜Â§Ã˜Â¯Ã˜Â±', emoji: 'Ã°Å¸Å¸Â¨', powerBonus: 2 },
  legendary: { label: 'Ã˜Â£Ã˜Â³Ã˜Â·Ã™Ë†Ã˜Â±Ã™Å ', emoji: 'Ã°Å¸Å¸Â¥', powerBonus: 5 }
};

class GameHandler {
  static bombTimers = new Map();

  static getRandomItem(items = []) {
    if (!Array.isArray(items) || items.length === 0) return null;
    return items[Math.floor(Math.random() * items.length)];
  }

  static clearBombTimer(userId) {
    const timer = this.bombTimers.get(userId);
    if (!timer) return;
    clearTimeout(timer.timeout);
    clearInterval(timer.interval);
    this.bombTimers.delete(userId);
  }

  static formatBombMessage(question, secondsLeft) {
    return (
      'Ã°Å¸â€™Â£ <b>Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â© Ã˜ÂªÃ™ÂÃ™Æ’Ã™Å Ã™Æ’ Ã˜Â§Ã™â€žÃ™â€šÃ™â€ Ã˜Â¨Ã™â€žÃ˜Â©</b>\n\n' +
      `Ã¢ÂÂ³ Ã˜Â§Ã™â€žÃ™Ë†Ã™â€šÃ˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â¨Ã™â€šÃ™Å : <b>${secondsLeft}</b> Ã˜Â«Ã˜Â§Ã™â€ Ã™Å Ã˜Â©\n` +
      'Ã¢Å¡Â Ã¯Â¸Â Ã˜Â£Ã˜Â¬Ã˜Â¨ Ã˜Â¨Ã˜Â³Ã˜Â±Ã˜Â¹Ã˜Â© Ã™â€šÃ˜Â¨Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â§Ã™â€ Ã™ÂÃ˜Â¬Ã˜Â§Ã˜Â±!\n\n' +
      `<b>Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â¤Ã˜Â§Ã™â€ž:</b>\n${question.question}`
    );
  }

  static drawCards(count = 3) {
    const cards = [];
    for (let i = 0; i < count; i += 1) {
      const picked = this.getRandomItem(CARD_POOL);
      cards.push({ ...picked });
    }
    return cards;
  }

  static calcCardPower(card) {
    const rarity = CARD_RARITY[card.rarity] || CARD_RARITY.common;
    const variance = Math.floor(Math.random() * 5) - 2; // -2 to +2
    return card.attack + card.defense + rarity.powerBonus + variance;
  }

  static async handleRPS(ctx) {
    const buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback('Ã°Å¸ÂªÂ¨ Ã˜Â­Ã˜Â¬Ã˜Â±', 'game:rps:rock'),
        Markup.button.callback('Ã°Å¸â€œâ€ž Ã™Ë†Ã˜Â±Ã™â€š', 'game:rps:paper'),
        Markup.button.callback('Ã¢Å“â€šÃ¯Â¸Â Ã™â€¦Ã™â€šÃ˜Âµ', 'game:rps:scissors')
      ],
      [Markup.button.callback('Ã¢Â¬â€¦Ã¯Â¸Â Ã˜Â±Ã˜Â¬Ã™Ë†Ã˜Â¹', 'menu:games')]
    ]);

    await ctx.editMessageText('Ã°Å¸ÂªÂ¨ Ã˜Â­Ã˜Â¬Ã˜Â± Ã™Ë†Ã˜Â±Ã™â€š Ã™â€¦Ã™â€šÃ˜Âµ\n\nÃ˜Â§Ã˜Â®Ã˜ÂªÃ˜Â± Ã˜Â§Ã˜Â®Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â±Ã™Æ’:', buttons);
  }

  static async handleRPSChoice(ctx, choice) {
    try {
      const result = await GameManager.playRockPaperScissors(ctx.from.id, choice);
      const message = result.message;

      // Add coins if won
      if (result.result === 'win') {
        await EconomyManager.addCoins(ctx.from.id, result.prize, 'Ã™ÂÃ™Ë†Ã˜Â² Ã™ÂÃ™Å  Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â©');
      }

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('Ã°Å¸â€â€ž Ã™â€žÃ˜Â¹Ã˜Â¨ Ã™â€¦Ã˜Â±Ã˜Â© Ã˜Â£Ã˜Â®Ã˜Â±Ã™â€°', 'game:rps')],
        [Markup.button.callback('Ã¢Â¬â€¦Ã¯Â¸Â Ã˜Â±Ã˜Â¬Ã™Ë†Ã˜Â¹', 'menu:games')]
      ]);

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      // Ã˜ÂªÃ˜Â¬Ã˜Â§Ã™â€¡Ã™â€ž Ã˜Â®Ã˜Â·Ã˜Â£ "message is not modified"
      if (error.response?.error_code !== 400 || !error.response?.description?.includes('message is not modified')) {
        console.error('Error:', error);
        ctx.reply('Ã¢ÂÅ’ Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£');
      }
    }
  }

  static async handleGuess(ctx) {
    const GuessNumberGame = require('../games/guessNumberGame');
    await GuessNumberGame.startGame(ctx);
  }

  static async handleQuiz(ctx) {
    try {
      // Initialize session if needed
      ctx.session = ctx.session || {};
      const questions = GameManager.getQuizQuestions();
      const question = questions[Math.floor(Math.random() * questions.length)];

      ctx.session.gameState = {
        game: 'quiz',
        correct: question.answer
      };

      const buttons = Markup.inlineKeyboard(
        question.options.map(option => [
          Markup.button.callback(option, `game:quiz:${option}`)
        ])
      );

      const message = `Ã°Å¸Â§Â  Ã˜Â³Ã˜Â¤Ã˜Â§Ã™â€ž Ã˜Â«Ã™â€šÃ˜Â§Ã™ÂÃ™Å \n\n${question.question}`;

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      // Ã˜ÂªÃ˜Â¬Ã˜Â§Ã™â€¡Ã™â€ž Ã˜Â®Ã˜Â·Ã˜Â£ "message is not modified" Ã˜Â­Ã™Å Ã˜Â« Ã™Å Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â¹Ã™â€ Ã˜Â¯ Ã˜Â§Ã˜Â®Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â± Ã™â€ Ã™ÂÃ˜Â³ Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â¤Ã˜Â§Ã™â€ž
      if (error.response?.error_code !== 400 || !error.response?.description?.includes('message is not modified')) {
        console.error('Error:', error);
        ctx.reply('Ã¢ÂÅ’ Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£');
      }
    }
  }

  static async handleQuizAnswer(ctx, answer) {
    try {
      // Initialize session if needed
      ctx.session = ctx.session || {};
      const correct = ctx.session.gameState?.correct;
      const result = answer === correct ? 'win' : 'lost';
      const prize = result === 'win' ? 20 : 0;

      await GameManager.updateGameStats(ctx.from.id, 'Ã˜Â§Ã˜Â³Ã˜Â¦Ã™â€žÃ˜Â©_Ã˜Â«Ã™â€šÃ˜Â§Ã™ÂÃ™Å Ã˜Â©', result, prize);

      if (prize > 0) {
        await EconomyManager.addCoins(ctx.from.id, prize, 'Ã˜Â¥Ã˜Â¬Ã˜Â§Ã˜Â¨Ã˜Â© Ã˜ÂµÃ˜Â­Ã™Å Ã˜Â­Ã˜Â©');
      }

      const message = `
    Ã°Å¸Â§Â  Ã˜Â³Ã˜Â¤Ã˜Â§Ã™â€ž Ã˜Â«Ã™â€šÃ˜Â§Ã™ÂÃ™Å 

    Ã¢Å“â€¦ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â§Ã˜Â¨Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂµÃ˜Â­Ã™Å Ã˜Â­Ã˜Â©: ${correct}
    Ã°Å¸â€œÂ Ã˜Â¥Ã˜Â¬Ã˜Â§Ã˜Â¨Ã˜ÂªÃ™Æ’: ${answer}

    ${Formatter.formatGameResult('Ã˜Â£Ã™â€ Ã˜Âª', result, prize)}
      `;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('Ã°Å¸â€â€ž Ã˜Â³Ã˜Â¤Ã˜Â§Ã™â€ž Ã˜Â¢Ã˜Â®Ã˜Â±', 'game:quiz')],
        [Markup.button.callback('Ã¢Â¬â€¦Ã¯Â¸Â Ã˜Â±Ã˜Â¬Ã™Ë†Ã˜Â¹', 'menu:games')]
      ]);

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      // Ã˜ÂªÃ˜Â¬Ã˜Â§Ã™â€¡Ã™â€ž Ã˜Â®Ã˜Â·Ã˜Â£ "message is not modified"
      if (error.response?.error_code !== 400 || !error.response?.description?.includes('message is not modified')) {
        console.error('Error:', error);
        ctx.reply('Ã¢ÂÅ’ Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£');
      }
    }
  }

  static async handleDice(ctx) {
    try {
      const result = await GameManager.playDice(ctx.from.id);

      if (result.result === 'win') {
        await EconomyManager.addCoins(ctx.from.id, result.prize, 'Ã™ÂÃ™Ë†Ã˜Â² Ã™ÂÃ™Å  Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â© Ã˜Â§Ã™â€žÃ™â€ Ã˜Â±Ã˜Â¯');
      }

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('Ã°Å¸â€â€ž Ã˜Â±Ã™Ë†Ã™â€ž Ã˜Â¢Ã˜Â®Ã˜Â±', 'game:dice')],
        [Markup.button.callback('Ã¢Â¬â€¦Ã¯Â¸Â Ã˜Â±Ã˜Â¬Ã™Ë†Ã˜Â¹', 'menu:games')]
      ]);

      await ctx.editMessageText(result.message, buttons);
    } catch (error) {
      // Ã˜ÂªÃ˜Â¬Ã˜Â§Ã™â€¡Ã™â€ž Ã˜Â®Ã˜Â·Ã˜Â£ "message is not modified" Ã˜Â­Ã™Å Ã˜Â« Ã™Å Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â¹Ã™â€ Ã˜Â¯ Ã˜Â±Ã™â€¦Ã™Å  Ã™â€ Ã™ÂÃ˜Â³ Ã˜Â§Ã™â€žÃ˜Â±Ã™â€šÃ™â€¦
      if (error.response?.error_code !== 400 || !error.response?.description?.includes('message is not modified')) {
        console.error('Error:', error);
        ctx.reply('Ã¢ÂÅ’ Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£');
      }
    }
  }

  static async handleLuck(ctx) {
    try {
      const { User } = require('../database/models');
      const user = await User.findOne({ userId: ctx.from.id });

      const isSuccess = Math.random() > 0.5;
      const reward = isSuccess ? Math.floor(Math.random() * 31) + 10 : 0; // 10-40

      if (isSuccess && user) {
        user.coins += reward;
        user.xp += 5;
        await user.save();
      }

      const message = isSuccess
        ? `Ã°Å¸Ââ‚¬ <b>Ã˜Â­Ã˜Â¸ Ã˜Â³Ã˜Â¹Ã™Å Ã˜Â¯!</b> Ã°Å¸Å½â€°\n\nÃ¢Å“Â¨ Ã™â€žÃ™â€šÃ˜Â¯ Ã™ÂÃ˜Â²Ã˜Âª Ã˜Â¨Ã™â‚¬ <b>${reward}</b> Ã˜Â¹Ã™â€¦Ã™â€žÃ˜Â©!\nÃ°Å¸â€™Â° Ã˜Â±Ã˜ÂµÃ™Å Ã˜Â¯Ã™Æ’ Ã˜Â§Ã™â€žÃ˜Â¢Ã™â€ : ${user.coins}`
        : 'Ã°Å¸Ââ‚¬ <b>Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â¸</b>\n\nÃ°Å¸Ëœâ€ Ã™â€žÃ™â€¦ Ã™Å Ã˜Â­Ã˜Â§Ã™â€žÃ™ÂÃ™Æ’ Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â¸ Ã™â€¡Ã˜Â°Ã™â€¡ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã˜Â©\nÃ˜Â­Ã˜Â§Ã™Ë†Ã™â€ž Ã™â€¦Ã˜Â±Ã˜Â© Ã˜Â£Ã˜Â®Ã˜Â±Ã™â€°!';

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('Ã°Å¸â€â€ž Ã˜Â­Ã˜Â§Ã™Ë†Ã™â€ž Ã™â€¦Ã˜Â±Ã˜Â© Ã˜Â£Ã˜Â®Ã˜Â±Ã™â€°', 'game:luck')],
        [Markup.button.callback('Ã¢Â¬â€¦Ã¯Â¸Â Ã˜Â±Ã˜Â¬Ã™Ë†Ã˜Â¹', 'menu:games')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
    } catch (error) {
      // Ã˜ÂªÃ˜Â¬Ã˜Â§Ã™â€¡Ã™â€ž Ã˜Â®Ã˜Â·Ã˜Â£ "message is not modified" Ã˜Â­Ã™Å Ã˜Â« Ã™Å Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â¹Ã™â€ Ã˜Â¯ Ã˜Â§Ã˜Â®Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â± Ã™â€ Ã™ÂÃ˜Â³ Ã˜Â§Ã™â€žÃ™â€ Ã˜ÂªÃ™Å Ã˜Â¬Ã˜Â©
      if (error.response?.error_code !== 400 || !error.response?.description?.includes('message is not modified')) {
        console.error('Error in handleLuck:', error);
        ctx.reply('Ã¢ÂÅ’ Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£');
      }
    }
  }

  static async handleChallenges(ctx) {
    try {
      const challenges = [
        'Ã°Å¸ÂÆ’ Ã˜Â§Ã™â€¦Ã˜Â´Ã™Â 10,000 Ã˜Â®Ã˜Â·Ã™Ë†Ã˜Â© Ã˜Â§Ã™â€žÃ™Å Ã™Ë†Ã™â€¦ - Ã™â€¦Ã™Æ’Ã˜Â§Ã™ÂÃ˜Â£Ã˜Â©: 40 Ã˜Â¹Ã™â€¦Ã™â€žÃ˜Â©',
        'Ã°Å¸â€œâ€“ Ã˜Â§Ã™â€šÃ˜Â±Ã˜Â£ 5 Ã˜ÂµÃ™ÂÃ˜Â­Ã˜Â§Ã˜Âª Ã™â€¦Ã™â€  Ã˜Â§Ã™â€žÃ™â€šÃ˜Â±Ã˜Â¢Ã™â€  - Ã™â€¦Ã™Æ’Ã˜Â§Ã™ÂÃ˜Â£Ã˜Â©: 50 Ã˜Â¹Ã™â€¦Ã™â€žÃ˜Â©',
        'Ã°Å¸Å½Â® Ã˜Â§Ã™â€žÃ˜Â¹Ã˜Â¨ 3 Ã˜Â£Ã™â€žÃ˜Â¹Ã˜Â§Ã˜Â¨ Ã™â€¦Ã˜Â®Ã˜ÂªÃ™â€žÃ™ÂÃ˜Â© - Ã™â€¦Ã™Æ’Ã˜Â§Ã™ÂÃ˜Â£Ã˜Â©: 30 Ã˜Â¹Ã™â€¦Ã™â€žÃ˜Â©',
        'Ã°Å¸â€™Â° Ã˜Â§Ã˜Â¬Ã™â€¦Ã˜Â¹ 500 Ã˜Â¹Ã™â€¦Ã™â€žÃ˜Â© - Ã™â€¦Ã™Æ’Ã˜Â§Ã™ÂÃ˜Â£Ã˜Â©: 30 Ã˜Â¹Ã™â€¦Ã™â€žÃ˜Â© Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ™Å Ã˜Â©',
        'Ã°Å¸Â¤Â Ã˜Â´Ã˜Â§Ã˜Â±Ã™Æ’ Ã˜Â§Ã™â€žÃ˜Â¨Ã™Ë†Ã˜Âª Ã™â€¦Ã˜Â¹ 3 Ã˜Â£Ã˜ÂµÃ˜Â¯Ã™â€šÃ˜Â§Ã˜Â¡ - Ã™â€¦Ã™Æ’Ã˜Â§Ã™ÂÃ˜Â£Ã˜Â©: 60 Ã˜Â¹Ã™â€¦Ã™â€žÃ˜Â©',
        'Ã¢Â­Â Ã˜Â§Ã™Æ’Ã˜Â³Ã˜Â¨ 100 Ã™â€ Ã™â€šÃ˜Â·Ã˜Â© Ã˜Â®Ã˜Â¨Ã˜Â±Ã˜Â© - Ã™â€¦Ã™Æ’Ã˜Â§Ã™ÂÃ˜Â£Ã˜Â©: 40 Ã˜Â¹Ã™â€¦Ã™â€žÃ˜Â©',
        'Ã°Å¸â€œÂ¿ Ã˜Â§Ã™â€šÃ˜Â±Ã˜Â£ Ã˜Â£Ã˜Â°Ã™Æ’Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ˜ÂµÃ˜Â¨Ã˜Â§Ã˜Â­ Ã™Ë†Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜Â§Ã˜Â¡ - Ã™â€¦Ã™Æ’Ã˜Â§Ã™ÂÃ˜Â£Ã˜Â©: 50 Ã˜Â¹Ã™â€¦Ã™â€žÃ˜Â©'
      ];

      const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];

      const message = `Ã°Å¸Å½Â¯ <b>Ã˜ÂªÃ˜Â­Ã˜Â¯Ã™Å Ã™Æ’ Ã˜Â§Ã™â€žÃ™Å Ã™Ë†Ã™â€¦Ã™Å </b>\n\n${randomChallenge}\n\nÃ°Å¸â€™Â¡ Ã˜Â£Ã™Æ’Ã™â€¦Ã™â€ž Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã˜Â¯Ã™Å  Ã™â€žÃ™â€žÃ˜Â­Ã˜ÂµÃ™Ë†Ã™â€ž Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ™â€¦Ã™Æ’Ã˜Â§Ã™ÂÃ˜Â£Ã˜Â©!`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('Ã°Å¸â€â€ž Ã˜ÂªÃ˜Â­Ã˜Â¯Ã™Å  Ã˜Â¢Ã˜Â®Ã˜Â±', 'game:challenges')],
        [Markup.button.callback('Ã¢Å“â€¦ Ã˜Â£Ã™Æ’Ã™â€¦Ã™â€žÃ˜Âª', 'challenge:complete')],
        [Markup.button.callback('Ã¢Â¬â€¦Ã¯Â¸Â Ã˜Â±Ã˜Â¬Ã™Ë†Ã˜Â¹', 'menu:games')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
    } catch (error) {
      // Ã˜ÂªÃ˜Â¬Ã˜Â§Ã™â€¡Ã™â€ž Ã˜Â®Ã˜Â·Ã˜Â£ "message is not modified" Ã˜Â­Ã™Å Ã˜Â« Ã™Å Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â¹Ã™â€ Ã˜Â¯ Ã˜Â§Ã˜Â®Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â± Ã™â€ Ã™ÂÃ˜Â³ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã˜Â¯Ã™Å 
      if (error.response?.error_code !== 400 || !error.response?.description?.includes('message is not modified')) {
        console.error('Error in handleChallenges:', error);
        ctx.reply('Ã¢ÂÅ’ Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£');
      }
    }
  }

  static async handleBombDefuse(ctx) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();

      ctx.session = ctx.session || {};
      const question = this.getRandomItem(BOMB_QUESTIONS);
      if (!question) {
        return ctx.reply('Ã¢ÂÅ’ Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã˜Â£Ã˜Â³Ã˜Â¦Ã™â€žÃ˜Â© Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â­Ã˜Â© Ã˜Â­Ã˜Â§Ã™â€žÃ™Å Ã˜Â§Ã™â€¹');
      }

      this.clearBombTimer(ctx.from.id);

      const baseReward = Math.floor(Math.random() * 16) + 15; // 15-30
      const endAt = Date.now() + 10_000;
      ctx.session.bombGame = {
        active: true,
        question,
        correctIndex: question.correctIndex,
        baseReward,
        endAt
      };

      const optionsRows = question.options.map((option, index) => [
        Markup.button.callback(option, `game:bomb:ans:${index}`)
      ]);
      optionsRows.push([Markup.button.callback('Ã¢Â¬â€¦Ã¯Â¸Â Ã˜Â±Ã˜Â¬Ã™Ë†Ã˜Â¹', 'menu:games')]);
      const keyboard = Markup.inlineKeyboard(optionsRows);

      await ctx.editMessageText(this.formatBombMessage(question, 10), {
        parse_mode: 'HTML',
        reply_markup: keyboard.reply_markup
      });

      const chatId = ctx.callbackQuery?.message?.chat?.id;
      const messageId = ctx.callbackQuery?.message?.message_id;

      const interval = setInterval(async () => {
        const state = ctx.session?.bombGame;
        if (!state || !state.active) {
          return this.clearBombTimer(ctx.from.id);
        }

        const secondsLeft = Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000));
        if (secondsLeft <= 0) return;

        if (chatId && messageId) {
          try {
            await ctx.telegram.editMessageText(
              chatId,
              messageId,
              undefined,
              this.formatBombMessage(state.question, secondsLeft),
              {
                parse_mode: 'HTML',
                reply_markup: keyboard.reply_markup
              }
            );
          } catch (_error) {
            // ignore message update errors
          }
        }
      }, 1000);

      const timeout = setTimeout(async () => {
        await this.handleBombTimeout(ctx, chatId, messageId);
      }, 10_000);

      this.bombTimers.set(ctx.from.id, { interval, timeout });
    } catch (error) {
      console.error('Error in handleBombDefuse:', error);
      ctx.reply('Ã¢ÂÅ’ Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£ Ã™ÂÃ™Å  Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â© Ã˜ÂªÃ™ÂÃ™Æ’Ã™Å Ã™Æ’ Ã˜Â§Ã™â€žÃ™â€šÃ™â€ Ã˜Â¨Ã™â€žÃ˜Â©');
    }
  }

  static async handleBombTimeout(ctx, chatId, messageId) {
    try {
      const state = ctx.session?.bombGame;
      if (!state || !state.active) {
        this.clearBombTimer(ctx.from.id);
        return;
      }

      state.active = false;
      ctx.session.bombGame = null;
      this.clearBombTimer(ctx.from.id);

      await GameManager.updateGameStats(ctx.from.id, 'Ã˜ÂªÃ™ÂÃ™Æ’Ã™Å Ã™Æ’_Ã˜Â§Ã™â€žÃ™â€šÃ™â€ Ã˜Â¨Ã™â€žÃ˜Â©', 'lost', 0);

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Ã°Å¸â€â€ž Ã™â€¦Ã˜Â­Ã˜Â§Ã™Ë†Ã™â€žÃ˜Â© Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯Ã˜Â©', 'game:bomb')],
        [Markup.button.callback('Ã¢Â¬â€¦Ã¯Â¸Â Ã˜Â±Ã˜Â¬Ã™Ë†Ã˜Â¹', 'menu:games')]
      ]);

      const timeoutMessage =
        'Ã°Å¸â€™Â¥ <b>Ã˜Â§Ã™â€ Ã™ÂÃ˜Â¬Ã˜Â±Ã˜Âª Ã˜Â§Ã™â€žÃ™â€šÃ™â€ Ã˜Â¨Ã™â€žÃ˜Â©!</b>\n\n' +
        'Ã¢ÂÂ° Ã˜Â§Ã™â€ Ã˜ÂªÃ™â€¡Ã™â€° Ã˜Â§Ã™â€žÃ™Ë†Ã™â€šÃ˜Âª Ã™Ë†Ã™â€žÃ™â€¦ Ã™Å Ã˜ÂªÃ™â€¦ Ã˜Â§Ã˜Â®Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â± Ã˜Â¥Ã˜Â¬Ã˜Â§Ã˜Â¨Ã˜Â©.\n' +
        `Ã¢Å“â€¦ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â§Ã˜Â¨Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂµÃ˜Â­Ã™Å Ã˜Â­Ã˜Â© Ã™Æ’Ã˜Â§Ã™â€ Ã˜Âª: <b>${state.question.options[state.correctIndex]}</b>`;

      if (chatId && messageId) {
        await ctx.telegram.editMessageText(chatId, messageId, undefined, timeoutMessage, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } else {
        await ctx.reply(timeoutMessage, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      }
    } catch (error) {
      console.error('Error in handleBombTimeout:', error);
    }
  }

  static async handleBombAnswer(ctx, answerIndex) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();
      ctx.session = ctx.session || {};
      const state = ctx.session.bombGame;

      if (!state || !state.active) {
        return;
      }

      if (Date.now() > state.endAt) {
        return this.handleBombTimeout(
          ctx,
          ctx.callbackQuery?.message?.chat?.id,
          ctx.callbackQuery?.message?.message_id
        );
      }

      state.active = false;
      ctx.session.bombGame = null;
      this.clearBombTimer(ctx.from.id);

      const isCorrect = Number(answerIndex) === Number(state.correctIndex);
      const reward = isCorrect ? state.baseReward * 2 : 0;
      const result = isCorrect ? 'win' : 'lost';

      await GameManager.updateGameStats(ctx.from.id, 'Ã˜ÂªÃ™ÂÃ™Æ’Ã™Å Ã™Æ’_Ã˜Â§Ã™â€žÃ™â€šÃ™â€ Ã˜Â¨Ã™â€žÃ˜Â©', result, reward);

      if (isCorrect && reward > 0) {
        await EconomyManager.addCoins(ctx.from.id, reward, 'Ã™ÂÃ™Ë†Ã˜Â² Ã™ÂÃ™Å  Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â© Ã˜ÂªÃ™ÂÃ™Æ’Ã™Å Ã™Æ’ Ã˜Â§Ã™â€žÃ™â€šÃ™â€ Ã˜Â¨Ã™â€žÃ˜Â©');
      }

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Ã°Å¸â€â€ž Ã˜Â¬Ã™Ë†Ã™â€žÃ˜Â© Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯Ã˜Â©', 'game:bomb')],
        [Markup.button.callback('Ã¢Â¬â€¦Ã¯Â¸Â Ã˜Â±Ã˜Â¬Ã™Ë†Ã˜Â¹', 'menu:games')]
      ]);

      const resultMessage = isCorrect
        ? 'Ã¢Å“â€¦ <b>Ã˜ÂªÃ™â€¦ Ã˜ÂªÃ™ÂÃ™Æ’Ã™Å Ã™Æ’ Ã˜Â§Ã™â€žÃ™â€šÃ™â€ Ã˜Â¨Ã™â€žÃ˜Â© Ã˜Â¨Ã™â€ Ã˜Â¬Ã˜Â§Ã˜Â­!</b>\n\n' +
          `Ã°Å¸Å½Â Ã™â€¦Ã™Æ’Ã˜Â§Ã™ÂÃ˜Â£Ã˜Â© Ã™â€¦Ã˜Â¶Ã˜Â§Ã˜Â¹Ã™ÂÃ˜Â©: <b>${reward}</b> Ã˜Â¹Ã™â€¦Ã™â€žÃ˜Â©\n` +
          `Ã°Å¸Â§Â  Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â§Ã˜Â¨Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂµÃ˜Â­Ã™Å Ã˜Â­Ã˜Â©: <b>${state.question.options[state.correctIndex]}</b>`
        : 'Ã°Å¸â€™Â¥ <b>Ã˜Â¥Ã˜Â¬Ã˜Â§Ã˜Â¨Ã˜Â© Ã˜Â®Ã˜Â§Ã˜Â·Ã˜Â¦Ã˜Â©!</b>\n\n' +
          `Ã¢Å“â€¦ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â§Ã˜Â¨Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂµÃ˜Â­Ã™Å Ã˜Â­Ã˜Â©: <b>${state.question.options[state.correctIndex]}</b>\n` +
          'Ã¢ÂÅ’ Ã˜Â®Ã˜Â³Ã˜Â±Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â¬Ã™Ë†Ã™â€žÃ˜Â©.';

      await ctx.editMessageText(resultMessage, {
        parse_mode: 'HTML',
        reply_markup: keyboard.reply_markup
      });
    } catch (error) {
      console.error('Error in handleBombAnswer:', error);
      ctx.reply('Ã¢ÂÅ’ Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£ Ã˜Â£Ã˜Â«Ã™â€ Ã˜Â§Ã˜Â¡ Ã™â€¦Ã˜Â¹Ã˜Â§Ã™â€žÃ˜Â¬Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â§Ã˜Â¨Ã˜Â©');
    }
  }

  static formatCardBattleMenu(state) {
    let text =
      'Ã°Å¸Æ’Â <b>Ã™â€¦Ã˜Â¹Ã˜Â±Ã™Æ’Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â·Ã˜Â§Ã™â€šÃ˜Â§Ã˜Âª</b>\n\n' +
      `Ã°Å¸ÂÂ Ã˜Â§Ã™â€žÃ˜Â¬Ã™Ë†Ã™â€žÃ˜Â©: ${state.round}/3\n` +
      `Ã°Å¸â€œÅ  Ã˜Â§Ã™â€žÃ™â€ Ã˜ÂªÃ™Å Ã˜Â¬Ã˜Â©: Ã˜Â£Ã™â€ Ã˜Âª ${state.playerScore} - ${state.botScore} Ã˜Â§Ã™â€žÃ˜Â®Ã˜ÂµÃ™â€¦\n\n`;

    if (state.lastRound) {
      text +=
        'Ã˜Â¢Ã˜Â®Ã˜Â± Ã˜Â¬Ã™Ë†Ã™â€žÃ˜Â©:\n' +
        `Ã˜Â£Ã™â€ Ã˜Âª: ${state.lastRound.playerCard.emoji} ${state.lastRound.playerCard.name} (${state.lastRound.playerPower})\n` +
        `Ã˜Â§Ã™â€žÃ˜Â®Ã˜ÂµÃ™â€¦: ${state.lastRound.botCard.emoji} ${state.lastRound.botCard.name} (${state.lastRound.botPower})\n` +
        `${state.lastRound.outcome}\n\n`;
    }

    text += 'Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â± Ã˜Â¨Ã˜Â·Ã˜Â§Ã™â€šÃ˜Â© Ã˜Â§Ã™â€žÃ˜Â¬Ã™Ë†Ã™â€žÃ˜Â© Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ™Å Ã˜Â©:\n';
    state.playerCards.forEach((card, idx) => {
      if (!card) return;
      const rarity = CARD_RARITY[card.rarity] || CARD_RARITY.common;
      text += `${idx + 1}. ${card.emoji} <b>${card.name}</b> ${rarity.emoji} ${rarity.label}\n`;
      text += `   Ã¢Å¡â€Ã¯Â¸Â ${card.attack} | Ã°Å¸â€ºÂ¡Ã¯Â¸Â ${card.defense}\n`;
    });

    return text;
  }

  static async handleCardBattle(ctx) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();
      ctx.session = ctx.session || {};

      ctx.session.cardBattle = {
        active: true,
        round: 1,
        playerCards: this.drawCards(3),
        botCards: this.drawCards(3),
        playerScore: 0,
        botScore: 0,
        lastRound: null,
        usedLegendary: false
      };

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Ã˜Â¨Ã˜Â·Ã˜Â§Ã™â€šÃ˜Â© 1', 'game:card:pick:0')],
        [Markup.button.callback('Ã˜Â¨Ã˜Â·Ã˜Â§Ã™â€šÃ˜Â© 2', 'game:card:pick:1')],
        [Markup.button.callback('Ã˜Â¨Ã˜Â·Ã˜Â§Ã™â€šÃ˜Â© 3', 'game:card:pick:2')],
        [Markup.button.callback('Ã¢Â¬â€¦Ã¯Â¸Â Ã˜Â±Ã˜Â¬Ã™Ë†Ã˜Â¹', 'menu:games')]
      ]);

      await ctx.editMessageText(this.formatCardBattleMenu(ctx.session.cardBattle), {
        parse_mode: 'HTML',
        reply_markup: keyboard.reply_markup
      });
    } catch (error) {
      console.error('Error in handleCardBattle:', error);
      ctx.reply('Ã¢ÂÅ’ Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£ Ã™ÂÃ™Å  Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â© Ã™â€¦Ã˜Â¹Ã˜Â±Ã™Æ’Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â·Ã˜Â§Ã™â€šÃ˜Â§Ã˜Âª');
    }
  }

  static async awardCardGift(userId) {
    try {
      const { User } = require('../database/models');
      const user = await User.findOne({ userId });
      if (!user) return false;

      user.inventory = user.inventory || [];
      const itemId = 'card_pack_legendary';
      const existing = user.inventory.find((item) => item.itemId === itemId);

      if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
      } else {
        user.inventory.push({
          itemId,
          itemName: 'Ã˜Â­Ã˜Â²Ã™â€¦Ã˜Â© Ã˜Â¨Ã˜Â·Ã˜Â§Ã™â€šÃ˜Â§Ã˜Âª Ã˜Â£Ã˜Â³Ã˜Â·Ã™Ë†Ã˜Â±Ã™Å Ã˜Â©',
          quantity: 1,
          boughtAt: new Date()
        });
      }

      await user.save();
      return true;
    } catch (_error) {
      return false;
    }
  }

  static async handleCardPick(ctx, cardIndex) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();
      ctx.session = ctx.session || {};
      const state = ctx.session.cardBattle;

      if (!state || !state.active) {
        return;
      }

      const playerCard = state.playerCards[cardIndex];
      if (!playerCard) {
        return;
      }

      const botOptions = state.botCards
        .map((card, idx) => (card ? idx : null))
        .filter((idx) => idx !== null);

      if (botOptions.length === 0) {
        state.active = false;
      }

      const botPickIndex = botOptions[Math.floor(Math.random() * botOptions.length)];
      const botCard = state.botCards[botPickIndex];

      const playerPower = this.calcCardPower(playerCard);
      const botPower = this.calcCardPower(botCard);

      let outcome = 'Ã°Å¸Â¤Â Ã˜ÂªÃ˜Â¹Ã˜Â§Ã˜Â¯Ã™â€ž';
      if (playerPower > botPower) {
        state.playerScore += 1;
        outcome = 'Ã¢Å“â€¦ Ã™ÂÃ˜Â²Ã˜Âª Ã˜Â¨Ã˜Â§Ã™â€žÃ˜Â¬Ã™Ë†Ã™â€žÃ˜Â©';
        if (playerCard.rarity === 'legendary') {
          state.usedLegendary = true;
        }
      } else if (playerPower < botPower) {
        state.botScore += 1;
        outcome = 'Ã¢ÂÅ’ Ã˜Â®Ã˜Â³Ã˜Â±Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â¬Ã™Ë†Ã™â€žÃ˜Â©';
      }

      state.lastRound = {
        playerCard,
        botCard,
        playerPower,
        botPower,
        outcome
      };

      state.playerCards[cardIndex] = null;
      state.botCards[botPickIndex] = null;
      state.round += 1;

      const hasMore = state.playerCards.some(Boolean) && state.botCards.some(Boolean) && state.round <= 3;
      if (hasMore) {
        const rows = [];
        state.playerCards.forEach((card, idx) => {
          if (card) rows.push([Markup.button.callback(`Ã˜Â¨Ã˜Â·Ã˜Â§Ã™â€šÃ˜Â© ${idx + 1}`, `game:card:pick:${idx}`)]);
        });
        rows.push([Markup.button.callback('Ã¢Â¬â€¦Ã¯Â¸Â Ã˜Â±Ã˜Â¬Ã™Ë†Ã˜Â¹', 'menu:games')]);

        return ctx.editMessageText(this.formatCardBattleMenu(state), {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(rows).reply_markup
        });
      }

      state.active = false;
      ctx.session.cardBattle = null;

      let result = 'draw';
      let reward = 25;
      if (state.playerScore > state.botScore) {
        result = 'win';
        reward = 70 + state.playerScore * 15;
      } else if (state.playerScore < state.botScore) {
        result = 'lost';
        reward = 0;
      }

      await GameManager.updateGameStats(ctx.from.id, 'Ã™â€¦Ã˜Â¹Ã˜Â±Ã™Æ’Ã˜Â©_Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â·Ã˜Â§Ã™â€šÃ˜Â§Ã˜Âª', result, reward);

      let bonusGift = '';
      if (result === 'win' && reward > 0) {
        await EconomyManager.addCoins(ctx.from.id, reward, 'Ã™ÂÃ™Ë†Ã˜Â² Ã™ÂÃ™Å  Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â© Ã™â€¦Ã˜Â¹Ã˜Â±Ã™Æ’Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â·Ã˜Â§Ã™â€šÃ˜Â§Ã˜Âª');
        if (state.usedLegendary) {
          const gifted = await this.awardCardGift(ctx.from.id);
          if (gifted) {
            bonusGift = '\nÃ°Å¸Å½Â Ã˜Â­Ã˜ÂµÃ™â€žÃ˜Âª Ã˜Â¹Ã™â€žÃ™â€° Ã™â€¡Ã˜Â¯Ã™Å Ã˜Â©: <b>Ã˜Â­Ã˜Â²Ã™â€¦Ã˜Â© Ã˜Â¨Ã˜Â·Ã˜Â§Ã™â€šÃ˜Â§Ã˜Âª Ã˜Â£Ã˜Â³Ã˜Â·Ã™Ë†Ã˜Â±Ã™Å Ã˜Â©</b>';
          }
        }
      }

      const finalMessage =
        'Ã°Å¸Æ’Â <b>Ã˜Â§Ã™â€ Ã˜ÂªÃ™â€¡Ã˜Âª Ã™â€¦Ã˜Â¹Ã˜Â±Ã™Æ’Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â·Ã˜Â§Ã™â€šÃ˜Â§Ã˜Âª</b>\n\n' +
        `Ã°Å¸â€œÅ  Ã˜Â§Ã™â€žÃ™â€ Ã˜ÂªÃ™Å Ã˜Â¬Ã˜Â© Ã˜Â§Ã™â€žÃ™â€ Ã™â€¡Ã˜Â§Ã˜Â¦Ã™Å Ã˜Â©: Ã˜Â£Ã™â€ Ã˜Âª ${state.playerScore} - ${state.botScore} Ã˜Â§Ã™â€žÃ˜Â®Ã˜ÂµÃ™â€¦\n` +
        `${result === 'win' ? 'Ã°Å¸Ââ€  Ã˜Â§Ã™â€ Ã˜ÂªÃ˜ÂµÃ˜Â§Ã˜Â±!' : result === 'lost' ? 'Ã°Å¸â€™Â¥ Ã™â€¡Ã˜Â²Ã™Å Ã™â€¦Ã˜Â©' : 'Ã°Å¸Â¤Â Ã˜ÂªÃ˜Â¹Ã˜Â§Ã˜Â¯Ã™â€ž'}\n` +
        `Ã°Å¸â€™Â° Ã˜Â§Ã™â€žÃ™â€¦Ã™Æ’Ã˜Â§Ã™ÂÃ˜Â£Ã˜Â©: ${reward} Ã˜Â¹Ã™â€¦Ã™â€žÃ˜Â©${bonusGift}`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Ã°Å¸â€â€ž Ã™â€¦Ã˜Â¹Ã˜Â±Ã™Æ’Ã˜Â© Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯Ã˜Â©', 'game:cardbattle')],
        [Markup.button.callback('Ã¢Â¬â€¦Ã¯Â¸Â Ã˜Â±Ã˜Â¬Ã™Ë†Ã˜Â¹', 'menu:games')]
      ]);

      return ctx.editMessageText(finalMessage, {
        parse_mode: 'HTML',
        reply_markup: keyboard.reply_markup
      });
    } catch (error) {
      console.error('Error in handleCardPick:', error);
      ctx.reply('Ã¢ÂÅ’ Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£ Ã˜Â£Ã˜Â«Ã™â€ Ã˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¹Ã˜Â±Ã™Æ’Ã˜Â©');
    }
  }

  static async handleMindPuzzle(ctx) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();
      ctx.session = ctx.session || {};

      const puzzle = this.getRandomItem(MIND_PUZZLES);
      if (!puzzle) {
        return ctx.reply('Ã¢ÂÅ’ Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã˜Â£Ã™â€žÃ˜ÂºÃ˜Â§Ã˜Â² Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â­Ã˜Â© Ã˜Â­Ã˜Â§Ã™â€žÃ™Å Ã˜Â§Ã™â€¹');
      }

      const reward = Math.floor(Math.random() * 21) + 20; // 20-40
      ctx.session.mindPuzzle = {
        active: true,
        puzzle,
        reward
      };

      const rows = puzzle.options.map((option, idx) => [
        Markup.button.callback(option, `game:mind:ans:${idx}`)
      ]);
      rows.push([Markup.button.callback('Ã¢Â¬â€¦Ã¯Â¸Â Ã˜Â±Ã˜Â¬Ã™Ë†Ã˜Â¹', 'menu:games')]);

      const message =
        'Ã°Å¸Â§Â  <b>Ã˜Â£Ã™â€žÃ˜ÂºÃ˜Â§Ã˜Â² Ã˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡ - Ã˜ÂªÃ˜Â­Ã˜Â¯Ã™Å  Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ™â€ž</b>\n\n' +
        `${puzzle.question}\n\n` +
        'Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â± Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â§Ã˜Â¨Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂµÃ˜Â­Ã™Å Ã˜Â­Ã˜Â©:';

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(rows).reply_markup
      });
    } catch (error) {
      console.error('Error in handleMindPuzzle:', error);
      ctx.reply('Ã¢ÂÅ’ Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£ Ã™ÂÃ™Å  Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â© Ã˜Â£Ã™â€žÃ˜ÂºÃ˜Â§Ã˜Â² Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡');
    }
  }

  static async handleMindAnswer(ctx, answerIndex) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();
      ctx.session = ctx.session || {};
      const state = ctx.session.mindPuzzle;

      if (!state || !state.active) {
        return;
      }

      state.active = false;
      ctx.session.mindPuzzle = null;

      const isCorrect = Number(answerIndex) === Number(state.puzzle.correctIndex);
      const result = isCorrect ? 'win' : 'lost';
      const reward = isCorrect ? state.reward : 0;

      await GameManager.updateGameStats(ctx.from.id, 'Ã˜Â§Ã™â€žÃ˜ÂºÃ˜Â§Ã˜Â²_Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡', result, reward);

      if (isCorrect && reward > 0) {
        await EconomyManager.addCoins(ctx.from.id, reward, 'Ã™ÂÃ™Ë†Ã˜Â² Ã™ÂÃ™Å  Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â© Ã˜Â£Ã™â€žÃ˜ÂºÃ˜Â§Ã˜Â² Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡');
      }

      const message =
        (isCorrect ? 'Ã¢Å“â€¦ <b>Ã˜Â¥Ã˜Â¬Ã˜Â§Ã˜Â¨Ã˜Â© Ã˜ÂµÃ˜Â­Ã™Å Ã˜Â­Ã˜Â©!</b>\n\n' : 'Ã¢ÂÅ’ <b>Ã˜Â¥Ã˜Â¬Ã˜Â§Ã˜Â¨Ã˜Â© Ã˜Â®Ã˜Â§Ã˜Â·Ã˜Â¦Ã˜Â©</b>\n\n') +
        `Ã°Å¸â€œÂ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â§Ã˜Â¨Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂµÃ˜Â­Ã™Å Ã˜Â­Ã˜Â©: <b>${state.puzzle.options[state.puzzle.correctIndex]}</b>\n` +
        `Ã°Å¸â€™Â¡ Ã˜Â§Ã™â€žÃ˜ÂªÃ™Ë†Ã˜Â¶Ã™Å Ã˜Â­: ${state.puzzle.explanation}\n` +
        `Ã°Å¸â€™Â° Ã˜Â§Ã™â€žÃ™â€¦Ã™Æ’Ã˜Â§Ã™ÂÃ˜Â£Ã˜Â©: ${reward} Ã˜Â¹Ã™â€¦Ã™â€žÃ˜Â©`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Ã°Å¸â€â€ž Ã™â€žÃ˜ÂºÃ˜Â² Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯', 'game:mind')],
        [Markup.button.callback('Ã¢Â¬â€¦Ã¯Â¸Â Ã˜Â±Ã˜Â¬Ã™Ë†Ã˜Â¹', 'menu:games')]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard.reply_markup
      });
    } catch (error) {
      console.error('Error in handleMindAnswer:', error);
      ctx.reply('Ã¢ÂÅ’ Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£ Ã˜Â£Ã˜Â«Ã™â€ Ã˜Â§Ã˜Â¡ Ã™â€¦Ã˜Â¹Ã˜Â§Ã™â€žÃ˜Â¬Ã˜Â© Ã˜Â§Ã™â€žÃ™â€žÃ˜ÂºÃ˜Â²');
    }
  }

  // ======== QURANIC GAMES ========

  static async handleQuranicMenu(ctx) {
    try {
      // Answer callback query immediately
      if (ctx.callbackQuery) await ctx.answerCbQuery();

      const message = QuranicGames.formatGamesList();

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('Ã°Å¸Å½Â¯ Ã˜ÂªÃ˜Â®Ã™â€¦Ã™Å Ã™â€  Ã˜Â§Ã™â€žÃ˜Â¢Ã™Å Ã˜Â©', 'qgame:guess_verse')],
        [Markup.button.callback('Ã¢Å“ÂÃ¯Â¸Â Ã˜Â£Ã™Æ’Ã™â€¦Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¢Ã™Å Ã˜Â©', 'qgame:complete_verse')],
        [Markup.button.callback('Ã°Å¸â€Â Ã˜Â§Ã™Æ’Ã˜ÂªÃ˜Â´Ã™Â Ã˜Â§Ã™â€žÃ™ÂÃ˜Â±Ã™â€š', 'qgame:spot_difference')],
        [Markup.button.callback('Ã°Å¸Â§Â  Ã™â€¦Ã˜Â¹Ã™â€žÃ™Ë†Ã™â€¦Ã˜Â§Ã˜Âª Ã™â€šÃ˜Â±Ã˜Â¢Ã™â€ Ã™Å Ã˜Â©', 'qgame:trivia')],
        [Markup.button.callback('Ã°Å¸â€œÅ  Ã˜Â¹Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¢Ã™Å Ã˜Â§Ã˜Âª', 'qgame:surah_count')],
        [Markup.button.callback('Ã¢Â¬â€¦Ã¯Â¸Â Ã˜Â±Ã˜Â¬Ã™Ë†Ã˜Â¹', 'menu:games')]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      // Ã˜ÂªÃ˜Â¬Ã˜Â§Ã™â€¡Ã™â€ž Ã˜Â®Ã˜Â·Ã˜Â£ "message is not modified"
      if (error.response?.error_code !== 400 || !error.response?.description?.includes('message is not modified')) {
        console.error('Error in handleQuranicMenu:', error);
        ctx.reply('Ã¢ÂÅ’ Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£');
      }
    }
  }

  static async handleGuessVerse(ctx) {
    try {
      // Answer callback query immediately
      if (ctx.callbackQuery) await ctx.answerCbQuery();

      ctx.session = ctx.session || {};
      const game = await QuranicGames.guessTheVerse();

      ctx.session.gameState = {
        game: 'quranic',
        type: 'guess_verse',
        correctAnswer: game.correctAnswer,
        reward: game.reward
      };

      const message = `Ã°Å¸Å½Â¯ <b>Ã˜ÂªÃ˜Â®Ã™â€¦Ã™Å Ã™â€  Ã˜Â§Ã™â€žÃ˜Â¢Ã™Å Ã˜Â©</b>\n\n<b>Ã˜Â§Ã™â€žÃ˜Â¯Ã™â€žÃ™Å Ã™â€ž:</b> ${game.clue}\n\nÃ°Å¸â€™Â¡ Ã˜Â£Ã˜Â±Ã˜Â³Ã™â€ž Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â³Ã™Ë†Ã˜Â±Ã˜Â© Ã™â€žÃ™â€žÃ˜Â¥Ã˜Â¬Ã˜Â§Ã˜Â¨Ã˜Â©`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('Ã°Å¸â€â€ž Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â© Ã˜Â£Ã˜Â®Ã˜Â±Ã™â€°', 'qgame:guess_verse')],
        [Markup.button.callback('Ã¢Â¬â€¦Ã¯Â¸Â Ã˜Â±Ã˜Â¬Ã™Ë†Ã˜Â¹', 'game:quranic')]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      // Ã˜ÂªÃ˜Â¬Ã˜Â§Ã™â€¡Ã™â€ž Ã˜Â®Ã˜Â·Ã˜Â£ "message is not modified" Ã˜Â­Ã™Å Ã˜Â« Ã™Å Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â¹Ã™â€ Ã˜Â¯ Ã˜Â§Ã˜Â®Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â± Ã™â€ Ã™ÂÃ˜Â³ Ã˜Â§Ã™â€žÃ™â€žÃ˜Â¹Ã˜Â¨Ã˜Â©
      if (error.response?.error_code !== 400 || !error.response?.description?.includes('message is not modified')) {
        console.error('Error in handleGuessVerse:', error);
        ctx.reply('Ã¢ÂÅ’ Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£');
      }
    }
  }

  static async handleCompleteVerse(ctx) {
    try {      // Answer callback query immediately
      if (ctx.callbackQuery) await ctx.answerCbQuery();
      console.log('Ã°Å¸Å½Â® [handleCompleteVerse] Started');
      ctx.session = ctx.session || {};
      const game = await QuranicGames.completeTheVerse();
      console.log('Ã°Å¸Å½Â® [handleCompleteVerse] Game data:', game);

      ctx.session.gameState = {
        game: 'quranic',
        type: 'complete_verse',
        correctAnswer: game.correctAnswer,
        reward: game.reward,
        surah: game.surah
      };
      console.log('Ã°Å¸Å½Â® [handleCompleteVerse] gameState:', ctx.session.gameState);

      const message = `Ã¢Å“ÂÃ¯Â¸Â <b>Ã˜Â£Ã™Æ’Ã™â€¦Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¢Ã™Å Ã˜Â©</b>\n\nÃ°Å¸â€œÂ <b>Ã˜Â§Ã™â€žÃ˜Â³Ã™Ë†Ã˜Â±Ã˜Â©:</b> ${game.surah}\n\n<b>Ã˜Â§Ã™â€žÃ˜Â¢Ã™Å Ã˜Â©:</b> <code>${game.partial}...</code>\n\nÃ°Å¸â€™Â¡ Ã˜Â£Ã˜Â±Ã˜Â³Ã™â€ž Ã˜Â¨Ã˜Â§Ã™â€šÃ™Å  Ã˜Â§Ã™â€žÃ˜Â¢Ã™Å Ã˜Â©`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('Ã°Å¸â€â€ž Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â© Ã˜Â£Ã˜Â®Ã˜Â±Ã™â€°', 'qgame:complete_verse')],
        [Markup.button.callback('Ã¢Â¬â€¦Ã¯Â¸Â Ã˜Â±Ã˜Â¬Ã™Ë†Ã˜Â¹', 'game:quranic')]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      console.error('Ã¢ÂÅ’ [handleCompleteVerse] Error:', error);
      // Ã˜ÂªÃ˜Â¬Ã˜Â§Ã™â€¡Ã™â€ž Ã˜Â®Ã˜Â·Ã˜Â£ "message is not modified" Ã˜Â­Ã™Å Ã˜Â« Ã™Å Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â¹Ã™â€ Ã˜Â¯ Ã˜Â§Ã˜Â®Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â± Ã™â€ Ã™ÂÃ˜Â³ Ã˜Â§Ã™â€žÃ™â€žÃ˜Â¹Ã˜Â¨Ã˜Â©
      if (error.response?.error_code !== 400 || !error.response?.description?.includes('message is not modified')) {
        console.error('Error in handleCompleteVerse:', error.message || error);
        await ctx.reply('Ã¢ÂÅ’ Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£ Ã™ÂÃ™Å  Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â© Ã˜Â£Ã™Æ’Ã™â€¦Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¢Ã™Å Ã˜Â©').catch(e => console.error('Failed to send error:', e));
      }
    }
  }

  static async handleSpotDifference(ctx) {
    try {
      // Answer callback query immediately
      if (ctx.callbackQuery) await ctx.answerCbQuery();

      console.log('Ã°Å¸â€Â [handleSpotDifference] Started');
      ctx.session = ctx.session || {};
      const game = await QuranicGames.spotTheDifference();
      console.log('Ã°Å¸â€Â [handleSpotDifference] Game data:', game);

      ctx.session.gameState = {
        game: 'quranic',
        type: 'spot_difference',
        isCorrect: game.isCorrect,
        correctAnswer: game.isCorrect.toString(), // 'true' or 'false'
        correctVerse: game.correctVerse,
        reward: game.reward,
        surah: game.surah
      };
      console.log('Ã°Å¸â€Â [handleSpotDifference] gameState:', ctx.session.gameState);

      const message = `Ã°Å¸â€Â <b>Ã˜Â§Ã™Æ’Ã˜ÂªÃ˜Â´Ã™Â Ã˜Â§Ã™â€žÃ™ÂÃ˜Â±Ã™â€š</b>\n\nÃ°Å¸â€œÂ <b>Ã˜Â§Ã™â€žÃ˜Â³Ã™Ë†Ã˜Â±Ã˜Â©:</b> ${game.surah}\n\n<b>Ã™â€¡Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¢Ã™Å Ã˜Â© Ã˜ÂµÃ˜Â­Ã™Å Ã˜Â­Ã˜Â©Ã˜Å¸</b>\n<code>${game.verse}</code>`;

      const buttons = Markup.inlineKeyboard([
        [
          Markup.button.callback('Ã¢Å“â€¦ Ã˜ÂµÃ˜Â­Ã™Å Ã˜Â­Ã˜Â©', 'qgame:spot_correct'),
          Markup.button.callback('Ã¢ÂÅ’ Ã˜Â®Ã˜Â§Ã˜Â·Ã˜Â¦Ã˜Â©', 'qgame:spot_wrong')
        ],
        [Markup.button.callback('Ã°Å¸â€â€ž Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â© Ã˜Â£Ã˜Â®Ã˜Â±Ã™â€°', 'qgame:spot_difference')],
        [Markup.button.callback('Ã¢Â¬â€¦Ã¯Â¸Â Ã˜Â±Ã˜Â¬Ã™Ë†Ã˜Â¹', 'game:quranic')]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      console.error('Ã¢ÂÅ’ [handleSpotDifference] Error:', error);
      // Ã˜ÂªÃ˜Â¬Ã˜Â§Ã™â€¡Ã™â€ž Ã˜Â®Ã˜Â·Ã˜Â£ "message is not modified" Ã˜Â­Ã™Å Ã˜Â« Ã™Å Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â¹Ã™â€ Ã˜Â¯ Ã˜Â§Ã˜Â®Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â± Ã™â€ Ã™ÂÃ˜Â³ Ã˜Â§Ã™â€žÃ™â€žÃ˜Â¹Ã˜Â¨Ã˜Â©
      if (error.response?.error_code !== 400 || !error.response?.description?.includes('message is not modified')) {
        console.error('Error in handleSpotDifference:', error.message || error);
        await ctx.reply('Ã¢ÂÅ’ Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£ Ã™ÂÃ™Å  Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â© Ã˜Â§Ã™Æ’Ã˜ÂªÃ˜Â´Ã™Â Ã˜Â§Ã™â€žÃ™ÂÃ˜Â±Ã™â€š').catch(e => console.error('Failed to send error:', e));
      }
    }
  }

  static async handleTriviaQuestion(ctx) {
    try {
      // Answer callback query immediately
      if (ctx.callbackQuery) await ctx.answerCbQuery();

      console.log('Ã°Å¸Â§Â  [handleTriviaQuestion] Started');
      ctx.session = ctx.session || {};
      const game = await QuranicGames.qurranTrivia();
      console.log('Ã°Å¸Â§Â  [handleTriviaQuestion] Game data:', game);

      ctx.session.gameState = {
        game: 'quranic',
        type: 'trivia',
        correctAnswer: game.options[game.correctAnswer],
        reward: game.reward
      };
      console.log('Ã°Å¸Â§Â  [handleTriviaQuestion] gameState:', ctx.session.gameState);

      const message = `Ã°Å¸Â§Â  <b>Ã™â€¦Ã˜Â¹Ã™â€žÃ™Ë†Ã™â€¦Ã˜Â§Ã˜Âª Ã™â€šÃ˜Â±Ã˜Â¢Ã™â€ Ã™Å Ã˜Â©</b>\n\n<b>Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â¤Ã˜Â§Ã™â€ž:</b>\n${game.question}`;

      const buttons = Markup.inlineKeyboard(
        game.options.map(option => [
          Markup.button.callback(option, `qgame:trivia_answer:${option}`)
        ]).concat([
          [Markup.button.callback('Ã°Å¸â€â€ž Ã˜Â³Ã˜Â¤Ã˜Â§Ã™â€ž Ã˜Â¢Ã˜Â®Ã˜Â±', 'qgame:trivia')],
          [Markup.button.callback('Ã¢Â¬â€¦Ã¯Â¸Â Ã˜Â±Ã˜Â¬Ã™Ë†Ã˜Â¹', 'game:quranic')]
        ])
      );

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      console.error('Ã¢ÂÅ’ [handleTriviaQuestion] Error:', error);
      // Ã˜ÂªÃ˜Â¬Ã˜Â§Ã™â€¡Ã™â€ž Ã˜Â®Ã˜Â·Ã˜Â£ "message is not modified" Ã˜Â­Ã™Å Ã˜Â« Ã™Å Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â¹Ã™â€ Ã˜Â¯ Ã˜Â§Ã˜Â®Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â± Ã™â€ Ã™ÂÃ˜Â³ Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â¤Ã˜Â§Ã™â€ž
      if (error.response?.error_code !== 400 || !error.response?.description?.includes('message is not modified')) {
        console.error('Error in handleTriviaQuestion:', error.message || error);
        await ctx.reply('Ã¢ÂÅ’ Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£ Ã™ÂÃ™Å  Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â© Ã™â€¦Ã˜Â¹Ã™â€žÃ™Ë†Ã™â€¦Ã˜Â§Ã˜Âª Ã™â€šÃ˜Â±Ã˜Â¢Ã™â€ Ã™Å Ã˜Â©').catch(e => console.error('Failed to send error:', e));
      }
    }
  }

  static async handleSurahCount(ctx) {
    try {
      // Answer callback query immediately
      if (ctx.callbackQuery) await ctx.answerCbQuery();

      console.log('Ã°Å¸â€œÅ  [handleSurahCount] Started');
      ctx.session = ctx.session || {};
      const game = await QuranicGames.surahCount();
      console.log('Ã°Å¸â€œÅ  [handleSurahCount] Game data:', game);

      ctx.session.gameState = {
        game: 'quranic',
        type: 'surah_count',
        correctAnswer: game.correctAnswer,
        reward: game.reward,
        surah: game.surah
      };
      console.log('Ã°Å¸â€œÅ  [handleSurahCount] gameState:', ctx.session.gameState);

      const message = `Ã°Å¸â€œÅ  <b>Ã˜Â¹Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¢Ã™Å Ã˜Â§Ã˜Âª</b>\n\n<b>Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â¤Ã˜Â§Ã™â€ž:</b>\n${game.question}\n\nÃ°Å¸â€™Â¡ Ã˜Â£Ã˜Â±Ã˜Â³Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â±Ã™â€šÃ™â€¦`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('Ã°Å¸â€â€ž Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â© Ã˜Â£Ã˜Â®Ã˜Â±Ã™â€°', 'qgame:surah_count')],
        [Markup.button.callback('Ã¢Â¬â€¦Ã¯Â¸Â Ã˜Â±Ã˜Â¬Ã™Ë†Ã˜Â¹', 'game:quranic')]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      console.error('Ã¢ÂÅ’ [handleSurahCount] Error:', error);
      // Ã˜ÂªÃ˜Â¬Ã˜Â§Ã™â€¡Ã™â€ž Ã˜Â®Ã˜Â·Ã˜Â£ "message is not modified" Ã˜Â­Ã™Å Ã˜Â« Ã™Å Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â¹Ã™â€ Ã˜Â¯ Ã˜Â§Ã˜Â®Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â± Ã™â€ Ã™ÂÃ˜Â³ Ã˜Â§Ã™â€žÃ™â€žÃ˜Â¹Ã˜Â¨Ã˜Â©
      if (error.response?.error_code !== 400 || !error.response?.description?.includes('message is not modified')) {
        console.error('Error in handleSurahCount:', error.message || error);
        await ctx.reply('Ã¢ÂÅ’ Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£ Ã™ÂÃ™Å  Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â© Ã˜Â¹Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¢Ã™Å Ã˜Â§Ã˜Âª').catch(e => console.error('Failed to send error:', e));
      }
    }
  }

  static async processQuranicAnswer(ctx, userAnswer) {
    try {
      // Answer callback query if it's a button press
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery();
      }

      console.log('Ã¢Å“â€¦ [processQuranicAnswer] Started with answer:', userAnswer);
      ctx.session = ctx.session || {};
      const gameState = ctx.session.gameState;
      console.log('Ã¢Å“â€¦ [processQuranicAnswer] Current gameState:', gameState);

      if (!gameState || gameState.game !== 'quranic') {
        console.log('Ã¢ÂÅ’ [processQuranicAnswer] No active game');
        return ctx.reply('Ã¢ÂÅ’ Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â© Ã˜Â¬Ã˜Â§Ã˜Â±Ã™Å Ã˜Â©');
      }

      // Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™â€šÃ™â€š Ã™â€¦Ã™â€  Ã™Ë†Ã˜Â¬Ã™Ë†Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â·Ã™â€žÃ™Ë†Ã˜Â¨Ã˜Â©
      if (!gameState.correctAnswer || gameState.reward === undefined) {
        console.error('Ã¢ÂÅ’ [processQuranicAnswer] Missing gameState data:', gameState);
        return ctx.reply('Ã¢ÂÅ’ Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£ Ã™ÂÃ™Å  Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€žÃ˜Â¹Ã˜Â¨Ã˜Â©. Ã˜Â­Ã˜Â§Ã™Ë†Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â¯Ã˜Â¡ Ã˜Â¨Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â© Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯Ã˜Â©.');
      }
      console.log('Ã¢Å“â€¦ [processQuranicAnswer] Validation passed');

      const isCorrect = userAnswer.trim().toLowerCase() === gameState.correctAnswer.toString().toLowerCase();
      const reward = isCorrect ? gameState.reward : 0;

      // Record in database
      await QuranicGames.recordGameResult(ctx.from.id, gameState.type, gameState.reward, isCorrect);

      // Add coins if won
      if (isCorrect && reward > 0) {
        await EconomyManager.addCoins(ctx.from.id, reward, `Ã™ÂÃ™Ë†Ã˜Â² Ã™ÂÃ™Å  Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â© Ã™â€šÃ˜Â±Ã˜Â¢Ã™â€ Ã™Å Ã˜Â©: ${gameState.type}`);
      }

      const resultMessage = isCorrect
        ? `Ã¢Å“â€¦ <b>Ã˜Â¥Ã˜Â¬Ã˜Â§Ã˜Â¨Ã˜Â© Ã˜ÂµÃ˜Â­Ã™Å Ã˜Â­Ã˜Â©!</b>\n\nÃ°Å¸Å½â€° Ã™â€žÃ™â€šÃ˜Â¯ Ã™ÂÃ˜Â²Ã˜Âª Ã˜Â¨Ã™â‚¬ <b>${reward}</b> Ã™â€ Ã™â€šÃ˜Â·Ã˜Â©!`
        : `Ã¢ÂÅ’ <b>Ã˜Â¥Ã˜Â¬Ã˜Â§Ã˜Â¨Ã˜Â© Ã˜Â®Ã˜Â§Ã˜Â·Ã˜Â¦Ã˜Â©</b>\n\nÃ°Å¸Ëœâ€ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â§Ã˜Â¨Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂµÃ˜Â­Ã™Å Ã˜Â­Ã˜Â©: <code>${gameState.correctAnswer}</code>`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('Ã°Å¸â€â€ž Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â© Ã˜Â£Ã˜Â®Ã˜Â±Ã™â€°', `qgame:${gameState.type}`)],
        [Markup.button.callback('Ã¢Â¬â€¦Ã¯Â¸Â Ã˜Â±Ã˜Â¬Ã™Ë†Ã˜Â¹', 'game:quranic')]
      ]);

      await ctx.reply(resultMessage, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });

      // Clear game state
      ctx.session.gameState = null;
    } catch (error) {
      console.error('Ã¢ÂÅ’ [processQuranicAnswer] Error:', error);
      console.error('Ã¢ÂÅ’ [processQuranicAnswer] Stack:', error.stack);
      try {
        await ctx.reply('Ã¢ÂÅ’ Ã˜Â­Ã˜Â¯Ã˜Â« Ã˜Â®Ã˜Â·Ã˜Â£ Ã™ÂÃ™Å  Ã™â€¦Ã˜Â¹Ã˜Â§Ã™â€žÃ˜Â¬Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â§Ã˜Â¨Ã˜Â©');
      } catch (replyError) {
        console.error('Ã¢ÂÅ’ [processQuranicAnswer] Failed to send error message:', replyError);
      }
    }
  }
}

module.exports = GameHandler;
