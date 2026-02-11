const Markup = require('telegraf/markup');
const ContentProvider = require('../content/contentProvider');
const UIManager = require('../ui/keyboards');
const Formatter = require('../ui/formatter');

class ContentHandler {
  // Handle Baqfat (bio suggestions)
  static async handleBaqfat(ctx) {
    const bio = await ContentProvider.getBioSuggestions();
    const message = `🎭 **السيرة المقترحة:**\n\n"${bio}"`;

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback('🔄 أخرى', 'menu:baqfat')],
      [Markup.button.callback('⬅️ رجوع', 'menu:main')]
    ]);

    await ctx.editMessageText(message, buttons);
  }

  // Handle Avatars
  static async handleAvatars(ctx) {
    const avatar = await ContentProvider.getAvatars();
    const message = `🎨 **الصورة المقترحة:**\n\n${avatar.emoji} ${avatar.name}`;

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback('🔄 أخرى', 'menu:avatars')],
      [Markup.button.callback('⬅️ رجوع', 'menu:main')]
    ]);

    await ctx.editMessageText(message, buttons);
  }

  // Handle Tweets
  static async handleTweets(ctx) {
    const tweet = await ContentProvider.getTweets();
    const message = `✨ **تريد عشوائي:**\n\n"${tweet}"`;

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback('🔄 آخر', 'menu:tweets')],
      [Markup.button.callback('⬅️ رجوع', 'menu:main')]
    ]);

    await ctx.editMessageText(message, buttons);
  }

  // Handle Books
  static async handleBooks(ctx) {
    const book = await ContentProvider.getBooks();
    const message = `📚 **كتاب موصى به:**\n\n${book.emoji} ${book.title}\n✍️ ${book.author}`;

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback('📖 آخر', 'menu:books')],
      [Markup.button.callback('⬅️ رجوع', 'menu:main')]
    ]);

    await ctx.editMessageText(message, buttons);
  }

  // Handle Stories
  static async handleStories(ctx) {
    const story = await ContentProvider.getStories();
    const message = `📖 **${story.title}**\n\n${story.content}`;

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback('📖 قصة أخرى', 'menu:stories')],
      [Markup.button.callback('⬅️ رجوع', 'menu:main')]
    ]);

    await ctx.editMessageText(message, buttons);
  }

  // Handle Movies
  static async handleMovies(ctx) {
    const movie = await ContentProvider.getMovies();
    const message = `🎬 **${movie.emoji} ${movie.title}**\n\n${movie.genre} | ⭐${movie.rating}`;

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback('🎬 آخر', 'menu:movies')],
      [Markup.button.callback('⬅️ رجوع', 'menu:main')]
    ]);

    await ctx.editMessageText(message, buttons);
  }

  // Handle Wallpapers
  static async handleWallpapers(ctx) {
    const wallpaper = await ContentProvider.getWallpapers();
    const message = `🖼️ **${wallpaper.emoji} ${wallpaper.name}**`;

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback('🖼️ أخرى', 'menu:wallpapers')],
      [Markup.button.callback('⬅️ رجوع', 'menu:main')]
    ]);

    await ctx.editMessageText(message, buttons);
  }

  // Handle Headers
  static async handleHeaders(ctx) {
    const header = await ContentProvider.getHeaders();
    const message = `🎬 **رأس الملف:**\n\n"${header}"`;

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback('🎬 آخر', 'menu:headers')],
      [Markup.button.callback('⬅️ رجوع', 'menu:main')]
    ]);

    await ctx.editMessageText(message, buttons);
  }

  // Handle Songs
  static async handleSongs(ctx) {
    const song = await ContentProvider.getSongs();
    const message = `🎵 **${song.emoji}**\n\n${song.title}\n🎤 ${song.artist}`;

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback('🎵 أخرى', 'menu:songs')],
      [Markup.button.callback('⬅️ رجوع', 'menu:main')]
    ]);

    await ctx.editMessageText(message, buttons);
  }

  // Handle Quranic Verses - مع القراءات الصوتية
  static async handleQuran(ctx) {
    try {
      const QuranProvider = require('../content/quranProvider');
      const verse = await QuranProvider.getRandomVerse();

      const message = `🕌 **${verse.surah} - الآية ${verse.ayah}**\n\n` +
        `📖 \`${verse.text}\`\n\n` +
        `💬 ${verse.content}\n\n` +
        `🌐 ${verse.translation}\n\n` +
        `📚 **التفسير:** ${verse.tafsir}\n\n` +
        `🎤 **القارئ:** ${verse.reciter}\n` +
        `⏱️ **المدة:** ${verse.duration}\n\n` +
        `🔗 [استمع للآية](${verse.audioUrl})`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.url('🎙️ استمع', verse.audioUrl)],
        [Markup.button.callback('📖 آية أخرى', 'menu:quran')],
        [Markup.button.callback('⬅️ رجوع', 'menu:main')]
      ]);

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      console.error('Error handling Quran:', error);
      await ctx.reply('❌ حدث خطأ في تحميل الآية');
    }
  }

  // Handle Quran Stats
  static async handleQuranStats(ctx) {
    try {
      const QuranProvider = require('../content/quranProvider');
      const stats = await QuranProvider.getQuranStats();

      const message = '📊 **احصائيات القرآن الكريم**\n\n' +
        `📕 **السور:** ${stats.totalSurahs}\n` +
        `📄 **الآيات:** ${stats.totalAyahs}\n` +
        `📝 **الكلمات:** ${stats.totalWords}\n` +
        `🔤 **الحروف:** ${stats.totalLetters}\n\n` +
        '⏱️ **أوقات القراءة:**\n' +
        `• اليومي: ${stats.dailyReading}\n` +
        `• الأسبوعي: ${stats.weeklyGoal}\n` +
        `• السنوي: ${stats.yearlyGoal}\n` +
        `• الكامل: ${stats.timeToComplete}`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('📖 آية عشوائية', 'menu:quran')],
        [Markup.button.callback('⬅️ رجوع', 'menu:main')]
      ]);

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      console.error('Error handling Quran stats:', error);
      await ctx.reply('❌ حدث خطأ في تحميل الإحصائيات');
    }
  }

  // Handle Morning Athkar - أذكار الصباح
  static async handleMorningAdhkar(ctx) {
    try {
      const AdhkarProvider = require('../content/adhkarProvider');
      const morningAdhkar = await AdhkarProvider.getMorningAdhkar();
      const verse = morningAdhkar[Math.floor(Math.random() * morningAdhkar.length)];

      const message = `🌅 **أذكار الصباح - ${verse.title}**\n\n` +
        `\`\`\`\n${verse.text}\n\`\`\`\n\n` +
        `📖 ${verse.content}\n\n` +
        `✅ **عدد المرات:** ${verse.count}\n` +
        `💡 **الفائدة:** ${verse.benefits}\n` +
        `📚 **المصدر:** ${verse.source}`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🌅 ذكر صباحي آخر', 'adhkar:morning')],
        [
          Markup.button.callback('🌙 أذكار المساء', 'adhkar:evening'),
          Markup.button.callback('😴 أذكار النوم', 'adhkar:sleep')
        ],
        [
          Markup.button.callback('❤️ حفظ', 'adhkar:save'),
          Markup.button.callback('⬅️ رجوع', 'menu:main')
        ]
      ]);

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      console.error('Error handling morning adhkar:', error);
      await ctx.reply('❌ حدث خطأ في تحميل الأذكار');
    }
  }

  // Handle Evening Athkar - أذكار المساء
  static async handleEveningAdhkar(ctx) {
    try {
      const AdhkarProvider = require('../content/adhkarProvider');
      const eveningAdhkar = await AdhkarProvider.getEveningAdhkar();
      const verse = eveningAdhkar[Math.floor(Math.random() * eveningAdhkar.length)];

      const message = `🌙 **أذكار المساء - ${verse.title}**\n\n` +
        `\`\`\`\n${verse.text}\n\`\`\`\n\n` +
        `📖 ${verse.content}\n\n` +
        `✅ **عدد المرات:** ${verse.count}\n` +
        `💡 **الفائدة:** ${verse.benefits}\n` +
        `📚 **المصدر:** ${verse.source}`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🌙 ذكر مسائي آخر', 'adhkar:evening')],
        [
          Markup.button.callback('🌅 أذكار الصباح', 'adhkar:morning'),
          Markup.button.callback('😴 أذكار النوم', 'adhkar:sleep')
        ],
        [
          Markup.button.callback('❤️ حفظ', 'adhkar:save'),
          Markup.button.callback('⬅️ رجوع', 'menu:main')
        ]
      ]);

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      console.error('Error handling evening adhkar:', error);
      await ctx.reply('❌ حدث خطأ في تحميل الأذكار');
    }
  }

  // Handle Sleep Athkar - أذكار النوم
  static async handleSleepAdhkar(ctx) {
    try {
      const AdhkarProvider = require('../content/adhkarProvider');
      const sleepAdhkar = await AdhkarProvider.getSleepAdhkar();
      const verse = sleepAdhkar[Math.floor(Math.random() * sleepAdhkar.length)];

      const message = `😴 **أذكار النوم - ${verse.title}**\n\n` +
        `\`\`\`\n${verse.text}\n\`\`\`\n\n` +
        `📖 ${verse.content}\n\n` +
        `✅ **عدد المرات:** ${verse.count}\n` +
        `💡 **الفائدة:** ${verse.benefits}\n` +
        `📚 **المصدر:** ${verse.source}`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('😴 ذكر نوم آخر', 'adhkar:sleep')],
        [
          Markup.button.callback('🌅 أذكار الصباح', 'adhkar:morning'),
          Markup.button.callback('🌙 أذكار المساء', 'adhkar:evening')
        ],
        [
          Markup.button.callback('❤️ حفظ', 'adhkar:save'),
          Markup.button.callback('⬅️ رجوع', 'menu:main')
        ]
      ]);

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      console.error('Error handling sleep adhkar:', error);
      await ctx.reply('❌ حدث خطأ في تحميل الأذكار');
    }
  }

  // Handle Adhkar Statistics - إحصائيات الأذكار
  static async handleAdhkarStats(ctx) {
    try {
      const AdhkarProvider = require('../content/adhkarProvider');
      const stats = await AdhkarProvider.getAdhkarStats();

      const message = '📊 **إحصائيات الأذكار**\n\n' +
        `📿 **إجمالي الأذكار:** ${stats.totalAdhkar}\n` +
        `🌅 **أذكار الصباح:** ${stats.morningAdhkar}\n` +
        `🌙 **أذكار المساء:** ${stats.eveningAdhkar}\n` +
        `😴 **أذكار النوم:** ${stats.sleepAdhkar}\n\n` +
        `🔢 **إجمالي المرات:** ${stats.totalRepeats} مرة يومياً\n` +
        `⏱️ **الوقت المستغرق:** ${stats.estimatedTime}\n\n` +
        `💫 **الفوائد الروحية:** ${stats.spiritualBenefits}`;

      const buttons = Markup.inlineKeyboard([
        [
          Markup.button.callback('🌅 الصباح', 'adhkar:morning'),
          Markup.button.callback('🌙 المساء', 'adhkar:evening'),
          Markup.button.callback('😴 النوم', 'adhkar:sleep')
        ],
        [Markup.button.callback('⬅️ رجوع', 'menu:main')]
      ]);

      await ctx.editMessageText(message, buttons);
    } catch (error) {
      console.error('Error handling adhkar stats:', error);
      await ctx.reply('❌ حدث خطأ في تحميل الإحصائيات');
    }
  }

  // Handle Entertainment
  static async handleEntertainment(ctx) {
    const entertainment = await ContentProvider.getEntertainment();
    const message = `😂 **نكتة:**\n\n${entertainment}`;

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback('😂 أخرى', 'menu:entertainment')],
      [Markup.button.callback('⬅️ رجوع', 'menu:main')]
    ]);

    await ctx.editMessageText(message, buttons);
  }
}

module.exports = ContentHandler;
