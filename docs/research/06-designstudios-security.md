# Eclipse Research 06 — Top Design Studios (Visual Benchmark) + Security Architecture for a Sellable Platform

Date: 2026-05-30
Author: Eclipse strategist (web research synthesis)
Lens: Eclipse core is dependency-free Node ESM, append-only event log, no secrets in repo, human-approval gates, adapters/MCP for live integrations. All recommendations favor a lean, ownable, auditable core.

---

## AREA A — Top Digital/Design Studios & Visual Quality Benchmark

### A.1 Studio signature table

| Studio | Signature quality | Defining techniques | What wins awards | Eclipse relevance |
|---|---|---|---|---|
| **Active Theory** | Real-time WebGL/WebGPU "experiences," in-house **Hydra** framework | GPU particles, immersive 3D worlds, AI-assisted nav, real-time shaders | Technical ambition + performance discipline at scale (adidas, Webby winner) | Aspirational ceiling; borrow restraint not the whole engine |
| **Resn** | Playful, surreal interactive worlds; character + physics | Interactive 3D, physics toys, narrative micro-games | Imagination + craft; "weird made smooth" | Hover/easter-egg delight, used sparingly |
| **Locomotive** | Editorial motion + smooth scroll (authors of `locomotive-scroll`) | Scroll-jacked storytelling, sticky sections, parallax type | Rhythm and pacing of a scroll narrative | Scroll choreography for brand/lookbook pages |
| **Hello Monday (DEPT)** | Story-driven interactive, tasteful motion | Scroll storytelling, type-in-motion, considered transitions | Emotional narrative + polish | Capsule/launch storytelling template |
| **Watson / DesignStudio** | Brand-led art direction, bold identity systems | Type systems, kinetic identity, editorial layout | Brand coherence end-to-end | Eclipse's gothic-luxury identity system |
| **Cuberto** | Fluid product motion, signature **custom cursor** + SVG morphing | Magnetic cursor, gooey/morph transitions, micro-feedback everywhere | Buttery interaction craft | Cursor/hover microinteraction kit |
| **Obys** | Typographic brutalist-luxe, grid tension, high-contrast | Oversized type, marquee, grid-break layouts, mono accents | Typographic confidence | Type-forward dark aesthetic |
| **Unseen Studio** | Minimal motion design, restraint, "less but better" | Subtle reveals, weighty whitespace, refined easing | Discipline + taste | Direct fit for luxury restraint |
| **Basic / DEPT** | Commerce-grade brand + scalable systems | Design systems, performant brand sites at scale | Brand that ships and converts | Scaling identity into a real storefront |
| **Pentagram (digital)** | Editorial/identity rigor translated to screen | Typographic hierarchy, art-directed layout | Timeless craft over trend | Hierarchy + restraint reference |

### A.2 Awwwards / FWA benchmark (2024–2026, fashion/luxury/commerce)

- **E-commerce Site of the Year 2024 — Opal Tadpole (winner):** praised as a masterclass in digital storytelling — strong visuals, **elegant typography**, intuitive nav, high-end feel. Takeaway: storytelling + type hierarchy beat raw effect count.
- **Polène** (Site of the Day, Dec 2024): minimal luxury, product-as-hero, restrained motion, generous whitespace. The luxury default in 2024–2026 is **minimalism + craft**, not maximal WebGL.
- **P448**, **Monolith** (recognized 2024–2025): editorial commerce, art-directed PDPs, considered transitions.
- Macro trend: luxury winners converge on minimalism, typographic confidence, art direction, and *purposeful* (not gratuitous) motion. Heavy WebGL showpieces win the "experimental" lanes; commerce winners win on taste + speed + clarity of the buy path.

### A.3 The 10 adoptable techniques for Eclipse (each with a perf/conversion caveat)

1. **Art-directed hero with a single focal motion** (one slow zoom/parallax on a still or short looped clip), not a multi-layer WebGL scene.
   - *Caveat:* hero is your LCP element — serve a poster image first, lazy-upgrade to video; never block LCP on a 3D canvas. Keep hero < ~1MB initial.

2. **Scroll-driven reveals via native CSS** (`animation-timeline: scroll()/view()`), fade/translate-in of products and copy on enter.
   - *Caveat:* native CSS runs on the compositor (off main thread) — far cheaper than JS scroll libs. Gate behind `prefers-reduced-motion`; keep transforms to opacity/translate to avoid CLS.

3. **Custom cursor + magnetic buttons** (Cuberto-style) on CTAs and product cards for tactile feedback.
   - *Caveat:* desktop/pointer-fine only; never replace the native cursor on touch. Pure transform/opacity, throttle to rAF. Must not delay or obscure the actual click target (conversion risk).

4. **Smooth page transitions via the View Transitions API** (cross-document, MPA-friendly) for an app-like feel between PLP→PDP — Chromium + Safari ship cross-document support as of 2025; Firefox in progress, so treat as enhancement.
   - *Caveat:* progressive enhancement only — full page still works without it (no JS framework needed, which suits a server-rendered dependency-free storefront). Keep transitions < ~300ms so they never sit between the user and "Add to cart."

5. **Product reveal animation on PDP** (image cross-fade / subtle scale on variant change, staged copy entrance).
   - *Caveat:* preload the next image; animate only after decode to avoid flashing. Add-to-cart and price must render instantly, unanimated.

6. **Tasteful parallax / sticky editorial sections** for brand + capsule storytelling (Locomotive/Hello Monday rhythm).
   - *Caveat:* confine to story pages, not the checkout funnel. Avoid full scroll-jacking (hurts INP and accessibility); prefer light sticky + native scroll.

7. **Loading choreography / staged first paint** — skeletons + a brief, on-brand reveal sequence instead of a spinner.
   - *Caveat:* a real loader that *delays* content hurts conversion. Use it only to mask genuine async work; cap any intentional delay at ~600ms and never on returning navigations.

8. **Typographic kinetics** — oversized display type, a tasteful marquee, weight/letter-spacing transitions (Obys/Watson).
   - *Caveat:* ship the font with `font-display: swap` + subset/preload; kinetic type must not cause layout shift. Variable fonts > multiple weights for payload.

9. **Hover microinteractions on product cards** — image swap to alt shot, quick-add affordance, subtle lift.
   - *Caveat:* preload the second image at low priority; debounce so fast mouse movement doesn't thrash. This one is *pro-conversion* (faster path to detail/add).

10. **Restraint + whitespace + dark art direction as the "effect"** (Unseen/Polène) — let negative space and one accent motion carry luxury.
    - *Caveat:* this is the cheapest, highest-ROI lever — costs ~0 perf budget and reads as premium. The discipline is saying no to the other nine when they don't serve the buy path.

**Worth it vs. hurts:** Worth it — native scroll/CSS animation, View Transitions, hover image-swap, magnetic CTAs, type/whitespace craft (all cheap, conversion-neutral-to-positive). Hurts — heavy WebGL hero blocking LCP, scroll-jacking, mandatory intro loaders, autoplay video without poster, cursor effects that intercept clicks, motion without `prefers-reduced-motion`. **Rule for Eclipse:** every effect must survive a Core Web Vitals budget (LCP < 2.5s, INP < 200ms, CLS < 0.1) and must never sit between the shopper and the purchase.

### A.4 How this maps to Eclipse's stack
- Dependency-free is an asset: prefer **native CSS scroll-driven animations** and the **View Transitions API** over GSAP/Lenis/Three.js — zero added supply-chain surface, compositor-thread performance, and it keeps the "ownable, auditable core" promise.
- Motion lives in `src/storefront/render` + CSS in `public/`; keep it data-driven off the published projection so unpublished products never animate into view (default-deny still holds).
- Reserve any real 3D/WebGL for a single optional capsule "experience" page, lazy-loaded, never on the critical purchase path.

---

## AREA B — Security Architecture for a Sellable (Acquirable / SaaS) Platform

### B.1 What technical due diligence actually inspects (acquirer lens)
Acquirers (BVP, Software Equity Group, PE TDD checklists) score: **code quality & architecture** (maintainability, tech debt, docs); **security & compliance** (SOC 2 / GDPR / PCI-DSS posture, audit logging, access control, vuln management); **infrastructure & scalability** (DevOps, DR, multi-tenancy); **IP & licensing** (clean code ownership, OSS license compliance, dependency risk); **team & secure SDLC** (process maturity, knowledge-transfer risk). Eclipse's **dependency-free** design is a standout positive on the IP/supply-chain axis — minimal OSS license entanglement and tiny attack surface. The gaps to close are multi-tenancy, formal logging/access control, and attestable compliance.

### B.2 Architecture pillars

**Multi-tenancy isolation (required before SaaS sale).** Three models:
- *Silo* (DB-per-tenant): strongest isolation, easiest compliance story, higher ops cost.
- *Pool* (shared DB + `tenant_id`): cheap/scalable, leakage risk if queries aren't scoped.
- *Bridge* (shared DB, schema-per-tenant): balance.
- **Recommendation for Eclipse:** start **Pool with DB-enforced Row-Level Security (RLS)** as defense-in-depth, with a clean path to **Silo for enterprise tier**. Critically, bake a `tenant_id` into the **append-only event log and every candidate/queue record now** — retrofitting tenancy into an event store later is expensive. The human-approval gate and storefront projection must both be tenant-scoped (extend the existing default-deny in `src/storefront/projection.mjs`).

**PCI-DSS scope minimization.** Use **Stripe-hosted** (Checkout / Payment Links / hosted Elements) so cardholder data never touches Eclipse servers → qualifies for **SAQ A** (simplest). Eclipse already plans this (`src/orders/stripe-sync.mjs` builds requests; going live is a deliberate operator action). Obligations to retain: annual SAQ A, TLS everywhere, keep the integration current, monitor the third-party processor, and never introduce a self-hosted card field (that would jump you to SAQ A-EP). **Keep card data permanently out of scope — never store PANs in the event log.**

**Secrets management.** Already strong (no secrets in repo, `.env.example` names only, mock adapters default). Mature it: centralized vault (AWS Secrets Manager / Vault) for live integrations; **OIDC workload-identity federation** for CI/CD (keyless — no long-lived cloud creds in GitHub); automated rotation; secret-scanning (gitleaks/trufflehog) in CI; encrypt at rest + in transit; audit every secret access.

**Threat modeling for the agentic core (Eclipse-specific).** Map to **OWASP Top 10 for LLMs (2025)** and **OWASP Agentic AI Threats & Mitigations**:
- *LLM01 Prompt Injection* (incl. indirect, via sourced product/supplier copy) → treat all agent-ingested external text as untrusted; sanitize/escape; never let sourced content alter system instructions or tool routing.
- *Excessive Agency / Tool Misuse* → Eclipse's prime directive is the canonical mitigation: agents propose, humans approve; an `agent` actor can never reach `approved/publishing/published` (`src/queue/transitions.mjs`). Keep tool permissions least-privilege and enumerated.
- *Memory/Log Poisoning* → validate content written to the append-only log; the log's immutability + content-addressed IDs already give strong traceability/non-repudiation.
- *Overwhelming Human-in-the-Loop* → rate-limit candidate generation so the approval queue can't be flooded into rubber-stamping.
- *Repudiation/Untraceability* → already mitigated by append-only events + seeded determinism; surface this as an audit feature.
- *Identity spoofing / rogue agent* → signed actor identity on every queue transition.

**Supply-chain & secure SDLC.** Dependency-free Node + `node:test` is a top-tier supply-chain posture (near-zero third-party attack surface). To make it *attestable*: generate an **SBOM** (CycloneDX/SPDX — will be tiny, which is a selling point), pin/lock anything that does enter, add **SLSA build provenance** + signed releases (Sigstore/cosign), publish an **OpenSSF Scorecard**, enable Dependabot/secret-scanning, and require **signed commits** + branch protection + mandatory review.

**GDPR/CCPA data handling.** Data map + RoPA (records of processing); lawful basis + consent for marketing; **DSAR/erasure workflow** — note the tension with the append-only log. The standard event-sourcing answer to "right to be forgotten" is **crypto-shredding**: encrypt each data subject's PII with a per-subject key and, on an erasure request, **delete the key** — the encrypted PII in the immutable log becomes unrecoverable while history stays append-only (no mutation, projections rebuild cleanly). Complement with **PII separation** (keep raw PII in a mutable side-store keyed by ID; events carry only the reference) and tombstone events for projection-level removal. Plus data minimization (don't log PII you don't need — *never store card data or raw PII in `data/events.ndjson`*), retention schedule, DPA with sub-processors (Stripe, image gen, hosting), cookie consent on the storefront, breach-notification runbook.

### B.3 Prioritized Security & Compliance ROADMAP (in order)

> Each milestone lists key controls and the **sellability/valuation unlock**.

**M0 — Lock the prototype's existing wins (now, ~0 cost).**
Controls: keep dependency-free; keep secrets out of repo; keep human-approval invariant + default-deny projection green; turn on secret-scanning, signed commits, branch protection + mandatory review; write the threat model doc.
*Unlocks:* a clean, defensible baseline — removes the cheapest red flags a buyer would find on day one.

**M1 — Tenancy + identity foundation (before any second customer).**
Controls: `tenant_id` in the event log/queue/projection; RLS-style scoping; per-tenant default-deny; authn/authz with **RBAC + least privilege**; signed actor identity on queue transitions.
*Unlocks:* the platform becomes *multi-customer*, i.e. actually SaaS-sellable rather than a single-brand app. This is the single biggest valuation gate.

**M2 — Audit logging & access control hardening (SOC 2 Security criterion).**
Controls: tamper-evident audit log (extend the append-only store), access reviews, MFA, key/secret rotation, change-management records (you already have determinism + event history to lean on).
*Unlocks:* enterprise procurement conversations; foundation for the SOC 2 audit window.

**M3 — Payments & PCI posture (SAQ A) + secrets maturity.**
Controls: Stripe-hosted live behind a deliberate operator action; complete SAQ A; vault + **OIDC keyless CI/CD**; automated rotation.
*Unlocks:* take real money with minimal compliance liability; "PCI SAQ A, no card data stored" is a clean diligence answer that *raises* multiple.

**M4 — Privacy compliance (GDPR/CCPA).**
Controls: data map/RoPA, DSAR + erasure via crypto-shredding (per-subject keys) / PII separation + rebuild, consent + cookie management, retention schedule, sub-processor DPAs, breach runbook.
*Unlocks:* sell into EU/CA and to privacy-sensitive enterprises; removes a class of deal-blocking diligence findings.

**M5 — Supply-chain attestation & secure SDLC formalization.**
Controls: SBOM, SLSA provenance + signed releases, OpenSSF Scorecard, documented SDLC, pinned/locked deps, periodic dependency review.
*Unlocks:* turns the dependency-free advantage into *provable* low risk — a differentiator most acquisition targets can't match.

**M6 — SOC 2 Type II + external validation.**
Controls: 3–12 month observation window across the Trust Services Criteria (Security required; add Availability/Confidentiality/Privacy as relevant); engage Vanta/Drata/Secureframe for automation; **third-party penetration test**; vendor-risk program.
*Unlocks:* the headline asset in diligence. SOC 2 Type II + pen test + clean SBOM materially de-risks the deal and supports a premium valuation; it is often a hard requirement for enterprise customers and strategic acquirers.

**M7 — Acquisition-readiness packaging.**
Controls: architecture decision records, runbooks/DR plan, IP/license attestation (trivially clean given dependency-free), security policy set, knowledge-transfer docs, a "diligence data room."
*Unlocks:* shortens diligence and reduces escrow/holdback — directly protects deal value at close.

### B.4 Eclipse-specific design notes
- **Append-only log is both a compliance asset and a GDPR friction point.** Lean into it for audit/non-repudiation; solve erasure with **crypto-shredding** (per-subject keys, delete key to forget) + PII separation + projection rebuild (`npm run rebuild`) so history stays append-only while erasure is real and provable.
- **The human-approval gate IS the headline AI-safety control.** Frame it in the threat model as the mitigation for OWASP "Excessive Agency" — buyers worried about agentic risk will value this.
- **Dependency-free = supply-chain story most targets can't tell.** Make it provable (SBOM/SLSA/Scorecard) rather than just asserted.
- **Never let live-going be automatic** (Stripe, image gen, GitHub posting). Deliberate operator actions for outbound/spend are themselves a control acquirers like.

---

## Sources

### Design / visual
- Active Theory — https://activetheory.net/ ; Webby profile — https://www.webbyawards.com/crafted-with-code/active-theory/ ; WebGPU showcase — https://www.webgpu.com/showcase/active-theory-portfolio/
- Locomotive (Awwwards) — https://www.awwwards.com/locomotive/
- Hello Monday (DEPT) — https://www.hellomonday.com/
- Cuberto — https://cuberto.com/ ; Awwwards — https://www.awwwards.com/cuberto/
- Obys — https://obys.agency/ ; "30 Best Digital Design Agencies & Studios" — https://www.obys.agency/blog/30-best-digital-design-agencies-and-studios
- Unseen Studio — https://unseen.co/
- Awwwards E-commerce Site of the Year 2024 — https://www.awwwards.com/annual-awards-2024/ecommerce-site-of-the-year ; 2025 — https://www.awwwards.com/annual-awards-2025/ecommerce-site-of-the-year ; Sites of the Year — https://www.awwwards.com/websites/sites_of_the_year/
- View Transitions API (MDN) — https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API ; cross-document MPA (Chrome) — https://developer.chrome.com/docs/web-platform/view-transitions/cross-document ; what's new 2025 — https://developer.chrome.com/blog/view-transitions-in-2025 ; browser support — https://caniuse.com/view-transitions
- Scroll-driven animations (performance) — https://medium.com/@webexpe/scroll-driven-animations-the-performance-first-approach-to-modern-web-motion-d40a8f2f00ed ; MDN perf issue thread — https://github.com/mdn/content/issues/9019
- Microinteractions (Smashing) — https://www.smashingmagazine.com/2025/microinteractions-ux/
- Cursor effects (Codrops) — https://tympanus.net/codrops/cursor-effects/
- Core Web Vitals / site speed & conversion (Semrush) — https://www.semrush.com/blog/core-web-vitals/ ; https://www.semrush.com/blog/site-speed-importance/

### Security / compliance
- OWASP Top 10 for LLM Applications — https://owasp.org/www-project-top-10-for-large-language-model-applications/ ; LLM01 Prompt Injection (2025) — https://genai.owasp.org/llmrisk/llm01-2025-prompt-injection/
- OWASP Agentic AI — Threats & Mitigations — https://genai.owasp.org/resource/agentic-ai-threats-and-mitigations/ ; Multi-Agentic System Threat Modeling Guide v1.0 — https://genai.owasp.org/resource/multi-agentic-system-threat-modeling-guide-v1-0/
- Stripe — Guide to PCI compliance — https://docs.stripe.com/security/guide-to-pci-compliance ; SAQ A vs SAQ A-EP — https://stripe.com/resources/more/saq-a-vs-saq-a-ep
- AWS SaaS Tenant Isolation Strategies — https://docs.aws.amazon.com/whitepapers/latest/saas-tenant-isolation-strategies/saas-tenant-isolation-strategies.html ; Azure multi-tenant SaaS patterns — https://learn.microsoft.com/en-us/azure/azure-sql/database/saas-tenancy-app-design-patterns
- SOC 2 (Vanta) — https://www.vanta.com/resources/soc-2-startups ; Trust Principles — https://www.vanta.com/resources/soc-2-trust-principles ; SOC 2 Type II (Sprinto) — https://sprinto.com/blog/soc-2-type-ii-compliance/ ; checklist (Drata) — https://drata.com/blog/soc-2-compliance-checklist
- Secrets management (OWASP cheat sheet) — https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html ; CyberArk best practices — https://www.cyberark.com/resources/secrets-management/best-practices ; GitHub OIDC hardening — https://docs.github.com/en/actions/security-guides/security-hardening-your-deployments
- SLSA — https://slsa.dev/ ; CISA SBOM — https://www.cisa.gov/sbom ; OpenSSF Scorecard — https://openssf.org/projects/scorecard/
- Technical due diligence (BVP) — https://www.bvp.com/atlas/technical-due-diligence-guide ; SaaS TDD checklist (Software Equity Group) — https://softwareequity.com/blog/due-diligence-checklist ; Black Duck M&A software due diligence — https://www.blackduck.com/content/dam/black-duck/en-us/ebooks/eb-ma-software-duediligence-checklist.pdf ; SaaS due diligence 2025 (Auditive) — https://auditive.io/blog/saas-due-diligence-checklist

### GDPR & event sourcing
- Crypto-shredding for GDPR in event sourcing (Kurrent/EventStore) — https://www.kurrent.io/blog/crypto-shredding-gdpr-event-sourcing ; Event Sourcing and GDPR: the right to be forgotten — https://www.eventstore.com/blog/event-sourcing-and-gdpr-the-right-to-be-forgotten ; Axon crypto-shredding — https://www.axoniq.io/blog/handling-gdpr-with-axon-framework-and-crypto-shredding
