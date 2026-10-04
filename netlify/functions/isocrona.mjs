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

// O OpenRouteService migrou de host. O antigo (api.openrouteservice.org)
// foi marcado como descontinuado em abril/2026, teve a cota cortada a
// 10% em agosto e desligamento anunciado para 28/09/2026 — a chave é a
// mesma nos dois. Tentamos o atual primeiro e caímos no legado só se o
// atual não responder ou disser que não conhece o caminho, para o caso
// de a migração não ter sido exatamente como anunciada.
const HOSTS = [
  'https://api.heigit.org/openrouteservice',
  'https://api.openrouteservice.org'
];

// A função síncrona da Netlify é cortada em 10 s. Abortamos antes para
// devolver uma mensagem explicável em vez de um 502 cru da plataforma.
// O orçamento é dividido entre as tentativas, nunca somado.
const TIMEOUT_MS = 9000;
const TIMEOUT_1 = 6000;

function json(status, corpo, extra) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: Object.assign({ 'content-type': 'application/json; charset=utf-8' }, extra || {})
  });
}

const erro = (status, msg) => json(status, { erro: msg });

export default async (req) => {
  // SÓ GET. Aceitar HEAD seria o convencional em HTTP, mas aqui um HEAD
  // atravessaria a validação e dispararia a chamada ao ORS do mesmo
  // jeito — e HEAD é o que crawler e pré-visualização de link usam.
  // Proteger a cota vale mais que a convenção num endpoint privado.
  if (req.method !== 'GET') return erro(405, 'Método não permitido.');

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
  //
  // O host vem preferencialmente dos cabeçalhos: req.url numa função
  // pode trazer host interno, e comparar contra ele 403aria TODO
  // pedido legítimo — a feature não funcionaria para ninguém.
  // Compara hostname (sem porta) para não quebrar em dev.
  //
  // x-forwarded-host É FORJÁVEL por quem chama direto, então quem quiser
  // burlar isto burla. Não é problema: a checagem só filtra uso casual,
  // a borda da Netlify reescreve o header no tráfego real, e a proteção
  // que de fato vale são os tetos acima. Não confie neste header para
  // mais nada.
  const ref = req.headers.get('referer');
  if (ref) {
    try {
      const meu = req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host;
      if (new URL(ref).hostname !== new URL('https://' + meu).hostname) {
        return erro(403, 'Origem não autorizada.');
      }
    } catch (e) { /* Referer ou host malformado: ignora e segue para a validação */ }
  }

  const q = new URL(req.url).searchParams;

  // Number('') e Number(null) dão 0, que é finito e cai dentro do
  // Brasil — sem esta checagem, pedido sem coordenada responderia
  // "o centro precisa estar no Brasil", que não ajuda ninguém.
  const lonTxt = q.get('lon'), latTxt = q.get('lat');
  if (lonTxt == null || lonTxt === '' || latTxt == null || latTxt === '') {
    return erro(400, 'Informe as coordenadas do centro.');
  }
  const lon = Number(lonTxt);
  const lat = Number(latTxt);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return erro(400, 'Coordenadas inválidas.');
  if (lon < BRASIL.lonMin || lon > BRASIL.lonMax || lat < BRASIL.latMin || lat > BRASIL.latMax) {
    return erro(400, 'O centro precisa estar no Brasil.');
  }

  const perfil = q.get('perfil') || 'driving-car';
  if (!PERFIS.has(perfil)) return erro(400, 'Modo de deslocamento inválido.');

  // "15,30,45" -> [900, 1800, 2700], sem repetição e em ordem.
  const pedidos = (q.get('min') || '').split(',').map((s) => s.trim()).filter((s) => s !== '');
  const validos = pedidos.map((s) => Math.round(Number(s)))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= MAX_MINUTOS);
  // Descartar em silêncio devolveria 200 para um pedido que não foi o
  // que se pediu — quem chama direto o endpoint merece saber.
  if (validos.length !== pedidos.length) {
    return erro(400, 'Cada faixa de tempo precisa ser um número de 1 a ' + MAX_MINUTOS + ' minutos.');
  }
  const mins = [...new Set(validos)].sort((a, b) => a - b);

  if (!mins.length) return erro(400, 'Informe de 1 a ' + MAX_FAIXAS + ' faixas de tempo, entre 1 e ' + MAX_MINUTOS + ' minutos.');
  if (mins.length > MAX_FAIXAS) return erro(400, 'No máximo ' + MAX_FAIXAS + ' faixas de tempo por cálculo.');

  const corpoPedido = JSON.stringify({
    locations: [[lon, lat]],
    range: mins.map((m) => m * 60),
    range_type: 'time',
    location_type: 'start',
    attributes: ['area'],
    area_units: 'km'
  });

  const pedir = (base, ms) => fetch(base + '/v2/isochrones/' + perfil, {
    method: 'POST',
    signal: AbortSignal.timeout(ms),
    headers: {
      Authorization: chave,
      'content-type': 'application/json',
      accept: 'application/geo+json'
    },
    body: corpoPedido
  });

  let resp;
  try {
    try {
      resp = await pedir(HOSTS[0], TIMEOUT_1);
      // 404/410 = o host existe mas não conhece esta rota. Vale tentar o
      // outro; qualquer outra resposta (200, 401, 429, 400) é resposta de
      // verdade e deve ser respeitada, não mascarada por uma segunda
      // tentativa que gastaria cota.
      if (resp.status === 404 || resp.status === 410) {
        console.error('ORS host atual devolveu', resp.status, '— tentando o legado');
        resp = await pedir(HOSTS[1], TIMEOUT_MS - TIMEOUT_1);
      }
    } catch (e1) {
      console.error('ORS host atual falhou:', e1 && (e1.name || e1.message), '— tentando o legado');
      resp = await pedir(HOSTS[1], TIMEOUT_MS - TIMEOUT_1);
    }
  } catch (e) {
    // O undici embrulha o abort num TypeError("fetch failed") e põe o
    // TimeoutError em .cause — olhar só e.name perderia o timeout e
    // daria a mensagem errada.
    const nome = e && (e.name === 'TypeError' && e.cause ? e.cause.name : e.name);
    const abortou = nome === 'TimeoutError' || nome === 'AbortError';
    console.error('ORS falhou:', nome, e && e.message);
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
    // O plano do ORS limita o tempo máximo da isócrona, e o teto varia
    // por perfil (a pé costuma ser mais apertado). Reconhecer isso pelo
    // CORPO do erro, e não por um número fixo nosso, cobre qualquer teto
    // — inclusive um que recuse 45 min. O texto devolvido é nosso; nada
    // do corpo do ORS vai para o navegador.
    if (resp.status === 400 && /maximum range|"?code"?\s*:\s*2003/i.test(corpo)) {
      return erro(400, 'A faixa de ' + mins[mins.length - 1] +
        ' min passa do limite do serviço de roteamento para este modo. Reduza o tempo.');
    }
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
  // O polígono é guardado dentro do projeto, no localStorage do
  // visitante, cuja cota de ~5 MB é dividida com os projetos e o quadro
  // de Novos Negócios. Duas economias antes de devolver:
  //   · "metadata" é o eco do pedido e dos atributos do motor, e não
  //     desenha nada;
  //   · o ORS manda coordenadas com precisão de nanômetro. Cinco casas
  //     decimais são ~1 m, muito além do que uma isócrona significa, e
  //     cortam perto da metade do tamanho.
  delete geo.metadata;
  // O teste de array vazio não é zelo: sem ele, [] vira [NaN,NaN], que o
  // JSON.stringify grava como [null,null] — GeoJSON inválido que faria o
  // worker da MapLibre lançar ao calcular o sentido do anel. E NaN não
  // lança, então o try/catch abaixo não pegaria.
  const arredondar = (c) => c.length === 0 ? c
    : Array.isArray(c[0])
      ? c.map((x) => arredondar(x))
      : [Math.round(c[0] * 1e5) / 1e5, Math.round(c[1] * 1e5) / 1e5];
  for (const f of geo.features) {
    if (f && f.geometry && Array.isArray(f.geometry.coordinates)) {
      try { f.geometry.coordinates = arredondar(f.geometry.coordinates); } catch (e) {}
    }
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
