# Plano — Mapa de isócrona

Documento de trabalho. Não é nota de versão (isso é o `CHANGELOG.md`) nem
instrução permanente (isso é o `CLAUDE.md`). Serve para executar a implementação
em etapas e saber, em cada ponto, o que já está decidido e o que falta.

A Netlify remove `*.md` do que é publicado, então este arquivo não vai ao ar.

---

## O que vamos construir

Uma **isócrona** é a área alcançável em X minutos de deslocamento a partir de um
ponto — "até onde dá em 20 minutos de carro daqui". Não é um círculo: é um
polígono irregular, recortado pelas estradas reais.

**Escopo decidido:** a isócrona é um mapa por si só. Ela desenha e pronto.
A análise de renda é um **botão dentro dela**, que pode ficar desligado.
Portanto a implementação vai em duas etapas que podem ser publicadas separadas —
a primeira entrega valor sozinha.

| Etapa | Entrega | Versão |
|---|---|---|
| 1 | A isócrona desenha no mapa, com minutos, modal e cores editáveis | **2.3** |
| 2 | Botão **Renda** dentro da isócrona: o Censo passa a somar dentro do polígono | **2.4** |
| 3 | Acabamento: legenda no mapa, cache, limites de uso | **2.5** |

Se preferir publicar tudo de uma vez, é `3.0` — a isócrona é subsistema novo e
traz a primeira função serverless do projeto, o que encaixa na regra de `X.0` do
`CLAUDE.md`. Em duas etapas, `2.3` e `2.4`.

---

## Etapa 0 — Pré-requisitos (dependem de você)

Nada de código começa antes disto, porque o serviço de roteamento é externo e
pede credencial.

### 0.1 — Conta no OpenRouteService

Criar conta em `openrouteservice.org` e gerar uma API key.

Por que ORS e não outro:

- **Mapbox Isochrone** tem cota melhor, mas os termos exigem que o resultado
  apareça sobre mapas Mapbox. Nosso basemap é OpenFreeMap. Ficaria irregular.
- **Valhalla** é o motor por trás de várias dessas APIs e pode ser auto
  hospedado sem chave, mas aí viramos donos de um servidor com o grafo de
  estradas do Brasil na memória. É outro projeto.
- **TravelTime / HERE** são bons e pagos desde o começo.
- **ORS** usa dados do OpenStreetMap, tem plano gratuito, perfis de carro,
  caminhão, bicicleta e pé, e aceita várias faixas de tempo numa só chamada.

Confira as cotas no painel deles na hora de criar a conta — mudam de tempo em
tempo e não vale eu chutar número aqui.

### 0.2 — Variável de ambiente na Netlify

No painel: **Site configuration → Environment variables → Add a variable**.

- Nome: `ORS_API_KEY`
- Valor: a chave
- Escopo: pode deixar em todos (functions é o que importa)

Me diga o nome exato que você cadastrou. Se mudar de `ORS_API_KEY`, muda no
código também.

### 0.3 — Aceitar que o projeto deixa de ser 100% estático

A chave **não pode** ir para o `app.html`: o arquivo é público e qualquer
visitante leria. A saída é uma **Netlify Function** — um arquivo de servidor
que guarda a chave e repassa a chamada. O navegador fala só com o nosso
domínio.

Consequências honestas:

- O `CLAUDE.md` hoje afirma "no backend". Vira "um endpoint só, sem estado".
- Passa a existir um `netlify/functions/` para manter.
- Em compensação, a **lista de hosts externos do visitante não muda**: ele
  continua falando com `tiles.openfreemap.org`, `cdnjs`, `nominatim`, `bcb` e o
  nosso domínio. Quem fala com o ORS é a Netlify.

---

## Etapa 1 — A isócrona como mapa (versão 2.3)

### 1.1 — A função serverless

Criar `netlify/functions/isocrona.js`.

O que faz: recebe `lon`, `lat`, `perfil` e `minutos`; chama
`POST https://api.openrouteservice.org/v2/isochrones/<perfil>` com
`Authorization: <ORS_API_KEY>`; devolve o GeoJSON como veio.

**O endpoint é público** — qualquer um que descobrir a URL gasta a sua cota.
Então ele valida tudo antes de repassar:

- `perfil` só pode ser um de `driving-car`, `driving-hgv`, `cycling-regular`,
  `foot-walking`. Qualquer outra coisa, 400.
- `minutos`: no máximo 4 faixas, cada uma entre 1 e 120.
- `lon`/`lat` dentro da caixa do Brasil (`-74..-34`, `-34..6`). Fora, 400.
- Checagem de `Origin`/`Referer` contra o domínio do site. É proteção fraca
  (dá para falsificar), mas filtra o uso casual e custa duas linhas.
- Erro do ORS volta com o status dele e uma mensagem curta, nunca o corpo
  inteiro — a resposta do ORS pode citar a chave em alguns erros.

### 1.2 — Impedir que o código da função seja servido

**Pegadinha real.** O `netlify.toml` tem `publish = "."`, ou seja, publica a
raiz do repositório. Com isso, `netlify/functions/isocrona.js` ficaria
acessível como arquivo estático em `/netlify/functions/isocrona.js`.

A chave não está no código (está no ambiente), então não é vazamento de
credencial — mas é entregar o mapa das validações para quem quiser
contorná-las.

Não dá para resolver com `rm -rf ./netlify` no `command`, como foi feito com
`tools/`: o `command` roda **antes** do empacotamento das funções, e apagar a
pasta apagaria a própria função. A saída é um redirect:

```toml
[functions]
  directory = "netlify/functions"

[[redirects]]
  from = "/netlify/*"
  to = "/404.html"
  status = 404
  force = true
```

Isto precisa ser verificado no site publicado abrindo
`/netlify/functions/isocrona.js` e confirmando o 404. Não há como testar aqui.

### 1.3 — Estado e fonte no `app.html`

Espelhar a estrutura que já existe para o raio do Mapa de renda — ela é o
molde, e seguir o molde é o que mantém o arquivo navegável.

Novo bloco de estado, ao lado de `RENDA_PADRAO` (hoje na linha 1490):

```js
const ISO_PADRAO = {
  on:false,
  centro:CENTRO_SE.slice(),
  perfil:'driving-car',   // carro | caminhão | bicicleta | pé
  minutos:[15,30,45],     // até 4 faixas; ORS devolve um polígono por faixa
  cores:null,             // cor por faixa; null = padrão
  fill:true,
  poly:null,              // o GeoJSON devolvido — guardado, não recalculado
  calculadoEm:null,       // timestamp, para o painel dizer de quando é
  lbl:{on:true, texto:'', cor:'#6B21A8', tam:1, halo:true, haloCor:'#FFFFFF', haloW:1.6}
};
```

`poly` guardado no estado é deliberado: cada cálculo é uma chamada de API com
cota. Reabrir um projeto **não** deve gastar chamada nova.

Fonte e camadas em `montarCamadas()`, logo depois do bloco `raior-*`
(hoje linhas 1098–1112), mantendo a mesma lógica de z-order: acima do véu,
abaixo das glebas.

```
iso-fill    fill    uma cor por faixa de tempo (expressão step em 'faixa')
iso-borda   line    contorno
iso-centro  circle  o ponto de origem
iso-rotulo  symbol  "30 min de carro", legenda editável
```

As faixas vêm aninhadas (a de 15 min está dentro da de 30). Desenhar da maior
para a menor com opacidade baixa dá o efeito de camadas de cebola sem precisar
de recorte geométrico.

### 1.4 — Gaveta e controles

Novo chip `#btnIso` no `#ctrl` (ao lado de `#btnRenda`, hoje linha 512) e nova
gaveta `#drawerIso`, registrada em `abrirGaveta()` (linha 2638). Conteúdo:

- chip **Isócrona** liga/desliga o desenho
- modal: segmented control carro / caminhão / bicicleta / pé
- faixas de tempo: até quatro campos de minutos
- centro: lat/lon, busca por endereço (reusa o que o raio de renda já faz com
  o Nominatim) e "clicar no mapa" via `pickCentroIso`
- cor por faixa, preenchimento, legenda editável (mesmo padrão do `rdLbl*`)
- botão **Calcular isócrona**

**`pickCentroIso` tem de ser mutuamente exclusivo com `pickCentro` e
`pickCentroRenda`.** Hoje são dois flags se excluindo aos pares; com três, vale
trocar por um único `pickAtivo = null|'raio'|'renda'|'iso'`. É refatoração
pequena e evita o bug de dois modos de clique ligados ao mesmo tempo.

### 1.5 — O botão Calcular, e por que ele existe

O raio atualiza **ao vivo**: você digita 12 km e o círculo muda. A isócrona
**não pode** fazer isso — cada mudança seria uma chamada paga. Então:

- mexer em minutos, perfil ou centro só marca o estado como "sujo";
- a gaveta mostra *"parâmetros mudaram — recalcule"*;
- o polígono só é refeito no clique em **Calcular isócrona**.

Durante a chamada, o botão vira "Calculando…" e trava. Falha de rede ou cota
estourada mostra a mensagem do erro e **mantém o polígono anterior** — não
apaga o que estava na tela.

### 1.6 — Persistência e plano

- `coletarEstado()` (linha 2204) e `aplicarEstado()` (2236): incluir `iso`.
  Projeto antigo sem a chave cai no padrão, como manda a convenção do arquivo.
- `coletarProjeto()` (4046) / `carregarProjeto()` (4084): o `iso.poly` entra no
  snapshot do projeto.
- Gating: `FEATURE_PLANS.isocrona = 'pro'` (2435),
  `FEATURE_ROTULOS.isocrona = 'Mapa de isócrona'` (2464),
  `FEATURE_ELEMENTS.isocrona = ['#btnIso']` (2498). **São três mapas** — faltar
  no `FEATURE_ROTULOS` faz o recurso desaparecer calado da janela de Planos.
- Índice do arquivo: nova linha no bloco "ÍNDICE DO ARQUIVO" no topo.

### 1.7 — Exportação

Não precisa de nada: as camadas são do mapa, então o PNG de alta resolução já
sai com a isócrona. A legenda da gaveta é HTML e **não** sai — mesma limitação
que o Mapa de renda já tem.

### 1.8 — A ressalva honesta

A isócrona do ORS é calculada com velocidades de fluxo livre, **sem trânsito**.
"30 minutos" é 30 minutos de madrugada. Numa ferramenta comercial isso tem de
estar escrito, do mesmo jeito que o painel de renda diz que a renda dos demais
moradores é estimativa sua. Rodapé da gaveta:

> Tempos calculados sobre a malha viária do OpenStreetMap, **sem considerar
> trânsito**. Em horário de pico a área real é menor.

---

## Etapa 2 — O botão Renda dentro da isócrona (versão 2.4)

Aqui está o ganho de verdade. "Quantos domicílios e qual a renda a 20 minutos
de carro daqui" é uma pergunta muito melhor que "num raio de 10 km", porque é a
pergunta que o cliente faz.

### 2.1 — Ponto em polígono (não existe no código hoje)

Novo helper, `pontoEmPoligono(lon, lat, poly)`, por ray casting. Precisa tratar:

- **MultiPolygon** — uma isócrona pode vir em pedaços desconexos (uma ilha, o
  outro lado de um rio sem ponte no raio de tempo);
- **buracos** — anéis internos contam como fora;
- **pré-filtro por bounding box** antes do teste caro, porque vai rodar contra
  dezenas de milhares de setores.

### 2.2 — Refatorar `censoConsulta` em duas peças

Hoje `censoConsulta(lat, lon, raioKm)` (linha 2974) faz duas coisas no mesmo
laço: decide quem está dentro, e agrega. A versão de polígono precisa da
segunda metade igual e da primeira diferente.

Então separar:

- `censoSelecionarRaio(lat, lon, km)` → `{idx, distancias}`
- `censoSelecionarPoly(poly)` → `{idx}`
- `censoAgregar(idx, contexto)` → todo o resto: domicílios, pessoas, média e
  mediana ponderadas por `dom`, faixas, municípios, classe

**Isto não é zelo estético.** Duas cópias da agregação é exatamente o tipo de
coisa que produziu o defeito do calor de densidade: uma regra mudou num lugar e
não no outro, e o painel passou a discordar do mapa por 17%. Uma função, dois
chamadores.

### 2.3 — Quais UFs baixar

`censoUFsDoRaio()` (2893) calcula a caixa a partir de centro + raio. Generalizar
para `censoUFsDaCaixa(bbox)` e fazer os dois casos chamarem: o raio monta a
caixa do círculo, a isócrona usa a caixa do próprio polígono.

Cuidado com a regra que já está documentada: `carregarCenso()` tem de continuar
alcançável depois da primeira carga, senão mover a isócrona para outro estado
mostra "nenhum setor" para sempre. O guard é `censoStatus!=='carregando'`,
nunca `'vazio'`.

### 2.4 — A margem de erro precisa de outra fórmula

Hoje:

```js
var rs = raioKm/Math.sqrt(dentro);   // raio médio de um setor
```

Vem de "área do círculo dividida por n setores". **Pressupõe círculo** e não
vale para um polígono irregular. A generalização:

```
área do polígono A (fórmula esférica)
raio médio do setor  rs = sqrt(A / (pi * n))
margem = domicílios em setores a menos de rs da BORDA do polígono
```

A distância até a borda é distância ponto-segmento contra todas as arestas.
Centenas de vértices × milhares de setores é da ordem de 10⁵–10⁶ operações:
roda sem travar, mas vale medir antes de botar no caminho crítico de cada
redesenho.

Os três patamares continuam: ≤5% silencioso, 5–15% aviso, >15% ou menos de 30
setores "não use estes números".

### 2.5 — Uma fonte, dois donos

As camadas `censo-pts`, `censo-surf` e `censo-heat` leem a fonte `censo`. Se o
raio e a isócrona puderem preenchê-la, as duas análises brigam pela mesma
fonte.

Decisão: um estado `censoOrigem = 'raio' | 'iso'`. Quem foi ligado por último
manda; a outra gaveta mostra *"a análise está na isócrona"* com um link para
trazer de volta. **Não duplicar as três camadas** — seriam seis camadas e duas
cópias de `censoCamadas()` para divergirem com o tempo.

### 2.6 — O painel precisa falar a língua certa

`renderRenda()` (3076) narra "raio de N km" em vários pontos. Com a isócrona
ligada, tem de dizer "isócrona de 30 min de carro". O texto sai para uma função
`censoTituloOrigem()` e os dois casos passam por ela — mesmo motivo do 2.2.

A densidade (`domicílios por km²`) continua valendo, mas a área agora é a do
polígono, não `pi*r²`.

---

## Etapa 3 — Acabamento (versão 2.5)

- **Legenda no mapa** para as faixas de tempo e para as cores de renda. Hoje
  toda legenda é HTML na gaveta e não sai no PNG exportado — é a lacuna mais
  antiga do Mapa de renda e vale resolver para os dois de uma vez.
- **Cache de chamadas** no `localStorage`, com chave
  `perfil|minutos|lat(4)|lon(4)`. Recalcular a mesma isócrona duas vezes é
  gastar cota de graça.
- **Contador de uso** na gaveta, para você saber quanto da cota já foi.
- **Comparar isócrona com círculo**: desenhar os dois e mostrar as duas somas
  lado a lado. É o argumento de venda da ferramenta — mostra na tela que o
  círculo mente.

---

## O que não vou conseguir testar aqui

Esta parte vale ser dita antes de começar, não depois:

- O proxy deste ambiente bloqueia boa parte dos hosts externos, e funções
  Netlify não rodam aqui. A chamada ao ORS só pode ser exercitada **no site
  publicado**.
- O mapa também não roda aqui (precisa de navegador e do login da Netlify).
- Portanto a verificação continua sendo: raciocínio sobre o código, o check de
  sintaxe dos `<script>` inline, revisão por subagente dedicado antes do merge,
  e **o seu teste visual depois do deploy**.

Para a Etapa 2, dá para fazer melhor: a lógica de ponto-em-polígono e de
agregação é JavaScript puro, sem mapa e sem rede. Vale extrair e rodar contra
casos de teste aqui mesmo — polígono com buraco, MultiPolygon, setor exatamente
na aresta, polígono cruzando divisa de estado. Foi assim que a correção do calor
de densidade foi conferida de verdade, em vez de "parece certo".

---

## Resumo do que falta de você

1. Criar a conta no OpenRouteService e gerar a chave.
2. Cadastrar a chave como variável de ambiente na Netlify e me dizer o nome.
3. Confirmar que aceita a Netlify Function (o projeto deixa de ser puramente
   estático).
4. Dizer se as faixas de tempo padrão (15 / 30 / 45 min, carro) servem ou se
   o seu uso pede outras.
