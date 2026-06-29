# AreaIQ Security

---

# Overview

AreaIQ stores sensitive user data including

- User Accounts
- Properties
- Builder Information
- Leads
- AI Conversations
- CRM Notes

Security is a top priority.

------------------------------------------------------------

# Authentication

Provider

Supabase Auth

Methods

- Email
- Google
- Phone (Future)

Password

Encrypted

Sessions

JWT Tokens

------------------------------------------------------------

# User Roles

Guest

Buyer

Seller

Builder

Connect Partner

Admin

Master

Each role has different permissions.

------------------------------------------------------------

# Permissions

Guest

Can

- Browse
- Search
- AI Demo

Cannot

- Contact
- Save
- Chat
- Dashboard

------------------------------------------------------------

Buyer

Can

- Save Property
- Contact Builder
- Contact Seller
- Ask AI
- Book Visit
- Compare Properties

Cannot

- Edit Listings
- View CRM

------------------------------------------------------------

Seller

Can

- Create Listings
- Edit Listings
- Receive Leads
- Chat with Buyers

Cannot

- View Builder Data

------------------------------------------------------------

Builder

Can

- Manage Projects
- Manage Inventory
- Receive Leads
- Update Lead Status

Cannot

- Access Master Dashboard

------------------------------------------------------------

Connect Partner

Can

- Receive Builder Leads
- Update CRM
- Schedule Visits

Cannot

- Delete Projects

------------------------------------------------------------

Admin

Can

Manage

- Users
- Properties
- Builders
- Reports
- Blog

------------------------------------------------------------

Master

Full Access

Everything.

------------------------------------------------------------

# Row Level Security

Supabase RLS enabled.

Examples

Buyer

Can only access

Own Profile

Own Saved Properties

Own Chats

Own Visits

------------------------------------------------------------

Seller

Can only access

Own Listings

Own Leads

------------------------------------------------------------

Builder

Can only access

Own Projects

Own Inventory

Own Leads

------------------------------------------------------------

# API Security

Every API requires

Authentication

Role Validation

Permission Validation

------------------------------------------------------------

# Upload Security

Allowed

jpg

png

jpeg

pdf

Maximum Size

20 MB

Virus Scan

Future

------------------------------------------------------------

# Rate Limiting

AI Chat

50 requests/hour

Login

10 attempts/hour

Search

Unlimited

------------------------------------------------------------

# Data Encryption

Passwords

Encrypted

JWT

Encrypted

HTTPS

Required

------------------------------------------------------------

# Activity Logs

Log

Login

Logout

Property Updates

Lead Assignment

Profile Changes

AI Usage

------------------------------------------------------------

# Backup

Daily Database Backup

Weekly Storage Backup

Monthly Archive

------------------------------------------------------------

# Future Security

Two Factor Authentication

OTP Login

Face Verification

Aadhaar Verification

Builder Verification

Digital Signature

Document Verification