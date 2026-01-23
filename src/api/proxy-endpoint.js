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
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      error: 'Missing url parameter',
      usage: 'GET /proxy?url=https://example.com'
    }));
  }

  try {
    const target = new URL(targetUrl);
    const protocol = target.protocol === 'https:' ? https : http;

    // 準備 headers（移除 host, 保留其他）
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    headers['host'] = target.hostname;

    const options = {
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: target.pathname + target.search,
      method: req.method,
      headers
    };

    const proxyReq = protocol.request(options, (proxyRes) => {
      // 設定 CORS
      const responseHeaders = {
        ...proxyRes.headers,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      };

      res.writeHead(proxyRes.statusCode, responseHeaders);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('[proxy] Error:', err.message);
      res.writeHead(502, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        error: 'Bad Gateway',
        message: err.message
      }));
    });

    // 設定 timeout
    proxyReq.setTimeout(30000, () => {
      proxyReq.destroy();
      res.writeHead(504, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        error: 'Gateway Timeout',
        message: 'Request timeout after 30s'
      }));
    });

    // 轉發 body（如果有）
    req.pipe(proxyReq);

  } catch (err) {
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

module.exports = { handleProxyRequest };
