import { formatTimecode } from "@frontend/lib/api";

/** One spoken line inside a clip, timed in seconds from the clip's first frame. */
export type ClipLine = { startSec: number; endSec: number; text: string };

// Same line shape the backend reads: "[00:01:05] text" or "[1:05] text".
const LINE = /\[(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\]\s*(.+)/g;

// A line that began this many seconds before the clip is likely still being spoken at its start.
const LEAD_IN_SEC = 3;

function parseLines(transcript: string) {
  const lines: Array<{ startSec: number; text: string }> = [];
  for (const match of transcript.matchAll(LINE)) {
    const hours = match[1] ? Number(match[1]) : 0;
    lines.push({
      startSec: hours * 3600 + Number(match[2]) * 60 + Number(match[3]),
      text: match[4].trim(),
    });
  }
  return lines.sort((a, b) => a.startSec - b.startSec);
}

/** The lines spoken inside a clip window, each ending where the next one starts. */
export function clipTranscript(transcript: string, startSec: number, endSec: number): ClipLine[] {
  const lines = parseLines(transcript);
  const length = endSec - startSec;
  const out: ClipLine[] = [];
  lines.forEach((line, index) => {
    const lineEnd = lines[index + 1]?.startSec ?? endSec;
    if (line.startSec >= endSec || lineEnd <= startSec) return;
    if (line.startSec < startSec - LEAD_IN_SEC) return;
    const start = Math.max(0, line.startSec - startSec);
    out.push({ startSec: start, endSec: Math.min(length, Math.max(start + 1, lineEnd - startSec)), text: line.text });
  });
  return out;
}

/** Plain lines for pasting, one spoken line per row. */
export function transcriptText(lines: ClipLine[]) {
  return lines.map((line) => line.text).join("\n");
}

/** Timed lines for a written pack: "00:03 text". */
export function timedTranscript(lines: ClipLine[]) {
  return lines.map((line) => `${formatTimecode(line.startSec)} ${line.text}`).join("\n");
}

function srtTime(sec: number) {
  const ms = Math.round(sec * 1000);
  const pad = (value: number, width = 2) => String(value).padStart(width, "0");
  return `${pad(Math.floor(ms / 3_600_000))}:${pad(Math.floor(ms / 60_000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
}

/** A SubRip (.srt) file for the clip, so captions can be uploaded next to the MP4. */
export function formatSrt(lines: ClipLine[]) {
  return lines
    .map((line, index) => `${index + 1}\n${srtTime(line.startSec)} --> ${srtTime(line.endSec)}\n${line.text}\n`)
    .join("\n");
}
