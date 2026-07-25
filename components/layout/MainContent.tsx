"use client";

import { useChromeInsets } from "@/components/layout/engine";

export default function MainContent({ children }: { children: React.ReactNode }) {
  const { contentClassName } = useChromeInsets();

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col overflow-x-clip lg:pb-0 ${contentClassName}`}
    >
      {children}
    </div>
  );
}
