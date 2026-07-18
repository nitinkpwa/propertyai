# AreaIQ Business Rules

Version: 1.0
Status: Source of Truth

---

# Purpose

This document defines the permanent business rules of AreaIQ.

These rules must NOT be changed unless explicitly requested by the product owner.

Technology may change.

UI may change.

Database may change.

Business Rules should remain stable.

---

# Platform Identity

AreaIQ is NOT a real estate listing portal.

AreaIQ is India's AI-powered Real Estate Intelligence Platform.

The platform exists to help buyers make better property decisions using verified data, AI analysis and trusted professionals.

Properties are the medium.

Intelligence is the product.

---

# Core Users

There are only five primary user types.

## Visitor

Can:

- Browse properties
- Search with AI
- Read insights
- Compare projects
- Ask questions

Cannot:

- Contact sellers directly
- Edit data
- Access CRM

---

## Buyer

Can:

- Save properties
- Compare projects
- Book site visits
- Chat with AI
- Contact the seller (or assigned Connect Partner when one is set)
- Receive recommendations
- Track enquiries

Cannot:

- Edit listings
- Access admin tools

---

## Seller

Can:

- Create properties
- Edit own listings
- Upload documents
- Track enquiries
- View analytics

Cannot:

- Manage buyers
- Access other sellers
- Change platform settings

---

## Connect Partner

Optional assistant for a property when Admin assigns one (at most one).

When assigned, may:

- Assist with buyer enquiries
- Schedule visits
- Manage communication
- Convert leads
- Update CRM

Cannot:

- Modify platform settings
- Change ownership (seller remains owner)
- View unrelated properties
- Block property approval or go-live

---

## Admin

Has full platform access.

Responsible for:

- Moderation
- Approvals
- User management
- Analytics
- AI configuration
- Platform management

---

# Property Ownership

Every property has ONE owner.

The owner may be:

- Builder
- Individual Seller
- Agency

Ownership never changes automatically.

---

# Connect Assignment

Connect Partner assignment is OPTIONAL.

The Seller is the primary owner and manager of the property throughout its lifecycle.

When no Connect Partner is assigned:

- the property functions normally
- the seller manages enquiries
- the seller schedules visits
- the seller closes deals

When a Connect Partner is assigned (Admin action):

- at most ONE partner may be assigned to a property
- there are no secondary, backup, or shared partners
- that partner may assist with buyer enquiries for the listing
- changing the partner transfers future assisted enquiries only unless manually reassigned

Admin may Assign or Remove a Connect Partner at any time without blocking approval.

---

# Buyer Journey

Buyer should require the minimum possible effort.

Preferred flow:

Discover

↓

Ask AI

↓

Compare

↓

Shortlist

↓

Book Visit

↓

Connect Partner

↓

Purchase

Never force unnecessary forms.

Never ask the same information twice.

---

# Seller Journey

Seller creates listing.

↓

Pending Review

↓

Admin review

↓

Approve → Live · Reject → Seller edits and resubmits

↓

Buyer enquiries go to the Seller

↓

(Optional) Admin assigns Connect Partner to assist

Seller can NEVER publish directly. Only AreaIQ Admin may set a listing to Published/Active. Connect Partner assignment is optional and never required for approval.

---

# Property Creation

Property Studio is the ONLY official property creation workflow.

No other page should create listings.

Property Studio must always:

Validate

Autosave

Generate AI content

Publish safely

---

# AI Rules

AI assists.

AI does NOT replace verified information.

AI may:

Generate descriptions

Summarize amenities

Compare projects

Recommend properties

Explain locations

Answer buyer questions

AI must NEVER:

Invent prices

Invent builders

Invent amenities

Invent approvals

Invent locations

Invent legal information

Invent availability

When uncertain,

AI must clearly state uncertainty.

---

# Data Integrity

All property information originates from verified database records.

Database is always the source of truth.

AI is never the source of truth.

---

# Property Status

Typical lifecycle:

Seller creates listing (Pending Review)

↓

Admin reviews

↓

Approve → Live (`active`) · Reject → Seller edits and resubmits

↓

Sold / Rented / Paused

↓

Archived

Only valid transitions should be allowed.

Connect Partner is not required for approval or go-live. Seller remains owner; enquiries go to the seller unless a partner is optionally assigned.

---

# Documents

Documents belong to properties.

Documents may include:

Brochures

Floor Plans

Approvals

Certificates

Images

Videos

Documents are never deleted automatically.

---

# Site Visits

Site visits always belong to:

Buyer

+

Property

+

Assigned Connect Partner

Site visits should always have status tracking.

---

# CRM

Every enquiry creates a CRM record.

CRM tracks:

Lead

Communication

Visit

Follow-up

Outcome

Nothing should bypass CRM.

---

# Notifications

Every meaningful event generates notifications.

Examples:

New enquiry

Visit booked

Visit completed

Property approved

Property rejected

Property published

Lead assigned

---

# Search

Search is AI-first.

Users should be able to search naturally.

Examples:

"I want a villa under 2 crore."

"Near airport."

"Best investment."

"Schools nearby."

Traditional filters should remain available.

---

# AI Search

AI should understand intent.

Not only keywords.

Examples:

Family needs

Investment goals

Rental yield

Lifestyle

Future appreciation

Budget

Commute

---

# Trust

AreaIQ must always prefer:

Accuracy

Transparency

Verification

Honest uncertainty

Never manipulate rankings.

Never fabricate information.

Never hide important facts.

---

# Automation

Whenever possible,

AI should automate repetitive work.

Examples:

Property description

SEO

Summaries

Highlights

Buyer recommendations

Insights

Manual work should be minimized.

---

# Design Principles

Every page should answer:

What is this?

What can I do here?

What should I do next?

No page should confuse users.

---

# Product Philosophy

Every feature must improve at least one:

✔ Simplicity

✔ Speed

✔ Trust

✔ Intelligence

✔ Automation

If it improves none,

do not build it.

---

# Non-Negotiable Rules

✓ Seller owns the property; Connect Partner is optional (at most one when assigned)

✓ One Source of Truth = Database

✓ AI Assists, Never Invents

✓ Property Studio Creates Listings

✓ CRM Records Every Enquiry

✓ Buyer Experience First

✓ Automation Over Manual Work

✓ Simplicity Over Complexity

✓ Intelligence Over Listings

✓ Trust Above Everything