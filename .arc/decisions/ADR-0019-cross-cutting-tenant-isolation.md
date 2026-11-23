---
id: ADR-0019
category: cross_cutting
title: 'Cross-cutting: Tenant isolation'
status: accepted
superseded_by: null
component_id: null
rule: Every query on tenant-owned data filters by the tenant ID taken from the session,
  never from client input.
decision: Shared tables with a tenant ID column on every tenant-owned row; the Application
  API derives the tenant from the authenticated or guest session and applies it to
  every query. Database-level row security can be added as a backstop.
evidence:
- type: human
  ref: Keep multi-tenant.
basis: stated
contested: true
alternatives:
- option: 'Schema per tenant: heavier migrations and onboarding, not needed per user''s
    choice'
- option: 'Database per tenant: higher cost and operations overhead'
- option: 'Separate stack per tenant: highest isolation but highest cost'
consequences:
- Every query and index must include tenant ID; a missed filter is a cross-tenant
  leak risk
- Cheapest and simplest onboarding of new tenants
- Noisy-neighbour and per-tenant data export/deletion need explicit handling
supersedes:
- ADR-0011
---

## Decision

**Rule.** Every query on tenant-owned data filters by the tenant ID taken from the session, never from client input.

Shared tables with a tenant ID column on every tenant-owned row; the Application API derives the tenant from the authenticated or guest session and applies it to every query. Database-level row security can be added as a backstop.

## Alternatives considered

- Schema per tenant: heavier migrations and onboarding, not needed per user's choice
- Database per tenant: higher cost and operations overhead
- Separate stack per tenant: highest isolation but highest cost

## Consequences

- Every query and index must include tenant ID; a missed filter is a cross-tenant leak risk
- Cheapest and simplest onboarding of new tenants
- Noisy-neighbour and per-tenant data export/deletion need explicit handling

## Evidence

Basis: stated.
- human: Keep multi-tenant.
