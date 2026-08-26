import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learned voice",
};

export default function VoiceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
