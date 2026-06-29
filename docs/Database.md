# AreaIQ Database Structure

---

# Overview

AreaIQ uses a relational database.

Everything revolves around Users, Properties, Builders, Projects and Leads.

---

# Users

Purpose

Stores every registered account.

Fields

- id
- full_name
- email
- mobile
- password
- role
- profile_photo
- city
- state
- created_at
- updated_at

Roles

- Buyer
- Seller
- Builder
- Connect Partner
- Admin

---

# Buyers

Purpose

Buyer specific information.

Fields

- buyer_id
- user_id
- budget_min
- budget_max
- preferred_city
- preferred_area
- property_type
- buying_purpose
- loan_required
- timeline
- lead_score

---

# Sellers

Purpose

Seller profile.

Fields

- seller_id
- user_id
- verification_status
- total_properties
- active_listings

---

# Builders

Purpose

Stores Builder information.

Fields

- builder_id
- company_name
- logo
- description
- office_address
- website
- email
- phone
- rera_number
- verified

---

# Connect Partners

Purpose

Builder sales teams or channel partners.

Fields

- connect_id
- builder_id
- company_name
- contact_person
- mobile
- email
- city
- active

---

# Projects

Purpose

Builder projects.

Fields

- project_id
- builder_id
- project_name
- city
- area
- possession
- construction_status
- project_description
- latitude
- longitude

---

# Properties

Purpose

All properties.

Fields

- property_id
- project_id
- seller_id
- builder_id
- listing_type
- property_type
- title
- description
- price
- area_sqft
- bedrooms
- bathrooms
- floor
- parking
- furnishing
- status

Status

- Available
- Sold
- Reserved

---

# Property Images

Fields

- image_id
- property_id
- image_url
- sort_order

---

# Areas

Purpose

Area Intelligence.

Fields

- area_id
- city
- area_name
- growth_score
- rental_yield
- livability_score
- future_score
- appreciation
- average_price
- future_projects

---

# Infrastructure

Stores upcoming developments.

Fields

- infra_id
- area_id
- title
- category
- completion_year
- impact_score

---

# Leads

Purpose

Stores every inquiry.

Fields

- lead_id
- property_id
- buyer_id
- builder_id
- seller_id
- source
- status
- created_at

Status

- New
- Contacted
- Qualified
- Site Visit
- Negotiation
- Closed
- Lost

---

# Lead Assignment

Purpose

Tracks where lead goes.

Fields

- assignment_id
- lead_id
- assigned_to
- assigned_role
- assigned_at

---

# Site Visits

Fields

- visit_id
- property_id
- buyer_id
- builder_id
- seller_id
- visit_date
- status

---

# AI Chats

Fields

- chat_id
- buyer_id
- question
- answer
- created_at

---

# Saved Properties

Fields

- save_id
- buyer_id
- property_id
- created_at

---

# Notifications

Fields

- notification_id
- user_id
- title
- message
- type
- read
- created_at

---

# Documents

Fields

- document_id
- property_id
- builder_id
- seller_id
- file_url
- type

Examples

- Brochure
- Floor Plan
- Price List
- Approval
- RERA

---

# Builder Inventory

Fields

- inventory_id
- builder_id
- project_id
- available_units
- updated_at

---

# CRM Notes

Fields

- note_id
- lead_id
- user_id
- note
- created_at

---

# Market Reports

Fields

- report_id
- area_id
- title
- report
- created_at

---

# Blogs

Fields

- blog_id
- title
- slug
- category
- content
- author
- published

---

# Activity Logs

Fields

- log_id
- user_id
- action
- ip_address
- created_at