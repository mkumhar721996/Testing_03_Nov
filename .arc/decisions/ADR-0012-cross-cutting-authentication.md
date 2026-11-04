---
id: ADR-0012
category: cross_cutting
title: 'Cross-cutting: Authentication'
status: accepted
superseded_by: null
component_id: null
decision: Sign-in through corporate SSO (OIDC/SAML with Entra ID or Okta); the Application
  API validates tokens and maps the identity provider's tenant/organisation to a tenant
  ID and roles. External Customers are invited as guest users in the tenant's SSO
  directory and get the restricted External Customer role. No built-in passwords for
  anyone.
evidence: 'User: "Corporate SSO (Azure AD/Entra, Okta)"; "Invited as guest users in
  the tenant''s SSO directory".'
---

## Context

User: "Corporate SSO (Azure AD/Entra, Okta)"; "Invited as guest users in the tenant's SSO directory".

## Decision

Sign-in through corporate SSO (OIDC/SAML with Entra ID or Okta); the Application API validates tokens and maps the identity provider's tenant/organisation to a tenant ID and roles. External Customers are invited as guest users in the tenant's SSO directory and get the restricted External Customer role. No built-in passwords for anyone.

## Amendment (TESTING-03-NOV-STORY-029)

Built-in email/password sign-in with server-side sessions is permitted for employees, because story TESTING-03-NOV-STORY-029 requires it before an identity provider is connected. Accounts are created by an operator (`pnpm create-user`), not by self-registration. Corporate SSO (ADR-0007) remains the intended later path and replaces this sign-in when it lands; the "no built-in passwords" sentence above applies from then on.
