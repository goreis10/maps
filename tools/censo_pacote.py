#!/usr/bin/env python3
"""
Converte um pacote "census radar" (dicionário CD_SETOR -> registro, já com
lat/lon) em censo/<cod-uf>.json, o formato que o app lê, e atualiza
censo/manifest.json.

É o irmão do censo_uf.py: aquele parte da malha crua do IBGE + CSV de renda;
este parte de um pacote que já cruzou os dois. Um arquivo de entrada pode
conter várias UFs — sai um arquivo por UF encontrada.

Uso:
    python3 tools/censo_pacote.py pkg2/data/ba_only.json
    python3 tools/censo_pacote.py pkg2/data/br_census_unified.json

Registro esperado (campos extras são ignorados):
    {"lat":..,"lon":..,"cd_mun":..,"dom":..,"mor":..,
     "renda_media":..,"renda_mediana":..,"mun":"..."}
"""
import argparse, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from censo_uf import UF_NOME, UF_SIGLA, abrir, nomes_municipios   # noqa: E402


def registros(caminho):
    """Aceita o dicionário puro ou o formato {metadata, records}."""
    with abrir(caminho) as f:
        d = json.load(f)
    if isinstance(d, dict) and 'records' in d:
        return d['records']
    return d


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pacote', help='JSON do pacote (ba_only.json, br_census_unified.json…)')
    ap.add_argument('--saida', default='censo', help='pasta de saída (padrão: censo)')
    a = ap.parse_args()

    nomes = nomes_municipios()
    recs = registros(a.pacote)
    print(f'{len(recs):,} setores no pacote'.replace(',', '.'))

    porUF, munUF, semPos = {}, {}, 0
    for cd, r in recs.items():
        lat, lon = r.get('lat'), r.get('lon')
        cd_mun = r.get('cd_mun')
        if lat is None or lon is None or not cd_mun:
            semPos += 1
            continue
        cod = int(cd_mun) // 100000
        porUF.setdefault(cod, []).append([
            round(float(lat), 5), round(float(lon), 5), int(cd_mun),
            int(r.get('dom') or 0), round(float(r.get('mor') or 0), 2),
            round(float(r.get('renda_media') or 0)),
            round(float(r.get('renda_mediana') or 0)),
        ])
        m = munUF.setdefault(cod, {})
        k = str(cd_mun)
        if k not in m:
            m[k] = nomes.get(k) or str(r.get('mun') or k)

    if semPos:
        print(f'  {semPos:,} sem coordenada — descartados'.replace(',', '.'))

    os.makedirs(a.saida, exist_ok=True)
    pasta = os.path.basename(a.saida.rstrip('/')) or 'censo'
    man_path = os.path.join(a.saida, 'manifest.json')
    try:
        man = json.load(open(man_path, encoding='utf-8'))
    except Exception:
        man = {'versao': 1, 'fonte': 'IBGE — Censo Demográfico 2022 (referência 31/07/2022)', 'ufs': []}

    for cod in sorted(porUF):
        setores = porUF[cod]
        sigla, nome = UF_SIGLA.get(cod, str(cod)), UF_NOME.get(cod, str(cod))
        lat = [s[0] for s in setores]; lon = [s[1] for s in setores]
        bbox = [round(min(lat), 4), round(min(lon), 4), round(max(lat), 4), round(max(lon), 4)]
        alvo = os.path.join(a.saida, f'{cod}.json')
        with open(alvo, 'w', encoding='utf-8') as f:
            json.dump({'meta': {'uf': sigla, 'cod': cod, 'nome': nome,
                                'fonte': 'IBGE — Censo Demográfico 2022',
                                'referencia': '2022-07-31', 'salario_minimo': 1212.0,
                                'campos': ['lat','lon','cd_mun','dom','mor','renda_media','renda_mediana'],
                                'setores': len(setores), 'bbox': bbox,
                                'origem': os.path.basename(a.pacote)},
                       'mun': munUF[cod], 's': setores},
                      f, ensure_ascii=False, separators=(',', ':'))
        man['ufs'] = [u for u in man.get('ufs', []) if u.get('cod') != cod]
        man['ufs'].append({'uf': sigla, 'cod': cod, 'nome': nome,
                           'arquivo': f'{pasta}/{cod}.json',
                           'setores': len(setores), 'bbox': bbox})
        dom = sum(s[3] for s in setores)
        print(f'\n{nome} ({sigla})')
        print(f'  setores    : {len(setores):,}'.replace(',', '.'))
        print(f'  municípios : {len(munUF[cod])}')
        print(f'  domicílios : {dom:,}'.replace(',', '.'))
        print(f'  bbox       : {bbox}')
        print(f'  -> {alvo} ({os.path.getsize(alvo)/1e6:.2f} MB)')

    man['ufs'].sort(key=lambda u: u['cod'])
    with open(man_path, 'w', encoding='utf-8') as f:
        json.dump(man, f, ensure_ascii=False, indent=2)
    print(f'\n{man_path}: {len(man["ufs"])} UF ({", ".join(u["uf"] for u in man["ufs"])})')


if __name__ == '__main__':
    main()
