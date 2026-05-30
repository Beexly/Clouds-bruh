# Domains

Single source of truth: `BRAND.domains` in [`src/brand.mjs`](../src/brand.mjs).

| Role | Domain | Status |
|---|---|---|
| Draft / staging | `alter1414.com` | Live — **preview designs only**, not the launch domain |
| Production | _TBD_ | Not yet chosen/acquired for Eclipse |

## Context

The brand evolved from "Altar XIV" to **Eclipse** (Galaxy Network). The existing
`alter1414.com` carries the old name, so it is kept purely as a **draft surface
to view designs** while the production domain is decided. Eclipse will move to a
new production domain.

## When the production domain is chosen

1. Set `BRAND.domains.production` and `BRAND.domains.status = 'live'` in `src/brand.mjs`.
2. No other code references a hardcoded domain — the storefront/ops are path-relative,
   so nothing else needs to change for the app to run on the new host.
3. Treat the cutover (DNS, TLS, redirects from the draft domain) as a deliberate,
   human-run launch step — it is outside the autonomous loop.

## Naming note

If the production domain drives a brand-name change, remember the whole system
rebrands from `BRAND.name`/`BRAND.key` in one file — see `CLAUDE.md`.
