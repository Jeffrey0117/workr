<div align="center">

<img src="logo.png" alt="Workr Logo" width="180" />

# Workr

**Universal Job Queue Platform for Background Tasks**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Jeffrey0117/workr/pulls)

</div>

---

<details>
<summary>🇹🇼 <b>中文說明</b>（點擊展開）</summary>

### 簡介

**Workr** 是一個輕量級的通用後台任務佇列平台，專為視頻處理、圖片轉換等耗時任務設計。

### 核心特色

- 🚀 **輕量高效** — 純 Node.js 實現，無框架依賴
- 📦 **多種任務類型** — 縮圖提取、WebP 轉換、HLS 轉碼、檔案下載
- ⚡ **優先級佇列** — 支援任務優先級排序
- 🔄 **智能重試** — 指數退避重試機制
- 📡 **即時更新** — SSE 推送任務進度
- 🔔 **回調通知** — 任務完成自動通知

### 使用場景

- 視頻平台的轉碼服務
- 圖片處理 pipeline
- 批量下載任務
- 任何需要後台處理的長時間任務

</details>

---

## Features

- Memory-based job queue
- Multiple job types: thumbnail, webp, hls, download
- Priority queue
- Auto retry with exponential backoff
- SSE progress updates
- Callback notifications

## Quick Start

```bash
npm install
npm start
```

## API

### Submit Job
```bash
curl -X POST http://localhost:4002/api/jobs \
  -H "Authorization: Bearer dev-key" \
  -H "Content-Type: application/json" \
  -d '{"type":"thumbnail","payload":{"videoPath":"/path/to/video.mp4","outputPath":"/path/to/thumb.webp"}}'
```

### Check Status
```bash
curl http://localhost:4002/api/jobs/job_xxx \
  -H "Authorization: Bearer dev-key"
```

### List Jobs
```bash
curl http://localhost:4002/api/jobs \
  -H "Authorization: Bearer dev-key"
```

## Job Types

| Type | Description |
|------|-------------|
| `thumbnail` | Extract video thumbnail |
| `webp` | Convert image to WebP |
| `hls` | Transcode video to HLS |
| `download` | Download file with retry |

## Environment

```env
PORT=4002
WORKR_API_KEY=your-secret-key
```

## Deploy on CloudPipe

```json
{
  "id": "workr",
  "repoUrl": "https://github.com/Jeffrey0117/workr.git",
  "port": 4002
}
```
