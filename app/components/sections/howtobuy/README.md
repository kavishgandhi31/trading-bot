# `howtobuy/` — "How to buy this" section

Top-level zone in the report view that translates the LLM's buy plan, options
overlay, and portfolio fit into something a beginner can act on without
learning institutional jargon.

## File layout

```
howtobuy/
├── HowToBuySection.tsx     ← top-level component (composed in ReportView)
├── README.md               ← this file
├── types.ts                ← strict types for how_to_buy / options_overlay / portfolio_fit
├── logic.ts                ← shared business logic (trigger semantics, "right now" sentence)
├── PostureBadge.tsx        ← colored chip for the headline recommendation
├── RightNowStrip.tsx       ← "Right now" one-liner action strip
├── AllocationBar.tsx       ← invested / cash-on-side / not-allocated bar
├── TrancheLadder.tsx       ← vertical buy ladder visual
├── DisclaimerLine.tsx      ← inline italic amber disclaimer
└── tabs/
    ├── LadderTab.tsx       ← long-form "Buy plan" detail view
    ├── SizingMathTab.tsx   ← Kelly / fractional-Kelly sanity check
    ├── HoldPeriodTab.tsx   ← expected hold + cadence
    ├── TaxLotTab.tsx       ← cost-basis guidance
    ├── OptionsOverlayTab.tsx  ← option strategy cards
    └── PortfolioFitTab.tsx ← concentration + overlap check
```

## Conventions

- **Strict types in `types.ts`.** Components narrow at the section boundary
  (`ReportView` casts the loose `Record<string, unknown>` from disk to the
  strict types here). Inside this directory, treat the data as well-formed.
- **Business logic in `logic.ts`.** Anything that interprets the data
  (mapping a tranche to a state, picking the "right now" sentence, computing
  a derived label) lives here so all components see the same story. Pure
  rendering stays in components.
- **No jargon in user-facing strings.** Replace `tranche → buy step`,
  `dry powder → cash held for later`, `thesis-budget → money set aside for
  this stock`, etc. The LLM's machine names (`limit`, `post_catalyst`) only
  appear as enum values in the JSON, never in user-facing text.
- **Plain-English explanations carry their own visible disclaimer** when the
  number is heuristic (Kelly sizing, options premium estimates, tax
  guidance). Use the `DisclaimerLine` component, not a tooltip.

## Critical: keep client and email in sync

The email (`backend/utils/email.py`) renders a stripped-down version of this
section server-side in Python. The two implementations cannot share code, so
they must be edited together when the data semantics change:

| TypeScript (`logic.ts`)  | Python (`email.py`)        |
| ------------------------ | -------------------------- |
| `trancheState`           | `_tranche_filled`          |
| `computeRightNowAction`  | `_right_now_email`         |

If you add a new posture, a new trigger type, or change the "right now" copy,
update both files in the same commit.

## Adding a new tab

1. Add the data to `types.ts` (or update an existing interface).
2. If it requires interpretation (not just rendering), put the helper in
   `logic.ts`.
3. Create `tabs/MyTab.tsx`.
4. Add an entry to `TAB_LABEL` in `HowToBuySection.tsx`.
5. Add a `TabSpec` entry in the same file with the right `available`
   condition.
6. Add a `case` in `TabContent`.
