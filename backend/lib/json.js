export function extractJsonObject(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fence?.[1] ?? text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("Mind reply did not contain a JSON object");
  }
  return JSON.parse(raw.slice(start, end + 1));
}
