---
id: ADR-0016
category: component
title: Application API
status: accepted
superseded_by: null
component_id: comp_application_api
responsibility: Tenant-aware business logic and data access for every backend capability
  (spin outcomes, wallet, jackpot, free games, health readings, appointments, HR records,
  leave, onboarding, accounts, bookings, technicians, payments); enforces tenant scoping,
  role-based access and server-side authority over game and money state; sends email
  and Slack/Teams notifications as an in-process module (no separate worker); built
  with NestJS.
kind: api_service
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
split_reason: 'Already built: the NestJS service in services/api; a separate runtime
  from the web UI that owns authorization and server-side outcomes.'
talks_to:
- component_id: comp_relational_database
  interaction: sync
  evidence: services/api/src/spin/pg-spin.repository.ts
rule: All business rules, authorization checks and data writes happen in the Application
  API; clients never decide an outcome, balance or permission.
evidence:
- type: human
  ref: All of them, in one system
basis: stated
supersedes:
- ADR-0002
---

## Context

The draft recorded none for this component.

Serves: TESTING-03-NOV-EPIC-003, TESTING-03-NOV-EPIC-004, TESTING-03-NOV-EPIC-005, TESTING-03-NOV-EPIC-006, TESTING-03-NOV-EPIC-010, TESTING-03-NOV-EPIC-011, TESTING-03-NOV-EPIC-012, TESTING-03-NOV-EPIC-013, TESTING-03-NOV-EPIC-014, TESTING-03-NOV-EPIC-015, TESTING-03-NOV-EPIC-016, TESTING-03-NOV-EPIC-017, TESTING-03-NOV-EPIC-018, TESTING-03-NOV-EPIC-019, TESTING-03-NOV-EPIC-020, TESTING-03-NOV-EPIC-021, TESTING-03-NOV-EPIC-022, TESTING-03-NOV-EPIC-024, TESTING-03-NOV-EPIC-025, TESTING-03-NOV-EPIC-026, TESTING-03-NOV-EPIC-027, TESTING-03-NOV-EPIC-028, TESTING-03-NOV-EPIC-029, TESTING-03-NOV-EPIC-030, TESTING-03-NOV-EPIC-031.

## Decision

**Rule.** All business rules, authorization checks and data writes happen in the Application API; clients never decide an outcome, balance or permission.

Tenant-aware business logic and data access for every backend capability (spin outcomes, wallet, jackpot, free games, health readings, appointments, HR records, leave, onboarding, accounts, bookings, technicians, payments); enforces tenant scoping, role-based access and server-side authority over game and money state; sends email and Slack/Teams notifications as an in-process module (no separate worker); built with NestJS.

Kept separate because Already built: the NestJS service in services/api; a separate runtime from the web UI that owns authorization and server-side outcomes..

## Talks to

- **Relational Database** (sync) — services/api/src/spin/pg-spin.repository.ts

## Alternatives considered

The draft recorded none for this component.

## Consequences

The draft recorded none for this component.

## Evidence

Basis: stated.
- human: All of them, in one system
