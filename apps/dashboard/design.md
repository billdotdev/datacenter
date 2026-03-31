# Dashboard Redesign Design

## Goal

Redesign the entire `apps/dashboard` app to match the supplied `technical_minimalist` brief as literally as possible while preserving the current route set, data flows, and operational behavior. The result should feel like a compact operator console rather than a marketing dashboard.

## Source Brief

- Visual system source: `/Users/bill/Downloads/stitch_ux_audit_redesign_plan/technical_minimalist/DESIGN.md`
- Layout reference: `/Users/bill/Downloads/stitch_ux_audit_redesign_plan/dashboard_home_compact/code.html`

## Scope

In scope:

- Shared shell redesign for the full dashboard app
- Home, drills, admin, login, and setup route redesign
- Global typography, tokens, spacing, borders, and interaction styling
- Placeholder navigation items for non-built sections
- Light-only mode

Out of scope:

- Backend or data-model changes
- New real routes beyond the ones already implemented
- Additional feature work hidden behind the new placeholder navigation

## Design Direction

Adopt the brief's "Technical Precision & Editorial Utility" system nearly verbatim:

- Light, opaque surfaces
- No shadows for containment
- No glassmorphism or blur
- High-contrast 1px structural borders
- Compact spacing and dense information layout
- Inter for UI copy
- JetBrains Mono for technical metadata, statuses, revisions, IDs, timestamps, and nav labels
- Blue reserved for active state and primary action emphasis

The redesign should look rigid, deliberate, and operational. It should not feel soft, rounded, glossy, or decorative.

## Product Constraints Chosen

- Scope covers the whole dashboard app, not only the home route
- The supplied redesign is treated as a literal target, not only loose inspiration
- Theme toggle and dark mode are removed; the app becomes light-only
- Placeholder navigation items are allowed for non-built sections, but they remain inert visual chrome

## Shared Application Shell

The app shell becomes the dominant visual structure.

### Left Rail

Persistent on desktop:

- Product mark / system identity at top
- Real nav items for `Home`, `Drills`, and `Admin`
- Placeholder nav items for sections implied by the redesign such as telemetry, security, logs, or deployment
- Utility area near the bottom for items such as docs, support, and sign out affordances

Styling:

- Fixed-width rail
- Light paper/surface background
- Vertical active indicator bar
- Mono uppercase nav labels
- Tight spacing
- No pill buttons

### Top Command Bar

Shared across the authenticated app:

- Compact page title / section context
- Secondary tab-like placeholders where useful to mirror the reference layout
- Small operational status chip
- Minimal action/utility affordances

Styling:

- Thin height
- White or near-white background
- Bottom border
- Dense 12px to 13px type

### Main Workspace

The route content sits inside a dense canvas with strong structural segmentation:

- KPI strip across top where appropriate
- Primary data workspace in large grid/table panels
- Secondary ledgers or control panels adjacent to primary content

## Route-by-Route Design

### Home (`/`)

The current welcome hero is removed.

Replace it with the reference-style operator overview:

- KPI strip for cluster health and operational counts
- Dense nodes table as the primary workspace
- Applications ledger/panel for Argo application state
- Compact last-refresh and error presentation in header areas

Data mapping:

- `cluster.summary` powers the KPI strip
- `cluster.nodes` powers the nodes table
- `cluster.applications` powers the application ledger

Presentation rules:

- Tables and ledgers should prioritize scanability over decoration
- Mono rendering for kube versions, revisions, IPs, timestamps, and machine-like statuses
- Hover states use subtle background shifts only

### Drills (`/drills`)

This route becomes an operator workbench instead of stacked soft cards.

Core sections:

- Compact route header with safety state and refresh state
- Dense drill execution panels
- Tight target selectors and action controls
- Recent runs displayed as a ledger/table rather than large stacked cards when possible

Behavior stays unchanged:

- Existing execute and safety toggle flows remain intact
- Viewer/admin permissions remain intact
- Confirm-before-execute behavior remains intact unless implementation reveals a better native pattern without logic change

### Admin (`/admin`)

This route becomes a narrow operational control panel:

- Dense header
- One dominant safety-control module
- Compact explanatory copy
- Secondary navigation/actions rendered as sharp outlined controls

The route should feel like a restricted system page, not a promotional surface.

### Login (`/login`)

The login screen becomes a compact instrument-panel form:

- Narrow centered form
- Sharp border-defined container
- Reduced radius
- Strong labels
- Technical metadata and supporting copy in small body or mono accents

The page should align visually with the main app without recreating the full authenticated shell.

### Setup (`/setup`)

Same system as login, but adapted for bootstrap admin creation:

- Slightly larger form footprint than login
- Dense two-column structure where useful on larger screens
- Same border-first visual language

## Global Visual System

### Color Tokens

Rebuild the dashboard CSS tokens around the supplied brief:

- Background / paper base
- Surface container tiers
- Outline / outline-variant
- Primary and primary-container
- Error and error-container
- On-surface and on-surface-variant

Implementation should bias toward the brief's names and values where practical.

### Typography

- Inter becomes the primary sans font
- JetBrains Mono becomes the technical accent font
- Headings stay modest in size
- Hierarchy comes from weight, casing, tracking, and placement, not oversized type

### Borders, Radius, and Elevation

- 1px borders define structure
- Cards/panels are opaque and flat
- Shadows are removed from layout containment
- Corner radii stay tight, generally in the 4px to 8px range

### Inputs and Buttons

- Primary buttons: flat blue fill, no gradient
- Secondary buttons: outline only
- Inputs: solid background, 1px border, blue focus border, no outer glow
- Technical inputs may use mono font where that improves alignment/readability

### Messaging States

- Errors: hard-bordered red blocks, no translucent rounded pills
- Refresh/loading: terse mono or small utility copy in headers/toolbars
- Empty states: concise, operational, not whimsical

## Responsive Behavior

Desktop keeps the full left rail and dense workspace layout.

Tablet/mobile behavior:

- Collapse the left rail into a top-first or condensed navigation treatment
- Preserve density where possible rather than expanding into oversized mobile cards
- Maintain strong borders and compact typography
- Keep actions reachable without introducing soft, consumer-style mobile UI patterns

## Component/Code Impact

Expected files/components affected:

- Root shell and header/footer composition
- Theme initialization and theme toggle usage
- Global stylesheet and design tokens
- Home route layout
- `ClusterOverview` layout and any child decomposition required
- Drills route layout
- `DrillCatalog` layout
- Admin route layout
- Login and setup forms

## Non-Goals

- Reworking auth flow logic
- Reworking cluster query logic
- Reworking drills API semantics
- Adding fake data to mimic missing sections

Placeholder navigation is presentational only. It should not create fake functional product surface area.

## Acceptance Criteria

- The dashboard visually reads as the supplied technical-minimalist system, not the prior lagoon/island visual language
- The authenticated app has a unified shell with left rail and top command bar
- Home, drills, admin, login, and setup all share the same design language
- Theme toggle is removed and the app renders in light mode only
- Existing route behavior and data integrations continue to work
- A `design.md` exists in `apps/dashboard` documenting the redesign and its mapping from the supplied brief
