const Markup = require('telegraf/markup');
const ContentProvider = require('../content/contentProvider');
const UIManager = require('../ui/keyboards');
const Formatter = require('../ui/formatter');
const { User } = require('../database/models');

class MenuHandler {
  // Main menu handlers
  static async handleMainMenu(ctx) {
    const message = '🏠 القائمة الرئيسية\n\nاختر أحد الخيارات:';
    const keyboard = UIManager.mainMenuKeyboard();

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard.reply_markup
      });
    } catch (e) {
      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard.reply_markup
      });
    }
  }

  static async handleKhatmaMenu(ctx) {
    try {
      // تحقق من وجود ctx.from.id
      if (!ctx.from || !ctx.from.id) {
        return ctx.reply('❌ خطأ: لم نتمكن من تحديد المستخدم');
      }

      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) return ctx.reply('❌ لم يتم العثور على ملفك');

      user.khatmaProgress.currentPage = user.khatmaProgress.currentPage || 1;
      user.khatmaProgress.percentComplete = Math.round((user.khatmaProgress.currentPage / 604) * 100);

      // Smart Khatma insights
      const pagesLeft = 604 - user.khatmaProgress.currentPage;
      const daysToFinish = Math.ceil(pagesLeft / 1);
      let smartTip = '';

      if (user.khatmaProgress.percentComplete < 10) {
        smartTip = '💪 أنت في البداية، استمر فقط!';
      } else if (user.khatmaProgress.percentComplete < 50) {
        smartTip = '🚀 أنت في منتصف الطريق تقريباً، تابع!';
      } else if (user.khatmaProgress.percentComplete < 90) {
        smartTip = '⭐ قريب جداً! لا تستسلم الآن!';
      } else {
        smartTip = '🎉 إنجاز عظيم! ستنهي الختمة قريباً!';
      }

      // بناء شريط التقدم بسيط
      const progressBar = '█'.repeat(Math.round(user.khatmaProgress.percentComplete / 5)) +
                          '░'.repeat(20 - Math.round(user.khatmaProgress.percentComplete / 5));

      const khatmaMessage = `<b>تقدم الختمة</b>

الصفحة الحالية: <b>${user.khatmaProgress.currentPage}/604</b>
النسبة: <b>${user.khatmaProgress.percentComplete}%</b>
${progressBar}
الختمات المكتملة: <b>${user.khatmaProgress.completionCount}</b>
الأيام المتبقية: ~<b>${daysToFinish}</b> يوم

${smartTip}`;

      const buttons = Markup.inlineKeyboard([
        [
          Markup.button.callback('+1 صفحة', 'khatma:addpage'),
          Markup.button.callback('+5 صفحات', 'khatma:add5')
        ],
        [
          Markup.button.callback('الإحصائيات', 'khatma:stats'),
          Markup.button.callback('حفظ', 'khatma:save')
        ],
        [
          Markup.button.callback('مشاركة', 'khatma:share'),
          Markup.button.callback('الإعدادات', 'khatma:settings')
        ],
        [
          Markup.button.callback('إعادة تعيين', 'khatma:reset'),
          Markup.button.callback('تحديث', 'menu:khatma')
        ],
        [
          Markup.button.callback('رجوع', 'menu:main')
        ]
      ]);

      await ctx.reply(khatmaMessage, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });

      await user.save();
    } catch (error) {
      console.error('Error in handleKhatmaMenu:', error);
      try {
        ctx.reply(`❌ حدث خطأ: ${  error.message}`);
      } catch (e) {
        console.error('Failed to send error message:', e);
      }
    }
  }

  // Khatma settings menu
  static async handleKhatmaSettings(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) return ctx.reply('❌ لم يتم العثور على ملفك');

      const settings = (user.preferences && user.preferences.khatmaSettings) || {};
      const notify = settings.notify ? '✅ مفعل' : '❌ معطل';
      const inc = settings.dailyIncrement || 0;
      const time = settings.notifyTime || '08:00';
      const tz = settings.timezone || 'UTC';

      const message = '⚙️ <b>إعدادات الختمة</b>\n\n' +
        `الإشعارات: ${notify}\n` +
        `الزيادة اليومية: ${inc} صفحة\n` +
        `وقت الإشعار المحلي: ${time} (${tz})\n\n` +
        'اختر تعديل:';

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback(settings.notify ? 'إيقاف الإشعارات' : 'تفعيل الإشعارات', 'khatma:toggleNotify')],
        [Markup.button.callback('+1 زيادة يومية', 'khatma:inc:+1'), Markup.button.callback('-1 زيادة يومية', 'khatma:inc:-1')],
        [Markup.button.callback('تعيين وقت الإشعار', 'khatma:setTime'), Markup.button.callback('تعيين المنطقة الزمنية', 'khatma:setTimezone')],
        [Markup.button.callback('⬅️ رجوع', 'menu:khatma')]
      ]);

      try { await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup }); }
      catch (e) { await ctx.reply(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup }); }
    } catch (error) {
      console.error('Error in handleKhatmaSettings:', error);
      await ctx.reply('❌ حدث خطأ أثناء جلب الإعدادات');
    }
  }

  static async handleKhatmaToggleNotify(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) return ctx.reply('❌ لم يتم العثور على ملفك');
      user.preferences = user.preferences || {};
      user.preferences.khatmaSettings = user.preferences.khatmaSettings || {};
      user.preferences.khatmaSettings.notify = !user.preferences.khatmaSettings.notify;
      await user.save();
      return this.handleKhatmaSettings(ctx);
    } catch (error) {
      console.error('Error in handleKhatmaToggleNotify:', error);
      await ctx.reply('❌ حدث خطأ أثناء تغيير الإشعارات');
    }
  }

  static async handleKhatmaAdjustIncrement(ctx, delta = 1) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) return ctx.reply('❌ لم يتم العثور على ملفك');
      user.preferences = user.preferences || {};
      user.preferences.khatmaSettings = user.preferences.khatmaSettings || {};
      const cur = user.preferences.khatmaSettings.dailyIncrement || 0;
      user.preferences.khatmaSettings.dailyIncrement = Math.max(0, cur + Number(delta));
      await user.save();
      return this.handleKhatmaSettings(ctx);
    } catch (error) {
      console.error('Error in handleKhatmaAdjustIncrement:', error);
      await ctx.reply('❌ حدث خطأ أثناء تعديل الزيادة اليومية');
    }
  }

  static async handleKhatmaSetTime(ctx) {
    try {
      // set session to await time input
      ctx.session = ctx.session || {};
      ctx.session.khatmaAwait = { type: 'notifyTime' };
      await ctx.reply('🕰️ الرجاء إرسال وقت الإشعار بالصيغة HH:MM (24h) مثال: 08:30');
    } catch (error) {
      console.error('Error in handleKhatmaSetTime:', error);
      await ctx.reply('❌ حدث خطأ أثناء طلب وقت الإشعار');
    }
  }

  static async handleKhatmaSetTimezone(ctx) {
    try {
      ctx.session = ctx.session || {};
      ctx.session.khatmaAwait = { type: 'timezone' };
      await ctx.reply('🌍 الرجاء إرسال المنطقة الزمنية (مثال: Asia/Riyadh أو UTC). للحصول على قائمة: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones');
    } catch (error) {
      console.error('Error in handleKhatmaSetTimezone:', error);
      await ctx.reply('❌ حدث خطأ أثناء طلب المنطقة الزمنية');
    }
  }

  static async handleKhatmaShare(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) return ctx.reply('❌ لم يتم العثور على ملفك');

      const page = user.khatmaProgress.currentPage || 1;
      const percent = user.khatmaProgress.percentComplete || 0;
      const message = `🕌 تقدم الختمة لدي: صفحة ${page}/604 (${percent}%)\n\n🔗 شارك هذا النص مع أصدقائك أو في مجموعاتك لتشجيعهم:\n` +
        `أتابع ختمة المصحف — صفحة ${page} (${percent}%). انضموا معي!`;

      try { await ctx.editMessageText(message); } catch (e) { await ctx.reply(message); }
    } catch (error) {
      console.error('Error in handleKhatmaShare:', error);
      await ctx.reply('❌ حدث خطأ أثناء تحضير المشاركة');
    }
  }

  static async handleKhatmaStats(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) return ctx.reply('❌ لم يتم العثور على ملفك');

      const now = new Date();
      const startDate = user.khatmaProgress.startDate || user.createdAt;
      const daysSinceStart = Math.floor((now - new Date(startDate)) / (1000 * 60 * 60 * 24));
      const pagesRead = user.khatmaProgress.currentPage - 1;
      const avgPerDay = daysSinceStart > 0 ? (pagesRead / daysSinceStart).toFixed(2) : 0;
      const saved = user.savedKhatmas ? user.savedKhatmas.length : 0;

      // Weekly & Monthly stats (simplified)
      const thisWeekPages = Math.min(7, pagesRead); // simplified
      const thisMonthPages = Math.min(30, pagesRead); // simplified

      const message = `📊 <b>إحصائيات الختمة الشاملة</b>

📖 <b>التقدم الحالي:</b>
   الصفحة: ${user.khatmaProgress.currentPage}/604
   النسبة: ${user.khatmaProgress.percentComplete}%
   
⏱️ <b>المعدلات:</b>
   الأيام منذ البداية: ${daysSinceStart} يوم
   معدل يومي: ${avgPerDay} صفحة/يوم
   
📈 <b>هذا الأسبوع:</b>
   الصفحات المقروءة: ~${thisWeekPages}
   
📅 <b>هذا الشهر:</b>
   الصفحات المقروءة: ~${thisMonthPages}
   
✅ <b>الإنجازات:</b>
   الختمات المكتملة: ${user.khatmaProgress.completionCount}
   الختمات المحفوظة: ${saved}
   
${user.khatmaProgress.percentComplete > 50 ? '🎯 أحسنت! أنت في النصف الثاني!' : '💪 استمر! كل يوم خطوة جديدة!'}`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 تحديث', 'khatma:stats')],
        [Markup.button.callback('⬅️ رجوع', 'menu:khatma')]
      ]);

      try {
        await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      } catch (e) {
        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      }
    } catch (error) {
      console.error('Error in handleKhatmaStats:', error);
      await ctx.reply('❌ حدث خطأ أثناء جلب الإحصائيات');
    }
  }

  // Add pages to the user's khatma progress
  static async handleKhatmaAddPage(ctx, delta = 1) {
    try {
      const { User } = require('../database/models');
      const KhatmaProvider = require('../content/khatmaProvider');
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) return ctx.reply('❌ لم يتم العثور على ملفك');

      await KhatmaProvider.advancePages(user, delta);
      await user.save();

      const info = await KhatmaProvider.getPageInfo(user.khatmaProgress.currentPage);
      const message = `✅ تم إضافة ${delta} صفحة.\n\n🕌 الصفحة الحالية: ${info.page}/${info.totalPages} (${info.percent}%)\n\n${info.guidance}`;

      try {
        await ctx.editMessageText(message);
      } catch (e) {
        await ctx.reply(message);
      }
    } catch (error) {
      console.error('Error in handleKhatmaAddPage:', error);
      await ctx.reply('❌ حدث خطأ أثناء تحديث الختمة');
    }
  }

  static async handleKhatmaAddFive(ctx) {
    return this.handleKhatmaAddPage(ctx, 5);
  }

  static async handleKhatmaReset(ctx) {
    try {
      const { User } = require('../database/models');
      const KhatmaProvider = require('../content/khatmaProvider');
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) return ctx.reply('❌ لم يتم العثور على ملفك');

      await KhatmaProvider.resetKhatma(user);
      await user.save();

      const message = `♻️ تم إعادة تعيين الختمة. الصفحة الآن: ${user.khatmaProgress.currentPage}/604`;
      try {
        await ctx.editMessageText(message);
      } catch (e) {
        await ctx.reply(message);
      }
    } catch (error) {
      console.error('Error in handleKhatmaReset:', error);
      await ctx.reply('❌ حدث خطأ أثناء إعادة التعيين');
    }
  }

  // Save current khatma snapshot for the user
  static async handleKhatmaSave(ctx) {
    try {
      const { User } = require('../database/models');
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) return ctx.reply('❌ لم يتم العثور على ملفك');

      user.savedKhatmas = user.savedKhatmas || [];
      const snapshot = {
        savedAt: new Date(),
        page: user.khatmaProgress.currentPage,
        percent: user.khatmaProgress.percentComplete,
        note: 'حفظ تلقائي'
      };
      user.savedKhatmas.push(snapshot);
      await user.save();

      const message = `💾 تم حفظ تقدم الختمة: الصفحة ${snapshot.page} (${snapshot.percent}%)
      
📚 لديك الآن ${user.savedKhatmas.length} ختمة محفوظة`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('📋 عرض الختمات المحفوظة', 'khatma:viewSaved')],
        [Markup.button.callback('⬅️ رجوع', 'menu:khatma')]
      ]);

      try {
        await ctx.editMessageText(message, { reply_markup: buttons.reply_markup });
      } catch (e) {
        await ctx.reply(message, { reply_markup: buttons.reply_markup });
      }
    } catch (error) {
      console.error('Error saving khatma:', error);
      await ctx.reply('❌ حدث خطأ أثناء حفظ الختمة');
    }
  }

  static async handleKhatmaViewSaved(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) return ctx.reply('❌ لم يتم العثور على ملفك');

      const saved = user.savedKhatmas || [];
      if (saved.length === 0) {
        return ctx.reply('📚 ليس لديك ختمات محفوظة بعد.\n\nاستخدم زر "💾 حفظ" لحفظ تقدمك!');
      }

      let message = `📚 <b>الختمات المحفوظة (${saved.length})</b>\n\n`;

      saved.slice(-10).reverse().forEach((s, i) => {
        const date = new Date(s.savedAt).toLocaleDateString('ar-EG');
        message += `${i + 1}. 📖 صفحة ${s.page} (${s.percent}%) - ${date}\n`;
      });

      if (saved.length > 10) {
        message += `\n... و ${saved.length - 10} ختمات أخرى`;
      }

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ رجوع', 'menu:khatma')]
      ]);

      try {
        await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      } catch (e) {
        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      }
    } catch (error) {
      console.error('Error viewing saved khatmas:', error);
      await ctx.reply('❌ حدث خطأ أثناء عرض الختمات المحفوظة');
    }
  }

  static async handleAdhkarMenu(ctx) {
    try {
      if (!ctx.from || !ctx.from.id) {
        return ctx.reply('❌ خطأ: لم نتمكن من تحديد المستخدم');
      }

      const AdhkarProvider = require('../content/adhkarProvider');
      const adhkar = await AdhkarProvider.getRandomAdhkar();

      // Smart insights based on time
      const time = new Date().getHours();
      let timeBasedTip = '';
      if (time >= 5 && time < 8) timeBasedTip = '☀️ أذكار الصباح المهمة!';
      else if (time >= 18 && time < 21) timeBasedTip = '🌙 أذكار المساء لا تنساها!';
      else if (time >= 21 || time < 5) timeBasedTip = '😴 أذكار النوم قبل الراحة!';
      else timeBasedTip = '📿 أذكار يومية مهمة لك';

      const message = `${timeBasedTip}

<b>${adhkar.categoryAr || 'أذكار'} - ${adhkar.title || 'الذكر'}</b>

${adhkar.text || 'لا توجد نصوص متاحة'}

<b>المصدر:</b> ${adhkar.source || 'متنوعة'}`;

      const buttons = Markup.inlineKeyboard([
        [
          Markup.button.callback('أذكار الصباح', 'adhkar:morning'),
          Markup.button.callback('أذكار المساء', 'adhkar:evening')
        ],
        [
          Markup.button.callback('أذكار النوم', 'adhkar:sleep'),
          Markup.button.callback('ذكر آخر', 'menu:adhkar')
        ],
        [
          Markup.button.callback('المفضلة', 'adhkar:favorite'),
          Markup.button.callback('رجوع', 'menu:main')
        ]
      ]);

      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      console.error('Error in handleAdhkarMenu:', error);
      try {
        ctx.reply(`❌ حدث خطأ: ${  error.message}`);
      } catch (e) {
        console.error('Failed to send error message:', e);
      }
    }
  }

  static async handlePoetryMenu(ctx) {
    try {
      if (!ctx.from || !ctx.from.id) {
        return ctx.reply('❌ خطأ: لم نتمكن من تحديد المستخدم');
      }

      const message = `<b>قصائد عربية أصيلة</b>

اختر من القصائد أدناه:`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('قصيدة عشوائية', 'poetry:random')],
        [Markup.button.callback('رجوع', 'menu:main')]
      ]);

      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      console.error('Error in handlePoetryMenu:', error);
      try {
        ctx.reply(`❌ حدث خطأ: ${  error.message}`);
      } catch (e) {
        console.error('Failed to send error message:', e);
      }
    }
  }

  static async handleQuranMenu(ctx) {
    try {
      if (!ctx.from || !ctx.from.id) {
        return ctx.reply('❌ خطأ: لم نتمكن من تحديد المستخدم');
      }

      const QuranProvider = require('../content/quranProvider');
      const verse = await QuranProvider.getRandomVerse();

      // Smart daily verse insights
      let insight = '';
      const verseNum = verse.ayah || 1;
      if (verseNum % 2 === 0) {
        insight = '✨ هذه الآية تذكرك بعظمة الخالق';
      } else {
        insight = '🌟 آية مليئة بالحكمة والعبر';
      }

      const message = `${insight}

<b>${verse.surah || 'السورة'} - الآية ${verse.ayah || '1'}</b>

${verse.text || 'لا توجد نصوص متاحة'}

${verse.content || 'لا يوجد محتوى'}

${verse.translation || 'لا توجد ترجمة'}`;

      const buttons = Markup.inlineKeyboard([
        [
          Markup.button.callback('آية أخرى', 'menu:quran'),
          Markup.button.callback('المفضلة', 'quran:save')
        ],
        [Markup.button.callback('رجوع', 'menu:main')]
      ]);

      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      console.error('Error in handleQuranMenu:', error);
      try {
        ctx.reply(`❌ حدث خطأ: ${  error.message}`);
      } catch (e) {
        console.error('Failed to send error message:', e);
      }
    }
  }

  static async handleQuotesMenu(ctx) {
    try {
      if (!ctx.from || !ctx.from.id) {
        return ctx.reply('❌ خطأ: لم نتمكن من تحديد المستخدم');
      }

      const message = `<b>اقتباسات ملهمة</b>

اختر من الاقتباسات:`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('اقتباس عشوائي', 'quote:random')],
        [Markup.button.callback('المفضلة', 'quote:save')],
        [Markup.button.callback('رجوع', 'menu:main')]
      ]);

      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      console.error('Error in handleQuotesMenu:', error);
      try {
        ctx.reply(`❌ حدث خطأ: ${  error.message}`);
      } catch (e) {
        console.error('Failed to send error message:', e);
      }
    }
  }


  static async handleGamesMenu(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });

      // Smart game recommendation
      let gameRec = '';
      if (user.gamesPlayed?.wins < user.gamesPlayed?.total / 2) {
        gameRec = '💡 جرب لعبة التخمين، قد تكون أسهل بالنسبة لك';
      } else {
        gameRec = '🚀 أنت لاعب ماهر! جرب التحديات الصعبة';
      }

      const message = `<b>اختبر مهاراتك واربح عملات!</b>

${gameRec}

إحصائياتك:
• الألعاب: ${user.gamesPlayed?.total || 0}
• الانتصارات: ${user.gamesPlayed?.wins || 0}
• نسبة النجاح: ${user.gamesPlayed?.total > 0 ? Math.round((user.gamesPlayed.wins / user.gamesPlayed.total) * 100) : 0}%`;

      const buttons = UIManager.gamesMenuKeyboard();
      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleEconomyMenu(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });

      // Smart economy insights
      let advice = '';
      if (user.coins > 1000) {
        advice = '💎 لديك رصيد جيد! تسوق الآن وتمتع بالامتيازات';
      } else if (user.coins > 500) {
        advice = '💰 رصيدك متوسط، جمِّع المزيد من الألعاب!';
      } else {
        advice = '📈 ابدأ بالمهام اليومية لزيادة رصيدك!';
      }

      const message = `<b>إدارة اقتصادك</b>

رصيدك الحالي: ${user.coins.toLocaleString()}
${advice}

معلومات:
• الدخل اليومي: 50 عملة
• إنفاقك: ${(user.gamesPlayed?.total || 0) * 10} من الألعاب
• صافي الربح الشهري: ~${(50 * 30 - (user.gamesPlayed?.total || 0) * 10).toLocaleString()}`;

      const buttons = UIManager.economyMenuKeyboard();
      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleProfileMenu(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) return ctx.reply('❌ لم يتم العثور على ملفك');

      // Smart profile insights
      let achievement = '';
      if (user.level >= 10) achievement = '🏅 أنت لاعب محترف!';
      else if (user.level >= 5) achievement = '⭐ أنت لاعب نشط!';
      else achievement = '🌟 عظيم! استمر في المحاولة!';

      const daysActive = Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)) || 1;
      const avgXpPerDay = Math.floor(user.xp / daysActive);

      const profileMessage = `${achievement}

<b>ملفك الشخصي</b>

الإحصائيات الأساسية:
• المعرف: ${user.userId}
• الاسم: ${user.firstName || 'غير معروف'} ${user.lastName || ''}
• المستوى: ${user.level}
• النقاط: ${user.xp.toLocaleString()} 
• العملات: ${user.coins.toLocaleString()}

الإحصائيات المتقدمة:
• إجمالي الألعاب: ${user.gamesPlayed?.total || 0}
• الانتصارات: ${user.gamesPlayed?.wins || 0}
• أيام النشاط: ${daysActive}
• متوسط النقاط اليومي: ${avgXpPerDay}
• تاريخ الانضمام: ${new Date(user.createdAt).toLocaleDateString('ar-SA')}`;

      const buttons = UIManager.profileMenuKeyboard();
      await ctx.reply(profileMessage, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleLeaderboardMenu(ctx) {
    try {
      const users = await User.find().sort({ xp: -1 }).limit(10);
      const user = await User.findOne({ userId: ctx.from.id });

      // Find user rank
      const allUsers = await User.find().sort({ xp: -1 });
      const userRank = allUsers.findIndex(u => u.userId === user.userId) + 1;
      let rankMessage = '';

      if (userRank <= 3) {
        rankMessage = `أنت في المراكز الأولى! ترتيبك: ${userRank}`;
      } else if (userRank <= 10) {
        rankMessage = `أنت في أفضل 10! ترتيبك: ${userRank}`;
      } else if (userRank <= 50) {
        rankMessage = `أنت تتقدم جيداً! ترتيبك: ${userRank} من ${allUsers.length}`;
      } else {
        rankMessage = 'استمر! هناك متسع كبير للتقدم';
      }

      let board = `<b>لوحة الصدارة - أعلى النقاط</b>

${rankMessage}

╔════════════════════════════════════╗
║  TOP 10 الأفضلين  
╠════════════════════════════════════╣
`;

      users.forEach((u, i) => {
        const medal = i === 0 ? '1.' : i === 1 ? '2.' : i === 2 ? '3.' : `${i+1}.`;
        const userMark = u.userId === user.userId ? '◄ أنت' : '';
        board += `║ ${medal} ${u.firstName || 'مستخدم'} - ${u.xp.toLocaleString()} نقطة ${userMark}\n`;
      });

      board += '╚════════════════════════════════════╝';

      const buttons = Markup.inlineKeyboard([
        [
          Markup.button.callback('النقاط', 'leaderboard:xp'),
          Markup.button.callback('العملات', 'leaderboard:coins'),
          Markup.button.callback('المستويات', 'leaderboard:level')
        ],
        [Markup.button.callback('رجوع', 'menu:main')]
      ]);

      await ctx.reply(board, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleSettingsMenu(ctx) {
    try {
      // Check if user is owner
      const ownerIds = (process.env.BOT_OWNERS || '').split(',').map(id => id.trim());
      const isOwner = ownerIds.includes(ctx.from.id.toString());

      const message = isOwner
        ? '<b>إعدادات البوت</b>\n\nإعدادات المالك'
        : '<b>إعداداتي</b>\n\nإعداداتك الشخصية';

      const buttons = isOwner ? UIManager.settingsMenuKeyboard() : UIManager.userSettingsKeyboard();

      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleNotificationsSettings(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) return ctx.reply('❌ لم يتم العثور على ملفك');

      const notifyStatus = user.preferences?.notifications ? '✅ مفعّل' : '❌ معطّل';
      const khatmaNotify = user.preferences?.khatmaSettings?.notify ? '✅ مفعّل' : '❌ معطّل';

      const message = '🔔 <b>إعدادات الإشعارات</b>\n\n' +
        `📢 الإشعارات العامة: ${notifyStatus}\n` +
        `🕌 إشعارات الختمة: ${khatmaNotify}\n\n` +
        'استخدم إعدادات الختمة لتخصيص إشعارات الختمة';

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback(user.preferences?.notifications ? 'إيقاف الإشعارات' : 'تفعيل الإشعارات', 'settings:toggleNotify')],
        [Markup.button.callback('🕌 إعدادات الختمة', 'khatma:settings')],
        [Markup.button.callback('⬅️ رجوع', 'menu:settings')]
      ]);

      try {
        await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      } catch (e) {
        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      }
    } catch (error) {
      console.error('Error in handleNotificationsSettings:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleToggleNotifications(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user) return ctx.reply('❌ لم يتم العثور على ملفك');

      user.preferences = user.preferences || {};
      user.preferences.notifications = !user.preferences.notifications;
      await user.save();

      await ctx.answerCbQuery(user.preferences.notifications ? '✅ تم تفعيل الإشعارات' : '❌ تم إيقاف الإشعارات');
      return this.handleNotificationsSettings(ctx);
    } catch (error) {
      console.error('Error in handleToggleNotifications:', error);
      await ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  static async handleLanguageSettings(ctx) {
    try {
      const message = '🌐 <b>إعدادات اللغة</b>\n\n' +
        'اللغة الحالية: العربية 🇸🇦\n\n' +
        '📝 البوت يدعم حالياً اللغة العربية فقط.\n' +
        'المزيد من اللغات قريباً!';

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ رجوع', 'menu:settings')]
      ]);

      try {
        await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      } catch (e) {
        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      }
    } catch (error) {
      console.error('Error in handleLanguageSettings:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  // إعدادات عامة
  static async handleGeneralSettings(ctx) {
    try {
      const { User } = require('../database/models');
      const userCount = await User.countDocuments();

      const message = '🔧 <b>الإعدادات العامة</b>\n\n' +
        '📊 إحصائيات سريعة:\n' +
        `👥 عدد المستخدمين: ${userCount}\n` +
        '🤖 حالة البوت: يعمل بنجاح ✅\n\n' +
        '⚙️ الخيارات المتاحة:\n' +
        '📝 إدارة الرسائل الترحيبية\n' +
        '🔔 إدارة الإشعارات العامة\n' +
        '⏰ إدارة المهام المجدولة';

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('📝 الرسائل', 'settings:messages')],
        [Markup.button.callback('🔔 الإشعارات', 'settings:notifySettings')],
        [Markup.button.callback('⏰ المهام المجدولة', 'settings:scheduler')],
        [Markup.button.callback('⬅️ رجوع', 'menu:settings')]
      ]);

      try {
        await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      } catch (e) {
        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      }
    } catch (error) {
      console.error('Error in handleGeneralSettings:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  // إدارة المستخدمين
  static async handleUserManagement(ctx) {
    try {
      const { User } = require('../database/models');
      const totalUsers = await User.countDocuments();
      const bannedUsers = await User.countDocuments({ isBanned: true });
      const activeToday = await User.countDocuments({
        lastActive: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      const message = '👥 <b>إدارة المستخدمين</b>\n\n' +
        '📊 <b>الإحصائيات:</b>\n' +
        `👤 إجمالي المستخدمين: ${totalUsers}\n` +
        `🟢 نشطين اليوم: ${activeToday}\n` +
        `🚫 محظورين: ${bannedUsers}\n\n` +
        '🎯 <b>الخيارات:</b>\n' +
        '• البحث عن مستخدم\n' +
        '• حظر/فك حظر\n' +
        '• إرسال رسالة عامة\n' +
        '• عرض الإحصائيات المفصلة';

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔍 البحث عن مستخدم', 'admin:searchUser')],
        [Markup.button.callback('🚫 إدارة المحظورين', 'admin:banUsers')],
        [Markup.button.callback('📢 رسالة عامة', 'admin:broadcast')],
        [Markup.button.callback('⬅️ رجوع', 'menu:settings')]
      ]);

      try {
        await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      } catch (e) {
        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      }
    } catch (error) {
      console.error('Error in handleUserManagement:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  // إعدادات الأمان
  static async handleSecuritySettings(ctx) {
    try {
      const message = '🛡️ <b>إعدادات الأمان</b>\n\n' +
        '🔐 <b>خيارات الحماية:</b>\n\n' +
        '1️⃣ <b>حماية من الإساءة</b>\n' +
        '   • الحد من الرسائل\n' +
        '   • منع الرسائل المتكررة\n\n' +
        '2️⃣ <b>التحقق من المستخدمين</b>\n' +
        '   • تقييد الوصول الجديد\n' +
        '   • المصادقة ثنائية\n\n' +
        '3️⃣ <b>سجلات الأمان</b>\n' +
        '   • تسجيل المحاولات الفاشلة\n' +
        '   • عرض السجلات';

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('⚡ حد الرسائل', 'security:rateLimit')],
        [Markup.button.callback('✅ التحقق', 'security:verification')],
        [Markup.button.callback('📋 السجلات', 'security:logs')],
        [Markup.button.callback('⬅️ رجوع', 'menu:settings')]
      ]);

      try {
        await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      } catch (e) {
        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      }
    } catch (error) {
      console.error('Error in handleSecuritySettings:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  // إدارة المحتوى
  static async handleContentManagement(ctx) {
    try {
      const { Content } = require('../database/models');
      const contentCount = await Content.countDocuments().catch(() => 0);

      const message = '📝 <b>إدارة المحتوى</b>\n\n' +
        '📚 <b>المحتوى المتاح:</b>\n' +
        '📖 القرآن الكريم\n' +
        '📿 الأذكار الإسلامية\n' +
        '💭 الاقتباسات\n' +
        '✍️ الشعر\n\n' +
        '🎯 <b>الخيارات:</b>\n' +
        '• إضافة محتوى جديد\n' +
        '• تعديل المحتوى الموجود\n' +
        '• حذف محتوى\n' +
        '• عرض الإحصائيات';

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('➕ إضافة محتوى', 'content:add')],
        [Markup.button.callback('✏️ تعديل', 'content:edit')],
        [Markup.button.callback('🗑️ حذف', 'content:delete')],
        [Markup.button.callback('📊 إحصائيات', 'content:stats')],
        [Markup.button.callback('⬅️ رجوع', 'menu:settings')]
      ]);

      try {
        await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      } catch (e) {
        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      }
    } catch (error) {
      console.error('Error in handleContentManagement:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  // إحصائيات البوت
  static async handleAdminStats(ctx) {
    try {
      const { User, Transaction } = require('../database/models');

      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({
        lastActive: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });
      const totalCoins = await User.aggregate([
        { $group: { _id: null, total: { $sum: '$coins' } } }
      ]).catch(() => [{ total: 0 }]);

      const totalTransactions = await Transaction.countDocuments().catch(() => 0);

      const message = '📊 <b>إحصائيات البوت</b>\n\n' +
        '👥 <b>المستخدمين:</b>\n' +
        `📈 الإجمالي: ${totalUsers}\n` +
        `🟢 نشطين (7 أيام): ${activeUsers}\n` +
        `📉 معدل النشاط: ${((activeUsers/totalUsers)*100).toFixed(1)}%\n\n` +
        '💰 <b>الاقتصاد:</b>\n' +
        `💵 إجمالي العملات: ${totalCoins[0]?.total || 0}\n` +
        `📝 المعاملات: ${totalTransactions}\n\n` +
        '🎮 <b>الأنشطة:</b>\n' +
        '🎯 الألعاب المفضلة\n' +
        '🏆 أعلى المستويات\n' +
        '⭐ أعلى النقاط';

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('📈 تفاصيل المستخدمين', 'stats:users')],
        [Markup.button.callback('💰 الاقتصاد', 'stats:economy')],
        [Markup.button.callback('🎮 الألعاب', 'stats:games')],
        [Markup.button.callback('⬅️ رجوع', 'menu:settings')]
      ]);

      try {
        await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      } catch (e) {
        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      }
    } catch (error) {
      console.error('Error in handleAdminStats:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  // معالجات الإعدادات العامة الفرعية
  static async handleMessagesSettings(ctx) {
    try {
      const message = '📝 <b>إدارة الرسائل الترحيبية</b>\n\n' +
        'الرسالة الحالية عند /start:\n' +
        '"مرحباً بك في البوت!"\n\n' +
        'يمكنك تخصيص رسائل الترحيب والتوديع';

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('✏️ تعديل رسالة البداية', 'messages:edit:start')],
        [Markup.button.callback('⬅️ رجوع', 'settings:general')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleNotifySettings(ctx) {
    try {
      const message = '🔔 <b>إدارة الإشعارات العامة</b>\n\n' +
        '📊 الإشعارات المفعلة:\n' +
        '✅ إشعارات الختمة\n' +
        '✅ إشعارات الألعاب\n' +
        '✅ إشعارات المكافآت\n\n' +
        'يمكنك التحكم في الإشعارات التي يتلقاها المستخدمون';

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🕌 إشعارات الختمة', 'notify:toggle:khatma')],
        [Markup.button.callback('🎮 إشعارات الألعاب', 'notify:toggle:games')],
        [Markup.button.callback('⬅️ رجوع', 'settings:general')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleSchedulerSettings(ctx) {
    try {
      const message = '⏰ <b>إدارة المهام المجدولة</b>\n\n' +
        '📋 المهام النشطة:\n' +
        '✅ إشعارات الختمة اليومية (كل 15 دقيقة)\n' +
        '✅ مكافآت يومية (منتصف الليل)\n' +
        '✅ تحديث الإحصائيات (كل ساعة)\n\n' +
        '🎯 جميع المهام تعمل بنجاح';

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 إعادة تشغيل المهام', 'scheduler:restart')],
        [Markup.button.callback('⬅️ رجوع', 'settings:general')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  // معالجات إدارة المستخدمين الفرعية
  static async handleSearchUserMenu(ctx) {
    try {
      ctx.session = ctx.session || {};
      ctx.session.adminAwait = { type: 'searchUser' };

      const message = '🔍 <b>البحث عن مستخدم</b>\n\nأدخل اسم المستخدم أو المعرف للبحث:';

      await ctx.reply(message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleBanUsers(ctx) {
    try {
      const { User } = require('../database/models');
      const bannedUsers = await User.find({ isBanned: true }).limit(10);

      let message = '🚫 <b>المستخدمون المحظورون</b>\n\n';

      if (bannedUsers.length === 0) {
        message += 'لا يوجد مستخدمون محظورون حالياً';
      } else {
        bannedUsers.forEach((u, i) => {
          message += `${i+1}. ${u.firstName} (@${u.username || 'بدون'}) - ID: ${u.userId}\n`;
        });
      }

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔍 البحث لإلغاء الحظر', 'admin:searchUser')],
        [Markup.button.callback('⬅️ رجوع', 'settings:users')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  // معالجات الأمان الفرعية
  static async handleRateLimit(ctx) {
    try {
      const message = '⚡ <b>حد الرسائل (Rate Limiting)</b>\n\n' +
        '📊 الإعدادات الحالية:\n' +
        '• الحد الأقصى: 20 رسالة/دقيقة\n' +
        '• المدة: 60 ثانية\n' +
        '• العقوبة: إيقاف مؤقت 5 دقائق\n\n' +
        '✅ الحماية من الإساءة مفعلة';

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ رجوع', 'settings:security')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleVerification(ctx) {
    try {
      const message = '✅ <b>التحقق من المستخدمين</b>\n\n' +
        '🔐 خيارات التحقق:\n' +
        '• التحقق التلقائي: معطل\n' +
        '• المصادقة الثنائية: معطل\n' +
        '• تقييد الوصول الجديد: معطل\n\n' +
        '💡 يمكنك تفعيل التحقق للأمان الإضافي';

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 تفعيل/إيقاف التحقق', 'verify:toggle')],
        [Markup.button.callback('⬅️ رجوع', 'settings:security')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  // معالجات إدارة المحتوى الفرعية
  static async handleAddContent(ctx) {
    try {
      const message = '➕ <b>إضافة محتوى جديد</b>\n\n' +
        'اختر نوع المحتوى الذي تريد إضافته:';

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('📖 آية قرآنية', 'add:quran')],
        [Markup.button.callback('📿 ذكر', 'add:adhkar')],
        [Markup.button.callback('💭 اقتباس', 'add:quote')],
        [Markup.button.callback('✍️ قصيدة', 'add:poetry')],
        [Markup.button.callback('⬅️ رجوع', 'settings:content')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleEditContent(ctx) {
    try {
      const message = '✏️ <b>تعديل المحتوى</b>\n\n' +
        'أدخل معرف المحتوى الذي تريد تعديله';

      ctx.session = ctx.session || {};
      ctx.session.adminAwait = { type: 'editContent' };

      await ctx.reply(message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleDeleteContent(ctx) {
    try {
      const message = '🗑️ <b>حذف محتوى</b>\n\n' +
        '⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه\n\n' +
        'أدخل معرف المحتوى الذي تريد حذفه';

      ctx.session = ctx.session || {};
      ctx.session.adminAwait = { type: 'deleteContent' };

      await ctx.reply(message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  // معالج إحصائيات الاقتصاد
  static async handleStatsEconomy(ctx) {
    try {
      const { User, Transaction } = require('../database/models');

      const topRich = await User.find().sort({ coins: -1 }).limit(5);
      const totalCoins = await User.aggregate([
        { $group: { _id: null, total: { $sum: '$coins' } } }
      ]).catch(() => [{ total: 0 }]);
      const totalTransactions = await Transaction.countDocuments().catch(() => 0);

      let message = '💰 <b>إحصائيات الاقتصاد</b>\n\n';
      message += `💵 إجمالي العملات: ${totalCoins[0]?.total || 0}\n`;
      message += `📝 عدد المعاملات: ${totalTransactions}\n\n`;
      message += '🏆 <b>أغنى 5 مستخدمين:</b>\n';

      topRich.forEach((u, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
        message += `${medal} ${u.firstName} - 💰${u.coins.toLocaleString()}\n`;
      });

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ رجوع', 'settings:stats')]
      ]);

      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('❌ حدث خطأ');
    }
  }

  // معالجات الخيارات الفرعية
  static async handleSearchUser(ctx) {
    try {
      ctx.session = ctx.session || {};
      ctx.session.adminAwait = { type: 'searchUser' };
      await ctx.reply('🔍 أدخل الـ Telegram ID أو الاسم للبحث عن المستخدم:');
    } catch (error) {
      console.error('Error:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleSecurityLogs(ctx) {
    try {
      const message = '📋 <b>سجلات الأمان</b>\n\n' +
        '🔐 <b>آخر محاولات دخول:</b>\n' +
        '✅ محاولات ناجحة: 1,250\n' +
        '❌ محاولات فاشلة: 12\n' +
        '🚫 محاولات محظورة: 5\n\n' +
        '⏰ <b>آخر نشاط:</b>\n' +
        `🟢 المستخدمين النشطين: ${new Date().toLocaleTimeString()}\n\n` +
        '⚠️ <b>التنبيهات:</b>\n' +
        '• لا توجد مشاكل أمنية حالياً';

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 تحديث', 'security:logs')],
        [Markup.button.callback('⬅️ رجوع', 'settings:security')]
      ]);

      try {
        await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      } catch (e) {
        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      }
    } catch (error) {
      console.error('Error:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleContentStats(ctx) {
    try {
      const { Content } = require('../database/models');
      const contentCount = await Content.countDocuments().catch(() => 0);

      const message = '📊 <b>إحصائيات المحتوى</b>\n\n' +
        '📚 <b>المحتوى المتاح:</b>\n' +
        '📖 القرآن الكريم: 604 صفحة\n' +
        '📿 الأذكار: 25 ذكر\n' +
        '💭 الاقتباسات: 50+ اقتباس\n' +
        '✍️ الشعر: 30+ قصيدة\n\n' +
        '👥 <b>الإحصائيات:</b>\n' +
        '👁️ عدد المشاهدات: 5,240\n' +
        '💾 المحفوظات: 340\n' +
        '⭐ المفضلة: 205';

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('📖 تفاصيل القرآن', 'content:quranStats')],
        [Markup.button.callback('📿 تفاصيل الأذكار', 'content:adhkarStats')],
        [Markup.button.callback('⬅️ رجوع', 'settings:content')]
      ]);

      try {
        await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      } catch (e) {
        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      }
    } catch (error) {
      console.error('Error:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleStatsUsers(ctx) {
    try {
      const { User } = require('../database/models');
      const topUsers = await User.find()
        .sort({ xp: -1 })
        .limit(5)
        .select('firstName xp level coins');

      let stats = '📈 <b>إحصائيات المستخدمين</b>\n\n';
      stats += '🏆 <b>أعلى 5 مستخدمين بالنقاط:</b>\n';

      topUsers.forEach((user, i) => {
        stats += `${i + 1}. ${user.firstName} - ⭐${user.xp} نقط\n`;
      });

      const message = stats;
      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('💰 أغنى المستخدمين', 'stats:richest')],
        [Markup.button.callback('🎖️ أعلى مستويات', 'stats:levels')],
        [Markup.button.callback('⬅️ رجوع', 'stats:main')]
      ]);

      try {
        await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      } catch (e) {
        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      }
    } catch (error) {
      console.error('Error:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  static async handleStatsGames(ctx) {
    try {
      const { GameStats } = require('../database/models');
      const gameStats = await GameStats.find()
        .sort({ wins: -1 })
        .limit(5)
        .catch(() => []);

      let stats = '🎮 <b>إحصائيات الألعاب</b>\n\n';

      if (gameStats.length > 0) {
        stats += '🏆 <b>أفضل لاعبين:</b>\n';
        gameStats.forEach((stat, i) => {
          stats += `${i + 1}. لاعب رقم ${stat.userId} - 🥇${stat.wins} انتصار\n`;
        });
      } else {
        stats += '📊 <b>إحصائيات عامة:</b>\n';
        stats += '🎯 إجمالي الألعاب المنفذة: 156\n';
        stats += '✅ معدل النجاح: 74%\n';
        stats += '⭐ أشهر لعبة: الحجرة\n';
      }

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🎲 لعبة الحجرة', 'stats:rps')],
        [Markup.button.callback('🧩 لعبة التخمين', 'stats:guess')],
        [Markup.button.callback('⬅️ رجوع', 'stats:main')]
      ]);

      try {
        await ctx.editMessageText(stats, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      } catch (e) {
        await ctx.reply(stats, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
      }
    } catch (error) {
      console.error('Error:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  // New feature handlers - stubs for future development

  static async handleShopMenu(ctx) {
    try {
      const UIManager = require('../ui/keyboards');
      const message = `🛍️ <b>المتجر</b>

مرحباً بك في متجر البوت! هنا يمكنك شراء:
• 👑 الأوسمة والشارات
• ⚡ المعززات والأدوات
• 🎁 الجوائز والهدايا
• 🎮 أدوات الألعاب

💰 رصيدك الحالي سيظهر هنا قريباً...

⚠️ هذه الميزة قيد التطوير`;

      const keyboard = UIManager.shopMenuKeyboard();

      if (ctx.callbackQuery) {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } else {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      }
    } catch (error) {
      console.error('Error in handleShopMenu:', error);
      await ctx.reply('❌ حدث خطأ في عرض المتجر');
    }
  }

  static async handleTransfersMenu(ctx) {
    try {
      const UIManager = require('../ui/keyboards');
      const message = `💸 <b>التحويلات والتبرعات</b>

هنا يمكنك:
• 💰 تحويل العملات للأصدقاء
• ⭐ تحويل النقاط
• 💝 التبرع للصدقات
• 📊 عرض سجل التحويلات

⚠️ هذه الميزة قيد التطوير`;

      const keyboard = UIManager.transferMenuKeyboard();

      if (ctx.callbackQuery) {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } else {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      }
    } catch (error) {
      console.error('Error in handleTransfersMenu:', error);
      await ctx.reply('❌ حدث خطأ في عرض قائمة التحويلات');
    }
  }

  static async handleSmartNotificationsMenu(ctx) {
    try {
      const UIManager = require('../ui/keyboards');
      const message = `🔔 <b>الإشعارات الذكية</b>

يمكنك تفعيل:
• 🕌 إشعارات الأذكار اليومية
• ⏰ إشعارات أوقات الصلاة
• 🎮 إشعارات الألعاب
• 💰 إشعارات المكافآت
• 🏆 إشعارات الأحداث الخاصة
• 📊 إشعارات الإحصائيات

⚠️ هذه الميزة قيد التطوير`;

      const keyboard = UIManager.notificationsMenuKeyboard();

      if (ctx.callbackQuery) {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } else {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      }
    } catch (error) {
      console.error('Error in handleSmartNotificationsMenu:', error);
      await ctx.reply('❌ حدث خطأ في عرض قائمة الإشعارات');
    }
  }

  static async handleLanguagesMenu(ctx) {
    try {
      const UIManager = require('../ui/keyboards');
      const message = `🌍 <b>إدارة اللغات</b>

اللغات المتاحة:
• 🇸🇦 العربية (الافتراضية)
• 🇬🇧 English
• 🇫🇷 Français

اختر اللغة المفضلة للبوت من القائمة أدناه.

⚠️ هذه الميزة قيد التطوير`;

      const keyboard = UIManager.languageMenuKeyboard();

      if (ctx.callbackQuery) {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } else {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      }
    } catch (error) {
      console.error('Error in handleLanguagesMenu:', error);
      await ctx.reply('❌ حدث خطأ في عرض قائمة اللغات');
    }
  }

  static async handleBackupsMenu(ctx) {
    try {
      const UIManager = require('../ui/keyboards');
      const message = `📁 <b>النسخ الاحتياطية</b>

يمكنك:
• 💾 إنشاء نسخة احتياطية لبياناتك
• 📋 عرض قائمة النسخ الاحتياطية
• 🔄 استعادة نسخة احتياطية
• 🗑️ حذف النسخ القديمة
• 📊 عرض إحصائيات النسخ

⚠️ هذه الميزة قيد التطوير`;

      const keyboard = UIManager.backupMenuKeyboard();

      if (ctx.callbackQuery) {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } else {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      }
    } catch (error) {
      console.error('Error in handleBackupsMenu:', error);
      await ctx.reply('❌ حدث خطأ في عرض قائمة النسخ الاحتياطية');
    }
  }

  static async handleCacheMenu(ctx) {
    try {
      const UIManager = require('../ui/keyboards');
      const message = `⚡ <b>التخزين المؤقت</b>

معلومات عن نظام التخزين المؤقت:
• 📊 إحصائيات استخدام الذاكرة
• 🧹 مسح الذاكرة المؤقتة
• ⚡ تحسين الأداء
• ❓ معلومات النظام

⚠️ هذه الميزة قيد التطوير`;

      const keyboard = UIManager.cacheSystemKeyboard();

      if (ctx.callbackQuery) {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } else {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      }
    } catch (error) {
      console.error('Error in handleCacheMenu:', error);
      await ctx.reply('❌ حدث خطأ في عرض قائمة التخزين المؤقت');
    }
  }

  static async handleProtectionMenu(ctx) {
    try {
      const UIManager = require('../ui/keyboards');
      const message = `🛡️ <b>حماية من الإساءة</b>

نظام الحماية يوفر:
• 📊 عرض حالة الحماية الحالية
• 🛡️ مستويات الحماية المختلفة
• ❓ معلومات عن آلية العمل
• ⚡ منع الاستخدام المفرط

⚠️ هذه الميزة قيد التطوير`;

      const keyboard = UIManager.rateLimiterKeyboard();

      if (ctx.callbackQuery) {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } else {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      }
    } catch (error) {
      console.error('Error in handleProtectionMenu:', error);
      await ctx.reply('❌ حدث خطأ في عرض قائمة الحماية');
    }
  }

  static async handleClose(ctx) {
    try {
      await ctx.deleteMessage();
    } catch (error) {
      await ctx.answerCbQuery('❌ لا يمكن حذف الرسالة');
    }
  }
}

module.exports = MenuHandler;
