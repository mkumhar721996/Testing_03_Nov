---
id: ADR-0005
category: nfr
title: "NFR: Availability \u2014 >= 99.5% in business hours; maintenance allowed outside\
  \ them"
status: accepted
superseded_by: null
dimension: Availability
metric: Uptime during business hours (proposed 08:00-18:00 local, Mon-Fri)
threshold: '>= 99.5% in business hours; maintenance allowed outside them'
component_id: null
needs_dedicated_tracking: true
evidence: 'User: "Small: under 100 users, business-hours uptime"; numeric threshold
  and hours proposed from that wording.'
---

## Context

User: "Small: under 100 users, business-hours uptime"; numeric threshold and hours proposed from that wording.

## Decision

Uptime during business hours (proposed 08:00-18:00 local, Mon-Fri): >= 99.5% in business hours; maintenance allowed outside them
