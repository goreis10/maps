# O mapa do Maker Map

O Maker Map (`maker-map.netlify.app`) é uma ferramenta para montar mapas de
apresentação de áreas e loteamentos: importar o KMZ, destacar as áreas, desenhar
raios e isócronas, cruzar com a renda do Censo e exportar a imagem. Este documento
tem duas partes:

- **Parte 1 — Passo a passo.** Como colocamos o mapa dentro do app, na ordem em
  que foi feito, com o código de cada passo e um exemplo completo que funciona.
- **Parte 2 — Como funciona hoje.** A referência do mapa na versão **3.11**: as
  peças, a pilha de camadas, o que cada parte faz e o que acontece quando algo
  falha.

---

# Parte 1 — Passo a passo: como colocamos o mapa no app

Esta parte é um roteiro para quem quer fazer o mesmo: um mapa interativo dentro de
um site, com as suas próprias áreas, sem servidor de mapas, sem chave de API e sem
etapa de build. Os passos seguem a ordem em que o Maker Map foi construído.

O código de cada passo vem de um **exemplo completo e funcional**, que está no fim
deste documento (Apêndice) e também vai anexo como `exemplo-mapa.html`. É o Maker
Map reduzido ao essencial: ~270 linhas, um arquivo só. O exemplo foi rodado num
navegador de verdade antes de entrar aqui, abrindo o KMZ de um loteamento real:
paleta aplicada, área de 85 ha calculada, véu com furo, planta posicionada pelos
quatro cantos, raio de 10 km exatos e PNG exportado em 3×.

**Para rodar o exemplo:** salve o `exemplo-mapa.html` e sirva a pasta por HTTP,
por exemplo com `npx serve` ou `python3 -m http.server`, abrindo
`http://localhost:8000/exemplo-mapa.html`. Abrir com dois cliques (`file://`)
pode funcionar, mas alguns navegadores bloqueiam o carregamento do estilo assim.

---

## Passo 1 — Escolher as peças

Decidimos três coisas antes de escrever uma linha:

| Peça | Escolha | Por quê |
|---|---|---|
| Motor do mapa | **MapLibre GL JS** (4.7.1) | aberta, gratuita, desenha com a placa de vídeo e aceita estilo vetorial. É o fork aberto da Mapbox GL |
| Fundo do mapa | **OpenFreeMap**, estilo **Positron** | gratuito, sem chave e sem limite de uso declarado. O Positron é claro e discreto, bom para o fundo não competir com as áreas |
| Hospedagem | **Netlify**, site estático | o site é só arquivo; publicar é fazer merge no GitHub |

Fundo **vetorial** foi a escolha que mais rendeu: o servidor manda geometria e
nomes, e as cores são decididas no navegador. Foi isso que permitiu ter 13
paletas sem baixar 13 mapas.

---

## Passo 2 — A página

Um `<div>` que ocupa a tela, a folha de estilo da MapLibre, a MapLibre e o JSZip
(que vai abrir os KMZ), os dois de CDN e com **versão fixa**. Versão fixa porque
uma atualização da biblioteca não pode mudar o seu mapa sem você saber.

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mapa — exemplo</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min.css">
<style>
  html, body { margin: 0; height: 100%; font-family: system-ui, sans-serif; }
  #map { position: absolute; inset: 0; }
  #barra { position: absolute; top: 12px; left: 12px; z-index: 1; display: flex; gap: 6px; }
  #barra button, #barra label { background: #fff; border: 1px solid #ccc; border-radius: 6px;
                                padding: 6px 10px; font: inherit; cursor: pointer; }
</style>
</head>
<body>
<div id="map"></div>
<div id="barra">
  <label>+ KMZ <input id="kmz" type="file" accept=".kmz,.kml" hidden></label>
  <button id="btnMascara">Máscara</button>
  <button id="btnSatelite">Satélite</button>
  <button id="btnRaio">Raio 10 km</button>
  <button id="btnPng">Exportar PNG</button>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
```

---

## Passo 3 — Baixar o estilo e repintar antes de criar o mapa

O estilo do mapa é um JSON com uma lista de camadas (água, parques, vias,
nomes…). Em vez de passar o endereço do estilo direto para a MapLibre, nós o
**baixamos com `fetch`, trocamos as cores e só então criamos o mapa**. Assim o
mapa já nasce na paleta certa, sem piscar nas cores originais.

Cada camada do Positron diz de que tipo de dado ela é em `source-layer` (`water`,
`park`, `landuse`, `transportation`, `place`…). É por ela que se decide a cor:

```js
const PALETA = {
  fundo: '#F6F4F1', agua: '#CFE0F5', verde: '#DCE8D2', quadras: '#ECE8E1',
  rodovia: '#F2A65A', via: '#FFFFFF', texto: '#5A564F'
};
function repintar(style, P) {
  for (const l of style.layers) {
    const sl = l['source-layer'];
    if (l.type === 'background')                l.paint = { ...l.paint, 'background-color': P.fundo };
    else if (sl === 'water' && l.type === 'fill') l.paint = { ...l.paint, 'fill-color': P.agua };
    else if (sl === 'park' && l.type === 'fill')  l.paint = { ...l.paint, 'fill-color': P.verde };
    else if (sl === 'landuse' && l.type === 'fill') l.paint = { ...l.paint, 'fill-color': P.quadras };
    else if (sl === 'transportation' && l.type === 'line')
      l.paint = { ...l.paint, 'line-color': /motorway/.test(l.id) ? P.rodovia : P.via };
    else if (l.type === 'symbol' && l.layout && l.layout['text-field'])
      l.paint = { ...l.paint, 'text-color': P.texto };
  }
  return style;
}
```

No Maker Map, a mesma ideia virou 13 paletas de 21 cores cada, e uma função
(`recolorLive`) que troca a paleta com o mapa já aberto, camada por camada, com
`map.setPaintProperty`.

---

## Passo 4 — Criar o mapa

```js
async function iniciar() {
  const resp = await fetch('https://tiles.openfreemap.org/styles/positron');
  if (!resp.ok) throw new Error('estilo ' + resp.status);
  const style = repintar(await resp.json(), PALETA);
  map = new maplibregl.Map({
    container: 'map',
    style,
    center: [-46.6333, -23.5505],   // Praça da Sé
    zoom: 9,
    preserveDrawingBuffer: true,    // permite ler o quadro para exportar
    maxCanvasSize: [4096, 4096]     // teto do tamanho da imagem exportada
  });
  map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
  map.on('load', montarCamadas);
}
```

Duas opções que parecem detalhe e não são:

- **`preserveDrawingBuffer: true`** guarda o último quadro desenhado. Sem ela, a
  imagem lida para exportar pode sair em branco.
- **`maxCanvasSize`** é o teto do tamanho do quadro. Declaramos o valor (4.096)
  em vez de deixar o padrão da biblioteca, porque a tela de exportação **prevê**
  o tamanho do arquivo a partir dele.

---

## Passo 5 — As nossas camadas, na ordem certa

Tudo o que é nosso entra **depois** que o fundo carrega (evento `load`). Cada
coisa é uma **fonte** (os dados, em GeoJSON) mais uma ou mais **camadas** (como
desenhar).

A regra que governa tudo: **a MapLibre desenha na ordem em que as camadas
entram**, cada uma por cima da anterior. O `addLayer` aceita um segundo
argumento, o id da camada **antes** da qual a nova deve entrar; é assim que se
põe algo no meio da pilha.

```js
function montarCamadas() {
  // satélite: abaixo da primeira via, para vias e nomes ficarem por cima da foto
  map.addSource('esri', {
    type: 'raster', tileSize: 256, maxzoom: 19, attribution: 'Imagem © Esri',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}']
  });
  const primeiraVia = map.getStyle().layers.find(l => l['source-layer'] === 'transportation');
  map.addLayer({ id: 'satelite', type: 'raster', source: 'esri', layout: { visibility: 'none' } },
               primeiraVia && primeiraVia.id);

  // a máscara (o "véu" com furos nas áreas)
  map.addSource('mascara', { type: 'geojson', data: mascara() });
  map.addLayer({ id: 'mascara', type: 'fill', source: 'mascara', layout: { visibility: 'none' },
                 paint: { 'fill-color': '#1C1917', 'fill-opacity': 0.55 } });

  // o raio
  map.addSource('raio', { type: 'geojson', data: RAIO });
  map.addLayer({ id: 'raio-borda', type: 'line', source: 'raio',
                 paint: { 'line-color': '#1D4FA8', 'line-width': 2, 'line-dasharray': [3, 2] } });

  // as áreas, por último: ficam por cima de tudo
  map.addSource('areas', { type: 'geojson', data: AREAS });
  map.addLayer({ id: 'area-fill', type: 'fill', source: 'areas',
                 paint: { 'fill-color': ['get', 'cor'], 'fill-opacity': 0.32 } });
  map.addLayer({ id: 'area-borda', type: 'line', source: 'areas',
                 paint: { 'line-color': ['get', 'cor'], 'line-width': 2 } });

  // passo 9: popup com o nome — como TEXTO, nunca como HTML
  map.on('click', 'area-fill', e => {
    const p = e.features[0].properties;
    const div = document.createElement('div');
    div.textContent = `${p.nome} · ${p.ha.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ha`;
    new maplibregl.Popup().setLngLat(e.lngLat).setDOMContent(div).addTo(map);
  });
}
```

A ordem que adotamos, de baixo para cima:

1. **o fundo** do mapa;
2. **o satélite**, logo abaixo da primeira via, para vias e nomes ficarem por
   cima da foto;
3. **o véu (máscara)**;
4. **a imagem do KMZ**;
5. **os raios**;
6. **as áreas, por último**, para o contorno nunca sumir.

A cor de cada área vem dos próprios dados (`['get', 'cor']`): uma camada só
pinta todas as áreas, cada uma na sua cor.

---

## Passo 6 — Ler o KMZ

Um **KMZ é um ZIP** com um arquivo KML dentro (e, às vezes, imagens). O JSZip
abre o ZIP; o KML é XML, e o próprio navegador o lê com `DOMParser`. Cada
`<Polygon>` vira uma feição GeoJSON.

```js
function lerCoords(txt) {
  return (txt || '').trim().split(/\s+/).map(s => s.split(',').map(Number))
    .filter(c => isFinite(c[0]) && isFinite(c[1])).map(c => [c[0], c[1]]);
}
function areaAssinada(a) {           // > 0 = anti-horário (lon para leste, lat para norte)
  let s = 0;
  for (let i = 0; i < a.length - 1; i++) s += a[i][0] * a[i + 1][1] - a[i + 1][0] * a[i][1];
  return s / 2;
}
function orientar(anel, horario) {   // contorno anti-horário, furo horário
  return (areaAssinada(anel) < 0) === horario ? anel : anel.slice().reverse();
}
function hectares(anel) {            // aproximação plana local, boa para glebas
  const lat0 = anel[0][1] * Math.PI / 180, mx = 111320 * Math.cos(lat0), my = 110540;
  return Math.abs(areaAssinada(anel.map(c => [c[0] * mx, c[1] * my]))) / 10000;
}

let zipAtual = null;
async function lerArquivo(arquivo) {
  let kml;
  zipAtual = null;
  if (/\.kmz$/i.test(arquivo.name)) {
    zipAtual = await JSZip.loadAsync(arquivo);
    const entrada = Object.values(zipAtual.files).find(f => /\.kml$/i.test(f.name));
    if (!entrada) throw new Error('KMZ sem KML dentro');
    kml = await entrada.async('string');
  } else {
    kml = await arquivo.text();
  }
  const doc = new DOMParser().parseFromString(kml, 'text/xml');
  for (const poly of doc.getElementsByTagName('Polygon')) {
    const anel = no => lerCoords(no && no.getElementsByTagName('coordinates')[0]?.textContent);
    const externo = anel(poly.getElementsByTagName('outerBoundaryIs')[0]);
    if (externo.length < 4) continue;
    const furos = [...poly.getElementsByTagName('innerBoundaryIs')].map(anel).filter(f => f.length >= 4);
    const nome = poly.closest('Placemark')?.getElementsByTagName('name')[0]?.textContent || arquivo.name;
    AREAS.features.push({
      type: 'Feature',
      properties: { nome, cor: '#0072B2', ha: furos.reduce((s, f) => s - hectares(f), hectares(externo)) },
      geometry: { type: 'Polygon', coordinates: [orientar(externo, false), ...furos.map(f => orientar(f, true))] }
    });
  }
  map.getSource('areas').setData(AREAS);
  map.getSource('mascara').setData(mascara());
  await lerImagens(doc);
  enquadrar();
}
```

Dois cuidados que só aprendemos com arquivos reais:

- **Leia os furos** (`innerBoundaryIs`). Sem eles, a área de uma gleba com
  reserva ou enclave sai maior do que é.
- **Acerte o sentido dos anéis.** A MapLibre decide se um anel é furo ou outro
  polígono pelo **sentido** em que ele gira, não pela posição na lista. Um furo
  no mesmo sentido do contorno vira um segundo polígono preenchido, e aparece
  como uma mancha mais escura. O Google Earth não padroniza isso; por isso a
  função `orientar` força contorno anti-horário e furo horário.

---

## Passo 7 — O véu (o "holofote")

O efeito de destacar as áreas e escurecer o resto é **um único polígono**: um
retângulo do tamanho do mundo, com um furo no formato de cada área. Pintado
escuro e semitransparente, ele cobre tudo, menos as áreas.

```js
function mascara() {
  const mundo = orientar([[-179.9, -85], [179.9, -85], [179.9, 85], [-179.9, 85], [-179.9, -85]], false);
  const furos = AREAS.features.filter(f => f.geometry.type === 'Polygon')
    .map(f => orientar(f.geometry.coordinates[0], true));
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [mundo, ...furos] } };
}
```

O mesmo cuidado do passo 6: o mundo gira num sentido e os furos no outro. Toda
vez que uma área entra, sai ou é desligada, o véu é recalculado com
`setData(mascara())`.

---

## Passo 8 — O raio

Um círculo "de verdade" no mapa não é um círculo na tela: a projeção do mapa
estica as latitudes. Por isso o raio é calculado como **181 pontos sobre a
esfera**, cada um a exatamente N km do centro (fórmula do destino a partir de
distância e rumo):

```js
function gerarCirculo(km, centro) {
  const R = 6371.0088, d = km / R;
  const lat1 = centro[1] * Math.PI / 180, lon1 = centro[0] * Math.PI / 180;
  const anel = [];
  for (let i = 0; i <= 180; i++) {
    const brg = i * 2 * Math.PI / 180;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brg));
    const lon2 = lon1 + Math.atan2(Math.sin(brg) * Math.sin(d) * Math.cos(lat1),
                                   Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
    anel.push([lon2 * 180 / Math.PI, lat2 * 180 / Math.PI]);
  }
  return anel;
}
```

No exemplo, o botão desenha 10 km em volta do centro da tela; o teste mediu os
181 pontos e todos estão a 10,000 km do centro.

---

## Passo 9 — Clique e popup, sem abrir brecha

O nome de uma área vem do KMZ, ou seja, de **quem mandou o arquivo**. Se ele for
posto como HTML num popup, um KMZ malicioso pode rodar código na sua página e
ler o que estiver guardado nela (no nosso caso, a sessão de login). Por isso o
popup recebe **texto**, não HTML: o `div.textContent` do passo 5.

No Maker Map, onde o popup precisa de formatação, todo nome passa por uma função
que "escapa" os caracteres especiais antes de entrar no HTML.

---

## Passo 10 — A imagem que vem dentro do KMZ

O Google Earth permite pôr uma **imagem posicionada** sobre o terreno (uma planta
humanizada, uma foto de drone). No KML ela é um `<GroundOverlay>` com a imagem e
os quatro cantos. A MapLibre tem uma fonte própria para isso: `type: 'image'`,
com os quatro cantos.

```js
async function reduzir(blob, max = 4096) {
  const bmp = await createImageBitmap(blob);
  const f = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas');
  cv.width = Math.round(bmp.width * f);
  cv.height = Math.round(bmp.height * f);
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  bmp.close();
  return new Promise(ok => cv.toBlob(ok, 'image/png'));
}

async function lerImagens(doc) {
  if (!zipAtual) return;
  let n = 0;
  for (const go of doc.getElementsByTagName('GroundOverlay')) {
    const href = go.getElementsByTagName('href')[0]?.textContent.trim();
    const quad = go.getElementsByTagNameNS('*', 'LatLonQuad')[0];
    const entrada = href && zipAtual.file(href);
    if (!entrada || !quad) continue;
    const p = lerCoords(quad.getElementsByTagName('coordinates')[0]?.textContent);
    if (p.length !== 4) continue;
    // KML: anti-horário a partir do canto INFERIOR esquerdo.
    // MapLibre: horário a partir do canto SUPERIOR esquerdo.
    const cantos = [p[3], p[2], p[1], p[0]];
    const url = URL.createObjectURL(await reduzir(await entrada.async('blob')));
    const id = 'imagem-' + (n++);
    if (map.getLayer(id)) { map.removeLayer(id); map.removeSource(id); }
    map.addSource(id, { type: 'image', url, coordinates: cantos });
    map.addLayer({ id, type: 'raster', source: id, paint: { 'raster-fade-duration': 0 } }, 'raio-borda');
  }
}
```

As três armadilhas desta parte:

- **A ordem dos cantos.** O KML (`gx:LatLonQuad`) lista os cantos em sentido
  anti-horário a partir do **inferior esquerdo**; a MapLibre quer sentido horário
  a partir do **superior esquerdo**. Por isso `[p[3], p[2], p[1], p[0]]`.
  Conferimos projetando o perímetro do próprio KMZ sobre a imagem: com qualquer
  outra ordem, ele não cai em cima do desenho.
- **O tamanho.** Uma planta de 9.591 px passa do limite de textura da placa de
  vídeo e aparece como um **quadrado preto**, sem erro nenhum. Este exemplo
  caiu exatamente nisso no primeiro teste, e por isso existe a função
  `reduzir`.
- **O serrilhado ao afastar.** A MapLibre não gera versões menores da imagem
  (mipmaps). Uma imagem de 4.096 px mostrada a 600 px na tela fica serrilhada.
  No Maker Map a imagem é guardada em várias resoluções e o mapa troca para a
  adequada ao fim de cada movimento. O exemplo não faz isso, para ficar curto.

---

## Passo 11 — Exportar a imagem em alta resolução

O truque: dizer ao navegador, por um instante, que a tela tem **N vezes mais
pixels** (`devicePixelRatio`), pedir à MapLibre que se redimensione, esperar ela
terminar de desenhar tudo (`idle`) e gravar o quadro. O enquadramento não muda;
só a resolução. Depois tudo volta ao normal.

```js
async function exportarPNG(escala) {
  const original = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
  Object.defineProperty(window, 'devicePixelRatio', { get: () => escala, configurable: true });
  try {
    map.resize();   // redesenha o mapa N× maior, sem mudar o enquadramento
    await new Promise(ok => {
      const limite = setTimeout(ok, 20000);
      map.once('idle', () => { clearTimeout(limite); ok(); });
    });
    const blob = await new Promise(ok => map.getCanvas().toBlob(ok, 'image/png'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mapa.png';
    a.click();
    return blob;
  } finally {     // devolve a tela ao normal mesmo se algo falhar
    if (original) Object.defineProperty(window, 'devicePixelRatio', original);
    else delete window.devicePixelRatio;
    map.resize();
  }
}
```

- **O `finally` é essencial.** Sem ele, uma falha no meio deixaria a tela presa
  em N× para sempre.
- **O limite de 20 segundos também.** Se um ladrilho nunca terminar de carregar,
  a exportação não fica pendurada.
- **No teste**, uma janela de 1.200 × 800 em 3× gerou um PNG de 3.600 × 2.400, e
  a tela voltou a 1×.

As legendas do Maker Map são desenhadas em `<canvas>`, e não em HTML, por causa
deste passo: o PNG é o quadro do mapa, e HTML nenhum entra nele.

---

## Passo 12 — Guardar o trabalho de quem usa

Não temos banco de dados: tudo fica **no navegador** de quem usa.

| O quê | Onde | Por quê |
|---|---|---|
| Projetos (áreas e estilo) | `localStorage`, em JSON, separados por conta | simples e síncrono |
| Imagens dos KMZ | `IndexedDB` | o `localStorage` tem uns 5 MB para tudo, e uma planta reduzida sozinha passa disso |

A consequência é que um projeto existe só no navegador em que foi salvo. Para o
nosso uso (montar a imagem de uma apresentação) isso bastou; para trabalho em
equipe, seria preciso um servidor.

---

## Passo 13 — Publicar

1. **Hospedagem.** O site é estático: o Netlify serve a pasta do repositório como
   está (`publish = "."` no `netlify.toml`).
2. **Deploy.** Cada merge no `main` do GitHub publica sozinho, em cerca de um
   minuto.
3. **Chaves de API.** Onde um serviço exige chave (a isócrona usa o
   OpenRouteService), a chave **não pode ir para a página**. Criamos uma função
   no Netlify (`netlify/functions/isocrona.mjs`) que guarda a chave numa variável
   de ambiente e faz a chamada pelo site. A página chama `/api/isocrona`, no
   nosso próprio domínio.

---

## O que levaríamos para o próximo projeto

- **Fixar a versão de toda biblioteca de CDN.**
- **Baixar e repintar o estilo antes de criar o mapa.**
- **Pensar a ordem das camadas logo no começo**: as áreas, que são o assunto, por
  cima de tudo.
- **Normalizar o sentido dos anéis de todo polígono que vem de fora.**
- **Tratar todo texto vindo de arquivo do usuário como texto, nunca como HTML.**
- **Reduzir imagens antes de virarem textura.**
- **Testar com arquivo real num navegador de verdade.** O quadrado preto do
  passo 10 passou em todas as checagens de código e só apareceu na captura de
  tela.

---

## Apêndice — o exemplo completo (`exemplo-mapa.html`)

<details>
<summary>Abrir o código completo</summary>

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mapa — exemplo</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min.css">
<style>
  html, body { margin: 0; height: 100%; font-family: system-ui, sans-serif; }
  #map { position: absolute; inset: 0; }
  #barra { position: absolute; top: 12px; left: 12px; z-index: 1; display: flex; gap: 6px; }
  #barra button, #barra label { background: #fff; border: 1px solid #ccc; border-radius: 6px;
                                padding: 6px 10px; font: inherit; cursor: pointer; }
</style>
</head>
<body>
<div id="map"></div>
<div id="barra">
  <label>+ KMZ <input id="kmz" type="file" accept=".kmz,.kml" hidden></label>
  <button id="btnMascara">Máscara</button>
  <button id="btnSatelite">Satélite</button>
  <button id="btnRaio">Raio 10 km</button>
  <button id="btnPng">Exportar PNG</button>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<script>
// ── Passo 3: a paleta ────────────────────────────────────────────────
const PALETA = {
  fundo: '#F6F4F1', agua: '#CFE0F5', verde: '#DCE8D2', quadras: '#ECE8E1',
  rodovia: '#F2A65A', via: '#FFFFFF', texto: '#5A564F'
};
function repintar(style, P) {
  for (const l of style.layers) {
    const sl = l['source-layer'];
    if (l.type === 'background')                l.paint = { ...l.paint, 'background-color': P.fundo };
    else if (sl === 'water' && l.type === 'fill') l.paint = { ...l.paint, 'fill-color': P.agua };
    else if (sl === 'park' && l.type === 'fill')  l.paint = { ...l.paint, 'fill-color': P.verde };
    else if (sl === 'landuse' && l.type === 'fill') l.paint = { ...l.paint, 'fill-color': P.quadras };
    else if (sl === 'transportation' && l.type === 'line')
      l.paint = { ...l.paint, 'line-color': /motorway/.test(l.id) ? P.rodovia : P.via };
    else if (l.type === 'symbol' && l.layout && l.layout['text-field'])
      l.paint = { ...l.paint, 'text-color': P.texto };
  }
  return style;
}

// ── Passos 4 e 5: criar o mapa e as nossas camadas ───────────────────
const AREAS = { type: 'FeatureCollection', features: [] };
const RAIO  = { type: 'FeatureCollection', features: [] };
let map;

async function iniciar() {
  const resp = await fetch('https://tiles.openfreemap.org/styles/positron');
  if (!resp.ok) throw new Error('estilo ' + resp.status);
  const style = repintar(await resp.json(), PALETA);
  map = new maplibregl.Map({
    container: 'map',
    style,
    center: [-46.6333, -23.5505],   // Praça da Sé
    zoom: 9,
    preserveDrawingBuffer: true,    // permite ler o quadro para exportar
    maxCanvasSize: [4096, 4096]     // teto do tamanho da imagem exportada
  });
  map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
  map.on('load', montarCamadas);
}

function montarCamadas() {
  // satélite: abaixo da primeira via, para vias e nomes ficarem por cima da foto
  map.addSource('esri', {
    type: 'raster', tileSize: 256, maxzoom: 19, attribution: 'Imagem © Esri',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}']
  });
  const primeiraVia = map.getStyle().layers.find(l => l['source-layer'] === 'transportation');
  map.addLayer({ id: 'satelite', type: 'raster', source: 'esri', layout: { visibility: 'none' } },
               primeiraVia && primeiraVia.id);

  // a máscara (o "véu" com furos nas áreas)
  map.addSource('mascara', { type: 'geojson', data: mascara() });
  map.addLayer({ id: 'mascara', type: 'fill', source: 'mascara', layout: { visibility: 'none' },
                 paint: { 'fill-color': '#1C1917', 'fill-opacity': 0.55 } });

  // o raio
  map.addSource('raio', { type: 'geojson', data: RAIO });
  map.addLayer({ id: 'raio-borda', type: 'line', source: 'raio',
                 paint: { 'line-color': '#1D4FA8', 'line-width': 2, 'line-dasharray': [3, 2] } });

  // as áreas, por último: ficam por cima de tudo
  map.addSource('areas', { type: 'geojson', data: AREAS });
  map.addLayer({ id: 'area-fill', type: 'fill', source: 'areas',
                 paint: { 'fill-color': ['get', 'cor'], 'fill-opacity': 0.32 } });
  map.addLayer({ id: 'area-borda', type: 'line', source: 'areas',
                 paint: { 'line-color': ['get', 'cor'], 'line-width': 2 } });

  // passo 9: popup com o nome — como TEXTO, nunca como HTML
  map.on('click', 'area-fill', e => {
    const p = e.features[0].properties;
    const div = document.createElement('div');
    div.textContent = `${p.nome} · ${p.ha.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ha`;
    new maplibregl.Popup().setLngLat(e.lngLat).setDOMContent(div).addTo(map);
  });
}

// ── Passo 6: ler o KMZ ───────────────────────────────────────────────
function lerCoords(txt) {
  return (txt || '').trim().split(/\s+/).map(s => s.split(',').map(Number))
    .filter(c => isFinite(c[0]) && isFinite(c[1])).map(c => [c[0], c[1]]);
}
function areaAssinada(a) {           // > 0 = anti-horário (lon para leste, lat para norte)
  let s = 0;
  for (let i = 0; i < a.length - 1; i++) s += a[i][0] * a[i + 1][1] - a[i + 1][0] * a[i][1];
  return s / 2;
}
function orientar(anel, horario) {   // contorno anti-horário, furo horário
  return (areaAssinada(anel) < 0) === horario ? anel : anel.slice().reverse();
}
function hectares(anel) {            // aproximação plana local, boa para glebas
  const lat0 = anel[0][1] * Math.PI / 180, mx = 111320 * Math.cos(lat0), my = 110540;
  return Math.abs(areaAssinada(anel.map(c => [c[0] * mx, c[1] * my]))) / 10000;
}

let zipAtual = null;
async function lerArquivo(arquivo) {
  let kml;
  zipAtual = null;
  if (/\.kmz$/i.test(arquivo.name)) {
    zipAtual = await JSZip.loadAsync(arquivo);
    const entrada = Object.values(zipAtual.files).find(f => /\.kml$/i.test(f.name));
    if (!entrada) throw new Error('KMZ sem KML dentro');
    kml = await entrada.async('string');
  } else {
    kml = await arquivo.text();
  }
  const doc = new DOMParser().parseFromString(kml, 'text/xml');
  for (const poly of doc.getElementsByTagName('Polygon')) {
    const anel = no => lerCoords(no && no.getElementsByTagName('coordinates')[0]?.textContent);
    const externo = anel(poly.getElementsByTagName('outerBoundaryIs')[0]);
    if (externo.length < 4) continue;
    const furos = [...poly.getElementsByTagName('innerBoundaryIs')].map(anel).filter(f => f.length >= 4);
    const nome = poly.closest('Placemark')?.getElementsByTagName('name')[0]?.textContent || arquivo.name;
    AREAS.features.push({
      type: 'Feature',
      properties: { nome, cor: '#0072B2', ha: furos.reduce((s, f) => s - hectares(f), hectares(externo)) },
      geometry: { type: 'Polygon', coordinates: [orientar(externo, false), ...furos.map(f => orientar(f, true))] }
    });
  }
  map.getSource('areas').setData(AREAS);
  map.getSource('mascara').setData(mascara());
  await lerImagens(doc);
  enquadrar();
}

// ── Passo 7: a máscara ───────────────────────────────────────────────
function mascara() {
  const mundo = orientar([[-179.9, -85], [179.9, -85], [179.9, 85], [-179.9, 85], [-179.9, -85]], false);
  const furos = AREAS.features.filter(f => f.geometry.type === 'Polygon')
    .map(f => orientar(f.geometry.coordinates[0], true));
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [mundo, ...furos] } };
}

// ── Passo 8: o raio ──────────────────────────────────────────────────
function gerarCirculo(km, centro) {
  const R = 6371.0088, d = km / R;
  const lat1 = centro[1] * Math.PI / 180, lon1 = centro[0] * Math.PI / 180;
  const anel = [];
  for (let i = 0; i <= 180; i++) {
    const brg = i * 2 * Math.PI / 180;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brg));
    const lon2 = lon1 + Math.atan2(Math.sin(brg) * Math.sin(d) * Math.cos(lat1),
                                   Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
    anel.push([lon2 * 180 / Math.PI, lat2 * 180 / Math.PI]);
  }
  return anel;
}

// ── Passo 10: a imagem que vem no KMZ ────────────────────────────────
// A placa de vídeo tem um tamanho máximo de textura (4.096 a 16.384 px,
// conforme o aparelho). Uma planta de 9.591 px passa disso e vira um
// QUADRADO PRETO, sem erro nenhum. Por isso a imagem é reduzida antes.
async function reduzir(blob, max = 4096) {
  const bmp = await createImageBitmap(blob);
  const f = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas');
  cv.width = Math.round(bmp.width * f);
  cv.height = Math.round(bmp.height * f);
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  bmp.close();
  return new Promise(ok => cv.toBlob(ok, 'image/png'));
}

async function lerImagens(doc) {
  if (!zipAtual) return;
  let n = 0;
  for (const go of doc.getElementsByTagName('GroundOverlay')) {
    const href = go.getElementsByTagName('href')[0]?.textContent.trim();
    const quad = go.getElementsByTagNameNS('*', 'LatLonQuad')[0];
    const entrada = href && zipAtual.file(href);
    if (!entrada || !quad) continue;
    const p = lerCoords(quad.getElementsByTagName('coordinates')[0]?.textContent);
    if (p.length !== 4) continue;
    // KML: anti-horário a partir do canto INFERIOR esquerdo.
    // MapLibre: horário a partir do canto SUPERIOR esquerdo.
    const cantos = [p[3], p[2], p[1], p[0]];
    const url = URL.createObjectURL(await reduzir(await entrada.async('blob')));
    const id = 'imagem-' + (n++);
    if (map.getLayer(id)) { map.removeLayer(id); map.removeSource(id); }
    map.addSource(id, { type: 'image', url, coordinates: cantos });
    map.addLayer({ id, type: 'raster', source: id, paint: { 'raster-fade-duration': 0 } }, 'raio-borda');
  }
}

function enquadrar() {
  const b = new maplibregl.LngLatBounds();
  AREAS.features.forEach(f => f.geometry.coordinates[0].forEach(c => b.extend(c)));
  if (!b.isEmpty()) map.fitBounds(b, { padding: 80, maxZoom: 16 });
}

// ── Passo 11: exportar a imagem ──────────────────────────────────────
async function exportarPNG(escala) {
  const original = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
  Object.defineProperty(window, 'devicePixelRatio', { get: () => escala, configurable: true });
  try {
    map.resize();   // redesenha o mapa N× maior, sem mudar o enquadramento
    await new Promise(ok => {
      const limite = setTimeout(ok, 20000);
      map.once('idle', () => { clearTimeout(limite); ok(); });
    });
    const blob = await new Promise(ok => map.getCanvas().toBlob(ok, 'image/png'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mapa.png';
    a.click();
    return blob;
  } finally {     // devolve a tela ao normal mesmo se algo falhar
    if (original) Object.defineProperty(window, 'devicePixelRatio', original);
    else delete window.devicePixelRatio;
    map.resize();
  }
}

// ── Botões ───────────────────────────────────────────────────────────
const alternar = id => map.setLayoutProperty(id, 'visibility',
  map.getLayoutProperty(id, 'visibility') === 'none' ? 'visible' : 'none');
document.getElementById('kmz').onchange = e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (f) lerArquivo(f).catch(err => alert('Não consegui ler: ' + err.message));
};
document.getElementById('btnMascara').onclick  = () => alternar('mascara');
document.getElementById('btnSatelite').onclick = () => alternar('satelite');
document.getElementById('btnRaio').onclick = () => {
  const c = map.getCenter();
  RAIO.features = [{ type: 'Feature', properties: {},
                     geometry: { type: 'Polygon', coordinates: [gerarCirculo(10, [c.lng, c.lat])] } }];
  map.getSource('raio').setData(RAIO);
};
document.getElementById('btnPng').onclick = () => exportarPNG(3);

iniciar().catch(err => {
  document.body.insertAdjacentHTML('beforeend',
    '<p style="position:absolute;top:60px;left:12px">O mapa não carregou: sem internet, ou a rede bloqueia o cdnjs/OpenFreeMap.</p>');
  console.error(err);
});
</script>
</body>
</html>
```

</details>

---

# Parte 2 — Como o mapa funciona hoje no Maker Map


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
