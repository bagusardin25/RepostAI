# RepostAI

Satu video masuk, keluar tiga clip 9:16 (TikTok, Instagram, X) plus hook dan caption. Belum ada yang kepost — kamu review dulu. Approve / edit / reject disimpan, job berikutnya pakai itu sebagai voice.

Submission [Creative Minds Jam #1](https://hellominds.ai), track Content Repurposing. Agent-nya [Minds](https://hellominds.ai).

## Jalanin

Node 20+. Env dibaca dari root, bukan dari `frontend/`.

```bash
npm install
npm run dev
```

http://localhost:3000

Tanpa API key Minds juga bisa. Di desk klik **Run demo fixture** — skip YouTube, potong clip pakai recipe lokal.

`.env.local` (opsional):

```
MINDS_BUILDER_API_KEY=
MINDS_MIND_ID=
MINDS_CONVERSATION_ALIAS=main
```

Kalau key ada, analyze lewat Mind. Timeout / error → fallback recipe, job tidak kosong. ffmpeg dari `ffmpeg-static`; kalau binary-nya tidak ketemu, recipe tetap muncul, file clip-nya mungkin tidak.

Script lain: `npm test` (parser recipe), `npm run lint`, `npm run build`, `npm start`.

## Isi repo

```
frontend/     Next (halaman + API stub)
backend/      sqlite, youtube, minds, ffmpeg, handler
shared/       tipe + limit caption
data/         db, source, clip, upload — gitignored, ke-create pas job pertama
```

`npm run dev` nyalain dua proses: frontend :3000, backend :4000. Request `/api/*` di-rewrite ke backend.

Halaman: `/` desk, `/jobs/[id]` tiga paket + review, `/voice` yang Mind ingat. Lampu di header = ffmpeg / minds / db.

## Job

POST `/api/jobs` (JSON atau multipart): `youtubeUrl`, `file`, atau `{ "fixture": true }`. Response 202, proses di background (max 300s). Status: queued → fetching_source → analyzing → clipping → ready | failed.

Review clip: POST `/api/clips/:id/review` body `{ action: "approve" | "reject" | "edit", caption?, hook?, note? }`.

Endpoint lain yang dipakai UI: `GET /api/jobs`, `GET /api/jobs/:id`, `POST /api/jobs/:id` (retry), `GET /api/voice`, `GET /api/health`, `GET /api/media/:kind/:file`.

Limit caption: TikTok/IG 2200, X 280. Aspect semua 9:16.
