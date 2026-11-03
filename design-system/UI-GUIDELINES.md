# UI Guidelines

## Navigation and information architecture
- Top bar plus a left sidebar on desktop; the sidebar collapses behind a menu button on small screens, because the section list is too long for a phone header.
- Main sections, in this order: **Dashboard** (`dashboard`), **Items** (`items`), **Reports** (`reports`), **Settings** (`settings`) — ordered by how often people use them.
- **Account** (`account`) lives in the top bar, not the sidebar, because it is about the person, not the work.
- Every screen belongs to exactly one section; detail and edit views stay inside their parent section so the sidebar highlight never jumps.

## Layout and density
- Moderately dense, work-oriented console: content spans the width up to `content-max-width`, using `space-3` between related blocks and `space-4` between sections, so people see more rows without scrolling.
- Page structure is a title (`h1`) with its primary action on the right, then content; one primary button per screen, so the next step is unambiguous.
- Breakpoints that matter: phone (≤ 375px, single column, table scrolls horizontally) and desktop (≥ 768px, sidebar visible); the product is not designed for in-between layouts beyond reflowing.

## Component usage
- `.card` groups one self-contained object or summary (a metric, a settings group); use `.grid` of cards for dashboards, because cards scan well as peers.
- `.table` (in `.table-wrap`) for any collection with more than two comparable attributes, because users sort and compare across columns.
- A plain list of `.stack` rows or `.menu` for short, single-attribute collections, because a table would be overkill.
- `.btn-primary` for the one main action, `.btn-secondary` for alternatives, `.btn-ghost` for low-emphasis actions in toolbars, `.btn-danger` only for destructive confirmation, so weight matches consequence.
- Use `.modal` only for confirmations and short forms; use `.drawer` for viewing or editing an item while keeping its list visible, because losing context slows work.
- Forms use `.field` with a visible label and a hint; show errors inline with `.is-invalid`, and use `.alert` only for page-level problems, because errors belong next to their cause.
- `.toast` confirms a completed action; `.badge` shows status; `.empty-state` (with one action) replaces empty lists; `.skeleton` for loading content and `.spinner` only for in-button or short waits, so loading reflects the shape of what is coming.

## Theme stance
- Light theme only, default and sole; the product is used in bright office conditions and a second theme would double the review surface.

## Voice and tone
- Plain, direct and calm: sentence case, verbs on buttons ("Save item", not "Submit"), because specific labels reduce hesitation.
- Errors say what happened and how to fix it, never blame the user; empty states say what belongs here and offer the next step.
- No exclamation marks or jargon; confirmations are short ("Item saved"), because the interface should stay out of the way.
