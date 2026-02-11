const GameManager = require('../games/gameManager');
const EconomyManager = require('../economy/economyManager');
const Formatter = require('../ui/formatter');
const Markup = require('telegraf/markup');

class GameHandler {
  static async handleRPS(ctx) {
    const buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback('🪨 حجر', 'game:rps:rock'),
        Markup.button.callback('📄 ورق', 'game:rps:paper'),
        Markup.button.callback('✂️ مقص', 'game:rps:scissors')
      ],
      [Markup.button.callback('⬅️ رجوع', 'menu:games')]
    ]);

    await ctx.editMessageText('🪨 حجر ورق مقص\n\nاختر اختيارك:', buttons);
  }

  static async handleRPSChoice(ctx, choice) {
    try {
      const result = await GameManager.playRockPaperScissors(ctx.from.id, choice);
      const message = result.message;

      // Add coins if won
      if (result.result === 'win') {
        await EconomyManager.addCoins(ctx.from.id, result.prize, 'فوز في لعبة');
      }

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 لعب مرة أخرى', 'game:rps')],
        [Markup.button.callback('⬅️ رجوع', 'menu:games')]
      ]);

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleGuess(ctx) {
    const gameNumber = Math.floor(Math.random() * 100) + 1;
    ctx.session.gameState = { game: 'guess', number: gameNumber, attempts: 0 };

    const message = `
🔢 لعبة التخمين

أنا فكرت في رقم من 1 إلى 100
حاول أن تخمنه!
    `;

    await ctx.editMessageText(message);
  }

  static async handleQuiz(ctx) {
    try {
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

      const message = `🧠 سؤال ثقافي\n\n${question.question}`;

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleQuizAnswer(ctx, answer) {
    try {
      const correct = ctx.session.gameState?.correct;
      const result = answer === correct ? 'win' : 'lost';
      const prize = result === 'win' ? 100 : 0;

      await GameManager.updateGameStats(ctx.from.id, 'اسئلة_ثقافية', result, prize);

      if (prize > 0) {
        await EconomyManager.addCoins(ctx.from.id, prize, 'إجابة صحيحة');
      }

      const message = `
🧠 سؤال ثقافي

✅ الإجابة الصحيحة: ${correct}
📝 إجابتك: ${answer}

${Formatter.formatGameResult('أنت', result, prize)}
      `;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 سؤال آخر', 'game:quiz')],
        [Markup.button.callback('⬅️ رجوع', 'menu:games')]
      ]);

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleDice(ctx) {
    try {
      const result = await GameManager.playDice(ctx.from.id);

      if (result.result === 'win') {
        await EconomyManager.addCoins(ctx.from.id, result.prize, 'فوز في لعبة النرد');
      }

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 رول آخر', 'game:dice')],
        [Markup.button.callback('⬅️ رجوع', 'menu:games')]
      ]);

      await ctx.editMessageText(result.message, buttons);
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
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
        ? `🍀 <b>حظ سعيد!</b> 🎉\n\n✨ لقد فزت بـ <b>${reward}</b> عملة!\n💰 رصيدك الآن: ${user.coins}`
        : '🍀 <b>لعبة الحظ</b>\n\n😔 لم يحالفك الحظ هذه المرة\nحاول مرة أخرى!';

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 حاول مرة أخرى', 'game:luck')],
        [Markup.button.callback('⬅️ رجوع', 'menu:games')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
    } catch (error) {
      console.error('Error in handleLuck:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleChallenges(ctx) {
    try {
      const challenges = [
        '🏃 امشِ 10,000 خطوة اليوم - مكافأة: 75 عملة',
        '📖 اقرأ 5 صفحات من القرآن - مكافأة: 100 عملة',
        '🎮 العب 3 ألعاب مختلفة - مكافأة: 50 عملة',
        '💰 اجمع 500 عملة - مكافأة: 50 عملة إضافية',
        '🤝 شارك البوت مع 3 أصدقاء - مكافأة: 150 عملة',
        '⭐ اكسب 100 نقطة خبرة - مكافأة: 75 عملة',
        '📿 اقرأ أذكار الصباح والمساء - مكافأة: 100 عملة'
      ];

      const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];

      const message = `🎯 <b>تحديك اليومي</b>\n\n${randomChallenge}\n\n💡 أكمل التحدي للحصول على المكافأة!`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 تحدي آخر', 'game:challenges')],
        [Markup.button.callback('✅ أكملت', 'challenge:complete')],
        [Markup.button.callback('⬅️ رجوع', 'menu:games')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
    } catch (error) {
      console.error('Error in handleChallenges:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }
}

module.exports = GameHandler;
