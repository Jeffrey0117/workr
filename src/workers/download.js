/**
 * Download Worker - Puppeteer + Stealth 下載
 * 用於繞過 Cloudflare 等防護下載檔案
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

// 使用 stealth 插件
puppeteer.use(StealthPlugin());

// 共用瀏覽器實例
let browser = null;
let browserUseCount = 0;
const MAX_BROWSER_USE = 50; // 每 50 次重啟瀏覽器，避免記憶體洩漏

async function getBrowser() {
  if (!browser || browserUseCount >= MAX_BROWSER_USE) {
    if (browser) {
      await browser.close().catch(() => {});
    }
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
      ],
    });
    browserUseCount = 0;
    console.log('[download-worker] Browser launched');
  }
  browserUseCount++;
  return browser;
}

async function closeBrowser() {
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
    browserUseCount = 0;
    console.log('[download-worker] Browser closed');
  }
}

/**
 * 在頁面 context 中下載檔案
 */
async function downloadInPageContext(pageUrl, fileUrl, destPath) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // 設定 over18 cookie
    const domain = pageUrl.includes('myppt.cc') ? '.myppt.cc' : '.lurl.cc';
    await page.setCookie({
      name: 'over18_years',
      value: 'true',
      domain: domain,
      path: '/',
    });

    // 導航到頁面
    try {
      await page.goto(pageUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });
    } catch (e) {
      // 忽略 timeout
    }

    // 檢查 Cloudflare
    const currentUrl = page.url();
    if (currentUrl.includes('challenges.cloudflare.com')) {
      console.log('[download-worker] Cloudflare challenge detected, waiting...');
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    }

    await new Promise(r => setTimeout(r, 500));

    // 在頁面 context 中 fetch
    const result = await page.evaluate(async (cdnUrl) => {
      try {
        const response = await fetch(cdnUrl);
        if (!response.ok) {
          return { error: `HTTP ${response.status}` };
        }

        const blob = await response.blob();
        if (blob.size < 1000) {
          return { error: `File too small: ${blob.size} bytes` };
        }

        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }

        return {
          success: true,
          data: btoa(binary),
          size: blob.size,
        };
      } catch (err) {
        return { error: err.message };
      }
    }, fileUrl);

    if (result.error) {
      throw new Error(result.error);
    }

    // 確保目錄存在
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 寫入檔案
    const buffer = Buffer.from(result.data, 'base64');
    fs.writeFileSync(destPath, buffer);

    return { success: true, size: result.size, path: destPath };

  } finally {
    await page.close();
  }
}

/**
 * Worker process 函數
 */
async function process(job, onProgress) {
  const { pageUrl, fileUrl, destPath, records } = job.payload;

  // 批次模式
  if (records && Array.isArray(records)) {
    return await processBatch(records, job.payload.dataDir, onProgress);
  }

  // 單檔模式
  if (!pageUrl || !fileUrl || !destPath) {
    throw new Error('Missing required fields: pageUrl, fileUrl, destPath');
  }

  onProgress(10, `Downloading from ${new URL(fileUrl).hostname}...`);

  const result = await downloadInPageContext(pageUrl, fileUrl, destPath);

  onProgress(100, 'Download complete');

  return {
    success: true,
    size: result.size,
    path: result.path,
    sizeMB: (result.size / 1024 / 1024).toFixed(2)
  };
}

/**
 * 批次下載
 */
async function processBatch(records, dataDir, onProgress) {
  const results = [];
  let successCount = 0;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const progress = Math.round((i / records.length) * 100);
    onProgress(progress, `Downloading ${i + 1}/${records.length}: ${record.id}`);

    try {
      const destPath = path.join(dataDir, record.backupPath);
      const result = await downloadInPageContext(record.pageUrl, record.fileUrl, destPath);
      results.push({ id: record.id, success: true, size: result.size });
      successCount++;
    } catch (e) {
      results.push({ id: record.id, success: false, error: e.message });
    }
  }

  // 批次完成後關閉瀏覽器
  await closeBrowser();

  onProgress(100, `Batch complete: ${successCount}/${records.length} success`);

  return {
    total: records.length,
    success: successCount,
    failed: records.length - successCount,
    results
  };
}

module.exports = {
  process,
  downloadInPageContext,
  closeBrowser,
  timeout: 5 * 60 * 1000, // 5 分鐘 timeout
};
