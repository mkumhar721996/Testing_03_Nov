---
id: ADR-0010
category: cross_cutting
title: 'Cross-cutting: Role-based access control'
status: accepted
superseded_by: null
component_id: null
decision: Roles (Administrator, Business User, Manager, Operations Team, optional
  External Customer) enforced in the Application API, scoped per tenant; External
  Customers get restricted access.
evidence: 'User: target users Administrators, Business Users, Managers, Operations
  Teams, External Customers (optional).'
---

## Context

User: target users Administrators, Business Users, Managers, Operations Teams, External Customers (optional).

## Decision

Roles (Administrator, Business User, Manager, Operations Team, optional External Customer) enforced in the Application API, scoped per tenant; External Customers get restricted access.
