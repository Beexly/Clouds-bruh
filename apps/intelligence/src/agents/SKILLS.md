# Agent Skill Library — what each agent loads

UPGRADE: instead of only hand-written prompts, each agent is equipped with proven, named
e-commerce skills from three vetted sources. Install these as Claude Code skills and assign:

Sources:
- **Nexscope eCommerce-Skills** — 142 seller skills (Amazon/Shopify/eBay/Etsy/TikTok/Walmart)
- **iannuttall claude-agents (e-commerce suite)** — 10 commands / 5 workflows
- **VoltAgent awesome-agent-skills (e-commerce)** — same suite, 1000+ skill ecosystem

| Agent | Skills to load (from the suites above) |
|---|---|
| **Curator** | dropshipping-product-research, product-copy, bundle-suggest, marketplace-expand, seasonal-campaign |
| **Sourcer** | competitor-price-tracker, competitor-price-analysis, competitive-pricing-strategy, inventory-forecast |
| **OracleKeeper** | conversion-rate-optimization, cro-audit, conversion-sprint, dynamic-pricing-ecommerce, price-strategy |
| **Herald** | product-launch, seasonal-campaign, affiliate-marketing-strategy, cart-abandonment |
| **Scribe** | product-copy, cro-audit (on-page), + claude-seo (already wired) |
| **Artisan** | product-copy (visual brief), + gpt-image2 templates (already wired) |
| **Shepherd** | review-response, returns-analysis, customer-feedback-analysis |
| **Quartermaster** | inventory-forecast, returns-analysis, marketplace-audit, cross-border-ecommerce |
| **Treasurer** | (DB-GPT nl_analytics) + margin/price skills as references |
| **Analyst** | customer-feedback-analysis, customer-segment, brand-monitoring, brand-protection |
| **Loyalist** | cart-abandonment, customer-segment, win-back, customer-feedback-analysis |
| **Rainmaker** | bundle-suggest, marketplace-expand, affiliate-marketing-strategy, price-strategy |
| **Forecaster** | inventory-forecast, demand-forecast, nl-analytics |
| **Refiner** | conversion-rate-optimization, cro-audit, product-copy, dynamic-pricing-ecommerce |

Reference platforms (architecture, not skills):
- **upsidelab/enthusiast** — production agentic e-commerce framework (RAG + conversational commerce → Shepherd)
- **Open Agents Builder** — composable flow primitives (see orchestrator/flow.ts) + batteries-included OMS/PIM/CPQ
