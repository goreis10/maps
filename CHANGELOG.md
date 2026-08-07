# Maker Map — Notas de versão

Numeração no estilo iOS (`MAIOR.MENOR.CORREÇÃO`). A convenção está descrita em
`CLAUDE.md`, seção “Versioning — iOS-style”. Versão mais recente primeiro.

---

## Maker Map 1.2 — Perfil de renda dentro do raio

_Aguardando publicação._

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
> foi ao ar — a próxima depois da 1.0 é esta.

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
