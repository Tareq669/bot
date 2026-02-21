const Markup = require('telegraf/markup');
const GameManager = require('../games/gameManager');
const EconomyManager = require('../economy/economyManager');
const { User } = require('../database/models');

const BOMB_QUESTIONS = [
  {
    question: '\u0645\u0627 \u0646\u0627\u062a\u062c 7 + 8\u061f',
    options: ['13', '14', '15', '16'],
    correctIndex: 2
  },
  {
    question: '\u0643\u0645 \u0639\u062f\u062f \u062d\u0631\u0648\u0641 \u0643\u0644\u0645\u0629 "\u0630\u0643\u0627\u0621"\u061f',
    options: ['3', '4', '5', '6'],
    correctIndex: 1
  },
  {
    question: '\u0623\u064a \u0643\u0648\u0643\u0628 \u064a\u064f\u0639\u0631\u0641 \u0628\u0627\u0644\u0643\u0648\u0643\u0628 \u0627\u0644\u0623\u062d\u0645\u0631\u061f',
    options: ['\u0627\u0644\u0645\u0634\u062a\u0631\u064a', '\u0627\u0644\u0645\u0631\u064a\u062e', '\u0639\u0637\u0627\u0631\u062f', '\u0627\u0644\u0632\u0647\u0631\u0629'],
    correctIndex: 1
  },
  {
    question: '\u0643\u0645 \u062b\u0627\u0646\u064a\u0629 \u0641\u064a \u0627\u0644\u062f\u0642\u064a\u0642\u0629\u061f',
    options: ['30', '45', '60', '90'],
    correctIndex: 2
  }
];

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

class NewGamesHandler {
  static bombTimers = new Map();

  static pickRandom(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  static clearBombTimer(userId) {
    const timer = this.bombTimers.get(userId);
    if (!timer) return;
    clearTimeout(timer.timeout);
    clearInterval(timer.interval);
    this.bombTimers.delete(userId);
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

  static formatBombText(question, secondsLeft) {
    return (
      '\ud83d\udca3 <b>\u0644\u0639\u0628\u0629 \u062a\u0641\u0643\u064a\u0643 \u0627\u0644\u0642\u0646\u0628\u0644\u0629</b>\n\n' +
      `\u23f3 \u0627\u0644\u0648\u0642\u062a \u0627\u0644\u0645\u062a\u0628\u0642\u064a: <b>${secondsLeft}</b> \u062b\u0627\u0646\u064a\u0629\n` +
      '\u26a0\ufe0f \u0623\u062c\u0628 \u0628\u0633\u0631\u0639\u0629 \u0642\u0628\u0644 \u0627\u0644\u0627\u0646\u0641\u062c\u0627\u0631\n\n' +
      `<b>\u0627\u0644\u0633\u0624\u0627\u0644:</b>\n${question.question}`
    );
  }

  static async handleBombDefuse(ctx) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();
      ctx.session = ctx.session || {};

      const question = this.pickRandom(BOMB_QUESTIONS);
      const baseReward = Math.floor(Math.random() * 16) + 15;
      const endAt = Date.now() + 10_000;

      ctx.session.bombGame = {
        active: true,
        question,
        correctIndex: question.correctIndex,
        baseReward,
        endAt
      };

      this.clearBombTimer(ctx.from.id);

      const rows = question.options.map((option, index) => [
        Markup.button.callback(option, `game:bomb:ans:${index}`)
      ]);
      rows.push([Markup.button.callback('\u2b05\ufe0f \u0631\u062c\u0648\u0639', 'menu:games')]);
      const keyboard = Markup.inlineKeyboard(rows);

      await this.safeEditOrReply(ctx, this.formatBombText(question, 10), keyboard.reply_markup);

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

    await GameManager.updateGameStats(ctx.from.id, '\u062a\u0641\u0643\u064a\u0643_\u0627\u0644\u0642\u0646\u0628\u0644\u0629', 'lost', 0);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('\ud83d\udd04 \u0645\u062d\u0627\u0648\u0644\u0629 \u062c\u062f\u064a\u062f\u0629', 'game:bomb')],
      [Markup.button.callback('\u2b05\ufe0f \u0631\u062c\u0648\u0639', 'menu:games')]
    ]);

    const text =
      '\ud83d\udca5 <b>\u0627\u0646\u062a\u0647\u0649 \u0627\u0644\u0648\u0642\u062a!</b>\n\n' +
      `\u2705 \u0627\u0644\u0625\u062c\u0627\u0628\u0629 \u0627\u0644\u0635\u062d\u064a\u062d\u0629: <b>${state.question.options[state.correctIndex]}</b>`;

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

      await GameManager.updateGameStats(ctx.from.id, '\u062a\u0641\u0643\u064a\u0643_\u0627\u0644\u0642\u0646\u0628\u0644\u0629', result, reward);
      if (isCorrect && reward > 0) {
        await EconomyManager.addCoins(ctx.from.id, reward, '\u0641\u0648\u0632 \u0641\u064a \u0644\u0639\u0628\u0629 \u062a\u0641\u0643\u064a\u0643 \u0627\u0644\u0642\u0646\u0628\u0644\u0629');
      }

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('\ud83d\udd04 \u062c\u0648\u0644\u0629 \u062c\u062f\u064a\u062f\u0629', 'game:bomb')],
        [Markup.button.callback('\u2b05\ufe0f \u0631\u062c\u0648\u0639', 'menu:games')]
      ]);

      const text = isCorrect
        ? `\u2705 <b>\u062a\u0645 \u062a\u0641\u0643\u064a\u0643 \u0627\u0644\u0642\u0646\u0628\u0644\u0629!</b>\n\n\ud83d\udcb0 \u0627\u0644\u0645\u0643\u0627\u0641\u0623\u0629: <b>${reward}</b> \u0639\u0645\u0644\u0629`
        : `\u274c <b>\u0625\u062c\u0627\u0628\u0629 \u062e\u0627\u0637\u0626\u0629</b>\n\n\u2705 \u0627\u0644\u0625\u062c\u0627\u0628\u0629 \u0627\u0644\u0635\u062d\u064a\u062d\u0629: <b>${state.question.options[state.correctIndex]}</b>`;

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

      const puzzle = this.pickRandom(MIND_PUZZLES);
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
