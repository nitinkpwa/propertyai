# AreaIQ Property Intelligence Scoring Engine (V1.0)

Deterministic · Transparent · Explainable  
Not AI-generated. Not random. Same inputs → same scores.

Competitive framing: **CIBIL × CarFax × Bloomberg × Morningstar — for real estate.**

---

## 1. Scoring architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     UI (cards / detail / admin)             │
│         Never knows factor source (DB / API / ML)           │
└───────────────────────────┬─────────────────────────────────┘
                            │ PropertyIntelligenceReport
┌───────────────────────────▼─────────────────────────────────┐
│              lib/scoring/engine.ts (orchestrator)           │
│  runPropertyIntelligenceScoring(context, analytics)         │
└───────┬──────────┬──────────┬──────────┬──────────┬─────────┘
        │          │          │          │          │
   AreaIQ     Investment   Legal    Builder   Location
   Score       Score       Score     Score     Score
        │          │          │          │          │
        └──────────┴──────────┴──────────┴──────────┘
                            │
              Factor sources (swappable):
              · lib/analytics (comps, growth, liquidity)
              · legal verification flags
              · builder_intelligence
              · nearby places / amenities
              · future: ML models, gov APIs, market feeds
```

**Three independent pillars** (never mixed):

| Pillar | Purpose | Range |
|--------|---------|-------|
| AreaIQ Score | Overall property quality | 0–100 |
| Investment Score | Investment attractiveness | 0–100 |
| Legal Score | Buyer confidence from documents | 0–100 |

Sub-scores (inputs / displays): Builder, Location, Price Fairness.

---

## 2. Files created

```
lib/scoring/
  types.ts              # Contracts, labels, report shapes
  weights.ts            # Default relative weights + version
  score-utils.ts        # Normalize, confidence, labels, tones
  derive-factors.ts     # Pure mappers from listing/analytics → factors
  areaiq-score.ts       # calculateAreaIQScore()
  investment-score.ts   # calculateInvestmentScore()
  legal-score.ts        # calculateLegalScore()
  builder-score.ts      # calculateBuilderScore()
  location-score.ts     # calculateLocationScore()
  price-fairness.ts     # calculatePriceFairness()
  engine.ts             # Orchestrator + card helpers
  weights-store.ts      # Admin DB weight loader (server)
  index.ts              # Public API

supabase/migrations/
  20260731120000_property_scoring_engine.sql

app/property/[id]/components/
  PropertyIntelligencePanel.tsx

components/admin/property/
  ScoreBreakdownCard.tsx

app/api/admin/scoring-weights/route.ts

docs/SCORING_ENGINE.md
```

Wired into:

- `lib/properties/intelligenceBundle.ts`
- `app/components/home/IntelligencePropertyCard.tsx`
- `app/property/[id]/PropertyDetailView.tsx`
- `app/property/[id]/components/PropertyHero.tsx`
- Admin CMS → **Score Engine** section

---

## 3. Database fields required

### `properties` (cache — always recomputable)

| Column | Type | Notes |
|--------|------|-------|
| `areaiq_score` | numeric | 0–100 |
| `investment_score` | numeric | 0–100 |
| `legal_score` | numeric | 0–100 |
| `builder_score` | numeric | 0–100 |
| `location_score` | numeric | 0–100 |
| `score_confidence` | numeric | AreaIQ confidence % |
| `score_label` | text | Excellent / Very Good / … |
| `legal_score_label` | text | Verified / … |
| `investment_score_label` | text | High Growth / … |
| `price_fairness_label` | text | Undervalued / Fair Value / … |
| `scores_computed_at` | timestamptz | Cache timestamp |
| `scores_engine_version` | text | e.g. `1.0.0` |
| `score_breakdown` | jsonb | Full factor audit |

### `scoring_weights` (admin)

| Column | Type |
|--------|------|
| `id` | uuid |
| `kind` | areaiq \| investment \| legal \| builder \| location |
| `label` | text |
| `weights` | jsonb |
| `is_active` | boolean |
| `notes` | text |
| `updated_by` | uuid → profiles |
| `created_at` / `updated_at` | timestamptz |

Existing inputs also used: legal verification booleans, `rera_number`, `amenities`, `nearby_places`, `builder_intelligence`, analytics comps.

---

## 4. Supabase migration

```
supabase/migrations/20260731120000_property_scoring_engine.sql
```

Apply with your usual Supabase workflow (`supabase db push` / SQL editor).

---

## 5. How each score is calculated

### AreaIQ Score

Weighted average of available factors (relative weights normalized):

| Factor | Default weight |
|--------|----------------|
| Location Quality | 20 |
| Builder Reputation | 15 |
| Construction Quality | 10 |
| Price Fairness | 15 |
| Connectivity | 10 |
| Amenities | 10 |
| Legal Verification | 10 |
| Demand | 5 |
| Future Infrastructure | 5 |
| Livability | 10 |

**Partial scoring:** every available factor contributes (weights renormalized).  
Missing factors lower **confidence only**.  
Insufficient Data only when weighted coverage **< 25%**.

Listing fields (builder name, locality, price, config, photos) feed conservative baselines
when market analytics are missing — this fixed Dayalpura Legal=100% / AreaIQ=null.

**Buyer-friendly curve** (`normalizeAreaIQDisplayScore`): maps raw weighted avg so solid
listings land ~75–95 without inflating weak ones (raw ≤50 stays ≤70).

**Labels:** 95+ Exceptional · 90+ Excellent · 85+ Very Good · 80+ Good · 75+ Promising · 70+ Average · else Needs Review.

### Investment Score

Independent factors: Capital Appreciation, Rental Yield, Entry Price, Exit Potential, Supply vs Demand, Infrastructure Growth, Liquidity, Builder Reliability, Market Trend, Risk.

**Labels:** 95+ Exceptional · 85+ High Growth · 70+ Strong · 55+ Moderate · else Weak Investment.

### Legal Score

Documents only: RERA, Registry, Ownership, Approved Maps, NOC, OC, Bank Approval, Title Clear, Encumbrance, Litigation.

- Verified docs = 100, failed = 0, unknown = excluded (lowers confidence)
- Confirmed litigation caps score at 35
- Requires ≥2 known documents

**Labels:** 90+ Verified · 75+ Mostly Verified · 50+ Partially Verified · 30+ Needs Verification · else High Risk.

### Builder / Location / Price Fairness

See `builder-score.ts`, `location-score.ts`, `price-fairness.ts`.  
Price fairness: Undervalued (≤−8%) · Fair Value (≤+5%) · Slightly Premium (≤+12%) · Overpriced.

---

## 6. How confidence is calculated

```
coverageConfidence = 100 - (1 - coverage) × 60
confidence = round(coverageConfidence × 0.9 + freshness × 10)
```

- **coverage** = usable factor weight / total factor weight  
- ~50% coverage → ~70% confidence  
- Missing factors listed explicitly; tooltip: “Based on currently verified data…”  
- Unavailable → `Insufficient Data` (not `—`)

---

## 7. How admin edits weights

1. Open Admin → property → **Score Engine**
2. Select pillar (areaiq / investment / legal / builder / location)
3. Edit relative weights
4. **Save & activate** → `PUT /api/admin/scoring-weights`
5. Previous active row for that kind is deactivated
6. Engine merges DB overrides with code defaults via `mergeWeights()`
7. Weights are **normalized at runtime** — they need not sum to exactly 100

---

## 8. Future ML integration plan

UI consumes `PropertyIntelligenceReport` only. Swap factor providers without UI changes:

| Phase | Source | Drop-in |
|-------|--------|---------|
| V1 (now) | Deterministic rules + analytics comps | `lib/scoring` + `lib/analytics` |
| V1.1 | Cache scores on write / cron | fill `properties.areaiq_score` etc. |
| V2 | Government APIs (RERA, registry) | enrich `LegalDocumentFlags` |
| V2 | Market feeds (price indices) | replace growth / trend factors |
| V3 | ML models | `derive-factors` calls model inference; same 0–100 factor contract |
| V3 | Builder analytics warehouse | `verifiedAreaiqScore` / delivery metrics |

**Rule:** ML may improve *factor values*. ML must never invent a top-level score without factor provenance. Every score stays explainable via `factors[]` + `explanation`.

---

## UI rules

- Never show `—` for scores → **Insufficient Data** + CTA  
- Tones: Green Excellent · Blue Good · Amber Average · Red Risk  
- Aesthetic: Apple / Bloomberg / Stripe — not gaming
