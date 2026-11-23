# ADR Index

One line per decision — the rule, not the reasoning. Read the full ADR (`.arc/decisions/ADR-NNNN-*.md`) for context and rationale.

## Accepted — binding rules

| ADR | Category | Status | Rule |
|---|---|---|---|
| ADR-0004 | nfr | accepted | NFR: Scale — < 100 users |
| ADR-0005 | nfr | accepted | NFR: Availability — >= 99.5% in business hours; maintenance allowed outside them |
| ADR-0006 | deployment_target | accepted | Deployment target: AWS, running containers for the Web App and Application API; prod and staging… |
| ADR-0008 | integration_surface | accepted | Integration: Email Delivery (outbound) |
| ADR-0009 | integration_surface | accepted | Integration: Team Chat Notifications (outbound) |
| ADR-0010 | cross_cutting | accepted | Cross-cutting: Role-based access control |
| ADR-0014 | cross_cutting | accepted | Cross-cutting: Compliance and data residency |
| ADR-0015 | component | accepted | The Web App calls only the Application API and never reads or writes the database directly. |
| ADR-0016 | component | accepted | All business rules, authorization checks and data writes happen in the Application API; clients never decide an outcome, balance or permission. |
| ADR-0017 | component | accepted | Only the Application API reads or writes the Relational Database, and every tenant-owned row carries a tenant ID. |
| ADR-0018 | nfr | accepted | A simulation of 10 million spins, counting base, free-game and jackpot wins, must return 96.00% ±0.10 percentage points before sign-off. |
| ADR-0019 | cross_cutting | accepted | Every query on tenant-owned data filters by the tenant ID taken from the session, never from client input. |
| ADR-0020 | cross_cutting | accepted | Staff and customers authenticate by email and password checked by the Application API; game players use server-held guest sessions; no passwords are stored in plain text. |
| ADR-0021 | cross_cutting | accepted | Every change to a business record writes an append-only audit entry with tenant, actor, time and before/after values. |

## Proposed — not binding (assumptions awaiting a person's confirmation)

| ADR | Category | Status | Rule |
|---|---|---|---|
| ADR-0022 | cross_cutting | proposed | Unconfirmed defaults, not requirements: Scope: all backlog domains (slot game, patient health app, HR system, organization views, appliance-service marketplace) are built in one system on one Web App, one Application API and one database; overlapping epics are treated as the same capability.… |

## Superseded and retired — not binding

| ADR | Category | Status | Title |
|---|---|---|---|
| ADR-0001 | component | superseded by ADR-0015 | Web App |
| ADR-0002 | component | superseded by ADR-0016 | Application API |
| ADR-0003 | component | superseded by ADR-0017 | Relational Database |
| ADR-0007 | integration_surface | retired | Integration: Corporate SSO Identity Providers (inbound) |
| ADR-0011 | cross_cutting | superseded by ADR-0019 | Cross-cutting: Tenant isolation |
| ADR-0012 | cross_cutting | superseded by ADR-0020 | Cross-cutting: Authentication |
| ADR-0013 | cross_cutting | superseded by ADR-0021 | Cross-cutting: Audit trail |
