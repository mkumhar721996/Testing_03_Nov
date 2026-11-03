---
id: ADR-0006
category: deployment_target
title: "Deployment target: AWS, running containers for the Web App and Application\
  \ API; prod and staging\u2026"
status: accepted
superseded_by: null
component_id: null
decision: AWS, running containers for the Web App and Application API; prod and staging
  environments, each in a single region (us-east-1) with no cross-region replica.
  No budget limit stated.
evidence: 'User: "AWS, containers"; "Single region, us-east-1".'
---

## Context

User: "AWS, containers"; "Single region, us-east-1".

## Decision

AWS, running containers for the Web App and Application API; prod and staging environments, each in a single region (us-east-1) with no cross-region replica. No budget limit stated.
