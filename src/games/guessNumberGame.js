/**
 * نظام لعبة تخمين الرقم - إصدار محسّن
 */

class GuessNumberGame {
  /**
   * بدء لعبة تخمين الرقم
   */
  static async startGame(ctx) {
    try {
      console.log('🎮 [GUESS GAME] بدء جديدة:', { userId: ctx.from.id });

      // Initialize session
      if (!ctx.session) ctx.session = {};

      // Generate secret number
      const secretNumber = Math.floor(Math.random() * 100) + 1;

      // Initialize game state
      ctx.session.guessGame = {
        active: true,
        number: secretNumber,
        attempts: 0,
        maxAttempts: 10,
        startTime: Date.now()
      };

      console.log('✅ [GUESS GAME] الرقم السري:', secretNumber);

      const message = `
🎮 <b>لعبة تخمين الرقم</b>

<b>أنا فكرت في رقم من 1 إلى 100</b>
هل يمكنك تخمينه؟

⏱️ لديك <b>10 محاولات</b> فقط
💡 سأساعدك مع التلميحات

<i>أرسل الرقم الآن (رقم من 1 إلى 100):</i>
      `;

      await ctx.reply(message, {
        parse_mode: 'HTML'
      });

      if (ctx.callbackQuery) {
        await ctx.answerCbQuery('🎮 اللعبة بدأت! أرسل رقم من 1-100').catch(() => {});
      }

      console.log('✅ [GUESS GAME] تم بدء اللعبة بنجاح');
    } catch (error) {
      console.error('❌ [GUESS GAME] خطأ في البدء:', error.message);
      await ctx.reply('❌ حدث خطأ في بدء اللعبة').catch(() => {});
    }
  }

  /**
   * معالجة تخمين المستخدم
   */
  static async processGuess(ctx, userGuess) {
    try {
      // تحقق من وجود لعبة نشطة
      if (!ctx.session?.guessGame?.active) {
        console.log('⚠️ [GUESS GAME] لا توجد لعبة نشطة');
        const Markup = require('telegraf/markup');
        const buttons = Markup.inlineKeyboard([
          [Markup.button.callback('🔢 بدء لعبة التخمين', 'game:guess')],
          [Markup.button.callback('⬅️ رجوع للألعاب', 'menu:games')]
        ]);

        await ctx.reply('❌ لا توجد لعبة تخمين جارية. اضغط للبدء من جديد:', {
          parse_mode: 'HTML',
          reply_markup: buttons.reply_markup
        }).catch(() => {});
        return;
      }

      const game = ctx.session.guessGame;
      const guess = parseInt(userGuess.trim());

      console.log('📊 [GUESS GAME] تخمين جديد:', { userId: ctx.from.id, guess, secret: game.number, attempts: game.attempts });

      // تحقق من صحة الرقم
      if (isNaN(guess) || guess < 1 || guess > 100) {
        await ctx.reply('❌ من فضلك أرسل رقم صحيح من 1 إلى 100!');
        return;
      }

      // زيادة عدد المحاولات
      game.attempts++;

      // تحقق من الإجابة الصحيحة
      if (guess === game.number) {
        await this.handleCorrect(ctx, game);
        return;
      }

      // تحقق من انتهاء المحاولات
      if (game.attempts >= game.maxAttempts) {
        await this.handleGameOver(ctx, game);
        return;
      }

      // أرسل تلميح
      await this.sendHint(ctx, game, guess);

    } catch (error) {
      console.error('❌ [GUESS GAME] خطأ في المعالجة:', error.message);
    }
  }

  /**
   * معالجة الإجابة الصحيحة
   */
  static async handleCorrect(ctx, game) {
    try {
      console.log('✅ [GUESS GAME] إجابة صحيحة!');

      // حساب الجائزة
      let reward = 200;
      if (game.attempts <= 3) reward = 500;
      else if (game.attempts <= 5) reward = 300;

      const message = `
🎉 <b>مبروك! أنت محق!</b>

✅ الرقم الصحيح: <code>${game.number}</code>
📊 عدد المحاولات: <b>${game.attempts} من 10</b>
💰 الجائزة: <b>+${reward} عملة</b>
⏱️ الوقت: <b>${Math.round((Date.now() - game.startTime) / 1000)}s</b>

<i>شكراً للعب! 🎮</i>
      `;

      // مسح حالة اللعبة
      ctx.session.guessGame = null;

      // الرد
      await ctx.reply(message, {
        parse_mode: 'HTML'
      });

      // إضافة العملات (بدون انتظار)
      const EconomyManager = require('../economy/economyManager');
      EconomyManager.addCoins(ctx.from.id, reward, 'فوز في لعبة التخمين')
        .catch(err => console.error('❌ خطأ في الجائزة:', err.message));

    } catch (error) {
      console.error('❌ [GUESS GAME] خطأ في handleCorrect:', error.message);
      ctx.session.guessGame = null;
      await ctx.reply('❌ حدث خطأ').catch(() => {});
    }
  }

  /**
   * معالجة انتهاء اللعبة
   */
  static async handleGameOver(ctx, game) {
    try {
      console.log('❌ [GUESS GAME] انتهت المحاولات');

      const message = `
❌ <b>انتهت محاولاتك!</b>

🔍 الرقم الصحيح كان: <code>${game.number}</code>
📊 محاولاتك: <b>${game.attempts} من 10</b>

💡 حاول مرة أخرى وكن محظوظاً! 🍀
      `;

      // مسح حالة اللعبة
      ctx.session.guessGame = null;

      await ctx.reply(message, {
        parse_mode: 'HTML'
      });

    } catch (error) {
      console.error('❌ [GUESS GAME] خطأ في handleGameOver:', error.message);
      ctx.session.guessGame = null;
      await ctx.reply('❌ حدث خطأ').catch(() => {});
    }
  }

  /**
   * إرسال تلميح
   */
  static async sendHint(ctx, game, guess) {
    try {
      // حدد الاتجاه
      const direction = guess < game.number ? '⬆️ أعلى' : '⬇️ أقل';

      // حساب المسافة
      const distance = Math.abs(game.number - guess);
      let proximity = '';

      if (distance <= 5) proximity = ' 🔥 قريب جداً!';
      else if (distance <= 15) proximity = ' 🌡️ قريب نوعاً ما';
      else if (distance <= 30) proximity = ' ❄️ بعيد';
      else proximity = ' 🧊 بعيد جداً';

      const remaining = game.maxAttempts - game.attempts;

      const message = `
${direction}${proximity}

📊 المحاولات المتبقية: <b>${remaining}/${game.maxAttempts}</b>

🔢 حاول رقم آخر:
      `;

      await ctx.reply(message, {
        parse_mode: 'HTML'
      });

    } catch (error) {
      console.error('❌ [GUESS GAME] خطأ في التلميح:', error.message);
    }
  }

  /**
   * إلغاء اللعبة
   */
  static async cancelGame(ctx) {
    try {
      ctx.session.guessGame = null;
      await ctx.reply('❌ تم إلغاء اللعبة\n👋 شكراً للعب!').catch(() => {});
    } catch (error) {
      console.error('❌ [GUESS GAME] خطأ في الإلغاء:', error.message);
      ctx.session.guessGame = null;
    }
  }

  /**
   * التحقق من نشاط اللعبة
   */
  static isGameActive(ctx) {
    const active = ctx.session?.guessGame?.active === true;
    if (active) {
      console.log('🎮 [GUESS GAME] لعبة نشطة:', { userId: ctx.from?.id });
    }
    return active;
  }
}

module.exports = GuessNumberGame;
