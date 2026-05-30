# Eclipse R&D — Autonomy & Security Findings (02)

**Author:** R&D analyst (autonomy + security workstream)
**Date:** 2026-05-30
**Scope:** Mine the research sources under `/home/user/eclipse-research/sources/` for concrete agent-orchestration, skills/commands/hooks, governance, and security patterns; translate them to Eclipse's dependency-free Node/ESM, append-only, no-secrets-in-repo, mock-adapters-by-default core; produce an autonomy-upgrade design and a sellability-ranked security hardening checklist.

> **Lens:** Eclipse = Node built-ins + `node:test` only, ESM `.mjs`, append-only `data/events.ndjson` + `queue/candidates.ndjson`, integer-minor-unit money, seeded RNG / content-addressed IDs / injectable clock, secrets only via `process.env`, mock adapters unless `ALTAR_LIVE`. Prime directive: **agents propose and prepare; humans approve and publish.**

---

## 0. Methodology, source map, and a tooling caveat

I read the actual files in the relevant repos and verified load-bearing claims with `grep`/`awk` line extraction and byte-level checks.

**Tooling caveat (and a finding):** the directory names under `sources/` are misleading — every `sources/<hash>-<name>/` wraps the true repo one level deeper (e.g. `2078e8dd-claudecodeowaspmain/claude-code-owasp-main/`). Separately, the sandbox's tool-output channel intermittently returned empty results for `Bash`/`Read` (even trivial commands), recovering after a few retries. I worked around it with retries and small reads; the findings below rest only on output I actually received and re-confirmed. *This is itself security-relevant:* an autonomous agent whose perception channel (tool output, file reads, web fetches, its own logs) can silently return empty/partial/stale data must **fail safe**, not act on a degraded channel — motivating control **#17** below.

### Source identity map (corrected — relevant repos; true inner path in parentheses)

| Dir prefix | Inner repo | What it contains (relevant) |
|---|---|---|
| `2078e8dd` | `claude-code-owasp-main` | **`OWASP-2025-2026-Report.md`** (792 lines) covering **OWASP Top 10:2025**, **OWASP ASVS 5.0.0**, and **OWASP Top 10 for Agentic Applications 2026 (ASI01–ASI10)**, plus a **Key Security Principles** section; and **`.claude/skills/owasp-security/SKILL.md`** — a packaged security-review skill. Primary SECURITY source. |
| `3988331b` | `claude-agent-sdk-python-main` | Claude Agent SDK: `src/claude_agent_sdk/{query,client,types}.py` + `_internal/*`. Agent loop, permissions, hooks. |
| `3c1d3abb` | `claude-code-base-action-main` | Claude Code Base GitHub Action: `action.yml`, `base-action/`, `src/`. CI automation. |
| `c1049f91` | `claude-code-main` | Claude Code: `docs/{hooks,slash-commands,sub-agents,skills,settings}.md`, `examples/hooks/bash_command_validator_example.py`, bundled `plugins/plugin-dev/skills/agent-development/*`. |
| `7f6c2ee8` | `claude-plugins-official-main` | Official marketplace: `.claude-plugin/marketplace.json`; `plugins/code-modernization/{agents/security-auditor.md, commands/modernize-harden.md}`; `plugins/claude-code-setup/skills/claude-automation-recommender/*`. |
| `1506cad9` | `claude-plugins-community-main` | Community plugins + `.claude-plugin/marketplace.json`. Packaging/distribution. |
| `298f2efa` | `andrej-karpathy-skills-main` | Karpathy "skills": philosophy + concrete skill examples. |
| `8ce8dc61` | `jscodeshift-main` | AST codemods (autonomous refactors). |
| `8f2d6981` | `comview-main` | Self-hostable dashboard to monitor/review autonomous-agent activity over an append-only NDJSON log. Audit/observability blueprint. |

> ~16 other dirs are present (serverless, neon, onedrive-vercel-index, relivator, inbox-zero, MoneyPrinter, gemini-youtube-automation, SaaS-Foundations, saasyland.com, awesome-design, eva, hdrnet/ISP/LuminanceHDR). They are **out of scope** for this brief; relivator / SaaS-Foundations / neon / inbox-zero may help a separate SaaS-stack workstream.

---

## 1. Per-project takeaways

### 1.1 Claude Agent SDK (`3988331b`) — agent loop, tools, permissions
- **The loop is a streaming async generator.** `query(*, prompt, options, transport) -> AsyncIterator[Message]` (`src/claude_agent_sdk/query.py`) yields messages as they arrive. Eclipse lesson: model a *run* as a stream of typed events you can intercept, not a single return value.
- **Two control tiers.** `query()` for one-shot; the stateful **`ClaudeSDKClient`** (`client.py`, async context manager) for "`can_use_tool` callback, hooks, or custom permission logic" (verified in `query.py` docstring).
- **The permission decision can REWRITE input.** `PermissionResultAllow{ behavior:"allow", updated_input?, updated_permissions? }` and `PermissionResultDeny{ behavior:"deny", message, interrupt }` (`types.py`). `updated_input` lets a gate **sanitize/normalize a tool call** (strip HTML, clamp a price, drop a field) before it runs; `interrupt` lets a denial **halt the run**.
- **Options = governance surface** (`types.py`): `permission_mode`, `allowed_tools[]`, `disallowed_tools[]`, `hooks: dict[HookEvent, list[HookMatcher]]`, `mcp_servers`, `can_use_tool`, `setting_sources`, `max_turns` (a direct excessive-agency / unbounded-consumption control).
- **Lifecycle hooks** (verified): `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `SubagentStop`, `PreCompact`.

**Eclipse translation:** a `can_use_tool`-style gate on every adapter call + per-role `allowed_tools`, where the gate can return a *rewritten input* (sanitization), not just allow/deny.

### 1.2 Claude Code (`c1049f91`) — skills, commands, sub-agents, hooks
- **Skills = `SKILL.md` + YAML frontmatter** (`name`, `description`) with **progressive disclosure** (body loads when the description matches) and an **`allowed-tools`** field scoping tools per skill (`docs/skills.md`, verified). Direct answer to "expose Eclipse roles as skills?" — yes: one `SKILL.md` per role with a tight `allowed-tools`.
- **Slash commands = Markdown in `.claude/commands/`** with frontmatter (`allowed-tools`, `argument-hint`, `description`, `model`), `$ARGUMENTS`/`$1`/`$2` substitution, `!`-bash embedding, `@`-file embedding (`docs/slash-commands.md`, verified). Clean wrapper for Eclipse's `npm run review …` operator actions.
- **Sub-agents** = delegated specialists with **their own context window, system prompt, and tool permissions**, defined as Markdown+YAML (`name, description, tools, model`) in `.claude/agents/`; benefit = **context isolation** (`docs/sub-agents.md`, verified). Eclipse's registry already embodies this; upgrade = per-role tool scoping + isolation as a security boundary.
- **Copyable security hook**: `examples/hooks/bash_command_validator_example.py` (tokens verified) — a `PreToolUse` hook reading `{tool_name, tool_input}` JSON from **stdin**; if `tool_name=="Bash"` it checks `command` against a `VALIDATION_RULES` list of `(regex, message)` pairs and emits `hookSpecificOutput` with `permissionDecision:"deny"` + `reason`. Template for a deterministic policy gate.
- Agent-authoring guidance bundled in `plugins/plugin-dev/skills/agent-development/` (declarative agent definitions).

### 1.3 OWASP report + skill (`2078e8dd`) — the primary SECURITY source (read & verified)
`OWASP-2025-2026-Report.md` is the threat-model anchor. Three layers, all confirmed by reading the file:

**(a) OWASP Top 10:2025** (175k+ CVEs analyzed): A01 Broken Access Control (#1, unchanged); A02 Security Misconfiguration; A03 **Software Supply Chain Failures (NEW)**; A04 Cryptographic Failures; A05 Injection; A06 Insecure Design; A07 Identification/Authentication Failures; A08 Software & Data Integrity Failures; A09 Security Logging & Monitoring Failures; A10 **Mishandling of Exceptional Conditions (NEW)**. Each section ships BAD/GOOD code and mitigations; notably A01's first mitigation is **"Deny access by default (allowlist)"**, A03's is **"lock versions, verify integrity, audit,"** and A10 contrasts **fail-open (BAD) vs fail-closed (GOOD)**.

**(b) OWASP ASVS 5.0.0** — verification levels + categories + requirement examples (use as the concrete "what to test" backlog).

**(c) OWASP Top 10 for Agentic Applications 2026 (ASI01–ASI10)** — the most Eclipse-relevant content, verified present:
- **ASI01 Agent Goal Hijack** — attacker subverts the agent's objective (prompt injection at the goal level).
- **ASI02 Tool Misuse** — agent induced to call tools harmfully / outside intent.
- **ASI03 Identity & Privilege Abuse** — over-broad or shared agent identity; privilege escalation.
- **ASI04 Supply Chain Vulnerabilities** — compromised tools / MCP servers / models / deps.
- **ASI05 Unexpected Code Execution** — agent runs attacker-influenced code.
- **ASI06 Memory & Context Poisoning** — malicious data persisted into memory/context steers later actions.
- **ASI07 Insecure Inter-Agent Communication** — trust/▸spoofing between agents.
- **ASI08 Cascading Failures** — one bad action/agent triggers a chain.
- **ASI09 Human-Agent Trust Exploitation** — social-engineering the human approver (directly threatens Eclipse's approval queue).
- **ASI10 Rogue Agents** — an agent acting outside policy/oversight.

**(d) Key Security Principles** (verified): Defense in Depth · **Least Privilege** · **Fail Secure** · **Zero Trust** · **Secure by Default** · Input Validation · Output Encoding · **Keep Security Simple**. ("Keep Security Simple" validates Eclipse's dependency-free, small-surface ethos as a security posture, not just an engineering one.)

`.claude/skills/owasp-security/SKILL.md` proves the pattern of **packaging a security review as a reusable, tool-scoped skill**. Eclipse should ship an analogous `commerce-security` skill an agent/operator invokes to self-audit before high-risk actions.

### 1.4 Claude Code Base GitHub Action (`3c1d3abb`) — CI automation & supply chain
README + `action.yml` (claims verified): trigger on `@claude` mention; grant `contents/pull-requests/issues: write` **only as needed**; `allowed_tools` restricts CI execution; **least-privilege `GITHUB_TOKEN`**; **API key in Actions secrets, never the repo**; **treat issue/PR text as untrusted — never auto-execute commands from it.** Maps to Eclipse's mirror flow (`src/queue/mirror-github.mjs`, `src/queue/decisions.mjs#applyGithubDecision`): operator label decisions are untrusted external input and re-enter only via human-gated review (already true — keep it).

### 1.5 Karpathy skills (`298f2efa`) — what a good skill is
A skill is a **concise, reusable instruction set that teaches an agent to do one thing well**; keep skills **small and composable**; **prefer deterministic scripts over prose** (ship a script the agent calls); skills are **versioned, reviewable artifacts**. Perfect fit: Eclipse's deterministic core already *is* `.mjs`; a skill should be a thin prose wrapper over a deterministic module — never free-form prose asking the model to improvise a consequential action.

### 1.6 Official & community plugins (`7f6c2ee8`, `1506cad9`) — packaging for sale
A plugin **bundles commands + agents + skills + hooks into one installable unit** via `.claude-plugin/plugin.json` (`name, version, description, author`), distributed through `.claude-plugin/marketplace.json` (both marketplaces confirmed). The official repo ships on-point exemplars: `plugins/code-modernization/agents/security-auditor.md` (a security-reviewer **subagent**), `plugins/code-modernization/commands/modernize-harden.md` (a **hardening command**), and `plugins/claude-code-setup/skills/claude-automation-recommender/*` (recommends automations/subagents). **Sellability:** Eclipse's roles + ops commands + safety hooks can ship as one versioned, installable **"Eclipse Commerce House"** unit — the capability inventory an acquirer wants.

### 1.7 jscodeshift (`8ce8dc61`) — safe autonomous refactors
A transform is `(fileInfo, api, options) => string`; **`--dry` previews without writing**; `api.jscodeshift` is the AST toolkit; `.toSource()` serializes. **Takeaway:** autonomous code changes should be **AST-based, deterministic, dry-run-first**, with the diff entering Eclipse's propose→approve gate before touching disk. Stay dependency-free — replicate the *pattern*, don't add the dep.

### 1.8 comview (`8f2d6981`) — the audit/observability blueprint (highest direct relevance)
comview is *a dashboard for reviewing autonomous-agent activity over an append-only NDJSON log* — Eclipse's `data/events.ndjson` shape. Adopt two artifacts nearly verbatim (verified):
- **Event schema** (`docs/event-schema.md`): `{ ts, actor, type, run_id, payload, prev_hash, hash }`; `actor ∈ {human, agent, system}`; `type ∈ {tool_call, approval, decision, publish}`. `prev_hash`/`hash` = **tamper-evident chain**.
- **Security model** (`docs/security.md`): (1) treat the log as **untrusted input** — escape on render, **never `eval`**; (2) **redact secrets/PII** (tokens, emails, card-like patterns); (3) **append-only + running hash chain** so edits/deletions are detectable; (4) **read-only dashboard, no mutation endpoints.**

---

## 2. The "Eclipse autonomy upgrade" design

Goal: **maximize autonomous throughput while making every consequential action gated, attributable, sanitized, bounded, and tamper-evidently logged** — and package the result as a sellable unit. All additions are Node-built-in/ESM and append-only-friendly.

1. **Typed, interceptable run-loop** (`src/agents/runtime.mjs`): each run is an async generator of typed events (`intent`/`tool_call`/`tool_result`/`proposal`/`gate`/`done`), mirroring the SDK's `AsyncIterator`. One place to enforce policy, budget, and audit for all roles. *(SDK 1.1)*
2. **Input-rewriting policy gate** — new `src/agents/policy-gate.mjs`: `gate({role,tool,input,ctx}) -> {decision, input?, reason?, halt?}`. Per-role **default-deny** allowlist (a `restock` agent can never call `stripe.go-live`; an `agent` actor can never publish — reinforces `transitions.mjs`); **input sanitization** before adapters run; hard denials that `halt`. *(SDK `PermissionResult`; OWASP A01/ASI02/ASI03.)*
3. **Deterministic policy hooks** (PreToolUse/PostToolUse) as pure `.mjs`, unit-tested: block shelling out, non-allowlisted network egress, secret-shaped args; assert post-conditions (storefront projection stays default-deny). *(Claude Code bash-validator.)*
4. **Roles as skills + ops actions as commands, packaged as a plugin/bundle**: a `SKILL.md`-style descriptor per role (`name`, `description`, `allowed-tools`) over the deterministic `.mjs` body; `review`/`mirror`/`stripe:plan` as parameterized commands; everything under one versioned manifest. Plus a **`commerce-security` self-audit skill** modeled on `owasp-security/SKILL.md`. *(Claude Code skills/commands; plugins; OWASP skill.)*
5. **Tamper-evident, attributable event log**: extend `data/events.ndjson` to `{ts, actor, type, run_id, payload, prev_hash, hash}` (`hash=H(prev_hash+canonical(record))` via `src/lib/hash.mjs`); add `npm run verify-log`. Non-repudiation for free. *(comview; OWASP A09.)*
6. **Budgets & autonomy dials**: per-role/run/day caps on turns, tool calls, **monetary exposure (integer minor units)**, items-published-pending; breach → `halt` + human-review candidate. The biggest "more autonomy, safely" lever. *(SDK `max_turns`; OWASP ASI08 + Unbounded Consumption.)*
7. **Verify-before-act vs untrusted/degraded I/O**: content-address what agents read (re-read & compare); **idempotency keys/nonces** on every external write (Stripe-sync, mirror, publish); never treat external free text (supplier feeds, order notes, GitHub labels, web pages, own logs) as instructions; on empty/stale/duplicated tool output, **fail safe**. *(OWASP ASI01/ASI06; the tooling caveat.)*
8. **Trust tiers**: T0 propose-only (today) → T1 auto-prepare reversible artifacts (draft copy, image requests, Stripe TEST plans) → T2 auto-execute low-risk reversible actions within budget — **never** auto-publish/auto-charge/auto-go-live. Each change explicit + logged. *(Least Privilege + Secure by Default.)*
9. **Multi-tenant readiness**: thread `tenant_id` through every entity/event/queue/projection; tenant-scoped default-deny projections; fuzz for cross-tenant bleed. Design the key now even before going multi-tenant. *(Acquirability; OWASP A01.)*
10. **AST/dry-run-first self-modification**: codemods/config edits are deterministic, dry-run-first, human-reviewed via the propose→approve gate. *(jscodeshift; OWASP ASI05.)*

---

## 3. SECURITY HARDENING CHECKLIST (ranked by importance for sellability)

Ranking optimizes for **what an acquirer's technical due diligence + a security review gate on**, weighted by blast radius (money + customer data + autonomous action). Tags map to OWASP Top 10:2025 (Axx), Agentic 2026 (ASIxx), and SOC 2 / PCI. "Status" is vs Eclipse's current documented design.

### Tier S — deal-breakers (must be airtight before any sale)
1. **Human-in-the-loop on all consequential/irreversible/financial actions.** Keep enforced in code: `agent` actor can never reach `approved/publishing/published` (`src/queue/transitions.mjs`); `approved` requires `gate.passed===true`; `human_approved` is a required launch gate (`src/scoring/launch-gate.mjs`); publish default-deny (`src/storefront/projection.mjs`). Harden the approval UX against **ASI09 Human-Agent Trust Exploitation** (show provenance + diffs so an operator can't be socially-engineered into rubber-stamping). *(A01, ASI09, ASI10.)* **Status: present — protect with tests; never weaken.**
2. **No secrets in repo; runtime-only loading + scoped, rotatable, per-agent credentials.** Keep `process.env`-only + committed `.env.example`; give each agent a scoped non-human identity (not one shared key); support rotation; never log secret values. *(A07, ASI03; SOC 2 confidentiality.)* **Status: env pattern present — add per-agent scoping + rotation.**
3. **PCI scope minimization — never store/handle PAN; tokenizing processor only.** Stripe-sync builds *requests*; go-live is a separate deliberate operator action (`src/orders/stripe-sync.mjs`). Keep card data in Stripe (target **SAQ A**), store only tokens/IDs, money as integer minor units + currency. *(PCI DSS; A04/A02.)* **Status: aligned — formalize + test that no PAN-shaped data is ever persisted/logged.**
4. **Prompt-injection / untrusted-input containment.** Treat ALL external content as **data, not instructions**: no `eval`, escape on render, validate structured outputs; external decisions (GitHub labels) re-enter only via human-gated review (`src/queue/decisions.mjs`). *(A05, ASI01 Goal Hijack, ASI06 Context Poisoning; corroborated across all sources.)* **Status: partial — add an explicit input-trust boundary + "no instructions from data" rule in the policy gate.**
5. **Authorization: per-role least-privilege tool allowlists + input-rewriting policy gate.** Build `src/agents/policy-gate.mjs` (§2.2), default-deny, mirroring SDK `allowed_tools`/`can_use_tool`. *(A01 "deny by default", ASI02 Tool Misuse, ASI03; SOC 2 access control.)* **Status: to build.**

### Tier A — strongly expected (clear standard DD; raise valuation)
6. **Tamper-evident, fully attributable audit log.** `prev_hash`/`hash` + `actor` on `data/events.ndjson` (§2.5) with `npm run verify-log`; record actor + authorizing human + inputs + rationale per consequential action. *(A09; comview.)* **Status: append-only present — add hash chain + attribution.**
7. **Spend/agency budgets & rate limits (anti-runaway).** Per-role/run/day caps on turns, tool calls, **monetary exposure**; breach → halt + human review (§2.6). *(ASI08 Cascading Failures; Unbounded Consumption; A06.)* **Status: to build.**
8. **Supply-chain integrity.** Keep **dependency-free** (near-zero third-party CVE surface — a real selling point); pin/review any MCP servers + external endpoints; verify integrity of anything fetched; least-privilege CI tokens (Base-Action). *(A03 NEW, ASI04; A03 mitigation = "lock versions, verify integrity, audit".)* **Status: dependency-free is a strength — document MCP/endpoint allowlisting + CI token scoping.**
9. **Secret & PII redaction in logs, telemetry, rendered surfaces.** Render-time redactor for tokens/emails/card-like patterns (comview); event payloads and agent context never carry raw secrets/PII. *(A04/A02; GDPR/CCPA; PCI.)* **Status: to build.**
10. **Read-only operator surfaces; all mutations via gated actions.** `public/` storefront + ops console expose **no** mutation endpoints; every state change flows through the reviewed/append-only path. *(A01; comview.)* **Status: align/verify — add a test asserting no write endpoints are served.**

### Tier B — maturity & scale (de-risk growth; finish the acquirability story)
11. **Multi-tenant isolation by design.** Thread `tenant_id` everywhere; tenant-scoped default-deny projections; fuzz for cross-tenant bleed (extend existing projection fuzz tests). *(A01; SaaS DD.)* **Status: single-tenant — design the key now (§2.9).**
12. **AI-generated-change validation before execution.** Autonomous code/config changes are AST/deterministic, **dry-run first**, human-reviewed via propose→approve. *(ASI05 Unexpected Code Execution; A08.)* **Status: adopt as policy.**
13. **Idempotency / replay protection on external writes.** Nonces/idempotency keys on Stripe-sync, mirror, publish so replayed/duplicated instructions can't double-execute. *(A08 integrity, ASI01; PCI.)* **Status: to build.**
14. **Fail-closed everywhere + structured exception handling.** On any error/ambiguity (including a degraded tool channel), deny/halt rather than proceed; never leak stack traces; never fail-open. *(A10 NEW "fail-closed", Fail Secure principle.)* **Status: audit code paths; make the default deny.**
15. **Determinism & reproducibility as a security property.** Keep seeded RNG (`src/lib/rng.mjs`), content-addressed IDs (`src/lib/hash.mjs`), injectable clock (`src/lib/clock.mjs`); replayable logs (`npm run rebuild`) ease forensics/audit. *(A09; SOC 2.)* **Status: present — keep; cite in the security narrative.**
16. **Formal acquisition posture: SOC 2 Type II + written threat model + IR.** Pursue SOC 2 Type II (6–12 mo of operating-effectiveness evidence across Security/Availability/Confidentiality); write the threat model down (anchor on this OWASP report + ASVS as the test backlog); define incident response + retention/deletion (GDPR/CCPA). *(Acquisition baseline.)* **Status: organizational — start the evidence clock early.**
17. **Content integrity: no fake scarcity / fake reviews / padded MSRPs.** Keep voice/honesty constraints as a *content-integrity* control; an agent must never be talked into fabricating urgency/reviews. *(Misinformation; consumer-protection risk; ASI01.)* **Status: present in working agreement — encode as a content gate.**
18. **Out-of-band integrity checks on the agent's perception channel.** Content-address what agents read and verify on re-read; detect empty/partial/stale/duplicated tool output and **fail safe** (motivated by the tool-output degradation seen during this research). *(Defense in Depth; ASI06.)* **Status: novel — to build (§2.7).**

---

## 4. Mapping summary: source pattern → Eclipse artifact

| Source pattern (file) | Eclipse artifact |
|---|---|
| SDK `PermissionResultAllow.updated_input` (`types.py`) | Input-rewriting policy gate `src/agents/policy-gate.mjs` |
| SDK `allowed_tools` / `max_turns` (`types.py`) | Per-role tool allowlist + budgets in `src/agents/runtime.mjs` |
| SDK hook events (`PreToolUse`/`PostToolUse`) | Deterministic `.mjs` policy hooks |
| CC `bash_command_validator_example.py` | Generic `(matcher, ruleFn)` PreToolUse validator |
| CC skills `SKILL.md` + `allowed-tools` + progressive disclosure | Per-role skill descriptors |
| CC slash-commands frontmatter + `$ARGUMENTS` | Parameterized ops commands for `review`/`mirror`/`stripe:plan` |
| CC sub-agents context isolation + per-agent tools | Role isolation as a security boundary |
| OWASP `owasp-security/SKILL.md` + `OWASP-2025-2026-Report.md` (Top10:2025 + ASI01–10 + ASVS) | A `commerce-security` self-audit skill + the §3 threat backbone + an ASVS-based test backlog |
| Official plugin `code-modernization` security-auditor + `modernize-harden` | A security-reviewer subagent + a hardening command for Eclipse |
| Base-Action least-privilege token + untrusted issue text | Scoped CI tokens + untrusted GitHub-label handling (already gated) |
| Karpathy "prefer deterministic scripts; versioned/reviewable" | Thin prose skills over deterministic `.mjs`, version-pinned |
| Plugins `plugin.json` + `marketplace.json` | Single versioned, installable "Eclipse Commerce House" bundle |
| jscodeshift transform + `--dry` | AST/deterministic, dry-run-first, human-reviewed autonomous refactors |
| comview event schema `{actor, prev_hash, hash}` + `security.md` | Hash-chained, attributable `data/events.ndjson` + render-time redaction + read-only ops console |
| OWASP Key Security Principles (Fail Secure, Least Privilege, Secure by Default, Keep Security Simple) | Eclipse's default-deny, dependency-free, fail-closed posture — stated as deliberate controls |

---

## 5. Status & follow-ups (honest accounting)
- **Read & verified:** Agent-SDK loop/permissions/hooks; Claude Code skills/commands/sub-agents/bash-validator; **the full OWASP report's Top10:2025 summary + A01–A10 sections, the ASI01–ASI10 agentic taxonomy, and the Key Security Principles**; comview schema + security model; jscodeshift transform/`--dry`; plugin manifest/marketplace shape + the official `code-modernization` security-auditor/`modernize-harden` exemplars; Karpathy philosophy; Base-Action README claims; corrected nested-repo map.
- **Located, light read (recommend deeper pass when channel is healthy):** verbatim mitigation language inside each ASI section; `owasp-security/SKILL.md` body; `claude-automation-recommender` and `plugin-dev/agent-development` references. Expected to reinforce, not change, §3.
- **Not completed (tooling caveat):** the planned light web pass (current citations for agentic-commerce prompt-injection defenses, SOC2/PCI/multi-tenancy acquisition bar). The on-disk OWASP report (Top10:2025 + ASVS + Agentic 2026) plus standards knowledge already cover the substance; web citations are a quick polish follow-up.
