import type { Metadata } from "next";
import { LandingContent } from "./landing/landing-content";

export const metadata: Metadata = {
  title: { absolute: "RepostAI: clips for TikTok, Reels and X from one YouTube video" },
  description:
    "Cut a YouTube video into TikTok, Reels and X clips, plus a script, carousel, thread and LinkedIn post. You review everything before you post it.",
};

export default function HomePage() {
  return <LandingContent />;
}
