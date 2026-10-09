# Maker Map — Notas de versão

Numeração no estilo iOS (`MAIOR.MENOR.CORREÇÃO`). A convenção está descrita em
`CLAUDE.md`, seção “Versioning — iOS-style”. Versão mais recente primeiro.

---

## Maker Map 3.1 — Domicílios por faixa, em número

_Em revisão._

Esta atualização inclui os seguintes aprimoramentos e correções de erros:

- **O gráfico de faixas de renda passa a mostrar o número de domicílios ao lado
  do percentual**, entre parênteses: "38,1% (44.976)". O percentual responde
  "que parte do recorte", o número responde "quantas famílias" — e é o número
  que se fala numa reunião.
- Isso também desfaz uma ambiguidade que o percentual sozinho tinha: **"0,0%"
  podia ser uma faixa vazia ou doze domicílios num recorte de trezentos mil.**
  Agora dá para ver qual dos dois é.
- Quando há domicílios em setores **sem renda informada**, o gráfico passa a
  declarar a sua base logo abaixo — "Base: 117.933 domicílios com renda
  informada". Com percentuais ninguém somava as linhas; com números absolutos
  vai somar, e a soma fecha com essa base, não com o total de domicílios
  ocupados.
- **Correção: a faixa contada no gráfico e a cor pintada no mapa podiam
  discordar.** Em alguns setores, o gráfico contava o domicílio numa faixa e o
  ponto no mapa saía com a cor da faixa seguinte — inclusive na imagem
  exportada. O gráfico é a legenda das cores do mapa, então os dois agora
  decidem a faixa pelo mesmo número.
- **Correção: recorte sem nenhuma renda informada apresentava "R$ 0" e classe
  "E" como se fossem dados.** Acontece de verdade — há um bloco de 244 setores
  e 43.852 domicílios num raio de 3 km em Campinas cuja renda o IBGE não
  divulga. Agora o painel diz que não há renda a apresentar ali, e mantém os
  totais de domicílios e de pessoas, que continuam valendo.

---

## Maker Map 3.0 — Interface reorganizada e legenda de renda na imagem

_No ar em maker-map.netlify.app._

Esta atualização inclui os seguintes aprimoramentos e correções de erros:

### A legenda de renda agora sai na imagem exportada

- **As faixas de renda ganharam legenda dentro do mapa**, com liga/desliga,
  escolha de canto e título próprio — e, ao contrário do gráfico que fica na
  gaveta, **esta caixa sai no PNG exportado**. Era a maior lacuna do produto:
  o trabalho de análise não chegava ao lugar onde o cliente o lê.
- Ela lista **só as faixas que existem no recorte**, para não prometer cores
  que não estão no mapa, e carrega sempre **o mês da moeda e de quem é a
  renda** — um valor em reais numa apresentação, sem essas duas informações,
  é uma afirmação incompleta sobre dinheiro.
- Aparece quando **Pontos** ou o calor de **renda** estão ligados, que são as
  camadas cujas cores ela explica. Se você escolher para ela o mesmo canto da
  legenda da isócrona, as duas se empilham em vez de se sobrepor.
- **A cor padrão das faixas passou de semáforo para tons de âmbar.** O motivo
  não é estético: o produto é uma imagem que vai para slide, papel e projetor,
  e a escala semáforo desaparece em preto e branco e confunde quem tem
  daltonismo vermelho-verde. O semáforo continua a um clique, no mesmo lugar,
  e projetos já salvos com cores escolhidas por você não mudam.

### A gaveta Mapa de renda foi reorganizada

- **A análise agora vem antes dos parâmetros.** Ela ficava uma tela abaixo dos
  controles que a alimentam, e o uso é um laço ajusta→lê→ajusta.
- **O recorte é uma linha só:** Raio ou Isócrona e, ao lado, o parâmetro do
  modo escolhido — os km no raio, os dois tempos na isócrona.
- **Os parâmetros ficam em seções que abrem e fecham**, cada uma mostrando no
  título o que está valendo: "carro · 15/30 min", "set/2026 +31,4% · demais
  1,50× a do responsável", "canto inferior direito". Recolher não esconde
  estado, e o seu arranjo de seções é lembrado na próxima visita.
- **As premissas que mexem no valor em reais** — moeda, correção e de quem é a
  renda — subiram para uma faixa fixa ao lado dos totais, em corpo legível, no
  lugar da antiga linha "Base dos valores".
- **A metodologia virou "Como estes números são calculados"**, a um clique, e
  com o texto *maior* do que era no rodapé. Nenhuma palavra foi removida.
- **Os avisos de margem de borda não mudaram de lugar nem de tamanho.** São os
  únicos textos que aparecem só quando há algo errado e que dizem para não usar
  os números.
- Três linhas economizadas sem perder nada: a classe socioeconômica foi para a
  mesma linha da renda média, as duas linhas de densidade viraram uma, e
  **"domicílios sem renda informada" virou um número** na lista — antes só
  existia a frase que o explicava.

### Mapa, cabeçalho e painel

- **Os totais voltaram para o cabeçalho**: hectares, número de áreas,
  municípios e m². Estavam sendo calculados e descartados.
- **Salvar Projeto foi para o cabeçalho**, ao lado de Meus Projetos.
- **Os botões do canto do mapa foram agrupados por função**: compor o mapa,
  analisar, e sair com a imagem. **A gaveta aberta agora marca o botão dela**,
  e os botões que abrem gaveta pararam de nascer apagados como se estivessem
  desligados.
- **O painel de áreas ganhou tela de abertura**: "Importar KMZ" e a dica de
  Desenhar, em vez de uma caixa vazia sem instrução. O título passou de
  "Municípios" para "Áreas".

### Escolher o centro

- **Um bloco só, nos quatro lugares** onde se escolhe um centro ou uma origem.
  **O campo aceita endereço ou um par de coordenadas colado** ("-23.5505,
  -46.6333" e as variações com vírgula decimal, espaço ou ponto-e-vírgula), as
  coordenadas atuais ficam visíveis numa linha e os campos numéricos ficam a um
  clique em "editar coordenadas".
- **O botão de escolher no mapa fica marcado enquanto espera o seu clique.** O
  cursor de cruz era a única pista, e ela desaparece quando o ponteiro sai do
  mapa — com três centros possíveis, era fácil esquecer qual estava armado.

### Correções

- **O selo de classe socioeconômica saía em cinza sobre o verde** em vez de
  branco, por uma regra de estilo que o alcançava sem querer.
- **Os quatro modos de deslocamento quebravam linha** no segmentado da gaveta
  Mapa de renda ao estreitar a gaveta; a regra que os aperta só valia para o
  segmentado gêmeo da gaveta Isócrona.
- **O texto de letra miúda do produto subiu de 9,5px para 10,5px**, e com ele o
  rodapé onde o programa declara em que moeda estão os valores.
- Saíram os botões "Cancelar"/"Fechar" do pé das gavetas: o × do cabeçalho já
  fecha, e está em todas elas.
- A política de guarda dos cartões saiu do topo do quadro de Novos Negócios
  para um "Como funciona este quadro" — quem abre o quadro todo dia quer o
  resumo.

---

## Maker Map 2.6 — Correção da renda informada por você

_No ar em maker-map.netlify.app._

Esta atualização inclui os seguintes aprimoramentos e correções de erros:

- **Novo campo de percentual ao lado de "corrigir pelo IPCA".** Deixando em
  branco, o índice continua sendo buscado no Banco Central, como antes.
  **Preenchendo, o seu valor é usado e nada é buscado** — é a saída para quando a
  consulta ao Banco Central falha, e também serve para aplicar um índice de sua
  escolha, não necessariamente o IPCA.
- O **rodapé do painel sempre diz qual dos dois está valendo**: ou "Corrigido
  pelo IPCA de jul/2022 a tal mês, série do Banco Central", ou "Corrigido em
  +X% sobre julho/2022 — percentual informado por você". Quem olhar a análise
  sabe de onde veio o número.
- Valor fora da faixa de −50% a 1000% é **recusado com aviso**, em vez de
  corrigido em silêncio, e **vírgula decimal é entendida** (20,7 não vira 20).
  É dinheiro que vai para uma apresentação.
- **O popup do setor censitário parou de mentir sobre a base.** Ele mostra a
  renda já corrigida, mas dizia "jul/2022 · responsável" — valor corrigido
  rotulado como nominal, e estimativa domiciliar rotulada como sendo só do
  responsável. Agora ele usa a mesma linha de base do painel. Esse defeito é
  anterior a esta versão.
- **"Indisponível" deixou de poder mentir.** Havia um caminho em que a série
  chegava perfeita do Banco Central e, se a repintura do painel falhasse por
  qualquer motivo, o aviso virava "indisponível" e a correção não era aplicada —
  culpando o Banco Central por um defeito nosso de interface. O mesmo erro que a
  isócrona já tinha cometido com a legenda.

> A regra de nunca embutir uma tabela de inflação no programa **continua**. A
> diferença é que agora existe um lugar onde **você** informa o índice, de forma
> explícita e declarada no rodapé — o que não é a mesma coisa que o programa
> inventar um.

---

## Maker Map 2.5 — Renda dentro da isócrona

_No ar em maker-map.netlify.app._

Esta atualização inclui os seguintes aprimoramentos e correções de erros:

- **O Mapa de renda deixa de ser só por raio.** Um botão novo, na gaveta,
  troca o recorte da análise entre **Raio** e **Isócrona**. No modo isócrona, o
  perfil de domicílios, renda, classe e faixas passa a ser calculado dentro da
  área que se alcança de verdade pelas estradas — e não dentro de um círculo.
  É a diferença entre "num raio de 10 km" e "a 20 minutos de carro daqui".
- A isócrona do Mapa de renda é **própria dela**, independente da que está no
  botão Isócrona da barra superior — do mesmo jeito que o raio daqui já é
  independente do raio da Edição.
- **Duas faixas de tempo.** A análise responde por uma delas de cada vez: clique
  na linha da faixa para escolher qual (a bolinha ao lado troca a cor). A outra continua desenhada no mapa, para
  comparar — a de 15 e a de 30 minutos lado a lado.
- Cada faixa mostra a **área em km²**, tem cor editável na bolinha, e a faixa
  analisada aparece com traço mais forte no mapa.
- Carro, caminhão, bicicleta ou a pé; origem por coordenadas, endereço ou
  clique no mapa.
- Os **pontos e os mapas de calor** do Censo seguem o recorte escolhido: ligados
  no modo isócrona, desenham os setores de dentro do polígono.
- O painel inteiro passa a falar do recorte certo — onde dizia "raio", agora diz
  "a isócrona de 20 min" quando é esse o caso.

> **A margem de erro foi refeita para polígono.** O aviso de recorte pequeno
> demais existia com uma conta que pressupõe círculo. Num contorno irregular ela
> não significaria nada, então agora a margem vem da área real do polígono e da
> distância ao contorno dele. O aviso continua valendo: recorte pequeno demais
> para a densidade local dá resultado que depende mais do acaso do que dos dados.

> Os tempos continuam **sem considerar trânsito**, como na isócrona da barra
> superior.

---

## Maker Map 2.4.1 — A isócrona voltou a funcionar

_No ar em maker-map.netlify.app._

Esta atualização inclui os seguintes aprimoramentos e correções de erros:

- **A isócrona voltou a funcionar.** O serviço de roteamento que o Maker Map usa
  mudou de endereço: o antigo foi marcado como descontinuado em abril, teve a
  cota cortada a 10% em agosto e foi desligado no fim de setembro. Passamos a
  usar o endereço novo — **a chave é a mesma**, não há nada a refazer. Por
  garantia, se o endereço novo não responder, ele ainda tenta o antigo.
- **A correção pela IPCA voltou a funcionar** para quem via *indisponível*. A
  consulta ao Banco Central passa a sair do servidor do site, e não do seu
  navegador, o que elimina bloqueio de origem e instabilidade da sua rede; se o
  servidor não conseguir, o navegador ainda tenta direto, como antes. O índice
  fica em cache por algumas horas e, quando o Banco Central está fora do ar, o
  site serve a última série **real** já obtida — nunca um índice inventado.
- Se o seu navegador impedir o desenho da legenda da isócrona (uma extensão de
  privacidade basta), **o cálculo continua funcionando**. Antes, essa falha
  derrubava a isócrona inteira e a mensagem culpava a conexão, mandando
  investigar o lugar errado.

---

## Maker Map 2.4 — Legenda da isócrona no mapa

_No ar em maker-map.netlify.app._

Esta atualização inclui os seguintes aprimoramentos e correções de erros:

- **Cada faixa de tempo agora tem a sua cor de verdade.** As faixas vêm
  encaixadas umas dentro das outras, e antes eram pintadas empilhadas — a
  região de 15 minutos aparecia como a soma de todas as camadas por cima dela,
  então a cor no mapa não era a cor da bolinha ao lado da faixa. Agora cada
  faixa é desenhada como um **anel**, e a cor que você vê no mapa é exatamente
  a da legenda.
- **Nova legenda desenhada dentro do mapa**, com a cor e o tempo de cada faixa.
  Escolha o canto (os quatro), ligue e desligue, e troque o título — deixando
  em branco, ele é automático ("Isócrona · carro").
- **Essa legenda sai na imagem exportada.** É a primeira do Maker Map que sai:
  as legendas das gavetas são HTML e nunca apareceram no PNG. Esta é desenhada
  no próprio mapa, na mesma resolução que a imagem acabar tendo — a caixa
  cresce junto com ela, sem borrar.
- Os cantos de cima ficam **por cima do painel de municípios e dos botões**, na
  tela. Nada deixa de funcionar (o clique passa direto) e na imagem exportada a
  questão não existe: painel e botões não entram no PNG.
- A caixa sobe um pouco no rodapé para não cobrir a escala do mapa nem a
  bússola.

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
