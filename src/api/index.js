/**
 * Workr API Router
 */

const queue = require('../queue');
const { getAdminHTML } = require('./admin');
const { getDocsHTML } = require('./docs');

// SSE 連線
const sseClients = new Set();

// 解析 body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// JSON 回應
function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// 廣播 SSE
function broadcast(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(message);
  }
}

// 監聽 Queue 事件
queue.on('job:started', job => broadcast('job:started', job));
queue.on('job:progress', data => broadcast('job:progress', data));
queue.on('job:completed', job => broadcast('job:completed', job));
queue.on('job:failed', job => broadcast('job:failed', job));

// Router
async function router(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;
  const method = req.method;

  try {
    // Admin Dashboard
    if (pathname === '/admin' || pathname === '/admin/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(getAdminHTML());
    }

    // Documentation
    if (pathname === '/docs' || pathname === '/docs/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(getDocsHTML());
    }

    // Health check
    if (pathname === '/health') {
      return json(res, { ok: true, ...queue.stats() });
    }

    // SSE Events
    if (pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      sseClients.add(res);
      res.write('event: connected\ndata: {}\n\n');

      req.on('close', () => sseClients.delete(res));
      return;
    }

    // GET /api/jobs - 列出任務
    if (method === 'GET' && pathname === '/api/jobs') {
      const status = url.searchParams.get('status');
      const type = url.searchParams.get('type');
      const limit = parseInt(url.searchParams.get('limit')) || 20;

      const jobs = queue.list({ status, type, limit });
      return json(res, { jobs, ...queue.stats() });
    }

    // POST /api/jobs - 提交任務
    if (method === 'POST' && pathname === '/api/jobs') {
      const body = await parseBody(req);

      if (!body.type || !body.payload) {
        return json(res, { error: 'Missing type or payload' }, 400);
      }

      const validTypes = ['thumbnail', 'webp', 'hls', 'download', 'proxy', 'deploy'];
      if (!validTypes.includes(body.type)) {
        return json(res, { error: `Invalid type. Valid: ${validTypes.join(', ')}` }, 400);
      }

      const job = queue.add(body.type, body.payload, {
        priority: body.priority,
        callback: body.callback,
        maxRetries: body.maxRetries
      });

      return json(res, {
        jobId: job.id,
        status: job.status,
        createdAt: job.createdAt
      }, 201);
    }

    // GET /api/jobs/:id - 查詢任務
    if (method === 'GET' && pathname.startsWith('/api/jobs/')) {
      const jobId = pathname.replace('/api/jobs/', '');
      const job = queue.get(jobId);

      if (!job) {
        return json(res, { error: 'Job not found' }, 404);
      }

      return json(res, job);
    }

    // DELETE /api/jobs/:id - 取消任務
    if (method === 'DELETE' && pathname.startsWith('/api/jobs/')) {
      const jobId = pathname.replace('/api/jobs/', '');
      const job = queue.cancel(jobId);

      if (!job) {
        return json(res, { error: 'Job not found or cannot be cancelled' }, 404);
      }

      return json(res, { jobId: job.id, status: job.status });
    }

    // GET /api/stats - 統計
    if (method === 'GET' && pathname === '/api/stats') {
      return json(res, queue.stats());
    }

    // 404
    json(res, { error: 'Not found' }, 404);

  } catch (e) {
    console.error('[api] Error:', e);
    json(res, { error: e.message }, 500);
  }
}

module.exports = { router, broadcast };
