import { json } from "../lib/http.js";
import { getWatchState, pollWatch, saveWatchConfig } from "../pipeline/watch.js";

export async function GET() {
  return json({ watch: await getWatchState() });
}

export async function POST(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";

  if (path.endsWith("/poll")) {
    const result = await pollWatch({ force: true });
    return json({ watch: result });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  try {
    const watch = await saveWatchConfig({
      channelUrl: body.channelUrl,
      enabled: body.enabled === true,
    });
    if (watch.enabled) {
      const polled = await pollWatch({ force: false });
      return json({ watch: polled });
    }
    return json({ watch });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not save watch config" }, 400);
  }
}
