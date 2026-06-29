# AreaIQ API Documentation

---

# Overview

Base URL

/api

Authentication

Bearer Token

JSON Request

JSON Response

---

# Authentication APIs

POST /api/auth/register

Register new user.

Roles

- Buyer
- Seller
- Builder
- Connect Partner

----------------------------------

POST /api/auth/login

Login user.

----------------------------------

POST /api/auth/logout

Logout current user.

----------------------------------

GET /api/auth/profile

Return logged in user.

----------------------------------

PUT /api/auth/profile

Update profile.

---

# Property APIs

GET /api/properties

Return all properties.

----------------------------------

GET /api/properties/:id

Property details.

----------------------------------

POST /api/properties

Create property.

Seller/Admin only.

----------------------------------

PUT /api/properties/:id

Update property.

----------------------------------

DELETE /api/properties/:id

Delete property.

---

# Project APIs

GET /api/projects

Return all projects.

----------------------------------

GET /api/projects/:id

Project details.

----------------------------------

POST /api/projects

Create project.

Builder/Admin only.

----------------------------------

PUT /api/projects/:id

Update project.

---

# Builder APIs

GET /api/builders

Builder list.

----------------------------------

GET /api/builders/:id

Builder profile.

----------------------------------

POST /api/builders

Create builder.

Admin only.

---

# Area APIs

GET /api/areas

Return areas.

----------------------------------

GET /api/areas/:id

Area Intelligence.

----------------------------------

GET /api/areas/compare

Compare two areas.

----------------------------------

GET /api/areas/growth

Growth score.

----------------------------------

GET /api/areas/trends

Market trends.

---

# AI APIs

POST /api/ai/chat

AI Chat.

----------------------------------

POST /api/ai/recommend

Property recommendation.

----------------------------------

POST /api/ai/compare

Compare properties.

----------------------------------

POST /api/ai/investment

Investment suggestion.

----------------------------------

POST /api/ai/location

Area recommendation.

---

# Buyer APIs

GET /api/buyer/dashboard

Buyer dashboard.

----------------------------------

GET /api/buyer/saved

Saved properties.

----------------------------------

POST /api/buyer/save

Save property.

----------------------------------

DELETE /api/buyer/save/:id

Remove saved property.

----------------------------------

POST /api/buyer/site-visit

Book site visit.

---

# Seller APIs

GET /api/seller/dashboard

----------------------------------

GET /api/seller/listings

----------------------------------

POST /api/seller/listing

----------------------------------

PUT /api/seller/listing/:id

----------------------------------

DELETE /api/seller/listing/:id

---

# Connect APIs

GET /api/connect/dashboard

----------------------------------

GET /api/connect/projects

----------------------------------

GET /api/connect/inventory

----------------------------------

GET /api/connect/leads

----------------------------------

PUT /api/connect/lead/:id

Update lead status.

---

# Master APIs

GET /api/master/dashboard

----------------------------------

GET /api/master/users

----------------------------------

GET /api/master/leads

----------------------------------

GET /api/master/builders

----------------------------------

GET /api/master/projects

----------------------------------

GET /api/master/properties

----------------------------------

GET /api/master/analytics

----------------------------------

POST /api/master/assign-lead

Assign Builder Lead.

---

# Lead APIs

POST /api/leads

Create lead.

----------------------------------

GET /api/leads/:id

----------------------------------

PUT /api/leads/:id

Update status.

----------------------------------

DELETE /api/leads/:id

---

# Notification APIs

GET /api/notifications

----------------------------------

POST /api/notifications/read

Mark as read.

----------------------------------

DELETE /api/notifications/:id

---

# Search APIs

GET /api/search

Global search.

----------------------------------

GET /api/search/property

----------------------------------

GET /api/search/project

----------------------------------

GET /api/search/builder

----------------------------------

GET /api/search/area

---

# Analytics APIs

GET /api/analytics/dashboard

----------------------------------

GET /api/analytics/leads

----------------------------------

GET /api/analytics/traffic

----------------------------------

GET /api/analytics/searches

---

# Blog APIs

GET /api/blog

----------------------------------

GET /api/blog/:slug

----------------------------------

POST /api/blog

Admin only.

----------------------------------

PUT /api/blog/:id

----------------------------------

DELETE /api/blog/:id

---

# Upload APIs

POST /api/upload/image

----------------------------------

POST /api/upload/document

----------------------------------

DELETE /api/upload/:id

---

# CRM APIs

GET /api/crm

----------------------------------

POST /api/crm/note

----------------------------------

PUT /api/crm/note/:id

----------------------------------

DELETE /api/crm/note/:id

---

# Future APIs

WhatsApp API

Meta Ads API

Google Maps API

RERA API

Payment API

Voice AI API

Document Verification API

Home Loan API