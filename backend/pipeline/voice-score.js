export function scoreVoiceMemory(edits) {
  const sample = Array.isArray(edits) ? edits.slice(0, 24) : [];
  const n = sample.length;

  if (n === 0) {
    return {
      score: null,
      max: 10,
      label: "No baseline yet",
      detail: "Approve, edit, or reject a clip so the Mind can score your voice.",
      trend: "flat",
      approveRate: 0,
      editRate: 0,
      rejectRate: 0,
      sampleSize: 0,
    };
  }

  const approve = sample.filter((edit) => edit.action === "approve").length;
  const edited = sample.filter((edit) => edit.action === "edit").length;
  const reject = sample.filter((edit) => edit.action === "reject").length;
  const quality = (approve * 1 + edited * 0.62 + reject * 0.12) / n;
  const score = clamp(Math.round((3.5 + quality * 6.5) * 10) / 10, 1, 10);

  const split = Math.max(1, Math.ceil(n / 2));
  const recent = rate(sample.slice(0, split));
  const older = n > 3 ? rate(sample.slice(split)) : recent;
  let trend = "flat";
  if (recent - older > 0.08) trend = "up";
  else if (older - recent > 0.08) trend = "down";

  return {
    score,
    max: 10,
    label: scoreLabel(score),
    detail: scoreDetail(score, trend, n),
    trend,
    approveRate: roundRate(approve / n),
    editRate: roundRate(edited / n),
    rejectRate: roundRate(reject / n),
    sampleSize: n,
  };
}

function rate(edits) {
  if (edits.length === 0) return 0;
  const approve = edits.filter((edit) => edit.action === "approve").length;
  const edited = edits.filter((edit) => edit.action === "edit").length;
  const reject = edits.filter((edit) => edit.action === "reject").length;
  return (approve * 1 + edited * 0.62 + reject * 0.12) / edits.length;
}

function scoreLabel(score) {
  if (score >= 8.5) return "Close to your voice";
  if (score >= 7) return "Learning your voice";
  if (score >= 5.5) return "Needs more corrections";
  return "Still guessing";
}

function scoreDetail(score, trend, sampleSize) {
  const trendLine =
    trend === "up"
      ? "Recent reviews match you more closely than earlier ones."
      : trend === "down"
        ? "Recent reviews drifted — reject notes will steer the next job."
        : "Voice fit is holding steady across recent reviews.";
  return `${score.toFixed(1)} / 10 from ${sampleSize} decision${sampleSize === 1 ? "" : "s"}. ${trendLine}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundRate(value) {
  return Math.round(value * 100) / 100;
}
