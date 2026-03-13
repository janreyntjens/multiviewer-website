const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Redis } = require('@upstash/redis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', true);

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Downloads data file
const downloadsFile = path.join(__dirname, 'downloads.json');
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const DOWNLOADS_REDIS_KEY = process.env.DOWNLOADS_REDIS_KEY || 'multiviewer:downloads';

const redis = REDIS_URL && REDIS_TOKEN
  ? new Redis({
      url: REDIS_URL,
      token: REDIS_TOKEN
    })
  : null;

function createDefaultData() {
  return {
    software: {
      multiviewer: {
        name: 'MultiViewer',
        count: 0,
        lastDownload: null,
        history: []
      },
      ledlogger: {
        name: 'LED Logger',
        count: 0,
        lastDownload: null,
        history: []
      }
    }
  };
}

// Ensure downloads.json file exists
function initializeDownloadsFile() {
  if (!fs.existsSync(downloadsFile)) {
    fs.writeFileSync(downloadsFile, JSON.stringify(createDefaultData(), null, 2));
  }
}

function readLocalDownloadsData() {
  initializeDownloadsFile();
  const fileData = JSON.parse(fs.readFileSync(downloadsFile, 'utf8'));
  return normalizeData(fileData);
}

function normalizeData(inputData) {
  const fallbackData = createDefaultData();

  if (!inputData || typeof inputData !== 'object' || Array.isArray(inputData)) {
    return fallbackData;
  }

  const data = inputData;
  if (!data.software || typeof data.software !== 'object' || Array.isArray(data.software)) {
    data.software = {};
  }

  for (const [softwareKey, defaults] of Object.entries(fallbackData.software)) {
    const current = data.software[softwareKey] || {};

    const history = Array.isArray(current.history)
      ? current.history
          .filter(item => item && typeof item === 'object')
          .map(item => ({
            ip: item.ip || 'Unknown',
            timestamp: item.timestamp || null,
            country: item.country || null,
            city: item.city || null
          }))
      : [];

    data.software[softwareKey] = {
      name: typeof current.name === 'string' && current.name ? current.name : defaults.name,
      count: Number.isFinite(current.count) ? Math.max(0, Number(current.count)) : defaults.count,
      lastDownload: current.lastDownload || null,
      history
    };
  }

  return data;
}

async function loadDownloadsData() {
  if (redis) {
    try {
      const redisData = await redis.get(DOWNLOADS_REDIS_KEY);
      if (!redisData) {
        const localData = readLocalDownloadsData();
        await redis.set(DOWNLOADS_REDIS_KEY, localData);
        return localData;
      }
      return normalizeData(redisData);
    } catch (error) {
      console.error('Redis read failed, falling back to local file:', error.message);
    }
  }

  return readLocalDownloadsData();
}

async function saveDownloadsData(data) {
  const normalizedData = normalizeData(data);

  if (redis) {
    try {
      await redis.set(DOWNLOADS_REDIS_KEY, normalizedData);
      return;
    } catch (error) {
      console.error('Redis write failed, falling back to local file:', error.message);
    }
  }

  fs.writeFileSync(downloadsFile, JSON.stringify(normalizedData, null, 2));
}

// Admin password
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'JacksonU79m!';

// Admin authentication check
function checkAdmin(req) {
  const password = req.headers['x-admin-password'];
  return password === ADMIN_PASSWORD;
}

function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

function getClientIp(req) {
  const possibleHeaders = [
    req.headers['cf-connecting-ip'],
    req.headers['x-real-ip'],
    req.headers['x-vercel-forwarded-for'],
    req.headers['x-forwarded-for']
  ];

  for (const rawHeaderValue of possibleHeaders) {
    if (!rawHeaderValue) {
      continue;
    }

    const value = Array.isArray(rawHeaderValue) ? rawHeaderValue[0] : rawHeaderValue;
    if (!value) {
      continue;
    }

    let ip = value.toString().split(',')[0].trim();

    if (ip.startsWith('::ffff:')) {
      ip = ip.replace('::ffff:', '');
    }

    if (ip === '::1') {
      ip = '127.0.0.1';
    }

    if (ip) {
      return ip;
    }
  }

  let fallbackIp = (req.ip || req.socket.remoteAddress || 'Unknown').toString().trim();
  if (fallbackIp.startsWith('::ffff:')) {
    fallbackIp = fallbackIp.replace('::ffff:', '');
  }
  if (fallbackIp === '::1') {
    fallbackIp = '127.0.0.1';
  }
  return fallbackIp;
}

// Increment download counter (public)
app.post('/api/download/:software', asyncHandler(async (req, res) => {
  const software = req.params.software;
  const clientIp = getClientIp(req);

  const data = await loadDownloadsData();
  
  if (!data.software[software]) {
    return res.status(404).json({ error: 'Software not found' });
  }
  
  const timestamp = new Date().toISOString();
  
  // Initialize history if doesn't exist
  if (!data.software[software].history) {
    data.software[software].history = [];
  }
  
  // Add to history
  data.software[software].history.push({
    ip: clientIp,
    timestamp: timestamp,
    country: null,
    city: null
  });
  
  // Keep only last 100 downloads
  if (data.software[software].history.length > 100) {
    data.software[software].history = data.software[software].history.slice(-100);
  }
  
  data.software[software].count += 1;
  data.software[software].lastDownload = timestamp;

  await saveDownloadsData(data);
  res.json({ success: true });
}));

// Admin: Get download stats
app.get('/api/admin/downloads', asyncHandler(async (req, res) => {
  if (!checkAdmin(req)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const data = await loadDownloadsData();
  res.json(data.software);
}));

// Admin: Reset counter
app.post('/api/admin/reset', asyncHandler(async (req, res) => {
  if (!checkAdmin(req)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  await saveDownloadsData(createDefaultData());
  res.json({ success: true, message: 'All counters reset' });
}));

// Admin: Get download history with geolocation
app.get('/api/admin/history/:software', asyncHandler(async (req, res) => {
  if (!checkAdmin(req)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const software = req.params.software;
  const data = await loadDownloadsData();
  
  if (!data.software[software]) {
    return res.status(404).json({ error: 'Software not found' });
  }
  
  const history = data.software[software].history || [];
  res.json(history);
}));

// Admin: Delete one download history entry
app.delete('/api/admin/history/:software/:index', asyncHandler(async (req, res) => {
  if (!checkAdmin(req)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const software = req.params.software;
  const index = Number.parseInt(req.params.index, 10);

  if (!Number.isInteger(index) || index < 0) {
    return res.status(400).json({ error: 'Invalid index' });
  }

  const data = await loadDownloadsData();

  if (!data.software[software]) {
    return res.status(404).json({ error: 'Software not found' });
  }

  if (!data.software[software].history) {
    data.software[software].history = [];
  }

  if (index >= data.software[software].history.length) {
    return res.status(404).json({ error: 'History entry not found' });
  }

  data.software[software].history.splice(index, 1);
  data.software[software].count = Math.max(0, data.software[software].count - 1);

  if (data.software[software].history.length === 0) {
    data.software[software].lastDownload = null;
  } else {
    const latestTimestamp = data.software[software].history
      .map(item => item.timestamp)
      .sort()
      .pop();
    data.software[software].lastDownload = latestTimestamp || null;
  }

  await saveDownloadsData(data);
  res.json({ success: true, message: 'History entry deleted' });
}));

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin.html'));
});

app.use((error, req, res, next) => {
  console.error('Unhandled server error:', error);
  if (res.headersSent) {
    return next(error);
  }
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(redis ? 'Persistent store: Upstash Redis' : 'Persistent store: local downloads.json');
  console.log('Press CTRL+C to stop');
});

// Export for Vercel serverless
module.exports = app;
