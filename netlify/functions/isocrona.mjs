// ═══════════════════════════════════════════════════════════════════
//  ISÓCRONA — o único endpoint de servidor do Maker Map.
//
//  Existe por um motivo só: a chave do OpenRouteService não pode morar
//  no app.html, que é público e qualquer visitante lê. O navegador
//  chama /api/isocrona (nosso próprio domínio) e quem fala com o ORS é
//  esta função, com a chave vinda da variável de ambiente ORS_API_KEY
//  (painel da Netlify → Environment variables).
//
//  SEM DEPENDÊNCIAS, de propósito: o repositório não tem package.json
//  nem node_modules, e um endpoint de 100 linhas não é motivo para
//  introduzir o primeiro passo de build do projeto. Nada aqui importa
//  nada — só APIs da plataforma (fetch, Response, Netlify.env).
//
//  O ENDPOINT É PÚBLICO. Quem descobrir a URL gasta a cota do dono.
//  Por isso ele valida tudo antes de repassar, e os limites abaixo são
//  a proteção que de fato vale: a checagem de Referer é fraca (dá para
//  falsificar) e serve apenas para filtrar uso casual.
// ═══════════════════════════════════════════════════════════════════

// Perfis de deslocamento aceitos. Fora desta lista, 400 — nada é
// repassado ao ORS a partir de texto do cliente.
const PERFIS = new Set(['driving-car', 'driving-hgv', 'cycling-regular', 'foot-walking']);

// Caixa do Brasil, com folga. Sem limite geográfico, alguém usaria a
// nossa cota para calcular isócronas em Berlim.
const BRASIL = { lonMin: -74.5, lonMax: -33.5, latMin: -34.5, latMax: 6.5 };

const MAX_FAIXAS = 4;      // faixas de tempo por chamada
const MAX_MINUTOS = 120;   // teto por faixa

// A função síncrona da Netlify é cortada em 10 s. Abortamos antes para
// devolver uma mensagem explicável em vez de um 502 cru da plataforma.
const TIMEOUT_MS = 9000;

function json(status, corpo, extra) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: Object.assign({ 'content-type': 'application/json; charset=utf-8' }, extra || {})
  });
}

const erro = (status, msg) => json(status, { erro: msg });

export default async (req) => {
  const chave = Netlify.env.get('ORS_API_KEY');
  if (!chave) {
    // Só o dono do site vê o log da função. Listar os NOMES das
    // variáveis (nunca os valores) transforma um "não funciona" em
    // "a variável foi cadastrada com outro nome".
    let nomes = '(não foi possível listar)';
    try { nomes = Object.keys(Netlify.env.toObject()).join(', '); } catch (e) {}
    console.error('ORS_API_KEY ausente. Variáveis presentes:', nomes);
    return erro(503, 'Serviço de isócrona não configurado no servidor.');
  }

  // Anti-hotlink simples. O Referer de uma requisição same-origin pode
  // vir vazio por configuração de privacidade, então ausência não
  // bloqueia; só bloqueia quando vem e aponta para outro domínio.
  const ref = req.headers.get('referer');
  if (ref) {
    try {
      if (new URL(ref).host !== new URL(req.url).host) return erro(403, 'Origem não autorizada.');
    } catch (e) { /* Referer malformado: ignora e segue para a validação */ }
  }

  const q = new URL(req.url).searchParams;

  const lon = Number(q.get('lon'));
  const lat = Number(q.get('lat'));
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return erro(400, 'Coordenadas inválidas.');
  if (lon < BRASIL.lonMin || lon > BRASIL.lonMax || lat < BRASIL.latMin || lat > BRASIL.latMax) {
    return erro(400, 'O centro precisa estar no Brasil.');
  }

  const perfil = q.get('perfil') || 'driving-car';
  if (!PERFIS.has(perfil)) return erro(400, 'Modo de deslocamento inválido.');

  // "15,30,45" -> [900, 1800, 2700], sem repetição e em ordem.
  const mins = [...new Set((q.get('min') || '')
    .split(',')
    .map((s) => Math.round(Number(s)))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= MAX_MINUTOS))]
    .sort((a, b) => a - b);

  if (!mins.length) return erro(400, 'Informe de 1 a ' + MAX_FAIXAS + ' faixas de tempo, entre 1 e ' + MAX_MINUTOS + ' minutos.');
  if (mins.length > MAX_FAIXAS) return erro(400, 'No máximo ' + MAX_FAIXAS + ' faixas de tempo por cálculo.');

  let resp;
  try {
    resp = await fetch('https://api.openrouteservice.org/v2/isochrones/' + perfil, {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        Authorization: chave,
        'content-type': 'application/json',
        accept: 'application/geo+json'
      },
      body: JSON.stringify({
        locations: [[lon, lat]],
        range: mins.map((m) => m * 60),
        range_type: 'time',
        location_type: 'start',
        attributes: ['area'],
        area_units: 'km'
      })
    });
  } catch (e) {
    const abortou = e && (e.name === 'TimeoutError' || e.name === 'AbortError');
    console.error('ORS falhou:', e && e.name, e && e.message);
    return erro(abortou ? 504 : 502, abortou
      ? 'O cálculo passou de ' + Math.round(TIMEOUT_MS / 1000) + 's. Tente menos faixas ou tempos menores.'
      : 'Não foi possível falar com o serviço de roteamento.');
  }

  if (!resp.ok) {
    // O corpo de erro do ORS pode ecoar o cabeçalho enviado, então ele
    // vai para o log do dono e NÃO para o navegador.
    let corpo = '';
    try { corpo = (await resp.text()).slice(0, 500); } catch (e) {}
    console.error('ORS HTTP', resp.status, corpo);
    if (resp.status === 401 || resp.status === 403) return erro(502, 'Chave do serviço de roteamento recusada.');
    if (resp.status === 429) return erro(429, 'Cota de cálculos esgotada por agora. Tente mais tarde.');
    return erro(502, 'O serviço de roteamento recusou o cálculo (HTTP ' + resp.status + ').');
  }

  let geo;
  try {
    geo = await resp.json();
  } catch (e) {
    return erro(502, 'Resposta do serviço de roteamento ilegível.');
  }
  if (!geo || !Array.isArray(geo.features) || !geo.features.length) {
    return erro(502, 'O serviço não encontrou vias alcançáveis a partir deste ponto.');
  }

  // A mesma isócrona pedida de novo não deve gastar cota: um dia no
  // navegador, uma semana no CDN. O resultado não muda — é a malha
  // viária do OSM, não trânsito ao vivo.
  return json(200, geo, {
    'cache-control': 'public, max-age=86400',
    'netlify-cdn-cache-control': 'public, s-maxage=604800'
  });
};

export const config = { path: '/api/isocrona' };
