"use client";

interface AiInsight {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

interface AiInsightsProps {
  insights: AiInsight[];
}

export default function AiInsights({ insights }: AiInsightsProps) {
  if (insights.length === 0) return null;

  return (
    <section aria-label="AI suggestions">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-sm">🤖</span>
        <div>
          <h2 className="text-lg font-bold text-heading-primary">AI Suggestions</h2>
          <p className="text-xs text-muted">Personalized for your search</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {insights.map((insight) => (
          <div
            key={insight.title}
            className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">{insight.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-heading-primary">{insight.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-body">{insight.description}</p>
                {insight.actionHref ? (
                  <a
                    href={insight.actionHref}
                    className="mt-2 inline-block text-xs font-semibold text-violet-700 hover:text-violet-800"
                  >
                    {insight.actionLabel ?? "Learn more →"}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function buildDashboardInsights(input: {
  recommendedCount: number;
  upcomingVisits: number;
  profileComplete: boolean;
  preferredLocations: string[];
  savedCount: number;
}): AiInsight[] {
  const insights: AiInsight[] = [];

  if (input.recommendedCount > 0) {
    insights.push({
      icon: "🏠",
      title: `${input.recommendedCount} properties match your profile`,
      description: input.preferredLocations.length
        ? `New listings in ${input.preferredLocations.slice(0, 2).join(", ")} worth exploring.`
        : "Complete your preferred areas to get sharper matches.",
      actionLabel: "View recommendations →",
      actionHref: "#recommended",
    });
  }

  if (input.upcomingVisits > 0) {
    insights.push({
      icon: "📋",
      title: "Prepare for your upcoming visit",
      description: "Review the AI checklist and questions to ask the builder before you go.",
      actionLabel: "View visit details →",
      actionHref: "/buyer/site-visits",
    });
  }

  if (!input.profileComplete) {
    insights.push({
      icon: "✨",
      title: "Better matches await",
      description: "Add your budget, purpose, and timeline for AI-powered property picks.",
      actionLabel: "Complete profile →",
      actionHref: "/buyer/profile",
    });
  }

  if (input.savedCount >= 2) {
    insights.push({
      icon: "⚖️",
      title: "Ready to compare?",
      description: `You have ${input.savedCount} saved properties. Compare side-by-side to find the best value.`,
      actionLabel: "Open compare →",
      actionHref: "/buyer/compare",
    });
  }

  return insights.slice(0, 4);
}
