/**
 * Handler for New Features - Quran, Adhkar, Admin, and Games
 */

const Markup = require('telegraf/markup');
const {
  QuranTafsirFeature,
  TajweedLessonsFeature,
  QuranQuizFeature,
  MorningEveningTracker,
  IstighfarCounter,
  DigitalTasbih,
  AutoModeration,
  WelcomeSystem,
  UserReports,
  BroadcastSystem,
  IslamicTriviaGame,
  WordPuzzleGame,
  SurahIdentificationGame,
  RacingGame
} = require('../features/newFeatures');

class NewFeaturesHandler {
  // ========================
  // QURAN HANDLERS
  // ========================

  static async handleTafsir(ctx) {
    try {
      const mufassireen = QuranTafsirFeature.getAvailableMufassireen();
      let message = '📖 **تفسير القرآن**\n\nاختر المفسر:\n\n';

      mufassireen.forEach((m, i) => {
        message += `${i + 1}. ${m.name}\n   ${m.description}\n\n`;
      });

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔙 رجوع', 'menu:quran')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'Markdown', ...buttons });
    } catch (error) {
      console.error('Error in tafsir handler:', error);
      await ctx.reply('❌ حدث خطأ في تحميل التفسير');
    }
  }

  static async handleTajweed(ctx) {
    try {
      const rules = TajweedLessonsFeature.getTajweedRules();
      let message = '🎯 **دروس التجويد**\n\n';

      rules.rules.forEach((rule, i) => {
        message += `${i + 1}. ${rule.name}\n`;
        message += `   الأنواع: ${rule.types.join(', ')}\n`;
        message += `   الوصف: ${rule.description}\n\n`;
      });

      message += '💡 **نصائح للتعلم:**\n';
      rules.tips.forEach((tip, i) => {
        message += `${i + 1}. ${tip}\n`;
      });

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔙 رجوع', 'menu:quran')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'Markdown', ...buttons });
    } catch (error) {
      console.error('Error in tajweed handler:', error);
      await ctx.reply('❌ حدث خطأ في تحميل دروس التجويد');
    }
  }

  static async handleQuranQuiz(ctx, difficulty = 'easy') {
    try {
      const quiz = QuranQuizFeature.generateQuiz(difficulty);
      ctx.session.quiz = quiz;

      let message = `❓ **سؤال قرآني** (${difficulty === 'easy' ? 'سهل' : difficulty === 'medium' ? 'متوسط' : 'صعب'})\n\n`;
      message += `${quiz.question}\n\n`;

      const options = quiz.options.map((opt, i) => `${String.fromCharCode(97 + i)}) ${opt}`).join('\n');
      message += options;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('أ', 'quiz:a'), Markup.button.callback('ب', 'quiz:b'),Markup.button.callback('ج', 'quiz:c'), Markup.button.callback('د', 'quiz:d')],
        [Markup.button.callback('🔄 سؤال آخر', `quiz:next:${difficulty}`)],
        [Markup.button.callback('🔙 رجوع', 'menu:quran')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'Markdown', ...buttons });
    } catch (error) {
      console.error('Error in quiz handler:', error);
      await ctx.reply('❌ حدث خطأ في تحميل السؤال');
    }
  }

  // ========================
  // ADHKAR HANDLERS
  // ========================

  static async handleMorningAdhkar(ctx) {
    try {
      const adhkar = MorningEveningTracker.getMorningAdhkar();
      let message = '🌅 **أذكار الصباح**\n\n';

      adhkar.forEach((dhikr, i) => {
        message += `${i + 1}. ${dhikr}\n\n`;
      });

      const userId = ctx.from.id;
      const result = await MorningEveningTracker.completeMorningAdhkar(userId);

      if (result.success) {
        message += '✅ تم تسجيل أذكار الصباح!\n';
        message += `🔥 سلسلة الأيام: ${result.streak} يوم`;
      }

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('📝 سجل إنجاز', 'adhkar:record')],
        [Markup.button.callback('🔙 رجوع', 'menu:adhkar')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'Markdown', ...buttons });
    } catch (error) {
      console.error('Error in morning adhkar handler:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleEveningAdhkar(ctx) {
    try {
      const adhkar = MorningEveningTracker.getEveningAdhkar();
      let message = '🌙 **أذكار المساء**\n\n';

      adhkar.forEach((dhikr, i) => {
        message += `${i + 1}. ${dhikr}\n\n`;
      });

      const userId = ctx.from.id;
      const result = await MorningEveningTracker.completeEveningAdhkar(userId);

      if (result.success) {
        message += '✅ تم تسجيل أذكار المساء!\n';
        message += `🔥 سلسلة الأيام: ${result.streak} يوم`;
      }

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('📝 سجل إنجاز', 'adhkar:record')],
        [Markup.button.callback('🔙 رجوع', 'menu:adhkar')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'Markdown', ...buttons });
    } catch (error) {
      console.error('Error in evening adhkar handler:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleIstighfar(ctx) {
    try {
      const variants = IstighfarCounter.getIstighfarVariants();
      const stats = await IstighfarCounter.getStats(ctx.from.id);

      let message = '🤲 **استغفار**\n\n';

      message += '**الاستغفار:**\n';
      variants.forEach((dhikr, i) => {
        message += `${i + 1}. ${dhikr}\n`;
      });

      message += '\n📊 **إحصائياتك:**\n';
      message += `   إجمالي: ${stats.total} مرة\n`;
      message += `   اليوم: ${stats.today} مرة\n`;
      message += `   الهدف: ${stats.goal} مرة`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('➕ أضف استغفارة', 'istighfar:add')],
        [Markup.button.callback('🔙 رجوع', 'menu:adhkar')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'Markdown', ...buttons });
    } catch (error) {
      console.error('Error in istighfar handler:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleTasbih(ctx) {
    try {
      const dhikrs = DigitalTasbih.getTasbihDhikr();

      let message = '🔢 **تسبيح إلكتروني**\n\n';

      message += '**الأذكار:**\n';
      dhikrs.forEach((dhikr, i) => {
        message += `${i + 1}. ${dhikr}\n`;
      });

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔢 ابدأ تسبيح', 'tasbih:start')],
        [Markup.button.callback('📊 سجل التسبيح', 'tasbih:history')],
        [Markup.button.callback('🔙 رجوع', 'menu:adhkar')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'Markdown', ...buttons });
    } catch (error) {
      console.error('Error in tasbih handler:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  // ========================
  // ADMIN HANDLERS
  // ========================

  static async handleAutoModSettings(ctx, groupSettings) {
    try {
      let message = '🛡️ **الإعدادات الأمنية**\n\n';

      message += `الحالة: ${groupSettings?.autoModEnabled ? '✅ مفعل' : '❌ معطل'}\n\n`;
      message += '**الخيارات:**\n';
      message += `1. منع الروابط: ${groupSettings?.noLinks ? '✅' : '❌'}\n`;
      message += `2. منع الكتابة الكبيرة: ${groupSettings?.noCaps ? '✅' : '❌'}\n`;
      message += `3. منع الرسائل المتكررة: ${groupSettings?.noSpam ? '✅' : '❌'}`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 تبديل الحالة', 'admin:automod:toggle')],
        [Markup.button.callback('🔙 رجوع', 'menu:admin')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'Markdown', ...buttons });
    } catch (error) {
      console.error('Error in automod settings:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleWelcomeSettings(ctx, groupSettings) {
    try {
      let message = '👋 **إعدادات الترحيب**\n\n';

      message += `الترحيب: ${groupSettings?.welcomeEnabled ? '✅ مفعل' : '❌ معطل'}\n`;
      message += `الوداع: ${groupSettings?.goodbyeEnabled ? '✅ مفعل' : '❌ معطل'}\n\n`;

      if (groupSettings?.welcomeMessage) {
        message += `**الرسالة:**\n${groupSettings.welcomeMessage}`;
      }

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('👋 ترحيب', 'admin:welcome:on'), Markup.button.callback('👋 وداع', 'admin:goodbye:on')],
        [Markup.button.callback('✏️ رسالة مخصصة', 'admin:welcome:custom')],
        [Markup.button.callback('🔙 رجوع', 'menu:admin')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'Markdown', ...buttons });
    } catch (error) {
      console.error('Error in welcome settings:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleBroadcast(ctx) {
    try {
      let message = '📢 **الإذاعة**\n\n';
      message += 'أدخل رسالة الإذاعة التي تريد إرسالها إلى جميع المجموعات.';

      await ctx.reply(message, { parse_mode: 'Markdown' });
      // Set up awaiting for broadcast message
    } catch (error) {
      console.error('Error in broadcast handler:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleReports(ctx, groupId) {
    try {
      const reports = await UserReports.getReportsByGroup(groupId);

      let message = '📋 **التقارير**\n\n';

      if (reports.length === 0) {
        message += 'لا توجد تقارير حالياً.';
      } else {
        reports.forEach((report, i) => {
          message += `${i + 1}. المستخدم: ${report.reportedUserId}\n`;
          message += `   السبب: ${report.reason}\n`;
          message += `   الحالة: ${report.status}\n\n`;
        });
      }

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔙 رجوع', 'menu:admin')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'Markdown', ...buttons });
    } catch (error) {
      console.error('Error in reports handler:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  // ========================
  // GAMES HANDLERS
  // ========================

  static async handleTriviaGame(ctx, category = 'all') {
    try {
      const question = IslamicTriviaGame.getQuestion(category);
      ctx.session.game = { type: 'trivia', question };

      let message = '🎯 **مسابقة إسلامية**\n';
      message += `الفئة: ${question.category}\n\n`;
      message += `❓ ${question.question}\n\n`;

      const options = question.options.map((opt, i) => `${String.fromCharCode(97 + i)}) ${opt}`).join('\n');
      message += options;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('أ', 'game:trivia:a'), Markup.button.callback('ب', 'game:trivia:b'),Markup.button.callback('ج', 'game:trivia:c'), Markup.button.callback('د', 'game:trivia:d')],
        [Markup.button.callback('🔄 سؤال آخر', `game:trivia:next:${category}`)],
        [Markup.button.callback('🔙 رجوع', 'menu:games')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'Markdown', ...buttons });
    } catch (error) {
      console.error('Error in trivia handler:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleWordPuzzle(ctx) {
    try {
      const puzzle = WordPuzzleGame.getRandomPuzzle();
      ctx.session.game = { type: 'puzzle', puzzle };

      let message = '🧩 **لغز كلمات**\n\n';
      message += `💡 التلميح: ${puzzle.hint}\n\n`;
      message += `عدد الأحرف: ${puzzle.letters.length}\n`;
      message += `الحروف: ${puzzle.letters.join(' - ')}\n`;
      message += '_اكتب الإجابة في المحادثة_';

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 كلمة أخرى', 'game:puzzle:next')],
        [Markup.button.callback('🔙 رجوع', 'menu:games')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'Markdown', ...buttons });
    } catch (error) {
      console.error('Error in puzzle handler:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleSurahGame(ctx) {
    try {
      const quiz = SurahIdentificationGame.getSurahQuiz();
      ctx.session.game = { type: 'surah', quiz };

      let message = '📖 **تعرف على السورة**\n\n';
      message += `${quiz.question}\n\n`;

      const options = quiz.options.map((opt, i) => `${String.fromCharCode(97 + i)}) ${opt}`).join('\n');
      message += options;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('أ', 'game:surah:a'), Markup.button.callback('ب', 'game:surah:b'),Markup.button.callback('ج', 'game:surah:c'), Markup.button.callback('د', 'game:surah:d')],
        [Markup.button.callback('🔄 سؤال آخر', 'game:surah:next')],
        [Markup.button.callback('🔙 رجوع', 'menu:games')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'Markdown', ...buttons });
    } catch (error) {
      console.error('Error in surah game handler:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleRacingGame(ctx) {
    try {
      const race = await RacingGame.startRace(ctx.from.id);
      ctx.session.game = { type: 'race', race };

      let message = '🏃 **سباق القرآن**\n\n';
      message += '📜 احفظ الآيات وتقدم في السباق!\n\n';
      message += `التقدم: ${'█'.repeat(race.currentPosition / 5)}${'_'.repeat(20 - race.currentPosition / 5)} ${race.currentPosition}%\n`;
      message += `\n🎯 الهدف: ${race.targetPosition}%`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('➕ تقدم', 'game:race:progress')],
        [Markup.button.callback('🔙 رجوع', 'menu:games')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'Markdown', ...buttons });
    } catch (error) {
      console.error('Error in racing game handler:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }
}

module.exports = NewFeaturesHandler;
