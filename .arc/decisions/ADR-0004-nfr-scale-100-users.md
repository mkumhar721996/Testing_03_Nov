---
id: ADR-0004
category: nfr
title: "NFR: Scale \u2014 < 100 users"
status: accepted
superseded_by: null
dimension: Scale
metric: Concurrent named users across all tenants
threshold: < 100 users
component_id: null
needs_dedicated_tracking: true
evidence: 'User: "Small: under 100 users, business-hours uptime"; threshold taken
  from that wording.'
---

## Context

User: "Small: under 100 users, business-hours uptime"; threshold taken from that wording.

## Decision

Concurrent named users across all tenants: < 100 users
