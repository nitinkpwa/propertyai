# AreaIQ - READ THIS FIRST

# STOP

Before making ANY code changes, read the documentation inside `/docs`.

Never assume.
Never guess.
Never invent business logic.

If documentation conflicts with code, documentation is the source of truth unless explicitly told otherwise.

---

# What is AreaIQ?

AreaIQ is NOT a property listing website.

AreaIQ is India's AI-powered Real Estate Intelligence Platform.

The platform helps buyers make informed decisions BEFORE purchasing real estate.

Listings are only one part of the platform.

The primary product is intelligence.

---

# Project Philosophy

Always optimize for:

1. Simplicity
2. Trust
3. Speed
4. AI Assistance
5. Data Accuracy

Never add unnecessary complexity.

Every feature must reduce user effort.

---

# Golden Rules

## Never fabricate data.

AI may summarize, compare and analyze.

AI must NEVER create fake property information.

All property information must originate from verified database records.

---

## Seller owns the property; Connect Partner is optional

The Seller owns and manages their listing end-to-end.

Connect Partner assignment is optional (at most one when assigned).

No secondary partners or partner sharing.

Without a partner, enquiries, visits, and deals stay with the seller.

---

## AI works automatically

AI should generate:

- summaries
- insights
- descriptions
- recommendations
- market observations

Users should NOT manually fill AI fields unless a future AI Agent specifically requires manual review.

---

## Keep business logic intact

Do NOT remove or modify workflows unless explicitly instructed.

Do NOT redesign architecture because "it seems cleaner."

Preserve existing business rules.

---

## Small changes only

Never rewrite large modules unless requested.

Prefer the smallest safe implementation.

Avoid touching unrelated files.

---

## Respect the Database

Never rename:

- database columns
- enums
- tables
- relationships

unless the migration is explicitly requested.

Always verify schema before changing queries.

---

## UI Philosophy

AreaIQ should feel like:

- Apple
- Stripe
- Linear
- Notion
- Vercel

NOT like a typical property portal.

Minimal.

Premium.

Fast.

Professional.

---

# Design Rules

Always prefer:

less clicks

less scrolling

less typing

more automation

more AI

clean layouts

consistent spacing

consistent typography

consistent colors

---

# AI First

Whenever a repetitive manual process exists, consider whether AI should perform it automatically.

The user should provide information.

AI should organize it.

---

# Current Development Phase

The platform is feature-rich.

Current priority is NOT adding features.

Current priority is:

- refinement
- stability
- UX
- performance
- consistency
- bug fixing

Avoid feature bloat.

---

# Before writing code ask yourself

Will this make AreaIQ:

✓ Simpler?

✓ Faster?

✓ More trustworthy?

✓ More intelligent?

If the answer is NO, do not implement it.

---

# Before every task

Read these documents:

1. Vision.md
2. Architecture.md
3. BUSINESS_RULES.md
4. CURRENT_STATE.md

Only then begin implementation.

---

# Coding Rules

Never leave TODOs.

Never leave dead code.

Never leave unused imports.

Never duplicate components.

Reuse existing design system.

Prefer composition over duplication.

Keep files clean.

---

# Error Handling

Never silently ignore errors.

Provide meaningful logging.

Provide graceful UI states.

Loading

Empty

Error

Success

Always exist.

---

# If uncertain

Do NOT guess.

Ask for clarification.

Wrong assumptions are more expensive than asking one question.

---

# Final Goal

We are building the most trusted AI-powered Real Estate Intelligence Platform in India.

Every decision should move AreaIQ closer to that vision.