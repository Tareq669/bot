/**
 * 🎮 Quranic Games Handlers
 * معالجات الألعاب القرآنية
 */

const QuranicGames = require('../games/quranicGames');
const EconomyManager = require('../economy/economyManager');
const { Markup } = require('telegraf');

class QuranicGamesHandler {
  static normalizeReward(reward) {
    const safeReward = Number.isFinite(reward) ? reward : 0;
    return Math.min(Math.max(safeReward, 5), 10);
  }

  /**
   * قائمة الألعاب القرآنية
   */
  static async showMenu(ctx) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();

      const message = QuranicGames.getGamesList();

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🎯 تخمين الآية', 'qgame:guess')],
        [Markup.button.callback('✍️ أكمل الآية', 'qgame:complete')],
        [Markup.button.callback('🔍 اكتشف الفرق', 'qgame:spot')],
        [Markup.button.callback('🧠 معلومات قرآنية', 'qgame:trivia')],
        [Markup.button.callback('📊 عد الآيات', 'qgame:count')],
        [Markup.button.callback('🎓 أسئلة ثقافية', 'qgame:cultural')],
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
   * 0️⃣ لعبة تخمين الآية
   * المستخدم يخمن السورة من دليل
   */
  static async startGuessTheSurah(ctx) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();

      ctx.session = ctx.session || {};
      const game = QuranicGames.getGuessTheSurahGame();

      ctx.session.gameState = {
        game: 'quranic',
        type: game.type,
        answer: game.answer,
        reward: this.normalizeReward(game.reward)
      };

      const message = `🎯 <b>تخمين السورة</b>

📌 <b>الدليل:</b> <code>${game.question}</code>

💡 أرسل اسم السورة التي تخمن أنها الإجابة`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 دليل آخر', 'qgame:guess')],
        [Markup.button.callback('⬅️ رجوع', 'game:quranic')]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      if (error.response?.error_code !== 400 || !error.response?.description?.includes('message is not modified')) {
        console.error('❌ GuessTheSurah error:', error);
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
        reward: this.normalizeReward(game.reward)
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
        reward: this.normalizeReward(game.reward),
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
        reward: this.normalizeReward(game.reward)
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
        reward: this.normalizeReward(game.reward)
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
   * 5️⃣ لعبة الأسئلة الثقافية الإسلامية
   */
  static async startCulturalKnowledge(ctx) {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();

      ctx.session = ctx.session || {};
      const game = QuranicGames.getCulturalKnowledgeGame();

      ctx.session.gameState = {
        game: 'quranic',
        type: game.type,
        answerIndex: game.answerIndex,
        options: game.options,
        reward: this.normalizeReward(game.reward)
      };

      console.log('📌 Cultural Knowledge Game Started:');
      console.log(`  Question: ${game.question}`);
      console.log(`  answerIndex: ${game.answerIndex}`);
      console.log(`  Correct Answer: ${game.options[game.answerIndex]}`);

      const optionsText = game.options.map((opt, idx) => `${String.fromCharCode(65 + idx)}) ${opt}`).join('\n');
      const message = `🧠 <b>أسئلة ثقافية إسلامية</b>

❓ <b>السؤال:</b>
${game.question}

<b>الإجابات:</b>
${optionsText}

💡 أرسل الحرف (A, B, C, D) أو رقم الخيار (1, 2, 3, 4)`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 سؤال آخر', 'qgame:cultural')],
        [Markup.button.callback('⬅️ رجوع', 'game:quranic')]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      if (error.response?.error_code !== 400 || !error.response?.description?.includes('message is not modified')) {
        console.error('❌ CulturalKnowledge error:', error);
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

      // التحقق من البيانات حسب نوع اللعبة
      if (!gameState.reward || !gameState.type) {
        console.error('❌ Missing gameState:', gameState);
        ctx.session.gameState = null;
        return ctx.reply('❌ حدث خطأ. جرب لعبة جديدة');
      }

      // للعبة الثقافية: يجب أن تكون هناك answerIndex و options
      if (gameState.type === 'cultural_knowledge' && (gameState.answerIndex === undefined || !gameState.options)) {
        console.error('❌ Missing cultural_knowledge data:', gameState);
        ctx.session.gameState = null;
        return ctx.reply('❌ حدث خطأ. جرب لعبة جديدة');
      }

      // للألعاب الأخرى: يجب أن يكون هناك answer
      if (gameState.type !== 'cultural_knowledge' && !gameState.answer) {
        console.error('❌ Missing answer in gameState:', gameState);
        ctx.session.gameState = null;
        return ctx.reply('❌ حدث خطأ. جرب لعبة جديدة');
      }

      // معالجة خاصة للأسئلة الثقافية
      let isCorrect = false;
      let correctAnswer = '';

      if (gameState.type === 'cultural_knowledge') {
        // تحويل إجابة المستخدم إلى فهرس (A→0, B→1, C→2, D→3 أو 1→0, 2→1, 3→2, 4→3)
        let userIndex = -1;
        const cleanAnswer = String(userAnswer).trim().toUpperCase();

        console.log('🔍 Cultural Knowledge Game Debug:');
        console.log(`  User Answer: "${userAnswer}" → Clean: "${cleanAnswer}"`);
        console.log(`  Answer Length: ${cleanAnswer.length}`);
        console.log(`  First Char Code: ${cleanAnswer.charCodeAt(0)}`);
        console.log(`  Expected answerIndex: ${gameState.answerIndex}`);
        console.log(`  Options: ${JSON.stringify(gameState.options)}`);

        // التحقق من الأحرف (A, B, C, D)
        if (cleanAnswer.length === 1 && cleanAnswer >= 'A' && cleanAnswer <= 'D') {
          userIndex = cleanAnswer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
          console.log(`  ✅ Detected as letter: userIndex = ${userIndex}`);
        }
        // التحقق من الأرقام (1, 2, 3, 4)
        else if (cleanAnswer.length === 1 && cleanAnswer >= '1' && cleanAnswer <= '4') {
          userIndex = parseInt(cleanAnswer) - 1; // 1→0, 2→1, 3→2, 4→3
          console.log(`  ✅ Detected as number: userIndex = ${userIndex}`);
        }
        else {
          console.log(`  ❌ Unknown format: userIndex = ${userIndex}`);
        }

        isCorrect = userIndex === gameState.answerIndex;
        correctAnswer = gameState.options[gameState.answerIndex] || gameState.answerIndex;
        console.log(`  Final Result: isCorrect = ${isCorrect}`);
      } else {
        isCorrect = QuranicGames.checkAnswer(userAnswer, gameState.answer, gameState.type);
        correctAnswer = gameState.answer;
      }

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

💡 الإجابة الصحيحة: <code>${correctAnswer}</code>`;

        if (gameState.type === 'spot_difference' && gameState.correctVerse) {
          resultMessage += `\n\n📖 الآية الصحيحة:\n<code>${gameState.correctVerse}</code>`;
        }
      }

      const gameTypeMap = {
        'guess_surah': 'guess',
        'complete_verse': 'complete',
        'spot_difference': 'spot',
        'trivia': 'trivia',
        'count_verses': 'count',
        'cultural_knowledge': 'cultural'
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
