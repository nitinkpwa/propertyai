"use client";

import { Suspense } from "react";
import IntelligenceMapExplorer from "@/app/components/home/terminal/IntelligenceMapExplorer";

function ExplorerFallback() {
  return (
    <div className="fixed inset-0 z-[40] flex items-center justify-center bg-[#0F1410] text-sm text-white/70">
      Opening Full Intelligence Map…
    </div>
  );
}

export default function IntelligenceMapPage() {
  return (
    <Suspense fallback={<ExplorerFallback />}>
      <IntelligenceMapExplorer />
    </Suspense>
  );
}
