# Como o mapa funciona no Maker Map

Este documento explica como o mapa é montado e aplicado no site
(`maker-map.netlify.app`): de onde vêm as peças, em que ordem elas entram, o que
cada camada desenha e o que acontece quando algo falha. Vale para a versão
**3.11**.

Para o detalhe técnico de cada decisão (com o histórico dos defeitos que levaram
a ela), a referência é o `CLAUDE.md`. Para o que mudou em cada versão, o
`CHANGELOG.md`.

---

## 1. Em uma página

- O site é **estático**: não há servidor de aplicação nem banco de dados. Tudo
  acontece no navegador de quem usa.
- O mapa inteiro mora em **um arquivo**, `app.html`. Ele traz o HTML, o estilo e
  o código juntos.
- O motor do mapa é a **MapLibre GL JS 4.7.1**, uma biblioteca aberta que desenha
  o mapa com a placa de vídeo (WebGL).
- O **fundo do mapa** (ruas, rios, nomes de cidades) é o estilo **Positron** do
  **OpenFreeMap**, gratuito e sem chave. Antes de entregar o fundo à MapLibre, o
  site o repinta com a paleta escolhida.
- Por cima do fundo, o site desenha as **suas camadas**: a máscara que destaca as
  áreas, a imagem que veio no KMZ, os raios, o censo, as isócronas, as áreas
  (glebas) e o desenho em andamento.
- O que você importa, desenha e salva **fica só no seu navegador**. Nada disso vai
  para servidor nenhum.
- Publicar é fazer merge no `main` do GitHub. O Netlify põe o site no ar em cerca
  de um minuto.

---

## 2. As peças

### Arquivos do site

| Arquivo | O que é |
|---|---|
| `index.html` | Página de entrada: login e cadastro (Netlify Identity) |
| `app.html` | A ferramenta do mapa inteira |
| `logo-makermap.png` | Logo |
| `censo/` | Dados do Censo IBGE 2022, um arquivo por estado (SP, MG, BA) e um `manifest.json` |
| `netlify/functions/isocrona.mjs` | Função no servidor do Netlify que consulta o OpenRouteService para a isócrona, guardando a chave da API |
| `netlify/functions/ipca.mjs` | Função que busca o IPCA no Banco Central para corrigir a renda |
| `netlify.toml` | Configuração de publicação |

Os arquivos `.md` e a pasta `tools/` ficam no repositório, mas **não são
publicados**.

### Serviços externos que o mapa usa

| Serviço | Para quê | Se falhar |
|---|---|---|
| `cdnjs.cloudflare.com` | Baixa a MapLibre e o JSZip (que lê os KMZ) | O mapa não abre; aparece a tela de erro |
| `tiles.openfreemap.org` | Estilo Positron e os ladrilhos do fundo | Sem o estilo, o mapa não abre; sem ladrilhos, o fundo fica vazio |
| `server.arcgisonline.com` | Imagem de satélite (Esri World Imagery) | Só o modo Satélite fica sem imagem |
| `fonts.googleapis.com` | Fonte Archivo da interface | O texto usa uma fonte reserva |
| `nominatim.openstreetmap.org` | Busca de endereço nos campos de centro | A busca não acha; coordenadas coladas continuam funcionando |
| `api.bcb.gov.br` (e `/api/ipca`) | IPCA para corrigir a renda do censo | O painel diz que não corrigiu e mostra valores de jul/2022 |
| `/api/isocrona` → OpenRouteService | Polígono da isócrona | Mensagem de erro; o polígono anterior continua no mapa |

---

## 3. Como o mapa nasce, passo a passo

1. **Guarda de login.** No topo do `app.html`, um script confere se há sessão
   salva (`makermap.user`). Sem ela, volta para `index.html`. É um controle de
   tela, não de segurança.
2. **Bibliotecas.** O navegador carrega a MapLibre GL 4.7.1 e o JSZip 3.10.1 do
   cdnjs.
3. **Estilo do fundo.** O código baixa o estilo Positron
   (`tiles.openfreemap.org/styles/positron`). Se não conseguir, mostra a tela de
   erro, avisando que a rede pode estar bloqueando o cdnjs ou o OpenFreeMap.
4. **Paleta.** Antes de criar o mapa, `aplicarPaleta()` percorre as camadas do
   Positron e troca as cores pelas da paleta escolhida (o padrão é a *Padrão*).
5. **Criação do mapa.** `new maplibregl.Map(...)` com:
   - enquadramento inicial no **raio de 100 km em volta do Marco Zero (Praça da
     Sé)**, porque a sessão começa vazia;
   - `preserveDrawingBuffer: true`, que permite ler o quadro para exportar a
     imagem;
   - `maxCanvasSize` de **4.096 px**, o teto declarado da exportação;
   - atribuição compacta, bússola e zoom no canto inferior direito, escala métrica
     no inferior esquerdo.
6. **Velocidade do zoom.** `aplicarZoomVel()` aplica a preferência de
   Configurações (lento, médio ou rápido) antes do primeiro giro da roda.
7. **Camadas do produto.** Quando o fundo termina de carregar (evento `load`),
   `montarCamadas()` acrescenta todas as fontes e camadas do produto, na ordem da
   seção 4, e liga os cliques e popups.
8. **Sessão vazia.** Não há restauração automática: as áreas entram por **+ KMZ**,
   por **Desenhar** ou abrindo um projeto em **Meus Projetos**.

---

## 4. A pilha de camadas

A MapLibre desenha as camadas em ordem: a primeira fica no fundo e cada uma
seguinte por cima. Esta é a ordem real, lida do mapa rodando, de baixo para cima:

| # | Camada | Tipo | O que desenha |
|---|---|---|---|
| 1 | `background` e as camadas do Positron | fundo vetorial | terreno, água, vegetação, quadras, prédios, vias, divisas, nomes |
| 2 | `satelite` | imagem raster | satélite Esri, inserido logo abaixo da primeira via. Só aparece no modo Satélite, e assim as vias e nomes ficam por cima da foto |
| 3 | `mascara` | preenchimento | **o véu**: um polígono do mundo inteiro com furos nas áreas ligadas. Escurece tudo, menos as áreas (o "holofote") |
| — | camadas levantadas sobre o véu | — | vias e nomes que você escolhe em **Edição › Sobre a máscara** sobem para cá e ficam claros por cima do véu |
| 4 | `planta-*` | imagem raster | **a imagem do KMZ** (planta humanizada, foto de drone), uma camada por imagem |
| 5 | `raio-*` | preenchimento, linha, ponto, texto | o raio da Edição, com centro e legenda |
| 6 | `censo-heat`, `censo-surf`, `censo-pts` | mapa de calor, círculos | densidade de domicílios, superfície de renda e pontos por setor censitário |
| 7 | `raior-*` | preenchimento, linha, ponto, texto | o raio do Mapa de renda |
| 8 | `isor-*` | preenchimento, linha, ponto, texto | a isócrona do Mapa de renda |
| 9 | `iso-*` | preenchimento, linha, ponto, texto | a isócrona da gaveta Isócrona |
| 10 | `gleba-fill`, `gleba-borda`, `gleba-linha`, `gleba-ponto` | preenchimento, linha, ponto | **as áreas**: preenchimento a 32%, contorno de 2 px, traçados lineares e pontos |
| 11 | `gleba-rotulo` | texto | nome e hectares de cada área (opcional) |
| 12 | `desenho-*` | preenchimento, linha, ponto | o polígono que está sendo desenhado agora |

Três regras ficam desta ordem:

- **As áreas ficam sempre por cima** de tudo o que o produto desenha, para o
  contorno nunca sumir.
- **A imagem do KMZ fica logo acima do véu e abaixo de tudo o mais.** Assim não é
  escurecida, e também não esconde o centro do raio, os pontos do censo nem os
  rótulos da isócrona. O preenchimento da área a tingiria; por isso o import o
  desliga e avisa.
- **Os nomes do fundo ficam abaixo do véu** e escurecem junto com ele, a menos que
  você os levante em *Sobre a máscara*.

---

## 5. O fundo do mapa

### Positron, repintado

O Positron é um estilo **vetorial**: o servidor manda geometrias e nomes, e as
cores são decididas no navegador. É isso que permite ao site trocar a paleta sem
baixar outro mapa.

- **13 paletas** (gaveta **Cores**): Padrão, Light Mosaico, Dark Mosaico, Mosaico
  Moderno, Moderno Claro, Moderno Grafite, P&B, Antigo, Cinza, Zoneamento,
  Contraste, Dark e Daltonismo. Cada uma define as mesmas 21 cores, de `bg` a
  `building`.
- Na abertura, `aplicarPaleta()` repinta o estilo **antes** de criar o mapa. Na
  troca com o mapa aberto, `recolorLive()` repinta camada por camada.
- **A paleta é a base, não a última palavra.** Depois de trocar a paleta, o site
  reaplica o que você ajustou à mão em **Vias** e **Rótulos**, e as caixas de cor
  da seção **Mapa** passam a mostrar as cores novas.
- Só as camadas do fundo são repintadas. As camadas do produto (áreas, raios,
  censo) têm cores próprias e não mudam com a paleta.

### O que a Edição controla no fundo

| Seção | O que faz |
|---|---|
| **Mapa** | liga, desliga e muda a cor de terreno, água, verde, divisas, aeroporto, áreas urbanas e construções |
| **Rótulos** | cor, tamanho e contorno dos nomes, por grupo |
| **Vias** | cor, espessura, opacidade e contorno por tipo de via. O Positron só separa poucos tipos, então os controles sem camada correspondente ficam escondidos |
| **Sobre a máscara** | quais vias e nomes sobem acima do véu, e em que ordem (arrastando) |

### Satélite

O botão **Satélite** liga a camada Esri, inserida logo abaixo da primeira via, e
troca as cores das vias para um contraste próprio. Desligar devolve as cores da
paleta em vigor.

---

## 6. As áreas (glebas)

### De onde vêm

- **+ KMZ**: o JSZip abre o arquivo e `kmlParaFeats()` lê polígonos (com furos),
  linhas e pontos do KML. Cada arquivo vira um **grupo** com o nome do arquivo e
  uma cor do ciclo de cores (escolhido para daltonismo desde a 3.10).
- **Desenhar**: cliques no mapa formam um polígono, que vira um grupo.
- A área em hectares é **calculada** a partir da geometria, descontando os furos.

### Como aparecem

- **Preenchimento** a 32% da cor do grupo, **contorno** de 2 px na cor cheia,
  linhas tracejadas para traçados e círculos para pontos.
- **Máscara (holofote)**: o véu escurece o resto do mundo e deixa as áreas ligadas
  abertas. Cor e opacidade (padrão 55%) estão em **Edição › Máscara**. A opção
  "cobrir também as glebas" escurece as áreas também.
- **Rótulos**: nome e hectares no centro de cada área (chip Rótulos).
- **Popup** ao clicar: nome, grupo e hectares. Os nomes vindos do KMZ são
  "escapados", então um KMZ de terceiros não consegue injetar código.
- O **painel Áreas** liga e desliga cada grupo. Desligar tira do mapa, dos totais
  do cabeçalho e dos furos do véu.

### A imagem do KMZ (3.11)

Se o KMZ traz um `GroundOverlay` (a planta humanizada do Google Earth, por
exemplo), a imagem entra no mapa pelos mesmos quatro cantos que o Google Earth
usa.

- **Tamanho.** Imagens grandes são reduzidas para no máximo 4.096 px no lado
  maior. A planta do CJARDIM, de 9.591 × 9.273 px, entra com 4.096 × 3.960, cerca
  de meio metro por pixel.
- **Níveis de resolução.** A imagem é guardada em meias-resoluções sucessivas, e
  a cada movimento o mapa usa a menor que ainda não precise ser ampliada. Isso
  evita o serrilhado ao afastar. Na exportação, a imagem sobe sozinha para a
  maior resolução.
- **Pertence ao grupo.** Desligar ou excluir o grupo faz o mesmo com a imagem.
  **Edição › Imagens do KMZ** controla mostrar/ocultar e opacidade.

---

## 7. Raios e isócronas

| Geometria | Onde | Como é feita |
|---|---|---|
| **Raio da Edição** | Edição › Raio | círculo calculado no navegador (`gerarCirculo`) em volta de um centro (endereço, coordenada colada ou clique no mapa), com legenda editável |
| **Raio do Mapa de renda** | gaveta Mapa de renda | outro círculo, independente, que define o recorte do censo |
| **Isócrona** | gaveta Isócrona | área alcançável em N minutos pela malha viária real (carro, bicicleta, a pé). Calculada pelo OpenRouteService através da função `/api/isocrona` |
| **Isócrona do Mapa de renda** | gaveta Mapa de renda | segunda isócrona, que pode ser o recorte do censo no lugar do raio |

- **Os raios se atualizam ao vivo**, enquanto você digita.
- **A isócrona só é calculada no botão Calcular**, porque cada cálculo gasta cota
  da API. O polígono fica salvo no projeto e reabre sem nova consulta.
- **As faixas da isócrona** (15 e 30 min, por exemplo) são desenhadas como anéis,
  para a cor no mapa ser exatamente a da legenda.
- **A legenda da isócrona e a das faixas de renda** são desenhadas em *canvas*,
  não em HTML. Por isso elas entram na imagem exportada.
- **Os tempos não consideram trânsito**, e o painel diz isso.

---

## 8. Mapa de renda (Censo IBGE 2022)

- **Dados.** Cada setor censitário é um ponto (o centro do setor) com domicílios,
  moradores e renda do responsável. Existem só os estados com arquivo: **SP, MG e
  BA**.
- **Carregamento.** Os dados de um estado são baixados só quando o recorte o
  alcança; o país inteiro passaria de 6 MB.
- **Agregação.** O site soma os setores cujo centro cai dentro do raio ou da
  isócrona, com **média ponderada por domicílio**. A mediana é calculada entre os
  setores do recorte, também ponderada por domicílio.
- **Ajuste dos valores.** Correção pelo IPCA (série 433 do Banco Central) ou por
  um percentual digitado, e uma estimativa do quanto os demais moradores somam à
  renda. As premissas em vigor aparecem sempre no painel.
- **Camadas no mapa**: pontos por setor coloridos pela faixa de renda, uma
  superfície de renda suavizada e um mapa de calor de densidade de domicílios. A
  cor de cada ponto é sempre a da faixa em que ele foi contado.
- **Avisos.** O painel avisa quando um estado não carregou, quando parte do
  recorte não tem setor (mar ou estado fora da base) e quando o raio é pequeno
  demais para os números valerem.

---

## 9. Exportar

### Imagem (botão Exportar imagem)

- A exportação **redesenha o próprio mapa** em escala maior e grava o quadro.
  Para isso, o código sobrescreve por um instante a densidade de pixels da tela e
  chama `map.resize()`.
- **Ela espera tudo carregar** (ladrilhos, imagem do KMZ na resolução máxima)
  antes de gravar, com limite de 20 segundos.
- **As legendas em canvas** (isócrona e faixas de renda) são compostas por cima,
  na mesma escala.
- **Formato e tamanho.** PNG, JPEG ou WebP, até **4.096 px** no lado maior. A
  proporção é sempre a da janela do mapa: a gaveta mostra o tamanho final antes
  de exportar.
- **A gaveta cobre o mapa sem empurrá-lo**, porque o tamanho do mapa na tela é o
  tamanho da imagem.

### Dados (botão Dados)

Um arquivo **GeoJSON** por camada que está no mapa: áreas, pontos dos rótulos,
raios, isócronas e setores do censo, ou tudo junto. As premissas da renda viajam
dentro do arquivo. A imagem do KMZ não entra, porque não é geometria.

---

## 10. Onde ficam os dados de quem usa

Tudo fica **no navegador**; nada vai para servidor, a não ser o login.

| O quê | Onde | Quando é gravado |
|---|---|---|
| Sessão de login | `localStorage['makermap.user']` | no login |
| Projetos (áreas + estilo do mapa) | `localStorage['makermap.projetos.<email>']` | só em **Salvar Projeto** |
| Imagens dos KMZ dos projetos | IndexedDB `makermap` / `plantas` | junto com **Salvar Projeto** |
| Quadro de Novos Negócios | `localStorage['makermap.negocios.<email>']` | automaticamente, a cada mudança |
| Preferências (seções abertas, zoom, exportação, largura da gaveta) | `localStorage` | ao mudar |

Consequências práticas:

- **Um projeto salvo existe só naquele navegador.** Em outro computador ele não
  aparece, e uma imagem de KMZ que falte é avisada pelo nome.
- **Limpar os dados do navegador apaga os projetos.**
- **A paleta escolhida não é salva no projeto**: ele reabre na Padrão, com as
  cores ajustadas à mão por cima.

---

## 11. Planos

`FEATURE_PLANS` define o plano mínimo de cada recurso (`free` < `basic` < `pro` <
`admin`). O plano vem do Netlify Identity, e vale o maior entre o metadado da
conta e a *Role* dada no painel do Netlify.

- **Recursos travados continuam visíveis**, com um cadeado. Clicar abre a janela
  de planos.
- **Exemplos.** Mapa de renda, Isócrona e Novos Negócios são **Pro**. As seções
  Mapa e Rótulos da Edição são **Basic**. KMZ, desenho, exportação, paletas e
  imagem do KMZ são **Free**.
- **É um controle de tela, não de segurança**: os dados de plano podem ser
  editados por quem conhece o navegador.

---

## 12. Limites conhecidos

- **Sem internet não há mapa.** O fundo e as bibliotecas vêm de servidores
  externos.
- **Censo só em SP, MG e BA.** Um raio que atravessa para outro estado conta só a
  parte coberta, e o painel avisa.
- **O corte do censo é pelo centro do setor.** Um setor na borda conta inteiro ou
  não conta; o painel mede essa margem.
- **Isócrona:** tempos sem trânsito. A cota da API é do dono do site, e o
  endpoint é público, com limites rígidos.
- **Imagem do KMZ:** não entram imagens por endereço da internet, *NetworkLink*
  nem `.kml` solto.
- **O Positron separa poucos tipos de via**, então nem todos os 7 subtipos da
  seção Vias aparecem.

---

## 13. Para quem vai mexer no código

O `app.html` começa com um **ÍNDICE DO ARQUIVO** que aponta a função de cada
parte. As principais:

| Parte | Funções |
|---|---|
| Criação do mapa | `fetch(... positron)` → `aplicarPaleta()` → `new maplibregl.Map` → `montarCamadas()` |
| Paletas | `PALETAS`, `paletaOps()`, `aplicarPaleta()`, `recolorLive()` |
| Véu | `construirMascara()`, `aplicarFiltros()` |
| Vias e rótulos | `classificarTiers()`, `aplicarTierEstilo()`, `aplicarLbl()`, `tierAcima()`, `aplicarPilhaAcima()` |
| KMZ | `kmlParaFeats()`, `integrarFeats()`, `kmlParaPlantas()`, `plantaAdicionar()` |
| Raios | `gerarCirculo()`, `atualizarRaio()`, `atualizarRaioRenda()` |
| Isócrona | `buscarIsocrona()`, `atualizarIso()`, `isoFaixas()`, `isoFeicoes()` |
| Censo | `carregarCenso()`, `censoConsulta()`, `censoAgregar()`, `censoCamadas()`, `renderRenda()` |
| Exportação | `expGerar`, `expPrever()`, `baixarBlob()`, `geoBaixar()` |
| Projetos | `coletarProjeto()`, `carregarProjeto()`, `coletarEstado()`, `aplicarEstado()` |
| Planos | `FEATURE_PLANS`, `FEATURE_ELEMENTS`, `FEATURE_ROTULOS`, `aplicarPlano()` |

Antes de publicar:

1. Rodar a checagem de sintaxe dos scripts (o comando está no `CLAUDE.md`).
2. Passar por uma revisão dedicada.
3. Depois do merge no `main`, conferir o deploy no Netlify.

Desde a 3.11 dá para rodar o mapa num Chromium automatizado, com as bibliotecas
servidas localmente. O fundo fica vazio, mas o código do produto roda de verdade.
