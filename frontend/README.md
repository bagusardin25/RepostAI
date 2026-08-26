# Frontend

Next.js 15 (App Router) UI on **port 3000**.

All `/api/*` requests are proxied to the backend at `:4000` via Next.js rewrites.

## Pages

| Route | Page | Description |
|---|---|---|
| `/` | Desk | Ingest form (YouTube URL, file upload, fixture demo) + job feed |
| `/jobs/[id]` | Job Workspace | Three clip packages with 9:16 video player, caption editor, review actions |
| `/voice` | Voice Memory | Learned creator preferences, edit ledger, platform-specific style notes |

## Structure

```
frontend/
├── app/                   # Next.js App Router pages
│   ├── layout.tsx         # Root layout (IBM Plex fonts, Shell wrapper)
│   ├── page.tsx           # Desk — ingest + job feed
│   ├── jobs/[id]/page.tsx # Job workspace — clips + review
│   └── voice/             # Voice memory page
├── components/            # React components
│   ├── shell.tsx          # Header, nav, health indicator, footer
│   ├── ingest-form.tsx    # YouTube URL / file upload / fixture trigger
│   ├── job-list.tsx       # Job feed with auto-polling
│   ├── job-workspace.tsx  # Clip bay + batch review + transcript viewer
│   ├── clip-card.tsx      # 9:16 video player, caption editor, actions
│   ├── pipeline.tsx       # 4-step progress visualization
│   ├── platform-mark.tsx  # TikTok/Instagram/X badges
│   ├── status-pill.tsx    # Status color badges
│   ├── toast.tsx          # Notification system
│   ├── theme-provider.tsx # Dark/light/system theme
│   └── icons.tsx          # Custom SVG icons
├── lib/
│   ├── api.ts             # API client functions + TypeScript types
│   ├── constants.ts       # Platform specs mirror
│   └── format.ts          # Time, duration, bytes formatters
└── styles/
    └── globals.css         # Global styles
```

## Features

- Auto-polling when jobs are processing (2s for job list, 1.5s for workspace)
- Dark/light/system theme toggle
- Health status indicators in header (db, ffmpeg, minds)
- Drag-and-drop video upload
- Character limit enforcement per platform
- Batch approve all clips
