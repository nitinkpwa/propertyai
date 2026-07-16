import type { ProjectTimelineData } from "../data";
import { ProgressBar, SectionCard, SectionTitle } from "./shared";

interface ProjectTimelineProps {
  data: ProjectTimelineData;
}

const STATUS_DOT = {
  done: "bg-emerald-500",
  current: "bg-amber-400 ring-4 ring-amber-100",
  upcoming: "bg-neutral-300",
};

export default function ProjectTimeline({ data }: ProjectTimelineProps) {
  return (
    <SectionCard>
      <SectionTitle
        title="Project Timeline"
        subtitle="Construction progress inferred from listing status and possession"
      />

      <div className="mb-6 rounded-2xl border border-neutral-100 bg-neutral-50/70 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-label">Progress</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-heading-primary">
              {data.progressPercent}%
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="text-muted">
              Completion: <span className="font-semibold text-body">{data.completionLabel}</span>
            </p>
            <p className="text-muted">
              Handover: <span className="font-semibold text-body">{data.handoverLabel}</span>
            </p>
          </div>
        </div>
        <ProgressBar value={data.progressPercent} className="mt-4 h-2" />
      </div>

      <ol className="relative space-y-0 border-l border-neutral-200 ml-2">
        {data.milestones.map((m) => (
          <li key={m.id} className="relative pb-6 pl-6 last:pb-0">
            <span
              className={`absolute -left-1.5 top-1.5 h-3 w-3 rounded-full ${STATUS_DOT[m.status]}`}
            />
            <p className="text-sm font-bold text-heading-primary">{m.label}</p>
            <p className="mt-0.5 text-xs text-muted sm:text-sm">{m.detail}</p>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-[11px] leading-relaxed text-muted">{data.note}</p>
    </SectionCard>
  );
}
