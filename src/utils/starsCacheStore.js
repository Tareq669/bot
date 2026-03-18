const fs = require('fs');
const path = require('path');

class StarsCacheStore {
  constructor() {
    this.enabled = false;
    this.db = null;
    this.fallback = {
      resultCache: new Map(),
      audioCache: new Map(),
      usedVideos: new Map()
    };
    this.init();
  }

  init() {
    try {
      // Node 22+ built-in sqlite (no external dependency needed)
      // eslint-disable-next-line global-require
      const sqlite = require('node:sqlite');
      const dbPath = path.join(process.cwd(), 'temp', 'stars_cache.sqlite');
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      this.db = new sqlite.DatabaseSync(dbPath);
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS stars_result_cache (
          query_key TEXT PRIMARY KEY,
          results_json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS stars_audio_cache (
          video_id TEXT PRIMARY KEY,
          file_id TEXT NOT NULL,
          title TEXT,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS stars_used_videos (
          chat_id TEXT NOT NULL,
          query_key TEXT NOT NULL,
          video_id TEXT NOT NULL,
          used_at INTEGER NOT NULL,
          PRIMARY KEY(chat_id, query_key, video_id)
        );
      `);
      this.enabled = true;
    } catch (_error) {
      this.enabled = false;
    }
  }

  getCachedResults(queryKey, maxAgeMs = 6 * 60 * 60 * 1000) {
    const now = Date.now();
    if (!queryKey) return [];
    if (!this.enabled || !this.db) {
      const row = this.fallback.resultCache.get(queryKey);
      if (!row) return [];
      if ((now - Number(row.updatedAt || 0)) > maxAgeMs) {
        this.fallback.resultCache.delete(queryKey);
        return [];
      }
      return Array.isArray(row.results) ? row.results : [];
    }
    const stmt = this.db.prepare('SELECT results_json, updated_at FROM stars_result_cache WHERE query_key = ?');
    const row = stmt.get(queryKey);
    if (!row) return [];
    if ((now - Number(row.updated_at || 0)) > maxAgeMs) {
      this.db.prepare('DELETE FROM stars_result_cache WHERE query_key = ?').run(queryKey);
      return [];
    }
    try {
      const parsed = JSON.parse(String(row.results_json || '[]'));
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  setCachedResults(queryKey, results = []) {
    if (!queryKey || !Array.isArray(results)) return;
    const updatedAt = Date.now();
    if (!this.enabled || !this.db) {
      this.fallback.resultCache.set(queryKey, { results, updatedAt });
      return;
    }
    this.db
      .prepare(`
        INSERT INTO stars_result_cache(query_key, results_json, updated_at)
        VALUES(?, ?, ?)
        ON CONFLICT(query_key) DO UPDATE SET
          results_json=excluded.results_json,
          updated_at=excluded.updated_at
      `)
      .run(queryKey, JSON.stringify(results), updatedAt);
  }

  getCachedFileId(videoId) {
    if (!videoId) return '';
    if (!this.enabled || !this.db) {
      const row = this.fallback.audioCache.get(videoId);
      return String(row?.fileId || '');
    }
    const stmt = this.db.prepare('SELECT file_id FROM stars_audio_cache WHERE video_id = ?');
    const row = stmt.get(videoId);
    return String(row?.file_id || '');
  }

  setCachedFileId(videoId, fileId, title = '') {
    if (!videoId || !fileId) return;
    const updatedAt = Date.now();
    if (!this.enabled || !this.db) {
      this.fallback.audioCache.set(videoId, { fileId, title, updatedAt });
      return;
    }
    this.db
      .prepare(`
        INSERT INTO stars_audio_cache(video_id, file_id, title, updated_at)
        VALUES(?, ?, ?, ?)
        ON CONFLICT(video_id) DO UPDATE SET
          file_id=excluded.file_id,
          title=excluded.title,
          updated_at=excluded.updated_at
      `)
      .run(videoId, fileId, title, updatedAt);
  }

  getUsedVideoSet(chatId, queryKey) {
    const c = String(chatId || '');
    const q = String(queryKey || '');
    if (!c || !q) return new Set();
    const key = `${c}:${q}`;
    if (!this.enabled || !this.db) {
      const row = this.fallback.usedVideos.get(key);
      return new Set(Array.isArray(row) ? row : []);
    }
    const stmt = this.db.prepare('SELECT video_id FROM stars_used_videos WHERE chat_id = ? AND query_key = ?');
    const rows = stmt.all(c, q) || [];
    return new Set(rows.map((r) => String(r.video_id || '')).filter(Boolean));
  }

  markVideoUsed(chatId, queryKey, videoId) {
    const c = String(chatId || '');
    const q = String(queryKey || '');
    const v = String(videoId || '');
    if (!c || !q || !v) return;
    const usedAt = Date.now();
    if (!this.enabled || !this.db) {
      const key = `${c}:${q}`;
      const set = this.getUsedVideoSet(c, q);
      set.add(v);
      this.fallback.usedVideos.set(key, Array.from(set));
      return;
    }
    this.db
      .prepare(`
        INSERT INTO stars_used_videos(chat_id, query_key, video_id, used_at)
        VALUES(?, ?, ?, ?)
        ON CONFLICT(chat_id, query_key, video_id) DO UPDATE SET
          used_at=excluded.used_at
      `)
      .run(c, q, v, usedAt);
  }

  clearUsedVideos(chatId, queryKey) {
    const c = String(chatId || '');
    const q = String(queryKey || '');
    if (!c || !q) return;
    if (!this.enabled || !this.db) {
      this.fallback.usedVideos.delete(`${c}:${q}`);
      return;
    }
    this.db.prepare('DELETE FROM stars_used_videos WHERE chat_id = ? AND query_key = ?').run(c, q);
  }
}

module.exports = new StarsCacheStore();

