import type { PropertyDetail } from "../data";
import { ProgressBar, scoreTone, SectionCard, SectionTitle } from "./shared";

interface AreaIntelligenceProps {
  insights: PropertyDetail["areaInsights"];
}

export default function AreaIntelligence({ insights }: AreaIntelligenceProps) {
  const metrics = [
    { label: "Growth Score", value: insights.growthScore, unit: "/ 100", icon: "📈" },
    { label: "Rental Yield", value: insights.rentalYield, unit: "%", icon: "💰", isPercent: true },
    { label: "Investment Rating", value: insights.investmentRating, unit: "/ 100", icon: "⭐" },
    { label: "Traffic Index", value: insights.traffic, unit: "/ 100", icon: "🚗" },
    { label: "Schools Nearby", value: Math.min(insights.schoolsNearby * 8, 100), unit: `${insights.schoolsNearby} schools`, icon: "🎓", display: insights.schoolsNearby },
    { label: "Hospitals", value: Math.min(insights.hospitals * 15, 100), unit: `${insights.hospitals} nearby`, icon: "🏥", display: insights.hospitals },
  ];

  const distances = [
    { label: "Airport", value: insights.airportDistance, icon: "✈️" },
    { label: "Metro", value: insights.metroDistance, icon: "🚇" },
  ];

  return (
    <SectionCard className="overflow-hidden">
      <div className="relative">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <SectionTitle
          title="Area Intelligence"
          subtitle="AI-powered location insights powered by AreaIQ"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((m) => {
            const tone = scoreTone(m.value);
            return (
              <div
                key={m.label}
                className={`rounded-2xl border border-neutral-100 p-4 sm:p-5 ${tone.bg} transition-all hover:shadow-sm`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{m.icon}</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    {m.label}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className={`text-2xl font-bold tabular-nums ${tone.text}`}>
                    {m.display ?? (m.isPercent ? insights.rentalYield : m.value)}
                  </span>
                  <span className="text-xs font-medium text-neutral-400">{m.unit}</span>
                </div>
                <ProgressBar value={m.value} className="mt-3" />
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {distances.map((d) => (
            <div
              key={d.label}
              className="flex items-center gap-4 rounded-2xl border border-neutral-100 bg-white/80 px-4 py-4 backdrop-blur-sm sm:px-5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-xl">
                {d.icon}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{d.label} Distance</p>
                <p className="text-sm font-semibold text-neutral-900">{d.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <span>🔮</span> Future Developments
          </h3>
          <ul className="mt-3 space-y-2">
            {insights.futureDevelopments.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-neutral-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionCard>
  );
}
