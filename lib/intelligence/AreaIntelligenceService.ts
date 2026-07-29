import { fetchMarketContext, fetchPropertyIntelligenceInput } from "./data/marketContext";
import { calculateGrowthScore, calculateDemandIndex } from "./calculations/growthScore";
import { calculateRentalYield } from "./calculations/rentalYield";
import {
  builderReputationMetric,
  builderScoreForInvestment,
  calculateBuilderAnalysis,
} from "./calculations/builderAnalysis";
import {
  connectivityScore,
  countNearbyByType,
  getConnectivity,
} from "./calculations/connectivity";
import { calculateInvestmentScore } from "./calculations/investmentScore";
import type { AreaIntelligenceReport, MarketContext, PropertyIntelligenceInput } from "./types";
import { summarizeReportMetrics } from "./utils";
import { recordPerf, timed } from "@/lib/perf/timing";

export class AreaIntelligenceService {
  /**
   * Pure report build from already-loaded property + optional market context.
   * Prefer this from property detail to avoid re-fetching the same rows.
   */
  async generateReportFromInputs(
    property: PropertyIntelligenceInput,
    market?: MarketContext,
  ): Promise<AreaIntelligenceReport> {
    const t0 = performance.now();
    const marketCtx =
      market ??
      (await timed("areaIntel.fetchMarketContext", () =>
        fetchMarketContext(property.city, property.location, property.id),
      ));

    const growthScore = calculateGrowthScore(property, marketCtx);
    const rentalYield = calculateRentalYield(property, marketCtx);
    const demandIndex = calculateDemandIndex(property, marketCtx);
    const builderAnalysis = calculateBuilderAnalysis(property, marketCtx);
    const builderReputation = builderReputationMetric(builderAnalysis);
    const connectivity = getConnectivity(property);
    const schoolsNearby = countNearbyByType(property, ["school", "college", "university"]);
    const hospitalsNearby = countNearbyByType(property, ["hospital", "clinic", "medical"]);

    const investmentScore = calculateInvestmentScore([
      { weight: 30, metric: growthScore.available ? growthScore : null, label: "Area Growth" },
      {
        weight: 20,
        metric: connectivityScore(connectivity),
        label: "Connectivity",
      },
      { weight: 15, metric: rentalYield.available ? rentalYield : null, label: "Rental Yield" },
      {
        weight: 15,
        metric: builderScoreForInvestment(builderAnalysis),
        label: "Builder Reputation",
      },
      { weight: 10, metric: demandIndex.available ? demandIndex : null, label: "Demand" },
      {
        weight: 10,
        metric: schoolsNearby.available || hospitalsNearby.available
          ? {
              available: true,
              value: clampInfraScore(schoolsNearby, hospitalsNearby),
              displayValue: String(clampInfraScore(schoolsNearby, hospitalsNearby)),
              source: "AreaIQ Database",
            }
          : null,
        label: "Infrastructure",
      },
    ]);

    const body: Omit<AreaIntelligenceReport, "availableMetrics" | "unavailableMetrics"> = {
      propertyId: property.id,
      generatedAt: new Date().toISOString(),
      growthScore,
      rentalYield,
      investmentScore,
      builderReputation,
      demandIndex,
      schoolsNearby,
      hospitalsNearby,
      connectivity,
      builderAnalysis,
      futureOutlook: {
        available: false,
        value: null,
        displayValue: "Analysis pending",
        source: null,
      },
      marketSnapshot: {
        comparableListings: marketCtx.totalListings,
        city: marketCtx.city,
        locality: property.location,
      },
    };

    const { availableMetrics, unavailableMetrics } = summarizeReportMetrics(body);

    recordPerf("areaIntel.generateReportFromInputs.total", performance.now() - t0, {
      propertyId: property.id,
      marketListings: marketCtx.totalListings,
      reusedMarket: Boolean(market),
    });

    return {
      ...body,
      availableMetrics,
      unavailableMetrics,
    };
  }

  async generateReport(propertyId: string): Promise<AreaIntelligenceReport | null> {
    const t0 = performance.now();
    const property = await timed("areaIntel.fetchProperty", () =>
      fetchPropertyIntelligenceInput(propertyId),
    );
    if (!property) {
      recordPerf("areaIntel.generateReport.total", performance.now() - t0, {
        propertyId,
        empty: true,
      });
      return null;
    }

    const report = await this.generateReportFromInputs(property);
    recordPerf("areaIntel.generateReport.total", performance.now() - t0, {
      propertyId,
      marketListings: report.marketSnapshot.comparableListings,
    });
    return report;
  }

  calculateGrowthScore = calculateGrowthScore;
  calculateRentalYield = calculateRentalYield;
  calculateInvestmentScore = calculateInvestmentScore;
  getNearbySchools = (property: Parameters<typeof countNearbyByType>[0]) =>
    countNearbyByType(property, ["school", "college", "university"]);
  getNearbyHospitals = (property: Parameters<typeof countNearbyByType>[0]) =>
    countNearbyByType(property, ["hospital", "clinic", "medical"]);
  getConnectivity = getConnectivity;
  getBuilderAnalysis = calculateBuilderAnalysis;
}

function clampInfraScore(
  schools: ReturnType<typeof countNearbyByType>,
  hospitals: ReturnType<typeof countNearbyByType>,
): number {
  const schoolCount = schools.available ? schools.value ?? 0 : 0;
  const hospitalCount = hospitals.available ? hospitals.value ?? 0 : 0;
  return Math.min(100, schoolCount * 15 + hospitalCount * 20 + (schoolCount > 0 && hospitalCount > 0 ? 20 : 0));
}

export const areaIntelligenceService = new AreaIntelligenceService();

export async function generateOpenAIInsights(
  propertyName: string,
  city: string,
  location: string,
  report: AreaIntelligenceReport,
): Promise<string> {
  const { completeText } = await import("@/lib/ask/engine/openai");

  const facts = [
    report.growthScore.available
      ? `Growth Score: ${report.growthScore.displayValue} (${report.growthScore.source})`
      : "Growth Score: insufficient data",
    report.rentalYield.available
      ? `Rental Yield: ${report.rentalYield.displayValue} (${report.rentalYield.source})`
      : "Rental Yield: insufficient data",
    report.investmentScore.available
      ? `Investment Score: ${report.investmentScore.displayValue} (${report.investmentScore.source})`
      : "Investment Score: insufficient data",
    report.builderReputation.available
      ? `Builder Reputation: ${report.builderReputation.displayValue} (${report.builderReputation.source})`
      : "Builder Reputation: insufficient data",
    `${report.marketSnapshot.comparableListings} comparable listings in ${report.marketSnapshot.city}`,
  ].join("\n");

  const system = `You are AreaIQ Intelligence Engine. Provide qualitative future outlook for a Tricity property.

RULES:
- Do NOT invent numbers, scores, prices, or percentages.
- Do NOT contradict the verified facts provided.
- Write 2-4 bullet points explaining future outlook based on area trends.
- Focus on infrastructure, rental demand, investment potential, and risks.
- If data is insufficient, say so honestly.`;

  return completeText(
    system,
    `Property: ${propertyName}\nLocation: ${location}, ${city}\n\nVerified facts:\n${facts}\n\nProvide future outlook bullets only.`,
    { maxTokens: 500 },
  );
}

export type { AreaIntelligenceReport } from "./types";
