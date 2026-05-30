# 04 — Design Systems: Cross-Brand Mining → Eclipse Luxury-Flagship Upgrade

Research brief: mine the `awesome-design-md` corpus (~80 brand design-system docs) for reusable
principles, synthesize into an Eclipse (dark luxury × punk/gothic, profanity-free) design upgrade.

**Primary source:** `/home/user/eclipse-research/sources/478f4838-awesomedesignmdmain/awesome-design-md-main/design-md/`
Each brand folder holds a stub `README.md` (redirect to getdesign.md) and the real content in `DESIGN.md`.

**Brands fully analyzed (deep read of DESIGN.md):** Ferrari, Apple, Lamborghini, Bugatti, Stripe,
Linear, Nike, Tesla, BMW-M, PlayStation, Framer, Superhuman, Vercel, Raycast, Spotify, Revolut,
Coinbase, Sanity, Resend, Figma, Mintlify (21 brands). Highest-signal for Eclipse: the four
luxury/auto houses + Tesla/BMW-M (dark + materiality + restraint DNA), the dark-luxe product-craft
references (Linear, Raycast, Sanity, Resend, Framer, Vercel — near-black canvases, single accent,
surface-ladder elevation), Apple/Nike (photography-first commerce + microinteractions), and
PlayStation/Revolut/Coinbase/Spotify (dark-commerce chrome, pill + mono-numeric patterns). The
remaining ~60 brands in the corpus are lower-relevance (light-mode SaaS/docs) and were sampled, not
deep-read; nothing in them contradicts the principles below.

---

## Part 1 — Per-Brand Principle Table

| Brand | Typography | Color & Contrast | Spacing / Grid | Motion | Imagery / Art-direction | Voice / Signature interaction |
|---|---|---|---|---|---|---|
| **Ferrari** | Single sans (FerrariSans), display weight **500 — never bold**; emphasis from negative tracking (-0.36 to -1.6px) + uppercase CTAs at 1.4px tracking. | Near-black canvas **#181818 (never pure black, slightly warm)** + white; **one** voltage color (Rosso Corsa #da291c) used *scarcely* — CTAs, mark, race highlights only. | Explicit 8px ladder, named xxxs(4)→super(128); 96px section bands, 128px hero depth; 12-col editorial. | Out of scope in doc, but elevation = photographic depth + brightness-step, single soft shadow on hover. | **Full-bleed cinematic hero photograph IS the page chrome** — headline floats over the bottom of the photo. | Cinematic-editorial, "luxury magazine not car-OEM." **Sharp 0px corners** everywhere = brand precision; pills reserved for badges. |
| **Apple** | SF Pro Display + Text; **negative letter-spacing at display** ("Apple tight"); body at **17px not 16px**; weight ladder 300/400/600/**700** (500 deliberately absent); rare weight 300 = airy moment. | White/parchment(#f5f5f7)/near-black tile rhythm; **single accent (Action Blue), no second color, zero decorative gradients**; near-black ink #1d1d1f not pure black. | 8px base; **80px section padding**; tiles stack edge-to-edge with **0 gap — the color change is the divider**; ~980px text / 1440px grid. | **`transform: scale(0.95)` press on every button** (system-wide microinteraction); backdrop-blur frosted sticky bars. | **Photography-first "museum gallery"** — UI recedes so product speaks; **exactly ONE drop-shadow in the system**, applied only to product renders resting on a surface. | Quiet, confident, "reading not scanning" pace. Alternate light↔dark tile before adding chrome. |
| **Lamborghini** | LamboType, **ALL-CAPS default voice**, extreme scale (120px→10px, 12:1), tight line-heights (0.92 at 120px); weight **400 carries headlines**. | **True black #000000** dominant; white + **single gold #FFC000** (CTA only); "darkness gradient" surface ladder #000→#181818→#202020→#494949. | 8px base; sections 48–56px; Bootstrap 12-col; 1440 max. | **Color-only interactions** (bg/opacity shifts), explicitly *no* scale/translate hover; hexagonal pause button. | Full-viewport **video heroes**; "darkness as whitespace — a model name in a black void = a gallery piece on a white wall." | Theatrical, "deliberately intimidating," nocturnal luxury. Zero border-radius; hexagonal geometric DNA. |
| **Bugatti** | **Three-family trinity**: Display (uppercase headlines, wide tracking), **Text Regular = serif body**, Monospace (buttons/nav/captions). Weight **400 only — bold is a brand violation**; emphasis from size + tracking (wordmark 6px!) + case + family. | **Pure black #000000, no light mode, NO accent color** (only an ice-blue #c3d9f3 for inline links); even cards stay near-black (#141414). | 4px base; **120px between sections** (longer than anyone — whitespace frames the cars); 1280 max. | Out of scope; depth only from photography. | Photography is the *only* depth element — **no shadows, no gradients, no decorative element at all**. | "The most austere interface in luxury automotive." **Transparent pill button (1px outline)** is the brand CTA. Literary/considered (serif body). "Less is more" is a contract. |
| **Stripe** | **Söhne at weight 300** + negative tracking (-1.4px@56) = "editorial density"; **tabular figures (`tnum`) on every money/numeric cell**; `ss01` globally. | Deep navy ink #0d253d (never pure black) + electric indigo #533afd (one filled pill per band); **signature gradient mesh** (cream→orange→lavender→indigo→ruby) upper third of every page. | 8px base; sections 64–96px; 1200 container; mesh edge-to-edge. | Subtle: two shadow tiers; mesh = atmospheric depth, not literal shadow. | **Composited product-UI mockups** ("look at the actual product") more than photography; gradient mesh as SVG/image (organic blobs, not CSS). | Financial-infrastructure clarity. **Tight pill buttons (8×16px) = transactional/decisive**; thin display air. |
| **Linear** | Custom display + text; **aggressive negative tracking (-3.0px @ 80px ≈ 4%)**; display 600 / body 400 (resists 700+); eyebrow uses *positive* tracking (taxonomy signal). | **Deepest dark #010102 (faint blue tint, never #000)**; light-gray ink #f7f8f8; **single lavender accent #5e6ad2** on mark/focus/CTA only; no second chromatic color, no atmospheric gradients. | 4px base; **4-step surface ladder** (canvas→surface-1→4) carries hierarchy without shadow; hairline borders #23252a; 96px sections; 1280 max. | Depth = surface lift + hairline; **subtle white edge-highlight on top edge of lifted panels** (faint "pixel-rendered" feel); focus = 2px primary @ 50%. | **Product UI screenshots are the protagonist**, framed in surface-1 panels @ 16px radius; chrome is a dark frame. | Software-craft, "dense, technical, quietly luxurious." `{rounded.md}` 8px CTAs, never pill. The dark canvas IS the whitespace. |
| **Nike** | **Extreme contrast**: one 96px uppercase Futura campaign tier burned into photography, then a quiet 12–16px Helvetica tier — **almost no middle ground** ("billboard above, catalog below"). | Pure black #111 / white / **one gray #f5f5f5** carry ~95% of chrome; accents reserved for photography or **sale-price signal only** (sale red #d30005). | 8px base; section rhythm 48px; **sections butt directly together — photo bleed-edge is the divider**; 1440 max. | **Signature "tap collapse": `scale(0.5) opacity 0.5` press**; no hover documented; search focus = soft halo not hard ring. | Photography-first commerce; **product staged on soft-cloud gray = "the studio"**; product card = zero radius, zero shadow, **the photograph IS the card**. | Athletic, kinetic, absolute. Pill geometry everywhere; concentric-ring selected swatch. "Maximum editorial in imagery, maximum mechanical restraint in chrome." |
| **Tesla** | Universal Sans Display/Text; **default ("normal") letter-spacing — the opposite of everyone else**; only weights 400/500; 14px UI floor; lowercase calm. | White canvas + **single Electric Blue #3E6AE1** CTA; no gradients, no second color; near-black #171A20 (warm, blue undertone). | 8px base; **full-viewport (100vh) sections — one message per screen**; ~1383px. | **Universal 0.33s cubic-bezier on every state**; explicitly no scale/translate — color/border only; frosted-glass nav. | Full-bleed cinematic car photography; "whitespace as a luxury signal"; transparent-PNG product on white. | "Radical subtraction"; gallery-like silence; ≤2 CTAs per screen. **4px barely-rounded** = technical precision. |
| **BMW-M** | BMW Type Next; **heavy display 700 vs Light body 300 — the weight gap IS the signature**; UPPERCASE headlines; labels 1.5px tracking ("machined"). | True black #000 + white; **M tricolor stripe (blue→blue→red) as brand-identity marker only, never a CTA/fill**; 4px stripe divider. | 4px base; 96px sections; **never two text-only bands in a row**; 1440 max. | Out of scope; depth = photography + surface-card step. | Full-bleed motorsport photography (cars at speed, carbon-fiber, cockpit); the cars are the voltage. | European-engineered, not "American-bombastic." **Sharp 0px rect** = the button; circle only for icons. |
| **PlayStation** | PlayStation SST at **weight 300 (light) for a gaming brand — airy/editorial**; 1.25 line-height ladder; button labels 700 (dramatic weight gap). | **Three-canvas chapters**: black ↔ white ↔ PlayStation Blue #0070d1; one blue band per page max; commerce-orange reserved for buy/store only. | 8px base; 96px section rhythm; **next band's color = the divider**; 1280 max. | No hover documented; press states only; flat cards lift only on press. | Console glamour + game key-art fill 60–90% of each band; gold gradient reserved exclusively for PS Plus. | "Console launch trailer scrolling in chapters." Pill CTA + 8px card — two-radius vocabulary. |
| **Framer** | GT Walsheim + Inter Variable; **extreme negative tracking (-5.5px @110px)** = poster cadence; OpenType char variants ARE the body voice; weight 500/400 only. | Near-black #090909 + white; single Sky Blue #0099ff (links/focus only); **oversized vibrant gradient "spotlight cards" (violet/magenta/orange) as showcase tiles, not backgrounds**. | 5px base (non-standard 5/10/15/20/30); 96px sections; dark canvas = whitespace. | Press = micro-scale shrink; layered light-edge + drop on floating cards; blue ring focus. | Live product mockups in browser frames; gradient cards as atmosphere (1–2 per page max, "3 = moodboard"). | Confident dark artboard; "a tool for serious work made by people who like color." Pill CTAs. |
| **Superhuman** | Super Sans VF at **sub-default weights (460/540/600 not 400/500/700) = typographic warmth**; tight 0.96 display leading; negative tracking. | **Three-canvas**: indigo navy ↔ white ↔ deep teal closing band; warm-grey ink #292827 (never pure black); cobalt scarce. | 8px base; 64–128px sections (closing teal band gets the most air). | Subtle 2-tier shadow; hero depth = violet-sky atmospheric radial wash. | Half-bleed twilight portrait subject (person looking off-frame) as recurring hero signature. | "High-end newsletter, not SaaS app"; one CTA per band; literary/considered. 8px rounded-rect button. |
| **Vercel** | Geist + Geist Mono; **sentence-case headlines, period-terminated, aggressive negative tracking (-2.4px)**; display ceiling 600; **mono for the technical layer only**. | Near-white + ink #171717; **multi-stop mesh gradient (cyan/blue/magenta/amber) is the ENTIRE decoration**, hero-scale only, never miniaturized; one black-ink pill CTA. | 4px base; **192px section token** (huge); 1400 max. | **Stacked shadows** (multiple small offsets + inset hairline ring) not one heavy drop; polarity-flip dark band = depth. | Mesh gradient as 2-D wallpaper; code-editor mockups; polarity-flipped dark bands. | Engineer-facing clarity; "large gaps + tight interior." 100px marketing pill vs 6px nav square — two pill scales. |
| **Raycast** | Inter with **`ss03` stylistic set site-wide (alt single-story g) = the signature**; positive tracking (0.1–0.4px) opens the type on dark; display 600/500. | Pure-near-black #07080a + **4-step surface ladder** (canvas→surface→elevated→card); white CTA pill; saturated accents only inside product-tile illustrations. | 8px base; 96px sections; tonal continuity never broken (one continuous dark mode). | **No drop shadows — elevation from surface ladder only**; keycap glyphs w/ subtle gradient = the one "depth" cue; one red stripe-gradient band per page. | "The marketing page is the product" — full-fidelity command-palette UI mockups are the hero/decoration. | Software-craft; tight 16–24px card padding; multi-radius 6–16px. White inline links keep canvas tonally pure. |
| **Spotify** | CircularSp/SpotifyMixUI; **bold/regular binary (700/400)**, 600 sparingly; **uppercase buttons + wide tracking (1.4–2px)**; compact 10–24px (app, not magazine). | Near-black cocoon #121212–#1f1f1f + **single Spotify Green #1ed760 (functional only — play/active/CTA, never decorative)**; album art = the only color source, UI achromatic. | 8px base; **dense/compressed** (app, content-density over breathing room). | **Heavy shadows (0.3–0.5 opacity) — on dark, shadows must be heavy to read**; inset border-shadow combo on inputs. | Album art provides all color; UI recedes into shadow ("content-first darkness," theater-like). | Premium audio-device feel: tactile, rounded. **Pill (500–9999px) + circle (50%) geometry**; no square buttons. |
| **Revolut** | Aeonik Pro 500 at **80–136px with `line-height:1.0`** + large negative tracking; Inter body 400/600 with positive tracking (mechanical precision). | **Two-mode bands**: true black #000 (story) ↔ white (catalogue); cobalt-violet #494fdf scarce (featured plan + mark); **8 saturated accents live inside product mockups only, never as buttons**. | 4px base; 88–120px sections; full-bleed band switches "slam" together. | No drop shadows; depth = canvas + surface-luminance shift; product mockups carry own glow. | Full-bleed phone/card/terminal mockups as hero objects on black, no caption chrome. | Fintech-meets-brochure; **white pill on black is the loudest CTA**; pill buttons + 20px cards. |
| **Coinbase** | CoinbaseDisplay at **weight 400 (not 700+) = institutional calm, not trading-urgency**; negative tracking display-only; **CoinbaseMono on every number**. | White + soft-gray bands + **single Coinbase Blue #0052ff (scarce)** + deep editorial dark #0a0b0d hero; trading green/red are text-only semantics, never fills. | 4px base; 96px sections; 1200 max. | One soft shadow tier; **signature: dark hero with layered/rotated product-UI mockup cards**. | Full-bleed dark heroes carrying floating dashboard mockup card stacks. | "Institutional brand that happens to trade crypto." Pill CTA + 24px cards + full-circle asset glyphs. |
| **Sanity** | waldenburgNormal + IBM Plex Mono; **extreme negative tracking (-4.48px @112px) = machined steel letterforms**; narrow weight band 400–425; mono uppercase technical labels. | Near-black #0b0b0b + **pure achromatic gray ramp (no warm/cool bias)**; vivid accent punctuation (neon green, electric blue #0052ef, coral CTA #f36458); **every hover → electric blue (universal "activation")**. | 8px base; 64–120px sections ("slides" quality); 1440 max. | **Colorimetric depth only** (surface color shift, no offset shadows; ring-shadows only); radius jumps 12px→pill, nothing between. | Type + code + atmospheric structure; "nocturnal command center." | Dual-register: editorial authority + developer credibility. Pill primary + 5px secondary. |
| **Resend** | **Domaine Display serif at 76–96px (`ss01/ss04/ss11`)** = print-magazine confidence on a dev tool; ABC Favorit body, Inter UI, Geist Mono code (strict lanes); `line-height:1.0`. | Pure black #000 + off-white #fcfdff; **6 accent colors as low-opacity atmospheric glows only, never solid surfaces**; the white pill CTA is "the brightest pixel." | 4px base; 96–128px sections. | **No shadows — translucent-white hairlines (6%/14%) + atmospheric radial glows carry depth**; contrast itself = elevation (white email-card insets). | Type-and-code led; atmospheric section glows; rare white "print pull-quote" insets on black. | Confident, considered, slightly literary — **serif headline is the whole brand signature.** 12px card / 8px button radius. |
| **Figma** | figmaSans variable at **fine weight increments (320/330/340/480/540) — weight not size carries body hierarchy**; negative tracking display; figmaMono uppercase eyebrows = taxonomy. | Monochrome black/white core + **oversized pastel "color-block sections" (lime/lilac/cream/mint/coral/navy) that take a whole viewport** — the storytelling lives in the blocks; magenta promo scarce. | 8px base; 96px sections; **white canvas returns between every two color blocks** so each reads as deliberate. | Shadow-light (color blocks substitute for elevation); rare shadow = an exception worth noticing. | Color blocks + sticky-note collage thumbnails + flat product mocks. | "Technical and joyful." Pill-only buttons; "selected = primary surface" pattern. |
| **Mintlify** | Inter + Geist Mono (the pairing IS the dev-respect signal); display 600 with negative tracking (-2px @72px); uppercase micro labels +0.5px. | White + **atmospheric sky-gradient heroes** (cloud/rocket) ↔ dense flat docs; single mint green #00d4a4 scarce (accent CTA/active/checkmarks); black pill primary. | 4px base; 96px marketing / 32px docs (dual-density); 1280 max; **3-col docs grid**. | Mostly flat; tiered shadows reserved for the hero product mockup; brand-tinted glow on featured tier. | Cinematic gradient marketing heroes vs dense developer docs surfaces; one vibrant orange testimonial card breaks rhythm. | Polished-marketing ↔ developer-density dual mode. Pill buttons; 12px cards / 8px compact UI. |

---

## Part 2 — The 15 Most Powerful Cross-Brand Principles → Eclipse

1. **Never pure black — warm/cool the void.** Ferrari #181818, Linear #010102 (blue-tinted), Apple/Stripe ink ≠ #000. → Keep Eclipse `--void #0A0A0D` (already not pure black, good) and ensure `--ink` stays bone #F4F4F6 not #FFF for the same photographic-not-printed feel.
2. **One accent, used scarcely (the "single voltage" law).** Ferrari red, Lambo gold, Linear lavender, Apple blue all forbid a second decorative color. → Eclipse: **corona gold #E9C46A is the sole voltage** on CTAs/the mark/focus; demote plasma violet + oxblood to structural/state roles (link/danger), never decoration.
3. **Emphasis from size + tracking + case, not bold weight.** Ferrari 500, Lambo/Bugatti 400, Stripe 300, Linear 600 — none use 700 display. → Eclipse display (Cormorant) tops out at **600**; build hierarchy via the ramp + negative tracking, never heavier weight.
4. **Negative letter-spacing on display = the luxury cadence.** Apple "tight," Stripe -1.4px, Linear -3.0px. → Apply tightening tokens to Cormorant display sizes (see ramp); body stays at 0.
5. **The image is the chrome / the card.** Ferrari, Bugatti, Apple, Nike, Linear all let photography (or product UI) carry the page; UI recedes. → Eclipse PDP + cards lead with full-bleed product imagery; remove competing borders/labels (gated to approved media only — respects the queue).
6. **Surface-shift as the divider, not lines or shadows.** Apple light↔dark tiles, Linear 4-step ladder, Lambo "darkness gradient." → Eclipse: section breaks come from `--void`↔`--surface`↔`--surfaceHi` steps + hairlines, not drop shadows.
7. **Exactly one (or zero) shadow.** Apple = one product-shadow; Ferrari = one hover shadow; Bugatti/Lambo/Nike = none. → Eclipse: **one reusable product/elevation shadow** for media resting on a surface; everything else is flat + hairline (`--line #2A2A33`).
8. **Sharp 0px corners read as luxury-automotive precision.** Ferrari, Lambo, Bugatti cards/inputs at 0px; pills reserved for one role. → Eclipse: **sharp by default** on cards/inputs/CTAs; pill only for small badges/chips (the punk-precision edge).
9. **The signature CTA is a single, decisive shape.** Bugatti transparent-outline pill, Ferrari sharp red rect, Nike black pill, Stripe tight indigo pill. → Eclipse signature CTA: **sharp gold-outline button on dark** (transparent fill, 1px corona), filled-gold for the one primary action per fold.
10. **Tabular figures for money/specs.** Stripe `tnum` on every numeric cell. → Eclipse: prices, run-counts, SKUs, spec chips all use `font-variant-numeric: tabular-nums` (mono already in tokens — enforce tnum).
11. **A press microinteraction is the system's heartbeat.** Apple `scale(0.95)`, Nike `scale(0.5) opacity .5`. → Eclipse: **`scale(0.97)` press** on every interactive element — one rule, applied everywhere.
12. **Whitespace (or darkness) is the pedestal.** Bugatti 120px sections, Apple 80px, "darkness as whitespace" (Lambo). → Eclipse: generous section rhythm (96–128px on hero/PDP) so each product reads as an exhibit.
13. **Eyebrow/label gets positive tracking; display gets negative.** Linear's taxonomy contrast. → Eclipse: uppercase eyebrows/labels at +0.4–1.4px tracking against tightened display — a quiet, expensive signal already partly in our wordmark spec.
14. **Extreme typographic contrast (billboard ↔ catalog).** Nike's 96px↔16px jump. → Eclipse: a towering Cormorant hero tier and a quiet system-sans body tier, with deliberately little in between, so heroes feel like editorial campaigns.
15. **Restraint as the brand contract — adding chrome is the failure mode.** Every luxury house: "when in doubt, remove." Apple "alternate surface before adding chrome"; Bugatti "less is more is a contract." → Eclipse design reviews should ask *what can be removed* before what can be added; this also keeps the profanity-free, no-fake-scarcity ethos visually honest.

---

## Part 3 — Upgraded Eclipse Token / Component / Motion Spec

### 3.1 Typography ramp (Cormorant Garamond display, system-sans body, mono numerics)

| Token | Size / Line-height / Weight / Tracking | Use |
|---|---|---|
| `display-mega` | 88px / 1.02 / 600 / **-2.2px** | Homepage hero (editorial "campaign" tier) |
| `display-xl` | 64px / 1.06 / 600 / -1.6px | PDP product name, section openers |
| `display-lg` | 44px / 1.1 / 600 / -1.0px | Section heads |
| `display-md` | 32px / 1.15 / 500 / -0.5px | Sub-section / capsule titles |
| `title` | 22px / 1.25 / 500 / -0.3px | Card titles (serif) |
| `eyebrow` | 12px / 1.3 / 600 / **+1.4px UPPERCASE** | Labels, tier badges, section taxonomy |
| `lead` | 20px / 1.5 / 400 / 0 | Intro paragraphs (system sans) |
| `body` | 17px / 1.55 / 400 / 0 | Default body (17px per Apple's reading pace) |
| `body-sm` | 14px / 1.5 / 400 / 0 | Captions, secondary |
| `mono-price` | 16px / 1.0 / 500 / 0, **tabular-nums** | Prices, run-counts, SKUs, spec chips |
| `mono-micro` | 11px / 1.4 / 500 / +0.5px, tnum | IDs, legal, metadata |

Rule: **display = Cormorant ≤600 with negative tracking; body = system sans at 17px; numerics = mono + tnum.** Never bold the serif.

### 3.2 Color roles (lock the single-voltage law onto existing tokens)

- **Canvas ladder:** `--void #0A0A0D` (page) → `--surface #14141A` → `--surfaceHi #1E1E27` → (new) `--surface-3 #25252F` for nested. Hairline `--line #2A2A33`. Surface-shift = the divider.
- **Ink:** `--ink #F4F4F6` (bone), `--muted #9A9AA5`, (new) `--ink-subtle #6A6A74` for tertiary.
- **The one voltage:** `--corona #E9C46A` — CTAs, the mark, focus ring, in-stock-rare emphasis. Hover/press: `--corona-press #C9A24A`.
- **Demoted accents (structural/state only, never decorative):** `--plasma #6C4BF4` = inline link / lane-fill gradient end; `--oxblood #7A1E2B` = danger/sold-out; `--signal #3FB6A8` = in-stock/success.
- **No decorative gradients** except: (a) the lane-bar plasma→corona fill (functional), (b) a single subtle bottom-edge scrim on hero imagery for headline legibility (Ferrari/Lambo pattern), (c) an optional faint corona radial "eclipse-ring" glow behind the hero mark — used once per page max.

### 3.3 Spacing / radius / elevation

- **Spacing ladder (4px base):** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128. Section rhythm 96px (editorial), 128px (hero/PDP).
- **Radius:** **0px sharp by default** (cards, inputs, CTAs); `pill 9999px` reserved for badges/chips/tier tags only. (Punk-precision = sharp; the pill is the single "soft" exception.)
- **Elevation:** flat + hairline is default. **Exactly one shadow token** `--shadow-media: 0 12px 40px rgba(0,0,0,0.55)` for product media resting on a surface. Lift hierarchy otherwise = brightness step. Add a **1px top-edge highlight** `inset 0 1px 0 rgba(255,255,255,0.05)` on raised panels (Linear's "pixel-rendered" cue).

### 3.4 Motion system (the part the brief explicitly wants returned)

Durations and easings, derived from the corpus (Apple press, Nike collapse, luxury-auto restraint):

```
--ease-standard:  cubic-bezier(0.4, 0.0, 0.2, 1)    /* default UI transitions */
--ease-entrance:  cubic-bezier(0.16, 1, 0.3, 1)     /* "luxe ease-out" — reveals, hero, modal in */
--ease-exit:      cubic-bezier(0.4, 0.0, 1, 1)      /* dismiss / exit */
--ease-emphasis:  cubic-bezier(0.34, 1.56, 0.64, 1) /* rare, subtle overshoot — use sparingly */

--dur-instant: 90ms     /* press / tap feedback */
--dur-fast:    160ms    /* hover lift, color/opacity shifts */
--dur-base:    240ms    /* standard transitions, card reveal */
--dur-slow:    420ms    /* hero / PDP gallery, surface cross-fades */
--dur-cinematic: 720ms  /* once-per-view moments: hero image settle, eclipse-ring glow */

press:  transform: scale(0.97); transition: transform var(--dur-instant) var(--ease-standard);
hover-card: translateY(-4px) + corona 1px border; var(--dur-fast) var(--ease-standard);
reveal: opacity 0→1, translateY(16px→0); var(--dur-slow) var(--ease-entrance); stagger 60ms.
Respect prefers-reduced-motion: drop transforms, keep opacity fades only.
```

Principle: **one press rule everywhere** (scale 0.97), **luxe ease-out for reveals**, **color-only interactions favored over translate** on dark (Lamborghini), and reserve the cinematic tier for at most one moment per view.

### 3.5 Component contracts (upgrades to DESIGN.md)

- **Product card (`.card`):** full-bleed 4:5 media (approved-only), zero radius, flat; below the image: eyebrow tier badge (+tracking), serif `title`, mono spec chips (tnum), mono price. Hover: `translateY(-4px)` + 1px corona border + `--shadow-media`. The photograph is the card (Nike/Bugatti).
- **PDP hero:** full-bleed cinematic product image with bottom scrim; product name in `display-xl` Cormorant floating over the lower third (Ferrari); single filled-corona primary CTA + one gold-outline secondary; spec values in a `spec-cell` pattern (large mono number + uppercase eyebrow label, Ferrari/Bugatti).
- **Buttons:** primary = filled corona, sharp 0px, `eyebrow`-cased label; secondary = transparent + 1px corona outline (Bugatti's signature transparent pill, but sharp); both use the `scale(0.97)` press. One primary per fold (Nike).
- **Review/ops card (`.qcard`):** unchanged contract but adopt tnum on cost/margin and the eyebrow/label tracking for the gate badge.
- **Lane bar (`.lane`):** plasma→corona functional gradient, integer %, mono label.

---

## Part 4 — "Feel Before You Buy" Art Direction (luxury/auto → Eclipse PDP)

How the houses make you *feel* the object, and the Eclipse translation:

- **Ferrari — cinematic editorial.** The hero photograph fills the viewport; the headline floats on the image; the page reads like a magazine spread, not a catalog. → Eclipse PDP opens with a single full-bleed cinematic product shot, headline over the lower third, generous dark space around it.
- **Bugatti — austerity + serif gravity + 120px breathing room.** Less is more; the empty black frames the object; serif body signals "considered, slow-reading." → Eclipse uses Cormorant for the product story copy, oversized whitespace, and *removes* everything non-essential from the PDP fold.
- **Lamborghini — darkness as spotlight + video reveal.** The object emerges from a true-black void like a machine under a stage light; full-viewport video. → Eclipse: an optional looping detail-motion clip or slow zoom (cinematic tier, 720ms), product lit against `--void`, "deliberately intimidating" calm.
- **Apple — museum gallery + materiality shadow.** The single product-shadow gives the object weight; alternating surfaces pace the scroll; nothing competes. → Eclipse PDP scroll = alternating `--void`/`--surface` bands, each a single feature/material, with the one `--shadow-media` giving the product physical weight.
- **Nike — the studio gray + macro detail.** Product staged on a neutral "studio" backdrop so only the object has form; close crops sell texture. → Eclipse macro/detail tier: extreme close-ups on material, stitch, hardware, weave — "feel the construction" — staged on `--surface` as the studio.

**Net Eclipse PDP art direction:** (1) cinematic full-bleed hero on void, headline over lower third; (2) alternating dark surface bands, one material/feature each, single product-shadow for weight; (3) a macro-detail sequence selling construction (the "specificity is the proof" voice, made visual); (4) one motion moment max (slow settle or detail loop); (5) spec cells with large mono numbers + uppercase labels; (6) the single corona CTA as the only chromatic moment on the page.

---

## Part 5 — Brand Personality / Voice Guide ("a person you like")

Eclipse's existing voice traits (`src/brand.mjs`): confident, exclusive, specific, unhurried, dark-luxe; rules: no profanity, specificity as proof, no fabricated scarcity/reviews/MSRPs, "speak to those who already know — never explain, never beg." The corpus sharpens this into a usable voice.

**Tone (drawn from the best brand voices in the set):**
- **Bugatti/Ferrari restraint:** say less; let the object and the numbers carry it. Literary, not loud.
- **Linear's quiet craft:** technical specificity reads as confidence, not jargon.
- **Apple's calm assurance:** declarative, unhurried, never hype-y.
- **Lamborghini's edge:** a controlled, nocturnal confidence — "deliberately intimidating" but never crude (keeps it profanity-free + punk).

**Copy patterns:**
- Lead with the material, the construction, the number. (Spec is the seduction.)
- Short, declarative sentences. One idea per line. Whitespace in copy as in layout.
- Name things precisely; never hedge ("the", not "a kind of").
- Headlines = evocative + concrete; body = factual proof. (Nike "billboard ↔ catalog" applied to words.)
- Urgency only when real: true run counts, real inventory — never a countdown trick.

**Do:**
- "Full-grain Italian leather. 14 hand-set rivets. 200 made." (specificity = proof)
- "For those who already know." (exclusivity by assumption, not by begging)
- Use uppercase eyebrows sparingly for taxonomy; reserve serif for the evocative line.
- Let one sentence stand alone on a dark field.

**Don't:**
- No profanity, ever (hard constraint).
- No "Hurry! Only 2 left!" fake scarcity, no fake reviews, no padded "$999 → $399" MSRPs.
- No exclamation-driven hype, no emoji, no "shop now babe" over-familiarity.
- Never explain the obvious or apologize for the price. Never beg for the click.

**Personality in one line:** *the friend with impeccable taste who tells you exactly what something is made of, once, and lets you decide.*

---

## Part 6 — Current (2025–2026) Luxury E-commerce / Award-Tier Trends (web-researched)

Light web research (May 2026) confirms the corpus-derived direction. Validated trends and the Eclipse implication:

1. **Dark aesthetics = the premium signal.** High-end brands increasingly adopt dark backgrounds with light text to "convey luxury, reduce eye strain, and make product imagery pop"; dark mode reads as elegant and tech-forward. → Eclipse's dark-luxe foundation is on-trend, not contrarian. (TheeDigital; Hostinger; Lovable dark-mode guide.)
2. **Adaptive dark mode** that responds to ambient light / time of day is a 2026 differentiator. → Optional future enhancement; keep the void-first palette as default.
3. **Heritage/serif & display-font revival.** Serifs and display fonts dominate 2025–26; "heritage fonts are making a comeback, inspired by Prada, Chanel, Burberry"; expressive oversized type is the hero element on Awwwards-tier sites; mixing typefaces is standard practice. → Eclipse's Cormorant Garamond serif display is squarely on-trend; the serif-display + system-sans-body + mono-numeric pairing is the recommended luxury structure.
4. **Kinetic / animated typography** — letters that shift, morph, and react to scroll/gaze/ambient movement. → Reserve for the hero wordmark and section reveals (cinematic tier), respecting reduced-motion.
5. **Scrollytelling / editorial PDP.** Scroll-triggered animation turns a product page into "an immersive story that emotionally connects the user to the product before they see the price tag." → Directly validates the §4 editorial-scroll PDP (alternating bands, material macro shots, one feature per band).
6. **Context-aware micro-animations** intelligently responding to user behavior are a 2025 fashion/retail standard. → Validates the §3.4 microinteraction system (press, hover-lift, staggered reveal).
7. **Archival/editorial "index" aesthetic** — images mixed with tiny labels, understated catalog-style typography. → Pairs with the eyebrow/mono-label spec (§3.1) and the spec-cell PDP pattern.

Net: every Eclipse direction in this doc (dark-first, single gold voltage, serif display, editorial
scrollytelling PDP, restrained kinetic motion, mono numerics, sharp-corner restraint) maps onto a
currently-validated luxury / Awwwards-tier trend.

Sources: [TheeDigital — 20 Top Web Design Trends 2026](https://www.theedigital.com/blog/web-design-trends);
[Hostinger — Web Design Trends 2026](https://www.hostinger.com/tutorials/web-design-trends);
[Lovable — Dark Mode Website Examples](https://lovable.dev/guides/dark-mode-website-examples-guide);
[Designity — Typography Trends 2025](https://www.designity.com/blog/typography-trends);
[Awwwards — Typography in Web Design](https://www.awwwards.com/websites/typography/);
[halothemes — 7 eCommerce Design Trends 2026](https://halothemes.net/blogs/shopify/7-ecommerce-design-trends-in-2026-that-will-dominate-online-shopping).

**Follow-ups for a build session:** translate the §3 token spec into `public/styles/tokens.css` +
`DESIGN.md`; prototype the §4 editorial PDP scroll; wire the §3.4 motion tokens (respecting
`prefers-reduced-motion`).
