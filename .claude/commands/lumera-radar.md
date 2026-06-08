Discover trending product candidates from marketplace radar (AliExpress / Alibaba / Shein) via managed scraping.

Steps:
1. Confirm radar credentials are set: `OXYLABS_USER`/`OXYLABS_PASS` or `APIFY_TOKEN` (and an Apify Actor for the source).
2. Preview discovery without writing to the board: `pnpm radar -- "oversized hoodie" --source aliexpress --limit 8`.
3. To populate the curation board with live finds, run `pnpm curate -- --force` (it seeds fixtures, then layers radar discovery when creds are present).
4. Open `/cockpit` and review the discovered candidates' score, margin, supplier, compliance blockers, and reasons.

Expected output:
- `configured=true/false` line.
- Per-candidate status, score/100, gross margin %, cost/retail, lead time, blockers.
- A count of discovered + scored candidates.

Honest defaults (do not bypass):
- Radar candidates are DISCOVERY only. A scraped listing is not directly orderable and its media is not licensed — every candidate is flagged to assign a fulfilment route (CJ / manual) and re-shoot media before publish.
- Discovery never auto-publishes. Garrett approves from the board.

Do not proceed if:
- No radar credentials are configured and the task is a live launch (preview will be empty by design).
- Candidates are still fixture-only and the task requires real sourcing.

Recovery:
- Set the missing creds, or configure `APIFY_ALIEXPRESS_ACTOR` for the source.
- Re-run `pnpm radar` to confirm `configured=true` and non-empty results.
