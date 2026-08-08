/**
 * Pre-LLM domain gate for AreaIQ.
 * Rejects clearly off-topic messages BEFORE any OpenAI call (classifier or completion).
 */

export const AREA_IQ_DOMAIN_REDIRECT = `I'm AreaIQ, your AI Real Estate Advisor.

I only answer questions related to properties, builders, localities, pricing, investment, site visits, home loans and real estate intelligence.`;

export const AREA_IQ_DOMAIN_FOLLOW_UPS = [
  "3 BHK under 80 lakh in Mohali",
  "Tell me about Aerocity",
  "Dhakoli vs Peer Muchalla",
  "Where should I invest 80 lakh?",
  "Best localities in Zirakpur",
] as const;

/** Explicit off-topic signals — never spend tokens answering these. */
const UNRELATED_PATTERNS: RegExp[] = [
  /\b(python|javascript|typescript|java|c\+\+|golang|rust|ruby|php|sql|html|css)\b/i,
  /\b(binary\s*tree|linked\s*list|algorithm|leetcode|coding\s*problem|write\s*(a|me)\s*(script|function|code|program))\b/i,
  /\b(doraemon|pokemon|anime|netflix|bollywood|hollywoodwood)\b/i,
  /\b(ipl|cricket\s*score|football\s*match|world\s*cup|nba|fifa)\b/i,
  /\b(modi|rahul\s*gandhi|bjp|congress|election|politics|trump|biden)\b/i,
  /\b(recipe|cook(ing)?|ingredients|cake|biryani)\b/i,
  /\b(homework|essay|assignment|solve\s*this\s*math)\b/i,
  /\b(symptom|diagnos|prescription|covid|cancer\s*treatment)\b/i,
  /\b(celebrity|actress|actor|singer|instagram\s*influencer)\b/i,
  /\b(weather\s*(today|tomorrow)|temperature\s+in|who\s+(is|was)\b|capital\s+of)\b/i,
  /\b(movie|film|trailer|ott\s*series)\b/i,
  /\b(joke|riddle|poem|story\s*about)\b/i,
];

/** Strong real-estate / AreaIQ signals (documentation / tests). */
export const REAL_ESTATE_PATTERNS: RegExp[] = [
  /\b(propert(y|ies)|flat|apartment|villa|plot|bhk|sq\.?\s?(ft|yd)|carpet\s*area)\b/i,
  /\b(builder|developer|rera|registry|possession|under[\s-]?construction)\b/i,
  /\b(mohali|chandigarh|panchkula|zirakpur|dhakoli|peer\s*muchalla|kharar|aerocity|tricity|derabassi|landran|new\s*chandigarh|panchkula\s*ext(?:ension)?\s*[12]|pkl\s*ext(?:ension)?\s*[12]|amravati(?:\s*enclave)?)\b/i,
  /\b(invest(ment)?|roi|rental|yield|emi|home\s*loan|down\s*payment|appreciation)\b/i,
  /\b(site\s*visit|localit(y|ies)|amenities|floor\s*plan|price(s|ing)?|budget|lakh|crore)\b/i,
  /\b(areaiq|compare|seller|buyer|crm|saved\s*propert|notification)\b/i,
  /\b(legal\s*verif|market\s*trend|builder\s*reputation|area\s*intelligence)\b/i,
];

/** Short greetings / thanks — not off-topic. */
const GREETING_PATTERNS: RegExp[] = [
  /^(hi|hello|hey|namaste|thanks|thank\s*you|ok|okay|bye|good\s*(morning|evening|afternoon))[\s!.?]*$/i,
];

export function isClearlyUnrelated(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  if (GREETING_PATTERNS.some((re) => re.test(text))) return false;
  // Strong off-topic wins even when a real-estate keyword appears
  // (e.g. "joke about flat", "write python for EMI", "movie about builders").
  if (UNRELATED_PATTERNS.some((re) => re.test(text))) return true;
  return false;
}

export function buildUnrelatedStaticAnswer(): string {
  return `${AREA_IQ_DOMAIN_REDIRECT}

Try asking me:
• ${AREA_IQ_DOMAIN_FOLLOW_UPS[0]}
• ${AREA_IQ_DOMAIN_FOLLOW_UPS[1]}
• ${AREA_IQ_DOMAIN_FOLLOW_UPS[2]}`;
}
