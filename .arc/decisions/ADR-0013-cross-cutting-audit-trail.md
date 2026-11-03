---
id: ADR-0013
category: cross_cutting
title: 'Cross-cutting: Audit trail'
status: accepted
superseded_by: null
component_id: null
decision: The Application API records an append-only audit entry (tenant, actor, timestamp,
  before/after values) for every change to defect records, stored in the Relational
  Database and queryable by Administrators per tenant. Extending it to other business
  domains is not yet required.
evidence: 'User: "Audit trail of all defect changes only".'
---

## Context

User: "Audit trail of all defect changes only".

## Decision

The Application API records an append-only audit entry (tenant, actor, timestamp, before/after values) for every change to defect records, stored in the Relational Database and queryable by Administrators per tenant. Extending it to other business domains is not yet required.
