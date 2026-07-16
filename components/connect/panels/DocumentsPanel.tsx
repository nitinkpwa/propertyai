"use client";

import { connectTokens } from "@/lib/connect/design";
import ConnectEmptyModule from "@/app/connect/components/ConnectEmptyModule";

export default function DocumentsPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className={connectTokens.heading}>Documents</h2>
        <p className={connectTokens.subheading}>
          Property brochures, floor plans, RERA, and compliance files
        </p>
      </div>

      <ConnectEmptyModule
        icon="📄"
        title="Document library coming soon"
        description="AreaIQ will enable secure document uploads for brochures, floor plans, and RERA certificates. Until then, share files with buyers directly during site visits."
      />
    </div>
  );
}
