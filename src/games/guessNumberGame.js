/**
 * نظام لعبة تخمين الرقم - محسّن ومختبر
 */

class GuessNumberGame {
  /**
   * بدء لعبة تخمين الرقم
   */
  static async startGame(ctx) {
    try {
      console.log('🎮 بدء لعبة تخمين:', { userId: ctx.from.id });

      // Initialize session properly
      if (!ctx.session) {
        ctx.session = {};
        console.log('📝 تم إنشاء session جديد');
      }

      // Generate random number 1-100
      const secretNumber = Math.floor(Math.random() * 100) + 1;
      console.log('🔐 الرقم السري:', secretNumber);

      // Store game state
      ctx.session.guessGame = {
        active: true,
        number: secretNumber,
        attempts: 0,
        maxAttempts: 10,
        hints: [],
        startTime: Date.now()
      };

      console.log('💾 تم حفظ حالة اللعبة');

      const Markup = require('telegraf/markup');
      const message = `
🔢 <b>لعبة تخمين الرقم</b>

أنا فكرت في رقم من <b>1</b> إلى <b>100</b>
لديك <b>10 محاولات</b> لتخمينه! 

💡 <b>الأرقام الصحيحة:</b> من 1 إلى 100 فقط

🎮 أرسل رقمك الآن!
      `;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('❌ إلغاء اللعبة', 'guess:cancel')]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });

      await ctx.answerCbQuery('🎮 اللعبة بدأت! أرسل رقم من 1-100');
      console.log('✅ تم بدء اللعبة بنجاح');
    } catch (error) {
      console.error('❌ خطأ في بدء لعبة التخمين:', error.message);
      try {
        await ctx.reply('❌ حدث خطأ في بدء اللعبة');
      } catch (e) {
        console.error('خطأ في الرد:', e.message);
      }
    }
  }

  /**
   * معالجة تخمين المستخدم
   */
  static async processGuess(ctx, userGuess) {
    try {
      console.log('🎮 معالجة تخمين:', { userId: ctx.from.id, guess: userGuess, hasGame: !!ctx.session?.guessGame });

      // Check if game is active
      if (!ctx.session || !ctx.session.guessGame || !ctx.session.guessGame.active) {
        console.log('❌ اللعبة غير نشطة', { hasSession: !!ctx.session, hasGame: !!ctx.session?.guessGame });
        return await ctx.reply('❌ لا توجد لعبة جارية. اختر لعبة جديدة من القائمة');
      }

      const game = ctx.session.guessGame;
      const guess = parseInt(userGuess.trim());

      console.log('📊 إحصائيات:', { guess, secretNumber: game.number, attempts: game.attempts });

      // Validate input
      if (isNaN(guess) || guess < 1 || guess > 100) {
        return await ctx.reply('❌ أرسل رقم صحيح من 1 إلى 100 فقط!');
      }

      // Increment attempts
      game.attempts++;

      // Check if correct
      if (guess === game.number) {
        console.log('✅ إجابة صحيحة!');
        return await this.handleCorrectGuess(ctx, game);
      }

      // Check if max attempts reached
      if (game.attempts >= game.maxAttempts) {
        console.log('❌ انتهت المحاولات');
        return await this.handleGameOver(ctx, game);
      }

      // Give hint
      console.log('💡 إرسال تلميح');
      return await this.sendHint(ctx, game, guess);
    } catch (error) {
      console.error('❌ خطأ في معالجة التخمين:', error);
      await ctx.reply('❌ حدث خطأ في معالجة إجابتك');
    }
  }

  /**
   * معالجة الإجابة الصحيحة
   */
  static async handleCorrectGuess(ctx, game) {
    try {
      const EconomyManager = require('../economy/economyManager');

      // Calculate reward based on attempts
      let reward = 200;
      if (game.attempts <= 3) reward = 500; // Bonus for quick guess
      else if (game.attempts <= 5) reward = 300;

      // Clear game state FIRST
      ctx.session.guessGame = null;

      const message = `
🎉 <b>مبروك! انت محق!</b>

✅ الرقم الصحيح: <code>${game.number}</code>
📊 عدد المحاولات: <b>${game.attempts}</b>
💰 الجائزة: <b>+${reward} عملة</b>

⏱️ الوقت المستغرق: ${Math.round((Date.now() - game.startTime) / 1000)} ثانية
      `;

      const Markup = require('telegraf/markup');
      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 لعبة جديدة', 'game:guess')],
        [Markup.button.callback('⬅️ رجوع للألعاب', 'menu:games')]
      ]);

      // Send reply immediately
      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });

      // Add coins in background (non-blocking)
      EconomyManager.addCoins(ctx.from.id, reward, 'فوز في لعبة التخمين')
        .catch(err => console.error('❌ خطأ في إضافة عملات:', err));

      console.log('✅ معالجة الإجابة الصحيحة اكتملت');
    } catch (error) {
      console.error('❌ خطأ في معالجة الإجابة الصحيحة:', error);
      ctx.session.guessGame = null;
      await ctx.reply('❌ حدث خطأ').catch(err => console.error('Reply error:', err));
    }
  }

  /**
   * معالجة انتهاء اللعبة
   */
  static async handleGameOver(ctx, game) {
    try {
      // Clear game state FIRST
      ctx.session.guessGame = null;

      const message = `
❌ <b>انتهت محاولاتك!</b>

🔍 الرقم الصحيح كان: <code>${game.number}</code>
📊 عدد محاولاتك: <b>${game.attempts}</b>

💡 حاول مرة أخرى!
      `;

      const Markup = require('telegraf/markup');
      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 لعبة جديدة', 'game:guess')],
        [Markup.button.callback('⬅️ رجوع للألعاب', 'menu:games')]
      ]);

      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      console.error('❌ خطأ في معالجة نهاية اللعبة:', error);
      ctx.session.guessGame = null;
      await ctx.reply('❌ حدث خطأ').catch(err => console.error('Reply error:', err));
    }
  }

  /**
   * إرسال تلميح للمستخدم
   */
  static async sendHint(ctx, game, guess) {
    try {
      let hint = '';

      if (guess < game.number) {
        hint = `⬆️ الرقم أكبر من ${guess}`;
      } else {
        hint = `⬇️ الرقم أقل من ${guess}`;
      }

      // Calculate distance for better hint
      const distance = Math.abs(game.number - guess);
      let proximity = '';

      if (distance <= 5) {
        proximity = ' 🔥 قريب جداً!';
      } else if (distance <= 15) {
        proximity = ' 🌡️ قريب نوعاً ما';
      } else if (distance <= 30) {
        proximity = ' ❄️ بعيد';
      } else {
        proximity = ' 🧊 بعيد جداً';
      }

      const message = `
${hint}${proximity}

📊 المحاولات المتبقية: <b>${game.maxAttempts - game.attempts}</b>/${game.maxAttempts}

🔢 حاول رقم آخر:
      `;

      await ctx.reply(message, {
        parse_mode: 'HTML'
      });
    } catch (error) {
      console.error('❌ خطأ في إرسال التلميح:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  /**
   * إلغاء اللعبة
   */
  static async cancelGame(ctx) {
    try {
      ctx.session.guessGame = null;

      const message = '❌ تم إلغاء اللعبة\n\n👋 شكراً للعب!';

      const Markup = require('telegraf/markup');
      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🎮 ألعاب أخرى', 'menu:games')]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      console.error('❌ خطأ في إلغاء اللعبة:', error);
      ctx.session.guessGame = null;
      await ctx.reply('✅ تم إلغاء اللعبة');
    }
  }

  /**
   * التحقق من حالة اللعبة
   */
  static isGameActive(ctx) {
    const isActive = ctx.session && ctx.session.guessGame && ctx.session.guessGame.active;
    if (isActive) {
      console.log('✅ اللعبة نشطة:', { userId: ctx.from?.id, attempts: ctx.session.guessGame.attempts });
    }
    return isActive;
  }
}

module.exports = GuessNumberGame;
