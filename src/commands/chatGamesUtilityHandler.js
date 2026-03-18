const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const Markup = require('telegraf/markup');
const YTDlpWrap = require('yt-dlp-wrap').default;
const { User } = require('../database/models');

class ChatGamesUtilityHandler {
  static xoGames = new Map();
  static hotSearchCache = new Map();
  static starsSelectionCache = new Map();
  static HOT_CACHE_TTL_MS = 10 * 60 * 1000;
  static STARS_SELECTION_TTL_MS = 5 * 60 * 1000;
  static audioQueryCache = new Map();
  static starsFileIdCache = new Map();
  static AUDIO_QUERY_CACHE_TTL_MS = 30 * 60 * 1000;
  static STARS_FILEID_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  static MUSIC_DIR = path.join(process.cwd(), 'music');
  static MUSIC_INDEX_FILE = path.join(process.cwd(), 'music', 'music_index.json');
  static MUSIC_INDEX_RESCAN_MS = 2 * 60 * 1000;
  static musicLibrary = [];
  static musicLibraryLastScan = 0;
  static audioSearchInFlight = new Map();
  static audioChatQueue = new Map();
  static AUDIO_SEARCH_TIMEOUT_MS = 15000;
  static YT_PIPED_TIMEOUT_MS = 8000;
  static FAST_SEARCH_INSTANCES = 1;
  static FAST_SEARCH_FALLBACK_INSTANCES = 2;
  static AUDIO_FAST_TIMEOUT_MS = 2400;
  static AUDIO_RESOLVE_TIMEOUT_MS = 3600;
  static AUDIO_QUERY_MAX_VARIANTS = 4;
  static AUDIO_QUERY_FAST_VARIANTS = 2;
  static FAST_YT_RESULTS_LIMIT = 12;
  static FAST_YT_VARIANTS = 3;
  static FAST_YT_PER_QUERY_LIMIT = 10;
  static FAST_SEARCH_MIN_MATCHES = 4;
  static AUDIO_RESOLVE_BATCH_SIZE = 4;
  static AUDIO_STRICT_MATCH_RATIO = 0.35;
  static AUDIO_STRICT_SCORE_THRESHOLD = 0.4;
  static YT_DLP_TIMEOUT_MS = 90000;
  static VIDEO_SEARCH_TIMEOUT_MS = 18000;
  static VIDEO_RESOLVE_TIMEOUT_MS = 4000;
  static JOE_UPDATES_CHANNEL_URL = 'https://t.me/joam909';
  static YT_HTML_SEARCH_TIMEOUT_MS = 4500;
  static ARCHIVE_SEARCH_URL = 'https://archive.org/advancedsearch.php';
  static ARCHIVE_METADATA_URL = 'https://archive.org/metadata';
  static YOUTUBE_SEARCH_API_URL = 'https://www.googleapis.com/youtube/v3/search';
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

  static MUSIC_STOP_WORDS = [
    'اغنية', 'اغاني', 'اغنيه', 'music', 'song', 'mp3', 'موسيقى', 'موسيقي', 'كليب',
    'فيلم', 'clip', 'lyric', 'lyrics', 'صوت', 'صوتيات', 'فيديو', 'video'
  ];

  static normalizeArabicLetters(value) {
    return String(value || '')
      .replace(/[إأآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/\u0640/g, '')
      .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
  }

  static sanitizeAudioFileName(value) {
    const cleaned = this.cleanAudioLabel(value || 'audio')
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return (cleaned || 'audio').slice(0, 80);
  }

  static ensureMusicDir() {
    fs.mkdirSync(this.MUSIC_DIR, { recursive: true });
  }

  static buildMusicKeywords(title) {
    const norm = this.normalizeSearchText(title || '');
    if (!norm) return [];
    const parts = norm.split(' ').filter(Boolean);
    const keywords = new Set(parts);
    keywords.add(norm);
    for (let i = 0; i < parts.length - 1; i += 1) {
      keywords.add(`${parts[i]} ${parts[i + 1]}`);
    }
    return Array.from(keywords);
  }

  static async loadMusicLibrary(force = false) {
    const now = Date.now();
    if (!force && this.musicLibrary.length && (now - this.musicLibraryLastScan) < this.MUSIC_INDEX_RESCAN_MS) {
      return this.musicLibrary;
    }

    this.ensureMusicDir();
    const files = fs.readdirSync(this.MUSIC_DIR, { withFileTypes: true })
      .filter((d) => d.isFile() && d.name.toLowerCase().endsWith('.mp3'))
      .map((d) => d.name);

    const index = files.map((name) => {
      const full = path.join(this.MUSIC_DIR, name);
      const title = path.basename(name, path.extname(name));
      return {
        title,
        normTitle: this.normalizeSearchText(title),
        keywords: this.buildMusicKeywords(title),
        path: full
      };
    });

    this.musicLibrary = index;
    this.musicLibraryLastScan = now;
    try {
      fs.writeFileSync(this.MUSIC_INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
    } catch (_error) {}
    return index;
  }

  static searchLocalMusic(query) {
    const q = this.normalizeSearchText(query || '');
    if (!q || !this.musicLibrary.length) return null;

    const qTokens = q.split(' ').filter(Boolean);
    let best = null;
    let bestScore = 0;

    for (const item of this.musicLibrary) {
      const normTitle = String(item?.normTitle || '');
      const keywords = Array.isArray(item?.keywords) ? item.keywords : [];
      const kwSet = new Set(keywords);
      let score = 0;

      if (q === normTitle) score += 100;
      if (normTitle.includes(q)) score += 60;
      for (const token of qTokens) {
        if (kwSet.has(token)) score += 12;
        else if (normTitle.includes(token)) score += 7;
      }

      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }

    return bestScore > 0 ? best : null;
  }

  static async downloadFromYoutubeToMusic(query) {
    const q = String(query || '').trim();
    if (!q) return null;

    this.ensureMusicDir();
    const search = await this.runYtDlpJson(`ytsearch1:${q}`, ['--flat-playlist']).catch(() => null);
    const entry = search?._type === 'playlist' && Array.isArray(search.entries) ? search.entries[0] : null;
    if (!entry) return null;

    const videoId = String(entry.id || '').trim();
    if (!videoId) return null;
    const title = this.cleanAudioLabel(entry.title || q) || q;

    await this.loadMusicLibrary(false);
    const existing = this.searchLocalMusic(title) || this.searchLocalMusic(q);
    if (existing?.path && fs.existsSync(existing.path)) return existing;

    const safeTitle = this.sanitizeAudioFileName(title);
    const outTemplate = path.join(this.MUSIC_DIR, `${safeTitle}.%(ext)s`);
    const executable = await this.resolveYtDlpCommand();
    const args = [
      ...executable.baseArgs,
      `https://www.youtube.com/watch?v=${videoId}`,
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '--no-playlist',
      '--no-warnings',
      '--quiet',
      '-o',
      outTemplate
    ];
    await this.execFileAsync(executable.command, args, {
      timeout: Math.max(this.YT_DLP_TIMEOUT_MS, 120000)
    }).catch(() => null);

    await this.loadMusicLibrary(true);
    return this.searchLocalMusic(title) || this.searchLocalMusic(q);
  }

  static getYoutubeApiKey() {
    return String(process.env.YOUTUBE_DATA_API_KEY || process.env.YOUTUBE_API_KEY || '').trim();
  }

  static extractFirstUrl(text) {
    const m = String(text || '').match(/https?:\/\/[^\s]+/i);
    return m ? String(m[0]).trim() : '';
  }

  static classifyMediaUrl(url) {
    const u = String(url || '').toLowerCase();
    if (!u) return '';
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
    if (u.includes('tiktok.com') || u.includes('vt.tiktok.com')) return 'tiktok';
    if (u.includes('spotify.com')) return 'spotify';
    // سناب تيوب غالبًا يشارك روابط يوتيوب/تيك توك؛ لو ظهر رابط مباشر باسمه نحاول.
    if (u.includes('snaptube')) return 'snaptube';
    return '';
  }

  static async resolveSpotifySearchQuery(spotifyUrl) {
    const url = String(spotifyUrl || '').trim();
    if (!url) return '';
    try {
      const { data } = await axios.get('https://open.spotify.com/oembed', {
        params: { url },
        timeout: 10000
      });
      const title = this.cleanAudioLabel(data?.title || '').trim();
      const author = this.cleanAudioLabel(data?.author_name || '').trim();
      const query = [author, title].filter(Boolean).join(' - ').trim();
      return query || '';
    } catch (_error) {
      return '';
    }
  }

  static async resolveStarsAudio(queryText) {
    const raw = String(queryText || '').trim();
    if (!raw) return null;

    const directUrl = this.extractFirstUrl(raw);
    const directKind = this.classifyMediaUrl(directUrl);
    if (directKind === 'youtube' || directKind === 'tiktok' || directKind === 'snaptube') {
      return this.resolveAudioWithYtDlp(directUrl).catch(() => null);
    }

    let searchQuery = raw;
    if (directKind === 'spotify') {
      const spotifyQuery = await this.resolveSpotifySearchQuery(directUrl);
      if (spotifyQuery) searchQuery = spotifyQuery;
    }

    let candidate = null;
    if (this.getYoutubeApiKey()) {
      const apiResults = await this.searchYoutubeCandidatesViaApi(searchQuery, 1).catch(() => []);
      candidate = apiResults[0] || null;
    }

    if (!candidate) {
      const ytDlpResults = await this.searchYoutubeCandidatesViaYtDlp(searchQuery, 1).catch(() => []);
      candidate = ytDlpResults[0] || null;
    }

    if (!candidate?.webpageUrl) return null;

    const audio = await this.resolveAudioWithYtDlp(candidate.webpageUrl).catch(() => null);
    if (!audio?.url) return null;

    return {
      ...audio,
      title: this.cleanAudioLabel(audio.title || candidate.title || searchQuery) || 'مقطع صوتي',
      creator: this.cleanAudioLabel(audio.creator || candidate.creator || '').trim()
    };
  }

  static execFileAsync(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      execFile(command, args, {
        windowsHide: true,
        maxBuffer: 50 * 1024 * 1024,
        ...options
      }, (error, stdout, stderr) => {
        if (error) {
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      });
    });
  }

  static async resolveYtDlpCommand() {
    if (this.ytDlpCommandPromise) return this.ytDlpCommandPromise;

    this.ytDlpCommandPromise = (async () => {
      try {
        await this.execFileAsync('python', ['-c', 'import yt_dlp'], { timeout: 12000 });
        return { command: 'python', baseArgs: ['-m', 'yt_dlp'] };
      } catch (_error) {
        const binDir = path.join(process.cwd(), 'bin');
        const binName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
        const binPath = path.join(binDir, binName);
        if (!fs.existsSync(binPath)) {
          fs.mkdirSync(binDir, { recursive: true });
          await YTDlpWrap.downloadFromGithub(binPath);
        }
        if (process.platform !== 'win32') {
          try {
            fs.chmodSync(binPath, 0o755);
          } catch (_error) {}
        }
        return { command: binPath, baseArgs: [] };
      }
    })();

    return this.ytDlpCommandPromise;
  }

  static parseYtDlpResult(data) {
    if (!data) return null;
    const entry = data?._type === 'playlist' && Array.isArray(data.entries)
      ? data.entries.find((item) => item && (item.requested_downloads || item.url || item.webpage_url))
      : data;
    if (!entry) return null;

    const requested = Array.isArray(entry.requested_downloads) ? entry.requested_downloads[0] : null;
    const directUrl = String(requested?.url || entry.url || '').trim();
    const pageUrl = String(entry.webpage_url || entry.original_url || '').trim();
    return {
      title: String(entry.title || '').trim(),
      creator: String(entry.uploader || entry.channel || entry.creator || '').trim(),
      url: directUrl,
      webpageUrl: pageUrl,
      ext: String(requested?.ext || entry.ext || '').trim(),
      id: String(entry.id || '').trim()
    };
  }

  static async runYtDlpJson(target, extraArgs = []) {
    const executable = await this.resolveYtDlpCommand();
    const args = [
      ...executable.baseArgs,
      target,
      '--dump-single-json',
      '--no-playlist',
      '--skip-download',
      '--no-warnings',
      '--quiet',
      '--extractor-args',
      'youtube:player_client=android_vr;lang=en',
      '--js-runtimes',
      'node',
      ...extraArgs
    ];
    const { stdout } = await this.execFileAsync(executable.command, args, {
      timeout: this.YT_DLP_TIMEOUT_MS
    });
    const text = String(stdout || '').trim();
    if (!text) return null;
    return JSON.parse(text);
  }

  static async resolveAudioWithYtDlp(target) {
    const data = await this.runYtDlpJson(target, [
      '-f',
      'bestaudio[ext=m4a]/bestaudio[acodec^=mp4a]/bestaudio'
    ]);
    const parsed = this.parseYtDlpResult(data);
    if (!parsed?.url) return null;
    return {
      title: parsed.title || 'مقطع صوتي',
      creator: parsed.creator || '',
      url: parsed.url,
      source: 'youtube_ytdlp',
      ext: parsed.ext || 'm4a',
      webpageUrl: parsed.webpageUrl || ''
    };
  }

  static async searchYoutubeCandidatesViaYtDlp(query, limit = 5) {
    const trimmed = String(query || '').trim();
    if (!trimmed) return [];
    const capped = Math.max(1, Math.min(8, Number(limit || 5)));
    const targets = [`ytsearch${capped}:${trimmed}`];
    const variants = this.generateSearchVariants(trimmed)
      .filter((v) => this.normalizeSearchText(v) !== this.normalizeSearchText(trimmed))
      .slice(0, 2);
    for (const variant of variants) {
      targets.push(`ytsearch${Math.max(2, Math.min(4, capped))}:${variant}`);
    }

    const collected = [];
    const seen = new Set();
    const rankCandidate = (candidate) => {
      const text = this.normalizeSearchText(`${candidate.title} ${candidate.creator}`);
      const queryNorm = this.normalizeSearchText(trimmed);
      let score = this.scoreAudioCandidate(queryNorm, candidate.title, candidate.creator);
      if (text.includes('كوكتيل') || text.includes('mix') || text.includes('playlist')) score -= 20;
      if (text.includes('official') || text.includes('lyric')) score += 8;
      if (this.hasOrderedTokenMatch(queryNorm, `${candidate.creator} ${candidate.title}`)) score += 15;
      return score;
    };
    for (const target of targets) {
      const data = await this.runYtDlpJson(target, ['--flat-playlist']).catch(() => null);
      const entries = data?._type === 'playlist' && Array.isArray(data.entries) ? data.entries : [];
      for (const entry of entries) {
        if (collected.length >= capped) break;
        const id = String(entry?.id || '').trim();
        if (!id) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        const title = this.cleanAudioLabel(entry?.title || '').trim();
        if (!title) continue;
        const creator = this.cleanAudioLabel(entry?.uploader || entry?.channel || entry?.creator || '').trim();
        const webpageUrl = String(entry?.webpage_url || `https://www.youtube.com/watch?v=${id}`).trim();
        collected.push({ id, title, creator, webpageUrl });
      }
      if (collected.length >= capped) break;
    }

    return collected
      .sort((a, b) => rankCandidate(b) - rankCandidate(a))
      .slice(0, capped);
  }

  static async searchYoutubeCandidatesViaApi(query, limit = 5) {
    const q = String(query || '').trim();
    const apiKey = this.getYoutubeApiKey();
    if (!q || !apiKey) return [];

    const max = Math.max(1, Math.min(10, Number(limit || 5)));
    const { data } = await axios.get(this.YOUTUBE_SEARCH_API_URL, {
      params: {
        part: 'snippet',
        q,
        type: 'video',
        maxResults: max,
        key: apiKey,
        regionCode: 'SA',
        relevanceLanguage: 'ar'
      },
      timeout: 15000
    });

    const items = Array.isArray(data?.items) ? data.items : [];
    const mapped = items.map((item) => {
      const id = String(item?.id?.videoId || '').trim();
      const title = this.cleanAudioLabel(item?.snippet?.title || '').trim();
      const creator = this.cleanAudioLabel(item?.snippet?.channelTitle || '').trim();
      const webpageUrl = id ? `https://www.youtube.com/watch?v=${id}` : '';
      return { id, title, creator, webpageUrl };
    }).filter((x) => x.id && x.title);

    const rankCandidate = (candidate) => {
      const text = this.normalizeSearchText(`${candidate.title} ${candidate.creator}`);
      const queryNorm = this.normalizeSearchText(q);
      let score = this.scoreAudioCandidate(queryNorm, candidate.title, candidate.creator);
      if (text.includes('كوكتيل') || text.includes('mix') || text.includes('playlist')) score -= 20;
      if (text.includes('official') || text.includes('lyric')) score += 8;
      if (this.hasOrderedTokenMatch(queryNorm, `${candidate.creator} ${candidate.title}`)) score += 15;
      return score;
    };

    return mapped
      .sort((a, b) => rankCandidate(b) - rankCandidate(a))
      .slice(0, max);
  }

  static getStarsSelectionKey(ctx) {
    const chatId = Number(ctx?.chat?.id || 0);
    const userId = Number(ctx?.from?.id || 0);
    if (!chatId || !userId) return '';
    return `${chatId}:${userId}`;
  }

  static setStarsSelectionCache(ctx, query, list = []) {
    const key = this.getStarsSelectionKey(ctx);
    if (!key || !Array.isArray(list) || !list.length) return;
    this.starsSelectionCache.set(key, {
      query: String(query || ''),
      list,
      createdAt: Date.now()
    });
  }

  static getStarsSelectionCache(ctx) {
    const key = this.getStarsSelectionKey(ctx);
    if (!key) return null;
    const cached = this.starsSelectionCache.get(key);
    if (!cached) return null;
    if ((Date.now() - Number(cached.createdAt || 0)) > this.STARS_SELECTION_TTL_MS) {
      this.starsSelectionCache.delete(key);
      return null;
    }
    return cached;
  }

  static buildStarsSelectionKeyboard(items = []) {
    const rows = [];
    const max = Math.min(5, items.length);
    for (let i = 0; i < max; i += 1) {
      rows.push([Markup.button.callback(`${i + 1}) ${items[i].title.slice(0, 40)}`, `stars:pick:${i}`)]);
    }
    return Markup.inlineKeyboard(rows);
  }

  static buildYtDlpSearchQueries(query) {
    const variants = this.generateSearchVariants(query);
    const out = [];
    for (const variant of variants) {
      const trimmed = String(variant || '').trim();
      if (!trimmed) continue;
      out.push(`ytsearch1:${trimmed}`);
      out.push(`ytsearch1:${trimmed} audio`);
      out.push(`ytsearch1:${trimmed} official audio`);
    }
    return Array.from(new Set(out)).slice(0, 8);
  }

  static async resolveAudioListViaYtDlp(query, limit = 5) {
    const trimmed = String(query || '').trim();
    if (!trimmed) return [];

    const directVideoId = this.parseYoutubeVideoIdFromUrl(trimmed);
    if (directVideoId) {
      const direct = await this.resolveAudioWithYtDlp(`https://www.youtube.com/watch?v=${directVideoId}`).catch(() => null);
      return direct ? [direct] : [];
    }

    const results = [];
    const seen = new Set();
    const targets = this.buildYtDlpSearchQueries(trimmed);
    for (const target of targets) {
      if (results.length >= limit) break;
      const audio = await this.resolveAudioWithYtDlp(target).catch(() => null);
      if (!audio?.url) continue;
      const key = `${this.normalizeSearchText(audio.title)}|${audio.url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(audio);
    }
    return results;
  }

  static async resolveVideoWithYtDlp(target) {
    const data = await this.runYtDlpJson(target, [
      '-f',
      'best[ext=mp4][height<=720]/best[ext=mp4]/best'
    ]);
    const parsed = this.parseYtDlpResult(data);
    if (!parsed?.url) return null;
    return {
      title: parsed.title || 'فيديو',
      creator: parsed.creator || '',
      url: parsed.url,
      source: 'youtube_ytdlp_video',
      ext: parsed.ext || 'mp4'
    };
  }

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
    const normalizedArabic = this.normalizeArabicLetters(value);
    return String(normalizedArabic || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static generateSearchVariants(query) {
    const original = this.normalizeSearchText(query);
    if (!original) return [];

    const out = new Set([original]);
    const noStop = this.stripNoiseFromSearchQuery(original);
    if (noStop) out.add(noStop);

    const addTokenAlternates = (text) => {
      const tokens = String(text || '').split(' ').filter(Boolean);
      if (!tokens.length) return;

      const withNoAl = tokens.map((token) => {
        if (token.startsWith('ال') && token.length > 3) return token.slice(2);
        return token;
      }).join(' ');
      if (withNoAl && withNoAl !== text) out.add(withNoAl);

      const withTaMarbuta = tokens.map((token) => token.replace(/ه\b/g, 'ة')).join(' ');
      if (withTaMarbuta && withTaMarbuta !== text) out.add(this.normalizeSearchText(withTaMarbuta));

      const withHa = tokens.map((token) => token.replace(/ة\b/g, 'ه')).join(' ');
      if (withHa && withHa !== text) out.add(this.normalizeSearchText(withHa));
    };

    addTokenAlternates(original);
    if (noStop) addTokenAlternates(noStop);
    return Array.from(out).filter(Boolean);
  }

  static hasOrderedTokenMatch(query, text) {
    const normalizedQuery = this.normalizeSearchText(query);
    const normalizedText = this.normalizeSearchText(text);
    if (!normalizedQuery || !normalizedText) return false;
    if (normalizedText.includes(normalizedQuery)) return true;
    const qTokens = normalizedQuery.split(' ').filter(Boolean);
    const tTokens = normalizedText.split(' ').filter(Boolean);
    if (!qTokens.length || !tTokens.length) return false;

    let cursor = 0;
    for (const qToken of qTokens) {
      let found = false;
      for (let i = cursor; i < tTokens.length; i += 1) {
        if (tTokens[i] === qToken) {
          cursor = i + 1;
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
    return true;
  }

  static stripNoiseFromSearchQuery(query) {
    const norm = this.normalizeSearchText(query);
    if (!norm) return '';
    const tokens = norm.split(' ').filter((token) => token.length >= 2);
    const cleaned = tokens.filter((token) => !this.MUSIC_STOP_WORDS.includes(token));
    return cleaned.join(' ');
  }

  static queryTokens(value) {
    const norm = this.normalizeSearchText(value);
    if (!norm) return [];
    const raw = norm.split(' ').filter((token) => token.length >= 2);
    const expanded = new Set(raw);
    for (const token of raw) {
      if (token.startsWith('ال') && token.length > 3) expanded.add(token.slice(2));
      if (token.endsWith('ه') && token.length > 2) expanded.add(`${token.slice(0, -1)}ة`);
      if (token.endsWith('ة') && token.length > 2) expanded.add(`${token.slice(0, -1)}ه`);
    }
    return Array.from(expanded);
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
  static isMatchForRequest(query, title, creator = '') {
    const normalizedQuery = this.normalizeSearchText(query);
    const normalizedText = this.normalizeSearchText(`${title || ''} ${creator || ''}`);
    if (!normalizedQuery || !normalizedText) return false;

    const normalizedCore = this.stripNoiseFromSearchQuery(normalizedQuery);
    const exactText = this.normalizeSearchText(`${creator || ''} ${title || ''}`);
    if (exactText.includes(normalizedQuery) || (normalizedCore && exactText.includes(normalizedCore))) {
      return true;
    }

    const queryTokens = this.queryTokens(normalizedQuery).filter((token) => token.length >= 2);
    if (!queryTokens.length) return false;
    const coreTokens = this.queryTokens(normalizedCore).filter((token) => token.length >= 2);
    const tokens = coreTokens.length ? coreTokens : queryTokens;

    const titleText = this.normalizeSearchText(title);
    const creatorText = this.normalizeSearchText(creator);
    const textMatched = tokens.filter((token) => normalizedText.includes(token)).length;
    const titleMatched = tokens.filter((token) => titleText.includes(token)).length;
    const creatorMatched = tokens.filter((token) => creatorText.includes(token)).length;

    const required = Math.max(1, Math.ceil(tokens.length * 0.55));

    if (this.isArtistOnlyQuery(normalizedQuery)) {
      const artistText = creatorText || titleText;
      const artistMatch = tokens.filter((token) => artistText.includes(token)).length;
      if (artistMatch >= required) {
        return true;
      }
    }

    if (titleMatched >= required || creatorMatched >= required || textMatched >= required) {
      return true;
    }

    if (tokens.length <= 2 && this.isPhraseMatch(normalizedQuery, title, creator)) {
      return true;
    }

    return false;
  }

  static isStrictAudioCandidateMatch(query, title, creator = '') {
    const normalizedQuery = this.normalizeSearchText(query);
    const cleanQuery = this.stripNoiseFromSearchQuery(normalizedQuery) || normalizedQuery;
    const text = this.normalizeSearchText(`${creator || ''} ${title || ''}`);
    const titleText = this.normalizeSearchText(title || '');
    const creatorText = this.normalizeSearchText(creator || '');
    if (!cleanQuery || !text) return false;

    if (titleText.includes(cleanQuery) || text.includes(cleanQuery)) return true;

    const ratio = this.queryMatchRatio(cleanQuery, text);
    if (ratio >= 0.85 && this.hasOrderedTokenMatch(cleanQuery, text)) return true;

    if (this.isArtistOnlyQuery(normalizedQuery)) {
      if (creatorText.includes(cleanQuery)) return true;
      if (this.hasOrderedTokenMatch(cleanQuery, creatorText || titleText)) return true;
    }

    return false;
  }
  static async resolveAudioCandidatesConcurrently(candidates, instances, limit) {
    const out = [];
    const seen = new Set();
    const maxCandidates = Math.min(Array.isArray(candidates) ? candidates.length : 0, 10);
    const orderedInstances = this.shuffleArray(Array.isArray(instances) ? [...instances] : []).slice(0, 2);
    const concurrency = 3;

    const tryResolveCandidate = async (candidate) => {
      if (!candidate?.id) return null;
      const jobs = orderedInstances.map((instance) => this.withTimeout(
        this.fetchPiped(`/api/v1/streams/${encodeURIComponent(candidate.id)}`, {}, instance)
          .then((streamData) => {
            const audioStream = this.pickYoutubeAudioStream(streamData?.audioStreams || []);
            if (!audioStream?.url) return null;
            return {
              title: String(candidate?.title || 'مقطع صوتي'),
              creator: String(candidate?.uploader || candidate?.author || ''),
              url: String(audioStream.url),
              source: 'youtube'
            };
          }),
        this.AUDIO_RESOLVE_TIMEOUT_MS,
        'AUDIO_STREAM_TIMEOUT'
      ).catch(() => null));

      const settled = await Promise.allSettled(jobs);
      for (const s of settled) {
        if (s.status === 'fulfilled' && s.value?.url) return s.value;
      }
      return null;
    };

    for (let i = 0; i < maxCandidates && out.length < limit; i += concurrency) {
      const batch = [];
      for (let j = i; j < Math.min(i + concurrency, maxCandidates); j += 1) {
        batch.push(tryResolveCandidate(candidates[j]));
      }

      const settled = await Promise.allSettled(batch);
      for (const item of settled) {
        if (out.length >= limit) break;
        if (item.status !== 'fulfilled' || !item.value?.url) continue;
        const reply = item.value;
        const key = `${this.normalizeSearchText(reply.url)}|${this.normalizeSearchText(reply.title)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(reply);
      }
    }

    return out;
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

  static buildHotKeyboard() {
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
    const caption = '♪ تم التح🎧ميل بنجاح ♪';
    const safeTitle = this.cleanAudioLabel(audio?.title || 'مقطع صوتي').slice(0, 120);
    const safePerformer = this.cleanAudioLabel(audio?.creator || '').slice(0, 80) || undefined;
    const updatesButton = Markup.inlineKeyboard([
      [Markup.button.url('تحديثات جو', this.JOE_UPDATES_CHANNEL_URL)]
    ]);
    return ctx.replyWithAudio(
      { url: audio.url },
      {
        caption,
        title: safeTitle,
        performer: safePerformer,
        reply_markup: updatesButton.reply_markup
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
      timeout: this.YT_PIPED_TIMEOUT_MS
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
          .replace(/[/_-]+/g, ' ')
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

  static async fetchPipedSearchCandidates(query, instance, filters = ['music_songs', 'music_videos', 'videos'], maxResults = 20) {
    const all = [];
    const searchFilters = Array.isArray(filters) ? filters.slice(0, 3) : ['music_songs', 'videos'];
    const requests = searchFilters.map((filter) =>
      this.fetchPiped('/api/v1/search', {
        q: query,
        filter,
        maxResults
      }, instance)
    );
    const responses = await Promise.allSettled(requests);
    for (const response of responses) {
      if (response.status !== 'fulfilled') continue;
      try {
        const data = response.value;
        const items = (Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [])
          .filter((item) => item?.id && (item?.type === 'stream' || item?.type === 'video'));
        all.push(...items);
      } catch (_error) {
        continue;
      }
    }
    return all;
  }

  static parseYoutubeVideoIdFromUrl(url = '') {
    const text = String(url || '').trim();
    if (!text) return '';
    const short = text.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (short?.[1]) return short[1];
    const full = text.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (full?.[1]) return full[1];
    const embed = text.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embed?.[1]) return embed[1];
    return '';
  }

  static async fetchYoutubeHtmlCandidates(query, maxResults = 12) {
    const q = String(query || '').trim();
    if (!q) return [];
    try {
      const encoded = encodeURIComponent(q);
      const { data } = await axios.get(
        `https://r.jina.ai/http://www.youtube.com/results?search_query=${encoded}`,
        { timeout: this.YT_HTML_SEARCH_TIMEOUT_MS }
      );
      const text = String(data || '');
      if (!text) return [];

      const lines = text.split('\n').map((line) => String(line || '').trim()).filter(Boolean);
      const out = [];
      const seen = new Set();

      for (const line of lines) {
        if (out.length >= maxResults) break;
        if (!line.toLowerCase().includes('youtube.com/watch')) continue;

        const id = this.parseYoutubeVideoIdFromUrl(line);
        if (!id) continue;
        if (seen.has(id)) continue;
        seen.add(id);

        let title = line
          .replace(/^[-*]\s*/, '')
          .replace(/https?:\/\/\S+/gi, '')
          .replace(/\[[^\]]+\]/g, '')
          .trim();

        if (!title || title.length < 3) title = `YouTube ${id}`;

        out.push({
          id,
          type: 'video',
          title,
          uploader: ''
        });
      }

      return out;
    } catch (_error) {
      return [];
    }
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

  static isPhraseMatch(query, title, creator = '') {
    const normalizedQuery = this.normalizeSearchText(query);
    const normalizedText = this.normalizeSearchText(`${title || ''} ${creator || ''}`);
    if (!normalizedQuery || !normalizedText) return false;

    if (normalizedText.includes(normalizedQuery)) return true;

    const tokens = this.queryTokens(normalizedQuery);
    if (!tokens.length) return false;
    if (tokens.length > 2) {
      return tokens.every((token) => normalizedText.includes(token));
    }
    return false;
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
    const results = await this.searchYoutubeAudios(query, 1);
    return results[0] || null;
  }

  static pickYoutubeVideoStream(streams = []) {
    if (!Array.isArray(streams) || !streams.length) return null;
    const withUrl = streams.filter((stream) => stream?.url);
    if (!withUrl.length) return null;

    const ranked = withUrl
      .map((stream) => {
        const qualityLabel = String(stream?.quality || stream?.qualityLabel || '').toLowerCase();
        const match = qualityLabel.match(/(\d{3,4})p/);
        const qualityScore = match ? Number(match[1]) : 0;
        return {
          ...stream,
          qualityScore
        };
      })
      .sort((a, b) => {
        if (b.qualityScore !== a.qualityScore) return b.qualityScore - a.qualityScore;
        return Number(b?.bitrate || 0) - Number(a?.bitrate || 0);
      });

    return ranked[0] || null;
  }

  static async resolveYoutubeVideoById(videoId, instance, candidate = null) {
    const id = String(videoId || '').trim();
    if (!id || !instance) return null;
    try {
      const streamData = await this.withTimeout(
        this.fetchPiped(`/api/v1/streams/${encodeURIComponent(id)}`, {}, instance),
        this.VIDEO_RESOLVE_TIMEOUT_MS,
        'VIDEO_STREAM_TIMEOUT'
      );
      const videoStream = this.pickYoutubeVideoStream(streamData?.videoStreams || []);
      if (!videoStream?.url) return null;
      return {
        title: String(candidate?.title || streamData?.title || 'فيديو'),
        creator: String(candidate?.uploader || candidate?.author || streamData?.uploader || ''),
        url: String(videoStream.url),
        source: 'youtube_video'
      };
    } catch (_error) {
      return null;
    }
  }

  static async searchYoutubeVideos(query, limit = 5) {
    const q = String(query || '').trim();
    if (!q) return [];

    const instances = this.shuffleArray(this.YT_PIPED_INSTANCES);
    const fastInstances = instances.slice(0, Math.max(1, this.FAST_SEARCH_INSTANCES));
    const candidates = await this.fetchPipedSearchCandidates(q, fastInstances[0], ['videos'], Math.max(8, limit * 3))
      .catch(() => []);
    const htmlFallback = await this.fetchYoutubeHtmlCandidates(q, Math.max(8, limit * 3)).catch(() => []);

    const allCandidates = [];
    const seen = new Set();
    const sourceList = [...(Array.isArray(candidates) ? candidates : []), ...(Array.isArray(htmlFallback) ? htmlFallback : [])];
    for (const item of sourceList) {
      const id = String(item?.id || '').trim();
      if (!id) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      allCandidates.push(item);
    }

    const ranked = allCandidates
      .map((item) => ({
        item,
        score: this.scoreAudioCandidate(q, item?.title, item?.uploader || item?.author || '')
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.item)
      .slice(0, Math.max(limit * 3, 10));

    if (!ranked.length) return [];

    const results = [];
    for (const candidate of ranked) {
      if (results.length >= limit) break;
      const id = String(candidate?.id || '').trim();
      if (!id) continue;

      let resolved = null;
      for (const instance of instances) {
        resolved = await this.resolveYoutubeVideoById(id, instance, candidate);
        if (resolved?.url) break;
      }
      if (!resolved?.url) continue;

      const key = `${this.normalizeSearchText(resolved.title)}|${resolved.url}`;
      if (results.some((x) => `${this.normalizeSearchText(x.title)}|${x.url}` === key)) continue;
      results.push(resolved);
    }

    return results;
  }

  static async sendHotVideoResult(ctx, video) {
    const caption = '♪ تم التح🎧ميل بنجاح ♪';
    const safeTitle = this.cleanAudioLabel(video?.title || 'فيديو').slice(0, 120);
    const updatesButton = Markup.inlineKeyboard([
      [Markup.button.url('تحديثات جو', this.JOE_UPDATES_CHANNEL_URL)]
    ]);

    await ctx.replyWithVideo(
      { url: video.url },
      {
        caption,
        supports_streaming: true,
        reply_markup: updatesButton.reply_markup
      }
    );

    if (safeTitle) {
      await ctx.reply(`🎬 ${safeTitle}`).catch(() => {});
    }
  }

  static async handlePlayVideoCommand(ctx, queryText) {
    if (!['group', 'supergroup'].includes(ctx.chat?.type)) {
      await ctx.reply('❌ هذا الأمر للجروب فقط.');
      return;
    }

    const query = String(queryText || '').trim();
    if (!query) {
      await ctx.reply('❌ الصيغة:\nستارز فيديو اسم المقطع');
      return;
    }

    return this.enqueueAudioChatTask(ctx.chat?.id, async () => {
      const loadingMsg = await ctx.reply('🎧 جاري التحميل ....');
      try {
        let result = await this.resolveVideoWithYtDlp(query).catch(() => null);
        const directVideoId = this.parseYoutubeVideoIdFromUrl(query);
        if (!result?.url && directVideoId) {
          const instances = this.shuffleArray(this.YT_PIPED_INSTANCES);
          for (const instance of instances) {
            result = await this.resolveYoutubeVideoById(directVideoId, instance, { title: query });
            if (result?.url) break;
          }
        }

        if (!result?.url) {
          const list = await this.withTimeout(
            this.searchYoutubeVideos(query, 1),
            this.VIDEO_SEARCH_TIMEOUT_MS,
            'VIDEO_SEARCH_TIMEOUT'
          ).catch(() => []);
          result = list[0] || null;
        }

        await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
        if (!result?.url) {
          await ctx.reply('♪ عذرا غير متوفر ..');
          return;
        }

        await this.sendHotVideoResult(ctx, result);
      } catch (_error) {
        await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
        await ctx.reply('♪ عذرا غير متوفر ..');
      }
    });
  }

  static async searchYoutubeAudios(query, limit = 5) {
    const q = String(query || '').trim();
    if (!q) return [];

    const normalizedQuery = this.normalizeSearchText(q);
    const artistOnly = this.isArtistOnlyQuery(normalizedQuery);
    const variants = new Set(this.generateSearchVariants(normalizedQuery));
    const cleaned = this.stripNoiseFromSearchQuery(normalizedQuery);

    if (cleaned) {
      variants.add(cleaned);
      if (!artistOnly) {
        variants.add(`${cleaned} اغنية`);
        variants.add(`${cleaned} mp3`);
      }
    }
    if (!artistOnly) {
      variants.add(`${normalizedQuery} اغنية`);
      variants.add(`${normalizedQuery} mp3`);
      variants.add(`${normalizedQuery} lyrics`);
    }

    const instances = this.shuffleArray(this.YT_PIPED_INSTANCES);
    const fastInstances = instances.slice(0, Math.max(1, this.FAST_SEARCH_INSTANCES));
    const fallbackInstances = instances.slice(
      Math.max(1, this.FAST_SEARCH_INSTANCES),
      Math.max(1, this.FAST_SEARCH_INSTANCES) + Math.max(1, this.FAST_SEARCH_FALLBACK_INSTANCES)
    );
    const variantList = Array.from(variants);
    const maxVariants = Math.min(variantList.length, Math.max(this.AUDIO_QUERY_MAX_VARIANTS, 8));

    const collectCandidates = async (text, useInstances = fastInstances, maxResults = this.FAST_YT_PER_QUERY_LIMIT) => {
      const requestInstances = Array.isArray(useInstances) && useInstances.length ? useInstances : fastInstances;
      const requestLimit = Number(maxResults) > 0 ? Number(maxResults) : this.FAST_YT_PER_QUERY_LIMIT;
      const buckets = await Promise.allSettled(
        requestInstances.map((instance) => this.withTimeout(
          this.fetchPipedSearchCandidates(text, instance, ['music_songs', 'videos', 'music_videos'], requestLimit).catch(() => []),
          this.AUDIO_FAST_TIMEOUT_MS,
          'AUDIO_SEARCH_TIMEOUT'
        ).catch(() => []))
      );
      const htmlFallback = await this.fetchYoutubeHtmlCandidates(text, requestLimit).catch(() => []);
      const candidates = [];
      const seen = new Set();
      for (const bucket of buckets) {
        if (bucket.status !== 'fulfilled') continue;
        for (const item of Array.isArray(bucket.value) ? bucket.value : []) {
          if (!item?.id || !['stream', 'video'].includes(item?.type)) continue;
          const key = this.normalizeSearchText(item.id);
          if (seen.has(key)) continue;
          seen.add(key);
          candidates.push(item);
        }
      }
      for (const item of Array.isArray(htmlFallback) ? htmlFallback : []) {
        if (!item?.id || !['stream', 'video'].includes(item?.type)) continue;
        const key = this.normalizeSearchText(item.id);
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push(item);
      }
      return candidates;
    };

    const fastVariants = variantList
      .slice(0, Math.min(this.AUDIO_QUERY_FAST_VARIANTS, maxVariants));
    const collectTasks = fastVariants
      .map((variant) => collectCandidates(String(variant || '').trim(), fastInstances, this.FAST_YT_PER_QUERY_LIMIT));
    const collectSettled = await Promise.allSettled(collectTasks);
    const dedup = new Map();
    for (const bucket of collectSettled) {
      if (bucket.status !== 'fulfilled') continue;
      for (const candidate of Array.isArray(bucket.value) ? bucket.value : []) {
        if (!candidate?.id) continue;
        const key = this.normalizeSearchText(candidate.id);
        if (!dedup.has(key)) dedup.set(key, candidate);
      }
    }

    const rankingEntries = Array.from(dedup.values())
      .map((item) => {
        const creator = item?.uploader || item?.author || '';
        const text = `${creator} ${item?.title || ''}`;
        const titleNormalized = this.normalizeSearchText(item?.title || '');
        const creatorNormalized = this.normalizeSearchText(creator || '');
        const cleanQuery = cleaned || normalizedQuery;
        const exactPhrase = this.hasOrderedTokenMatch(cleanQuery, text) ? 90 : 0;
        const orderedMatch = this.hasOrderedTokenMatch(cleaned, text) ? 35 : 0;
        const titleCreatorMatch = this.isMatchForRequest(normalizedQuery, item?.title, creator) ? 30 : 0;
        const ratio = this.queryMatchRatio(cleanQuery, text);
        const ratioBonus = ratio >= this.AUDIO_STRICT_MATCH_RATIO ? 25 : 0;
        const strictMatchBonus = ratio >= 0.9 ? 20 : 0;
        const cleanMatchPenalty = this.isArtistOnlyQuery(normalizedQuery)
          ? ((this.hasOrderedTokenMatch(cleanQuery, creatorNormalized) || this.hasOrderedTokenMatch(cleanQuery, titleNormalized)) ? 0 : -40)
          : 0;
        return {
          item,
          score: this.scoreAudioCandidate(normalizedQuery, item?.title, creator)
            + exactPhrase + orderedMatch + titleCreatorMatch + ratioBonus + strictMatchBonus + cleanMatchPenalty
        };
      })
      .sort((a, b) => b.score - a.score || this.queryMatchRatio(cleaned || normalizedQuery, `${b.item?.uploader || b.item?.author || ''} ${b.item?.title || ''}`) - this.queryMatchRatio(cleaned || normalizedQuery, `${a.item?.uploader || a.item?.author || ''} ${a.item?.title || ''}`));

    let ranked = rankingEntries.map((entry) => entry.item);

    if (!ranked.length) {
      const seedQueries = [];
      const [spotifySeeds, soundSeeds] = await Promise.all([
        this.searchSpotifySeeds(q, 4).catch(() => []),
        this.searchSoundCloudSeeds(q, 3).catch(() => [])
      ]);
      for (const seed of [...spotifySeeds, ...soundSeeds]) {
        const text = this.normalizeSearchText(seed?.query || '');
        if (text) seedQueries.push(text);
      }

      if (seedQueries.length) {
        const seededBuckets = await Promise.allSettled(
          seedQueries.slice(0, 5).map((text) => collectCandidates(text, fallbackInstances, Math.min(this.FAST_YT_PER_QUERY_LIMIT, 8)))
        );
        for (const bucket of seededBuckets) {
          if (bucket.status !== 'fulfilled') continue;
          for (const item of Array.isArray(bucket.value) ? bucket.value : []) {
            if (!item?.id) continue;
            const key = this.normalizeSearchText(item.id);
            if (!dedup.has(key)) dedup.set(key, item);
          }
        }
        ranked = Array.from(dedup.values())
          .map((item) => ({
            item,
            score: this.scoreAudioCandidate(normalizedQuery, item?.title, item?.uploader || item?.author || '')
          }))
          .sort((a, b) => b.score - a.score)
          .map((entry) => entry.item);
      }
    }

    if (!ranked.length) {
      const archive = await this.searchArchiveAudio(q).catch(() => null);
      if (archive?.url) return this.uniqueAudioResults([archive], limit);
      return [];
    }

    const queryTokens = this.queryTokens(cleaned || normalizedQuery);
    const candidatesToResolve = ranked
      .filter((item) => item?.title || item?.uploader || item?.author)
      .slice(0, Math.max(limit * 3, this.FAST_SEARCH_MIN_MATCHES, 8));

    // إذا كانت النتائج قليلة جدًا، أضف بحث إضافي سريع من متغيرات إضافية قبل الترسيم النهائي.
    if (candidatesToResolve.length < this.FAST_SEARCH_MIN_MATCHES && maxVariants > this.AUDIO_QUERY_FAST_VARIANTS) {
      const fallbackVariants = variantList
        .slice(this.AUDIO_QUERY_FAST_VARIANTS, maxVariants);
      const fallbackTasks = fallbackVariants.map((variant) => collectCandidates(
        String(variant || '').trim(),
        fallbackInstances,
        Math.min(this.FAST_YT_PER_QUERY_LIMIT, 8)
      ));
      const fallbackSettled = await Promise.allSettled(fallbackTasks);

      const fallbackCandidates = [];
      const seenFallback = new Set(ranked.map((item) => this.normalizeSearchText(item?.id || item?.title || '')));
      for (const bucket of fallbackSettled) {
        if (bucket.status !== 'fulfilled') continue;
        for (const item of Array.isArray(bucket.value) ? bucket.value : []) {
          if (!item?.id) continue;
          const key = this.normalizeSearchText(item.id);
          if (seenFallback.has(key)) continue;
          seenFallback.add(key);
          fallbackCandidates.push(item);
        }
      }

      if (fallbackCandidates.length) {
        const fallbackRanked = fallbackCandidates
          .map((item) => ({
            item,
            score: this.scoreAudioCandidate(normalizedQuery, item?.title, item?.uploader || item?.author || '')
              + (this.hasOrderedTokenMatch(cleaned || normalizedQuery, `${item?.uploader || item?.author || ''} ${item?.title || ''}`) ? 25 : 0)
              + (this.isMatchForRequest(normalizedQuery, item?.title, item?.uploader || item?.author || '') ? 20 : 0)
          }))
          .sort((a, b) => b.score - a.score || this.queryMatchRatio(cleaned || normalizedQuery, `${b.item?.uploader || b.item?.author || ''} ${b.item?.title || ''}`) - this.queryMatchRatio(cleaned || normalizedQuery, `${a.item?.uploader || a.item?.author || ''} ${a.item?.title || ''}`))
          .map((entry) => entry.item);
        ranked = ranked.concat(fallbackRanked);
        candidatesToResolve.push(...fallbackRanked.filter((item) => !candidatesToResolve.includes(item)));
      }
    }

    const resolved = await this.withTimeout(
      this.resolveAudioCandidatesConcurrently(
        candidatesToResolve,
        instances,
        Math.max(limit, this.FAST_SEARCH_MIN_MATCHES)
      ),
      this.AUDIO_SEARCH_TIMEOUT_MS,
      'AUDIO_STREAM_TIMEOUT'
    ).catch(() => []);

    const final = this.uniqueAudioResults(Array.isArray(resolved) ? resolved : [], limit);
    if (final.length) return final;

    const archive = await this.searchArchiveAudio(q).catch(() => null);
    if (archive?.url) return this.uniqueAudioResults([archive], limit);
    return [];
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

  static getStarsCachedFileId(query) {
    const key = this.getAudioQueryCacheKey(query);
    if (!key) return '';
    const row = this.starsFileIdCache.get(key);
    if (!row) return '';
    if ((Date.now() - Number(row.createdAt || 0)) > this.STARS_FILEID_CACHE_TTL_MS) {
      this.starsFileIdCache.delete(key);
      return '';
    }
    return String(row.fileId || '');
  }

  static setStarsCachedFileId(query, fileId) {
    const key = this.getAudioQueryCacheKey(query);
    const fid = String(fileId || '').trim();
    if (!key || !fid) return;
    this.starsFileIdCache.set(key, { fileId: fid, createdAt: Date.now() });
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

  static withTimeout(promise, timeoutMs, timeoutCode = 'AUDIO_SEARCH_TIMEOUT') {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(timeoutCode)), Number(timeoutMs || 0));
      })
    ]);
  }

  static enqueueAudioChatTask(chatId, taskFn) {
    const key = String(chatId || '');
    if (!key) return taskFn();

    const current = this.audioChatQueue.get(key) || Promise.resolve();
    const next = current
      .catch(() => {})
      .then(() => taskFn());

    this.audioChatQueue.set(key, next);
    next.finally(() => {
      if (this.audioChatQueue.get(key) === next) this.audioChatQueue.delete(key);
    });
    return next;
  }

  static async buildAudioList(query) {
    let audioList = await this.resolveAudioListViaYtDlp(query, 5).catch(() => []);
    if (!audioList.length) {
      audioList = await this.searchYoutubeAudios(query, 5);
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

    const task = this.withTimeout(
      this.buildAudioList(query),
      this.AUDIO_SEARCH_TIMEOUT_MS
    )
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
    const query = String(queryText || '').trim();
    if (!query) {
      await ctx.reply('❌ الصيغة:\nستارز اسم المقطع');
      return;
    }

    return this.enqueueAudioChatTask(ctx.chat?.id, async () => {
      const loadingMsg = await ctx.reply('🎧 جاري التحميل ....');
      try {
        const cachedFileId = this.getStarsCachedFileId(query);
        if (cachedFileId) {
          await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
          const updatesButton = Markup.inlineKeyboard([
            [Markup.button.url('تحديثات جو', this.JOE_UPDATES_CHANNEL_URL)]
          ]);
          await ctx.replyWithAudio(cachedFileId, {
            caption: '♪ تم التح🎧ميل بنجاح ♪',
            reply_markup: updatesButton.reply_markup
          }).catch(() => {});
          return;
        }

        await ctx.telegram.editMessageText(
          ctx.chat.id,
          loadingMsg.message_id,
          undefined,
          '⏳ تجهيز الصوت...'
        ).catch(() => {});

        const audio = await this.resolveStarsAudio(query);

        await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
        if (!audio?.url) {
          await ctx.reply('♪ عذرا غير متوفر ..');
          return;
        }

        const sent = await this.sendHotAudioResult(ctx, audio, false);
        const fileId = String(sent?.audio?.file_id || '').trim();
        if (fileId) this.setStarsCachedFileId(query, fileId);
      } catch (_error) {
        await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
        await ctx.reply('♪ عذرا غير متوفر ..');
      }
    });
  }

  static async handleStarsPickAction(ctx) {
    const chatType = String(ctx.chat?.type || ctx.callbackQuery?.message?.chat?.type || '');
    if (!['group', 'supergroup'].includes(chatType)) {
      await ctx.answerCbQuery().catch(() => {});
      return;
    }

    const pickIndex = Number(ctx.match?.[1]);
    const cached = this.getStarsSelectionCache(ctx);
    if (!cached || !Array.isArray(cached.list) || !cached.list.length) {
      await ctx.answerCbQuery('ما في نتائج محفوظة، اكتب ستارز من جديد').catch(() => {});
      return;
    }
    if (!Number.isInteger(pickIndex) || pickIndex < 0 || pickIndex >= cached.list.length) {
      await ctx.answerCbQuery('اختيار غير صالح').catch(() => {});
      return;
    }

    const selected = cached.list[pickIndex];
    await ctx.answerCbQuery('جاري التحميل...').catch(() => {});
    const loadingMsg = await ctx.reply('🎧 جاري التحميل ....');
    try {
      const audio = await this.resolveAudioFromPickedItem(selected, cached.query).catch(() => null);
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
      if (!audio?.url) {
        await ctx.reply('♪ عذرا غير متوفر ..');
        return;
      }
      await this.sendHotAudioResult(ctx, audio, false);
    } catch (_error) {
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
      await ctx.reply('♪ عذرا غير متوفر ..');
    }
  }

  static async resolveAudioFromPickedItem(selected, fallbackQuery = '') {
    const item = selected || {};
    const candidateTargets = [];

    const webpage = String(item.webpageUrl || '').trim();
    const id = String(item.id || '').trim();
    const title = String(item.title || '').trim();
    const creator = String(item.creator || '').trim();

    if (webpage) candidateTargets.push(webpage);
    if (id) candidateTargets.push(`https://www.youtube.com/watch?v=${id}`);
    if (title || creator) {
      const lookup = `${title} ${creator}`.trim();
      if (lookup) candidateTargets.push(`ytsearch1:${lookup}`);
    }
    if (fallbackQuery) candidateTargets.push(`ytsearch1:${String(fallbackQuery).trim()}`);

    for (const target of candidateTargets) {
      if (!target) continue;
      const audio = await this.resolveAudioWithYtDlp(target).catch(() => null);
      if (audio?.url) return audio;
    }

    // آخر محاولة: محرك البحث الكامل الموجود عندنا (يشمل مصادر fallback).
    const fullQuery = `${title} ${creator}`.trim() || String(fallbackQuery || '').trim();
    if (fullQuery) {
      const list = await this.resolveAudioListWithCache(fullQuery).catch(() => []);
      if (Array.isArray(list) && list[0]?.url) return list[0];
    }
    return null;
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

