---
id: ADR-0021
category: cross_cutting
title: 'Cross-cutting: Audit trail'
status: accepted
superseded_by: null
component_id: null
rule: Every change to a business record writes an append-only audit entry with tenant,
  actor, time and before/after values.
decision: The Application API records an append-only audit entry (tenant, actor, timestamp,
  before/after values) for every change to business records (employee records and
  documents, bookings, balances, and other domain records), stored in the Relational
  Database and queryable by authorised roles per tenant.
evidence:
- type: human
  ref: Yes, all business records.
- type: work_item
  ref: TESTING-03-NOV-STORY-036
- type: work_item
  ref: TESTING-03-NOV-STORY-038
basis: stated
supersedes:
- ADR-0013
---

## Decision

**Rule.** Every change to a business record writes an append-only audit entry with tenant, actor, time and before/after values.

The Application API records an append-only audit entry (tenant, actor, timestamp, before/after values) for every change to business records (employee records and documents, bookings, balances, and other domain records), stored in the Relational Database and queryable by authorised roles per tenant.

## Evidence

Basis: stated.
- human: Yes, all business records.
- work_item: TESTING-03-NOV-STORY-036
- work_item: TESTING-03-NOV-STORY-038
