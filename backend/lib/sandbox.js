// A pull request preview is served from `<project>-git-<branch>-<scope>.vercel.app` (any branch
// but main) and calls the production API. TestSprite runs the whole suite there, so packs started
// from a preview are test traffic: they get a sandbox flag and stay out of production views.
const PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+-git-(?!main-)[a-z0-9-]+\.vercel\.app$/;

/** True when a request comes from a pull request preview. */
export function isPreviewRequest(request) {
  return PREVIEW_ORIGIN.test(requestOrigin(request));
}

// Browsers always send Origin on cross-origin calls; Referer covers same-origin GETs.
function requestOrigin(request) {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  const referer = request.headers.get("referer");
  if (!referer) return "";
  try {
    return new URL(referer).origin;
  } catch {
    return "";
  }
}
