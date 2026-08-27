import type { Metadata } from "next";
import { LandingContent } from "./landing/landing-content";

export const metadata: Metadata = {
  title: "One source. Platform packages. Nothing ships without you.",
  description:
    "RepostAI turns a YouTube video into 9:16 clips plus script, carousel, thread, and LinkedIn drafts. A persistent Minds agent learns from every approve, edit, and reject. Nothing publishes.",
};

export default function HomePage() {
  return <LandingContent />;
}
