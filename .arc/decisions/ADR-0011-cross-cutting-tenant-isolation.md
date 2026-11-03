---
id: ADR-0011
category: cross_cutting
title: 'Cross-cutting: Tenant isolation'
status: accepted
superseded_by: null
component_id: null
decision: Shared tables with a tenant ID column on every tenant-owned row; the Application
  API derives the tenant from the authenticated session and applies it to every query.
  Cross-tenant access is prevented in the API (database-level row security can be
  added).
evidence: 'User: "Shared tables with a tenant ID column".'
contested: true
alternatives_considered:
- 'Schema per tenant: heavier migrations and onboarding, not needed per user''s choice'
- 'Database per tenant: higher cost and operations overhead'
- 'Separate stack per tenant: highest isolation but highest cost'
consequences:
- Every query and index must include tenant ID; a missed filter is a cross-tenant
  leak risk
- Cheapest and simplest onboarding of new tenants
- Noisy-neighbour and per-tenant data export/deletion need explicit handling
---

## Context

User: "Shared tables with a tenant ID column".

## Decision

Shared tables with a tenant ID column on every tenant-owned row; the Application API derives the tenant from the authenticated session and applies it to every query. Cross-tenant access is prevented in the API (database-level row security can be added).

## Alternatives considered

- Schema per tenant: heavier migrations and onboarding, not needed per user's choice
- Database per tenant: higher cost and operations overhead
- Separate stack per tenant: highest isolation but highest cost

## Consequences

- Every query and index must include tenant ID; a missed filter is a cross-tenant leak risk
- Cheapest and simplest onboarding of new tenants
- Noisy-neighbour and per-tenant data export/deletion need explicit handling
