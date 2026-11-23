---
id: ADR-0018
category: nfr
title: "NFR: compliance (Application API) \u2014 96.00% \xB10.10 percentage points,\
  \ simulated over 10 million spins on the 3x5 grid"
status: accepted
superseded_by: null
dimension: compliance
metric: simulated_rtp
threshold: "96.00% \xB10.10 percentage points, simulated over 10 million spins on\
  \ the 3x5 grid with 10 fixed paylines, counting base-game, free-game and jackpot\
  \ wins"
component_id: comp_application_api
needs_dedicated_tracking: true
rule: "A simulation of 10 million spins, counting base, free-game and jackpot wins,\
  \ must return 96.00% \xB10.10 percentage points before sign-off."
evidence:
- type: human
  ref: 10 Millions spins
- type: work_item
  ref: TESTING-03-NOV-STORY-040
- type: work_item
  ref: TESTING-03-NOV-STORY-015
- type: work_item
  ref: TESTING-03-NOV-STORY-043
basis: stated
---

## Decision

**Rule.** A simulation of 10 million spins, counting base, free-game and jackpot wins, must return 96.00% ±0.10 percentage points before sign-off.

simulated_rtp: 96.00% ±0.10 percentage points, simulated over 10 million spins on the 3x5 grid with 10 fixed paylines, counting base-game, free-game and jackpot wins

Applies to Application API.

## Evidence

Basis: stated.
- human: 10 Millions spins
- work_item: TESTING-03-NOV-STORY-040
- work_item: TESTING-03-NOV-STORY-015
- work_item: TESTING-03-NOV-STORY-043
