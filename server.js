/**
 * Workr - Universal Job Queue Platform
 */

const http = require('http');
const { router } = require('./src/api');
const { startWorkers } = require('./src/workers');
const queue = require('./src/queue');

const PORT = process.env.PORT || 4002;
const API_KEY = process.env.WORKR_API_KEY || 'dev-key';

// HTTP Server
const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Auth check (except health, admin, events)
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const publicPaths = ['/health', '/admin', '/admin/', '/api/events', '/api/jobs', '/api/stats'];
  const isPublic = publicPaths.some(p => url.pathname === p || url.pathname.startsWith('/api/jobs/'));

  if (!isPublic) {
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${API_KEY}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }
  }

  router(req, res);
});

server.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  WORKR - Job Queue Platform');
  console.log('========================================');
  console.log('');
  console.log(`  Port: ${PORT}`);
  console.log(`  API:  http://localhost:${PORT}/api/jobs`);
  console.log('');
  console.log('  Job Types:');
  console.log('    - thumbnail  (video thumbnail)');
  console.log('    - webp       (image conversion)');
  console.log('    - hls        (video transcoding)');
  console.log('    - download   (file download)');
  console.log('');
  console.log('========================================');
  console.log('');

  // Start workers
  startWorkers();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[workr] Shutting down...');
  queue.stop();
  process.exit(0);
});

module.exports = server;
