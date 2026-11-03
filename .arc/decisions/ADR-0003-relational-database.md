---
id: ADR-0003
category: component
title: Relational Database
status: accepted
superseded_by: null
component_id: comp_relational_database
responsibility: System of record for tenants, users/roles and domain records in shared
  tables keyed by tenant ID; product and hosting still open.
kind: infrastructure
split_reason: Backing service the project uses but doesn't build.
evidence: 'User: "Shared tables with a tenant ID column".'
---

## Context

User: "Shared tables with a tenant ID column".

## Decision

System of record for tenants, users/roles and domain records in shared tables keyed by tenant ID; product and hosting still open.

Kept separate because Backing service the project uses but doesn't build..
