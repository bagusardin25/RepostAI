# RepostAI

**One source. Three 9:16 cuts. Four text packages. The Mind remembers every review. Nothing publishes.**

RepostAI is a content-repurposing agent for [Creative Minds Jam #1](https://creativemindsjam.com/), track **Content Repurposing Across Platforms**. A single YouTube video becomes TikTok / Reels / X clips plus a script, carousel, thread, and LinkedIn draft. A persistent [Minds](https://hellominds.ai) agent proposes the packages. You approve, edit, or reject. Those decisions are **sent back into the same Mind conversation** so the next job is steered by your voice.

The Mind is not optional on the happy path. Fallback recipes exist only if the Mind times out — the desk labels that **Fallback**, never as Mind.

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
| **Memory** | Each review is stored in SQLite **and** `sendMessage`'d to conversation alias `main`. The next job injects that voice snapshot before the Mind proposes. |
| **Continuity** | One Mind (`MINDS_MIND_ID`), one alias (`main`). History, follow-ups, and reviews share that transcript. |
| **Autonomous follow-up** | After clips are ready the Mind writes a reminder + next move. Optional channel watch enqueues new public uploads without a paste. |

### Prove persistence (Job 1 → Job 2)

1. Open `/`, run a **demo sample** or a **public YouTube URL with captions**.
2. On the job, **reject** one clip with a note (example: `I hate cold intros`) and/or rewrite a caption shorter.
3. Confirm `/mind` shows the review message and `/voice` lists the rule.
4. Run a **second** job.
5. Open the new job — **Voice applied** and **Mind brief**. Then **Compare jobs** (`/jobs/compare?a=<first>&b=<second>`) for hook / caption / window diffs.

Tenets live in every propose prompt. Mirror them in the Mind's **Soul** at [hellominds.ai/profile](https://hellominds.ai/profile). Optionally **Seed into conversation** on `/mind`. Link Telegram on the same profile if you want native chat with the same memory.

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

- Node.js 22+
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

> **Without a Minds API key** the cutter still runs on fixtures, but jobs are labeled Fallback. For the real product loop you need a Builder key and Mind id.

### Run

```bash
pnpm dev
```

- Desk: [http://localhost:3000](http://localhost:3000)
- Overview: [http://localhost:3000/landing](http://localhost:3000/landing)
- Mind: [http://localhost:3000/mind](http://localhost:3000/mind)
- Voice: [http://localhost:3000/voice](http://localhost:3000/voice)
- Compare: [http://localhost:3000/jobs/compare](http://localhost:3000/jobs/compare)

YouTube jobs need **captions**. Uploads have no speech-to-text unless you also pass a captioned YouTube URL.

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

Mind brief (why each window), voice applied from prior reviews, follow-up, 9:16 players, hooks/captions, approve/edit/reject, session recap, text packages, ship kit (copy/download only).

### Compare (`/jobs/compare`)

Earlier job left, later job right. Teaching reviews from the left job plus hook/caption/window diffs.

### Voice Memory (`/voice`)

Standing rules, score, and **later jobs steered by each decision**.

### Mind desk (`/mind`)

Live conversation alias `main`, tenets, Telegram status, circle, Bazaar skills.

---

## API

All endpoints are served by the backend on `:4000`. The frontend proxies `/api/*` via Next.js rewrites.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | System status (db, ffmpeg, minds) |
| `GET` | `/api/jobs` | List all jobs with clip counts |
| `POST` | `/api/jobs` | Create job (JSON or multipart with video) |
| `GET` | `/api/jobs/:id` | Job detail, clips, voice applied, lineage |
| `GET` | `/api/jobs/compare?a=&b=` | Side-by-side two jobs |
| `GET` | `/api/mind` | Mind profile, circle, skills |
| `GET` | `/api/mind/history` | Conversation transcript |
| `POST` | `/api/mind/tenets` | Seed standing tenets into the conversation |
| `GET` | `/api/watch` | YouTube channel watch config |
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
│   ├── app/               # /, /landing, /jobs/[id], /jobs/compare, /voice, /mind
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
