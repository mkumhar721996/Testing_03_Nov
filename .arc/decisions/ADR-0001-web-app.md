---
id: ADR-0001
category: component
title: Web App
status: accepted
superseded_by: null
component_id: comp_web_app
responsibility: Browser UI for Administrators, Business Users, Managers, Operations
  Teams and optional External Customers, adaptable per tenant and business domain.
kind: web_ui
split_reason: Separate client runtime (browser) from the API.
talks_to:
- component_id: comp_application_api
  interaction: sync
  evidence: Browser UI calls the API for all defect operations.
evidence: 'User: generic multi-tenant web application; target users Administrators,
  Business Users, Managers, Operations Teams, External Customers (optional).'
---

## Context

User: generic multi-tenant web application; target users Administrators, Business Users, Managers, Operations Teams, External Customers (optional).

## Decision

Browser UI for Administrators, Business Users, Managers, Operations Teams and optional External Customers, adaptable per tenant and business domain.

Kept separate because Separate client runtime (browser) from the API..

## Talks to

- **Application API** (sync) — Browser UI calls the API for all defect operations.
