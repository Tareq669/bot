const axios = require('axios');
const Markup = require('telegraf/markup');

class ChatGamesUtilityHandler {
  static xoGames = new Map();

  static cityAliases = {
    غزة: 'Gaza',
    غزه: 'Gaza',
    القدس: 'Jerusalem',
    جدة: 'Jeddah',
    مكة: 'Mecca',
    مكه: 'Mecca'
  };

  static weatherCodes = {
    0: 'صحو',
    1: 'غائم جزئيا',
    2: 'غائم',
    3: 'غائم جدا',
    45: 'ضباب',
    48: 'ضباب متجمد',
    51: 'رذاذ خفيف',
    53: 'رذاذ متوسط',
    55: 'رذاذ كثيف',
    56: 'رذاذ متجمد خفيف',
    57: 'رذاذ متجمد كثيف',
    61: 'مطر خفيف',
    63: 'مطر متوسط',
    65: 'مطر غزير',
    66: 'مطر متجمد خفيف',
    67: 'مطر متجمد غزير',
    71: 'ثلج خفيف',
    73: 'ثلج متوسط',
    75: 'ثلج كثيف',
    77: 'حبوب ثلج',
    80: 'زخات مطر خفيفة',
    81: 'زخات مطر متوسطة',
    82: 'زخات مطر غزيرة',
    85: 'زخات ثلج خفيفة',
    86: 'زخات ثلج غزيرة',
    95: 'عاصفة رعدية',
    96: 'عاصفة رعدية مع برد خفيف',
    99: 'عاصفة رعدية مع برد كثيف'
  };

  static cleanupXoGames() {
    const now = Date.now();
    for (const [id, game] of this.xoGames.entries()) {
      if (now - game.createdAt > 1000 * 60 * 60) {
        this.xoGames.delete(id);
      }
    }
  }

  static getXoWinner(board) {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[b] === board[c]) {
        return board[a];
      }
    }
    return null;
  }

  static buildXoKeyboard(game) {
    const rows = [];
    for (let r = 0; r < 3; r += 1) {
      const row = [];
      for (let c = 0; c < 3; c += 1) {
        const idx = r * 3 + c;
        const cell = game.board[idx];
        row.push(
          Markup.button.callback(
            cell || '▫️',
            `xo:move:${game.id}:${idx}`
          )
        );
      }
      rows.push(row);
    }
    return Markup.inlineKeyboard(rows);
  }

  static buildChallengeKeyboard(game) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ قبول التحدي', `xo:challenge:accept:${game.id}`),
        Markup.button.callback('❌ رفض', `xo:challenge:decline:${game.id}`)
      ]
    ]);
  }

  static renderXoText(game) {
    const p1 = game.player1Name || 'اللاعب 1';
    const p2 = game.player2Name || 'اللاعب 2';

    if (game.status === 'pending') {
      return (
        '❌⭕ تحدي XO\n\n' +
        `🎯 ${p1} تحدى ${p2}\n` +
        'بانتظار قبول التحدي...'
      );
    }

    if (game.status === 'declined') {
      return `❌⭕ تم رفض تحدي XO بين ${p1} و ${p2}.`;
    }

    if (game.status === 'done') {
      if (game.winnerUserId) {
        const winnerName = game.winnerUserId === game.player1Id ? p1 : p2;
        return `❌⭕ لعبة XO\n\n🏁 الفائز: ${winnerName}\n\nاكتب "اكس اوه" لبدء لعبة جديدة.`;
      }
      return '❌⭕ لعبة XO\n\n🤝 تعادل!\n\nاكتب "اكس اوه" لبدء لعبة جديدة.';
    }

    const turnName = game.currentUserId === game.player1Id ? p1 : p2;
    const turnSymbol = game.currentUserId === game.player1Id ? '❌' : '⭕';

    return (
      '❌⭕ لعبة XO\n\n' +
      `👤 ${p1} = ❌\n` +
      `👤 ${p2} = ⭕\n\n` +
      `🎯 الدور الآن: ${turnName} (${turnSymbol})`
    );
  }

  static async handleXoStart(ctx) {
    if (ctx.chat?.type === 'private') {
      return this.handleXoPrivateStart(ctx);
    }
    if (!['group', 'supergroup'].includes(ctx.chat?.type)) return;
    return this.handleXoGroupStart(ctx);
  }

  static async handleXoPrivateStart(ctx) {
    this.cleanupXoGames();
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const game = {
      id,
      createdAt: Date.now(),
      chatId: ctx.chat.id,
      status: 'active',
      player1Id: ctx.from.id,
      player2Id: 0,
      player1Name: ctx.from.first_name || 'أنت',
      player2Name: 'البوت',
      currentUserId: ctx.from.id,
      board: Array(9).fill(null),
      winnerUserId: null
    };
    this.xoGames.set(id, game);
    await ctx.reply(this.renderXoText(game), this.buildXoKeyboard(game));
  }

  static async handleXoGroupStart(ctx) {
    const target = ctx.message?.reply_to_message?.from;
    if (!target || target.is_bot) {
      await ctx.reply('ℹ️ لبدء XO في الجروب: اكتب "اكس اوه" بالرد على رسالة الشخص الذي تريد اللعب معه.');
      return;
    }
    if (target.id === ctx.from.id) {
      await ctx.reply('ℹ️ لا يمكنك بدء XO مع نفسك.');
      return;
    }

    this.cleanupXoGames();
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const game = {
      id,
      createdAt: Date.now(),
      chatId: ctx.chat.id,
      status: 'pending',
      challengerId: ctx.from.id,
      opponentId: target.id,
      player1Id: ctx.from.id,
      player2Id: target.id,
      player1Name: ctx.from.first_name || 'لاعب 1',
      player2Name: target.first_name || 'لاعب 2',
      currentUserId: null,
      board: Array(9).fill(null),
      winnerUserId: null
    };

    this.xoGames.set(id, game);
    const sent = await ctx.reply(
      this.renderXoText(game),
      this.buildChallengeKeyboard(game)
    );
    game.messageId = sent?.message_id || null;
  }

  static playBotMove(game) {
    const freeIndexes = [];
    for (let i = 0; i < game.board.length; i += 1) {
      if (!game.board[i]) freeIndexes.push(i);
    }
    if (freeIndexes.length === 0) return;
    const pick = freeIndexes[Math.floor(Math.random() * freeIndexes.length)];
    game.board[pick] = '⭕';
  }

  static async handleXoChallengeAction(ctx) {
    const action = String(ctx.match?.[1] || '').toLowerCase();
    const gameId = String(ctx.match?.[2] || '');
    const game = this.xoGames.get(gameId);

    if (!game) {
      await ctx.answerCbQuery('التحدي غير موجود أو انتهى', { show_alert: false }).catch(() => {});
      return;
    }
    if (game.chatId !== ctx.chat?.id) {
      await ctx.answerCbQuery('هذا التحدي ليس في هذه المحادثة', { show_alert: false }).catch(() => {});
      return;
    }
    if (game.status !== 'pending') {
      await ctx.answerCbQuery('تم التعامل مع هذا التحدي مسبقا', { show_alert: false }).catch(() => {});
      return;
    }

    const userId = ctx.from.id;
    const isOpponent = userId === game.opponentId;
    const isChallenger = userId === game.challengerId;

    if (!isOpponent && !isChallenger) {
      await ctx.answerCbQuery('هذا التحدي ليس لك', { show_alert: false }).catch(() => {});
      return;
    }

    if (action === 'decline') {
      if (!isOpponent && !isChallenger) {
        await ctx.answerCbQuery('لا يمكنك رفض هذا التحدي', { show_alert: false }).catch(() => {});
        return;
      }
      game.status = 'declined';
      await ctx.answerCbQuery('تم رفض التحدي', { show_alert: false }).catch(() => {});
      await ctx.editMessageText(this.renderXoText(game)).catch(() => {});
      this.xoGames.delete(gameId);
      return;
    }

    if (action !== 'accept') {
      await ctx.answerCbQuery('إجراء غير معروف', { show_alert: false }).catch(() => {});
      return;
    }

    if (!isOpponent) {
      await ctx.answerCbQuery('فقط الشخص المتحدَّى يمكنه قبول التحدي', { show_alert: false }).catch(() => {});
      return;
    }

    game.status = 'active';
    game.currentUserId = game.player1Id;

    await ctx.answerCbQuery('تم قبول التحدي', { show_alert: false }).catch(() => {});
    await ctx.editMessageText(this.renderXoText(game), this.buildXoKeyboard(game)).catch(() => {});
  }

  static async handleXoAction(ctx) {
    const gameId = String(ctx.match?.[1] || '');
    const index = Number(ctx.match?.[2]);
    const game = this.xoGames.get(gameId);

    if (!game) {
      await ctx.answerCbQuery('اللعبة غير موجودة أو انتهت', { show_alert: false }).catch(() => {});
      return;
    }
    if (game.chatId !== ctx.chat?.id) {
      await ctx.answerCbQuery('هذه اللعبة ليست في هذه المحادثة', { show_alert: false }).catch(() => {});
      return;
    }
    if (game.status !== 'active') {
      await ctx.answerCbQuery('اللعبة غير نشطة', { show_alert: false }).catch(() => {});
      return;
    }

    const userId = ctx.from.id;
    const isPlayer = userId === game.player1Id || userId === game.player2Id;
    if (!isPlayer) {
      await ctx.answerCbQuery('هذه اللعبة ليست لك', { show_alert: false }).catch(() => {});
      return;
    }
    if (userId !== game.currentUserId) {
      await ctx.answerCbQuery('ليس دورك الآن', { show_alert: false }).catch(() => {});
      return;
    }
    if (!Number.isInteger(index) || index < 0 || index > 8) {
      await ctx.answerCbQuery('اختيار غير صالح', { show_alert: false }).catch(() => {});
      return;
    }
    if (game.board[index]) {
      await ctx.answerCbQuery('الخانة محجوزة', { show_alert: false }).catch(() => {});
      return;
    }

    game.board[index] = userId === game.player1Id ? '❌' : '⭕';
    const winnerSymbol = this.getXoWinner(game.board);

    if (winnerSymbol) {
      game.status = 'done';
      game.winnerUserId = winnerSymbol === '❌' ? game.player1Id : game.player2Id;
    } else if (game.board.every(Boolean)) {
      game.status = 'done';
    } else {
      game.currentUserId = userId === game.player1Id ? game.player2Id : game.player1Id;

      // Private mode: player2 is bot (id=0), so it plays instantly.
      if (game.player2Id === 0 && game.currentUserId === 0) {
        this.playBotMove(game);
        const botWinner = this.getXoWinner(game.board);
        if (botWinner) {
          game.status = 'done';
          game.winnerUserId = botWinner === '❌' ? game.player1Id : game.player2Id;
        } else if (game.board.every(Boolean)) {
          game.status = 'done';
        } else {
          game.currentUserId = game.player1Id;
        }
      }
    }

    await ctx.answerCbQuery('تم', { show_alert: false }).catch(() => {});
    await ctx.editMessageText(this.renderXoText(game), this.buildXoKeyboard(game)).catch(() => {});

    if (game.status === 'done') {
      this.xoGames.delete(gameId);
    }
  }

  static async resolveCity(cityText) {
    const input = String(cityText || '').trim();
    const normalized = this.cityAliases[input] || input;

    const trySearch = async (name, language) => {
      const { data } = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
        params: {
          name,
          count: 1,
          language,
          format: 'json'
        },
        timeout: 12000
      });
      const r = data?.results?.[0];
      if (!r) return null;
      return {
        name: r.name,
        country: r.country,
        admin1: r.admin1,
        latitude: r.latitude,
        longitude: r.longitude,
        timezone: r.timezone
      };
    };

    return (await trySearch(input, 'ar')) || (await trySearch(normalized, 'en'));
  }

  static formatCityLabel(city) {
    const pieces = [city.name, city.admin1, city.country].filter(Boolean);
    return pieces.join(' - ');
  }

  static async handleWeatherText(ctx, cityText) {
    if (ctx.chat?.type !== 'private') {
      await ctx.reply('ℹ️ أمر الطقس مخصص للخاصة. استخدمه في الخاص مثل: طقس غزة');
      return;
    }

    try {
      const city = await this.resolveCity(cityText);
      if (!city) {
        await ctx.reply('❌ لم أتعرف على المدينة. جرب مثل: طقس غزة');
        return;
      }

      const { data } = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude: city.latitude,
          longitude: city.longitude,
          current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m',
          timezone: 'auto'
        },
        timeout: 12000
      });

      const current = data?.current || {};
      const weatherText = this.weatherCodes[current.weather_code] || 'غير محدد';
      const message =
        `🌤️ الطقس الآن في ${this.formatCityLabel(city)}\n\n` +
        `🌡️ الحرارة: ${current.temperature_2m ?? '-'}°C\n` +
        `🤗 المحسوسة: ${current.apparent_temperature ?? '-'}°C\n` +
        `💧 الرطوبة: ${current.relative_humidity_2m ?? '-'}%\n` +
        `🌬️ الرياح: ${current.wind_speed_10m ?? '-'} كم/س\n` +
        `☁️ الحالة: ${weatherText}`;

      await ctx.reply(message);
    } catch (_error) {
      await ctx.reply('❌ تعذر جلب بيانات الطقس حاليا. حاول لاحقا.');
    }
  }

  static async handleAdhanText(ctx, cityText) {
    if (ctx.chat?.type !== 'private') {
      await ctx.reply('ℹ️ أمر الأذان مخصص للخاصة. استخدمه في الخاص مثل: اذان غزة');
      return;
    }

    try {
      const city = await this.resolveCity(cityText);
      if (!city) {
        await ctx.reply('❌ لم أتعرف على المدينة. جرب مثل: اذان غزة');
        return;
      }

      const { data } = await axios.get('https://api.aladhan.com/v1/timings', {
        params: {
          latitude: city.latitude,
          longitude: city.longitude,
          method: 4,
          school: 1
        },
        timeout: 12000
      });

      const t = data?.data?.timings || {};
      const date = data?.data?.date?.readable || '';
      const message =
        `🕌 مواقيت الأذان في ${this.formatCityLabel(city)}\n` +
        `${date ? `📅 ${date}\n\n` : '\n'}` +
        `الفجر: ${t.Fajr || '-'}\n` +
        `الظهر: ${t.Dhuhr || '-'}\n` +
        `العصر: ${t.Asr || '-'}\n` +
        `المغرب: ${t.Maghrib || '-'}\n` +
        `العشاء: ${t.Isha || '-'}`;

      await ctx.reply(message);
    } catch (_error) {
      await ctx.reply('❌ تعذر جلب مواقيت الأذان حاليا. حاول لاحقا.');
    }
  }
}

module.exports = ChatGamesUtilityHandler;
