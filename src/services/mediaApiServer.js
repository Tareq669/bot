const fs = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const { logger } = require('../utils/helpers');

const PORT = Number(process.env.MEDIA_API_PORT || 3300);
const DB_PATH = path.resolve(process.env.MEDIA_DB_PATH || path.join(process.cwd(), 'storage', 'media-cache.sqlite'));
const WORKER_BASE_URL = String(process.env.MEDIA_WORKER_BASE_URL || 'http://127.0.0.1:3400').trim().replace(/\/+$/, '');
const WORKER_TOKEN = String(process.env.MEDIA_WORKER_TOKEN || '').trim();
const API_TOKEN = String(process.env.MEDIA_API_TOKEN || '').trim();
const YOUTUBE_API_KEY = String(process.env.YOUTUBE_DATA_API_KEY || process.env.YOUTUBE_API_KEY || '').trim();
const CACHE_TTL_DAYS = Math.max(1, Number(process.env.MEDIA_CACHE_TTL_DAYS || 120));

const app = express();

function ensureDbDir() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

ensureDbDir();
const db = new sqlite3.Database(DB_PATH);

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      return resolve(this);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      return resolve(row || null);
    });
  });
}

async function initDb() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      query_key TEXT NOT NULL,
      title TEXT NOT NULL,
      video_id TEXT NOT NULL UNIQUE,
      youtube_url TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_songs_query_key ON songs (query_key)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_songs_last_used ON songs (last_used_at)`);
}

function normalizeQuery(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function isAuthorized(req) {
  if (!API_TOKEN) return true;
  const token = String(req.headers['x-media-token'] || req.query.token || '').trim();
  return token && token === API_TOKEN;
}

async function searchYoutubeFirst(query) {
  if (!YOUTUBE_API_KEY) {
    throw new Error('MISSING_YOUTUBE_API_KEY');
  }

  const { data } = await axios.get('https://www.googleapis.com/youtube/v3/search', {
    params: {
      part: 'snippet',
      q: query,
      maxResults: 1,
      type: 'video',
      key: YOUTUBE_API_KEY
    },
    timeout: 15000
  });

  const item = Array.isArray(data?.items) ? data.items[0] : null;
  const videoId = String(item?.id?.videoId || '').trim();
  const title = String(item?.snippet?.title || query).trim();
  if (!videoId) throw new Error('YOUTUBE_NO_RESULTS');
  return {
    videoId,
    title,
    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`
  };
}

async function requestWorkerDownload(videoUrl) {
  const headers = {};
  if (WORKER_TOKEN) headers['x-worker-token'] = WORKER_TOKEN;
  const { data } = await axios.get(`${WORKER_BASE_URL}/download`, {
    params: { url: videoUrl },
    headers,
    timeout: 180000
  });
  const fileUrl = String(data?.fileUrl || '').trim();
  const filePath = String(data?.filePath || '').trim();
  if (!fileUrl) throw new Error('WORKER_EMPTY_FILE_URL');
  return { fileUrl, filePath };
}

async function cleanupOldCache() {
  const stmt = `DELETE FROM songs WHERE datetime(last_used_at) < datetime('now', ?)`;
  const ttlExpr = `-${CACHE_TTL_DAYS} day`;
  await dbRun(stmt, [ttlExpr]).catch(() => {});
}

app.get('/health', async (_req, res) => {
  res.json({
    ok: true,
    service: 'media-api',
    worker: WORKER_BASE_URL,
    cacheTtlDays: CACHE_TTL_DAYS
  });
});

app.get('/search', async (req, res) => {
  try {
    if (!isAuthorized(req)) {
      return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
    }

    const query = String(req.query.q || '').trim();
    if (!query) {
      return res.status(400).json({ ok: false, error: 'MISSING_QUERY' });
    }

    const queryKey = normalizeQuery(query);
    const cached = await dbGet(
      `SELECT * FROM songs WHERE query_key = ? ORDER BY last_used_at DESC LIMIT 1`,
      [queryKey]
    );

    if (cached) {
      await dbRun(
        `UPDATE songs SET last_used_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [cached.id]
      ).catch(() => {});
      return res.json({
        ok: true,
        source: 'cache',
        query,
        title: cached.title,
        videoId: cached.video_id,
        youtubeUrl: cached.youtube_url,
        fileUrl: cached.file_url,
        filePath: cached.file_path || ''
      });
    }

    const yt = await searchYoutubeFirst(query);
    const worker = await requestWorkerDownload(yt.youtubeUrl);

    await dbRun(
      `INSERT INTO songs (query, query_key, title, video_id, youtube_url, file_url, file_path)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(video_id) DO UPDATE SET
         query = excluded.query,
         query_key = excluded.query_key,
         title = excluded.title,
         youtube_url = excluded.youtube_url,
         file_url = excluded.file_url,
         file_path = excluded.file_path,
         updated_at = CURRENT_TIMESTAMP,
         last_used_at = CURRENT_TIMESTAMP`,
      [query, queryKey, yt.title, yt.videoId, yt.youtubeUrl, worker.fileUrl, worker.filePath]
    );

    cleanupOldCache().catch(() => {});
    return res.json({
      ok: true,
      source: 'new',
      query,
      title: yt.title,
      videoId: yt.videoId,
      youtubeUrl: yt.youtubeUrl,
      fileUrl: worker.fileUrl,
      filePath: worker.filePath
    });
  } catch (error) {
    logger.error('MEDIA_API_SEARCH_FAILED', error?.message || error);
    return res.status(500).json({
      ok: false,
      error: String(error?.message || 'MEDIA_API_FAILED')
    });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`MEDIA_API_RUNNING port=${PORT} db="${DB_PATH}" worker="${WORKER_BASE_URL}"`);
    });
  })
  .catch((error) => {
    logger.error('MEDIA_API_INIT_FAILED', error);
    process.exit(1);
  });
