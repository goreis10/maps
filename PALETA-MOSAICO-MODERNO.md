# Paleta Mosaico Moderno

Paleta do mapa base tirada do **Modelo Moderno, tema escuro** (o relatório Gleba
Sousas). No produto ela é a chave `mosaicoModerno` de `PALETAS`, em `app.html`, e
aparece na gaveta **Cores** como *Mosaico Moderno — grafite e laranja, do Modelo
Moderno*. Entrou na versão 3.7; o prédio passou a ser pintado na 3.7.2.

Ela é **outra paleta da marca**, não uma variação da *Dark Mosaico* (deck FIDC): o
fundo é grafite `#17191E` em vez do preto `#1D1D1B` do deck, e no lugar das zebras
de tabela há três tons de base: fundo, superfície e linha.

---

## Os tokens do modelo

Os oito valores do modelo que o mapa usa, do mais escuro ao mais claro, mais os
dois acentos:

| Token | Papel no Modelo Moderno | Onde entra no mapa |
|---|---|---|
| `#17191E` | Grafite escuro — fundo, a cor dominante | fundo, cobertura do solo, halo dos textos |
| `#22252C` | Grafite médio — superfície (cartão, painel) | quadras urbanas, parques, vegetação, aeroporto, contorno das vias |
| `#33373F` | Grafite claro — divisórias, separadores | divisas, vias principais, contorno das rodovias |
| `#6E7584` | Cinza ardósia — rótulo discreto | nomes de bairros e cidades menores, nomes de parques, símbolos |
| `#9AA0AA` | Cinza azulado — texto secundário | nomes de vias e de rios |
| `#F2F2F0` | Branco quente — texto principal | nomes das cidades |
| `#F87226` | Laranja MOSAICO — o único acento | rodovias |
| `#3973B9` | Azul de apoio (formas e gráficos) | rios, em linha |

Ficam **de fora** do mapa, de propósito:

- **`#FFFFFF` e `#DADADA`** — são do logo e da linha de data da capa; o mapa não
  tem papel para eles.
- **Amarelo** — o modelo o permite só em formas e gráficos e proíbe em texto; um
  mapa não tem série de gráfico.
- **Magenta** — proibido pelo modelo.

---

## As 21 chaves

19 são valor literal do modelo; 2 são derivadas, com a conta indicada.

### Base: fundo e superfícies

| Chave | Cor | O que pinta | De onde vem |
|---|---|---|---|
| `bg` | `#17191E` | o fundo de tudo | grafite escuro (fundo) |
| `landcover` | `#17191E` | cobertura do solo não verde | fundo — ver a nota abaixo |
| `landuse` | `#22252C` | áreas urbanas (as "quadras" das cidades) | superfície |
| `park` | `#22252C` | parques | superfície |
| `grass` | `#22252C` | vegetação | superfície |
| `aeroway` | `#22252C` | aeroportos | superfície |
| `water` | `#264264` | mares, lagos, represas | **derivada**: azul `#3973B9` a 45% sobre o fundo `#17191E` |
| `building` | `#31353E` | construções (a partir do zoom 12) | **derivada**: `landuse` `#22252C` a 20% rumo a `placeOther` `#6E7584` |

O modelo tem **uma** cor de superfície, não três. A camada mais ampla
(`landcover`) fica no próprio fundo em vez de ganhar um quarto cinza inventado,
que seria o único valor fora da paleta.

### Linhas: vias, rios e divisas

| Chave | Cor | O que pinta | De onde vem |
|---|---|---|---|
| `motorway` | `#F87226` | rodovias | laranja MOSAICO, o único acento |
| `motorwayCasing` | `#33373F` | contorno das rodovias | linha fina |
| `major` | `#33373F` | vias principais | linha fina |
| `majorCasing` | `#22252C` | contorno das vias principais | superfície |
| `waterway` | `#3973B9` | rios e córregos | azul de apoio, em linha (forma, não texto) |
| `boundary` | `#33373F` | divisas de município e estado | "divisórias, separadores" |

O contorno da rodovia é a linha fina `#33373F`, **não um laranja escurecido**: o
modelo não traz um, e inventá-lo criaria um segundo tom de acento.

### Texto: rótulos

| Chave | Cor | O que pinta | De onde vem |
|---|---|---|---|
| `placeCity` | `#F2F2F0` | nomes das cidades | branco quente (texto principal) |
| `placeOther` | `#6E7584` | bairros, vilas, cidades menores | cinza ardósia (rótulo discreto) |
| `roadText` | `#9AA0AA` | nomes de vias | cinza azulado (texto secundário) |
| `waterText` | `#9AA0AA` | nomes de rios e lagos | cinza azulado (texto secundário) |
| `parkText` | `#6E7584` | nomes de parques | cinza ardósia (rótulo discreto) |
| `symbol` | `#6E7584` | símbolos e pontos de interesse | igual a `placeOther` |
| `halo` | `#17191E` | contorno atrás dos textos | fundo |

---

## Regras do modelo que o mapa herda

1. **O laranja é o único acento, "usado com parcimônia".** No mapa ele pinta só
   as rodovias, que são a camada mais esparsa. Nenhum texto é laranja.
2. **Azul e amarelo são apoio, só em formas e gráficos.** Água é forma, então o
   azul entra nela (a água em si e os rios em linha). O amarelo não entra.
3. **Magenta é proibido.**
4. **Não há verde.** Parques e vegetação saem no tom de superfície `#22252C`. É
   uma surpresa visível, e a gaveta Cores avisa; inventar um verde faria dela
   outra paleta.

Diferença de princípio para as paletas *Moderno Claro* e *Moderno Grafite* (3.8):
lá o laranja fica fora do mapa, porque é o destaque das glebas; aqui ele **é** o
acento do modelo e pinta as rodovias.

---

## As contas das duas derivadas

Mistura canal a canal, `resultado = A × t + B × (1 − t)`, arredondada.

**`water` = `#3973B9` a 45% sobre `#17191E`**

| Canal | Azul | Fundo | Conta | Resultado |
|---|---|---|---|---|
| R | 57 | 23 | 57 × 0,45 + 23 × 0,55 = 38,3 | 38 = `26` |
| G | 115 | 25 | 115 × 0,45 + 25 × 0,55 = 65,5 | 66 = `42` |
| B | 185 | 30 | 185 × 0,45 + 30 × 0,55 = 99,75 | 100 = `64` |

É a mesma conta da água da *Dark Mosaico* (azul da marca a 45% sobre o fundo).

**`building` = `#22252C` a 20% rumo a `#6E7584`**

| Canal | Superfície | Ardósia | Conta | Resultado |
|---|---|---|---|---|
| R | 34 | 110 | 34 × 0,8 + 110 × 0,2 = 49,2 | 49 = `31` |
| G | 37 | 117 | 37 × 0,8 + 117 × 0,2 = 53,0 | 53 = `35` |
| B | 44 | 132 | 44 × 0,8 + 132 × 0,2 = 61,6 | 62 = `3E` |

O passo de 20% rumo a `placeOther` é a regra de prédio de todas as paletas desde a
3.7.2: discreto, e sempre na direção certa (mais claro num mapa escuro). O prédio
é contexto, não o assunto do mapa.

---

## Para copiar

```js
mosaicoModerno: {
  bg:'#17191E', water:'#264264', waterway:'#3973B9', waterText:'#9AA0AA',
  park:'#22252C', parkText:'#6E7584', grass:'#22252C', landcover:'#17191E',
  landuse:'#22252C', aeroway:'#22252C', boundary:'#33373F',
  motorway:'#F87226', motorwayCasing:'#33373F', major:'#33373F', majorCasing:'#22252C',
  roadText:'#9AA0AA', placeCity:'#F2F2F0', placeOther:'#6E7584', symbol:'#6E7584',
  halo:'#17191E', building:'#31353E'
}
```

A fonte de verdade é `app.html`. Se a paleta mudar lá, este arquivo fica
desatualizado.
