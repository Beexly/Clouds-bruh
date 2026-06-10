# R&D TRIAGE — the 150-repo sweep, decided (2026-06-10)
> Founder supplied ~150 candidate repos/stores (time-windowed trending + e-comm platforms + the
> "operating system around e-commerce": ERP/CRM/PIM/search/analytics/support). Verdicts below are
> against Lumera's reality: Medusa v2 + Next 15 + 15-agent Constellation, one founder, pre-revenue.
> Rule: we adopt MECHANISMS and set THRESHOLDS; we do not self-host a dozen apps before revenue.

## Verdict 1 — ALREADY IN YOUR STACK (the list bought what you own)
| They suggested | You have |
|---|---|
| PostHog / Plausible / umami / Matomo / rudder | **Wired, env-gated** — set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` *or* `NEXT_PUBLIC_POSTHOG_KEY`; consent-gated already |
| Qdrant / Chroma / Milvus / vespa (vector search) | **pgvector hybrid search + ORACLE embeddings** — built, tested |
| MoneyPrinterTurbo | **Already integrated** — Herald's `video_render` tool (staged) |
| Mautic / listmonk / Keila / novu (email+notif) | **Resend + Klaviyo wiring built** (transactional + lifecycle, env-gated) |
| Medusa / vercel-commerce / hydrogen / saleor-storefront | **You ARE Medusa v2** with a custom storefront ahead of these templates |
| Metabase / Superset / redash (BI) | **Analyst agent (text-to-SQL, read-only) + cockpit KPIs** cover the first $50k/mo |
| SuiteCRM / Twenty / espocrm (CRM) | **Loyalist + customer accounts + SIGNAL** — a CRM app would be an empty second store of truth |

## Verdict 2 — REPLATFORMING BAIT: IGNORE PERMANENTLY
Saleor, Vendure, Spree, Bagisto, Sylius, Reaction, WooCommerce, Shopware, PrestaShop, Magento,
nopCommerce, grandnode, oro, lunar, aimeos, solidus, thelia, elcodi, drupal/vanilo, vue-storefront,
elasticpath, commercelayer — **all alternatives to what's already built and green.** Switching = months
of migration for zero customer value. The single most expensive click a low-funds founder can make.

## Verdict 3 — KEEP, WITH THRESHOLDS (adopt when the trigger fires)
| Repo | Trigger to adopt |
|---|---|
| **markitdown** (Microsoft) | First supplier sends PDFs/spec sheets agents must ingest → wire into Sourcer/radar parsing |
| **Meilisearch / Typesense** | Catalog > ~1,000 SKUs or search latency complaints (pgvector covers until then) |
| **Chatwoot / FreeScout** | Support > ~10 human tickets/day (Polaris + email covers until then) |
| **listmonk / Keila** | Email list > ~2,000 subs and Resend/Klaviyo pricing bites |
| **Akaunting / InvoiceNinja** | First profitable month → real books (Treasurer drafts; a ledger app files) |
| **docuseal** | First supplier/wholesale contract needing signatures |
| **browser-use / browser-harness** | A must-have supplier has no API (ToS + fragility risk — Warden reviews first) |
| **roboflow/supervision** | Imagery QC at scale (Artisan anti-AI-artifact checks) — post-revenue |
| **grafana / lightdash** | When ops outgrow the cockpit (not soon) |
| **Odoo / ERPNext / InvenTree / PIM suites** | Holding physical inventory or >3 staff — i.e., a different company than today's |

## Verdict 4 — FOR YOUR LOCAL CLAUDE/CODEX, NOT THE PRODUCT
Skill packs (obra/superpowers, addyosmani/agent-skills, mattpocock/skills, pm-skills,
last30days-skill), CodeGraph, Understand-Anything, hermes-agent (pattern: persistent self-improving
agents — your Ledger/learning loop already implements the core; full framework swap = churn; the
sanctioned future path per CLAUDE.md is Anthropic's Agent SDK), CLI-Anything, gtm-coding-agent.
Cheap to trial in your local dev loop; none belong in the storefront.

## Verdict 5 — NOISE FOR A COMMERCE COMPANY
apple/container, FunASR, ChinaTextbook, openmed, lottie, caveman, odysseus, obscura, AiToEarn,
PPT/design/skill-meme repos, agents-last-exam, DeepSeek wrappers — interesting internet, zero
revenue path for Lumera now.

## The one action this list actually unlocked TODAY
Analytics is a flagged blind spot and the wiring already exists: **set
`NEXT_PUBLIC_PLAUSIBLE_DOMAIN=lumeralabel.com`** (or a PostHog key) on the storefront env at deploy.
Zero code. The rest of this file is thresholds, not tasks.
