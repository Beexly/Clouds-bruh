# Eclipse R&D — Imagery Quality & Content/Marketing Automation

File: `/home/user/eclipse-research/findings/03-imagery-content.md`
Lens: dependency-free Node ESM core, human-approval-gated; heavy/paid work (image gen, image enhancement, video, TTS) is done by **adapters that emit request artifacts**, fulfilled by a Claude agent via **MCP at runtime** — never auto-spend.
Mandate: superior **image quality**, "getting people to **FEEL before they buy**", and autonomous **content/marketing** that builds brand personality.

> Evidence note: Eclipse internals below were read directly from the repo. For the external sources, file/directory structure and READMEs were inventoried directly; where a source's deep internals could not be re-opened in this session, claims are kept at the level the structure supports and the exact paths are cited so a follow-up can confirm. Items I could not verify line-by-line are marked **[structure-level]**.

---

## 0. Executive summary

Eclipse already requests brand-consistent imagery and gates it. `src/imagery/prompts.mjs` builds per-role gothic-luxe generation prompts; `src/adapters/imagegen.live.mjs` returns those as **request descriptors** (the Node runtime can't call MCP, so it hands prompts off for an agent to fulfill); every media ref is born `approved:false` (`src/adapters/imagegen.mock.mjs`). Media only counts toward launch when `mediaOk` passes (`mediaScore >= MEDIA_MIN`, `src/scoring/launch-gate.mjs` → `src/scoring/media-score.mjs`) and a human approves (`humanApproved` gate; `HUMAN_ONLY_TARGETS` in `src/queue/transitions.mjs`). What's missing: (1) a real **quality bar** for shots, (2) a **required shot list** that makes products *felt*, (3) an autonomous **content agent** for video/social personality. This file specs all three within Eclipse's constraints.

The three image sources converge on one canonical "finishing" chain. The **HDR+ ISP** repo (`4a2547ff-.../ISP-pipeline-hdrplus-main`, C++) exposes it as discrete stages in `Layer/HDRPlus_*.cpp` — verified files: black/white level, white balance, defective-pixel correction, demosaic, block-match fusion, chroma denoise, color correction, tonemapping, sharpen, contrast, gamma, normalize. **LuminanceHDR** (`c25a7c9e-.../src/TonemappingOperators/`) is a catalog of tone-mapping operators (the *aesthetic* dial: local-contrast "punch" vs. natural vs. filmic). **HDRNet** (`08db1fe7-.../hdrnet-master`, TensorFlow + a JAX `bilateral_slice`) is the modern shortcut: a *learned* local affine transform applied in a bilateral grid that reproduces that whole chain in one pass — i.e., the "auto-enhance" an MCP would run. Eclipse's dep-free Node core can't run any of these (C++/TF/JAX), so we encode their **intent** as (a) a **quality scorecard the imagery agent enforces** and (b) an **enhancement adapter/MCP seam** for the actual pixels.

The two content sources (`ce30c07f-MoneyPrinter`, `df0d384d-geminiyoutube`) give the same reusable pipeline: **topic/plan → script (brand style injected into the prompt) → voiceover (TTS) → per-scene visuals (stock or slide or generated) → timed captions → assembly (target aspect incl. 9:16, transitions, background music) → metadata/thumbnail → upload**. Both inject brand voice into the generation prompt and read API keys from env at runtime; gemini even persists an episodic `content_plan.json`. The one anti-pattern to avoid: gemini's uploader defaults to **public** auto-publish — Eclipse must keep upload gated and unpublished-by-default. We mirror the good parts as an **Eclipse content agent** that emits a **content candidate** (script + storyboard + media/voice request artifacts) into the **same human-approval queue** as products, brand-safe and profanity-free, never rendering or publishing on its own.

`eva` (`cefd835f-evamaster`) turned out to be the **Eva Design System by Akveo** — a customizable UI **design-system / component library** (Sketch + web/mobile UI kits, light/dark themes, Eva Icons), NOT an ML/imagery tool. Relevant takeaway is therefore *design-system thinking*: a single themeable token set (dark mode included) that keeps a brand visually consistent — which reinforces §4's "encode the visual signature once" approach and Eclipse's existing `public/styles/tokens.css` mirror of `src/brand.mjs`. It contributes nothing to image enhancement or emotion sensing.

---

## 1. Image enhancement — sources → Eclipse spec

### 1.1 What each source is (verified paths)

| Source | Verified location | Nature | What we take |
|---|---|---|---|
| HDR+ ISP | `4a2547ff-ISPpipelinehdrplusmain/ISP-pipeline-hdrplus-main/` (C++; `Layer/`, `Mat/`, `.sln`) | Re-implementation of Google HDR+ finishing as discrete C++ stages | The **ordered stage list** (the scorecard mirrors it) |
| LuminanceHDR | `c25a7c9e-LuminanceHDRmaster/LuminanceHDR-master/src/TonemappingOperators/` | Catalog of tone-mapping operators (TMOs) | The **aesthetic vocabulary** (which "look" each gives) |
| HDRNet | `08db1fe7-hdrnetmaster/hdrnet-master/` (`hdrnet/models.py`, `hdrnet/layers.py`, `hdrnet/hdrnet_ops.py`, `jax/bilateral_slice.py`) | SIGGRAPH'17 learned local-affine enhancement in bilateral space | The **one-pass "auto-enhance"** model = the enhancement MCP we'd call |
| eva | `cefd835f-evamaster/eva-master/` (`README.md`, `package.json`) | **Eva Design System** (Akveo) — themeable UI component library / design tokens, light+dark | Design-system discipline only (single themeable token set); **not** imagery/ML |

### 1.2 The canonical finishing chain (HDR+ ISP — verified `Layer/HDRPlus_*.cpp`)

The repo names each stage as its own file under `.../ISP-pipeline-hdrplus-main/Layer/`. In processing order (consolidating the verified filenames):

1. `HDRPlus_BlackWhiteLevel` — black-level subtract / white-level normalize (true black floor).
2. `HDRPlus_DPCorrection` — defective/hot-pixel correction (clean sensor artifacts).
3. `HDRPlus_BlockMatchFusion` — align + merge frames (HDR+ burst denoise; dynamic range without a single long exposure).
4. `HDRPlus_WhiteBalance` — neutral whites/greys → **color accuracy** (fewer "wrong color" returns).
5. `HDRPlus_Demosaicing` — reconstruct full RGB.
6. `HDRPlus_ChromaDenoise` — remove **color** noise while preserving luminance/texture.
7. `HDRPlus_ColorCorect` (color-correction matrix) — gallery-true color.
8. `HDRPlus_Tonemapping` — **dynamic-range compression / local contrast: opens shadows, holds highlights. The premium-look stage.**
9. `HDRPlus_Sharpen` — edge/detail enhancement (texture legibility).
10. `HDRPlus_Contrast` — macro/micro contrast "snap".
11. `HDRPlus_GammaCorrect` / `HDRPlus_Normalize` — output encoding / range.
(`HDRPlus_Forward` orchestrates the chain.)

HDRNet's lesson (`hdrnet/models.py` + `jax/bilateral_slice.py`): predict a **per-pixel local affine color transform** in a low-res **bilateral grid** and slice/apply it at full res — one learned pass reproduces stages 8–10 (tone/contrast/color). This is exactly what a modern "auto-enhance"/"generate-at-quality" API does, and what we put behind an MCP.

### 1.3 Tone-mapping operator vocabulary (LuminanceHDR) — the "look" dial

Operators present under `src/TonemappingOperators/` (full list: ashikhmin02, drago03, durand02, fattal02, ferradans11, ferwerda96, kimkautz08, lischinski06, mai11, mantiuk06, mantiuk08, pattanaik00, reinhard02, reinhard05, vanhateren06). Each TMO compresses HDR→display differently, giving a distinct aesthetic. Characterizations below: titles in the `@brief` headers were read directly for fattal02/drago03/durand02 (✓ verified); mantiuk06 is the `contrast_domain.cpp` implementation; reinhard02 is the well-known photographic operator.

| Operator | Verified `@brief` / identity | Aesthetic character | Eclipse use |
|---|---|---|---|
| mantiuk06 | `contrast_domain.cpp` (contrast-domain, pyramid) | Preserves **local contrast**, multi-resolution | Product/detail hero — texture pops |
| fattal02 | ✓ "Gradient Domain HDR Compression" (Fattal/Lischinski/Werman) | Attenuates large gradients, keeps fine detail — **punchy** | High-drama hero |
| drago03 | ✓ "Adaptive Logarithmic Mapping for High Contrast Scenes" | **Natural, global** look | Lifestyle/in-context (believable) |
| reinhard02 | Photographic tone reproduction | **Filmic, flattering midtones** (dodge & burn) | On-model / soft goods |
| durand02 | ✓ "Fast Bilateral Filtering for HDR" (Durand & Dorsey) | **Edge-aware** base/detail split, great for texture | Macro craft close-ups |
| ashikhmin02 / pattanaik00 / ferwerda96 | Perceptual / human-vision adaptation | Reference only | — |

**Eclipse "house grade"** (the look the scorecard rewards): deep true blacks, open-but-controlled shadow detail (local tone map, Mantiuk/Durand character), **restrained** saturation, preserved warm metallic accent near the brand gold `corona #E9C46A`, crisp **un-noisy** edges. This is the gothic-luxe signature expressed as operations, aligned to `src/brand.mjs` palette (`void #0A0A0D`, `ink #F4F4F6`).

### 1.4 The Eclipse image-quality pipeline — split into (a) scorecard, (b) enhancement seam

Eclipse's dep-free Node core **cannot** run these pixel ops. So:

**(a) Quality SCORING the imagery agent enforces** — pure-Node, deterministic. The agent scores image **metadata** (and any measurements an MCP returns) against the bar. New module proposed: `src/scoring/image-quality.mjs`, shaped like the existing `src/scoring/media-score.mjs` (which today already returns a weighted 0–1 and a `MEDIA_MIN` threshold) — so it slots straight into the `mediaOk` gate.

**(b) Where real enhancement lives** — a new **enhancement adapter** `src/adapters/imageenhance.{mock,live}.mjs`, following the exact pattern of `imagegen.live.mjs`: build an **MCP request artifact** describing the target look (true black point, local-contrast strength, sharpen amount/threshold, saturation ceiling, white-balance tolerance — the HDRNet "auto-enhance" knobs). A Claude agent fulfills it via an image-enhancement / image-gen MCP, then records the result + measured scores back through the event log; output media stays `approved:false`. **No auto-spend**: the request is built in core; fulfillment + cost is a runtime MCP step (same shape as Stripe/GitHub/imagery in CLAUDE.md's integration pattern).

### 1.5 IMAGE QUALITY SCORECARD (the criteria)

Two layers. **Hard gate = pass/fail** (blocks approval). **Soft score = weighted 0–100** readiness signal for `/ops/`. Each item is computable from EXIF/metadata or from measurements an enhancement/QA MCP returns.

**HARD media-quality gate (all must pass):**
- `min_resolution` — longest side ≥ 2000 px (luxury target 3000+) → enables zoom.
- `aspect_valid` — matches the slot (PDP grid 1:1 or 4:5; hero/editorial as specified; social 9:16).
- `not_clipped` — highlight/shadow clipping under threshold (no blown metal, no crushed black where detail should live).
- `color_profile_ok` — sRGB embedded/tagged; white balance neutral within tolerance → color-accurate.
- `sharp_enough` — focus/sharpness metric above floor (no soft hero).
- `noise_ok` — luma/chroma noise below ceiling (clean shadows).
- `brand_safe` — no banned content; profanity-free filename/alt; matte/dark backdrop where required.
- `human_approved` — already enforced: a media ref is `approved:true` only via human action.

**SOFT quality score (0–100, proposed weights):**

| Criterion | Weight | "Good" = (source) |
|---|---|---|
| Tonal range / local contrast | 20 | Deep blacks + held highlights + open shadows (HDR+ `Tonemapping`; Mantiuk/Durand) |
| Sharpness / micro-detail | 15 | Crisp edges, legible texture, no halos (HDR+ `Sharpen`; Fattal) |
| Color accuracy & restraint | 15 | Neutral WB, controlled saturation, metallic gold preserved (HDR+ `WhiteBalance`/`ColorCorect`) |
| Noise cleanliness | 10 | Clean shadows; texture survives denoise (HDR+ `ChromaDenoise`) |
| Resolution headroom | 10 | Comfortably above zoom minimum |
| Composition / framing | 10 | Consistent framing, generous negative space, subject placed per slot |
| Background discipline | 10 | Pure backdrop for PDP grid; intentional for editorial |
| Brand-look adherence | 10 | Matches house grade (dark, restrained — `src/brand.mjs`) |

`score = round(Σ normalized_signal × weight)`. Report per-image score + gate result to the ops console.

---

## 2. "FEEL before you buy" — required shot list + media gate

### 2.1 Why (web research — directional; see note)

> Web search was not reachable in this session; the figures below are well-established luxury-commerce guidance to be re-confirmed with live sources, not novel claims.
- Product imagery is the dominant on-page purchase driver; absence of **zoom** raises bounce.
- More images per product correlates with higher conversion; common guidance: **5–8 minimum, luxury 8–12**.
- **Video** and **360 spin** lift conversion (vendor figures vary — treat as directional).
- High-quality, **accurate, consistent** imagery **reduces returns** (sets true expectations).
- Online retail must **compensate for missing senses**: macro (texture you can almost feel), motion (drape/sparkle/weight), scale/in-hand, lifestyle so the shopper **imagines ownership**.

### 2.2 Eclipse REQUIRED SHOT LIST (per product)

Tiered so the gate can require a minimum and reward completeness. (Today `prompts.mjs`/`imagegen` cover roles `hero/angle/detail`; this expands that set.)

**Tier 1 — REQUIRED to launch (the gate's `min_shot_set`):**
1. **Hero** (three-quarter) — dramatic, on-brand signature (existing `hero`).
2. **Front** — straight-on catalog angle.
3. **Back** — completeness/trust.
4. **Detail / macro** — craft close-up (stitching, hardware, material, engraving) → makes quality *felt*, justifies price (Durand texture look).
5. **Scale / in-hand or on-model** — true size; lets the shopper self-project.

**Tier 2 — STRONGLY recommended (raise readiness; deepen "feel"):**
6. **Side profile.**
7. **Lifestyle / in-context** — product in an aspirational Eclipse "world" (Drago natural look) → emotional ownership.
8. **Alternate detail** (second material/area).

**Tier 3 — Premium "feel" media (motion & dimensionality):**
9. **360 spin** (frame sequence) — dimensionality, no studio rig.
10. **Product film** (8–20s, 9:16) — motion: drape, sparkle, weight (see §3).
11. **AR / true-scale hint** — even a "shown at actual size / dimensions" affordance helps scale (full AR is a later adapter).

Each shot is emitted as a **media request artifact** (extend `imageRequestsFor` in `src/imagery/prompts.mjs`, which the live imagegen adapter already turns into descriptors) with `role/kind`, `angle`, `aspect`, brand-grade `prompt`, `approved:false`. Tier-3 motion items are produced by the content pipeline / image MCP, not the dep-free core.

### 2.3 MEDIA-QUALITY GATE (wire into the launch gate)

Today `mediaOk` passes when `mediaScore(media) >= MEDIA_MIN` (`src/scoring/launch-gate.mjs` + `src/scoring/media-score.mjs`). Tighten media-score (or add `src/scoring/media-gate.mjs`) to require:

- `has_min_shot_set` — all Tier-1 roles present **and** `approved:true` (hero, front, back, detail, scale).
- `each_passes_quality_gate` — every required image passes the §1.5 hard gate.
- `aspect_coverage` — at least one zoomable PDP-aspect image **and** the hero aspect present.
- `human_approved` — unchanged (human-only; `src/queue/transitions.mjs` `HUMAN_ONLY_TARGETS`).
- (soft) `feel_score` — Tier-2/3 completeness + per-image quality → readiness boost in `/ops/`, not a blocker.

Invariant preserved: agents only **propose** media requests; humans approve; only `published + visible + in-stock` is public (storefront projection). The imagery agent's governance already forbids `use_unapproved_media_on_storefront` (`src/agents/registry.mjs`).

---

## 3. Content/marketing automation — the Eclipse content agent

### 3.1 The shared pipeline (MoneyPrinter + gemini-youtube)

Both repos implement the **same stage shape**, verified from source. Function names below are the real ones.

**MoneyPrinter** (`ce30c07f-.../MoneyPrinter-main/Backend/`, Python, Ollama-first/local LLM; DB-queue + worker):
- `gpt.py: generate_script(...)` (a `customPrompt` can override the built-in prompt — i.e., a brand voice hook), `get_search_terms(...)` → **JSON stock-search terms** (with `json.loads` + regex fallback), `generate_metadata(...)` → title + description.
- `video.py: save_video(url)` (fetch stock), `generate_subtitles(audio)` → **SRT** (AssemblyAI or local Whisper; `equalize_subtitles` caps chars/line for readability), `combine_videos(...)` (concatenate + **crop each clip to the target frame**), `generate_video(..., subtitles_position, text_color)` (burn captions).
- `main.py`/`pipeline.py`/`worker.py`: orchestrate topic → script → search terms → footage → TTS → subtitles → video.

**gemini-youtube** (`df0d384d-.../gemini-youtube-automation-main/`, Python; **GitHub Actions cron daily 07:00 UTC**):
- `src/generator.py: generate_curriculum()` → a **persisted 20-lesson plan** (`content_plan.json`, statuses pending→complete with `youtube_id`) and `generate_lesson_content(title)` → JSON `{long_form_slides[7-8], short_form_highlight, hashtags}`. **The brand/style is injected into the prompt** ("The style must be: assume the viewer is a beginner…"). `text_to_speech(text)` = **gTTS**; `get_pexels_image(query)` = **Pexels stock** (not generative); `generate_visuals(...)` builds **PPT-style slides** (blurred + darkened bg, wrapped title in a header band, body text, footer brand line + slide counter — i.e., consistent on-brand framing); `create_video(slides, audio)` = per-slide image clips with **fadein/fadeout 0.5s**, **looped background music at low volume (0.05) under narration**, `fps 24`. Both long (1920×1080) and short (1080×1920 = 9:16) are produced from the same content.
- `src/uploader.py: upload_to_youtube(video, title, description, tags, thumbnail)` via the YouTube Data API; sets a thumbnail; OAuth creds from files/refresh-token. **Correction to my earlier read:** this repo's `privacyStatus` defaults to **`'public'`** (the code comment lists `'private'`/`'unlisted'` as alternatives). So out-of-the-box it auto-publishes — which is exactly the behavior Eclipse must **not** copy. For Eclipse, publishing stays a deliberate, gated, human step (default to unpublished).

Canonical pipeline (union of the two): **topic/plan → script (brand style injected) → TTS voiceover → per-scene visuals (stock or slide or generated) → timed captions → assembly (target aspect incl. 9:16, slow motion on stills, transitions, bg music) → metadata/thumbnail → upload.**

Patterns to copy (verified): **(1) inject brand voice into the generation prompt** (MoneyPrinter `customPrompt`; gemini's hardcoded style string) so tone is consistent across episodes; **(2) persist a content plan with per-item status** (gemini `content_plan.json`) for episodic series; **(3) API keys from `os.environ`/`os.getenv` at call time** (gemini `GOOGLE_API_KEY`/`PEXELS_API_KEY`) — matches Eclipse's no-secrets rule. Pattern to **reject**: gemini's default-public auto-upload — Eclipse keeps upload gated and unpublished-by-default.

### 3.2 Eclipse content agent — design

A new role `content` (mirror the shape of existing agents in `src/agents/`, dispatched via the `RUNNERS` map in `src/agents/runtime.mjs`, and described in `src/agents/registry.mjs` with `autonomous:['draft_script','request_media','propose_content']`, `gated:['approve_content','publish_content']`, `forbidden:['publish_without_gate','auto_spend_on_render']`). It **proposes content candidates** into the **same human-approval queue**; it never renders or publishes.

**Content types:** product film (motion of an approved hero), lookbook (multi-product editorial), brand-personality social short (founder POV / behind-the-craft / "the world of Eclipse"), PDP 360/loop.

**Output = a content candidate** (a queue candidate variant; append-only NDJSON like products): `{ id, type, productId?, script(beats), shotPlan(media requests), voicePlan(TTS request), assemblyPlan(aspect 9:16 + 1:1, slowZoom, transitions, subtitleStyle), metadata(title/desc/tags), gate:{passed:false}, status:'proposed' }`. All media/voice are **request artifacts** (`approved:false`); heavy/paid rendering is an MCP step at fulfillment, not in core.

**Brand-safety, built in (dep-free, deterministic):**
- Script generated against a brand `styleGuide` derived from `src/brand.mjs` voice (`traits:[confident,exclusive,specific,unhurried,dark-luxe]`; rules: no profanity, no fabricated scarcity, no fake reviews, no padded MSRPs).
- Profanity/claims filter (deterministic) rejecting fake scarcity/reviews, padded MSRP, unverifiable claims (CLAUDE.md working agreement).
- Prefer **already-approved** product media as source (slow-zoom a human-approved still → motion) to minimize new spend.

### 3.3 CONTENT AGENT PIPELINE STAGES (the stages)

1. **Brief** — pick subject (product/theme) + content type; load `styleGuide` from `src/brand.mjs`.
2. **Script** — structured storyboard (hook / beats / restrained CTA) with persona + tone injected; run the profanity/claims filter.
3. **Shot/visual plan** — per-scene visual requests; **prefer approved product media**, else emit image-gen request artifacts (`src/adapters/imagegen.live.mjs` shape) at the §1.5 quality bar.
4. **Voice plan** — optional brand-voice **TTS** request artifact; music/sonic-signature note.
5. **Assembly plan** — *spec, not render*: aspect **9:16** (+1:1), **slow zoom** for stills, **crossfade** transitions, **timed subtitles** (sound-off legibility), brand lower-thirds/typography.
6. **Metadata** — on-brand, profanity-free title/description/tags/chapters.
7. **Propose → queue (proposed/in_review)** — emit the content candidate; `gate.passed=false`. **Agent stops here.**
8. **(Human) Approve** — operator reviews script + storyboard + (later) rendered preview via `npm run review`; only a human crosses into `approved` (`src/queue/transitions.mjs`).
9. **(MCP, post-approval) Render** — a Claude agent fulfills the image/TTS/video MCP requests, records assets back via the event log; assets remain gated.
10. **(Human) Publish** — publishing/scheduling is a deliberate separate operator action; **default unpublished** (do NOT copy gemini's default-public uploader); never automated, never auto-spend.

This reuses Eclipse's end-to-end integration shape — **export request artifact → Claude agent fulfills via MCP → record result back** — with the prime directive intact (agents propose; humans approve and publish).

---

## 4. Brand personality through media (people buy from brands they like)

Goal: a **consistent voice + visual signature** so every asset is recognizably Eclipse. Encode once, enforce everywhere — the same philosophy as `src/brand.mjs` being the single rebrand point.

### 4.1 Encode the voice (single source of truth)
Extend `src/brand.mjs` with a `styleGuide` block (the `persona / tone / banned_words / visual_signature` pattern), Eclipse-flavored:
- **persona**: dark-luxury house — confident, exclusive, specific, unhurried; profanity-free; quiet confidence over hype.
- **tone rules**: straight from `brand.voice.rules` (no profanity; specificity is the proof; no fabricated scarcity / fake reviews / padded MSRPs; "speak to those who already know").
- **lexicon**: tagline **"Step into the dark."**; approved phrasings; banned-words list.
Every copy/content/metadata generator reads this — voice can't drift.

### 4.2 Encode the visual signature
A documented, enforceable look both agents target:
- **Palette** (`src/brand.mjs`): `void #0A0A0D`, `surface #14141A`, `ink #F4F4F6`, accent `corona #E9C46A` (gold), `plasma #6C4BF4`, `oxblood #7A1E2B`.
- **House grade** (§1.3): deep true blacks, controlled shadow detail, restrained saturation, preserved metallic gold, crisp un-noisy edges.
- **Composition**: generous negative space, deliberate subject placement, matte/dark backdrops for hero; consistent framing per slot.
- **Motion signature**: slow, deliberate **zoom (Ken Burns)**, **crossfade** transitions, restrained pacing (no frenetic cuts) — gothic-luxe calm.
- **Typography**: the brand `type` system (`Cormorant Garamond` display); subtitles always present and legible sound-off.
- **Sonic identity**: a consistent, restrained music palette noted in the voice/assembly plan.

### 4.3 Consistency & familiarity (parasocial trust)
- **Series/episodic formats** (lookbook, behind-the-craft, founder POV) build familiarity — people buy from brands they feel they know. Carry a `series` tag + recurring opener/closer.
- **Consistency > budget**: a recurring visual/sonic signature and steady cadence build personality more than per-asset spend.
- **Hook discipline**: the first 1–3 seconds carry the strongest on-brand visual (short-form retention); restrained CTA at the end.
- **Native, elevated authenticity**: platform-native pacing beats repurposed TV ads, even for luxury.

### 4.4 Note on `eva` (correction)
`eva` (`cefd835f-evamaster/eva-master`) is the **Eva Design System by Akveo** — a themeable UI **component library / design-token system** (Sketch + web/mobile kits, light+dark themes, Eva Icons), confirmed from its `README.md`/`package.json`. It is **not** an emotion-sensing or imagery/ML tool, so it does not provide a "measure the FEEL" capability. Its only transferable lesson is **design-system discipline**: one themeable token set (with a first-class dark mode) keeps a brand visually consistent across surfaces — reinforcing §4.2 ("encode the visual signature once") and Eclipse's existing `src/brand.mjs` → `public/styles/tokens.css` single-source pattern. To actually *measure* emotional response to creative, Eclipse would need a separate, explicitly opt-in/consented A/B mechanism — out of scope here and not satisfiable by this source.

---

## 5. Concrete change map (where this lands)

- `src/imagery/prompts.mjs` — expand `imageRequestsFor` from `hero/angle/detail` to the full Tier-1/2/3 **shot list** (§2.2), each a brand-graded request artifact.
- `src/scoring/image-quality.mjs` (new) — per-image **scorecard** (§1.5), shaped like `src/scoring/media-score.mjs`.
- `src/scoring/media-score.mjs` (tighten) or `src/scoring/media-gate.mjs` (new) → the **media gate** (§2.3), consumed by `mediaOk` in `src/scoring/launch-gate.mjs`.
- `src/adapters/imageenhance.{mock,live}.mjs` (new) — `buildEnhanceRequest` → enhancement/auto-enhance **MCP** seam (§1.4), HDRNet-style one-pass; register in `src/adapters/index.mjs` (`load('imageenhance')`).
- `src/agents/<content-agent>.mjs` (new) + add to `RUNNERS` in `src/agents/runtime.mjs` and to `src/agents/registry.mjs` — the **content agent** (§3.2–3.3).
- `src/brand.mjs` (extend) — `styleGuide {persona, tone, banned_words, visual_signature}` (§4.1–4.2), the single voice/visual source.
- Reuse existing seams: `src/adapters/imagegen.live.mjs` (request artifacts), event log (record results back), `src/queue/transitions.mjs` (human-only approval/publish). No new dependencies; no auto-spend.

### Source citations (for traceability)
- HDR+ ISP stages (C++): `4a2547ff-ISPpipelinehdrplusmain/ISP-pipeline-hdrplus-main/Layer/HDRPlus_{BlackWhiteLevel,DPCorrection,BlockMatchFusion,WhiteBalance,Demosaicing,ChromaDenoise,ColorCorect,Tonemapping,Sharpen,Contrast,GammaCorrect,Normalize,Forward}.cpp` (+ `.h`); README at `.../ISP-pipeline-hdrplus-main/README.md`.
- TMO aesthetics: `c25a7c9e-LuminanceHDRmaster/LuminanceHDR-master/src/TonemappingOperators/` (Mantiuk/Fattal/Drago/Reinhard/Durand/Ashikhmin families).
- Learned enhancement: `08db1fe7-hdrnetmaster/hdrnet-master/hdrnet/{models,layers,hdrnet_ops}.py`, `jax/bilateral_slice.py`, `README.md`.
- `cefd835f-evamaster/eva-master/{README.md,package.json}` — **Eva Design System (Akveo)**, a UI component/design-token library (not imagery/ML); design-system discipline only.
- Content pipeline: `ce30c07f-MoneyPrintermain/` (Python backend + README), `df0d384d-geminiyoutubeautomationmain/` (Python modules + README).
- Eclipse internals (verified): `src/imagery/prompts.mjs`, `src/imagery/plan.mjs`, `src/adapters/{imagegen.live,imagegen.mock,index}.mjs`, `src/scoring/{launch-gate,media-score}.mjs`, `src/queue/transitions.mjs`, `src/agents/{registry,runtime}.mjs`, `src/brand.mjs`.
- Web (directional, re-confirm with live sources): luxury PDP standards (8–12 images, 2000px+/zoom, macro, scale, lifestyle, consistency), conversion (imagery is the dominant driver; video/360 lift; quality reduces returns), short-form brand building (hook in 1–3s, 9:16, captions, recurring signature, episodic, cadence > budget), sensory/emotional commerce (compensate missing senses; imagine-ownership framing).
