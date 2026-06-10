# GROWTH PLAYBOOK — how Lumera makes maximum profit per visitor
> Distilled overnight R&D (2026-06-10): Shein/Temu operating mechanics, Amazon/DTC profit-per-visitor
> data, and the GitHub agent-infra frontier — filtered against what Lumera ALREADY HAS so we build
> gaps, not duplicates. Sources in the research run (session log); benchmark figures are
> directionally sourced, not gospel. This file is ALSO the standing brief for Curator, Rainmaker,
> Forecaster, and Oracle-Keeper: hunt these patterns.

## The three laws the research converged on
1. **Test small, read signals, scale winners, kill losers fast** (Shein LATR: 100–200-unit tests,
   <2% dead stock vs 30% industry; kill/scale inside 7 days).
2. **Profit-per-visitor beats traffic** (top stores win checkout friction, AOV ladders, and email —
   express wallets alone lift conversion ~20%+; email = 30–35% of DTC revenue).
3. **Premium curation is the anti-Shein moat** (Shein/Temu are bleeding on tariffs, DSA dark-pattern
   enforcement, and CAC creep; a clean, story-driven, no-dark-pattern brand at $40+ AOV
   compounds LTV instead of subsidizing orders).

## What Lumera ALREADY HAS (don't rebuild — turn on)
| Mechanism | Status |
|---|---|
| Small-batch drops + scarcity countdowns | ✅ built (`drops` module, storefront) |
| Demand radar (AliExpress/Alibaba/Shein discovery, scored) | ✅ built — needs OXYLABS/APIFY key |
| Personalized recs + bandit merchandising + dynamic pricing (margin-floored) | ✅ built |
| Abandoned-cart recovery | ✅ built — set `ABANDONED_CART_ENABLED=true` |
| Loyalty (Luminance) + membership tiers + gift cards | ✅ built |
| Zero-party preference capture ("Tune the Broadcast" follow/mute) | ✅ built |
| Approval Execution Loop (founder one-tap approve→execute) | ✅ built tonight |
| Compliance screening (Warden) | ✅ built tonight |

## THE BUILD QUEUE — ranked by $-impact ÷ effort (no-traffic levers first)
1. **Express wallets** (Apple/Google Pay): fold into the Stripe Payment Element rail (already on the
   local `safety/…` branch) — wallets ride the same element. *No-traffic lever; day-one ROI.*
2. **Free-shipping threshold ladder**: threshold ≈ AOV +25%, margin-checked; cart progress bar
   ("$18 away from free shipping"). +15–30% AOV in benchmarks. *Small build.*
3. **Post-purchase review-request flow**: +7 days after delivery, via existing email lib. Reviews
   gate conversion (26–50 reviews ≈ +68% vs zero). First-party reviews capture already exists.
4. **Surface `complete_the_set` in cart** (frequently-bought-together): ORACLE strategy exists;
   render it on cart + PDP with margin-ranked ordering. Amazon: ~35% of revenue is cross-sell.
5. **Micro-drop scale-or-kill rule** (the LATR loop): Forecaster grades every live drop at day 7 —
   >60% sell-through → propose restock ×2.5; <20% → propose kill. Wire as a Forecaster directive +
   cockpit approval (the Approval Loop executes it). *This is the Shein engine, premium-sized.*
6. **Editorial flash window**: 48h "Editor's Pick" on slow movers only (−15/−30%), full-price core
   never discounted — premium-safe urgency. Herald drafts; founder approves.
7. **Margin-safe referral**: "3 friends purchase → 20% off one full-price item." No Temu subsidies.
8. **Agent cost-routing**: per-agent cheap-model tiering (extend the existing `LLM_BASE_URL` /
   `SHEPHERD_MODEL` pattern to high-volume agents) — cuts the AI bill 50–80% when live.
9. **Supplier-transparency storytelling**: origin/material/story fields on PDP (Curator already
   drafts rationale) — the anti-Shein trust wedge, and it's nearly free.
10. **MCP-ify internal APIs** (catalog/signals/cockpit as MCP servers) — future-proofs agent
    integration; do after revenue, not before.

## Operating cadence (the founder's week, ≤5 hrs)
- **Daily (10 min):** open `/cockpit` → approve/reject queue (publish, restock, kills, campaigns).
- **Weekly (1 hr):** review Forecaster's drop grades + Rainmaker's revenue proposals; pick next drops.
- **The agents do the rest** — and every gated action now executes on your tap.

## Hard guardrails learned from Shein/Temu's 2025–26 stumbles
No dark patterns (DSA enforcement is real) · no fake urgency/discount theater · no sub-$40 AOV
race · no paid ads until LTV:CAC ≥ 3 via email/referral · tariff-aware sourcing (EU/PT/TR
suppliers favored) · quality gate (Warden + sample approvals) before scale.

## R&D verification note
GitHub-trending scouting surfaced a real convergence (agent persistence/learning, token-cost
routing, MCP standardization — all already reflected in this stack) but several specific "hot
repos" could not be verified and were **discarded rather than adopted**. We adopt mechanisms,
never bolt on unvetted dependencies — that is how the other project broke.
