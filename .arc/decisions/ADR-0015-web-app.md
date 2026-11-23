---
id: ADR-0015
category: component
title: Web App
status: accepted
superseded_by: null
component_id: comp_web_app
responsibility: Browser UI for every user-facing screen in the backlog (slot game,
  patient health app, HR screens, organization views, appliance-service booking and
  admin console), adaptable per tenant and business domain; talks only to the Application
  API; built with React and Vite.
kind: web_ui
serves:
- TESTING-03-NOV-EPIC-007
- TESTING-03-NOV-EPIC-008
- TESTING-03-NOV-EPIC-009
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
- TESTING-03-NOV-EPIC-023
- TESTING-03-NOV-EPIC-024
- TESTING-03-NOV-EPIC-025
- TESTING-03-NOV-EPIC-026
- TESTING-03-NOV-EPIC-027
- TESTING-03-NOV-EPIC-028
- TESTING-03-NOV-EPIC-029
- TESTING-03-NOV-EPIC-030
- TESTING-03-NOV-EPIC-031
split_reason: 'Already built: the React + Vite web client in apps/web; a separate
  browser runtime from the API.'
talks_to:
- component_id: comp_application_api
  interaction: sync
  evidence: apps/web/src/slot/spinApi.ts
rule: The Web App calls only the Application API and never reads or writes the database
  directly.
evidence:
- type: human
  ref: All of them, in one system
basis: stated
supersedes:
- ADR-0001
---

## Context

The draft recorded none for this component.

Serves: TESTING-03-NOV-EPIC-007, TESTING-03-NOV-EPIC-008, TESTING-03-NOV-EPIC-009, TESTING-03-NOV-EPIC-010, TESTING-03-NOV-EPIC-011, TESTING-03-NOV-EPIC-012, TESTING-03-NOV-EPIC-013, TESTING-03-NOV-EPIC-014, TESTING-03-NOV-EPIC-015, TESTING-03-NOV-EPIC-016, TESTING-03-NOV-EPIC-017, TESTING-03-NOV-EPIC-018, TESTING-03-NOV-EPIC-019, TESTING-03-NOV-EPIC-023, TESTING-03-NOV-EPIC-024, TESTING-03-NOV-EPIC-025, TESTING-03-NOV-EPIC-026, TESTING-03-NOV-EPIC-027, TESTING-03-NOV-EPIC-028, TESTING-03-NOV-EPIC-029, TESTING-03-NOV-EPIC-030, TESTING-03-NOV-EPIC-031.

## Decision

**Rule.** The Web App calls only the Application API and never reads or writes the database directly.

Browser UI for every user-facing screen in the backlog (slot game, patient health app, HR screens, organization views, appliance-service booking and admin console), adaptable per tenant and business domain; talks only to the Application API; built with React and Vite.

Kept separate because Already built: the React + Vite web client in apps/web; a separate browser runtime from the API..

## Talks to

- **Application API** (sync) — apps/web/src/slot/spinApi.ts

## Alternatives considered

The draft recorded none for this component.

## Consequences

The draft recorded none for this component.

## Evidence

Basis: stated.
- human: All of them, in one system
