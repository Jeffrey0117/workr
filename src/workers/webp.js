/**
 * WebP Worker
 * 圖片轉換為 WebP 格式
 */

const fs = require('fs');
const path = require('path');

// 嘗試載入 sharp
let sharp = null;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('[webp] sharp not available');
}

/**
 * 處理 WebP 轉換任務
 * @param {Object} job - 任務物件
 * @param {Function} onProgress - 進度回調
 */
async function process(job, onProgress) {
  const {
    inputPath,
    outputPath,
    quality = 80,
    width = null,
    height = null
  } = job.payload;

  if (!sharp) {
    throw new Error('sharp not installed');
  }

  // 檢查輸入檔案
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  // 確保輸出目錄存在
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  onProgress(10, 'Processing...');

  try {
    let pipeline = sharp(inputPath);

    // 調整大小（如果指定）
    if (width || height) {
      pipeline = pipeline.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      });
      onProgress(30, 'Resized');
    }

    // 轉換為 WebP
    onProgress(50, 'Converting to WebP...');
    await pipeline
      .webp({ quality })
      .toFile(outputPath);

    onProgress(100, 'Done');

    // 取得檔案資訊
    const inputStats = fs.statSync(inputPath);
    const outputStats = fs.statSync(outputPath);
    const compression = ((1 - outputStats.size / inputStats.size) * 100).toFixed(1);

    return {
      outputPath,
      inputSize: inputStats.size,
      outputSize: outputStats.size,
      compression: `${compression}%`,
      format: 'webp'
    };
  } catch (e) {
    throw new Error(`WebP conversion failed: ${e.message}`);
  }
}

module.exports = { process };
