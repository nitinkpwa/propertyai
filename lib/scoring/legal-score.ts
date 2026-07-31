import {
  buildExplanation,
  calculateFactorConfidence,
  clampScore,
  factor,
  legalLabel,
  scoreToneFromValue,
} from "./score-utils";
import {
  LEGAL_DEFAULT_WEIGHTS,
  SCORING_ENGINE_VERSION,
  mergeWeights,
} from "./weights";
import type { LegalScoreInput, ScoredResult } from "./types";
import { INSUFFICIENT_DATA, INSUFFICIENT_DATA_CTA } from "./types";

function docScore(flag: boolean | null): number | null {
  if (flag === null) return null;
  return flag ? 100 : 0;
}

/**
 * Legal Score — buyer confidence from verified documents ONLY.
 * Independent of AreaIQ and Investment scores.
 *
 * Litigation present → hard penalty.
 * Unknown documents lower confidence, never invent "Verified".
 */
export function calculateLegalScore(input: LegalScoreInput): ScoredResult {
  const w = mergeWeights(LEGAL_DEFAULT_WEIGHTS, input.weights);
  const d = input.documents;

  const factors = [
    factor("rera", "RERA", w.rera, docScore(d.rera), d.rera ? "RERA verified" : d.rera === false ? "RERA missing" : null),
    factor(
      "registry",
      "Registry",
      w.registry,
      docScore(d.registry),
      d.registry ? "Registry confirmed" : null,
    ),
    factor(
      "ownership",
      "Ownership",
      w.ownership,
      docScore(d.ownership),
      d.ownership ? "Ownership verified" : null,
    ),
    factor(
      "approvedMaps",
      "Approved Maps",
      w.approvedMaps,
      docScore(d.approvedMaps),
      d.approvedMaps ? "Approved maps on file" : null,
    ),
    factor("noc", "NOC", w.noc, docScore(d.noc), d.noc ? "NOCs verified" : null),
    factor(
      "occupationCertificate",
      "Occupation Certificate",
      w.occupationCertificate,
      docScore(d.occupationCertificate),
      d.occupationCertificate ? "Occupation certificate verified" : null,
    ),
    factor(
      "bankApproval",
      "Bank Approval",
      w.bankApproval,
      docScore(d.bankApproval),
      d.bankApproval ? "Bank approved" : null,
    ),
    factor(
      "titleClear",
      "Title Clear",
      w.titleClear,
      docScore(d.titleClear),
      d.titleClear ? "Title clear" : d.titleClear === false ? "Title issues flagged" : null,
    ),
    factor(
      "encumbrance",
      "Encumbrance",
      w.encumbrance,
      docScore(d.encumbrance),
      d.encumbrance ? "Encumbrance clear" : null,
    ),
  ];

  // Litigation: known present = fail; known clear = pass; unknown = missing
  const litigationScore =
    d.litigation === null ? null : d.litigation === true ? 0 : 100;
  factors.push(
    factor(
      "litigation",
      "Litigation",
      12, // fixed weight for visibility in breakdown
      litigationScore,
      d.litigation === true
        ? "Active litigation risk"
        : d.litigation === false
          ? "No litigation on record"
          : null,
    ),
  );

  const known = factors.filter((f) => f.available && f.score != null);
  const confidence = calculateFactorConfidence(factors, {
    dataQuality: known.length / factors.length,
    freshness: 0.85,
  });

  // Partial: score from whatever documents are known. Gate on 25% document-weight coverage.
  const totalDocWeight = factors.reduce((s, f) => s + (f.weight > 0 ? f.weight : 0), 0);
  const knownWeight = known.reduce((s, f) => s + f.weight, 0);
  const docCoverage = totalDocWeight > 0 ? knownWeight / totalDocWeight : 0;

  if (known.length === 0 || docCoverage < 0.25) {
    const explanation = buildExplanation(factors);
    return {
      available: false,
      score: null,
      label: INSUFFICIENT_DATA,
      displayValue: INSUFFICIENT_DATA,
      message: INSUFFICIENT_DATA_CTA,
      confidence,
      factors,
      explanation,
      tone: "neutral",
      engineVersion: SCORING_ENGINE_VERSION,
      weightsUsed: { ...w, litigation: 12 },
    };
  }

  const weightSum = knownWeight;
  let raw = known.reduce((s, f) => s + ((f.score as number) * f.weight) / weightSum, 0);

  // Hard penalty if litigation confirmed
  if (d.litigation === true) {
    raw = Math.min(raw, 35);
  }

  const score = clampScore(raw);
  const label = legalLabel(score);
  const explanation = buildExplanation(factors, {
    positiveThreshold: 99,
    negativeThreshold: 1,
  });

  // Prefer document-status phrasing for positives
  explanation.positive = known
    .filter((f) => f.score === 100)
    .slice(0, 4)
    .map((f) => f.detail || f.label);
  explanation.negative = [
    ...known.filter((f) => f.score === 0).map((f) => f.detail || `${f.label} not verified`),
    ...factors
      .filter((f) => !f.available)
      .slice(0, 2)
      .map((f) => `${f.label} needs verification`),
  ].slice(0, 4);

  return {
    available: true,
    score,
    label,
    displayValue: String(score),
    message: null,
    confidence,
    factors,
    explanation,
    tone: scoreToneFromValue(score, "legal"),
    engineVersion: SCORING_ENGINE_VERSION,
    weightsUsed: { ...w, litigation: 12 },
  };
}
