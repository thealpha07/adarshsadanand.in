# 0009. The CCI MVP runs in the browser, behind a storage port

**Status:** Accepted, 2026-11-06

## Context
The review panel needs to see the CCI tool working. The project's point is the controlled process: evidence, approvals, locked values and a record of every change, with the score as its result. There was under a day to build it. The full project will later move to its own repository.

## Decision
- **Where:** new `/app` routes in `apps/cci`. `/` stays the public holding page, and the `noindex` rules from ADR 0008 stay.
- **No backend:** the scoring and approval rules really run, on sample data, in the browser. A role switcher stands in for logins.
- **Layers:** `domain/` holds pure rules and imports nothing else in the app. `data/` holds the 23 definitions, the seed and the storage adapter. `state/` holds the store. `screens/` holds the UI. Moving `domain/` to the new repo should need no changes.
- **Ports and adapters:** screens never touch storage. A `CycleStore` interface has one browser adapter today, and it falls back to memory if storage is blocked.
- **One write path:** every change goes through `applyAction`, which checks the role and state, and records the audit events in the same step.
- **Honesty on screen:** every tool screen shows "Sample data · OCR simulated · Not a SEBI filing". Scoring assumptions are listed in the report. This keeps the "real content only" rule: nothing invented is passed off as real.

## Assumptions to verify against SEBI's circular
The Annexure-K copy read gives weights, targets and rating bands, but not these, so they are ours:
- points = weight × min(actual ÷ target, 1), or weight × (1 − actual) for lower-is-better #12;
- #21 uses four equally weighted criteria;
- ratings use band floors, because whole-number bands leave gaps such as 90.5;
- a zero denominator gets full points, with a reason the Reviewer accepts;
- domain cutoffs are a 50% placeholder, and a domain with missing answers cannot trigger Fail.

## Alternatives not chosen
- **Add roles to the existing Supabase project:** its rules assume one admin and it holds the private vault. A mistake could expose the vault.
- **A new Supabase project now:** real logins and storage, but too risky to finish in the time available. It is the likely next step, as a second `CycleStore` adapter.
- **A clickable mockup:** fastest, but nothing calculates, which would support the criticism that this is only a dashboard.
- **Real browser OCR:** accuracy could fail in a live demo. The comparison rule is real and only the extraction is simulated.
- **Full event sourcing:** replaying events to build state is more than this needs. Writing state and audit events together gives the same record.
- **Redux or Zustand:** not needed for six screens, and one less dependency to carry to the new repo.

## Consequences
- **Not secure:** role rules run in the viewer's browser, and the audit trail can be reset. Neither is acceptable in production, where the database must enforce both per named user.
- **Testing:** the rules are tested with Vitest against hand-worked numbers, and CI now runs tests.
- **Per browser:** each viewer's demo state is separate and stays in their browser until they reset it.
