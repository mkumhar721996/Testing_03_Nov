---
id: ADR-0020
category: cross_cutting
title: 'Cross-cutting: Authentication'
status: accepted
superseded_by: null
component_id: null
rule: Staff and customers authenticate by email and password checked by the Application
  API; game players use server-held guest sessions; no passwords are stored in plain
  text.
decision: Staff and customers sign in with email and password held by the Application
  API (hashed, with emailed reset links, expiring single-use reset tokens and lockout
  after repeated failures); sessions carry the role. Slot-game players use guest sessions
  with no sign-in, recognised by browser and held server-side. No corporate SSO.
evidence:
- type: human
  ref: Email/password for staff and customers, guests for the game.
- type: work_item
  ref: TESTING-03-NOV-STORY-029
- type: work_item
  ref: TESTING-03-NOV-STORY-059
- type: work_item
  ref: TESTING-03-NOV-STORY-016
basis: stated
contested: true
alternatives:
- option: Corporate SSO only
  why_not: Backlog requires email/password sign-in, reset and guest play.
- option: SSO plus email/password
  why_not: Not chosen by the human.
consequences:
- The API stores password hashes and must implement reset and lockout.
- The earlier SSO integration is dropped.
supersedes:
- ADR-0012
---

## Decision

**Rule.** Staff and customers authenticate by email and password checked by the Application API; game players use server-held guest sessions; no passwords are stored in plain text.

Staff and customers sign in with email and password held by the Application API (hashed, with emailed reset links, expiring single-use reset tokens and lockout after repeated failures); sessions carry the role. Slot-game players use guest sessions with no sign-in, recognised by browser and held server-side. No corporate SSO.

## Alternatives considered

- Corporate SSO only — Backlog requires email/password sign-in, reset and guest play.
- SSO plus email/password — Not chosen by the human.

## Consequences

- The API stores password hashes and must implement reset and lockout.
- The earlier SSO integration is dropped.

## Evidence

Basis: stated.
- human: Email/password for staff and customers, guests for the game.
- work_item: TESTING-03-NOV-STORY-029
- work_item: TESTING-03-NOV-STORY-059
- work_item: TESTING-03-NOV-STORY-016
