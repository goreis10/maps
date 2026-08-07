# MakerMap — Ferramenta de Gestão de Mapas e Apresentação

**MakerMap** (originalmente chamada MOSAICO) é uma **aplicação web estática** que permite criar, editar e exportar mapas personalizados para apresentações de empreendimentos imobiliários, com foco em análise de áreas, visualização de renda, e gestão de dados geoespaciais.

## Características

- ✅ **Sem backend** — tudo roda no navegador; dados do usuário nunca deixam o dispositivo
- ✅ **Sem build** — servido como arquivo estático (3 arquivos HTML/PNG)
- ✅ **Sem dependências NPM** — bibliotecas vêm via CDN (MapLibre GL, JSZip, Google Fonts)
- ✅ **Autenticação** — login/signup com Netlify Identity
- ✅ **Upload KMZ** — importa polígonos de áreas (KMZ/KML)
- ✅ **Desenho no mapa** — cria polígonos manualmente
- ✅ **Edição visual** — cores, camadas, raio, máscara spotlight
- ✅ **Paletas de cores** — presets (padrão, P&B, antigo, cinza, zoneamento, dark mode)
- ✅ **Projetos salvos** — por usuário, no `localStorage`
- ✅ **Exportação** — captura mapa em alta resolução PNG com carimbo de data
- ✅ **Sistema de planos** — free/basic/pro/admin, com features gated por tier

## Estrutura de Arquivos

```
.
├── index.html          # Página de login/signup (Netlify Identity)
├── app.html            # Aplicação principal (~2300 linhas, inline HTML+CSS+JS)
├── logo-makermap.png   # Logo da marca
├── netlify.toml        # Config de deploy contínuo (Netlify)
├── CLAUDE.md           # Documentação técnica para desenvolvimento
└── README.md           # Este arquivo
```

## Como funciona

### 1. Autenticação (index.html → app.html)
- Usuário faz signup com nome, sobrenome e telefone
- Login retorna token, armazenado em `localStorage['makermap.user']`
- Redirect automático para `app.html`
- App.html verifica token; sem token, redireciona de volta

### 2. Dados no Mapa
Os dados começam vazios; vêm de:
- **Upload KMZ** — importa polígonos de áreas (glebas)
- **Desenho** — cria polígonos ao clicar no mapa (mín. 3 vértices)
- Todos os polígonos ficam em `DATA` (FeatureCollection GeoJSON)

### 3. Edição Visual
O painel de **Edição** (drawer lateral) oferece:
- **Por cidade** / **Por área** — grupo e cor os polígonos
- **Mapa** — liga/desliga e coloriza camadas (terreno, água, verde, etc.)
- **Rótulos** — tamanho e cor dos textos no mapa
- **Raio** — cria círculo de raio customizável
- **Máscara** — véu spotlight com furos nas áreas selecionadas
- **Vias** — cor, espessura e contorno de rodovias/avenidas/ruas
- **Sobre a máscara** — pilha de camadas que aparecem sobre o véu

### 4. Projetos (Pro+)
- **Salvar Projeto** — snapshots nome + áreas + edições (cores, raio, etc.)
- **Meus Projetos** — lista salvos, com abrir/excluir
- Armazenados em `localStorage['makermap.projetos.<email>']`

### 5. Exportação
- Captura mapa em **alta resolução** (override de `devicePixelRatio`)
- PNG com carimbo: `MOSAICO_mapa_AAAA-MM-DD_Nx.png`

## Planos (Plan Tiers)

| Plano | Custo | Acesso |
|-------|-------|--------|
| **free** | Grátis | Desenho, exportação básica, raio, máscara, "Por cidade/área" |
| **basic** | $ | Free + upload KMZ, Mapa, Rótulos, Vias, Sobre a máscara |
| **pro** | $$ | Basic + projetos salvos, Mapa de renda |
| **admin** | $$$ | Pro + todos os recursos |

Novos signups recebem **`free`** automaticamente. Acesso é controlado via `user_metadata.plano` (ou `app_metadata.roles`) no Netlify Identity — **client-side gating only** (não é real security).

## Estilo do Mapa

- **Base** — OpenFreeMap Positron (vetor)
- **Satélite** — ArcGIS Raster (híbrido)
- **Paletas** — 6 presets customizáveis:
  - Padrão
  - P&B (preto e branco)
  - Antigo
  - Cinza
  - Zoneamento urbano
  - Dark mode

Paletas são aplicadas por `paletaOps()` na carga e por `recolorLive()` em tempo real.

## Tecnologias

- **Mapa** — [MapLibre GL](https://maplibre.org/) (WebGL, open-source)
- **Dados** — [GeoJSON](https://geojson.org/) (polígonos)
- **Tiles** — OpenFreeMap positron + ArcGIS satellite
- **Autenticação** — Netlify Identity REST API
- **Compressão** — [JSZip](https://stuk.github.io/jszip/) (KMZ → JSON)
- **CSS** — Inline, responsivo, light/dark mode
- **JS** — ES5+, sem transpilação; roda direto no navegador

## Deploy

Hospedado no **Netlify** (`maker-map.netlify.app`), com deploy contínuo:
- Toda push para `main` publica automaticamente (~1 min)
- `netlify.toml` configura `publish = "."` (raiz, sem build step)

## Desenvolvimento Local

Não é possível exercer a aplicação **localmente** porque:
1. Autenticação (Netlify Identity) requer `/.netlify/identity`, que só existe no Netlify
2. Sem autenticação, não há acesso ao `app.html`

Verificação de código:
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

## Hosts Externos Necessários

Para o deploy funcionar, o CDN/navegador do usuário precisa alcançar:

- `cdnjs.cloudflare.com` — MapLibre GL, JSZip
- `tiles.openfreemap.org` — positron basemap style + tiles
- `server.arcgisonline.com` — satélite raster
- `fonts.googleapis.com` — fontes customizadas
- `nominatim.openstreetmap.org` — busca de endereços (autocomplete)

## Documentação Técnica

Para detalhes sobre arquitetura, funções-chave e convenções de código, veja:
- **[CLAUDE.md](./CLAUDE.md)** — guia completo para desenvolvedores (subsistemas, planos, persistência)

## Histórico de PRs

Todas as features foram entregues em PRs separadas, mergeadas na `main`:

1. Página de gestão + deploy Netlify
2. Edição em gaveta + configurações
3. Logo MakerMap
4. Máscara spotlight, exportação
5. "Sobre a máscara"
6. Grupos: área em m², lixeira
7. Projetos por usuário (Meus Projetos)
8. Editar dados da conta
9. Painel: % e legenda
10. Vias: % e colunas
11. Seção Mapa (cores do fundo)
12. Construções (buildings)
13. Vias: contorno + subníveis
14. Vias e Rótulos: grid alinhado
15. Gaveta redimensionável
16. "Sobre a máscara" arrastável
17. Paletas: zoneamento, contraste, dark mode
18. Sistema de planos (free/basic/pro/admin)

---

**Criado em:** 2026-07-29  
**Última atualização:** com base na branch `claude/map-management-page-tmez61`
