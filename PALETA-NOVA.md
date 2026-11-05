# Paleta nova — folha de preenchimento

Preencha a coluna **Sua cor** e me devolva este arquivo. Com ele eu crio a paleta,
o botão na gaveta **Cores** e as notas de versão.

**Formato:** hexadecimal de 6 dígitos, com `#` — `#1D1D1B`. Maiúsculas ou
minúsculas, tanto faz. **Não** use `rgb(...)`, `#RGB` de três dígitos, nem
`#RRGGBBAA` com transparência: o seletor de cor do navegador descarta os três em
silêncio e o mapa vira preto sem avisar.

**Não precisa preencher tudo.** Deixe em branco o que não quiser decidir e eu
derivo da sua base, dizendo no código qual foi a conta — do mesmo jeito que a
água das paletas Mosaico é derivada do azul da marca.

---

## Parte 1 — A paleta (21 cores)

Em ordem de prioridade: do que domina a tela ao que aparece só em detalhe. Os três
blocos seguem a estrutura dos seus próprios documentos de marca — base, linhas,
texto.

### Bloco 1 — Base: fundo e superfícies

As oito maiores áreas do mapa. São elas que dão o "tom" da imagem exportada.

| # | Chave | O que pinta no mapa | Hoje (Padrão) | **Sua cor** |
|---|---|---|---|---|
| 1 | `bg` | **O fundo de tudo.** A cor dominante — comece por ela | `#F6F4F1` | |
| 2 | `landcover` | Cobertura do solo não-verde: areia, rocha, solo exposto | `#EEF0E9` | |
| 3 | `landuse` | **Áreas urbanas** — as "quadras" das cidades. Grande em mapa urbano | `#F1EEE9` | |
| 4 | `water` | Área de água: lagos, represas, mar, rio largo | `#CFE0F5` | |
| 5 | `grass` | Vegetação: grama, mata, bosque | `#E7EDE2` | |
| 6 | `park` | Área de parque | `#DDE8DA` | |
| 7 | `building` | **Prédios.** Só do zoom 12 para cima; grande em zoom de cidade | `#E6E3DF` | |
| 8 | `aeroway` | Pistas de aeroporto | `#EDE8E1` | |

### Bloco 2 — Linhas: vias e divisas

Cada via tem **duas** cores: a linha e o contorno por baixo dela, que é o que a
separa do fundo. O contorno costuma ser um tom mais escuro (mapa claro) ou mais
claro (mapa escuro) que a própria via.

| # | Chave | O que pinta no mapa | Hoje (Padrão) | **Sua cor** |
|---|---|---|---|---|
| 9 | `motorway` | **Rodovias** (motorway + trunk). A linha mais forte do mapa | `#F5C9B8` | |
| 10 | `motorwayCasing` | Contorno das rodovias | `#E0A98F` | |
| 11 | `major` | **Arteriais:** primárias, secundárias, terciárias | `#FFFFFF` | |
| 12 | `majorCasing` | Contorno das arteriais | `#E0DAD3` | |
| 13 | `boundary` | **Divisas** municipais e estaduais | `#C9C2BA` | |
| 14 | `waterway` | Rio e canal desenhados como linha, não como área | `#BBD3F0` | |

### Bloco 3 — Texto

| # | Chave | O que pinta no mapa | Hoje (Padrão) | **Sua cor** |
|---|---|---|---|---|
| 15 | `placeCity` | **Nome de cidade e capital.** O texto que se lê primeiro | `#1C1917` | |
| 16 | `roadText` | Nome de via | `#6B6560` | |
| 17 | `placeOther` | Nome de vila, bairro, distrito | `#8A8F98` | |
| 18 | `waterText` | Nome de água | `#7FA6D9` | |
| 19 | `parkText` | Nome de parque | `#5F7A5C` | |
| 20 | `symbol` | Qualquer outro rótulo que sobre | `#8A8F98` | |
| 21 | `halo` | **O contorno atrás do texto**, que o separa do fundo. Quase sempre é o próprio fundo, ou branco em mapa claro | `#FFFFFF` | |

> O `halo` vale para nome de água, de parque, de via e para os rótulos avulsos.
> **Nome de cidade não tem halo** — ele é desenhado sem contorno de propósito, para
> não engordar o texto que mais importa.

### O que a paleta esconde, e por isso não tem cor

Não precisa escolher nada para estes: o mapa simplesmente não os desenha, para o
PNG não ficar poluído.

- ferrovia, transporte sobre trilhos e linha de balsa
- ruas locais e vias de serviço (e os nomes delas)
- pontos de interesse e número de porta

---

## Antes de me devolver: as regras que a verificação aplica

Rodo isso automaticamente e te aviso se algo não passar — mas se já vier dentro,
subimos de primeira.

| Regra | Por quê |
|---|---|
| `placeCity` contra `bg`: **≥ 3:1** | nome de cidade ilegível é um mapa que o cliente não lê |
| `roadText` contra `bg`: **≥ 3:1** | idem para nome de via |
| `halo` contra `roadText`: **≥ 3:1** | halo da cor do texto engrossa a letra em vez de separá-la |
| `motorway` ≠ `motorwayCasing` | contorno igual à via é o mesmo que não ter contorno |
| `building` contra `landuse`: entre **1,05:1 e 2,2:1** | prédio discreto. O produto é um holofote sobre as glebas; prédio é contexto |
| Em mapa escuro, `building` contra `bg`: **< 4:1** | era o defeito da 3.7.2 — prédio quase branco saltando no fundo escuro |
| `building` com saturação **< 20%** | prédio tingido pelo acento da paleta chama mais atenção que as glebas |
| Contorno do prédio entre **1,03:1 e 1,6:1** do preenchimento | é um fio, não um desenho. Eu derivo esse contorno; você não precisa escolhê-lo |

Se quiser contrariar qualquer uma delas de propósito, diga — eu afrouxo a
verificação para esta paleta e escrevo no código que foi decisão sua, em vez de
deixar parecendo descuido.

## E mais três coisas que eu preciso

| | **Sua resposta** |
|---|---|
| **Nome da paleta**, 2 ou 3 palavras, como vai aparecer na gaveta | |
| **Subtítulo**, 4 a 8 palavras (ex.: "grafite e laranja, do Modelo Moderno") | |
| É paleta **clara** ou **escura**? | |

---

## Parte 2 — Opcional: o que não faz parte da paleta

Estas cores existem no produto mas **não** são controladas por paleta nenhuma —
são padrões em outros lugares do código, ou escolhas que o usuário faz e que ficam
salvas no projeto. Mexer nelas é uma mudança separada.

**Deixe em branco se não quiser mexer agora.** Preencher aqui muda o padrão para
todo mundo, em qualquer paleta.

### Geometrias do produto

| O quê | Onde aparece | Hoje | **Sua cor** |
|---|---|---|---|
| Véu da máscara | o escurecido em volta das glebas | `#1C1917` | |
| Círculo do raio (Edição) | o círculo e seu centro | `#337FFF` | |
| Rótulo do raio (Edição) | texto e contorno | `#1C1917` / `#FFFFFF` | |
| Círculo do raio (Mapa de renda) | independente do de cima | `#0E9F8A` | |
| Rótulo do raio de renda | texto e contorno | `#0A6E60` / `#FFFFFF` | |

### Faixas de renda — 7 cores

A escala atual é a **YlOrBr** (ColorBrewer), clara → escura de forma monotônica.
Ela é o padrão desde a 3.0 por um motivo prático, não estético: o produto vai para
slide, papel e projetor, e uma escala sem luminosidade monotônica morre em preto e
branco e confunde em daltonismo vermelho-verde. **Se trocar, troque por outra
monotônica** — ou me diga que aceita perder isso.

| Faixa | Hoje | **Sua cor** |
|---|---|---|
| Até R$ 1.500 | `#FFF7BC` | |
| R$ 1.500 a 3.000 | `#FEE391` | |
| R$ 3.000 a 5.000 | `#FEC44F` | |
| R$ 5.000 a 8.000 | `#FB9A29` | |
| R$ 8.000 a 15.000 | `#EC7014` | |
| R$ 15.000 a 30.000 | `#CC4C02` | |
| Acima de R$ 30.000 | `#8C2D04` | |

### Faixas da isócrona

| O quê | Hoje | **Sua cor** |
|---|---|---|
| Isócrona (Edição), até 4 faixas | `#6B21A8` `#9333EA` `#C084FC` `#E9D5FF` | |
| Isócrona do Mapa de renda, 2 faixas | `#0A6E60` `#5EC8B8` | |

### Vias e rótulos, por tipo

Nascem **vazios** de propósito: sem cor própria, cada um usa a cor da paleta. Só
preencha se quiser que um tipo específico ignore a paleta **sempre**.

- **Vias**, 7 tipos × 2 cores (a via e o contorno): autoestradas, expressas,
  primárias, secundárias, terciárias, locais, serviço
- **Rótulos**, 5 tipos × 2 cores (texto e contorno): cidades, estradas, avenidas,
  ruas, demais

### Glebas

Não entram aqui: a cor de cada área e de cada município é escolhida por projeto,
nas seções **Por cidade** e **Por área**, e salva junto com o projeto. Uma paleta
nunca as toca.

---

## Como me devolver

Edite este arquivo e me mande de volta, ou cole só a Parte 1 no chat no formato
`chave: #RRGGBB`, uma por linha. Qualquer um dos dois serve.

O que eu faço com ele: crio a paleta nas 21 chaves, acrescento o botão na gaveta
Cores com o nome e o subtítulo que você deu, rodo a verificação, passo pela
revisão e publico — reportando o que subiu. Se alguma cor não passar nas regras,
eu te digo **qual** e **por quanto**, em vez de ajustar por conta própria.
