#!/usr/bin/env python3
"""
Gera censo/<cod-uf>.json a partir de:

  1. a MALHA DE SETORES CENSITÁRIOS do IBGE (GeoJSON), de onde sai o
     centroide de cada setor;
  2. o CSV nacional "Agregados_por_setores_renda_responsavel_BR", de onde
     saem domicílios, moradores e renda.

O CSV cobre as 27 UFs; a malha é publicada uma por UF. Por isso o script
roda uma vez por estado, e o manifesto vai sendo acrescido.

Uso:
    python3 tools/censo_uf.py --malha SP_setores_CD2022.json \\
                              --renda Agregados_por_setores_renda_responsavel_BR.csv

Não faz parte do site: o netlify.toml remove tools/ do que é publicado.

Colunas do CSV usadas (identificadas pelos totais nacionais, que batem com
o Censo 2022: 72,4 mi de domicílios e 202,0 mi de pessoas):
    V06001 domicílios · V06002 moradores · V06004 renda média
    V06006 renda mediana                  (mor = V06002 / V06001)
"""
import argparse, csv, json, os, re, sys

UF_NOME = {11:'Rondônia',12:'Acre',13:'Amazonas',14:'Roraima',15:'Pará',16:'Amapá',
           17:'Tocantins',21:'Maranhão',22:'Piauí',23:'Ceará',24:'Rio Grande do Norte',
           25:'Paraíba',26:'Pernambuco',27:'Alagoas',28:'Sergipe',29:'Bahia',
           31:'Minas Gerais',32:'Espírito Santo',33:'Rio de Janeiro',35:'São Paulo',
           41:'Paraná',42:'Santa Catarina',43:'Rio Grande do Sul',50:'Mato Grosso do Sul',
           51:'Mato Grosso',52:'Goiás',53:'Distrito Federal'}
UF_SIGLA = {11:'RO',12:'AC',13:'AM',14:'RR',15:'PA',16:'AP',17:'TO',21:'MA',22:'PI',
            23:'CE',24:'RN',25:'PB',26:'PE',27:'AL',28:'SE',29:'BA',31:'MG',32:'ES',
            33:'RJ',35:'SP',41:'PR',42:'SC',43:'RS',50:'MS',51:'MT',52:'GO',53:'DF'}

# Nomes que o IBGE já usou para o código do setor e do município.
CHAVES_SETOR = ('CD_SETOR','CD_GEOCODI','CD_GEOCODIGO','cd_setor','CD_SETOR_2022')
CHAVES_MUN   = ('NM_MUN','NM_MUNICIP','NM_MUNICIPIO','nm_mun')


def so_digitos(v):
    """CD_SETOR do GeoJSON às vezes vem com sufixo P/U — fica só o número."""
    return re.sub(r'\D', '', str(v or ''))


def features_em_fluxo(caminho):
    """Percorre o array "features" sem carregar o arquivo inteiro na memória.
    Malha estadual passa de 100 MB; json.load() custaria vários GB."""
    with open(caminho, encoding='utf-8') as f:
        buf = f.read(1 << 20)
        i = buf.find('"features"')
        while i < 0:
            novo = f.read(1 << 20)
            if not novo:
                raise SystemExit('Não achei "features" — o arquivo é GeoJSON?')
            buf += novo
            i = buf.find('"features"')
        i = buf.index('[', i) + 1
        prof, ini, dentro, escapa = 0, -1, False, False
        while True:
            while i < len(buf):
                c = buf[i]
                if escapa:
                    escapa = False
                elif c == '\\' and dentro:
                    escapa = True
                elif c == '"':
                    dentro = not dentro
                elif not dentro:
                    if c == '{':
                        if prof == 0:
                            ini = i
                        prof += 1
                    elif c == '}':
                        prof -= 1
                        if prof == 0:
                            yield json.loads(buf[ini:i + 1])
                            buf = buf[i + 1:]
                            i = ini = -1
                            break
                    elif c == ']' and prof == 0:
                        return
                i += 1
            else:
                novo = f.read(1 << 20)
                if not novo:
                    return
                buf += novo
                continue
            i += 1


def centroide_anel(anel):
    """Centroide e área com sinal de um anel (fórmula do laço de sapato)."""
    a = cx = cy = 0.0
    n = len(anel)
    for k in range(n - 1):
        x0, y0 = anel[k][0], anel[k][1]
        x1, y1 = anel[k + 1][0], anel[k + 1][1]
        f = x0 * y1 - x1 * y0
        a += f
        cx += (x0 + x1) * f
        cy += (y0 + y1) * f
    if a == 0:
        xs = [p[0] for p in anel]
        ys = [p[1] for p in anel]
        return (sum(xs) / n, sum(ys) / n, 0.0)
    a *= 0.5
    return (cx / (6 * a), cy / (6 * a), abs(a))


def centroide(geom):
    """Centroide de Polygon/MultiPolygon, ponderado pela área de cada parte."""
    if not geom:
        return None
    t = geom.get('type')
    partes = []
    if t == 'Polygon':
        partes = [geom['coordinates']]
    elif t == 'MultiPolygon':
        partes = geom['coordinates']
    elif t == 'Point':
        c = geom['coordinates']
        return (c[0], c[1])
    else:
        return None
    sx = sy = sa = 0.0
    resto = []
    for poly in partes:
        if not poly or not poly[0]:
            continue
        x, y, a = centroide_anel(poly[0])
        if a > 0:
            sx += x * a; sy += y * a; sa += a
        else:
            resto.append((x, y))
    if sa > 0:
        return (sx / sa, sy / sa)
    if resto:
        return (sum(p[0] for p in resto) / len(resto),
                sum(p[1] for p in resto) / len(resto))
    return None


def ler_renda(caminho):
    """CD_SETOR -> (domicilios, moradores_por_domicilio, renda_media, renda_mediana)"""
    out = {}
    with open(caminho, encoding='utf-8') as f:
        for row in csv.DictReader(f, delimiter=';'):
            cd = so_digitos(row.get('CD_SETOR'))
            if not cd:
                continue
            def num(k):
                try:
                    return float(str(row.get(k, '')).replace(',', '.'))
                except (TypeError, ValueError):
                    return 0.0
            dom = num('V06001')
            mor = num('V06002')
            out[cd] = (int(dom),
                       round(mor / dom, 2) if dom else 0.0,
                       round(num('V06004')),
                       round(num('V06006')))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--malha', required=True, help='malha de setores da UF (GeoJSON)')
    ap.add_argument('--renda', required=True, help='Agregados_por_setores_renda_responsavel_BR.csv')
    ap.add_argument('--saida', default='censo', help='pasta de saída (padrão: censo)')
    a = ap.parse_args()

    if a.malha.lower().endswith(('.shp', '.zip')):
        sys.exit('Este script lê GeoJSON. Converta antes, por exemplo:\n'
                 '  ogr2ogr -f GeoJSON -t_srs EPSG:4326 saida.json entrada.shp\n'
                 'ou use mapshaper.org (arraste o .shp e exporte GeoJSON).')

    print('lendo renda…', flush=True)
    renda = ler_renda(a.renda)
    print(f'  {len(renda):,} setores com dados'.replace(',', '.'))

    print('lendo malha…', flush=True)
    setores, muns = [], {}
    total = semCentro = semRenda = 0
    for ft in features_em_fluxo(a.malha):
        total += 1
        p = ft.get('properties') or {}
        cd = ''
        for k in CHAVES_SETOR:
            if p.get(k):
                cd = so_digitos(p[k]); break
        if not cd:
            continue
        c = centroide(ft.get('geometry'))
        if not c:
            semCentro += 1; continue
        r = renda.get(cd)
        if not r:
            semRenda += 1; continue
        cd_mun = int(cd[:7])
        for k in CHAVES_MUN:
            if p.get(k):
                muns.setdefault(str(cd_mun), str(p[k])); break
        setores.append([round(c[1], 5), round(c[0], 5), cd_mun, r[0], r[1], r[2], r[3]])
        if total % 20000 == 0:
            print(f'  {total:,} feições…'.replace(',', '.'), flush=True)

    if not setores:
        sys.exit('Nenhum setor cruzou com o CSV — confira se a malha é do Censo 2022.')

    cod = setores[0][2] // 100000
    sigla, nome = UF_SIGLA.get(cod, str(cod)), UF_NOME.get(cod, str(cod))
    lat = [s[0] for s in setores]; lon = [s[1] for s in setores]
    bbox = [round(min(lat), 4), round(min(lon), 4), round(max(lat), 4), round(max(lon), 4)]

    os.makedirs(a.saida, exist_ok=True)
    alvo = os.path.join(a.saida, f'{cod}.json')
    with open(alvo, 'w', encoding='utf-8') as f:
        json.dump({'meta': {'uf': sigla, 'cod': cod, 'nome': nome,
                            'fonte': 'IBGE — Censo Demográfico 2022',
                            'referencia': '2022-07-31', 'salario_minimo': 1212.0,
                            'campos': ['lat','lon','cd_mun','dom','mor','renda_media','renda_mediana'],
                            'setores': len(setores), 'bbox': bbox,
                            'origem_geometria': os.path.basename(a.malha)},
                   'mun': muns, 's': setores},
                  f, ensure_ascii=False, separators=(',', ':'))

    man_path = os.path.join(a.saida, 'manifest.json')
    try:
        man = json.load(open(man_path, encoding='utf-8'))
    except Exception:
        man = {'versao': 1, 'fonte': 'IBGE — Censo Demográfico 2022 (referência 31/07/2022)', 'ufs': []}
    man['ufs'] = [u for u in man.get('ufs', []) if u.get('cod') != cod]
    # o app busca este caminho relativo à página, então guarda só a pasta
    man['ufs'].append({'uf': sigla, 'cod': cod, 'nome': nome,
                       'arquivo': f'{os.path.basename(a.saida.rstrip("/"))}/{cod}.json',
                       'setores': len(setores), 'bbox': bbox})
    man['ufs'].sort(key=lambda u: u['cod'])
    with open(man_path, 'w', encoding='utf-8') as f:
        json.dump(man, f, ensure_ascii=False, indent=2)

    mb = os.path.getsize(alvo) / 1e6
    print(f'\n{nome} ({sigla})')
    print(f'  feições na malha  : {total:,}'.replace(',', '.'))
    print(f'  gravados          : {len(setores):,}'.replace(',', '.'))
    print(f'  sem centroide     : {semCentro:,}'.replace(',', '.'))
    print(f'  fora do CSV       : {semRenda:,}'.replace(',', '.'))
    print(f'  municípios        : {len(muns)}')
    print(f'  bbox              : {bbox}')
    print(f'  -> {alvo} ({mb:.2f} MB)')
    print(f'  -> {man_path} atualizado ({len(man["ufs"])} UF no total)')


if __name__ == '__main__':
    main()
