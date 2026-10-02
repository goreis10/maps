# Maker Map — Notas de versão

Numeração no estilo iOS (`MAIOR.MENOR.CORREÇÃO`). A convenção está descrita em
`CLAUDE.md`, seção “Versioning — iOS-style”. Versão mais recente primeiro.

---

## Maker Map 2.3 — Isócrona

_No ar em maker-map.netlify.app._

Esta atualização inclui os seguintes aprimoramentos e correções de erros:

- **Nova ferramenta: Isócrona.** Em vez de um círculo, ela desenha a área que
  se alcança de verdade a partir de um ponto dentro de um tempo de
  deslocamento — recortada pelas estradas reais. Botão **Isócrona** na barra
  superior.
- **Quatro modos de deslocamento**: carro, caminhão, bicicleta e a pé.
- **Até quatro faixas de tempo** por cálculo, de 1 a 120 minutos. As faixas são
  aninhadas (a de 15 min fica dentro da de 30) e aparecem em tons de roxo, da
  mais próxima para a mais distante.
- A **origem** é definida por coordenadas, por endereço ou clicando no mapa,
  como nos dois raios que já existiam.
- Cada faixa mostra a **área em km²**, e a **cor de cada faixa pode ser
  trocada** na bolinha ao lado dela — a lista serve de legenda e de editor.
- Cor, preenchimento e legenda da isócrona são ajustáveis, com o mesmo controle
  de texto, tamanho e contorno dos demais rótulos.
- A isócrona **sai na imagem exportada**, porque é desenhada no mapa.
- O cálculo **só acontece quando você clica em Calcular**, não a cada ajuste.
  Se mudar algum parâmetro depois, o painel avisa que o desenho na tela é o
  anterior. Isso é de propósito: cada cálculo é uma consulta a um serviço
  externo, com limite de uso.
- A isócrona **fica salva no projeto**, inclusive o desenho já calculado —
  reabrir um projeto não gasta uma nova consulta.
- Disponível no plano **Pro**.

> **Os tempos não consideram trânsito.** O cálculo usa a malha viária do
> OpenStreetMap com velocidade de via livre, então "30 minutos" é 30 minutos de
> madrugada. Em horário de pico a área real é menor. O painel informa isso.

> A análise de renda do Censo **dentro** da isócrona vem na próxima versão.
> Por enquanto a isócrona desenha, e o Mapa de renda continua trabalhando com
> o raio circular.

---

## Maker Map 2.2.1 — Correção no mapa de calor de densidade

_No ar em maker-map.netlify.app._

Esta atualização inclui os seguintes aprimoramentos e correções de erros:

- O **mapa de calor de densidade** deixava de fora os setores em que o IBGE não
  divulga rendimento, e por isso desenhava menos gente do que o painel contava.
  Em Campinas, num raio de 20 km, o painel somava 671.387 domicílios e o calor
  representava 555.930 — 17% a menos. Agora os dois concordam.
- O erro existia desde que o mapa de calor foi criado, mas quase não aparecia:
  a base antiga de São Paulo enxergava poucos setores sem renda. Com a base nova
  da versão 2.2, ele passou a ser visível.
- Os **pontos** e o **calor de renda** continuam mostrando apenas setores com
  renda informada, como deve ser — não há como colorir por faixa de renda um
  setor que não tem renda.
- O rodapé do painel passou a dizer exatamente onde esses domicílios entram e
  onde ficam de fora, para não haver dúvida depois da correção.

---

## Maker Map 2.2 — Minas Gerais, e São Paulo mais completo

_No ar em maker-map.netlify.app._

Esta atualização inclui os seguintes aprimoramentos e correções de erros:

- **Minas Gerais entrou no Mapa de renda**: 49.924 setores, 853 municípios e
  7,54 milhões de domicílios. Um raio em Belo Horizonte, Uberlândia ou qualquer
  ponto do estado agora responde.
- **São Paulo ficou mais completo.** A base anterior vinha de uma fonte que não
  cobre áreas sem rua mapeada e deixava de fora 10% dos setores — quase um
  milhão de domicílios, a maioria em zona rural. A nova base vem dos polígonos
  oficiais do IBGE e recupera esses setores: de 90.789 para **98.989**, de 15,26
  para **16,24 milhões de domicílios**.
  Na prática, raios que incluem área rural paulista passam a mostrar números
  maiores — e corretos. Vale refazer análises antigas que dependiam disso.
- **Você vai ver mais domicílios "fora do cálculo de renda" em São Paulo.** Quase
  todos os setores recuperados são daqueles que o IBGE não divulga rendimento,
  então eles entram na contagem de domicílios e pessoas mas ficam de fora da
  média de renda — o rodapé do painel passa a informar um número bem maior.
  Em Campinas, num raio de 20 km, vai de 17 para cerca de 115 mil. Não é erro:
  é o mesmo comportamento que Minas e Bahia já tinham; São Paulo é que estava
  fora do padrão por não enxergar esses setores.
- A base cobre agora **São Paulo, Minas Gerais e Bahia**: 179.224 setores. O raio
  continua baixando só os estados que alcança.

---

## Maker Map 2.1 — Bahia no Mapa de renda

_No ar em maker-map.netlify.app._

Esta atualização inclui os seguintes aprimoramentos e correções de erros:

- **A Bahia entrou no Mapa de renda**: 30.311 setores, 417 municípios e 5,09
  milhões de domicílios. Um raio em Salvador, Feira de Santana ou qualquer ponto
  do estado agora responde.
- Os dados do Censo passaram a ser organizados **um arquivo por estado**. O raio
  baixa apenas o estado (ou estados) que ele alcança, então quem trabalha só em
  São Paulo continua baixando o mesmo tanto de antes.
- Um raio que cruza divisa carrega os dois estados automaticamente.
- Se o centro do raio cair fora dos estados disponíveis, o painel passa a dizer
  **quais estão disponíveis**, em vez da mensagem fixa que citava só São Paulo.
- Acrescentar um estado novo passou a ser só acrescentar o arquivo dele, sem
  mexer no programa.

---

## Maker Map 2.0 — Novos Negócios

_No ar em maker-map.netlify.app._

O Maker Map deixa de ser uma tela só. Um **menu à esquerda** abre e fecha, e por
ele você escolhe entre duas áreas de trabalho: o **Mapa**, com tudo que já
existia, e **Novos Negócios**, um quadro para acompanhar as áreas.

Esta atualização inclui os seguintes aprimoramentos e correções de erros:

**Novos Negócios**

- Nova tela em formato de **quadro (kanban)**, com as colunas **Ofertada**,
  **Negociação** e **Contratada**.
- Cada área importada por KMZ ou desenhada no mapa entra como um **cartão**, na
  coluna Ofertada. O cartão mostra o nome, o grupo de origem, a área e a cor que
  a área tem no mapa.
- **Arraste o cartão** entre as colunas para mudar a etapa do negócio.
- Clique no cartão para preencher **valor pedido, contato e observações**, ou
  mudar a etapa por uma lista.
- Cada coluna soma a **quantidade de áreas, os hectares e o valor**; o topo da
  tela traz o total geral.
- Botão **Ver no mapa** no cartão: volta para o Mapa já centralizado naquela
  área.
- **O quadro é guardado sozinho**, a cada mudança, e volta na próxima vez que
  você entrar — sem precisar salvar projeto.
- Disponível no plano **Pro**.

**Novos Negócios e Meus Projetos são coisas separadas**

- **Meus Projetos** guarda os **KMZ e a edição do mapa** — o material da
  apresentação. Continua sendo salvo só quando você manda.
- **Novos Negócios** guarda a **gestão comercial** das áreas, por conta própria e
  automaticamente. Um negócio pode existir sem nenhum projeto salvo.
- Por isso: remover um KMZ do mapa ou usar **Começar do zero** **não apaga** os
  cartões. O cartão apenas deixa de exibir a marca *no mapa*.
- Reimportar o mesmo KMZ não cria cartão repetido.
- Para tirar um negócio do quadro, use **Remover do quadro** na janela do cartão.
- A marca **no mapa** no cartão indica que o KMZ daquela área está aberto no Mapa
  neste momento.

**Planos**

- Nova janela de **Planos**, mostrando os quatro planos e o que cada um inclui.
  Seu plano atual aparece destacado.
- A janela abre pelo botão **Planos**, nas Configurações, ou clicando direto no
  selo do seu plano na barra superior.
- Quando um recurso bloqueado é clicado, a janela de aviso passa a ter um botão
  **Ver planos**.

**Mapa de renda — ajuste dos valores**

- Novo campo **corrigir pelo IPCA**: a renda do Censo, que é de julho de 2022,
  passa a ser atualizada automaticamente até dois meses antes de hoje. O período
  e o percentual acumulado aparecem ao lado. Ligado por padrão.
- Novo campo **demais moradores**: o Censo informa a renda apenas do responsável
  pelo domicílio, e este percentual estima quanto os outros moradores somam a
  ela. O valor base é **50%**, ou seja, renda domiciliar de 1,5× a do
  responsável. Use 0% para ver somente o responsável.
- Os dois ajustes valem para tudo: totais, distribuição por faixa, classe
  socioeconômica e as cores dos pontos e do mapa de calor.
- O painel sempre diz em que moeda os valores estão (“R$ de jun/2026”, por
  exemplo) e lembra que a renda dos demais moradores é uma estimativa sua, não
  um dado do Censo.
- Se não for possível obter o IPCA, o painel avisa e mostra os valores de julho
  de 2022 sem correção, em vez de aplicar um índice qualquer.

**Mapa de renda — camadas no mapa**

- Novo botão **Pontos no mapa**, no Mapa de renda: desenha um ponto por setor
  censitário dentro do raio, colorido pela faixa de renda — do amarelo claro
  (faixas menores) ao marrom escuro (maiores).
- Clicar em um ponto abre os dados daquele setor: domicílios, moradores por
  domicílio e renda média e mediana.
- Novo botão **Mapa de calor**, com duas leituras à escolha:
  - **Renda** — mancha suave nas cores das faixas de renda, mostrando as regiões
    mais e menos ricas dentro do raio.
  - **Densidade** — concentração de domicílios por área, do azul (pouco) ao
    vermelho (muito), mostrando onde está a população.
- Controle de **suavização** para deixar a mancha mais fechada ou mais espalhada,
  já que o ponto certo muda conforme o tamanho do raio e a densidade da região.
- Pontos e mapa de calor podem ficar ligados ao mesmo tempo.
- O gráfico de distribuição por faixa de renda passou a usar as mesmas cores dos
  pontos e do calor de renda, servindo de legenda. No modo densidade aparece a
  escala de cores própria.
- **A cor de cada faixa de renda pode ser trocada**: clique na bolinha ao lado da
  faixa no gráfico e escolha a cor. Vale para os pontos e para o calor de renda,
  e fica salva no projeto.
- Duas escalas prontas: **semáforo** (vermelho na renda baixa, ciano na alta — o
  padrão) e **tons de âmbar** (claro a escuro, a única que continua legível
  impressa em preto e branco e para quem tem daltonismo).
- Setores sem informação de renda não entram nessas camadas, do mesmo jeito que já
  ficavam fora do cálculo da renda.

> As legendas ficam na janela do Mapa de renda e **não** saem na imagem
> exportada. Uma legenda dentro do mapa ainda está por fazer.

---

## Maker Map 1.2 — Perfil de renda dentro do raio

_No ar em maker-map.netlify.app._

Esta atualização inclui os seguintes aprimoramentos e correções de erros:

**Mapa de renda**

- O Mapa de renda ganhou um raio próprio, com centro, distância, cor e legenda
  independentes do raio da Edição. O centro pode ser definido por coordenadas,
  por endereço ou clicando no mapa.
- Esse raio agora mostra o perfil de quem mora dentro dele, com dados do Censo
  Demográfico 2022 do IBGE: domicílios ocupados, pessoas estimadas, moradores
  por domicílio, renda média e mediana do responsável, classe socioeconômica,
  densidade e municípios abrangidos.
- Novo gráfico de distribuição dos domicílios por faixa de renda.
- Os números consideram apenas os setores censitários cujo centro cai dentro do
  raio. Quando o raio é pequeno demais para a densidade da região, um aviso
  informa a margem de erro da borda e recomenda aumentá-lo — em raio muito
  pequeno o resultado depende mais do acaso do que dos dados.
- Os dados do Censo são baixados apenas na primeira vez que o raio é ligado,
  então quem não usa o Mapa de renda não paga esse tempo de carregamento.
- Cobertura: Estado de São Paulo. Um centro fora do estado avisa que não há
  dados disponíveis.

**Legenda do raio (Edição)**

- A legenda que aparece junto ao raio agora pode ser editada: escreva o texto
  que quiser ou deixe em branco para usar o texto automático
  (“Marco Zero · raio 100 km”).
- A legenda ganhou cor, tamanho e contorno próprios, ajustáveis como os demais
  rótulos do mapa.
- A legenda pode ser desligada sem desligar o círculo do raio.

> Nota de numeração: os itens de “Legenda do raio” chegaram a ser preparados
> como 1.1, mas foram publicados junto com o Mapa de renda. A versão 1.1 nunca
> foi ao ar — a próxima depois da 1.0 foi a 1.2. Do mesmo modo, o que estava
> preparado como 1.3 foi publicado junto com Novos Negócios, na 2.0.

---

## Maker Map 1.0 — Primeira versão publicada

_No ar em maker-map.netlify.app._

Numeração aplicada retroativamente a tudo que já estava publicado quando a
convenção foi adotada.

Esta versão inclui:

- **Áreas** — importação de arquivos KMZ/KML e desenho de áreas direto no mapa,
  com painel de municípios mostrando a área em hectares e em m².
- **Edição** — cores por cidade e por área, cores do fundo do mapa, rótulos,
  vias em subníveis com contorno, máscara spotlight, raio e a pilha
  “Sobre a máscara” reordenável arrastando.
- **Cores do mapa** — sete paletas prontas: Padrão, Preto e branco, Mapa antigo,
  Tons de cinza, Zoneamento urbano, Contraste categórico e Dark mode.
- **Projetos** — salvar e reabrir projetos com desenhos, arquivos importados e
  toda a edição.
- **Conta** — cadastro, login e edição dos próprios dados.
- **Planos** — Free, Basic, Pro e Admin, com os recursos indisponíveis marcados
  por um cadeado.
- **Exportação** — imagem PNG em alta resolução (2×, 3× ou 4×).
