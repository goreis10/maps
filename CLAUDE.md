# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Maker Map** — a static, client-side web app for managing map areas and exporting presentation images. There is **no backend, no build step, no test suite, no package.json**. The entire product is three files served as-is:

- `index.html` — login/signup landing page (the entry point).
- `app.html` — the map tool itself (~3200 lines, everything inline: HTML + CSS + JS).
- `logo-makermap.png` — brand logo, referenced by `<img src="logo-makermap.png">` in both pages.
- `sp_census_2022.json` — IBGE 2022 census dataset (4.3 MB, 1.2 MB gzipped), **fetched lazily** by the Mapa de renda drawer, never on page load. Not code — data.
- `netlify.toml` — deploy config (`publish = "."`, no build command).

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

External hosts the deployed page depends on (relevant for CSP/network allowlists): `cdnjs.cloudflare.com` (MapLibre GL, JSZip), `tiles.openfreemap.org` (positron basemap style + tiles), `server.arcgisonline.com` (satellite raster), `fonts.googleapis.com`, `nominatim.openstreetmap.org` (address search).

## Authentication (index.html ↔ app.html)

Auth is **Netlify Identity**, called directly over REST (`fetch` to `/.netlify/identity/*`) — no gotrue/widget library. Because of this:

- `index.html` is the gate: signup collects nome/sobrenome/telefone (stored in Identity `user_metadata`), and on login it stores the session in `localStorage` under **`makermap.user`**, then redirects to `app.html`.
- `app.html` has a guard in `<head>` that redirects back to `index.html` if `makermap.user` is absent. This is a client-side gate, not edge security.
- **Identity must be enabled in the Netlify dashboard** and only works on the published site — `/.netlify/identity` does not exist when opening the file locally (`file://`) or on other hosts. Editing the user's own data uses `PUT /.netlify/identity/user` with the bearer token (with a refresh-token retry on 401).

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
- **Censo IBGE 2022** — the income analysis inside that circle. `carregarCenso()` fetches `sp_census_2022.json` **on first use only** (when the renda raio is switched on), into `CENSO` (`{meta, mun:{code:name}, s:[[lat,lon,cd_mun,dom,mor,renda_media,renda_mediana]]}`, 90,789 sectors, SP only). `censoConsulta(lat, lon, km)` scans all sectors with Haversine, caching distances in a reused `Float32Array`, and aggregates **weighting by `dom`** — a plain mean across sectors would let a 10-household sector count as much as a 500-household one. `renderRenda()` paints the drawer panel; `censoCache` keys on `km|lon|lat` so redraws don't recompute.
  - **The radius cut is by sector centroid**, so a sector straddling the circle counts fully in or fully out. `censoConsulta` therefore also returns `margem`: the share of households living within one local sector-radius (`rs = km/√n`) of the circle's edge — an upper bound on that error. Tiers: ≤5% silent, 5–15% warning, >15% (or fewer than 30 sectors) "radius too small, don't use these numbers". This is why very small radii are unusable: at 500 m in central São Paulo the edge band holds more households than the radius itself.
  - **Map layers** — `censoCamadas(q)` fills source `censo` (one point per sector inside the radius) and drives three layers off it, all above the veil and below the `raior-*` circle so the dashed outline stays readable. Sectors with no income data are dropped, matching the aggregate. All require the radius to be on; points and heat can be on together.
    - `censo-pts` (`rendaRaio.pts`, chip `#chipCensoPts`) — one circle per sector, coloured by income bracket. `censoStepCor()` builds the `step` expression from `censoCores()`, whose stops mirror `censoFaixaIdx()` exactly (both "less than"), so the map colour always matches the bracket the household was counted in. The **same colours paint the drawer's distribution bars**, so that chart doubles as the legend — and each bar's swatch is an `input[type=color]`, making the legend the editor. Custom colours live in `rendaRaio.cores` (`null` = default) and save with the project; two presets are offered, `CENSO_CORES_PADRAO` (traffic-light, the default) and `CENSO_CORES_SEGURA` (YlOrBr, monotonic lightness, the only one that survives greyscale printing and red-green colour blindness). The swatch `oninput` deliberately does **not** call `renderRenda()` — rebuilding the HTML would close the browser's colour picker mid-drag; it repaints the map and patches the one bar instead.
    - `censo-surf` (`rendaRaio.heat` + `heatModo:'renda'`) — the income "heat": big blurred circles carrying the bracket colour, which merge into a smooth surface. **Deliberately not a `heatmap` layer** — heatmap sums weights, so weighting by income would conflate "many households" with "high income". This is a visual smoothing of income, not a density.
    - `censo-heat` (`heatModo:'dens'`) — the real density heatmap (native `heatmap` type), weight = `dom` saturating at 600, ramp `CENSO_HEAT_CORES` (cool→warm, deliberately unlike the income ramp so the two maps don't look alike).
    - `rendaRaio.heatSuav` (0.5–2.5) multiplies both the blur radius and the heatmap kernel, since the right smoothing depends on the radius and on local density — it can't be hardcoded.
  - **The dataset has no polygons**, only centroids — colouring sector *shapes* is impossible without also fetching the IBGE malha; the point cloud is the honest substitute.
  - The drawer legend is HTML, so it does **not** appear in the exported PNG. A map-embedded legend for the point colours is still missing.
  - Numbers are **nominal R$ of July 2022** and the income is the **household head's only** (family income runs 1.5–2× higher). Both are stated in the panel footer; don't present them as current or as household income.
- **Upload** — `kmlParaFeats()`/`integrarFeats()`; **Draw** — `drawSetup()`/`drawFinalizar()`; **Export** — `#btnExport` overrides `devicePixelRatio` to render a high-res PNG.
- **Palettes** — `PALETAS` (named color sets: `padrao`/`pb`/`antigo`/`cinza`) + `paletaOps(l, PAL)` (per-layer style ops, shared) drive both `aplicarPaleta(style, palName)` (initial, mutates style JSON) and `recolorLive(palName)` (live, via `setPaintProperty`). The "Cores" button opens a drawer of preset swatches. `paletaOps` skips non-basemap layers (no `source-layer`), so custom sources are untouched.
- **Plan tiers** — `PLANOS` (`free`<`basic`<`pro`<`admin`), `FEATURE_PLANS` (feature → minimum plan; **the only place to edit to gate a feature**), `FEATURE_ELEMENTS` (feature → CSS selectors). `getUserPlano()` reads `user_metadata.plano` OR the highest matching `app_metadata.roles` (set via Netlify Identity "Roles"). `aplicarPlano()` keeps every feature **visible** but marks inaccessible ones `.locked` with a 🔒; a capture-phase click interceptor opens the upgrade window (`abrirUpgrade`) instead of running the action. Badge in header (`#planoBadge`). Client-side gating only (user-editable metadata) — not real security.
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
