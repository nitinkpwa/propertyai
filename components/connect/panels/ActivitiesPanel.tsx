"use client";

import ConnectPartnerActivityTimeline from "@/components/admin/connect/ConnectPartnerActivityTimeline";
import type { ConnectPartnerActivity } from "@/lib/connect/partners/types";
import { connectTokens } from "@/lib/connect/design";
import ConnectEmptyModule from "@/app/connect/components/ConnectEmptyModule";

export default function ActivitiesPanel({ activities }: { activities: ConnectPartnerActivity[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className={connectTokens.heading}>Activity Timeline</h2>
        <p className={connectTokens.subheading}>Every action on your assigned properties is recorded here</p>
      </div>
      {activities.length === 0 ? (
        <ConnectEmptyModule icon="⚡" title="No activity yet" description="Lead creation, calls, visits, and property updates will appear in your timeline." />
      ) : (
        <div className={`${connectTokens.card} p-6`}>
          <ConnectPartnerActivityTimeline activities={activities} maxItems={50} />
        </div>
      )}
    </div>
  );
}
