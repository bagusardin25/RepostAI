import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mind",
};

export default function MindLayout({ children }: { children: React.ReactNode }) {
  return children;
}
