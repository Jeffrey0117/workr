/**
 * Proxy Worker - HTTP Proxy with custom headers
 * 用於代理 HTTP 請求，支援自訂 headers
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Worker process 函數
 */
async function process(job, onProgress) {
  const { url, method = 'GET', headers = {}, body } = job.payload;

  if (!url) {
    throw new Error('Missing required field: url');
  }

  onProgress(10, `Proxying ${method} ${url}...`);

  const targetUrl = new URL(url);
  const protocol = targetUrl.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      path: targetUrl.pathname + targetUrl.search,
      method: method.toUpperCase(),
      headers: {
        'User-Agent': 'Workr-Proxy/1.0',
        ...headers
      }
    };

    // 如果有 body，設定 Content-Type 和 Content-Length
    if (body && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
      const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyString);
      if (!options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
      }
    }

    onProgress(30, 'Sending request...');

    const req = protocol.request(options, (res) => {
      let data = '';
      let chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
        data += chunk;
      });

      res.on('end', () => {
        onProgress(90, 'Processing response...');

        // 嘗試解析 JSON，如果失敗就返回原始文字
        let responseBody = data;
        const contentType = res.headers['content-type'] || '';

        if (contentType.includes('application/json')) {
          try {
            responseBody = JSON.parse(data);
          } catch (e) {
            // 保持原始文字
          }
        }

        onProgress(100, 'Proxy complete');

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseBody,
          size: Buffer.concat(chunks).length,
          contentType: contentType
        });
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Proxy request failed: ${err.message}`));
    });

    // 設定 timeout
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Proxy request timeout'));
    });

    // 發送 body（如果有）
    if (body && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
      const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
      req.write(bodyString);
    }

    req.end();
  });
}

module.exports = {
  process,
  timeout: 60 * 1000, // 60 秒 timeout
};
