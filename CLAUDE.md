# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Maker Map** — a static, client-side web app for managing map areas and exporting presentation images. There is **no backend, no build step, no test suite, no package.json**. The entire product is three files served as-is:

- `index.html` — login/signup landing page (the entry point).
- `app.html` — the map tool itself (~3200 lines, everything inline: HTML + CSS + JS).
- `logo-makermap.png` — brand logo, referenced by `<img src="logo-makermap.png">` in both pages.
- `censo/` — IBGE 2022 census data, **one file per state** (`35.json` = SP, 90,789 sectors, 1.2 MB gzipped; `29.json` = BA, 30,311 sectors, 0.44 MB) plus `censo/manifest.json` listing what exists and each state's bounding box. **Fetched lazily**, and only for the states the current radius reaches. Not code — data.
- `netlify.toml` — deploy config (`publish = "."`; its `command` only strips `*.md` and `tools/` from the published output).
- `tools/censo_uf.py` — builds one `censo/<cod>.json` from an IBGE sector-mesh GeoJSON plus the national income CSV, and updates the manifest.
- `tools/censo_pacote.py` — same output, but from a pre-joined "census radar" package (a `CD_SETOR -> {lat, lon, dom, mor, renda_*}` dict); emits one file per UF found, so a multi-state package needs one run. BA was built this way.
- `tools/municipios.json` — the 5,570 municipality names, so sector files do not depend on the mesh carrying `NM_MUN`.

None of `tools/` is served — `netlify.toml`'s command strips it.

Deployed to Netlify (project **maker-map**, `maker-map.netlify.app`) with continuous deployment from `main`: **merging to `main` publishes the live site automatically** (~1 min). There is no other release process.

## Versioning — iOS-style

Releases are numbered and named the way Apple names iOS updates: `MAJOR.MINOR.PATCH`, where the third number exists **only** when the release is fixes-only.

| Form | When | Example |
|---|---|---|
| `X.0` | Big release: redesign, new subsystem, breaking change to saved projects | `2.0` |
| `X.Y` | New features / visible improvements — the normal case | `1.1`, `1.2` |
| `X.Y.Z` | **Only** bug fixes, no new features (Apple never adds features in a patch) | `1.1.1` |

Rules, all mirroring Apple's practice:

- **Never write `1.0.0`** — a release with no patch component is just `1.0`. The `.0` patch is implicit.
- **A patch never introduces a feature.** If a "fix" adds a control, a section, or a new behavior the user can reach, it is a `X.Y`, not a `X.Y.Z`.
- **Numbers only, no codenames.** iOS has no "Sequoia"; neither do we.
- Each release gets a **short title** in the release notes, plus the standard Apple opener: *"Esta atualização inclui os seguintes aprimoramentos e correções de erros:"* followed by bullets written for the user, not for a developer.

Where the version shows up:

- **PR title** — `Maker Map 1.1 — Legenda do raio e Raio do Mapa de renda`
- **`CHANGELOG.md`** — one section per version, newest first. Written in Portuguese, user-facing. Netlify strips `*.md` from the published output, so it never leaks to the site.
- **Git tag on `main` after the merge** — `git tag v1.1 && git push origin v1.1`
- Commit messages inside the branch stay descriptive as usual; the version lives on the release, not on every commit.

Decide the number **when opening the PR**: look at `CHANGELOG.md` for the last shipped version and bump according to the table above.

## Working on the code

Since it's a single-file app, use `Grep`/`Read` to navigate `app.html`. The file opens with a comment block (the "ÍNDICE DO ARQUIVO") that maps every subsystem to its function names — read it first; search by the term to jump to a section.

There is nothing to build/lint/test. The one meaningful check before committing is **JavaScript syntax of the inline `<script>` blocks**, since a syntax error silently breaks the whole page:

```bash
python3 - <<'PY'
import re, subprocess, tempfile, os
for f in ['index.html','app.html']:
    html=open(f,encoding='utf-8').read()
    for i,s in enumerate(re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', html, re.S)):
        if not s.strip(): continue
        tf=tempfile.NamedTemporaryFile('w',suffix='.js',delete=False); tf.write(s); tf.close()
        r=subprocess.run(['node','--check',tf.name],capture_output=True,text=True); os.unlink(tf.name)
        print(f, i, 'OK' if r.returncode==0 else r.stderr)
PY
```

**The map cannot be exercised locally in this environment** — it needs a browser with internet, and auth needs the deployed Netlify site (see below). Verify changes by reasoning about the code and this syntax check; the user tests visually after deploy.

External hosts the deployed page depends on (relevant for CSP/network allowlists): `cdnjs.cloudflare.com` (MapLibre GL, JSZip), `tiles.openfreemap.org` (positron basemap style + tiles), `server.arcgisonline.com` (satellite raster), `fonts.googleapis.com`, `nominatim.openstreetmap.org` (address search), `api.bcb.gov.br` (IPCA series, Mapa de renda only).

## Authentication (index.html ↔ app.html)

Auth is **Netlify Identity**, called directly over REST (`fetch` to `/.netlify/identity/*`) — no gotrue/widget library. Because of this:

- `index.html` is the gate: signup collects nome/sobrenome/telefone (stored in Identity `user_metadata`), and on login it stores the session in `localStorage` under **`makermap.user`**, then redirects to `app.html`.
- `app.html` has a guard in `<head>` that redirects back to `index.html` if `makermap.user` is absent. This is a client-side gate, not edge security.
- **Identity must be enabled in the Netlify dashboard** and only works on the published site — `/.netlify/identity` does not exist when opening the file locally (`file://`) or on other hosts. Editing the user's own data uses `PUT /.netlify/identity/user` with the bearer token (with a refresh-token retry on 401).

## Two screens, one file

A left drawer (`#nav`, toggled by `#navBtn`, `body.nav-open`) switches between two screens, both living in `app.html`:

- **Mapa** — `#wrap`, everything described below.
- **Novos Negócios** — `#viewNeg`, a kanban of the areas.

`irPara(view)` flips `body.view-neg`, which `display:none`s the other screen. **Returning to Mapa must call `map.resize()`** (it does, twice — immediately and after the 280 ms nav transition), or MapLibre paints a blank canvas at the stale size.

They are one file, not two pages, so that going between the board and the map ("Ver no mapa") is instant and the board can tell live which of its deals are currently loaded on the map.

### Novos Negócios (kanban) — separate from Meus Projetos

**The two persistence systems are deliberately independent**, and merging them back would be a regression:

| | What it holds | Where | When it's written |
|---|---|---|---|
| **Meus Projetos** | the KMZs + map styling of one presentation map | `makermap.projetos.<email>` | only when the user clicks Salvar Projeto |
| **Novos Negocios** | the commercial pipeline | `makermap.negocios.<email>` | automatically, on every change |

So a card is **not** a `DATA` feature. It is its own record in `NEGOCIOS` (`{chave, nome, grupo, ha, haTxt, lat, lon, cor, status, valor, contato, obs, ts}`) — a copy of what the board needs, no geometry. Consequences, all intended:

- `negSincronizar(DATA.features)` runs after `integrarFeats` and creates the missing cards. It **only adds** — a deal never disappears because the map changed.
- Removing the KMZ (`excluirGrupo`) or "comecar do zero" (`limparProjetoAtual`) leaves the board untouched; the card just loses its `kb-flag` "no mapa" badge, computed live by `negNoMapa()`.
- Re-importing the same KMZ does not duplicate cards, because `negChave()` (`grupo|nome|lat(4)|lon(4)`) is stable across imports.
- Leaving the board is an explicit act — "Remover do quadro" in the card window.
- `carregarNegocios()` runs at startup, so the board is there without opening any project.
- `NEG_COLUNAS` is the column list; add to it and the board grows a column.
- Card fields come from KMZ files, so `esc()` escapes them before `innerHTML`. (The map popups still interpolate raw — pre-existing, worth fixing.)
- Pro-gated as `novosNegocios`; the nav item itself is the gated element.
- One card per **area**, not per KMZ file: a KMZ carrying ten plots yields ten cards, since the plot is what gets offered and contracted.

## app.html architecture (the map)

`DATA` (a GeoJSON FeatureCollection of "glebas"/areas) **starts empty**; areas come only from KMZ upload or drawing. The map style is the OpenFreeMap **positron** vector style, recolored at load by `aplicarPaleta(style)`. `montarCamadas()` runs on the map `load` event and adds all custom sources/layers (`mascara`, `raio`, `glebas`, `satelite`) plus popups.

Key subsystems (all inside `app.html`):

- **Roads engine** — the most intricate part. `tierDe(id)` buckets road layers into macros (`rodovia`/`avenida`/`rua`); `subDe(id)` + `SUBVIAS` refine into sub-tiers (autoestrada/expressa/primária/…). `viaCfg` is keyed by **sub-tier** and drives `aplicarTierEstilo()` (color/width/opacity/contorno per sub) and `larguraFinal()`. `classificarTiers()` builds `viasTiers` (macro, for the above-mask stack) AND `viasSubTiers` (sub, for styling). `setSat()` swaps to the hybrid satellite look. **Base-map caveat:** positron only physically separates a few road layers (~motorway/major/minor), so `ajustarViasUI()` hides sub-tier controls that have no matching layer — most of the 7 sub-tiers legitimately don't appear.
- **Spotlight mask** — `construirMascara()` builds a world polygon with holes at the active glebas; `anelLimpo`/`anelOrientado` enforce correct winding.
- **Above-mask stack** — `ordemAcima` is the z-order of what's drawn over the veil; reordered by dragging rows in `#acimaLista` (`initDragAcima`/`sincronizarOrdemAcima`/`reordenarDOMAcima`), applied by `tierAcima()`/`aplicarPilhaAcima()`.
- **Editor UI** — `montarEditor()` builds every editor section (Por cidade, Por área, Mapa, Rótulos, Raio, Máscara, Vias, Sobre a máscara) and exposes `window.MakerMap.{coletar, aplicar}` (the styling-state serializer). Editor sections that render per-row use `*RowRefs` objects to sync inputs on reset/restore rather than DOM indexing. The editor is a resizable drawer (`--drawer-w` CSS var, drag handle `#edResize`, width persisted in `localStorage['makermap.drawerW']`).
- **Rótulos** — `lblCfg` + `classificarRotulos()` + `aplicarLbl()` style basemap labels per tier.
- **"Mapa" section** — `mapaCfg` + `camadasMapa(k)` toggle color/visibility of basemap layers (terreno, água, verde, divisas, aeroporto, áreas urbanas, construções) by `source-layer`.
- **Raio** — `gerarCirculo(km, centro)`/`atualizarRaio()` around `centroRaio`. Its map legend is a `symbol` layer (`raio-rotulo`) driven by `raioLbl` + `aplicarRaioLbl()`: free text (empty = the automatic "Centro · raio N km"), own color/size/halo, and an on/off independent from the `#chipRaio` group toggle — so every place that flips raio visibility must set only `raio-fill`/`raio-borda`/`raio-centro` and then call `aplicarRaioLbl()`.
- **Raio do Mapa de renda** — a **second, independent** circle living in the "Mapa de renda" drawer: state in `rendaRaio` (`{on, km, centro, cor, fill, lbl}`), source `raio-renda`, layers `raior-*`, applied by `atualizarRaioRenda()`/`aplicarRaioRenda()` and synced to the drawer inputs (`#rd*`) by `syncRaioRendaInputs()`. It shares nothing with the Edição raio except `gerarCirculo()`; picking its center on the map uses `pickCentroRenda` (mutually exclusive with `pickCentro`).
- **Censo IBGE 2022** — the income analysis inside that circle. Data is served **one file per state** (`censo/<cod>.json`), catalogued by `censo/manifest.json` (`{ufs:[{uf, cod, nome, arquivo, setores, bbox}]}`). `carregarCenso()` fetches the manifest once, then `censoUFsDoRaio()` picks the states whose bbox the circle reaches (bbox widened by the radius in degrees, so a neighbouring state clipped by the circle's edge still loads) and `censoAnexar()` merges each into `CENSO` (`{mun:{code:name}, s:[[lat,lon,cd_mun,dom,mor,renda_media,renda_mediana]]}`), resizing `censoDist` and invalidating `censoCache`. **Adding a state is adding a file plus a manifest line — no code changes**; `tools/censo_uf.py` (raw IBGE mesh + CSV) or `tools/censo_pacote.py` (pre-joined package) produces both. Loaded today: **SP and BA**.
    - Data-quality note: each state's coverage depends on the geometry source. SP came from *faces de logradouros*, which omit sectors without mapped streets — 90,789 of the 100,928 the income CSV lists (**10% missing, ~964k households**, mostly rural). BA came from the *malha preliminar* (polygons) and is far better: 30,311 of 30,739 (**1.4% missing**). Re-running SP from a proper mesh would fix it. A spot-check confirmed the package data is authentic: 27,845 BA sectors matched the official CSV's income exactly, with zero discrepancies. The whole country would be >6 MB gzipped, which is why it is never loaded at once. `censoStatus` gains `'fora'` for a radius outside every available state, which the panel reports by listing what *is* loaded rather than showing zeros. `censoConsulta(lat, lon, km)` scans all sectors with Haversine, caching distances in a reused `Float32Array`, and aggregates **weighting by `dom`** — a plain mean across sectors would let a 10-household sector count as much as a 500-household one. `renderRenda()` paints the drawer panel; `censoCache` keys on `km|lon|lat` so redraws don't recompute.
  - **The radius cut is by sector centroid**, so a sector straddling the circle counts fully in or fully out. `censoConsulta` therefore also returns `margem`: the share of households living within one local sector-radius (`rs = km/√n`) of the circle's edge — an upper bound on that error. Tiers: ≤5% silent, 5–15% warning, >15% (or fewer than 30 sectors) "radius too small, don't use these numbers". This is why very small radii are unusable: at 500 m in central São Paulo the edge band holds more households than the radius itself.
  - **Map layers** — `censoCamadas(q)` fills source `censo` (one point per sector inside the radius) and drives three layers off it, all above the veil and below the `raior-*` circle so the dashed outline stays readable. Sectors with no income data are dropped, matching the aggregate. All require the radius to be on; points and heat can be on together.
    - `censo-pts` (`rendaRaio.pts`, chip `#chipCensoPts`) — one circle per sector, coloured by income bracket. `censoStepCor()` builds the `step` expression from `censoCores()`, whose stops mirror `censoFaixaIdx()` exactly (both "less than"), so the map colour always matches the bracket the household was counted in. The **same colours paint the drawer's distribution bars**, so that chart doubles as the legend — and each bar's swatch is an `input[type=color]`, making the legend the editor. Custom colours live in `rendaRaio.cores` (`null` = default) and save with the project; two presets are offered, `CENSO_CORES_PADRAO` (traffic-light, the default) and `CENSO_CORES_SEGURA` (YlOrBr, monotonic lightness, the only one that survives greyscale printing and red-green colour blindness). The swatch `oninput` deliberately does **not** call `renderRenda()` — rebuilding the HTML would close the browser's colour picker mid-drag; it repaints the map and patches the one bar instead.
    - `censo-surf` (`rendaRaio.heat` + `heatModo:'renda'`) — the income "heat": big blurred circles carrying the bracket colour, which merge into a smooth surface. **Deliberately not a `heatmap` layer** — heatmap sums weights, so weighting by income would conflate "many households" with "high income". This is a visual smoothing of income, not a density.
    - `censo-heat` (`heatModo:'dens'`) — the real density heatmap (native `heatmap` type), weight = `dom` saturating at 600, ramp `CENSO_HEAT_CORES` (cool→warm, deliberately unlike the income ramp so the two maps don't look alike).
    - `rendaRaio.heatSuav` (0.5–2.5) multiplies both the blur radius and the heatmap kernel, since the right smoothing depends on the radius and on local density — it can't be hardcoded.
  - **The dataset has no polygons**, only centroids — colouring sector *shapes* is impossible without also fetching the IBGE malha; the point cloud is the honest substitute.
  - The drawer legend is HTML, so it does **not** appear in the exported PNG. A map-embedded legend for the point colours is still missing.
  - **Value adjustments** (the two fields above the radius, applied as one `fatorRenda()` multiplier before *everything* — aggregation, brackets, class, point/heat colours — so the panel and the map never disagree). It is part of `censoCache.chave`, so changing either recomputes.
    - `rendaRaio.ipca` (default on) — `carregarIPCA()` fetches **BCB SGS series 433** (IPCA % per month) *in the user's browser* and compounds from **August/2022** (July's own variation is already inside the 31/07/2022 reference) up to **two months before today** (IPCA for month M is published ~the 10th of M+1, so two months is always available). **There is deliberately no baked-in fallback table**: inventing inflation indices would produce confident, wrong money. On failure the panel says so and shows July/2022 values.
    - `rendaRaio.outros` (default 50) — percentage the other residents add to the head's income, so 50% means household income = 1.5× the head's. It is the **user's estimate**, not census data, and the footer says so.
  - Raw values in `CENSO.s` are never mutated; the factor is applied on read.
  - Numbers are **nominal R$ of July 2022** before adjustment, and the census income is the **household head's only**. The panel footer always states which currency month the figures are in and whether the household estimate is on.
- **Upload** — `kmlParaFeats()`/`integrarFeats()`; **Draw** — `drawSetup()`/`drawFinalizar()`; **Export** — `#btnExport` overrides `devicePixelRatio` to render a high-res PNG.
- **Palettes** — `PALETAS` (named color sets: `padrao`/`pb`/`antigo`/`cinza`) + `paletaOps(l, PAL)` (per-layer style ops, shared) drive both `aplicarPaleta(style, palName)` (initial, mutates style JSON) and `recolorLive(palName)` (live, via `setPaintProperty`). The "Cores" button opens a drawer of preset swatches. `paletaOps` skips non-basemap layers (no `source-layer`), so custom sources are untouched.
- **Plan tiers** — `PLANOS` (`free`<`basic`<`pro`<`admin`), `FEATURE_PLANS` (feature → minimum plan; **the only place to edit to gate a feature**), `FEATURE_ELEMENTS` (feature → CSS selectors). `getUserPlano()` reads `user_metadata.plano` OR the highest matching `app_metadata.roles` (set via Netlify Identity "Roles"). `aplicarPlano()` keeps every feature **visible** but marks inaccessible ones `.locked` with a 🔒; a capture-phase click interceptor opens the upgrade window (`abrirUpgrade`) instead of running the action. Badge in header (`#planoBadge`). Client-side gating only (user-editable metadata) — not real security.
  - **Plans window** (`abrirPlanos`, `#planosOverlay`) — reached from the `#planoBadge` in the header, the **Planos** button in Configurações, and **Ver planos** in the locked-feature window. Its content is **generated from `FEATURE_PLANS`**: each card lists only what that tier unlocks, earlier tiers coming in by "Tudo do X, mais". So moving a feature between plans updates the window by itself — there is no parallel list to forget. The cost is a third map to keep filled: **a new feature needs a key in `FEATURE_PLANS`, `FEATURE_ELEMENTS` and `FEATURE_ROTULOS`** (the user-facing name); a feature missing from `FEATURE_ROTULOS` is silently absent from the window. `PLANO_INFO` holds each tier's display name and pitch.
- **Side drawers** — Salvar Projeto, Meus Projetos, Cores, Mapa de renda open as right-side drawers (`.side-drawer`, `#wrap.side-open`) via `abrirGaveta(id)`/`fecharGaveta()`, mirroring the Edição drawer. One open at a time; opening any closes the editor and vice-versa. "Mapa de renda" (`#btnRenda`) is Pro-gated and currently holds only its own Raio (see above). Editor-style rows reused inside a drawer go in a `.sd-sec` wrapper (zeroes their horizontal padding, since the drawer already pads). Compass on the map: `NavigationControl({showCompass:true})`.

## Projects & persistence

`coletarEstado()`/`aplicarEstado()` capture and restore the **styling** state; the **project** system (`coletarProjeto`/`carregarProjeto`/`limparProjetoAtual`) additionally snapshots the full `DATA`/`labelPts`/`grupos`/`CORES` and stores named projects per user in `localStorage['makermap.projetos.<email>']`. **Each session starts blank** — there is no auto-restore; users open a saved project manually via the "Meus Projetos" header menu. `resetPadrao()` returns everything to defaults. When a change alters the shape of a persisted structure (e.g. the roads move from 3 macros to 7 sub-tiers), older saved projects fall back to defaults for that part rather than breaking.

All user data (drawings, KMZ, projects, edits) lives **only in the visitor's browser** — nothing but the Identity auth calls leaves the client.

## Compact Instructions

Ao resumir esta conversa, preserve com prioridade:
1. Decisões de arquitetura e stack já definidas (as descritas acima, e qualquer nova decisão tomada durante a sessão)
2. Estado atual da tarefa: o que já foi implementado, o que está em andamento, o que falta fazer, e PRs abertos aguardando ação
3. Convenções de código e nomenclatura do projeto
4. Bugs conhecidos, soluções já tentadas e o resultado de cada tentativa

Descarte detalhes de exploração que não levaram a decisões finais.
