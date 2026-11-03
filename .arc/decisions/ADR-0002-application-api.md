---
id: ADR-0002
category: component
title: Application API
status: accepted
superseded_by: null
component_id: comp_application_api
responsibility: Tenant-aware business logic and data access for a configurable multi-tenant
  platform adaptable to domains such as Defect Management, Project Management, CRM,
  Inventory, Help Desk, Asset Tracking and Workflow Automation; enforces tenant scoping
  and role-based access; sends email and Slack/Teams notifications (in-process module
  for now, no separate worker).
kind: api_service
split_reason: Separate runtime from the web UI; owns defect data and authorization
  rules.
talks_to:
- component_id: comp_relational_database
  interaction: sync
  evidence: API reads and writes defect data.
evidence: 'User: generic multi-tenant web application; "Email plus Slack or Teams".'
---

## Context

User: generic multi-tenant web application; "Email plus Slack or Teams".

## Decision

Tenant-aware business logic and data access for a configurable multi-tenant platform adaptable to domains such as Defect Management, Project Management, CRM, Inventory, Help Desk, Asset Tracking and Workflow Automation; enforces tenant scoping and role-based access; sends email and Slack/Teams notifications (in-process module for now, no separate worker).

Kept separate because Separate runtime from the web UI; owns defect data and authorization rules..

## Talks to

- **Relational Database** (sync) — API reads and writes defect data.
