import { listVoiceEdits } from "../db/client.js";
import { json } from "../lib/http.js";
import { loadVoiceMemory } from "../pipeline/voice.js";

export async function GET() {
  const [memory, edits] = await Promise.all([loadVoiceMemory(), listVoiceEdits(20)]);
  return json({ memory, edits, score: memory.score ?? null });
}
