const Markup = require('telegraf/markup');
const GameManager = require('../games/gameManager');
const EconomyManager = require('../economy/economyManager');
const { User } = require('../database/models');

const MIND_PUZZLES = [
  {
    question: '\u0634\u064a\u0621 \u0643\u0644\u0645\u0627 \u0623\u062e\u0630\u062a \u0645\u0646\u0647 \u0643\u0628\u0631\u060c \u0645\u0627 \u0647\u0648\u061f',
    options: ['\u0627\u0644\u0628\u062d\u0631', '\u0627\u0644\u062d\u0641\u0631\u0629', '\u0627\u0644\u062c\u0628\u0644', '\u0627\u0644\u0646\u0648\u0631'],
    correctIndex: 1,
    explanation: '\u0627\u0644\u062d\u0641\u0631\u0629 \u062a\u0643\u0628\u0631 \u0643\u0644\u0645\u0627 \u0623\u062e\u0630\u062a \u0645\u0646\u0647\u0627.'
  },
  {
    question: '\u0631\u0642\u0645 \u0625\u0630\u0627 \u0636\u0631\u0628\u062a\u0647 \u0641\u064a \u0646\u0641\u0633\u0647 \u0643\u0627\u0646 81\u060c \u0645\u0627 \u0647\u0648\u061f',
    options: ['7', '8', '9', '10'],
    correctIndex: 2,
    explanation: '9 x 9 = 81'
  },
  {
    question: '\u0645\u0627 \u0627\u0644\u0639\u062f\u062f \u0627\u0644\u062a\u0627\u0644\u064a \u0641\u064a \u0627\u0644\u0646\u0645\u0637: 2\u060c 4\u060c 8\u060c 16\u060c \u061f',
    options: ['18', '24', '30', '32'],
    correctIndex: 3,
    explanation: '\u0627\u0644\u0646\u0645\u0637 \u064a\u062a\u0636\u0627\u0639\u0641 \u0643\u0644 \u0645\u0631\u0629.'
  },
  {
    question: '\u0623\u064a \u0639\u062f\u062f \u0623\u0648\u0644\u064a \u0645\u0646 \u0647\u0630\u0647 \u0627\u0644\u0623\u0639\u062f\u0627\u062f\u061f',
    options: ['21', '27', '29', '33'],
    correctIndex: 2,
    explanation: '29 \u0644\u0627 \u064a\u0642\u0628\u0644 \u0627\u0644\u0642\u0633\u0645\u0629 \u0625\u0644\u0627 \u0639\u0644\u0649 1 \u0648 29.'
  },
  {
    question: '\u0625\u0630\u0627 \u0643\u0627\u0646 \u0633 + 5 = 12\u060c \u0641\u0645\u0627 \u0642\u064a\u0645\u0629 \u0633\u061f',
    options: ['5', '6', '7', '8'],
    correctIndex: 2,
    explanation: '12 - 5 = 7'
  },
  {
    question: '\u0643\u0645 \u062f\u0642\u064a\u0642\u0629 \u0641\u064a \u0633\u0627\u0639\u062a\u064a\u0646\u061f',
    options: ['90', '100', '120', '140'],
    correctIndex: 2,
    explanation: '\u0643\u0644 \u0633\u0627\u0639\u0629 60 \u062f\u0642\u064a\u0642\u0629\u060c \u0625\u0630\u0646 120.'
  },
  {
    question: '\u0623\u064a \u0631\u0642\u0645 \u064a\u0643\u0645\u0644 \u0627\u0644\u0645\u062a\u0633\u0644\u0633\u0644\u0629: 1\u060c 1\u060c 2\u060c 3\u060c 5\u060c \u061f',
    options: ['6', '7', '8', '9'],
    correctIndex: 2,
    explanation: '\u0647\u064a \u0645\u062a\u0633\u0644\u0633\u0644\u0629 \u0641\u064a\u0628\u0648\u0646\u0627\u062a\u0634\u064a\u060c \u0648\u0627\u0644\u0639\u062f\u062f \u0627\u0644\u062a\u0627\u0644\u064a 8.'
  },
  {
    question: '\u0623\u064a\u0647\u0645\u0627 \u0623\u062b\u0642\u0644: 1 \u0643\u063a \u062d\u062f\u064a\u062f \u0623\u0645 1 \u0643\u063a \u0642\u0637\u0646\u061f',
    options: ['\u0627\u0644\u062d\u062f\u064a\u062f', '\u0627\u0644\u0642\u0637\u0646', '\u0645\u062a\u0633\u0627\u0648\u064a\u0627\u0646', '\u062d\u0633\u0628 \u0627\u0644\u062d\u062c\u0645'],
    correctIndex: 2,
    explanation: '\u0643\u0644\u0627\u0647\u0645\u0627 1 \u0643\u063a.'
  },
  {
    question: '\u0645\u0627 \u0646\u0627\u062a\u062c 100 - 37\u061f',
    options: ['53', '63', '73', '83'],
    correctIndex: 1,
    explanation: '100 - 37 = 63'
  },
  {
    question: '\u0645\u0627 \u0646\u0635\u0641 \u0627\u0644\u0639\u062f\u062f 50\u061f',
    options: ['20', '25', '30', '35'],
    correctIndex: 1,
    explanation: '50 / 2 = 25'
  },
  {
    question: '\u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u064a\u0648\u0645 \u0627\u0644\u062b\u0644\u0627\u062b\u0627\u0621\u060c \u0641\u0645\u0627 \u0627\u0644\u064a\u0648\u0645 \u0628\u0639\u062f \u064a\u0648\u0645\u064a\u0646\u061f',
    options: ['\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621', '\u0627\u0644\u062e\u0645\u064a\u0633', '\u0627\u0644\u062c\u0645\u0639\u0629', '\u0627\u0644\u0633\u0628\u062a'],
    correctIndex: 1,
    explanation: '\u0627\u0644\u062b\u0644\u0627\u062b\u0627\u0621 + \u064a\u0648\u0645\u064a\u0646 = \u0627\u0644\u062e\u0645\u064a\u0633'
  },
  {
    question: '\u0643\u0645 \u062d\u0631\u0641\u0627 \u0641\u064a \u0643\u0644\u0645\u0629 "\u0628\u0631\u0645\u062c\u0629"\u061f',
    options: ['4', '5', '6', '7'],
    correctIndex: 1,
    explanation: '\u0628 \u0631 \u0645 \u062c \u0629 = 5 \u0623\u062d\u0631\u0641'
  },
  {
    question: '\u0643\u0645 \u062b\u0627\u0646\u064a\u0629 \u0641\u064a 5 \u062f\u0642\u0627\u0626\u0642\u061f',
    options: ['120', '180', '240', '300'],
    correctIndex: 3,
    explanation: '5 x 60 = 300'
  },
  {
    question: '\u0645\u0627 \u0627\u0644\u0639\u062f\u062f \u0627\u0644\u062a\u0627\u0644\u064a: 10\u060c 20\u060c 30\u060c 40\u060c \u061f',
    options: ['45', '50', '55', '60'],
    correctIndex: 1,
    explanation: '\u0632\u064a\u0627\u062f\u0629 10 \u0643\u0644 \u0645\u0631\u0629'
  },
  {
    question: '\u0644\u0648 \u0644\u062f\u064a\u0643 12 \u0643\u0631\u0629 \u0648\u0641\u0642\u062f\u062a 5\u060c \u0643\u0645 \u064a\u0628\u0642\u0649\u061f',
    options: ['5', '6', '7', '8'],
    correctIndex: 2,
    explanation: '12 - 5 = 7'
  },
  {
    question: '\u0641\u064a \u0627\u0644\u0646\u0645\u0637 5\u060c 10\u060c 20\u060c 40\u060c \u0627\u0644\u0639\u062f\u062f \u0627\u0644\u062a\u0627\u0644\u064a \u0647\u0648:',
    options: ['45', '60', '70', '80'],
    correctIndex: 3,
    explanation: '\u0627\u0644\u0639\u062f\u062f \u064a\u062a\u0636\u0627\u0639\u0641 \u0643\u0644 \u0645\u0631\u0629'
  },
  {
    question: '\u0645\u0627 \u0646\u0627\u062a\u062c 11 + 22\u061f',
    options: ['31', '32', '33', '34'],
    correctIndex: 2,
    explanation: '11 + 22 = 33'
  },
  {
    question: '\u0623\u064a \u0643\u0644\u0645\u0629 \u0639\u0643\u0633 "\u0633\u0631\u064a\u0639"\u061f',
    options: ['\u0646\u0634\u064a\u0637', '\u0628\u0637\u064a\u0621', '\u0642\u0648\u064a', '\u062e\u0641\u064a\u0641'],
    correctIndex: 1,
    explanation: '\u0639\u0643\u0633 \u0633\u0631\u064a\u0639 \u0647\u0648 \u0628\u0637\u064a\u0621'
  },
  {
    question: '\u0645\u0627 \u0646\u0627\u062a\u062c 15 \u00f7 3\u061f',
    options: ['3', '4', '5', '6'],
    correctIndex: 2,
    explanation: '15 / 3 = 5'
  },
  {
    question: '\u0623\u064a \u0634\u0643\u0644 \u0644\u0647 4 \u0623\u0636\u0644\u0627\u0639 \u0645\u062a\u0633\u0627\u0648\u064a\u0629\u061f',
    options: ['\u0645\u062b\u0644\u062b', '\u0645\u0633\u062a\u0637\u064a\u0644', '\u0645\u0631\u0628\u0639', '\u062f\u0627\u0626\u0631\u0629'],
    correctIndex: 2,
    explanation: '\u0627\u0644\u0645\u0631\u0628\u0639 \u0623\u0636\u0644\u0627\u0639\u0647 \u0627\u0644\u0623\u0631\u0628\u0639\u0629 \u0645\u062a\u0633\u0627\u0648\u064a\u0629'
  },
  {
    question: '\u0645\u0627 \u0627\u0644\u0639\u062f\u062f \u0627\u0644\u0623\u0643\u0628\u0631\u061f',
    options: ['0.8', '0.75', '0.9', '0.89'],
    correctIndex: 2,
    explanation: '0.9 \u0647\u0648 \u0627\u0644\u0623\u0643\u0628\u0631'
  },
  {
    question: '\u0623\u064a \u0645\u0646 \u0647\u0630\u0647 \u0644\u064a\u0633\u062a \u0643\u0648\u0643\u0628\u0627\u061f',
    options: ['\u0627\u0644\u0645\u0631\u064a\u062e', '\u0627\u0644\u0632\u0647\u0631\u0629', '\u0627\u0644\u0642\u0645\u0631', '\u0632\u062d\u0644'],
    correctIndex: 2,
    explanation: '\u0627\u0644\u0642\u0645\u0631 \u062a\u0627\u0628\u0639 \u0637\u0628\u064a\u0639\u064a \u0648\u0644\u064a\u0633 \u0643\u0648\u0643\u0628\u0627'
  }
];

const CARD_POOL = [
  { name: '\u0645\u062d\u0627\u0631\u0628 \u0627\u0644\u0631\u0645\u0644', attack: 11, defense: 8, rarity: 'common', emoji: '\ud83d\udde1\ufe0f' },
  { name: '\u062d\u0627\u0631\u0633 \u0627\u0644\u0642\u0644\u0639\u0629', attack: 9, defense: 12, rarity: 'common', emoji: '\ud83d\udee1\ufe0f' },
  { name: '\u0633\u0647\u0645 \u0627\u0644\u0628\u0631\u0642', attack: 13, defense: 7, rarity: 'common', emoji: '\ud83c\udff9' },
  { name: '\u0641\u0627\u0631\u0633 \u0627\u0644\u0644\u064a\u0644', attack: 15, defense: 10, rarity: 'rare', emoji: '\ud83c\udf19' },
  { name: '\u0639\u064a\u0646 \u0627\u0644\u0635\u0642\u0631', attack: 16, defense: 9, rarity: 'rare', emoji: '\ud83e\udd85' },
  { name: '\u062a\u0646\u064a\u0646 \u0627\u0644\u0623\u0633\u0627\u0637\u064a\u0631', attack: 19, defense: 16, rarity: 'legendary', emoji: '\ud83d\udc09' },
  { name: '\u0645\u0644\u0643 \u0627\u0644\u0639\u0648\u0627\u0635\u0641', attack: 20, defense: 15, rarity: 'legendary', emoji: '\ud83d\udc51' }
];

const CARD_RARITY = {
  common: { label: '\u0639\u0627\u062f\u064a', bonus: 0 },
  rare: { label: '\u0646\u0627\u062f\u0631', bonus: 2 },
  legendary: { label: '\u0623\u0633\u0637\u0648\u0631\u064a', bonus: 5 }
};

const GEM_ICONS = ['\ud83d\udc8e', '\ud83d\udc99', '\ud83d\udc9a', '\ud83d\udc9b', '\ud83e\ude77', '\ud83d\udc9c'];
const BLAST_LEVELS = [
  { bombs: 3, timerSeconds: 22, boardSize: 12 },
  { bombs: 3, timerSeconds: 20, boardSize: 12 },
  { bombs: 4, timerSeconds: 18, boardSize: 12 },
  { bombs: 5, timerSeconds: 17, boardSize: 12 },
  { bombs: 6, timerSeconds: 15, boardSize: 12 }
];

class NewGamesHandler {
  static bombTimers = new Map();
  static blastTimers = new Map();

  static pickRandom(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  static shuffleIndexes(length) {
    const indexes = Array.from({ length }, (_, idx) => idx);
    for (let i = indexes.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }
    return indexes;
  }

  static pickMindPuzzleWithoutRepetition(session) {
    session.mindState = session.mindState || {};
    const total = MIND_PUZZLES.length;

    if (!Array.isArray(session.mindState.pool) || session.mindState.pool.length === 0 || session.mindState.total !== total) {
      session.mindState.pool = this.shuffleIndexes(total);
      session.mindState.total = total;

      // Avoid same question مباشرة عند بدء دورة جديدة.
      if (
        total > 1 &&
        Number.isInteger(session.mindState.lastIndex) &&
        session.mindState.pool[session.mindState.pool.length - 1] === session.mindState.lastIndex
      ) {
        const swapWith = Math.floor(Math.random() * (session.mindState.pool.length - 1));
        const lastPos = session.mindState.pool.length - 1;
        [session.mindState.pool[lastPos], session.mindState.pool[swapWith]] = [
          session.mindState.pool[swapWith],
          session.mindState.pool[lastPos]
        ];
      }
    }

    let selectedIndex = session.mindState.pool.pop();

    // Safety: no immediate repeat if there is an alternative.
    if (
      total > 1 &&
      selectedIndex === session.mindState.lastIndex &&
      session.mindState.pool.length > 0
    ) {
      const alternative = session.mindState.pool.pop();
      session.mindState.pool.unshift(selectedIndex);
      selectedIndex = alternative;
    }

    session.mindState.lastIndex = selectedIndex;
    return MIND_PUZZLES[selectedIndex];
  }

  static clearBombTimer(userId) {
    const timer = this.bombTimers.get(userId);
    if (!timer) return;
    clearTimeout(timer.timeout);
    clearInterval(timer.interval);
    this.bombTimers.delete(userId);
  }

  static clearBlastTimer(userId) {
    const timer = this.blastTimers.get(userId);
    if (!timer) return;
    clearInterval(timer.interval);
    this.blastTimers.delete(userId);
  }

  static async safeEditOrReply(ctx, text, replyMarkup) {
    const payload = {
      parse_mode: 'HTML',
      reply_markup: replyMarkup
    };
    try {
      return await ctx.editMessageText(text, payload);
    } catch (_error) {
      return ctx.reply(text, payload);
    }
  }

  static getBlastLevelConfig(level = 1) {
    return BLAST_LEVELS[Math.max(0, Math.min(BLAST_LEVELS.length - 1, Number(level || 1) - 1))];
  }

  static pickUniqueIndexes(total, count) {
    const indexes = this.shuffleIndexes(total);
    return new Set(indexes.slice(0, count));
  }

  static createBlastBoard(level = 1) {
    const config = this.getBlastLevelConfig(level);
    const bombIndexes = this.pickUniqueIndexes(config.boardSize, config.bombs);

    return Array.from({ length: config.boardSize }, (_, index) => ({
      type: bombIndexes.has(index) ? 'bomb' : 'gem',
      revealed: false,
      gemIcon: this.pickRandom(GEM_ICONS)
    }));
  }

  static countBlastGems(board = []) {
    return board.filter((cell) => cell.type === 'gem').length;
  }

  static countRevealedBlastGems(board = []) {
    return board.filter((cell) => cell.type === 'gem' && cell.revealed).length;
  }

  static getBlastMultiplier(level = 1, gemsOpened = 0) {
    return 1 + ((Math.max(1, level) - 1) * 0.35) + (gemsOpened * 0.04);
  }

  static formatBlastMoney(value = 0) {
    return `${Math.max(0, Math.floor(value))}$`;
  }

  static getBlastCellLabel(cell, ended = false) {
    if (!cell.revealed && !ended) return '🔘';
    if (cell.type === 'bomb') return '💣';
    return cell.gemIcon || '💎';
  }

  static buildBlastKeyboard(state, { ended = false } = {}) {
    const rows = [];
    for (let i = 0; i < state.board.length; i += 4) {
      const row = state.board.slice(i, i + 4).map((cell, offset) => {
        const index = i + offset;
        const callbackData = (!ended && !cell.revealed) ? `game:blast:pick:${index}` : 'game:blast:noop';
        return Markup.button.callback(this.getBlastCellLabel(cell, ended), callbackData);
      });
      rows.push(row);
    }

    if (!ended) {
      rows.push([Markup.button.callback(`💰 سحب ${this.formatBlastMoney(state.pendingReward)}`, 'game:blast:cashout')]);
    } else {
      rows.push([Markup.button.callback('🔄 لعبة جديدة', 'game:blast')]);
    }

    rows.push([Markup.button.callback('⬅️ رجوع', 'menu:games')]);
    return Markup.inlineKeyboard(rows);
  }

  static formatBlastText(state, secondsLeft = null) {
    const totalGems = this.countBlastGems(state.board);
    const revealedGems = this.countRevealedBlastGems(state.board);
    const remainingGems = Math.max(0, totalGems - revealedGems);
    const safeProgress = `${revealedGems}/${totalGems}`;
    const seconds = secondsLeft ?? Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000));

    return (
      '💎 <b>لعبة زر التفجير</b>\n\n' +
      `🎯 المرحلة: <b>${state.level}/${BLAST_LEVELS.length}</b>\n` +
      `💣 القنابل: <b>${state.bombs}</b>\n` +
      `💎 الجواهر المتبقية: <b>${remainingGems}</b>\n` +
      `📈 المضاعف: <b>x${state.multiplier.toFixed(2)}</b>\n` +
      `💰 الربح المعلّق: <b>${this.formatBlastMoney(state.pendingReward)}</b>\n` +
      `🌈 التقدم الآمن: <b>${safeProgress}</b>\n` +
      `⏱️ الوقت المتبقي: <b>${seconds}</b> ثانية\n\n` +
      `${state.lastEvent || 'اضغط زرًا واحدًا. الجوهرة تزيد ربحك، والقنبلة تنهي الجولة فورًا.'}`
    );
  }

  static async startBlastTimer(ctx, chatId, messageId) {
    this.clearBlastTimer(ctx.from.id);

    const interval = setInterval(async () => {
      const state = ctx.session?.blastGame;
      if (!state || !state.active) {
        this.clearBlastTimer(ctx.from.id);
        return;
      }

      const secondsLeft = Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000));
      if (secondsLeft <= 0) {
        await this.handleBlastTimeout(ctx, chatId, messageId);
        return;
      }

      if (!chatId || !messageId) return;
      try {
        await ctx.telegram.editMessageText(chatId, messageId, undefined, this.formatBlastText(state, secondsLeft), {
          parse_mode: 'HTML',
          reply_markup: this.buildBlastKeyboard(state).reply_markup
        });
      } catch (_error) {
        // ignore timer edit errors
      }
    }, 1000);

    this.blastTimers.set(ctx.from.id, { interval });
  }

  static async handleBlastGame(ctx) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();
      ctx.session = ctx.session || {};

      const board = this.createBlastBoard(1);
      const state = {
        active: true,
        level: 1,
        board,
        bombs: this.getBlastLevelConfig(1).bombs,
        pendingReward: 0,
        multiplier: 1,
        gemsOpened: 0,
        lastEvent: 'ابدأ بحذر: هناك <b>3</b> متفجرات مخفية والباقي جواهر ملوّنة.',
        endAt: Date.now() + (this.getBlastLevelConfig(1).timerSeconds * 1000)
      };

      ctx.session.blastGame = state;
      const keyboard = this.buildBlastKeyboard(state);
      await this.safeEditOrReply(ctx, this.formatBlastText(state), keyboard.reply_markup);

      const chatId = ctx.callbackQuery?.message?.chat?.id;
      const messageId = ctx.callbackQuery?.message?.message_id;
      await this.startBlastTimer(ctx, chatId, messageId);
    } catch (error) {
      console.error('Error in handleBlastGame:', error);
      await ctx.reply('❌ حدث خطأ في لعبة زر التفجير');
    }
  }

  static async settleBlastWin(ctx, state, { completed = false } = {}) {
    const payout = Math.max(0, Math.floor(state.pendingReward + (completed ? 75 : 0)));
    state.active = false;
    ctx.session.blastGame = null;
    this.clearBlastTimer(ctx.from.id);

    await GameManager.updateGameStats(ctx.from.id, '\u0632\u0631_\u0627\u0644\u062a\u0641\u062c\u064a\u0631', 'win', payout);
    if (payout > 0) {
      await EconomyManager.addCoins(ctx.from.id, payout, completed ? '\u0625\u0646\u0647\u0627\u0621 \u0644\u0639\u0628\u0629 \u0632\u0631 \u0627\u0644\u062a\u0641\u062c\u064a\u0631' : '\u0633\u062d\u0628 \u0623\u0631\u0628\u0627\u062d \u0632\u0631 \u0627\u0644\u062a\u0641\u062c\u064a\u0631');
    }

    const keyboard = this.buildBlastKeyboard(state, { ended: true });
    const text = completed
      ? `🏆 <b>ختمت اللعبة للنهاية!</b>\n\n💰 مجموع أرباحك: <b>${this.formatBlastMoney(payout)}</b>\n🎁 بونص الختم: <b>75$</b>\n🌈 لعبت كل المراحل بدون خسارة.`
      : `💰 <b>تم السحب بنجاح</b>\n\n💎 سحبت: <b>${this.formatBlastMoney(payout)}</b>\n📈 وصلت حتى المرحلة: <b>${state.level}</b>`;

    await this.safeEditOrReply(ctx, text, keyboard.reply_markup);
  }

  static async handleBlastTimeout(ctx, chatId, messageId) {
    const state = ctx.session?.blastGame;
    if (!state || !state.active) {
      this.clearBlastTimer(ctx.from.id);
      return;
    }

    state.active = false;
    ctx.session.blastGame = null;
    this.clearBlastTimer(ctx.from.id);
    await GameManager.updateGameStats(ctx.from.id, '\u0632\u0631_\u0627\u0644\u062a\u0641\u062c\u064a\u0631', 'lost', 0);

    const keyboard = this.buildBlastKeyboard(state, { ended: true });
    const text =
      '⏰ <b>انتهى الوقت!</b>\n\n' +
      `💣 ضاع عليك الربح المعلّق: <b>${this.formatBlastMoney(state.pendingReward)}</b>\n` +
      'جرّب مرة ثانية أو اسحب مبكرًا في الجولة القادمة.';

    if (chatId && messageId) {
      try {
        await ctx.telegram.editMessageText(chatId, messageId, undefined, text, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } catch (_error) {
        await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup });
      }
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup });
    }
  }

  static async handleBlastPick(ctx, cellIndex) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();
      ctx.session = ctx.session || {};
      const state = ctx.session.blastGame;
      if (!state || !state.active) return;

      if (Date.now() > state.endAt) {
        return this.handleBlastTimeout(ctx, ctx.callbackQuery?.message?.chat?.id, ctx.callbackQuery?.message?.message_id);
      }

      const cell = state.board[Number(cellIndex)];
      if (!cell || cell.revealed) return;
      cell.revealed = true;

      if (cell.type === 'bomb') {
        state.active = false;
        state.board.forEach((item) => {
          if (item.type === 'bomb') item.revealed = true;
        });
        ctx.session.blastGame = null;
        this.clearBlastTimer(ctx.from.id);
        await GameManager.updateGameStats(ctx.from.id, '\u0632\u0631_\u0627\u0644\u062a\u0641\u062c\u064a\u0631', 'lost', 0);

        const keyboard = this.buildBlastKeyboard(state, { ended: true });
        const text =
          '💥 <b>انفجار!</b>\n\n' +
          `💣 ضغطت على متفجرة وخسرت الربح المعلّق: <b>${this.formatBlastMoney(state.pendingReward)}</b>\n` +
          'نصيحة: اسحب أرباحك قبل ما تزيد المجازفة.';
        await this.safeEditOrReply(ctx, text, keyboard.reply_markup);
        return;
      }

      state.gemsOpened += 1;
      state.multiplier = this.getBlastMultiplier(state.level, state.gemsOpened);

      const gemReward = Math.max(10, Math.floor(10 * state.multiplier));
      let bonus = 0;
      if (Math.random() < 0.18) {
        bonus = this.pickRandom([10, 20, 30, 40]);
      }
      state.pendingReward += gemReward + bonus;

      const rainbowLabel = this.pickRandom(['🌈 لمعة قوسية', '✨ بريق ملوّن', '🪩 ومضة جوهرة', '🎆 وميض احترافي']);
      state.lastEvent =
        `${rainbowLabel}\n` +
        `💎 جوهرة مكتشفة: <b>+${this.formatBlastMoney(gemReward)}</b>` +
        `${bonus > 0 ? `\n🎁 بونص عشوائي: <b>+${this.formatBlastMoney(bonus)}</b>` : ''}`;

      const totalGems = this.countBlastGems(state.board);
      const revealedGems = this.countRevealedBlastGems(state.board);

      if (revealedGems >= totalGems) {
        if (state.level >= BLAST_LEVELS.length) {
          await this.settleBlastWin(ctx, state, { completed: true });
          return;
        }

        state.level += 1;
        const nextConfig = this.getBlastLevelConfig(state.level);
        state.board = this.createBlastBoard(state.level);
        state.bombs = nextConfig.bombs;
        state.gemsOpened = 0;
        state.multiplier = this.getBlastMultiplier(state.level, 0);
        state.endAt = Date.now() + (nextConfig.timerSeconds * 1000);
        state.lastEvent =
          `🚀 انتقلت للمرحلة <b>${state.level}</b>\n` +
          `💣 عدد المتفجرات الآن: <b>${state.bombs}</b>\n` +
          `💰 ربحك المعلّق مستمر: <b>${this.formatBlastMoney(state.pendingReward)}</b>`;
      }

      await this.safeEditOrReply(ctx, this.formatBlastText(state), this.buildBlastKeyboard(state).reply_markup);
    } catch (error) {
      console.error('Error in handleBlastPick:', error);
      await ctx.reply('❌ حدث خطأ أثناء اختيار الزر');
    }
  }

  static async handleBlastCashout(ctx) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();
      ctx.session = ctx.session || {};
      const state = ctx.session.blastGame;
      if (!state || !state.active) return;

      if (state.pendingReward <= 0) {
        await ctx.answerCbQuery('افتح جوهرة واحدة على الأقل أولاً', { show_alert: false }).catch(() => {});
        return;
      }

      await this.settleBlastWin(ctx, state, { completed: false });
    } catch (error) {
      console.error('Error in handleBlastCashout:', error);
      await ctx.reply('❌ حدث خطأ أثناء سحب الأرباح');
    }
  }

  static formatBombText(question, secondsLeft) {
    return (
      '\ud83d\udca3 <b>\u0644\u0639\u0628\u0629 \u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0633\u0644\u0643 \u0627\u0644\u0635\u062d\u064a\u062d</b>\n\n' +
      `\u23f3 \u0627\u0644\u0648\u0642\u062a \u0627\u0644\u0645\u062a\u0628\u0642\u064a: <b>${secondsLeft}</b> \u062b\u0627\u0646\u064a\u0629\n` +
      '\u26a0\ufe0f \u0633\u0644\u0643 \u0648\u0627\u062d\u062f \u0641\u0642\u0637 \u0647\u0648 \u0627\u0644\u0622\u0645\u0646\u060c \u0648\u0628\u0627\u0642\u064a \u0627\u0644\u0623\u0633\u0644\u0627\u0643 \u062a\u0641\u062c\u0651\u0631 \u0627\u0644\u0642\u0646\u0628\u0644\u0629.\n\n' +
      `\ud83e\uddf5 \u0639\u062f\u062f \u0627\u0644\u0623\u0633\u0644\u0627\u0643: <b>${question.wires.length}</b>\n` +
      '\u0627\u062e\u062a\u0631 \u0633\u0644\u0643\u0627\u064b \u0648\u0627\u062d\u062f\u0627\u064b \u0642\u0628\u0644 \u0627\u0646\u062a\u0647\u0627\u0621 \u0627\u0644\u0648\u0642\u062a.'
    );
  }

  static async handleBombDefuse(ctx) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();
      ctx.session = ctx.session || {};

      const wireCount = Math.floor(Math.random() * 4) + 3;
      const safeWireIndex = Math.floor(Math.random() * wireCount);
      const wires = Array.from({ length: wireCount }, (_, index) => ({
        index,
        label: `🧵 السلك ${index + 1}`
      }));
      const baseReward = 20 + (wireCount * 10);
      const endAt = Date.now() + 10_000;

      ctx.session.bombGame = {
        active: true,
        question: { wires },
        correctIndex: safeWireIndex,
        baseReward,
        endAt
      };

      this.clearBombTimer(ctx.from.id);

      const rows = wires.map((wire, index) => [
        Markup.button.callback(wire.label, `game:bomb:ans:${index}`)
      ]);
      rows.push([Markup.button.callback('\u2b05\ufe0f \u0631\u062c\u0648\u0639', 'menu:games')]);
      const keyboard = Markup.inlineKeyboard(rows);

      await this.safeEditOrReply(ctx, this.formatBombText({ wires }, 10), keyboard.reply_markup);

      const chatId = ctx.callbackQuery?.message?.chat?.id;
      const messageId = ctx.callbackQuery?.message?.message_id;

      const interval = setInterval(async () => {
        const state = ctx.session?.bombGame;
        if (!state || !state.active) return this.clearBombTimer(ctx.from.id);

        const secondsLeft = Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000));
        if (secondsLeft <= 0) return;
        if (!chatId || !messageId) return;

        try {
          await ctx.telegram.editMessageText(chatId, messageId, undefined, this.formatBombText(state.question, secondsLeft), {
            parse_mode: 'HTML',
            reply_markup: keyboard.reply_markup
          });
        } catch (_error) {
          // ignore timer edit errors
        }
      }, 1000);

      const timeout = setTimeout(async () => {
        await this.handleBombTimeout(ctx, chatId, messageId);
      }, 10_000);

      this.bombTimers.set(ctx.from.id, { interval, timeout });
    } catch (error) {
      console.error('Error in handleBombDefuse:', error);
      await ctx.reply('\u274c \u062d\u062f\u062b \u062e\u0637\u0623 \u0641\u064a \u0644\u0639\u0628\u0629 \u062a\u0641\u0643\u064a\u0643 \u0627\u0644\u0642\u0646\u0628\u0644\u0629');
    }
  }

  static async handleBombTimeout(ctx, chatId, messageId) {
    const state = ctx.session?.bombGame;
    if (!state || !state.active) {
      this.clearBombTimer(ctx.from.id);
      return;
    }

    state.active = false;
    ctx.session.bombGame = null;
    this.clearBombTimer(ctx.from.id);

    await GameManager.updateGameStats(ctx.from.id, '\u0627\u0644\u0633\u0644\u0643_\u0627\u0644\u0635\u062d\u064a\u062d', 'lost', 0);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('\ud83d\udd04 \u0645\u062d\u0627\u0648\u0644\u0629 \u062c\u062f\u064a\u062f\u0629', 'game:bomb')],
      [Markup.button.callback('\u2b05\ufe0f \u0631\u062c\u0648\u0639', 'menu:games')]
    ]);

    const text =
      '\ud83d\udca5 <b>\u0627\u0646\u062a\u0647\u0649 \u0627\u0644\u0648\u0642\u062a!</b>\n\n' +
      `\u2705 \u0627\u0644\u0633\u0644\u0643 \u0627\u0644\u0622\u0645\u0646 \u0643\u0627\u0646: <b>\u0627\u0644\u0633\u0644\u0643 ${Number(state.correctIndex) + 1}</b>`;

    if (chatId && messageId) {
      try {
        await ctx.telegram.editMessageText(chatId, messageId, undefined, text, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } catch (_error) {
        await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup });
      }
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup });
    }
  }

  static async handleBombAnswer(ctx, answerIndex) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();
      ctx.session = ctx.session || {};
      const state = ctx.session.bombGame;
      if (!state || !state.active) return;

      if (Date.now() > state.endAt) {
        return this.handleBombTimeout(ctx, ctx.callbackQuery?.message?.chat?.id, ctx.callbackQuery?.message?.message_id);
      }

      state.active = false;
      ctx.session.bombGame = null;
      this.clearBombTimer(ctx.from.id);

      const isCorrect = Number(answerIndex) === Number(state.correctIndex);
      const reward = isCorrect ? state.baseReward * 2 : 0;
      const result = isCorrect ? 'win' : 'lost';

      await GameManager.updateGameStats(ctx.from.id, '\u0627\u0644\u0633\u0644\u0643_\u0627\u0644\u0635\u062d\u064a\u062d', result, reward);
      if (isCorrect && reward > 0) {
        await EconomyManager.addCoins(ctx.from.id, reward, '\u0641\u0648\u0632 \u0641\u064a \u0644\u0639\u0628\u0629 \u0627\u0644\u0633\u0644\u0643 \u0627\u0644\u0635\u062d\u064a\u062d');
      }

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('\ud83d\udd04 \u062c\u0648\u0644\u0629 \u062c\u062f\u064a\u062f\u0629', 'game:bomb')],
        [Markup.button.callback('\u2b05\ufe0f \u0631\u062c\u0648\u0639', 'menu:games')]
      ]);

      const text = isCorrect
        ? `\u2705 <b>\u0646\u062c\u0648\u062a!</b>\n\n\ud83e\uddf5 \u0627\u062e\u062a\u0631\u062a \u0627\u0644\u0633\u0644\u0643 \u0627\u0644\u0622\u0645\u0646\n\ud83d\udcb0 \u0627\u0644\u0645\u0643\u0627\u0641\u0623\u0629: <b>${reward}</b> \u0639\u0645\u0644\u0629`
        : `\ud83d\udca3 <b>\u0627\u0646\u0641\u062c\u0631\u062a \u0627\u0644\u0642\u0646\u0628\u0644\u0629!</b>\n\n\u274c \u0627\u062e\u062a\u0631\u062a \u0627\u0644\u0633\u0644\u0643 \u0627\u0644\u062e\u0637\u0623\n\u2705 \u0627\u0644\u0633\u0644\u0643 \u0627\u0644\u0622\u0645\u0646 \u0643\u0627\u0646: <b>\u0627\u0644\u0633\u0644\u0643 ${Number(state.correctIndex) + 1}</b>`;

      await this.safeEditOrReply(ctx, text, keyboard.reply_markup);
    } catch (error) {
      console.error('Error in handleBombAnswer:', error);
      await ctx.reply('\u274c \u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u0645\u0639\u0627\u0644\u062c\u0629 \u0625\u062c\u0627\u0628\u0629 \u0627\u0644\u0642\u0646\u0628\u0644\u0629');
    }
  }

  static drawCards(count = 3) {
    const cards = [];
    for (let i = 0; i < count; i += 1) {
      cards.push({ ...this.pickRandom(CARD_POOL) });
    }
    return cards;
  }

  static calcCardPower(card) {
    const rarity = CARD_RARITY[card.rarity] || CARD_RARITY.common;
    const variance = Math.floor(Math.random() * 5) - 2;
    return card.attack + card.defense + rarity.bonus + variance;
  }

  static cardBattleText(state) {
    let text =
      '\ud83c\udccf <b>\u0645\u0639\u0631\u0643\u0629 \u0627\u0644\u0628\u0637\u0627\u0642\u0627\u062a</b>\n\n' +
      `\ud83c\udfc1 \u0627\u0644\u062c\u0648\u0644\u0629: ${state.round}/3\n` +
      `\ud83d\udcca \u0627\u0644\u0646\u062a\u064a\u062c\u0629: \u0623\u0646\u062a ${state.playerScore} - ${state.botScore} \u0627\u0644\u062e\u0635\u0645\n\n`;

    if (state.lastRound) {
      text +=
        `\u0623\u0646\u062a: ${state.lastRound.playerCard.emoji} ${state.lastRound.playerCard.name} (${state.lastRound.playerPower})\n` +
        `\u0627\u0644\u062e\u0635\u0645: ${state.lastRound.botCard.emoji} ${state.lastRound.botCard.name} (${state.lastRound.botPower})\n` +
        `${state.lastRound.outcome}\n\n`;
    }

    text += '\u0627\u062e\u062a\u0631 \u0628\u0637\u0627\u0642\u0629:\n';
    state.playerCards.forEach((card, idx) => {
      if (!card) return;
      const rarity = CARD_RARITY[card.rarity] || CARD_RARITY.common;
      text += `${idx + 1}. ${card.emoji} <b>${card.name}</b> (${rarity.label})\n`;
    });

    return text;
  }

  static async grantLegendaryGift(userId) {
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
        itemName: '\u062d\u0632\u0645\u0629 \u0628\u0637\u0627\u0642\u0627\u062a \u0623\u0633\u0637\u0648\u0631\u064a\u0629',
        quantity: 1,
        boughtAt: new Date()
      });
    }

    await user.save();
    return true;
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
        [Markup.button.callback('\u0628\u0637\u0627\u0642\u0629 1', 'game:card:pick:0')],
        [Markup.button.callback('\u0628\u0637\u0627\u0642\u0629 2', 'game:card:pick:1')],
        [Markup.button.callback('\u0628\u0637\u0627\u0642\u0629 3', 'game:card:pick:2')],
        [Markup.button.callback('\u2b05\ufe0f \u0631\u062c\u0648\u0639', 'menu:games')]
      ]);

      await this.safeEditOrReply(ctx, this.cardBattleText(ctx.session.cardBattle), keyboard.reply_markup);
    } catch (error) {
      console.error('Error in handleCardBattle:', error);
      await ctx.reply('\u274c \u062d\u062f\u062b \u062e\u0637\u0623 \u0641\u064a \u0645\u0639\u0631\u0643\u0629 \u0627\u0644\u0628\u0637\u0627\u0642\u0627\u062a');
    }
  }

  static async handleCardPick(ctx, cardIndex) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();
      ctx.session = ctx.session || {};
      const state = ctx.session.cardBattle;
      if (!state || !state.active) return;

      const playerCard = state.playerCards[cardIndex];
      if (!playerCard) return;

      const botOptions = state.botCards.map((card, idx) => (card ? idx : null)).filter((idx) => idx !== null);
      if (botOptions.length === 0) return;

      const botPickIndex = this.pickRandom(botOptions);
      const botCard = state.botCards[botPickIndex];

      const playerPower = this.calcCardPower(playerCard);
      const botPower = this.calcCardPower(botCard);

      let outcome = '\ud83e\udd1d \u062a\u0639\u0627\u062f\u0644';
      if (playerPower > botPower) {
        state.playerScore += 1;
        outcome = '\u2705 \u0641\u0632\u062a \u0628\u0627\u0644\u062c\u0648\u0644\u0629';
        if (playerCard.rarity === 'legendary') state.usedLegendary = true;
      } else if (playerPower < botPower) {
        state.botScore += 1;
        outcome = '\u274c \u062e\u0633\u0631\u062a \u0627\u0644\u062c\u0648\u0644\u0629';
      }

      state.lastRound = { playerCard, botCard, playerPower, botPower, outcome };
      state.playerCards[cardIndex] = null;
      state.botCards[botPickIndex] = null;
      state.round += 1;

      const hasMore = state.playerCards.some(Boolean) && state.botCards.some(Boolean) && state.round <= 3;
      if (hasMore) {
        const rows = [];
        state.playerCards.forEach((card, idx) => {
          if (card) rows.push([Markup.button.callback(`\u0628\u0637\u0627\u0642\u0629 ${idx + 1}`, `game:card:pick:${idx}`)]);
        });
        rows.push([Markup.button.callback('\u2b05\ufe0f \u0631\u062c\u0648\u0639', 'menu:games')]);

        return this.safeEditOrReply(ctx, this.cardBattleText(state), Markup.inlineKeyboard(rows).reply_markup);
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

      await GameManager.updateGameStats(ctx.from.id, '\u0645\u0639\u0631\u0643\u0629_\u0627\u0644\u0628\u0637\u0627\u0642\u0627\u062a', result, reward);

      let bonusGift = '';
      if (result === 'win' && reward > 0) {
        await EconomyManager.addCoins(ctx.from.id, reward, '\u0641\u0648\u0632 \u0641\u064a \u0645\u0639\u0631\u0643\u0629 \u0627\u0644\u0628\u0637\u0627\u0642\u0627\u062a');
        if (state.usedLegendary) {
          const gifted = await this.grantLegendaryGift(ctx.from.id);
          if (gifted) bonusGift = '\n\ud83c\udf81 \u0631\u0628\u062d\u062a \u062d\u0632\u0645\u0629 \u0628\u0637\u0627\u0642\u0627\u062a \u0623\u0633\u0637\u0648\u0631\u064a\u0629';
        }
      }

      const text =
        '\ud83c\udccf <b>\u0627\u0646\u062a\u0647\u062a \u0645\u0639\u0631\u0643\u0629 \u0627\u0644\u0628\u0637\u0627\u0642\u0627\u062a</b>\n\n' +
        `\ud83d\udcca \u0627\u0644\u0646\u062a\u064a\u062c\u0629: \u0623\u0646\u062a ${state.playerScore} - ${state.botScore} \u0627\u0644\u062e\u0635\u0645\n` +
        `\ud83d\udcb0 \u0627\u0644\u0645\u0643\u0627\u0641\u0623\u0629: ${reward} \u0639\u0645\u0644\u0629${bonusGift}`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('\ud83d\udd04 \u0645\u0639\u0631\u0643\u0629 \u062c\u062f\u064a\u062f\u0629', 'game:cardbattle')],
        [Markup.button.callback('\u2b05\ufe0f \u0631\u062c\u0648\u0639', 'menu:games')]
      ]);

      return this.safeEditOrReply(ctx, text, keyboard.reply_markup);
    } catch (error) {
      console.error('Error in handleCardPick:', error);
      await ctx.reply('\u274c \u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u0645\u0639\u0631\u0643\u0629 \u0627\u0644\u0628\u0637\u0627\u0642\u0627\u062a');
    }
  }

  static async handleMindPuzzle(ctx) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();
      ctx.session = ctx.session || {};

      const puzzle = this.pickMindPuzzleWithoutRepetition(ctx.session);
      const reward = Math.floor(Math.random() * 21) + 20;
      ctx.session.mindPuzzle = { active: true, puzzle, reward };

      const rows = puzzle.options.map((option, idx) => [Markup.button.callback(option, `game:mind:ans:${idx}`)]);
      rows.push([Markup.button.callback('\u2b05\ufe0f \u0631\u062c\u0648\u0639', 'menu:games')]);

      const text =
        '\ud83e\udde0 <b>\u0623\u0644\u063a\u0627\u0632 \u0630\u0643\u0627\u0621</b>\n\n' +
        `${puzzle.question}\n\n` +
        '\u0627\u062e\u062a\u0631 \u0627\u0644\u0625\u062c\u0627\u0628\u0629 \u0627\u0644\u0635\u062d\u064a\u062d\u0629:';

      await this.safeEditOrReply(ctx, text, Markup.inlineKeyboard(rows).reply_markup);
    } catch (error) {
      console.error('Error in handleMindPuzzle:', error);
      await ctx.reply('\u274c \u062d\u062f\u062b \u062e\u0637\u0623 \u0641\u064a \u0644\u0639\u0628\u0629 \u0623\u0644\u063a\u0627\u0632 \u0627\u0644\u0630\u0643\u0627\u0621');
    }
  }

  static async handleMindAnswer(ctx, answerIndex) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();
      ctx.session = ctx.session || {};
      const state = ctx.session.mindPuzzle;
      if (!state || !state.active) return;

      state.active = false;
      ctx.session.mindPuzzle = null;

      const isCorrect = Number(answerIndex) === Number(state.puzzle.correctIndex);
      const result = isCorrect ? 'win' : 'lost';
      const reward = isCorrect ? state.reward : 0;

      await GameManager.updateGameStats(ctx.from.id, '\u0627\u0644\u063a\u0627\u0632_\u0627\u0644\u0630\u0643\u0627\u0621', result, reward);
      if (isCorrect && reward > 0) {
        await EconomyManager.addCoins(ctx.from.id, reward, '\u0641\u0648\u0632 \u0641\u064a \u0644\u0639\u0628\u0629 \u0623\u0644\u063a\u0627\u0632 \u0627\u0644\u0630\u0643\u0627\u0621');
      }

      const text =
        (isCorrect ? '\u2705 <b>\u0625\u062c\u0627\u0628\u0629 \u0635\u062d\u064a\u062d\u0629</b>\n\n' : '\u274c <b>\u0625\u062c\u0627\u0628\u0629 \u062e\u0627\u0637\u0626\u0629</b>\n\n') +
        `\u2705 \u0627\u0644\u0625\u062c\u0627\u0628\u0629 \u0627\u0644\u0635\u062d\u064a\u062d\u0629: <b>${state.puzzle.options[state.puzzle.correctIndex]}</b>\n` +
        `\ud83d\udca1 ${state.puzzle.explanation}\n` +
        `\ud83d\udcb0 \u0627\u0644\u0645\u0643\u0627\u0641\u0623\u0629: ${reward} \u0639\u0645\u0644\u0629`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('\ud83d\udd04 \u0644\u063a\u0632 \u062c\u062f\u064a\u062f', 'game:mind')],
        [Markup.button.callback('\u2b05\ufe0f \u0631\u062c\u0648\u0639', 'menu:games')]
      ]);

      await this.safeEditOrReply(ctx, text, keyboard.reply_markup);
    } catch (error) {
      console.error('Error in handleMindAnswer:', error);
      await ctx.reply('\u274c \u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u0645\u0639\u0627\u0644\u062c\u0629 \u0625\u062c\u0627\u0628\u0629 \u0627\u0644\u0644\u063a\u0632');
    }
  }
}

module.exports = NewGamesHandler;
