# Lumera R&D Packet 1 — reality map (what exists vs. what's new)

> Director's triage of the deep R&D packet against the **current codebase** (`f48ca0d`). The packet's
> thesis — *Product Truth Receipt + Owner Approval Ledger + Honest Image Pipeline as the anti-dropship-
> shell IP* — is strong and **already ~70% built**. This file exists so we ADAPT what's here and don't
> rebuild it (per CLAUDE.md), and so the genuinely-new ideas have a home **post-launch**.
>
> **Launch impact: none.** Nothing in this packet changes the launch gate (Payments / Commerce /
> Trust & legal / Security). It is post-launch product strategy — except the one intersection in §3.

## 1. Primitive-by-primitive status
| Packet primitive | Status | Where it lives now / gap |
|---|---|---|
| Product Truth Receipt | **EXISTS** | `ProductTruth` type + `productTruthByHandle` (`lib/lumera-db.ts`), PDP render (`app/p/[handle]/page.tsx`), `packages/shared/curation.ts`. Gap: formal per-claim `evidence_strength` + image-provenance sub-records. |
| Owner Approval Ledger | **PARTIAL** | Candidate workflow states + `lumera_approval_request` table; cockpit approvals; agent escalation gate (`run-agent.isGated` + the D1 stored-action approval). Gap: the formal 12-state, append-only ledger with AI-field traceability + rejection-reason capture. |
| Launch Readiness Gate | **EXISTS** | `scripts/launch-preflight.ts`, `scripts/launch-proof.ts`, `/lumera-launch-preflight`. Gap: per-product (not repo-level) publish gate that blocks on receipt/image/copy/price. |
| Honest Image Pipeline | **PARTIAL** | `artisan` agent + gated `image_write`. Gap: original/processed file lineage, allowed-transform policy enum, before/after link, `rights_status`. (NEW work.) |
| Copy Claims Filter | **PARTIAL** | Warden agent screens products. Gap: a deterministic regex/rules filter for `best/guaranteed/authentic/limited/handmade/waterproof/medical/licensed/ships-in-24h` requiring evidence. (Cheap, high-value NEW.) |
| Visual QA Gate | **PARTIAL** | Build-time perf is healthy; alt-text/crop-safety/dimension gate per image is NEW. |
| Supplier Confidence Score | **PARTIAL** | Vendor health + margin guard in INTROSPECTION, `vendor-routing`. Gap: a persisted per-supplier score from returns/defects/fulfillment. |
| Search / Watchlist | **EXISTS** | `/store/search` + ⌘K; `WishlistButton/View`, `lib/wishlist.ts`, account hub. Gap: no-result demand capture + owner demand panel. |
| Category Taste System | **PARTIAL** | Chapter pages exist; editorial facet logic + proof badges are polish. |
| Weekly Owner Report | **PARTIAL** | OPERATOR daily loop + cockpit KPIs exist; a packaged weekly digest is NEW. |

## 2. Genuinely NEW, ranked by value/effort (all POST-LAUNCH unless pulled forward)
1. **Copy Claims Filter** (deterministic) — small, pure, unit-testable; directly protects the no-fake-claims brand promise. Best first post-launch pick; could even be a Warden sub-check.
2. **Image provenance + rights_status** on `ProductImage` — closes the "stolen/misrepresented image" risk in the RISK_REGISTER. Medium effort (schema + admin + before/after storage).
3. **Per-product publish gate** — promote `launch-proof`'s spirit to a per-product check the curation flow must pass before `published`. Medium; reuses existing gates.
4. **Formal Approval Ledger (append-only + AI-field traceability)** — upgrade of the existing approval surface; medium-large.
5. Supplier confidence persistence · no-result demand capture · weekly owner digest — lower urgency.

## 3. The ONE launch intersection — fold, don't build
The Truth Receipt **acceptance criteria** (every live product has a receipt; every claim supported or removed; every image has provenance; shipping + returns visible before checkout) are exactly the **quality bar for the B6 catalog curation**. Action: when the founder curates the first ~20 real products, the Warden/curation screen should enforce these as the publish bar — no new system required, just hold the existing gate to this standard. This is captured in the ledger's B6 / post-launch notes.

## 4. Risk register (Lumera) — already enforced or to enforce
From `RISK_REGISTER.md`, Lumera-specific: fake proof · fake scarcity · stolen images · watermark removal · unverified claims · hidden shipping/returns · customer/supplier data into random tools · AI copy without human review. **Already enforced:** no autonomous publish (approval gate), verified-purchase reviews (D5), honest shipping promise on PDP, CAN-SPAM (B3), no money-movement without approval. **To enforce post-launch:** claims filter (#1), image rights_status (#2), human-review-of-AI-copy as a ledger state (#4).

## 5. Recommendation
**Do not pause launch to build this.** Runway pressure says launch on what's verified (gate is founder-moves-away), then work §2 in order. The packet is preserved here as the post-launch product roadmap; its best idea (Truth Receipt + Approval Ledger + Honest Image) is already Lumera's spine — we deepen it, we don't restart it.
