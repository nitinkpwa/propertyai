import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ask AreaIQ · Property Intelligence",
  description:
    "Ask AreaIQ about locations, pricing, growth, and listings — AI-assisted property intelligence for buyers and investors.",
  alternates: { canonical: "/ask" },
};

export default function AskLayout({ children }: { children: React.ReactNode }) {
  return children;
}
