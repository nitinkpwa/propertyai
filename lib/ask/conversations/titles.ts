import type { AskEngineIntent } from "@/lib/ask/engine/types";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";

interface TitleInput {
  userMessage: string;
  intent?: AskEngineIntent;
  location?: string | null;
  budget?: number | null;
  bedrooms?: number | null;
  compareTargets?: string[];
}

function formatBudgetLakh(budget: number): string {
  return formatInrAmount(budget).replace(/\s/g, "");
}

function truncate(text: string, max = 48): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1)}…`;
}

export function generateConversationTitle(input: TitleInput): string {
  const msg = input.userMessage.toLowerCase();
  const location = input.location ?? "";
  const bhk = input.bedrooms ? `${input.bedrooms}BHK` : "";
  const budget = input.budget ? formatBudgetLakh(input.budget) : "";

  if (input.intent === "COMPARE" && input.compareTargets && input.compareTargets.length >= 2) {
    return truncate(`${input.compareTargets[0]} vs ${input.compareTargets[1]}`);
  }

  if (input.intent === "INVESTMENT" && budget) {
    return truncate(`Investment ${budget}${location ? ` ${location}` : ""}`);
  }

  if (bhk && budget && location) {
    return truncate(`${bhk} under ${budget} ${location}`);
  }

  if (bhk && location) {
    return truncate(`${bhk} in ${location}`);
  }

  if (budget && location) {
    return truncate(`Budget ${budget} ${location}`);
  }

  if (msg.includes("rental yield")) return "Rental Yield Discussion";
  if (msg.includes("aerocity")) return "Aerocity Analysis";
  if (msg.includes("mohali")) return truncate(`Mohali — ${input.userMessage}`);
  if (msg.includes("compare")) return truncate(input.userMessage);
  if (msg.includes("invest")) return truncate(`Investment — ${input.userMessage}`);
  if (msg.includes("emi") || msg.includes("loan")) return "Home Loan / EMI";
  if (msg.includes("rera") || msg.includes("registry")) return "Legal & Documentation";

  return truncate(input.userMessage) || "New conversation";
}
