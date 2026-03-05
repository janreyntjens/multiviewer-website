const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Downloads data file
const downloadsFile = path.join(__dirname, 'downloads.json');

// Ensure downloads.json file exists
function initializeDownloadsFile() {
  if (!fs.existsSync(downloadsFile)) {
    fs.writeFileSync(downloadsFile, JSON.stringify({ 
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
    }, null, 2));
  }
}

// Admin password
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'JacksonU79m!';

// Admin authentication check
function checkAdmin(req) {
  const password = req.headers['x-admin-password'];
  return password === ADMIN_PASSWORD;
}

// Increment download counter (public)
app.post('/api/download/:software', (req, res) => {
  const software = req.params.software;
  let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
  
  // Convert IPv6 localhost to IPv4
  if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
    clientIp = '127.0.0.1';
  }
  
  initializeDownloadsFile();
  const data = JSON.parse(fs.readFileSync(downloadsFile, 'utf8'));
  
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
  fs.writeFileSync(downloadsFile, JSON.stringify(data, null, 2));
  res.json({ success: true });
});

// Admin: Get download stats
app.get('/api/admin/downloads', (req, res) => {
  if (!checkAdmin(req)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  initializeDownloadsFile();
  const data = JSON.parse(fs.readFileSync(downloadsFile, 'utf8'));
  res.json(data.software);
});

// Admin: Reset counter
app.post('/api/admin/reset', (req, res) => {
  if (!checkAdmin(req)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  fs.writeFileSync(downloadsFile, JSON.stringify({ 
    software: {
      multiviewer: { name: 'MultiViewer', count: 0, lastDownload: null },
      ledlogger: { name: 'LED Logger', count: 0, lastDownload: null }
    }
  }, null, 2));
  res.json({ success: true, message: 'All counters reset' });
});

// Admin: Get download history with geolocation
app.get('/api/admin/history/:software', (req, res) => {
  if (!checkAdmin(req)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const software = req.params.software;
  initializeDownloadsFile();
  const data = JSON.parse(fs.readFileSync(downloadsFile, 'utf8'));
  
  if (!data.software[software]) {
    return res.status(404).json({ error: 'Software not found' });
  }
  
  const history = data.software[software].history || [];
  res.json(history);
});

// Admin: Delete one download history entry
app.delete('/api/admin/history/:software/:index', (req, res) => {
  if (!checkAdmin(req)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const software = req.params.software;
  const index = Number.parseInt(req.params.index, 10);

  if (!Number.isInteger(index) || index < 0) {
    return res.status(400).json({ error: 'Invalid index' });
  }

  initializeDownloadsFile();
  const data = JSON.parse(fs.readFileSync(downloadsFile, 'utf8'));

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
  data.software[software].count = Math.max(0, data.software[software].history.length);

  if (data.software[software].history.length === 0) {
    data.software[software].lastDownload = null;
  } else {
    const latestTimestamp = data.software[software].history
      .map(item => item.timestamp)
      .sort()
      .pop();
    data.software[software].lastDownload = latestTimestamp || null;
  }

  fs.writeFileSync(downloadsFile, JSON.stringify(data, null, 2));
  res.json({ success: true, message: 'History entry deleted' });
});

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('Press CTRL+C to stop');
});

// Export for Vercel serverless
module.exports = app;
