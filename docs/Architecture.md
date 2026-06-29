# AreaIQ System Architecture

---

# Overview

AreaIQ is an AI-powered Real Estate Intelligence Platform.

The platform consists of

- Website
- AI Engine
- CRM
- Builder Dashboard
- Seller Dashboard
- Buyer Dashboard
- Admin Panel
- Analytics Engine

Everything shares one centralized database.

------------------------------------------------------------

# High Level Architecture

                Visitors
                    │
                    ▼
          Next.js Frontend (Cloudflare)
                    │
                    ▼
            Authentication
             (Supabase Auth)
                    │
                    ▼
              Supabase Database
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
 Property       AI Engine        CRM
 Database      (OpenAI)        Management
      │             │             │
      └─────────────┼─────────────┘
                    ▼
            Notifications
                    │
                    ▼
          WhatsApp / Email / SMS

------------------------------------------------------------

# Frontend

Technology

- Next.js
- React
- Tailwind CSS
- TypeScript

Responsibilities

- Website
- Buyer Dashboard
- Seller Dashboard
- Builder Dashboard
- AI Chat
- Search
- Property Pages
- Area Pages

------------------------------------------------------------

# Backend

Technology

- Supabase

Responsibilities

- Authentication
- Database
- Storage
- APIs
- Realtime
- Row Level Security

------------------------------------------------------------

# AI Engine

Technology

- OpenAI API

Responsibilities

- AI Property Search
- Area Intelligence
- Investment Suggestions
- Builder Comparison
- Area Comparison
- Property Recommendation
- Chat Assistant
- SEO Content
- Blog Writing

------------------------------------------------------------

# CRM

Responsibilities

- Lead Management
- Lead Assignment
- Notifications
- Follow Ups
- Site Visits
- Reports

------------------------------------------------------------

# Buyer Dashboard

Modules

- Profile
- Saved Properties
- AI Chat
- Site Visits
- Notifications
- Property Comparison
- Area Comparison

------------------------------------------------------------

# Seller Dashboard

Modules

- Listings
- Buyer Inquiries
- Analytics
- Visits
- Notifications

------------------------------------------------------------

# Connect Dashboard

Modules

- Projects
- Inventory
- Builder Leads
- CRM
- Reports
- Team Members

------------------------------------------------------------

# Master Dashboard

Accessible only by AreaIQ Team.

Modules

- Users
- Builders
- Areas
- Projects
- Inventory
- Leads
- Reports
- AI Control
- Blog Generator
- Notifications
- CRM

------------------------------------------------------------

# Storage

Supabase Storage

Folders

/property-images

/project-images

/builder-logo

/user-profile

/blog-images

/documents

------------------------------------------------------------

# Notifications

Events

New Lead

↓

Builder Notification

↓

Buyer Notification

↓

Master Notification

↓

CRM Update

------------------------------------------------------------

# AI Workflow

User asks question

↓

AI receives prompt

↓

Reads Database

↓

Searches Properties

↓

Checks Areas

↓

Compares Builders

↓

Returns Recommendation

------------------------------------------------------------

# Builder Lead Flow

Buyer

↓

Property Inquiry

↓

Lead Created

↓

Master

↓

Builder Dashboard

↓

Builder Contacts Buyer

↓

Status Updated

↓

Reports Updated

------------------------------------------------------------

# Seller Lead Flow

Buyer

↓

Seller Property

↓

Seller Receives Lead

↓

Chat Starts

↓

Visit Scheduled

------------------------------------------------------------

# Content Engine

AI automatically creates

- Property Description
- Area Pages
- Builder Pages
- Blog Articles
- Social Media Posts
- SEO Pages

------------------------------------------------------------

# Analytics

Tracks

- Visitors
- Leads
- AI Usage
- Searches
- Builder Performance
- Area Popularity
- Property Views

------------------------------------------------------------

# Security

Supabase Authentication

Role Based Access

Buyer

Seller

Builder

Connect

Admin

Master

------------------------------------------------------------

# Future Integrations

Meta Ads

WhatsApp API

Google Maps

RERA APIs

Loan APIs

Payment Gateway

Document Verification

Voice AI

------------------------------------------------------------

# Deployment

GitHub

↓

Cloudflare Pages

↓

Cloudflare Workers

↓

Supabase

↓

OpenAI

↓

Production