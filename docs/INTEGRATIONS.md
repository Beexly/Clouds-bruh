# LUMERA — INTEGRATIONS (v0.2, additive)
> 13 repos folded into the v1 architecture. **Nothing removed. Everything upgraded.**
> Read alongside `ARCHITECTURE.md` (the v1 source of truth).

## What changed in the scaffold (all additive)
- **tools/apify.ts** + **mcp.config.ts** — Apify MCP (thousands of scrapers) granted to Curator/Sourcer/Herald.
- **tools/db-gpt.ts** — `nl_analytics` (DB-GPT text-to-SQL, READ-ONLY) for plain-English BI.
- **tools/voc.ts** — `voc_reviews` (sentiment + pain-points + copy fixes) for INTROSPECTION/Curator/Shepherd.
- **recommendation/strategies/graph-rec.ts** + new `graph_rec` strategy — RecoGCN graph recommendations.
- **agents/analyst.ts** — NEW 10th agent: business intelligence over the commerce DB.
- **orchestrator/flow.ts** — composable multi-agent primitives (sequence/parallel/oneOf/evaluator/forEach).
- **agents/SKILLS.md** — each agent equipped with proven, named e-commerce skills.
- **INTROSPECTION** — added a Voice-of-Customer pain-point check.

## Repo → where it upgrades Lumera
| Repo | Subsystem upgraded | How it improves quality |
|---|---|---|
| **apify/apify-mcp-server** | Data Radar (Curator/Sourcer/Herald) | Thousands of ready scrapers (Amazon, Shein, TikTok, maps, social) as MCP tools via `mcp.apify.com` (OAuth/URL). Replaces single-source scraping with a marketplace. Connect it in Claude Code directly. |
| **fenglixu/RecoGCN** | ORACLE | Graph-neural-net recs (relational GCN + meta-paths) over a user–item–context graph. Beats cosine for sequential intent + "complete the set". Tracks MRR/NDCG/HR@k. |
| **eosphoros-ai/DB-GPT** | Data/Intelligence (Analyst, Treasurer, OracleKeeper) | Agentic NL analytics / text-to-SQL over the commerce DB. Ask the business questions in English; get answers + charts. READ-ONLY guardrail. |
| **mguozhen/voc-amazon-reviews** | INTROSPECTION + Curator + Shepherd | Agent-native Voice-of-Customer: sentiment, ranked pain points, copy-ready listing improvements from ASIN/CSV/own reviews. |
| **nexscope-ai/eCommerce-Skills** | CONGREGATION (canonical skill library) | 142 seller skills (Amazon/Shopify/eBay/Etsy/TikTok/Walmart) — dropshipping research, competitor price tracking, dynamic pricing, feedback analysis, brand protection. Mapped per agent in `agents/SKILLS.md`. |
| **MoonWeaponsmith/r19-iannuttall-claude-agents-ecommerce** | CONGREGATION | iannuttall's e-commerce skill suite (product-launch, cro-audit, cart-abandonment, review-response, customer-segment, bundle-suggest…). Proven Claude-agent patterns. |
| **BanSailmakerDitch/r16-voltagent-awesome-agent-skills-ecommerce** | CONGREGATION | Same suite from the VoltAgent 1000+ skill ecosystem — second vetted source. |
| **upsidelab/enthusiast** | Agent platform / Shepherd | Production-ready agentic e-commerce framework — reference architecture for the agent runtime + RAG-backed conversational commerce. |
| **CatchTheTornado/open-agents-builder** | ORCHESTRATOR | Composable multi-agent flow primitives (oneOf/parallel/sequence/evaluator/forEach) — adopted in `orchestrator/flow.ts`. Also batteries-included OMS/PIM/CPQ reference; flows publishable as API. |
| **opactorai/Claudable** | Build / Deploy | CLI-agent harness that builds + deploys instantly — turn this scaffold into a live, deployed app from the terminal. |
| **figma/community-resources** | Broadcast UI / Design | Figma agent_skills + plugins + widgets for design-to-code (pair with your Figma MCP) to build the Broadcast UI to-spec. |
| **Rishabhmannu/amazon-greencart-hackathon** | Reference | Grocery/multi-category storefront + cart UX patterns — situational reference for catalog breadth. |
| **Yogapriya2512/A-Simple-Chatbot-** | Reference | Minimal chatbot baseline — superseded by Shepherd + enthusiast; keep only as a teaching baseline. |

## Connect-now (no build required)
1. **Apify MCP** — add `https://mcp.apify.com` as a connector in Claude Code (OAuth). Curator/Sourcer get scrapers instantly.
2. **Skill suites** — install nexscope / iannuttall / voltagent skills as Claude Code skills; assign per `agents/SKILLS.md`.
3. **DB-GPT** — stand up a DB-GPT instance pointed READ-ONLY at the commerce DB; wire `nl_analytics` to it.

## Quality bar unchanged
Still Galaxy Sports Network. These integrations make it more intelligent, more automated, and more honest — never simpler.
