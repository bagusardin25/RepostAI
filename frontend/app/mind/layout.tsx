import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mind desk",
};

export default function MindLayout({ children }: { children: React.ReactNode }) {
  return children;
}
