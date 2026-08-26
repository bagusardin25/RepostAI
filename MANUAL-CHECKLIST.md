# Checklist manual — yang tidak bisa dikerjakan dari kode

Repo sudah meng-handle pipeline, review, memory, compare, dan UI. **Soul, Telegram, dan contoh data hidup** harus kamu set sendiri di browser. Kerjakan berurutan. Jangan commit file `.env` / `.env.local`.

App lokal: [http://localhost:3000](http://localhost:3000)  
Mind desk: [http://localhost:3000/mind](http://localhost:3000/mind)

---

## 1. Soul & Tenets di Minds (wajib)

Public Builder API **tidak** bisa menulis Soul. Harus di console.

1. Buka [https://hellominds.ai/profile](https://hellominds.ai/profile)
2. Pilih Mind **RepostAI**
3. Buka **Soul / Tenets**
4. Tempel teks di bawah (sama dengan yang di `/mind` → **Copy for Soul**)

```
NEVER publish. Only propose packages for human review.
NEVER change the creator's core claim. Adapt format and tone only.
Prefer hook-first clips. Skip long intros unless the creator likes them.
Ground every timestamp in the transcript. Do not invent moments.
```

5. Simpan
6. Di app `/mind` klik **Seed into conversation** — tenets masuk ke alias `main` juga

Selesai jika: Soul di profile terisi, dan history `/mind` memuat pesan tenets.

---

## 2. Link Telegram (sangat disarankan)

Tanpa ini `hasTelegram` tetap false. Memory web dan Telegram **tidak** menyatu.

1. Tetap di [https://hellominds.ai/profile](https://hellominds.ai/profile)
2. **Link Account** untuk Telegram, ikuti otorisasi bot
3. Pastikan bot Mind **RepostAI** bisa di-chat
4. Refresh [http://localhost:3000/mind](http://localhost:3000/mind) — kartu Telegram harus **Connected**
5. Tes: kirim di Telegram *“remember: no cold intros”*, lalu cek history di Mind desk

Kalau macet: group Telegram butuh permission baca pesan (privacy mode bot off / bot jadi admin).

---

## 3. Contoh persistence hidup (wajib untuk bukti)

Fitur compare kosong jika belum ada **dua job + review di job pertama**.

1. `pnpm dev` — buka Desk
2. **Job 1:** Demo Samples *atau* YouTube **publik ber-caption**
3. Tunggu status **ready** (bukan Fallback kalau bisa — butuh Mind online)
4. Review:
   - TikTok **Reject** + note: `I hate cold intros`
   - Instagram **Save Edit** (caption lebih pendek)
   - X **Approve**
5. Buka `/voice` — aturan reject muncul; ledger ada tautan job
6. **Job 2:** jalankan sumber lain (fixture kedua atau URL lain ber-caption)
7. Buka Job 2 — panel **Voice applied** dan **Mind brief**
8. **Compare jobs** (tombol di desk, atau `/jobs/compare`) — kiri Job 1, kanan Job 2  
   Harus kelihatan: taught by rejected, hook/caption/window changed

Selesai jika: compare menampilkan 3 platform dan daftar teaching dari Job 1.

YouTube tanpa caption akan **gagal**. Jangan pakai itu untuk bukti.

---

## 4. Cek kesehatan Mind

Di header app, klik status **Cutter · Mind · DB**:

| Titik | Harus |
|---|---|
| Cutter | hijau (ffmpeg) |
| Mind | hijau (`configured` + `ok` + `isEnabled`) |
| DB | hijau |

Kalau Mind merah: cek `MINDS_BUILDER_API_KEY` dan `MINDS_MIND_ID` di `.env` / `.env.local` (sudah ada di mesinmu; jangan di-push). Cognition habis → isi di console Minds, jangan disable Mind.

---

## 5. Channel watch (opsional)

Di Desk, tempel URL channel atau `@handle`, **Watch channel**. Hanya video **publik ber-caption** yang akan jadi job sukses. **Check now** untuk tes sekali.

---

## 6. Yang tidak perlu kamu bangun

Sudah di kode: clip 9:16, draf teks, review → Mind, voice score, lineage, compare, follow-up, watch, tenets UI, landing, README.

Jangan kerjakan: Whisper, auto-post ke TikTok/IG/X, Circles 3 Mind, skill Bazaar baru.

---

## Ringkas

- [ ] Soul di hellominds (teks tenets di atas)
- [ ] Seed tenets di `/mind`
- [ ] Telegram linked, `/mind` = Connected
- [ ] Job 1 di-review (reject + edit + approve)
- [ ] Job 2 jalan
- [ ] `/jobs/compare` kiri–kanan terisi
- [ ] `.env` tidak ter-commit
