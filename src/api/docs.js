/**
 * Workr Documentation Page
 */

function getDocsHTML() {
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workr API 使用文件</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans TC', sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
      line-height: 1.6;
    }
    .container { max-width: 900px; margin: 0 auto; padding: 2rem; }

    /* Header */
    header {
      background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%);
      padding: 2rem 0;
      margin-bottom: 3rem;
      border-bottom: 2px solid #5BB4D4;
    }
    h1 {
      font-size: 2.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #5BB4D4, #7EC8E3);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .subtitle { color: #888; font-size: 1.1rem; }

    /* Navigation */
    nav {
      background: #151515;
      border: 1px solid #252525;
      border-radius: 12px;
      padding: 1rem;
      margin-bottom: 2rem;
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    nav a {
      color: #5BB4D4;
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      transition: all 0.2s;
    }
    nav a:hover {
      background: #1a1a1a;
      color: #7EC8E3;
    }

    /* Sections */
    section {
      background: #151515;
      border: 1px solid #252525;
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
    }
    h2 {
      font-size: 1.75rem;
      margin-bottom: 1rem;
      color: #5BB4D4;
      border-bottom: 2px solid #252525;
      padding-bottom: 0.5rem;
    }
    h3 {
      font-size: 1.25rem;
      margin: 1.5rem 0 1rem;
      color: #7EC8E3;
    }

    /* Code Blocks */
    pre {
      background: #0a0a0a;
      border: 1px solid #252525;
      border-radius: 8px;
      padding: 1rem;
      overflow-x: auto;
      margin: 1rem 0;
    }
    code {
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      color: #4ade80;
    }
    .inline-code {
      background: #1a1a1a;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      color: #60a5fa;
      font-size: 0.9rem;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #252525;
    }
    th {
      background: #1a1a1a;
      color: #5BB4D4;
      font-weight: 500;
    }
    tr:hover { background: #1a1a1a; }

    /* Labels */
    .method {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-right: 0.5rem;
    }
    .method.get { background: #3b82f6; color: white; }
    .method.post { background: #10b981; color: white; }
    .method.delete { background: #ef4444; color: white; }

    /* Alert Box */
    .alert {
      background: #1a2a1a;
      border-left: 4px solid #4ade80;
      padding: 1rem;
      margin: 1rem 0;
      border-radius: 4px;
    }
    .alert.warning {
      background: #2a2a1a;
      border-left-color: #fbbf24;
    }

    /* Footer */
    footer {
      text-align: center;
      padding: 2rem;
      color: #666;
      border-top: 1px solid #252525;
      margin-top: 3rem;
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>⚡ Workr API 文件</h1>
      <p class="subtitle">Universal Job Queue Platform - 通用任務佇列平台</p>
    </div>
  </header>

  <div class="container">
    <nav>
      <a href="#quick-start">快速開始</a>
      <a href="#api-endpoints">API 端點</a>
      <a href="#job-types">任務類型</a>
      <a href="#examples">使用範例</a>
      <a href="/admin">管理後台</a>
    </nav>

    <!-- Quick Start -->
    <section id="quick-start">
      <h2>🚀 快速開始</h2>

      <h3>Base URL</h3>
      <pre><code>https://workr.isnowfriend.com</code></pre>

      <h3>基本使用流程</h3>
      <ol style="margin-left: 1.5rem; color: #ccc;">
        <li>提交任務到 <span class="inline-code">POST /api/jobs</span></li>
        <li>獲得 <span class="inline-code">jobId</span></li>
        <li>查詢任務狀態 <span class="inline-code">GET /api/jobs/:jobId</span></li>
        <li>等待任務完成，獲取結果</li>
      </ol>

      <div class="alert">
        <strong>✅ 完全免費開放</strong><br>
        所有 API 端點無需 API Key，可直接使用！
      </div>
    </section>

    <!-- API Endpoints -->
    <section id="api-endpoints">
      <h2>📡 API 端點</h2>

      <h3><span class="method post">POST</span> /api/jobs</h3>
      <p>提交新任務</p>
      <pre><code>{
  "type": "thumbnail|webp|hls|download|proxy",
  "payload": { ... },
  "priority": 5,           // optional, 1-10, 預設 5
  "callback": "http://...", // optional, 完成時 POST 回調
  "maxRetries": 3          // optional, 失敗重試次數
}</code></pre>

      <p><strong>回應：</strong></p>
      <pre><code>{
  "jobId": "job_1737567890123_abc",
  "status": "queued",
  "createdAt": "2026-01-22T17:00:00.000Z"
}</code></pre>

      <h3><span class="method get">GET</span> /api/jobs/:jobId</h3>
      <p>查詢任務狀態</p>
      <pre><code>{
  "id": "job_xxx",
  "type": "thumbnail",
  "status": "completed",  // queued|running|completed|failed|cancelled
  "progress": 100,
  "result": { ... },      // 完成時的結果
  "error": "...",         // 失敗時的錯誤訊息
  "createdAt": "...",
  "startedAt": "...",
  "completedAt": "..."
}</code></pre>

      <h3><span class="method get">GET</span> /api/jobs</h3>
      <p>列出任務（支援篩選）</p>
      <pre><code>GET /api/jobs?status=running&type=thumbnail&limit=20</code></pre>

      <h3><span class="method delete">DELETE</span> /api/jobs/:jobId</h3>
      <p>取消任務（僅限 queued 狀態）</p>

      <h3><span class="method get">GET</span> /api/stats</h3>
      <p>獲取統計資料</p>
      <pre><code>{
  "total": 141,
  "queued": 39,
  "running": 2,
  "completed": 91,
  "failed": 9
}</code></pre>

      <h3><span class="method get">GET</span> /api/events</h3>
      <p>SSE 即時事件流（監聽任務進度）</p>
    </section>

    <!-- Job Types -->
    <section id="job-types">
      <h2>🛠️ 任務類型</h2>

      <table>
        <thead>
          <tr>
            <th>類型</th>
            <th>說明</th>
            <th>用途</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>thumbnail</code></td>
            <td>影片縮圖擷取</td>
            <td>從影片擷取指定時間的畫面作為縮圖</td>
          </tr>
          <tr>
            <td><code>webp</code></td>
            <td>圖片轉 WebP</td>
            <td>將圖片轉換為 WebP 格式並壓縮</td>
          </tr>
          <tr>
            <td><code>hls</code></td>
            <td>HLS 轉檔</td>
            <td>將影片轉換為 HLS 串流格式</td>
          </tr>
          <tr>
            <td><code>download</code></td>
            <td>檔案下載</td>
            <td>使用 Puppeteer 繞過 Cloudflare 下載檔案</td>
          </tr>
          <tr>
            <td><code>proxy</code></td>
            <td>HTTP 代理</td>
            <td>代理 HTTP 請求（支援自訂 headers）</td>
          </tr>
        </tbody>
      </table>

      <h3>1️⃣ Thumbnail - 影片縮圖</h3>
      <pre><code>{
  "type": "thumbnail",
  "payload": {
    "videoPath": "/path/to/video.mp4",
    "outputPath": "/path/to/thumb.webp",
    "timestamp": "00:00:01",  // 擷取時間點
    "width": 320              // 寬度（高度自動）
  }
}</code></pre>

      <h3>2️⃣ WebP - 圖片轉換</h3>
      <pre><code>{
  "type": "webp",
  "payload": {
    "inputPath": "/path/to/image.jpg",
    "outputPath": "/path/to/image.webp",
    "width": 320,    // optional, 調整寬度
    "quality": 75    // optional, 品質 1-100
  }
}</code></pre>

      <h3>3️⃣ HLS - 串流轉檔</h3>
      <pre><code>{
  "type": "hls",
  "payload": {
    "inputPath": "/path/to/video.mp4",
    "outputDir": "/path/to/hls/"
  }
}</code></pre>

      <h3>4️⃣ Download - Puppeteer 下載</h3>
      <p><strong>單檔模式：</strong></p>
      <pre><code>{
  "type": "download",
  "payload": {
    "pageUrl": "https://example.com/page",
    "fileUrl": "https://cdn.example.com/file.mp4",
    "destPath": "/path/to/save.mp4"
  }
}</code></pre>

      <p><strong>批次模式：</strong></p>
      <pre><code>{
  "type": "download",
  "payload": {
    "records": [
      { "id": "abc", "pageUrl": "...", "fileUrl": "...", "backupPath": "file1.mp4" },
      { "id": "def", "pageUrl": "...", "fileUrl": "...", "backupPath": "file2.mp4" }
    ],
    "dataDir": "/path/to/data/"
  }
}</code></pre>

      <h3>5️⃣ Proxy - HTTP 代理 🆕</h3>
      <pre><code>{
  "type": "proxy",
  "payload": {
    "url": "https://api.example.com/endpoint",
    "method": "GET|POST|PUT|DELETE",
    "headers": {
      "Authorization": "Bearer token",
      "Custom-Header": "value"
    },
    "body": { ... }  // optional, for POST/PUT
  }
}</code></pre>
    </section>

    <!-- Examples -->
    <section id="examples">
      <h2>💡 使用範例</h2>

      <h3>cURL 範例</h3>
      <pre><code># 提交縮圖任務
curl -X POST https://workr.isnowfriend.com/api/jobs \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "thumbnail",
    "payload": {
      "videoPath": "/data/video.mp4",
      "outputPath": "/data/thumb.webp",
      "timestamp": "00:00:01",
      "width": 320
    },
    "priority": 8
  }'

# 查詢任務狀態
curl https://workr.isnowfriend.com/api/jobs/job_xxx

# 列出所有運行中的任務
curl "https://workr.isnowfriend.com/api/jobs?status=running"</code></pre>

      <h3>JavaScript 範例</h3>
      <pre><code>// 提交任務並等待結果
async function submitJob(type, payload) {
  // 1. 提交任務
  const submitRes = await fetch('https://workr.isnowfriend.com/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, payload })
  });
  const { jobId } = await submitRes.json();

  // 2. 輪詢狀態
  while (true) {
    const statusRes = await fetch(\`https://workr.isnowfriend.com/api/jobs/\${jobId}\`);
    const job = await statusRes.json();

    if (job.status === 'completed') {
      return job.result;
    }
    if (job.status === 'failed') {
      throw new Error(job.error);
    }

    await new Promise(r => setTimeout(r, 1000)); // 等 1 秒
  }
}

// 使用範例
const result = await submitJob('webp', {
  inputPath: '/data/image.jpg',
  outputPath: '/data/image.webp',
  quality: 80
});
console.log('轉換完成:', result);</code></pre>

      <h3>SSE 即時監聽</h3>
      <pre><code>const events = new EventSource('https://workr.isnowfriend.com/api/events');

events.addEventListener('job:started', (e) => {
  const job = JSON.parse(e.data);
  console.log('任務開始:', job.id);
});

events.addEventListener('job:progress', (e) => {
  const { jobId, progress, message } = JSON.parse(e.data);
  console.log(\`\${jobId}: \${progress}% - \${message}\`);
});

events.addEventListener('job:completed', (e) => {
  const job = JSON.parse(e.data);
  console.log('任務完成:', job.result);
});</code></pre>
    </section>

    <!-- Advanced -->
    <section>
      <h2>⚙️ 進階功能</h2>

      <h3>優先級</h3>
      <p>設定任務優先級（1-10，數字越大優先級越高）</p>
      <pre><code>{
  "type": "thumbnail",
  "payload": { ... },
  "priority": 10  // 最高優先級
}</code></pre>

      <h3>完成回調</h3>
      <p>任務完成後自動 POST 通知到指定網址</p>
      <pre><code>{
  "type": "hls",
  "payload": { ... },
  "callback": "https://your-app.com/api/callback/hls/record123"
}</code></pre>
      <p>回調會收到完整的任務物件（包含 result 或 error）</p>

      <h3>失敗重試</h3>
      <p>設定任務失敗後的重試次數</p>
      <pre><code>{
  "type": "download",
  "payload": { ... },
  "maxRetries": 3  // 失敗後重試 3 次
}</code></pre>
    </section>

    <!-- Rate Limits -->
    <section>
      <h2>📊 限制說明</h2>

      <div class="alert warning">
        <strong>⚠️ 注意事項</strong><br>
        • 單個任務最長執行時間：5 分鐘<br>
        • 並發處理數量：依伺服器資源動態調整<br>
        • 任務保留時間：完成後保留 24 小時<br>
        • 檔案路徑必須是伺服器可存取的絕對路徑
      </div>
    </section>

    <!-- Links -->
    <section>
      <h2>🔗 相關連結</h2>
      <ul style="margin-left: 1.5rem; color: #ccc;">
        <li><a href="/admin" style="color: #5BB4D4;">管理後台</a> - 查看所有任務狀態</li>
        <li><a href="/health" style="color: #5BB4D4;">健康檢查</a> - 系統狀態 API</li>
        <li><a href="https://github.com/Jeffrey0117/workr" style="color: #5BB4D4;">GitHub Repository</a></li>
      </ul>
    </section>
  </div>

  <footer>
    <p>Workr © 2026 | Made with ⚡ by Jeffrey</p>
  </footer>
</body>
</html>`;
}

module.exports = { getDocsHTML };
