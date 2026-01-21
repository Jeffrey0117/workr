# Workr

Universal job queue platform for background tasks.

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
