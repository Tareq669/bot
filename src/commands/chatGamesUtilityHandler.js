const axios = require('axios');
const Markup = require('telegraf/markup');
const { User } = require('../database/models');

class ChatGamesUtilityHandler {
  static xoGames = new Map();
  static hotSearchCache = new Map();
  static HOT_CACHE_TTL_MS = 10 * 60 * 1000;
  static audioQueryCache = new Map();
  static AUDIO_QUERY_CACHE_TTL_MS = 30 * 60 * 1000;
  static audioSearchInFlight = new Map();
  static ARCHIVE_SEARCH_URL = 'https://archive.org/advancedsearch.php';
  static ARCHIVE_METADATA_URL = 'https://archive.org/metadata';
  static YT_PIPED_INSTANCES = [
    'https://piped.video',
    'https://piped.adminforge.de',
    'https://piped.ngn.tf',
    'https://piped.privacydev.net'
  ];
  static RELIGIOUS_AUDIO_TERMS = [
    'قرآن', 'قران', 'quran', 'qur', 'مصحف', 'تلاوة', 'تلاوه', 'سورة', 'سوره', 'surah',
    'اذكار', 'أذكار', 'ذكر', 'duaa', 'dua', 'دعاء', 'دعاء', 'رقية', 'رقيه', 'ادعية',
    'انشودة', 'انشوده', 'nasheed', 'اناشيد', 'الشيخ', 'imam', 'azan', 'adhan', 'اذان', 'أذان'
  ];

  static MUSIC_HINT_TERMS = [
    'اغنية', 'أغنية', 'اغاني', 'أغاني', 'music', 'song', 'mp3', 'كليب', 'حفلة', 'حفله',
    'ام كلثوم', 'فيروز', 'عبد الحليم', 'كاظم', 'اصالة', 'أصالة'
  ];

  static cityAliases = {
    '\u063A\u0632\u0629': 'Gaza',
    '\u063A\u0632\u0647': 'Gaza',
    '\u0627\u0644\u0642\u062F\u0633': 'Jerusalem',
    '\u062C\u062F\u0629': 'Jeddah',
    '\u0645\u0643\u0629': 'Mecca',
    '\u0645\u0643\u0647': 'Mecca'
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

  static pickArchiveMp3File(files = []) {
    if (!Array.isArray(files) || !files.length) return null;
    const candidates = files.filter((file) => {
      const name = String(file?.name || '').toLowerCase();
      const format = String(file?.format || '').toLowerCase();
      return name.endsWith('.mp3') || format.includes('mp3');
    });
    if (!candidates.length) return null;
    const original = candidates.find((file) => String(file?.source || '').toLowerCase() === 'original');
    return original || candidates[0];
  }

  static normalizeSearchText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static queryTokens(value) {
    const norm = this.normalizeSearchText(value);
    if (!norm) return [];
    return norm.split(' ').filter((token) => token.length >= 2);
  }

  static queryMatchRatio(query, text) {
    const tokens = this.queryTokens(query);
    if (!tokens.length) return 0;
    const hay = this.normalizeSearchText(text);
    if (!hay) return 0;
    const hit = tokens.filter((token) => hay.includes(token)).length;
    return hit / tokens.length;
  }

  static isAcceptableQueryMatch(query, text) {
    const tokens = this.queryTokens(query);
    if (!tokens.length) return false;
    const ratio = this.queryMatchRatio(query, text);
    if (tokens.length === 1) return ratio >= 1;
    if (tokens.length === 2) return ratio >= 0.5;
    return ratio >= 0.4;
  }

  static isArtistOnlyQuery(query) {
    const normalized = this.normalizeSearchText(query);
    if (!normalized) return false;
    const tokens = this.queryTokens(normalized);
    if (tokens.length === 0 || tokens.length > 2) return false;
    const songHints = ['اغنيه', 'اغنية', 'song', 'mp3', 'lyrics', 'كليب', 'موسيقى', 'music'];
    if (this.hasAnyTerm(normalized, songHints)) return false;
    return true;
  }

  static shuffleArray(items = []) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  static getHotCacheKey(ctx) {
    const chatId = Number(ctx?.chat?.id || 0);
    if (!chatId) return '';
    return `${chatId}`;
  }

  static buildHotKeyboard(canNext = true) {
    return undefined;
  }

  static setHotCache(ctx, query, list = [], index = 0) {
    const key = this.getHotCacheKey(ctx);
    if (!key) return;
    this.hotSearchCache.set(key, {
      query: String(query || ''),
      list: Array.isArray(list) ? list : [],
      index: Number(index || 0),
      createdAt: Date.now()
    });
  }

  static getHotCache(ctx) {
    const key = this.getHotCacheKey(ctx);
    if (!key) return null;
    const cached = this.hotSearchCache.get(key);
    if (!cached) return null;
    if ((Date.now() - Number(cached.createdAt || 0)) > this.HOT_CACHE_TTL_MS) {
      this.hotSearchCache.delete(key);
      return null;
    }
    return cached;
  }

  static async sendHotAudioResult(ctx, audio, canNext = true) {
    const caption = '♪ تم التح🎧ميل بنجاح ♪ ☑';
    const keyboard = this.buildHotKeyboard(canNext);
    await ctx.replyWithAudio(
      { url: audio.url },
      {
        caption,
        reply_markup: keyboard ? keyboard.reply_markup : undefined
      }
    );
  }

  static cleanAudioLabel(value) {
    let text = String(value || '').trim();
    if (!text) return '';
    text = text
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/\b(?:www\.)?\S+\.(?:com|net|org|io|me|tv|ly|co|app)\S*/gi, '')
      .replace(/@[\w_.-]+/g, '')
      .replace(/(?:mazzika|mazika|مزازيكا|مزازيك|مزيكا)/gi, '')
      .replace(/[|]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return text || 'مقطع صوتي';
  }

  static async fetchPiped(path, params = {}, instanceBase = '') {
    const base = String(instanceBase || '').replace(/\/+$/, '');
    if (!base) throw new Error('PIPED_INSTANCE_EMPTY');
    const { data } = await axios.get(`${base}${path}`, {
      params,
      timeout: 12000
    });
    return data;
  }

  static async fetchSpotifyAccessToken() {
    try {
      const { data } = await axios.get('https://open.spotify.com/get_access_token', {
        params: { reason: 'transport', productType: 'web_player' },
        timeout: 10000
      });
      return String(data?.accessToken || '');
    } catch (_error) {
      return '';
    }
  }

  static async searchSpotifySeeds(query, limit = 5) {
    const q = String(query || '').trim();
    if (!q) return [];
    const token = await this.fetchSpotifyAccessToken();
    if (!token) return [];
    try {
      const { data } = await axios.get('https://api.spotify.com/v1/search', {
        params: {
          q,
          type: 'track',
          limit: Math.max(1, Math.min(20, Number(limit || 5)))
        },
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 12000
      });
      const items = Array.isArray(data?.tracks?.items) ? data.tracks.items : [];
      return items.map((item) => {
        const title = String(item?.name || '').trim();
        const artist = Array.isArray(item?.artists) ? String(item.artists[0]?.name || '').trim() : '';
        return {
          title,
          creator: artist,
          query: [artist, title].filter(Boolean).join(' - ') || q,
          source: 'spotify'
        };
      }).filter((x) => x.query);
    } catch (_error) {
      return [];
    }
  }

  static async searchSoundCloudSeeds(query, limit = 5) {
    const q = String(query || '').trim();
    if (!q) return [];
    try {
      const encoded = encodeURIComponent(q);
      const { data } = await axios.get(`https://r.jina.ai/http://soundcloud.com/search/sounds?q=${encoded}`, {
        timeout: 12000
      });
      const text = String(data || '');
      const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
      const seeds = [];
      const seen = new Set();
      for (const line of lines) {
        if (seeds.length >= limit) break;
        if (!line.includes('soundcloud.com/')) continue;
        const cleaned = line.replace(/^[-*]\s*/, '');
        if (seen.has(cleaned)) continue;
        seen.add(cleaned);
        const titleGuess = cleaned
          .replace(/^https?:\/\/(m\.)?soundcloud\.com\//i, '')
          .replace(/[\/_-]+/g, ' ')
          .trim();
        if (!titleGuess) continue;
        seeds.push({
          title: titleGuess,
          creator: '',
          query: `${titleGuess}`,
          source: 'soundcloud'
        });
      }
      return seeds;
    } catch (_error) {
      return [];
    }
  }

  static async fetchPipedSearchCandidates(query, instance, filters = ['music_songs', 'music_videos', 'videos']) {
    const all = [];
    for (const filter of filters) {
      try {
        const data = await this.fetchPiped('/api/v1/search', { q: query, filter }, instance);
        const items = (Array.isArray(data) ? data : [])
          .filter((item) => item?.id && (item?.type === 'stream' || item?.type === 'video'));
        all.push(...items);
      } catch (_error) {
        continue;
      }
    }
    return all;
  }

  static hasAnyTerm(text, terms = []) {
    if (!text) return false;
    return terms.some((term) => text.includes(this.normalizeSearchText(term)));
  }

  static scoreAudioCandidate(query, title, creator = '') {
    const q = this.normalizeSearchText(query);
    const t = this.normalizeSearchText(`${title || ''} ${creator || ''}`);
    if (!q || !t) return 0;

    const tokens = this.queryTokens(q);
    let score = 0;

    if (t.includes(q)) score += 20;
    for (const token of tokens) {
      if (t.includes(token)) score += 5;
    }

    const queryIsReligious = this.hasAnyTerm(q, this.RELIGIOUS_AUDIO_TERMS);
    const queryHintsMusic = this.hasAnyTerm(q, this.MUSIC_HINT_TERMS);
    const itemIsReligious = this.hasAnyTerm(t, this.RELIGIOUS_AUDIO_TERMS);
    const itemHintsMusic = this.hasAnyTerm(t, this.MUSIC_HINT_TERMS);

    if (queryHintsMusic && itemHintsMusic) score += 8;
    if (!queryIsReligious && itemIsReligious) score -= 18;
    if (!queryIsReligious && itemHintsMusic) score += 6;

    return score;
  }

  static async searchArchiveAudio(query) {
    const q = String(query || '').trim();
    if (!q) return null;
    const { data } = await axios.get(this.ARCHIVE_SEARCH_URL, {
      params: {
        q: `${q} AND mediatype:(audio)`,
        fl: ['identifier', 'title', 'creator'],
        rows: 7,
        page: 1,
        output: 'json'
      },
      timeout: 15000
    });
    const docs = data?.response?.docs || [];
    if (!docs.length) return null;

    const rankedDocs = docs
      .map((doc) => ({
        doc,
        score: this.scoreAudioCandidate(query, doc?.title, doc?.creator)
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.doc);

    const strictDocs = rankedDocs.filter((doc) =>
      this.isAcceptableQueryMatch(query, `${String(doc?.title || '')} ${String(doc?.creator || '')}`)
    );
    const docsToTry = strictDocs.length ? strictDocs : rankedDocs;

    for (const doc of docsToTry) {
      const identifier = String(doc?.identifier || '').trim();
      if (!identifier) continue;
      try {
        const metaResp = await axios.get(`${this.ARCHIVE_METADATA_URL}/${encodeURIComponent(identifier)}`, {
          timeout: 15000
        });
        const files = metaResp?.data?.files || [];
        const mp3 = this.pickArchiveMp3File(files);
        if (!mp3?.name) continue;
        const fileName = String(mp3.name).split('/').pop();
        if (!fileName) continue;
        return {
          title: String(doc?.title || identifier),
          creator: String(doc?.creator || ''),
          url: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(fileName)}`
        };
      } catch (_innerError) {
        continue;
      }
    }
    return null;
  }

  static pickYoutubeAudioStream(streams = []) {
    if (!Array.isArray(streams) || !streams.length) return null;
    const withUrl = streams.filter((stream) => stream?.url);
    if (!withUrl.length) return null;
    const ranked = withUrl
      .map((stream) => ({
        ...stream,
        bitrateValue: Number(stream?.bitrate || 0)
      }))
      .sort((a, b) => b.bitrateValue - a.bitrateValue);
    return ranked[0] || null;
  }

  static async searchYoutubeAudio(query) {
    const q = String(query || '').trim();
    if (!q) return null;
    const instances = this.shuffleArray(this.YT_PIPED_INSTANCES);
    for (const instance of instances) {
      try {
        const items = await this.fetchPipedSearchCandidates(q, instance, ['music_songs', 'music_videos', 'videos']);
        const candidates = items
          .filter((item) => item?.id && (item?.type === 'stream' || item?.type === 'video'))
          .map((item) => ({
            item,
            score: this.scoreAudioCandidate(query, item?.title, item?.uploader || item?.author || '')
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 30)
          .map((entry) => entry.item);

        const strictCandidates = candidates.filter((candidate) =>
          this.isAcceptableQueryMatch(query, `${candidate?.title || ''} ${candidate?.uploader || candidate?.author || ''}`)
        );
        const baseCandidates = strictCandidates.length ? strictCandidates : candidates;
        const candidatesToTry = this.isArtistOnlyQuery(query) && baseCandidates.length > 1
          ? this.shuffleArray(baseCandidates)
          : baseCandidates;

        for (const candidate of candidatesToTry) {
          try {
            const streamData = await this.fetchPiped(`/api/v1/streams/${encodeURIComponent(candidate.id)}`, {}, instance);
            const audioStream = this.pickYoutubeAudioStream(streamData?.audioStreams || []);
            if (!audioStream?.url) continue;
            return {
              title: String(candidate?.title || 'مقطع صوتي'),
              creator: String(candidate?.uploader || candidate?.author || ''),
              url: String(audioStream.url),
              source: 'youtube'
            };
          } catch (_innerError) {
            continue;
          }
        }
      } catch (_searchError) {
        continue;
      }
    }
    return null;
  }

  static async searchYoutubeAudios(query, limit = 5) {
    const q = String(query || '').trim();
    if (!q) return [];

    const results = [];
    const seen = new Set();
    const instances = this.shuffleArray(this.YT_PIPED_INSTANCES);

    for (const instance of instances) {
      if (results.length >= limit) break;
      try {
        const items = await this.fetchPipedSearchCandidates(q, instance, ['music_songs', 'music_videos', 'videos']);
        const candidates = items
          .filter((item) => item?.id && (item?.type === 'stream' || item?.type === 'video'))
          .map((item) => ({
            item,
            score: this.scoreAudioCandidate(query, item?.title, item?.uploader || item?.author || '')
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 50)
          .map((entry) => entry.item);

        const strictCandidates = candidates.filter((candidate) =>
          this.isAcceptableQueryMatch(query, `${candidate?.title || ''} ${candidate?.uploader || candidate?.author || ''}`)
        );
        const baseCandidates = strictCandidates.length ? strictCandidates : candidates;
        const candidatesToTry = this.isArtistOnlyQuery(query) && baseCandidates.length > 1
          ? this.shuffleArray(baseCandidates)
          : baseCandidates;

        for (const candidate of candidatesToTry) {
          if (results.length >= limit) break;
          try {
            const streamData = await this.fetchPiped(`/api/v1/streams/${encodeURIComponent(candidate.id)}`, {}, instance);
            const audioStream = this.pickYoutubeAudioStream(streamData?.audioStreams || []);
            if (!audioStream?.url) continue;

            const title = String(candidate?.title || 'مقطع صوتي');
            const creator = String(candidate?.uploader || candidate?.author || '');
            const uniqueKey = `${this.normalizeSearchText(title)}|${this.normalizeSearchText(creator)}|${String(audioStream.url)}`;
            if (seen.has(uniqueKey)) continue;
            seen.add(uniqueKey);

            results.push({
              title,
              creator,
              url: String(audioStream.url),
              source: 'youtube'
            });
          } catch (_innerError) {
            continue;
          }
        }
      } catch (_searchError) {
        continue;
      }
    }

    return results;
  }

  static uniqueAudioResults(list = [], limit = 5) {
    const out = [];
    const seen = new Set();
    for (const item of list) {
      if (!item?.url) continue;
      const key = `${this.normalizeSearchText(item.title || '')}|${this.normalizeSearchText(item.creator || '')}|${String(item.url)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
      if (out.length >= limit) break;
    }
    return out;
  }

  static getAudioQueryCacheKey(query) {
    const normalized = this.normalizeSearchText(query || '');
    return normalized || String(query || '').trim().toLowerCase();
  }

  static getAudioQueryCache(query) {
    const key = this.getAudioQueryCacheKey(query);
    if (!key) return null;
    const cached = this.audioQueryCache.get(key);
    if (!cached) return null;
    if ((Date.now() - Number(cached.createdAt || 0)) > this.AUDIO_QUERY_CACHE_TTL_MS) {
      this.audioQueryCache.delete(key);
      return null;
    }
    return Array.isArray(cached.list) ? cached.list : null;
  }

  static setAudioQueryCache(query, list = []) {
    const key = this.getAudioQueryCacheKey(query);
    if (!key || !Array.isArray(list) || !list.length) return;
    this.audioQueryCache.set(key, { list, createdAt: Date.now() });
  }

  static async buildAudioList(query) {
    let audioList = await this.searchYoutubeAudios(query, 5);

    if (audioList.length < 3) {
      const spotifySeeds = await this.searchSpotifySeeds(query, 5);
      for (const seed of spotifySeeds) {
        if (audioList.length >= 5) break;
        const seeded = await this.searchYoutubeAudios(seed.query, 2);
        audioList = this.uniqueAudioResults([...audioList, ...seeded], 5);
      }
    }

    if (audioList.length < 3) {
      const soundSeeds = await this.searchSoundCloudSeeds(query, 4);
      for (const seed of soundSeeds) {
        if (audioList.length >= 5) break;
        const seeded = await this.searchYoutubeAudios(seed.query, 2);
        audioList = this.uniqueAudioResults([...audioList, ...seeded], 5);
      }
    }

    if (!audioList.length) {
      const archiveAudio = await this.searchArchiveAudio(query);
      if (archiveAudio?.url) audioList.push(archiveAudio);
    }

    return this.uniqueAudioResults(audioList, 5);
  }

  static async resolveAudioListWithCache(query) {
    const cached = this.getAudioQueryCache(query);
    if (cached?.length) return cached;

    const key = this.getAudioQueryCacheKey(query);
    if (!key) return [];

    const inFlight = this.audioSearchInFlight.get(key);
    if (inFlight) return inFlight;

    const task = this.buildAudioList(query)
      .then((list) => {
        if (list?.length) this.setAudioQueryCache(query, list);
        return list || [];
      })
      .finally(() => {
        this.audioSearchInFlight.delete(key);
      });

    this.audioSearchInFlight.set(key, task);
    return task;
  }

  static async handlePlayCommand(ctx, queryText) {
    if (!['group', 'supergroup'].includes(ctx.chat?.type)) {
      await ctx.reply('❌ هذا الأمر للجروب فقط.');
      return;
    }

    const query = String(queryText || '').trim();
    if (!query) {
      await ctx.reply('❌ الصيغة:\nستارز اسم المقطع');
      return;
    }

    const loadingMsg = await ctx.reply('🎧 جاري التحميل ....');
    try {
      const audioList = await this.resolveAudioListWithCache(query);

      if (!audioList.length) {
        await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
        await ctx.reply('♪ عذرا غير متوفر ..');
        return;
      }

      this.setHotCache(ctx, query, audioList, 0);
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
      await this.sendHotAudioResult(ctx, audioList[0], true);
    } catch (_error) {
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
      await ctx.reply('♪ عذرا غير متوفر ..');
    }
  }

  static async handleHotCommand(ctx, queryText) {
    return this.handlePlayCommand(ctx, queryText);
  }

  static async handleHotNextAction(ctx) {
    const chatType = String(ctx.chat?.type || ctx.callbackQuery?.message?.chat?.type || '');
    if (!['group', 'supergroup'].includes(chatType)) {
      await ctx.answerCbQuery().catch(() => {});
      return;
    }

    const cached = this.getHotCache(ctx);
    if (!cached || !Array.isArray(cached.list) || !cached.query) {
      await ctx.answerCbQuery().catch(() => {});
      await ctx.reply('❌ ما في بحث محفوظ. اكتب ستارز من جديد.');
      return;
    }

    let list = cached.list;
    if (list.length < 2) {
      const refreshed = await this.searchYoutubeAudios(cached.query, 5);
      if (Array.isArray(refreshed) && refreshed.length > list.length) {
        list = refreshed;
      }
      this.setHotCache(ctx, cached.query, list, Number(cached.index || 0));
    }

    if (!list.length) {
      await ctx.answerCbQuery().catch(() => {});
      await ctx.reply('❌ ما في نتائج إضافية حالياً.');
      return;
    }

    const nextIndex = list.length > 1
      ? (Number(cached.index || 0) + 1) % list.length
      : 0;
    cached.index = nextIndex;
    cached.createdAt = Date.now();
    this.setHotCache(ctx, cached.query, list, nextIndex);

    await ctx.answerCbQuery().catch(() => {});
    await this.sendHotAudioResult(ctx, list[nextIndex], true);
  }

  static async handleDotCommand(ctx, queryText) {
    return this.handleHotCommand(ctx, queryText);
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
        displayName: data?.display_name || cityName || 'موقعك الحالي'
      };
    } catch (_error) {
      return {
        cityName: null,
        displayName: 'موقعك الحالي'
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
