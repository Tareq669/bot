const fs = require('fs');
const path = require('path');
const express = require('express');
const ytdlp = require('yt-dlp-exec');
const { logger } = require('../utils/helpers');

const app = express();

const PORT = Number(process.env.MEDIA_WORKER_PORT || 3400);
const HOST = String(process.env.MEDIA_WORKER_HOST || '0.0.0.0').trim();
const TOKEN = String(process.env.MEDIA_WORKER_TOKEN || '').trim();
const BASE_PUBLIC_URL = String(process.env.MEDIA_WORKER_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
const MEDIA_DIR = path.resolve(process.env.MEDIA_STORAGE_DIR || path.join(process.cwd(), 'storage', 'downloads'));

const activeDownloads = new Map();

function ensureStorageDir() {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

function isAuthorized(req) {
  if (!TOKEN) return true;
  const token = String(req.headers['x-worker-token'] || req.query.token || '').trim();
  return token && token === TOKEN;
}

function getVideoId(input = '') {
  const raw = String(input || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (u.hostname.includes('youtube.com')) {
      return String(u.searchParams.get('v') || '').trim();
    }
    if (u.hostname.includes('youtu.be')) {
      return String(u.pathname || '').replace(/^\/+/, '').trim();
    }
  } catch (_error) {
    // ignore
  }
  return '';
}

function firstExistingFile(videoId) {
  const safe = String(videoId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safe) return '';
  const exts = ['mp3', 'm4a', 'webm', 'opus'];
  for (const ext of exts) {
    const candidate = path.join(MEDIA_DIR, `${safe}.${ext}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return '';
}

function toPublicFileUrl(fileName) {
  const encoded = encodeURIComponent(fileName);
  if (BASE_PUBLIC_URL) return `${BASE_PUBLIC_URL}/media/${encoded}`;
  return `/media/${encoded}`;
}

async function downloadAudio(videoUrl) {
  const videoId = getVideoId(videoUrl);
  if (!videoId) throw new Error('INVALID_YOUTUBE_URL');

  const existing = firstExistingFile(videoId);
  if (existing) {
    return {
      filePath: existing,
      fileName: path.basename(existing)
    };
  }

  if (activeDownloads.has(videoId)) {
    return activeDownloads.get(videoId);
  }

  const task = (async () => {
    const outTemplate = path.join(MEDIA_DIR, `${videoId}.%(ext)s`);
    await ytdlp(videoUrl, {
      noWarnings: true,
      noCheckCertificates: true,
      preferFreeFormats: true,
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: '0',
      output: outTemplate
    });

    const after = firstExistingFile(videoId);
    if (!after) {
      throw new Error('DOWNLOAD_FINISHED_BUT_FILE_NOT_FOUND');
    }

    return {
      filePath: after,
      fileName: path.basename(after)
    };
  })();

  activeDownloads.set(videoId, task);
  try {
    return await task;
  } finally {
    activeDownloads.delete(videoId);
  }
}

app.use('/media', express.static(MEDIA_DIR, {
  immutable: false,
  maxAge: '1d',
  etag: true
}));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'media-worker',
    mediaDir: MEDIA_DIR,
    activeDownloads: activeDownloads.size
  });
});

app.get('/download', async (req, res) => {
  try {
    if (!isAuthorized(req)) {
      return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
    }

    const url = String(req.query.url || '').trim();
    if (!url) {
      return res.status(400).json({ ok: false, error: 'MISSING_URL' });
    }

    const result = await downloadAudio(url);
    return res.json({
      ok: true,
      filePath: result.filePath,
      fileName: result.fileName,
      fileUrl: toPublicFileUrl(result.fileName)
    });
  } catch (error) {
    logger.error('MEDIA_WORKER_DOWNLOAD_FAILED', error?.message || error);
    return res.status(500).json({
      ok: false,
      error: String(error?.message || 'DOWNLOAD_FAILED')
    });
  }
});

ensureStorageDir();
app.listen(PORT, HOST, () => {
  logger.info(`MEDIA_WORKER_RUNNING host=${HOST} port=${PORT} storage="${MEDIA_DIR}"`);
});
