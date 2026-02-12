const GameManager = require('../games/gameManager');
const EconomyManager = require('../economy/economyManager');
const Formatter = require('../ui/formatter');
const Markup = require('telegraf/markup');

class GameHandler {
  static async handleRPS(ctx) {
    const buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback(ctx.t('game_rps_rock'), 'game:rps:rock'),
        Markup.button.callback(ctx.t('game_rps_paper'), 'game:rps:paper'),
        Markup.button.callback(ctx.t('game_rps_scissors'), 'game:rps:scissors')
      ],
      [Markup.button.callback(ctx.t('back'), 'menu:games')]
    ]);

    await ctx.editMessageText(`${ctx.t('game_rps_title')}\n\n${ctx.t('game_rps_choose')}`, buttons);
  }

  static async handleRPSChoice(ctx, choice) {
    try {
      const result = await GameManager.playRockPaperScissors(ctx.from.id, choice);
      const message = result.message;

      // Add coins if won
      if (result.result === 'win') {
        await EconomyManager.addCoins(ctx.from.id, result.prize, ctx.t('game_result_win'));
      }

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback(ctx.t('game_play_again'), 'game:rps')],
        [Markup.button.callback(ctx.t('back'), 'menu:games')]
      ]);

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      console.error('Error:', error);
      ctx.reply(ctx.t('error'));
    }
  }

  static async handleGuess(ctx) {
    try {
      // Initialize session if needed
      ctx.session = ctx.session || {};
      const gameNumber = Math.floor(Math.random() * 100) + 1;
      ctx.session.gameState = { game: 'guess', number: gameNumber, attempts: 0 };

      const message = `
    ${ctx.t('game_guess_title')}

    ${ctx.t('game_guess_prompt_1')}
    ${ctx.t('game_guess_prompt_2')}
      `;

      await ctx.editMessageText(message);
    } catch (error) {
      console.error('Error:', error);
      ctx.reply(ctx.t('error'));
    }
  }

  static async handleQuiz(ctx) {
    try {
      // Initialize session if needed
      ctx.session = ctx.session || {};
      const questions = GameManager.getQuizQuestions(ctx.lang);
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

      const localizedMessage = `${ctx.t('game_quiz_title')}\n\n${question.question}`;

      await ctx.editMessageText(localizedMessage, buttons);
    } catch (error) {
      console.error('Error:', error);
      ctx.reply(ctx.t('error'));
    }
  }

  static async handleQuizAnswer(ctx, answer) {
    try {
      // Initialize session if needed
      ctx.session = ctx.session || {};
      const correct = ctx.session.gameState?.correct;
      const result = answer === correct ? 'win' : 'lost';
      const prize = result === 'win' ? 100 : 0;

      await GameManager.updateGameStats(ctx.from.id, 'اسئلة_ثقافية', result, prize);

      if (prize > 0) {
        await EconomyManager.addCoins(ctx.from.id, prize, ctx.t('game_result_win'));
      }

      const message = `
${ctx.t('game_quiz_title')}

${ctx.t('game_quiz_correct')} ${correct}
${ctx.t('game_quiz_answer')} ${answer}

${Formatter.formatGameResult(ctx.t('you_name'), result, prize, ctx.tr)}
      `;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback(ctx.t('game_quiz_another'), 'game:quiz')],
        [Markup.button.callback(ctx.t('back'), 'menu:games')]
      ]);

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      console.error('Error:', error);
      ctx.reply(ctx.t('error'));
    }
  }

  static async handleDice(ctx) {
    try {
      const result = await GameManager.playDice(ctx.from.id);

      if (result.result === 'win') {
        await EconomyManager.addCoins(ctx.from.id, result.prize, ctx.t('game_result_win'));
      }

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback(ctx.t('game_dice_roll_again'), 'game:dice')],
        [Markup.button.callback(ctx.t('back'), 'menu:games')]
      ]);

      await ctx.editMessageText(result.message, buttons);
    } catch (error) {
      console.error('Error:', error);
      ctx.reply(ctx.t('error'));
    }
  }

  static async handleLuck(ctx) {
    try {
      const { User } = require('../database/models');
      const user = await User.findOne({ userId: ctx.from.id });

      const isSuccess = Math.random() > 0.5;
      const reward = isSuccess ? Math.floor(Math.random() * 91) + 10 : 0; // 10-100

      if (isSuccess && user) {
        user.coins += reward;
        user.xp += 5;
        await user.save();
      }

      const message = isSuccess
        ? ctx.t('game_luck_win', { reward, coins: user.coins })
        : ctx.t('game_luck_lose');

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback(ctx.t('game_play_again'), 'game:luck')],
        [Markup.button.callback(ctx.t('back'), 'menu:games')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
    } catch (error) {
      console.error('Error in handleLuck:', error);
      ctx.reply(ctx.t('error'));
    }
  }

  static async handleChallenges(ctx) {
    try {
      const challenges = ctx.lang === 'en'
        ? [
          '🏃 Walk 10,000 steps today - Reward: 75 coins',
          '📖 Read 5 Quran pages - Reward: 100 coins',
          '🎮 Play 3 different games - Reward: 50 coins',
          '💰 Collect 500 coins - Reward: 50 extra coins',
          '🤝 Share the bot with 3 friends - Reward: 150 coins',
          '⭐ Earn 100 XP - Reward: 75 coins',
          '📿 Read morning and evening adhkar - Reward: 100 coins'
        ]
        : ctx.lang === 'fr'
          ? [
            '🏃 Marche 10 000 pas aujourd\'hui - Recompense: 75 pieces',
            '📖 Lis 5 pages du Coran - Recompense: 100 pieces',
            '🎮 Joue a 3 jeux differents - Recompense: 50 pieces',
            '💰 Collecte 500 pieces - Recompense: 50 pieces en plus',
            '🤝 Partage le bot avec 3 amis - Recompense: 150 pieces',
            '⭐ Gagne 100 XP - Recompense: 75 pieces',
            '📿 Lis les adhkar du matin et du soir - Recompense: 100 pieces'
          ]
          : [
            '🏃 امشِ 10,000 خطوة اليوم - مكافأة: 75 عملة',
            '📖 اقرأ 5 صفحات من القرآن - مكافأة: 100 عملة',
            '🎮 العب 3 ألعاب مختلفة - مكافأة: 50 عملة',
            '💰 اجمع 500 عملة - مكافأة: 50 عملة إضافية',
            '🤝 شارك البوت مع 3 أصدقاء - مكافأة: 150 عملة',
            '⭐ اكسب 100 نقطة خبرة - مكافأة: 75 عملة',
            '📿 اقرأ أذكار الصباح والمساء - مكافأة: 100 عملة'
          ];

      const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];

      const message = `${ctx.t('game_challenge_title')}\n\n${randomChallenge}\n\n${ctx.t('game_challenge_hint')}`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback(ctx.t('game_challenge_another'), 'game:challenges')],
        [Markup.button.callback(ctx.t('game_challenge_complete'), 'challenge:complete')],
        [Markup.button.callback(ctx.t('back'), 'menu:games')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
    } catch (error) {
      console.error('Error in handleChallenges:', error);
      ctx.reply(ctx.t('error'));
    }
  }
}

module.exports = GameHandler;
