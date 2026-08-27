import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your style",
};

export default function VoiceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
