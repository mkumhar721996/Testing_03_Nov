---
id: ADR-0017
category: component
title: Relational Database
status: accepted
superseded_by: null
component_id: comp_relational_database
responsibility: System of record for tenants, users/roles and domain records (spins,
  balances, health readings, HR records, bookings, technicians) in shared tables keyed
  by tenant ID; runs on PostgreSQL on Amazon RDS.
kind: infrastructure
serves:
- TESTING-03-NOV-EPIC-003
- TESTING-03-NOV-EPIC-004
- TESTING-03-NOV-EPIC-005
- TESTING-03-NOV-EPIC-006
- TESTING-03-NOV-EPIC-010
- TESTING-03-NOV-EPIC-011
- TESTING-03-NOV-EPIC-012
- TESTING-03-NOV-EPIC-013
- TESTING-03-NOV-EPIC-014
- TESTING-03-NOV-EPIC-015
- TESTING-03-NOV-EPIC-016
- TESTING-03-NOV-EPIC-017
- TESTING-03-NOV-EPIC-018
- TESTING-03-NOV-EPIC-019
- TESTING-03-NOV-EPIC-020
- TESTING-03-NOV-EPIC-021
- TESTING-03-NOV-EPIC-022
- TESTING-03-NOV-EPIC-024
- TESTING-03-NOV-EPIC-025
- TESTING-03-NOV-EPIC-026
- TESTING-03-NOV-EPIC-027
- TESTING-03-NOV-EPIC-028
- TESTING-03-NOV-EPIC-029
- TESTING-03-NOV-EPIC-030
- TESTING-03-NOV-EPIC-031
split_reason: Backing service the project uses but does not build; the API already
  has PostgreSQL repositories.
rule: Only the Application API reads or writes the Relational Database, and every
  tenant-owned row carries a tenant ID.
evidence:
- type: human
  ref: All of them, in one system
basis: stated
supersedes:
- ADR-0003
---

## Context

The draft recorded none for this component.

Serves: TESTING-03-NOV-EPIC-003, TESTING-03-NOV-EPIC-004, TESTING-03-NOV-EPIC-005, TESTING-03-NOV-EPIC-006, TESTING-03-NOV-EPIC-010, TESTING-03-NOV-EPIC-011, TESTING-03-NOV-EPIC-012, TESTING-03-NOV-EPIC-013, TESTING-03-NOV-EPIC-014, TESTING-03-NOV-EPIC-015, TESTING-03-NOV-EPIC-016, TESTING-03-NOV-EPIC-017, TESTING-03-NOV-EPIC-018, TESTING-03-NOV-EPIC-019, TESTING-03-NOV-EPIC-020, TESTING-03-NOV-EPIC-021, TESTING-03-NOV-EPIC-022, TESTING-03-NOV-EPIC-024, TESTING-03-NOV-EPIC-025, TESTING-03-NOV-EPIC-026, TESTING-03-NOV-EPIC-027, TESTING-03-NOV-EPIC-028, TESTING-03-NOV-EPIC-029, TESTING-03-NOV-EPIC-030, TESTING-03-NOV-EPIC-031.

## Decision

**Rule.** Only the Application API reads or writes the Relational Database, and every tenant-owned row carries a tenant ID.

System of record for tenants, users/roles and domain records (spins, balances, health readings, HR records, bookings, technicians) in shared tables keyed by tenant ID; runs on PostgreSQL on Amazon RDS.

Kept separate because Backing service the project uses but does not build; the API already has PostgreSQL repositories..

## Alternatives considered

The draft recorded none for this component.

## Consequences

The draft recorded none for this component.

## Evidence

Basis: stated.
- human: All of them, in one system
