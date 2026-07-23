# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Maker Map** — a static, client-side web app for managing map areas and exporting presentation images. There is **no backend, no build step, no test suite, no package.json**. The entire product is three files served as-is:

- `index.html` — login/signup landing page (the entry point).
- `app.html` — the map tool itself (~2300 lines, everything inline: HTML + CSS + JS).
- `logo-makermap.png` — brand logo, referenced by `<img src="logo-makermap.png">` in both pages.
- `netlify.toml` — deploy config (`publish = "."`, no build command).

Deployed to Netlify (project **maker-map**, `maker-map.netlify.app`) with continuous deployment from `main`: **merging to `main` publishes the live site automatically** (~1 min). There is no other release process.

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
- **Raio** — `gerarCirculo()`/`atualizarRaio()` around `centroRaio`; **Upload** — `kmlParaFeats()`/`integrarFeats()`; **Draw** — `drawSetup()`/`drawFinalizar()`; **Export** — `#btnExport` overrides `devicePixelRatio` to render a high-res PNG.

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
