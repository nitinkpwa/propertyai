import { calculateConfidence, unavailableConfidence } from "./confidence";
import { clampScore } from "./math";
import type { LegalScoreResult, SubjectPropertyInput } from "./types";
import { PENDING_VERIFICATION } from "./types";
import { isReraApproved } from "@/lib/properties/reraStatus";

/**
 * Legal score from observable compliance fields only.
 * Litigation / ownership / license — pending until verified data exists.
 */
export function calculateLegalScore(subject: SubjectPropertyInput): LegalScoreResult {
  const reraOk = isReraApproved({
    rera_number: subject.reraNumber,
  });

  const factors: LegalScoreResult["factors"] = [
    {
      label: "RERA",
      status: reraOk ? "pass" : subject.reraNumber === null ? "unknown" : "fail",
      detail: reraOk
        ? subject.reraNumber || "RERA indicated on listing"
        : "RERA number not verified on listing",
    },
    {
      label: "License",
      status: "unknown",
      detail: PENDING_VERIFICATION,
    },
    {
      label: "Approvals",
      status: "unknown",
      detail: PENDING_VERIFICATION,
    },
    {
      label: "Litigation",
      status: "unknown",
      detail: PENDING_VERIFICATION,
    },
    {
      label: "Ownership",
      status: "unknown",
      detail: PENDING_VERIFICATION,
    },
  ];

  if (!reraOk) {
    return {
      available: false,
      score: null,
      displayValue: PENDING_VERIFICATION,
      message: PENDING_VERIFICATION,
      status: "pending",
      factors,
      confidence: unavailableConfidence("RERA and legal documents not verified"),
    };
  }

  // Only RERA verified → partial legal score, not a fake full diligence score
  const score = clampScore(72);
  return {
    available: true,
    score,
    displayValue: String(score),
    message: "Partial — RERA on listing; other legal checks pending verification",
    status: "partial",
    factors,
    confidence: calculateConfidence({
      comparableCount: 4,
      dataQuality: 0.45,
      freshness: 0.7,
    }),
  };
}
