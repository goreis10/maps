// ═══════════════════════════════════════════════════════════════════
//  IPCA — série 433 do SGS do Banco Central, buscada do lado servidor.
//
//  Existe porque a busca direta do navegador para api.bcb.gov.br falha
//  para parte dos visitantes (CORS, instabilidade, rede corporativa), e
//  quando falha o painel mostra renda de julho/2022 sem correção. Aqui
//  a chamada sai da Netlify, e a borda cacheia o resultado.
//
//  DEVOLVE O ARRAY DO BCB SEM ALTERAR. O parsing, o mês-alvo e a regra
//  de não inventar índice continuam no app.html — esta função não
//  interpreta nada, só transporta. Assim o cliente muda só a URL.
//
//  NÃO EXISTE TABELA DE RESERVA, aqui nem no cliente. Inventar índice
//  de inflação produz valores em reais confiantes e errados, que é o
//  pior resultado possível numa ferramenta de análise. Sem série, o
//  painel diz que não conseguiu.
//
//  Sem dependências, como a outra função: o repositório não tem
//  package.json e não é um endpoint de transporte que vai introduzir o
//  primeiro passo de build.
// ═══════════════════════════════════════════════════════════════════

const BCB = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=01/08/2022';

// A função síncrona da Netlify é cortada em 10 s; abortamos antes para
// devolver mensagem explicável em vez de um 502 cru.
const TIMEOUT_MS = 8000;

function json(status, corpo, extra) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: Object.assign({ 'content-type': 'application/json; charset=utf-8' }, extra || {})
  });
}
const erro = (status, msg) => json(status, { erro: msg });

// O último mês que a série deveria conter: dois meses antes de hoje. O
// IPCA de um mês sai por volta do dia 10 do mês seguinte, então dois
// meses de folga garante que o alvo já foi publicado.
function alvo() {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 2);
  return { a: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
}

export default async (req) => {
  if (req.method !== 'GET') return erro(405, 'Método não permitido.');

  let resp;
  try {
    resp = await fetch(BCB, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: 'application/json' }
    });
  } catch (e) {
    const nome = e && (e.name === 'TypeError' && e.cause ? e.cause.name : e.name);
    console.error('BCB falhou:', nome, e && e.message);
    // SEM cabeçalho de cache: falha não pode ficar guardada na borda.
    return erro(nome === 'TimeoutError' || nome === 'AbortError' ? 504 : 502,
      'Não foi possível obter a série do IPCA no Banco Central.');
  }

  if (!resp.ok) {
    console.error('BCB HTTP', resp.status);
    return erro(502, 'O Banco Central recusou a consulta (HTTP ' + resp.status + ').');
  }

  let serie;
  try {
    serie = await resp.json();
  } catch (e) {
    // O SGS às vezes devolve HTML de manutenção com status 200
    console.error('BCB devolveu corpo ilegível');
    return erro(502, 'Resposta do Banco Central ilegível.');
  }
  if (!Array.isArray(serie) || !serie.length) {
    console.error('BCB devolveu série vazia ou em outro formato');
    return erro(502, 'A série do IPCA voltou vazia.');
  }

  // Série TRUNCADA é o caso que mais merece cuidado: um 200 com meses
  // faltando seria cacheado por horas e produziria um fator
  // subnotificado sem ninguém notar. Quando o último mês não alcança o
  // alvo, o dado vai assim mesmo (é o melhor que existe e o painel
  // imprime até que mês corrigiu), mas com cache curto, para a próxima
  // visita já pegar a série completa.
  const alv = alvo();
  const ultimo = serie[serie.length - 1];
  const p = String((ultimo && ultimo.data) || '').split('/');
  const completa = p.length === 3 && (+p[2] > alv.a || (+p[2] === alv.a && +p[1] >= alv.m));
  if (!completa) console.error('BCB: série termina em', (ultimo && ultimo.data), '— alvo era', alv.m + '/' + alv.a);

  return json(200, serie, {
    'cache-control': 'public, max-age=3600',
    // stale-if-error serve a última série REAL já obtida quando o BCB
    // cair — nunca um índice inventado, que o projeto proíbe.
    'netlify-cdn-cache-control': completa
      ? 'public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=604800'
      : 'public, s-maxage=600'
  });
};

export const config = { path: '/api/ipca' };
