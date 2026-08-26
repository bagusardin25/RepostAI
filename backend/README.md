# Backend

Node.js (JavaScript) API server on **port 4000**.

## Structure

```
backend/
├── server.js              # HTTP server + routing
├── http/                  # Route handlers
│   ├── jobs.js            # GET /api/jobs, POST /api/jobs
│   ├── job.js             # GET /api/jobs/:id, POST /api/jobs/:id (retry)
│   ├── clip.js            # GET /api/clips/:id
│   ├── clip-review.js     # POST /api/clips/:id/review
│   ├── health.js          # GET /api/health
│   ├── media.js           # GET /api/media/:kind/:file
│   ├── voice.js           # GET /api/voice
│   └── serialize.js       # Response serialization helpers
├── pipeline/              # Processing pipeline
│   ├── process.js         # Job orchestrator (enqueue + process)
│   ├── youtube.js         # YouTube metadata + download via youtubei.js
│   ├── minds.js           # Minds AI integration (SDK, prompt builder)
│   ├── recipes.js         # Clip recipe parser (Mind JSON + fallback)
│   ├── ffmpeg.js          # Video cutting via ffmpeg-static
│   ├── voice.js           # Voice memory loader + prompt builder
│   ├── fixture.js         # Demo fixture data
│   └── recipes.test.js    # Unit tests (node:test)
├── db/
│   └── client.js          # SQLite via @libsql/client — schema + CRUD
└── lib/
    ├── constants.js        # Platform specs, limits
    ├── http.js             # CORS, json(), defer()
    ├── json.js             # JSON extraction from Mind replies
    ├── paths.js            # Data directory paths
    └── ports.js            # Port configuration
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | System health (db, ffmpeg, minds status) |
| `GET` | `/api/jobs` | List all jobs with clip counts |
| `POST` | `/api/jobs` | Create job (JSON or multipart with video file) |
| `GET` | `/api/jobs/:id` | Job detail with transcript + all clips |
| `POST` | `/api/jobs/:id` | Retry a failed job |
| `GET` | `/api/clips/:id` | Single clip detail |
| `POST` | `/api/clips/:id/review` | Review clip (approve/reject/edit) |
| `GET` | `/api/voice` | Voice memory + edit history |
| `GET` | `/api/media/:kind/:file` | Serve video files (clips/sources/uploads) |

## Database

SQLite via `@libsql/client`. Three tables:

- **jobs** — source video metadata, processing status, analyzer used
- **clips** — generated clip packages per platform (tiktok, instagram, x)
- **voice_edits** — review history feeding the voice memory loop

## Tests

```bash
npm test
```

Covers transcript parsing, Mind JSON extraction, and fallback recipe generation.
