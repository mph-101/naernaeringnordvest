# Design-re-audit 2026-07-15 — hele leserflaten

**Instrument:** 5 parallelle dimensjons-skannere (samme som 2026-07-10), JSON-retur, DESIGN.md/PRODUCT.md som fasit. Admin/mascot utenfor scope.

**VIKTIG scope-endring:** Målingene 2026-07-08 (9/20) og 2026-07-10 (13/20) gjaldt **forsiden**. Denne runden skannet **hele leserflaten** (Article, Stillinger, Naeringspuls, Subscribe, footer-sider m.m.). Totalscoren er derfor ikke direkte sammenlignbar — fallet i anti-mønstre skyldes undersider som aldri før har vært i scope, ikke regresjon på forsiden. Forside-funnene fra forrige runde er i all hovedsak lukket (verifisert av skannerne som styrker).

## Score

| Dimensjon | 2026-07-10 (forside) | 2026-07-15 (hele leserflaten) |
|---|---|---|
| A11y | 3 | **3** — hullene samlet i Spør-popoveren (SporAIChat) |
| Anti-mønstre | 3 | **1** — eyebrows/destructive/scale-hover på undersidene |
| Ytelse/data | (ny 07-10) 3 | **3** — død tags-query, umemoisert kjede, body-overfetch |
| Responsiv | 2 | **2** — mobilmeny i landskap, ViewToggle 40px, små tekstlenke-mål |
| Klarhet/copy | 2 | **2** — 4 P1 som treffer etterrettelighets-løftet |
| **Total** | **13/20** | **11/20** (bredere scope) |

## Prioritert backlog (foreslåtte PR-bunker)

### Bunke 1 — Etterrettelighet (klarhet-P1, små fokuserte PR-er)
1. **RelatedArticles mock-fallback fjernes** (RelatedArticles.tsx:51) — fiktive artikler bak paywall er villedende. Fallback: siste publiserte, eller skjul seksjonen. Slett relatedArticles-mockdata fra translations.ts.
2. **Kontaktsidens kildevern-løfte** (footer-pages.ts:61) — motsier fase 1.1-nedgraderingen i TipForm; omskriv til samme ærlige nivå + fiks tipskanal-lenken (peker til «/»).
3. **Article.tsx inline-footer** (l.403–418) — href="#" for Personvern/Vilkår/Kontakt; erstatt med `<SiteFooter />`.
4. **AI-merking i Spør** (ConversationView.tsx) — fast diskret linje ved AI-svar, per /innholdsmerking-løftet.
5. **TipForm Signal-plassholder** (TipForm.tsx:46) — «[Signal-nummer kommer]» i prod; fjern til nummeret finnes.

### Bunke 2 — Anti-mønstre på undersidene (samme grep som quieter/#161, nå utenfor forsiden)
- Uppercase/tracking-eyebrows: Article.tsx:296 (Nøkkelpunkter), ArticleEngagementBar:54, SourceCard:51, Hjernevelvet:151, EventsFeed-badges, Stillinger:156 (+ StillingDetail/JournalistProfile/Subscribe/HjernevelvWriter), ConversationView:578/688/691.
- Destructive på ikke-feil: Naeringspuls:180/273/301 (negative tall → --negative), LiveStreamPlayer:94 (LIVE-badge).
- Scale/løft på hover: SporAIChat FAB:157, ArticleNotes:281, ArticleEngagementBar:107 (→ .card-interactive), SourceCard blockquote border-l-2:58.

### Bunke 3 — SporAIChat a11y-pakke (alle P2 i samme fil)
- Send-knapp 32px uten aria-label (:304), lukk-knapp (:177), input uten label (:296), meldingsliste uten role=log (:183), FAB-scale (:157), smooth-scroll uten reduced-motion-guard (:87). Pluss EventsFeed dato aria-hidden (:248), JobChangeFeed aria-controls (:124).

### Bunke 4 — Responsiv/klikkflater
- **P1:** Mobilmeny uskrollbar i landskap (Header.tsx:249 — max-h + overflow-y-auto); ViewToggle-faner 32px (→ min-h-10) + overflow uten affordance (:57, gjenbruk chevron/fade fra NewsFeed).
- **P2/P3:** 40px-gulv på tekstlenker (ticker-kilder, JobChangeFeed «Kilde»/«Meld inn», EventsFeed «Se alle», Article «Tilbake», ArticleRevisionLog-toggle, SearchHero-submit, EventsFeed-tomtilstand); SporAIChat-panel h-520 i landskap; TrendingSection md:grid-cols-4 → 2/4; mb-[7em]-skrivefeil (Article.tsx:317); safe-area for MiniPlayer/FAB.

### Bunke 5 — Ytelse/data
- Død article-tags-query i NewsFeed (:177) — henter tags for 40 artikler, aldri rendret.
- Umemoisert avledningskjede i NewsFeed (:286) → useMemo.
- JobChangeFeed generated_notice-overfetch (:48); MarketTicker items-memo; poll-bar animerer width (→ scaleX); JobChangeFeed-img uten aspect-ratio/lazy.

### Bunke 6 — Klarhet P2/P3
- Login: rå Supabase-feil → lokaliserte meldinger; ConversationView error.message i chatboble.
- Terminologi: medlem/abonnent-standardisering; «kansellere»→«si opp»; EN Title Case→sentence case; «Open menu» aria-label lokaliseres.
- Subscribe/SubscribeReturn: EN-fallback mangler; TXT-record-sjargong; Stripe-ID + uvarslet auto-redirect; trial-banner CTA «Administrer»→«Oppdater betaling».

### Magnus (utenfor kode → magnus-todo.md)
- **MBL/Norsk Redaktørforening/PFU-påstanden i SiteFooter** — verifiser at medlemskapene faktisk er tegnet før lansering, ellers omskriv.
- **Signal-nummer** til tipskanalen.
- **Juridiske plassholdere** i footer-pages ([DATO], [TELEFON], [ORG.NR.], eierskaps-[NAVN]/[PROSENT]) — trenger reelle verdier.

## Styrker (gjennomgående på tvers av skannerne)
- Token-disiplin: ingen rå hex/palettklasser i leserflatens tsx; ink-tokens bærer kontrast i begge tema.
- Reduced motion: global CSS-reset + statisk ticker-rad; marquee-kloner aria-hidden.
- Radix-dialoger (paywall, walkthrough) med ekte semantikk; konsekvent state-ARIA.
- Bundle/LCP: lazy chunks, fetchpriority, aspect-ratio-containere, RPC-aggregering, språknøytral cache.
- Ærlig copy der det gjelder mest: TipForm, revisjonslogg, kildelenker i ticker, annonsemerking.
- Ingen horisontal overflow på noe brekkpunkt (DOM-verifisert 375/768/desktop).

Fullstendige funn (JSON per dimensjon) ble levert i økten 2026-07-15; dette dokumentet er den varige oppsummeringen.
