/**
 * 🎮 Quranic Games Handlers
 * معالجات الألعاب القرآنية
 */

const QuranicGames = require('../games/quranicGames');
const EconomyManager = require('../economy/economyManager');
const { Markup } = require('telegraf');

class QuranicGamesHandler {
  /**
   * قائمة الألعاب القرآنية
   */
  static async showMenu(ctx) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();

      const message = QuranicGames.getGamesList();

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('✍️ أكمل الآية', 'qgame:complete')],
        [Markup.button.callback('🔍 اكتشف الفرق', 'qgame:spot')],
        [Markup.button.callback('🧠 معلومات قرآنية', 'qgame:trivia')],
        [Markup.button.callback('📊 عد الآيات', 'qgame:count')],
        [Markup.button.callback('⬅️ رجوع', 'menu:games')]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      if (error.response?.error_code !== 400 || !error.response?.description?.includes('message is not modified')) {
        console.error('❌ QuranicGames showMenu error:', error);
        await ctx.reply('❌ حدث خطأ').catch(() => {});
      }
    }
  }

  /**
   * 1️⃣ لعبة أكمل الآية
   */
  static async startCompleteVerse(ctx) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();

      ctx.session = ctx.session || {};
      const game = QuranicGames.getCompleteVerseGame();

      ctx.session.gameState = {
        game: 'quranic',
        type: game.type,
        answer: game.answer,
        reward: game.reward
      };

      const message = `✍️ <b>أكمل الآية</b>

📍 <b>السورة:</b> ${game.surah}

<b>الآية:</b> <code>${game.question}</code>

💡 أرسل الكلمة الناقصة`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 آية أخرى', 'qgame:complete')],
        [Markup.button.callback('⬅️ رجوع', 'game:quranic')]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      if (error.response?.error_code !== 400 || !error.response?.description?.includes('message is not modified')) {
        console.error('❌ CompleteVerse error:', error);
        await ctx.reply('❌ حدث خطأ').catch(() => {});
      }
    }
  }

  /**
   * 2️⃣ لعبة اكتشف الفرق
   */
  static async startSpotDifference(ctx) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();

      ctx.session = ctx.session || {};
      const game = QuranicGames.getSpotDifferenceGame();

      ctx.session.gameState = {
        game: 'quranic',
        type: game.type,
        answer: String(game.answer),
        reward: game.reward,
        correctVerse: game.correctVerse
      };

      const message = `🔍 <b>اكتشف الفرق</b>

📍 <b>السورة:</b> ${game.surah}

<b>هل الآية التالية صحيحة؟</b>
<code>${game.question}</code>`;

      const buttons = Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ صحيحة', 'qgame:spot_true'),
          Markup.button.callback('❌ خاطئة', 'qgame:spot_false')
        ],
        [Markup.button.callback('🔄 آية أخرى', 'qgame:spot')],
        [Markup.button.callback('⬅️ رجوع', 'game:quranic')]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      if (error.response?.error_code !== 400 || !error.response?.description?.includes('message is not modified')) {
        console.error('❌ SpotDifference error:', error);
        await ctx.reply('❌ حدث خطأ').catch(() => {});
      }
    }
  }

  /**
   * 3️⃣ لعبة معلومات قرآنية
   */
  static async startTriviaGame(ctx) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();

      ctx.session = ctx.session || {};
      const game = QuranicGames.getTriviaGame();

      ctx.session.gameState = {
        game: 'quranic',
        type: game.type,
        answer: game.answer,
        reward: game.reward
      };

      const message = `🧠 <b>معلومات قرآنية</b>

<b>السؤال:</b>
${game.question}`;

      const buttons = Markup.inlineKeyboard(
        game.options.map(option => [
          Markup.button.callback(option, `qgame:trivia_${option}`)
        ]).concat([
          [Markup.button.callback('🔄 سؤال آخر', 'qgame:trivia')],
          [Markup.button.callback('⬅️ رجوع', 'game:quranic')]
        ])
      );

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      if (error.response?.error_code !== 400 || !error.response?.description?.includes('message is not modified')) {
        console.error('❌ Trivia error:', error);
        await ctx.reply('❌ حدث خطأ').catch(() => {});
      }
    }
  }

  /**
   * 4️⃣ لعبة عد الآيات
   */
  static async startCountVersesGame(ctx) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();

      ctx.session = ctx.session || {};
      const game = QuranicGames.getCountVersesGame();

      ctx.session.gameState = {
        game: 'quranic',
        type: game.type,
        answer: String(game.answer),
        reward: game.reward
      };

      const message = `📊 <b>عد الآيات</b>

<b>السؤال:</b>
${game.question}

💡 أرسل العدد`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 سورة أخرى', 'qgame:count')],
        [Markup.button.callback('⬅️ رجوع', 'game:quranic')]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      if (error.response?.error_code !== 400 || !error.response?.description?.includes('message is not modified')) {
        console.error('❌ CountVerses error:', error);
        await ctx.reply('❌ حدث خطأ').catch(() => {});
      }
    }
  }

  /**
   * معالجة الإجابة
   */
  static async processAnswer(ctx, userAnswer) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();

      ctx.session = ctx.session || {};
      const gameState = ctx.session.gameState;

      if (!gameState || gameState.game !== 'quranic') {
        return ctx.reply('❌ لا توجد لعبة نشطة');
      }

      if (!gameState.answer || !gameState.reward || !gameState.type) {
        console.error('❌ Missing gameState:', gameState);
        ctx.session.gameState = null;
        return ctx.reply('❌ حدث خطأ. جرب لعبة جديدة');
      }

      const isCorrect = QuranicGames.checkAnswer(userAnswer, gameState.answer, gameState.type);
      const reward = isCorrect ? gameState.reward : 0;

      await QuranicGames.recordGameResult(ctx.from.id, gameState.type, reward, isCorrect);

      if (isCorrect && reward > 0) {
        await EconomyManager.addCoins(ctx.from.id, reward, 'فوز في لعبة قرآنية');
      }

      let resultMessage = '';
      
      if (isCorrect) {
        resultMessage = `✅ <b>إجابة صحيحة!</b>

🎉 لقد فزت بـ <b>${reward}</b> نقطة!`;
      } else {
        resultMessage = `❌ <b>إجابة خاطئة</b>

💡 الإجابة الصحيحة: <code>${gameState.answer}</code>`;
        
        if (gameState.type === 'spot_difference' && gameState.correctVerse) {
          resultMessage += `\n\n📖 الآية الصحيحة:\n<code>${gameState.correctVerse}</code>`;
        }
      }

      const gameTypeMap = {
        'complete_verse': 'complete',
        'spot_difference': 'spot',
        'trivia': 'trivia',
        'count_verses': 'count'
      };

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 العب مرة أخرى', `qgame:${gameTypeMap[gameState.type] || 'trivia'}`)],
        [Markup.button.callback('⬅️ رجوع', 'game:quranic')]
      ]);

      await ctx.reply(resultMessage, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });

      ctx.session.gameState = null;

    } catch (error) {
      console.error('❌ ProcessAnswer error:', error);
      try {
        await ctx.reply('❌ حدث خطأ في معالجة الإجابة');
      } catch (e) {
        console.error('Failed to send error:', e);
      }
    }
  }
}

module.exports = QuranicGamesHandler;
