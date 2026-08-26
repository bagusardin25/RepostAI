# RepostAI

**One video in, three platform-ready clips out — with hooks, captions, and a Mind that learns your voice.**

RepostAI is an AI-powered content repurposing agent that takes a single source video (YouTube or upload) and produces three short-form clips optimized for TikTok, Instagram Reels, and X — each with platform-specific hooks, captions, and hashtags. Nothing gets published. You review every clip first. When you approve, edit, or reject a clip, the Mind agent remembers your preferences and improves its next proposals.

> **Submission for [Creative Minds Jam #1](https://creativemindsjam.com/)**, Track: Content Repurposing Across Platforms.
> Built with [Minds by Animoca Brands](https://hellominds.ai).

---

## The Problem

Content creators spend hours after every YouTube upload manually chopping clips for different platforms. TikTok wants a punch-first hook. Instagram needs a loopable moment. X needs one sharp takeaway under 280 characters. Copy-pasting the same clip everywhere doesn't work — each platform has different expectations for format, tone, and length.

## The Solution

RepostAI automates this with a persistent Mind agent that:

1. **Analyzes** your source video transcript
2. **Proposes** three clip packages (one per platform) with hooks and captions
3. **Waits** for your review — approve, edit, or reject each clip
4. **Learns** from every review to improve future proposals

The Mind doesn't just generate — it **remembers**. If you reject cold intros, it stops proposing them. If you rewrite a caption to be shorter, it adjusts its tone for next time.

---

## Architecture

```
npm run dev
```

Starts two processes:

```
┌──────────────────────┐          ┌──────────────────────┐
│   Next.js Frontend   │  /api/*  │   Node.js Backend    │
│      :3000           │ ──────── │      :4000           │
│                      │  rewrite │                      │
│  Desk (/)            │          │  HTTP handlers        │
│  Job Workspace       │          │  Pipeline:            │
│  Voice Memory        │          │   YouTube → Mind →    │
│                      │          │   ffmpeg → clips      │
│                      │          │  SQLite database      │
└──────────────────────┘          └──────────────────────┘
                                          │
                                          ▼
                                  ┌──────────────────┐
                                  │  Minds Platform   │
                                  │  (AI Agent)       │
                                  │                   │
                                  │  Memory ◄── edits │
                                  │  Voice  ◄── prefs │
                                  └──────────────────┘
```

### Pipeline Flow

```
Source Video ──► YouTube meta + transcript
                      │
                      ▼
              ┌───────────────┐
              │  Minds Agent  │◄── voice memory (learned prefs)
              │  proposes 3   │
              │  clip recipes │
              └───────┬───────┘
                      │ (fallback if Minds unavailable)
                      ▼
              ffmpeg cuts 9:16 clips
                      │
                      ▼
              3 clip packages ready for review
                      │
                      ▼
              Creator: approve / edit / reject
                      │
                      ▼
              Voice memory updated ──► next job uses these prefs
```

---

## Minds Integration

The Mind agent is **integral** to RepostAI's core value. It is not a wrapper around a generic LLM — it is a persistent agent with memory, continuity, and autonomous decision-making.

### How the Mind Works

| Capability | Implementation |
|---|---|
| **Memory** | Every approve/edit/reject is stored in `voice_edits`. On the next job, these edits are loaded and injected into the Mind's prompt as "learned creator preferences" — per-platform style notes, rejected patterns, and preferred copy. |
| **Continuity** | The Mind uses a conversation alias (`main`) that persists across sessions. It picks up context from previous interactions without re-training. |
| **Autonomous Follow-up** | When a job is created, the Mind autonomously analyzes the transcript and proposes clip packages without further human prompting. The creator only intervenes at the review stage. |

### Voice Memory Loop

```
Job N: Mind proposes clips with default style
         │
         ▼
Creator rejects TikTok clip: "I hate cold intros"
Creator edits Instagram caption: shorter, punchier
Creator approves X clip
         │
         ▼
voice_edits table stores all three actions
         │
         ▼
Job N+1: Mind receives voice memory prompt:
  "Learned creator preferences:
   - On tiktok: Rejected: I hate cold intros
   - On instagram: Prefer copy like: [shorter version]
   - Approved x clip"
         │
         ▼
Mind adapts: no cold intros, shorter captions
```

This feedback loop means RepostAI gets better with every review cycle. The Mind doesn't just follow rules — it learns the creator's voice over time.

### Soul & Tenets

The Mind agent operates under strict tenets:

- **NEVER publish** — only propose clip packages for human review
- **NEVER change** the creator's core message — adapt format and tone only
- **Prefer hook-first clips** — skip long intros unless the creator likes them
- **Ground every timestamp** in the transcript — do not invent moments
- **Respect platform limits** — TikTok/IG ≤ 2200 chars, X ≤ 280 chars

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (or npm)

### Installation

```bash
git clone https://github.com/bagusardin25/RepostAI.git
cd RepostAI
pnpm install
```

### Configuration

Create `.env.local` at the project root:

```env
FRONTEND_PORT=3000
BACKEND_PORT=4000

MINDS_BUILDER_API_KEY=your_key_here
MINDS_MIND_ID=your_mind_id
MINDS_CONVERSATION_ALIAS=main
```

Get your API key from the [Minds Builder Console](https://build.hellominds.ai/console).

> **Without a Minds API key**, the app still works — it uses fallback clip recipes generated from transcript analysis. The fixture demo mode works fully offline.

### Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo Mode

Click **Run demo fixture** on the desk — this skips YouTube download, uses a built-in transcript, and generates clips locally. Useful for testing without a Minds API key.

### Other Commands

| Command | Description |
|---|---|
| `pnpm test` | Run recipe parser unit tests |
| `pnpm run lint` | TypeScript type-check |
| `pnpm run build` | Production build |
| `pnpm start` | Start production server |

---

## Pages

### Desk (`/`)

The main dashboard. Paste a YouTube URL, upload a video file, or run the demo fixture. Active and completed jobs appear in a live-updating feed.

### Job Workspace (`/jobs/[id]`)

Three clip packages (TikTok, Instagram, X) with:
- 9:16 video player for each clip
- Editable hook and caption fields
- Character limit enforcement per platform
- Approve / Edit / Reject actions per clip
- Batch "Approve All" button
- Source video player and transcript viewer

### Voice Memory (`/voice`)

View what the Mind has learned from your reviews:
- Per-platform style guidelines (derived from edits)
- Rejected patterns (what to avoid)
- Full edit ledger with timestamps

---

## API

All endpoints are served by the backend on `:4000`. The frontend proxies `/api/*` via Next.js rewrites.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | System status (db, ffmpeg, minds) |
| `GET` | `/api/jobs` | List all jobs with clip counts |
| `POST` | `/api/jobs` | Create job (JSON or multipart with video) |
| `GET` | `/api/jobs/:id` | Job detail + transcript + clips |
| `POST` | `/api/jobs/:id` | Retry a failed job |
| `GET` | `/api/clips/:id` | Single clip detail |
| `POST` | `/api/clips/:id/review` | Review clip: `{ action, caption?, hook?, note? }` |
| `GET` | `/api/voice` | Voice memory + edit history |
| `GET` | `/api/media/:kind/:file` | Serve video files |

### Create a Job

```bash
# From YouTube URL
curl -X POST http://localhost:4000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"youtubeUrl": "https://www.youtube.com/watch?v=..."}'

# Demo fixture
curl -X POST http://localhost:4000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"fixture": true}'
```

Response: `202` with `{ job }`. Processing happens in the background.

Job status transitions: `queued → fetching_source → analyzing → clipping → ready | failed`

### Review a Clip

```bash
curl -X POST http://localhost:4000/api/clips/{id}/review \
  -H "Content-Type: application/json" \
  -d '{"action": "edit", "caption": "New caption", "hook": "New hook", "note": "shorter please"}'
```

Actions: `approve`, `reject`, `edit`. Each review is stored in `voice_edits` and fed back to the Mind on the next job.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), TypeScript, Tailwind CSS v4 |
| **Backend** | Node.js (raw `http.createServer`), JavaScript |
| **AI Agent** | [Minds Platform](https://hellominds.ai) via `@animocabrands/minds-client-lib` |
| **Database** | SQLite via `@libsql/client` |
| **Video** | `ffmpeg-static` for clip cutting (9:16 crop) |
| **YouTube** | `youtubei.js` for metadata + transcript + download |
| **Package Manager** | pnpm |

---

## Repository Structure

```
RepostAI/
├── backend/               # Node.js API server (:4000)
│   ├── server.js          # HTTP server + routing
│   ├── http/              # Route handlers (8 endpoints)
│   ├── pipeline/          # YouTube, Minds, ffmpeg, recipes, voice
│   ├── db/                # SQLite schema + CRUD operations
│   └── lib/               # Constants, paths, ports, helpers
├── frontend/              # Next.js UI (:3000)
│   ├── app/               # Pages: /, /jobs/[id], /voice
│   ├── components/        # UI components (11 files)
│   ├── lib/               # API client, constants, formatters
│   └── styles/            # CSS
├── data/                  # Runtime data (gitignored)
│   ├── repostai.db        # SQLite database
│   ├── sources/           # Downloaded source videos
│   ├── clips/             # Generated clip files
│   └── uploads/           # User-uploaded videos
├── .env.example           # Environment variable template
├── package.json           # Monorepo scripts
└── LICENSE                # MIT License
```

---

## Platform Limits

| Platform | Max Duration | Aspect Ratio | Caption Limit |
|---|---|---|---|
| TikTok | 60s | 9:16 | 2200 chars |
| Instagram | 90s | 9:16 | 2200 chars |
| X (Twitter) | 140s | 9:16 | 280 chars |

---

## License

[MIT](LICENSE)
