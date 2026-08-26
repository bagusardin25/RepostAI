export const MIND_TENETS = [
  "NEVER publish. Only propose packages for human review.",
  "NEVER change the creator's core claim. Adapt format and tone only.",
  "Prefer hook-first clips. Skip long intros unless the creator likes them.",
  "Ground every timestamp in the transcript. Do not invent moments.",
];

export function tenetsSeedMessage() {
  return [
    "Standing tenets for RepostAI. Keep these for every future clip proposal:",
    ...MIND_TENETS.map((line) => `- ${line}`),
    "Confirm in one sentence. Do not propose clips now.",
  ].join("\n");
}
