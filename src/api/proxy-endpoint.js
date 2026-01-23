/**
 * Direct Proxy Endpoint
 * 直接代理端點，無需提交 job
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * 直接代理請求
 * GET /proxy?url=https://example.com
 * POST /proxy?url=https://example.com (with body)
 */
async function handleProxyRequest(req, res) {
  const reqUrl = new URL(req.url, 'http://localhost');
  const targetUrl = reqUrl.searchParams.get('url');

  if (!targetUrl) {
    res.writeHead(400, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    return res.end(JSON.stringify({
      error: 'Missing url parameter',
      usage: 'GET /proxy?url=https://example.com'
    }));
  }

  try {
    const target = new URL(targetUrl);
    const protocol = target.protocol === 'https:' ? https : http;

    // 只保留安全的 headers，過濾掉瀏覽器特定的 headers
    const safeHeaders = {};
    const allowedHeaders = [
      'accept',
      'accept-language',
      'content-type',
      'authorization',
      'user-agent',
      'referer'
    ];

    for (const [key, value] of Object.entries(req.headers)) {
      const lowerKey = key.toLowerCase();
      // 跳過 host, connection 和瀏覽器安全相關的 headers
      if (lowerKey.startsWith('sec-') ||
          lowerKey.startsWith('cf-') ||
          lowerKey === 'host' ||
          lowerKey === 'connection' ||
          lowerKey === 'origin') {
        continue;
      }
      // 只保留允許的 headers
      if (allowedHeaders.includes(lowerKey) || lowerKey.startsWith('x-')) {
        safeHeaders[key] = value;
      }
    }

    // 設定目標 host
    safeHeaders['host'] = target.hostname;

    const options = {
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: target.pathname + target.search,
      method: req.method,
      headers: safeHeaders
    };

    const proxyReq = protocol.request(options, (proxyRes) => {
      // 設定 CORS headers
      const responseHeaders = {
        ...proxyRes.headers,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Expose-Headers': '*'
      };

      // 移除可能衝突的 headers
      delete responseHeaders['content-security-policy'];
      delete responseHeaders['x-frame-options'];

      res.writeHead(proxyRes.statusCode, responseHeaders);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('[proxy] Error:', err.message);
      if (!res.headersSent) {
        res.writeHead(502, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
          error: 'Bad Gateway',
          message: err.message
        }));
      }
    });

    // 設定 timeout
    proxyReq.setTimeout(30000, () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.writeHead(504, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
          error: 'Gateway Timeout',
          message: 'Request timeout after 30s'
        }));
      }
    });

    // 處理請求 body
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }

  } catch (err) {
    console.error('[proxy] Setup error:', err.message);
    if (!res.headersSent) {
      res.writeHead(400, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        error: 'Invalid URL',
        message: err.message
      }));
    }
  }
}

module.exports = { handleProxyRequest };
