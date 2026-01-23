/**
 * Workr Worker Manager
 */

const queue = require('../queue');
const thumbnailWorker = require('./thumbnail');
const webpWorker = require('./webp');
const downloadWorker = require('./download');
const hlsWorker = require('./hls');
const proxyWorker = require('./proxy');

// 並發控制
const CONCURRENCY = {
  thumbnail: 3,
  webp: 3,
  hls: 1,
  download: 5,
  proxy: 10,
  deploy: 1
};

// 正在執行的數量
const running = {
  thumbnail: 0,
  webp: 0,
  hls: 0,
  download: 0,
  proxy: 0,
  deploy: 0
};

// Worker 映射
const workers = {
  thumbnail: thumbnailWorker,
  webp: webpWorker,
  download: downloadWorker,
  hls: hlsWorker,
  proxy: proxyWorker,
};

// 處理任務
async function processJob(type) {
  if (running[type] >= CONCURRENCY[type]) {
    return; // 達到並發上限
  }

  const job = queue.next(type);
  if (!job) return;

  const worker = workers[type];
  if (!worker) {
    queue.fail(job.id, `No worker for type: ${type}`);
    return;
  }

  running[type]++;
  queue.start(job.id, `${type}-worker`);

  try {
    const result = await worker.process(job, (progress, message) => {
      queue.progress(job.id, progress, message);
    });

    queue.complete(job.id, result);
  } catch (e) {
    queue.fail(job.id, e.message);
  } finally {
    running[type]--;
    // 繼續處理下一個
    setImmediate(() => processJob(type));
  }
}

// 啟動 Workers
function startWorkers() {
  console.log('[workers] Starting workers...');

  // 監聽新任務
  queue.on('job:added', (job) => {
    processJob(job.type);
  });

  // 定期檢查（避免遺漏）
  setInterval(() => {
    for (const type of Object.keys(workers)) {
      processJob(type);
    }
  }, 5000);

  console.log('[workers] Workers ready');
  console.log(`[workers] Concurrency: ${JSON.stringify(CONCURRENCY)}`);
}

module.exports = { startWorkers, CONCURRENCY };
