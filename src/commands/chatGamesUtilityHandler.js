const axios = require('axios');
const Markup = require('telegraf/markup');
const { User } = require('../database/models');

class ChatGamesUtilityHandler {
  static xoGames = new Map();

  static cityAliases = {
    '\u063A\u0632\u0629': 'Gaza',
    '\u063A\u0632\u0647': 'Gaza',
    '\u0627\u0644\u0642\u062F\u0633': 'Jerusalem',
    '\u062C\u062F\u0629': 'Jeddah',
    '\u0645\u0643\u0629': 'Mecca',
    '\u0645\u0643\u0647': 'Mecca'
  };

  static weatherCodes = {
    0: 'ØµØ­Ùˆ',
    1: 'ØºØ§Ø¦Ù… Ø¬Ø²Ø¦ÙŠØ§',
    2: 'ØºØ§Ø¦Ù…',
    3: 'ØºØ§Ø¦Ù… Ø¬Ø¯Ø§',
    45: 'Ø¶Ø¨Ø§Ø¨',
    48: 'Ø¶Ø¨Ø§Ø¨ Ù…ØªØ¬Ù…Ø¯',
    51: 'Ø±Ø°Ø§Ø° Ø®ÙÙŠÙ',
    53: 'Ø±Ø°Ø§Ø° Ù…ØªÙˆØ³Ø·',
    55: 'Ø±Ø°Ø§Ø° ÙƒØ«ÙŠÙ',
    56: 'Ø±Ø°Ø§Ø° Ù…ØªØ¬Ù…Ø¯ Ø®ÙÙŠÙ',
    57: 'Ø±Ø°Ø§Ø° Ù…ØªØ¬Ù…Ø¯ ÙƒØ«ÙŠÙ',
    61: 'Ù…Ø·Ø± Ø®ÙÙŠÙ',
    63: 'Ù…Ø·Ø± Ù…ØªÙˆØ³Ø·',
    65: 'Ù…Ø·Ø± ØºØ²ÙŠØ±',
    66: 'Ù…Ø·Ø± Ù…ØªØ¬Ù…Ø¯ Ø®ÙÙŠÙ',
    67: 'Ù…Ø·Ø± Ù…ØªØ¬Ù…Ø¯ ØºØ²ÙŠØ±',
    71: 'Ø«Ù„Ø¬ Ø®ÙÙŠÙ',
    73: 'Ø«Ù„Ø¬ Ù…ØªÙˆØ³Ø·',
    75: 'Ø«Ù„Ø¬ ÙƒØ«ÙŠÙ',
    77: 'Ø­Ø¨ÙˆØ¨ Ø«Ù„Ø¬',
    80: 'Ø²Ø®Ø§Øª Ù…Ø·Ø± Ø®ÙÙŠÙØ©',
    81: 'Ø²Ø®Ø§Øª Ù…Ø·Ø± Ù…ØªÙˆØ³Ø·Ø©',
    82: 'Ø²Ø®Ø§Øª Ù…Ø·Ø± ØºØ²ÙŠØ±Ø©',
    85: 'Ø²Ø®Ø§Øª Ø«Ù„Ø¬ Ø®ÙÙŠÙØ©',
    86: 'Ø²Ø®Ø§Øª Ø«Ù„Ø¬ ØºØ²ÙŠØ±Ø©',
    95: 'Ø¹Ø§ØµÙØ© Ø±Ø¹Ø¯ÙŠØ©',
    96: 'Ø¹Ø§ØµÙØ© Ø±Ø¹Ø¯ÙŠØ© Ù…Ø¹ Ø¨Ø±Ø¯ Ø®ÙÙŠÙ',
    99: 'Ø¹Ø§ØµÙØ© Ø±Ø¹Ø¯ÙŠØ© Ù…Ø¹ Ø¨Ø±Ø¯ ÙƒØ«ÙŠÙ'
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
            cell || 'â–«ï¸',
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
        Markup.button.callback('âœ… Ù‚Ø¨ÙˆÙ„ Ø§Ù„ØªØ­Ø¯ÙŠ', `xo:challenge:accept:${game.id}`),
        Markup.button.callback('âŒ Ø±ÙØ¶', `xo:challenge:decline:${game.id}`)
      ]
    ]);
  }

  static renderXoText(game) {
    const p1 = game.player1Name || 'Ø§Ù„Ù„Ø§Ø¹Ø¨ 1';
    const p2 = game.player2Name || 'Ø§Ù„Ù„Ø§Ø¹Ø¨ 2';

    if (game.status === 'pending') {
      return (
        'âŒâ­• ØªØ­Ø¯ÙŠ XO\n\n' +
        `ðŸŽ¯ ${p1} ØªØ­Ø¯Ù‰ ${p2}\n` +
        'Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ù‚Ø¨ÙˆÙ„ Ø§Ù„ØªØ­Ø¯ÙŠ...'
      );
    }

    if (game.status === 'declined') {
      return `âŒâ­• ØªÙ… Ø±ÙØ¶ ØªØ­Ø¯ÙŠ XO Ø¨ÙŠÙ† ${p1} Ùˆ ${p2}.`;
    }

    if (game.status === 'done') {
      if (game.winnerUserId) {
        const winnerName = game.winnerUserId === game.player1Id ? p1 : p2;
        return `âŒâ­• Ù„Ø¹Ø¨Ø© XO\n\nðŸ Ø§Ù„ÙØ§Ø¦Ø²: ${winnerName}\n\nØ§ÙƒØªØ¨ "Ø§ÙƒØ³ Ø§ÙˆÙ‡" Ù„Ø¨Ø¯Ø¡ Ù„Ø¹Ø¨Ø© Ø¬Ø¯ÙŠØ¯Ø©.`;
      }
      return 'âŒâ­• Ù„Ø¹Ø¨Ø© XO\n\nðŸ¤ ØªØ¹Ø§Ø¯Ù„!\n\nØ§ÙƒØªØ¨ "Ø§ÙƒØ³ Ø§ÙˆÙ‡" Ù„Ø¨Ø¯Ø¡ Ù„Ø¹Ø¨Ø© Ø¬Ø¯ÙŠØ¯Ø©.';
    }

    const turnName = game.currentUserId === game.player1Id ? p1 : p2;
    const turnSymbol = game.currentUserId === game.player1Id ? 'âŒ' : 'â­•';

    return (
      'âŒâ­• Ù„Ø¹Ø¨Ø© XO\n\n' +
      `ðŸ‘¤ ${p1} = âŒ\n` +
      `ðŸ‘¤ ${p2} = â­•\n\n` +
      `ðŸŽ¯ Ø§Ù„Ø¯ÙˆØ± Ø§Ù„Ø¢Ù†: ${turnName} (${turnSymbol})`
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
      player1Name: ctx.from.first_name || 'Ø£Ù†Øª',
      player2Name: 'Ø§Ù„Ø¨ÙˆØª',
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
      await ctx.reply('â„¹ï¸ Ù„Ø¨Ø¯Ø¡ XO ÙÙŠ Ø§Ù„Ø¬Ø±ÙˆØ¨: Ø§ÙƒØªØ¨ "Ø§ÙƒØ³ Ø§ÙˆÙ‡" Ø¨Ø§Ù„Ø±Ø¯ Ø¹Ù„Ù‰ Ø±Ø³Ø§Ù„Ø© Ø§Ù„Ø´Ø®Øµ Ø§Ù„Ø°ÙŠ ØªØ±ÙŠØ¯ Ø§Ù„Ù„Ø¹Ø¨ Ù…Ø¹Ù‡.');
      return;
    }
    if (target.id === ctx.from.id) {
      await ctx.reply('â„¹ï¸ Ù„Ø§ ÙŠÙ…ÙƒÙ†Ùƒ Ø¨Ø¯Ø¡ XO Ù…Ø¹ Ù†ÙØ³Ùƒ.');
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
      player1Name: ctx.from.first_name || 'Ù„Ø§Ø¹Ø¨ 1',
      player2Name: target.first_name || 'Ù„Ø§Ø¹Ø¨ 2',
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
    game.board[pick] = 'â­•';
  }

  static async handleXoChallengeAction(ctx) {
    const action = String(ctx.match?.[1] || '').toLowerCase();
    const gameId = String(ctx.match?.[2] || '');
    const game = this.xoGames.get(gameId);

    if (!game) {
      await ctx.answerCbQuery('Ø§Ù„ØªØ­Ø¯ÙŠ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯ Ø£Ùˆ Ø§Ù†ØªÙ‡Ù‰', { show_alert: false }).catch(() => {});
      return;
    }
    if (game.chatId !== ctx.chat?.id) {
      await ctx.answerCbQuery('Ù‡Ø°Ø§ Ø§Ù„ØªØ­Ø¯ÙŠ Ù„ÙŠØ³ ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø©', { show_alert: false }).catch(() => {});
      return;
    }
    if (game.status !== 'pending') {
      await ctx.answerCbQuery('ØªÙ… Ø§Ù„ØªØ¹Ø§Ù…Ù„ Ù…Ø¹ Ù‡Ø°Ø§ Ø§Ù„ØªØ­Ø¯ÙŠ Ù…Ø³Ø¨Ù‚Ø§', { show_alert: false }).catch(() => {});
      return;
    }

    const userId = ctx.from.id;
    const isOpponent = userId === game.opponentId;
    const isChallenger = userId === game.challengerId;

    if (!isOpponent && !isChallenger) {
      await ctx.answerCbQuery('Ù‡Ø°Ø§ Ø§Ù„ØªØ­Ø¯ÙŠ Ù„ÙŠØ³ Ù„Ùƒ', { show_alert: false }).catch(() => {});
      return;
    }

    if (action === 'decline') {
      if (!isOpponent && !isChallenger) {
        await ctx.answerCbQuery('Ù„Ø§ ÙŠÙ…ÙƒÙ†Ùƒ Ø±ÙØ¶ Ù‡Ø°Ø§ Ø§Ù„ØªØ­Ø¯ÙŠ', { show_alert: false }).catch(() => {});
        return;
      }
      game.status = 'declined';
      await ctx.answerCbQuery('ØªÙ… Ø±ÙØ¶ Ø§Ù„ØªØ­Ø¯ÙŠ', { show_alert: false }).catch(() => {});
      await ctx.editMessageText(this.renderXoText(game)).catch(() => {});
      this.xoGames.delete(gameId);
      return;
    }

    if (action !== 'accept') {
      await ctx.answerCbQuery('Ø¥Ø¬Ø±Ø§Ø¡ ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ', { show_alert: false }).catch(() => {});
      return;
    }

    if (!isOpponent) {
      await ctx.answerCbQuery('ÙÙ‚Ø· Ø§Ù„Ø´Ø®Øµ Ø§Ù„Ù…ØªØ­Ø¯Ù‘ÙŽÙ‰ ÙŠÙ…ÙƒÙ†Ù‡ Ù‚Ø¨ÙˆÙ„ Ø§Ù„ØªØ­Ø¯ÙŠ', { show_alert: false }).catch(() => {});
      return;
    }

    game.status = 'active';
    game.currentUserId = game.player1Id;

    await ctx.answerCbQuery('ØªÙ… Ù‚Ø¨ÙˆÙ„ Ø§Ù„ØªØ­Ø¯ÙŠ', { show_alert: false }).catch(() => {});
    await ctx.editMessageText(this.renderXoText(game), this.buildXoKeyboard(game)).catch(() => {});
  }

  static async handleXoAction(ctx) {
    const gameId = String(ctx.match?.[1] || '');
    const index = Number(ctx.match?.[2]);
    const game = this.xoGames.get(gameId);

    if (!game) {
      await ctx.answerCbQuery('Ø§Ù„Ù„Ø¹Ø¨Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø© Ø£Ùˆ Ø§Ù†ØªÙ‡Øª', { show_alert: false }).catch(() => {});
      return;
    }
    if (game.chatId !== ctx.chat?.id) {
      await ctx.answerCbQuery('Ù‡Ø°Ù‡ Ø§Ù„Ù„Ø¹Ø¨Ø© Ù„ÙŠØ³Øª ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø©', { show_alert: false }).catch(() => {});
      return;
    }
    if (game.status !== 'active') {
      await ctx.answerCbQuery('Ø§Ù„Ù„Ø¹Ø¨Ø© ØºÙŠØ± Ù†Ø´Ø·Ø©', { show_alert: false }).catch(() => {});
      return;
    }

    const userId = ctx.from.id;
    const isPlayer = userId === game.player1Id || userId === game.player2Id;
    if (!isPlayer) {
      await ctx.answerCbQuery('Ù‡Ø°Ù‡ Ø§Ù„Ù„Ø¹Ø¨Ø© Ù„ÙŠØ³Øª Ù„Ùƒ', { show_alert: false }).catch(() => {});
      return;
    }
    if (userId !== game.currentUserId) {
      await ctx.answerCbQuery('Ù„ÙŠØ³ Ø¯ÙˆØ±Ùƒ Ø§Ù„Ø¢Ù†', { show_alert: false }).catch(() => {});
      return;
    }
    if (!Number.isInteger(index) || index < 0 || index > 8) {
      await ctx.answerCbQuery('Ø§Ø®ØªÙŠØ§Ø± ØºÙŠØ± ØµØ§Ù„Ø­', { show_alert: false }).catch(() => {});
      return;
    }
    if (game.board[index]) {
      await ctx.answerCbQuery('Ø§Ù„Ø®Ø§Ù†Ø© Ù…Ø­Ø¬ÙˆØ²Ø©', { show_alert: false }).catch(() => {});
      return;
    }

    game.board[index] = userId === game.player1Id ? 'âŒ' : 'â­•';
    const winnerSymbol = this.getXoWinner(game.board);

    if (winnerSymbol) {
      game.status = 'done';
      game.winnerUserId = winnerSymbol === 'âŒ' ? game.player1Id : game.player2Id;
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
          game.winnerUserId = botWinner === 'âŒ' ? game.player1Id : game.player2Id;
        } else if (game.board.every(Boolean)) {
          game.status = 'done';
        } else {
          game.currentUserId = game.player1Id;
        }
      }
    }

    await ctx.answerCbQuery('ØªÙ…', { show_alert: false }).catch(() => {});
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

  static extractLocationFromCtx(ctx) {
    return (
      ctx.message?.location ||
      ctx.message?.reply_to_message?.location ||
      ctx.callbackQuery?.message?.reply_to_message?.location ||
      null
    );
  }

  static async reverseGeocode(latitude, longitude) {
    try {
      const { data } = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'jsonv2',
          'accept-language': 'ar,en'
        },
        timeout: 12000,
        headers: {
          'User-Agent': 'ArabTelegramBot/1.0 (weather reverse geocode)'
        }
      });

      const address = data?.address || {};
      const cityName =
        address.city ||
        address.town ||
        address.village ||
        address.county ||
        address.state ||
        data?.name ||
        null;

      return {
        cityName,
        displayName: data?.display_name || cityName || 'Ù…ÙˆÙ‚Ø¹Ùƒ Ø§Ù„Ø­Ø§Ù„ÙŠ'
      };
    } catch (_error) {
      return {
        cityName: null,
        displayName: 'Ù…ÙˆÙ‚Ø¹Ùƒ Ø§Ù„Ø­Ø§Ù„ÙŠ'
      };
    }
  }

  static async saveUserWeatherLocation(userId, locationInfo) {
    if (!userId || !locationInfo) return;
    const update = {
      $set: {
        'preferences.weatherLocation.latitude': locationInfo.latitude,
        'preferences.weatherLocation.longitude': locationInfo.longitude,
        'preferences.weatherLocation.city': locationInfo.city || '',
        'preferences.weatherLocation.displayName': locationInfo.displayName || '',
        'preferences.weatherLocation.updatedAt': new Date()
      }
    };
    await User.findOneAndUpdate({ userId }, update, { upsert: false }).catch(() => {});
  }

  static async getUserWeatherLocation(userId) {
    if (!userId) return null;
    const user = await User.findOne({ userId }).lean().catch(() => null);
    const loc = user?.preferences?.weatherLocation;
    if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return null;
    return loc;
  }

  static async fetchWeatherByCoordinates(latitude, longitude) {
    const { data } = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude,
        longitude,
        current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m',
        timezone: 'auto'
      },
      timeout: 12000
    });
    return data?.current || {};
  }

  static getWeatherText(code) {
    const map = {
      0: '\u0635\u062D\u0648',
      1: '\u063A\u0627\u0626\u0645 \u062C\u0632\u0626\u064A\u0627',
      2: '\u063A\u0627\u0626\u0645',
      3: '\u063A\u0627\u0626\u0645 \u062C\u062F\u0627',
      45: '\u0636\u0628\u0627\u0628',
      48: '\u0636\u0628\u0627\u0628 \u0645\u062A\u062C\u0645\u062F',
      61: '\u0645\u0637\u0631 \u062E\u0641\u064A\u0641',
      63: '\u0645\u0637\u0631 \u0645\u062A\u0648\u0633\u0637',
      65: '\u0645\u0637\u0631 \u063A\u0632\u064A\u0631',
      71: '\u062B\u0644\u062C \u062E\u0641\u064A\u0641',
      73: '\u062B\u0644\u062C \u0645\u062A\u0648\u0633\u0637',
      75: '\u062B\u0644\u062C \u0643\u062B\u064A\u0641',
      80: '\u0632\u062E\u0627\u062A \u0645\u0637\u0631',
      95: '\u0639\u0627\u0635\u0641\u0629 \u0631\u0639\u062F\u064A\u0629'
    };
    return map[code] || '\u063A\u064A\u0631 \u0645\u062D\u062F\u062F';
  }

  static formatWeatherMessage(locationLabel, current) {
    const weatherText = this.getWeatherText(current.weather_code);
    return (
      `\u{1F324}\uFE0F \u0627\u0644\u0637\u0642\u0633 \u0627\u0644\u0622\u0646 \u0641\u064A ${locationLabel}\n\n` +
      `\u{1F321}\uFE0F \u0627\u0644\u062D\u0631\u0627\u0631\u0629: ${current.temperature_2m ?? '-'}\u00B0C\n` +
      `\u{1F976} \u0627\u0644\u0645\u062D\u0633\u0648\u0633\u0629: ${current.apparent_temperature ?? '-'}\u00B0C\n` +
      `\u{1F4A7} \u0627\u0644\u0631\u0637\u0648\u0628\u0629: ${current.relative_humidity_2m ?? '-'}%\n` +
      `\u{1F32C}\uFE0F \u0627\u0644\u0631\u064A\u0627\u062D: ${current.wind_speed_10m ?? '-'} \u0643\u0645/\u0633\n` +
      `\u2601\uFE0F \u0627\u0644\u062D\u0627\u0644\u0629: ${weatherText}`
    );
  }

  static async fetchAdhanByCoordinates(latitude, longitude) {
    const { data } = await axios.get('https://api.aladhan.com/v1/timings', {
      params: {
        latitude,
        longitude,
        method: 4,
        school: 1
      },
      timeout: 12000
    });
    return {
      timings: data?.data?.timings || {},
      date: data?.data?.date?.readable || ''
    };
  }

  static formatAdhanMessage(locationLabel, adhanData) {
    const t = adhanData?.timings || {};
    const dateLine = adhanData?.date ? `\u{1F4C5} ${adhanData.date}\n\n` : '\n';
    return (
      `\u{1F54C} \u0645\u0648\u0627\u0642\u064A\u062A \u0627\u0644\u0623\u0630\u0627\u0646 \u0641\u064A ${locationLabel}\n` +
      dateLine +
      `\u0627\u0644\u0641\u062C\u0631: ${t.Fajr || '-'}\n` +
      `\u0627\u0644\u0638\u0647\u0631: ${t.Dhuhr || '-'}\n` +
      `\u0627\u0644\u0639\u0635\u0631: ${t.Asr || '-'}\n` +
      `\u0627\u0644\u0645\u063A\u0631\u0628: ${t.Maghrib || '-'}\n` +
      `\u0627\u0644\u0639\u0634\u0627\u0621: ${t.Isha || '-'}`
    );
  }

  static async handleLocationMessage(ctx) {
    const location = this.extractLocationFromCtx(ctx);
    if (!location) return false;

    try {
      const latitude = Number(location.latitude);
      const longitude = Number(location.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;

      const reverse = await this.reverseGeocode(latitude, longitude);
      await this.saveUserWeatherLocation(ctx.from?.id, {
        latitude,
        longitude,
        city: reverse.cityName || '',
        displayName: reverse.displayName || '\u0645\u0648\u0642\u0639\u0643 \u0627\u0644\u062D\u0627\u0644\u064A'
      });

      const intent = String(ctx.session?.utilityIntent || 'weather').toLowerCase();
      if (intent === 'adhan') {
        const adhanData = await this.fetchAdhanByCoordinates(latitude, longitude);
        await ctx.reply(this.formatAdhanMessage(reverse.displayName || '\u0645\u0648\u0642\u0639\u0643 \u0627\u0644\u062D\u0627\u0644\u064A', adhanData));
      } else {
        const current = await this.fetchWeatherByCoordinates(latitude, longitude);
        await ctx.reply(this.formatWeatherMessage(reverse.displayName || '\u0645\u0648\u0642\u0639\u0643 \u0627\u0644\u062D\u0627\u0644\u064A', current));
      }
      return true;
    } catch (_error) {
      await ctx.reply('\u274C \u062A\u0639\u0630\u0631 \u0642\u0631\u0627\u0621\u0629 \u0645\u0648\u0642\u0639\u0643 \u0627\u0644\u0622\u0646. \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.');
      return true;
    }
  }

  static async handleWeatherText(ctx, cityText) {
    try {
      ctx.session = ctx.session || {};
      ctx.session.utilityIntent = 'weather';
      const cityInput = String(cityText || '').trim();

      if (cityInput) {
        const city = await this.resolveCity(cityInput);
        if (!city) {
          await ctx.reply('\u274C \u0644\u0645 \u0623\u062A\u0639\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0645\u062F\u064A\u0646\u0629. \u062C\u0631\u0628 \u0645\u062B\u0644: \u0637\u0642\u0633 \u063A\u0632\u0629');
          return;
        }

        const current = await this.fetchWeatherByCoordinates(city.latitude, city.longitude);
        await this.saveUserWeatherLocation(ctx.from?.id, {
          latitude: city.latitude,
          longitude: city.longitude,
          city: city.name || '',
          displayName: this.formatCityLabel(city)
        });
        await ctx.reply(this.formatWeatherMessage(this.formatCityLabel(city), current));
        return;
      }

      const sharedLocation = this.extractLocationFromCtx(ctx);
      if (sharedLocation) {
        const latitude = Number(sharedLocation.latitude);
        const longitude = Number(sharedLocation.longitude);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          const reverse = await this.reverseGeocode(latitude, longitude);
          const current = await this.fetchWeatherByCoordinates(latitude, longitude);
          await this.saveUserWeatherLocation(ctx.from?.id, {
            latitude,
            longitude,
            city: reverse.cityName || '',
            displayName: reverse.displayName || '\u0645\u0648\u0642\u0639\u0643 \u0627\u0644\u062D\u0627\u0644\u064A'
          });
          await ctx.reply(this.formatWeatherMessage(reverse.displayName || '\u0645\u0648\u0642\u0639\u0643 \u0627\u0644\u062D\u0627\u0644\u064A', current));
          return;
        }
      }

      const savedLocation = await this.getUserWeatherLocation(ctx.from?.id);
      if (savedLocation) {
        const current = await this.fetchWeatherByCoordinates(savedLocation.latitude, savedLocation.longitude);
        const label = savedLocation.displayName || savedLocation.city || '\u0645\u0648\u0642\u0639\u0643 \u0627\u0644\u0645\u062D\u0641\u0648\u0638';
        await ctx.reply(this.formatWeatherMessage(label, current));
        return;
      }

      await ctx.reply(
        '\u2139\uFE0F \u0644\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0637\u0642\u0633 \u062D\u0642\u064A\u0642\u064A \u062D\u0633\u0628 \u0645\u0648\u0642\u0639\u0643:\n' +
          '1) \u0623\u0631\u0633\u0644 \u0645\u0648\u0642\u0639\u0643 \u0645\u0646 \u062A\u064A\u0644\u064A\u062C\u0631\u0627\u0645 (\uD83D\uDCCE > \u0627\u0644\u0645\u0648\u0642\u0639)\n' +
          '2) \u0623\u0648 \u0627\u0643\u062A\u0628: \u0637\u0642\u0633 \u063A\u0632\u0629\n' +
          '3) \u0623\u0648 \u0627\u0633\u062A\u062E\u062F\u0645: \u0637\u0642\u0633 (\u0628\u0639\u062F \u062D\u0641\u0638 \u0645\u0648\u0642\u0639\u0643 \u0645\u0631\u0629 \u0648\u0627\u062D\u062F\u0629)'
      );
    } catch (_error) {
      await ctx.reply('\u274C \u062A\u0639\u0630\u0631 \u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0637\u0642\u0633 \u062D\u0627\u0644\u064A\u0627. \u062D\u0627\u0648\u0644 \u0644\u0627\u062D\u0642\u0627.');
    }
  }

  static async handleAdhanText(ctx, cityText) {
    try {
      ctx.session = ctx.session || {};
      ctx.session.utilityIntent = 'adhan';
      const cityInput = String(cityText || '').trim();

      if (cityInput) {
        const city = await this.resolveCity(cityInput);
        if (!city) {
          await ctx.reply('\u274C \u0644\u0645 \u0623\u062A\u0639\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0645\u062F\u064A\u0646\u0629. \u062C\u0631\u0628 \u0645\u062B\u0644: \u0627\u0630\u0627\u0646 \u063A\u0632\u0629');
          return;
        }
        const adhanData = await this.fetchAdhanByCoordinates(city.latitude, city.longitude);
        await this.saveUserWeatherLocation(ctx.from?.id, {
          latitude: city.latitude,
          longitude: city.longitude,
          city: city.name || '',
          displayName: this.formatCityLabel(city)
        });
        await ctx.reply(this.formatAdhanMessage(this.formatCityLabel(city), adhanData));
        return;
      }

      const sharedLocation = this.extractLocationFromCtx(ctx);
      if (sharedLocation) {
        const latitude = Number(sharedLocation.latitude);
        const longitude = Number(sharedLocation.longitude);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          const reverse = await this.reverseGeocode(latitude, longitude);
          await this.saveUserWeatherLocation(ctx.from?.id, {
            latitude,
            longitude,
            city: reverse.cityName || '',
            displayName: reverse.displayName || '\u0645\u0648\u0642\u0639\u0643 \u0627\u0644\u062D\u0627\u0644\u064A'
          });
          const adhanData = await this.fetchAdhanByCoordinates(latitude, longitude);
          await ctx.reply(this.formatAdhanMessage(reverse.displayName || '\u0645\u0648\u0642\u0639\u0643 \u0627\u0644\u062D\u0627\u0644\u064A', adhanData));
          return;
        }
      }

      const savedLocation = await this.getUserWeatherLocation(ctx.from?.id);
      if (savedLocation) {
        const adhanData = await this.fetchAdhanByCoordinates(savedLocation.latitude, savedLocation.longitude);
        const label = savedLocation.displayName || savedLocation.city || '\u0645\u0648\u0642\u0639\u0643 \u0627\u0644\u0645\u062D\u0641\u0648\u0638';
        await ctx.reply(this.formatAdhanMessage(label, adhanData));
        return;
      }

      await ctx.reply(
        '\u2139\uFE0F \u0644\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0627\u0644\u0623\u0630\u0627\u0646 \u062D\u0633\u0628 \u0645\u0648\u0642\u0639\u0643:\n' +
          '1) \u0623\u0631\u0633\u0644 \u0645\u0648\u0642\u0639\u0643 \u0645\u0646 \u062A\u064A\u0644\u064A\u062C\u0631\u0627\u0645 (\uD83D\uDCCE > \u0627\u0644\u0645\u0648\u0642\u0639)\n' +
          '2) \u0623\u0648 \u0627\u0643\u062A\u0628: \u0627\u0630\u0627\u0646 \u063A\u0632\u0629\n' +
          '3) \u0623\u0648 \u0627\u0633\u062A\u062E\u062F\u0645: \u0627\u0630\u0627\u0646 (\u0628\u0639\u062F \u062D\u0641\u0638 \u0645\u0648\u0642\u0639\u0643 \u0645\u0631\u0629 \u0648\u0627\u062D\u062F\u0629)'
      );
    } catch (_error) {
      await ctx.reply('\u274C \u062A\u0639\u0630\u0631 \u062C\u0644\u0628 \u0645\u0648\u0627\u0642\u064A\u062A \u0627\u0644\u0623\u0630\u0627\u0646 \u062D\u0627\u0644\u064A\u0627. \u062D\u0627\u0648\u0644 \u0644\u0627\u062D\u0642\u0627.');
    }
  }
}

module.exports = ChatGamesUtilityHandler;

