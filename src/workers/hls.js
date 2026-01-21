/**
 * HLS Worker - FFmpeg 多畫質串流轉檔
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 預設畫質設定
const DEFAULT_QUALITIES = [
  { name: '1080p', height: 1080, bitrate: '5000k', audioBitrate: '192k', crf: 22 },
  { name: '720p', height: 720, bitrate: '2500k', audioBitrate: '128k', crf: 23 },
  { name: '480p', height: 480, bitrate: '1000k', audioBitrate: '96k', crf: 24 }
];

/**
 * 取得影片資訊
 */
function getVideoInfo(inputPath) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      inputPath
    ], { windowsHide: true });

    let stdout = '';
    let stderr = '';

    ffprobe.stdout.on('data', data => stdout += data);
    ffprobe.stderr.on('data', data => stderr += data);

    ffprobe.on('close', code => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed: ${stderr}`));
        return;
      }
      try {
        const info = JSON.parse(stdout);
        const videoStream = info.streams.find(s => s.codec_type === 'video');
        resolve({
          width: videoStream?.width || 1920,
          height: videoStream?.height || 1080,
          duration: parseFloat(info.format?.duration || 0)
        });
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * 單一畫質 HLS 轉檔
 */
function transcodeToHLS(inputPath, outputDir, quality, videoInfo, onProgress) {
  return new Promise((resolve, reject) => {
    const qualityDir = path.join(outputDir, quality.name);
    if (!fs.existsSync(qualityDir)) {
      fs.mkdirSync(qualityDir, { recursive: true });
    }

    // 跳過比原始畫質高的（480p 保底）
    if (videoInfo.height < quality.height && quality.height > 480) {
      resolve({ skipped: true, quality: quality.name });
      return;
    }

    const playlistPath = path.join(qualityDir, 'playlist.m3u8');
    const segmentPattern = path.join(qualityDir, 'segment%03d.ts');

    // 計算目標寬度（保持比例，確保偶數）
    const targetHeight = Math.min(quality.height, videoInfo.height);
    const targetWidth = Math.round(videoInfo.width * (targetHeight / videoInfo.height) / 2) * 2;

    const args = [
      '-i', inputPath,
      '-vf', `scale=${targetWidth}:${targetHeight}`,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', String(quality.crf),
      '-c:a', 'aac',
      '-b:a', quality.audioBitrate,
      '-hls_time', '6',
      '-hls_list_size', '0',
      '-hls_segment_filename', segmentPattern,
      '-hls_playlist_type', 'vod',
      '-y',
      playlistPath
    ];

    const ffmpeg = spawn('ffmpeg', args, { windowsHide: true });

    let stderr = '';
    ffmpeg.stderr.on('data', data => {
      stderr += data.toString();
      // 解析進度 time=00:01:23.45
      const timeMatch = stderr.match(/time=(\d+):(\d+):(\d+\.\d+)/);
      if (timeMatch && videoInfo.duration > 0) {
        const currentTime = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseFloat(timeMatch[3]);
        const percent = Math.min(99, Math.round((currentTime / videoInfo.duration) * 100));
        onProgress(percent, `${quality.name}: ${Math.round(currentTime)}s / ${Math.round(videoInfo.duration)}s`);
      }
    });

    ffmpeg.on('close', code => {
      if (code !== 0) {
        reject(new Error(`FFmpeg failed for ${quality.name}: ${stderr.slice(-300)}`));
        return;
      }
      resolve({ skipped: false, quality: quality.name, playlist: playlistPath });
    });

    ffmpeg.on('error', reject);
  });
}

/**
 * 產生 master.m3u8
 */
function generateMasterPlaylist(outputDir, qualities, videoInfo) {
  const lines = ['#EXTM3U', '#EXT-X-VERSION:3', ''];

  for (const q of qualities) {
    if (videoInfo.height < q.height && q.height > 480) continue;

    const targetHeight = Math.min(q.height, videoInfo.height);
    const targetWidth = Math.round(videoInfo.width * (targetHeight / videoInfo.height) / 2) * 2;
    const bandwidth = parseInt(q.bitrate) * 1000;

    lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${targetWidth}x${targetHeight},NAME="${q.name}"`);
    lines.push(`${q.name}/playlist.m3u8`);
    lines.push('');
  }

  const masterPath = path.join(outputDir, 'master.m3u8');
  fs.writeFileSync(masterPath, lines.join('\n'));
  return masterPath;
}

/**
 * Worker process 函數
 */
async function process(job, onProgress) {
  const { inputPath, outputDir, qualities = DEFAULT_QUALITIES } = job.payload;

  if (!inputPath || !outputDir) {
    throw new Error('Missing required fields: inputPath, outputDir');
  }

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  // 檢查是否已存在
  const masterPath = path.join(outputDir, 'master.m3u8');
  if (fs.existsSync(masterPath)) {
    return { success: true, skipped: true, hlsPath: masterPath };
  }

  // 建立輸出目錄
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 取得影片資訊
  onProgress(5, 'Analyzing video...');
  const videoInfo = await getVideoInfo(inputPath);
  console.log(`[hls-worker] Video: ${videoInfo.width}x${videoInfo.height}, ${videoInfo.duration}s`);

  // 依序轉檔各畫質
  const results = [];
  const totalQualities = qualities.length;

  for (let i = 0; i < qualities.length; i++) {
    const quality = qualities[i];
    const baseProgress = 10 + (i / totalQualities) * 80;

    onProgress(Math.round(baseProgress), `Transcoding ${quality.name}...`);

    try {
      const result = await transcodeToHLS(
        inputPath,
        outputDir,
        quality,
        videoInfo,
        (percent, message) => {
          const qualityProgress = baseProgress + (percent / 100) * (80 / totalQualities);
          onProgress(Math.round(qualityProgress), message);
        }
      );
      results.push(result);
    } catch (e) {
      console.error(`[hls-worker] ${quality.name} failed:`, e.message);
      results.push({ skipped: false, quality: quality.name, error: e.message });
    }
  }

  // 產生 master playlist
  onProgress(95, 'Generating master playlist...');
  generateMasterPlaylist(outputDir, qualities, videoInfo);

  onProgress(100, 'HLS transcoding complete');

  return {
    success: true,
    hlsPath: masterPath,
    videoInfo,
    qualities: results.filter(r => !r.skipped && !r.error).map(r => r.quality)
  };
}

module.exports = {
  process,
  getVideoInfo,
  DEFAULT_QUALITIES,
  timeout: 60 * 60 * 1000, // 1 小時 timeout
};
