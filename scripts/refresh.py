#!/usr/bin/env python3
"""Pull every series from its official source into data/<id>.csv + data/catalog.json.

Run by hand:  python3 scripts/refresh.py            (all series)
              python3 scripts/refresh.py selic pib_uf  (only these)

Standard library only. Each CSV is tidy: date,geo,value[,value_real].
`value_real` is the value in R$ of the latest IPCA month (see catalog.json "base").
"""
import csv
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
START = "2002"

UF = {11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO", 21: "MA", 22: "PI", 23: "CE",
      24: "RN", 25: "PB", 26: "PE", 27: "AL", 28: "SE", 29: "BA", 31: "MG", 32: "ES", 33: "RJ", 35: "SP",
      41: "PR", 42: "SC", 43: "RS", 50: "MS", 51: "MT", 52: "GO", 53: "DF"}


# ---------- fetch ----------

def get_json(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "dadoemfoco-refresh"})
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)
        except Exception as e:  # network flake: retry, then give up loudly
            if i == tries - 1:
                raise RuntimeError(f"{url}: {e}") from e
            time.sleep(3 * (i + 1))


def sidra(table, var, levels="n1/all/n3/all", period="all", extra=""):
    """SIDRA values API -> list of (period_code, geo, value). geo is 'BR', a UF sigla, or the area name."""
    url = f"https://apisidra.ibge.gov.br/values/t/{table}/{levels}/v/{var}/p/{period}{extra}"
    rows = get_json(url)[1:]
    out = []
    for r in rows:
        try:
            v = float(r["V"])
        except ValueError:  # "-", "...", "X": no data / suppressed
            continue
        level, code = r["NC"], int(r["D1C"])
        geo = "BR" if level == "1" else UF[code] if level == "3" else r["D1N"]
        out.append((r["D3C"], geo, v))
    return out


def ipea(code):
    """IPEADATA series -> {YYYY-MM: value}."""
    d = get_json(f"http://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='{urllib.parse.quote(code)}')")
    this_month = time.strftime("%Y-%m")  # still in progress: a partial month would be wrong
    return {v["VALDATA"][:7]: v["VALVALOR"] for v in d["value"]
            if v["VALVALOR"] is not None and v["VALDATA"][:7] < this_month}


# ---------- date helpers ----------

def month(code):     # 200201 -> 2002-01
    return f"{code[:4]}-{code[4:6]}"


def quarter(code):   # 201201 -> 2012-Q1
    return f"{code[:4]}-Q{int(code[4:])}"


# ---------- deflator (IPCA index, IBGE table 1737) ----------

_IDX = None


def ipca_index():
    global _IDX
    if _IDX is None:
        _IDX = {month(p): v for p, _, v in sidra(1737, 2266, "n1/all")}
    return _IDX


def base_month():
    return max(ipca_index())


def to_real(value, date):
    """Deflate to R$ of the latest IPCA month. date: YYYY-MM, YYYY-Qn or YYYY (annual average)."""
    idx = ipca_index()
    base = idx[base_month()]
    if len(date) == 4:
        months = [idx[f"{date}-{m:02d}"] for m in range(1, 13) if f"{date}-{m:02d}" in idx]
        ref = sum(months) / len(months)
    elif "Q" in date:
        y, q = date.split("-Q")
        ref = sum(idx[f"{y}-{m:02d}"] for m in range(3 * int(q) - 2, 3 * int(q) + 1)) / 3
    else:
        ref = idx[date]
    return value * base / ref


# ---------- series ----------
# Each fetch returns rows of (date, geo, value). `money: True` adds value_real.

def f_pib_trimestral():
    return [(quarter(p), g, v) for p, g, v in sidra(5932, 6561, "n1/all", extra="/c11255/90707")]


def f_pib_uf():
    return [(p, g, v) for p, g, v in sidra(5938, 37)]


def f_populacao_uf():
    # IBGE publishes no estimate in census/count years; use the count itself for those.
    rows = sidra(6579, 9324)
    rows += sidra(793, 93, period="2007")    # Contagem da População 2007
    rows += sidra(1552, 93, period="2010")   # Censo 2010
    rows += sidra(4709, 93, period="2022")   # Censo 2022
    return rows


def f_pib_per_capita_uf():
    pib = {(d, g): v for d, g, v in f_pib_uf()}
    pop = {(d, g): v for d, g, v in f_populacao_uf()}
    # PIB is in R$ mil; population in persons -> R$ per person
    return [(d, g, round(v * 1000 / pop[(d, g)], 2)) for (d, g), v in sorted(pib.items()) if (d, g) in pop]


def f_ipca_12m():
    return [(month(p), g, v) for p, g, v in sidra(1737, 2265, "n1/all")]


def f_ipca_regioes():
    """Monthly IPCA by metro area / capital, spliced across IBGE's four tables, then 12-month accumulated."""
    monthly = {}
    for table in (655, 2938, 1419, 7060):
        for p, g, v in sidra(table, 63, "n7/all/n6/all", extra="/c315/7169"):
            monthly[(month(p), g)] = v
    out = []
    for (m, g) in sorted(monthly):
        y, mm = int(m[:4]), int(m[5:])
        window = [f"{y - (mm - k <= 0)}-{(mm - k - 1) % 12 + 1:02d}" for k in range(12)]
        if all((w, g) in monthly for w in window):
            acc = 1.0
            for w in window:
                acc *= 1 + monthly[(w, g)] / 100
            out.append((m, g, round((acc - 1) * 100, 2)))
    return out


def f_selic():
    # IPEADATA: Selic over accumulated in the month (%), annualized
    return [(m, "BR", round(((1 + v / 100) ** 12 - 1) * 100, 2)) for m, v in ipea("BM12_TJOVER12").items()]


def f_cambio():
    return [(m, "BR", round(v, 4)) for m, v in ipea("BM12_ERC12").items()]


def f_salario_minimo():
    return [(m, "BR", v) for m, v in ipea("MTE12_SALMIN12").items()]


def f_desemprego_uf():
    return [(quarter(p), g, v) for p, g, v in sidra(4099, 4099)]


def f_renda_uf():
    # nominal, so it is deflated the same way as every other money series
    return [(quarter(p), g, v) for p, g, v in sidra(6472, 5929)]


SERIES = [
    dict(id="pib_trimestral", title="PIB, variação real", unit="% sobre o mesmo trimestre do ano anterior",
         freq="Trimestral", geo="Brasil", source="IBGE, Contas Nacionais Trimestrais (SIDRA 5932)",
         url="https://sidra.ibge.gov.br/tabela/5932", fetch=f_pib_trimestral),
    dict(id="pib_uf", title="PIB por estado", unit="R$ mil", freq="Anual", geo="Brasil e estados", money=True,
         source="IBGE, Contas Regionais (SIDRA 5938)", url="https://sidra.ibge.gov.br/tabela/5938", fetch=f_pib_uf),
    dict(id="populacao_uf", title="População estimada", unit="pessoas", freq="Anual", geo="Brasil e estados",
         source="IBGE, Estimativas de População (SIDRA 6579); Contagem 2007 (793); Censos 2010 (1552) e 2022 (4709)",
         url="https://sidra.ibge.gov.br/tabela/6579", fetch=f_populacao_uf,
         note="Nos anos de censo ou contagem (2007, 2010, 2022) usa a contagem; o IBGE não publicou estimativa para 2023"),
    dict(id="pib_per_capita_uf", title="PIB per capita por estado", unit="R$ por pessoa", freq="Anual",
         geo="Brasil e estados", money=True, source="IBGE (SIDRA 5938 ÷ SIDRA 6579)",
         url="https://sidra.ibge.gov.br/tabela/5938", fetch=f_pib_per_capita_uf,
         note="PIB dividido pela população estimada do mesmo ano"),
    dict(id="ipca_12m", title="Inflação (IPCA), 12 meses", unit="%", freq="Mensal", geo="Brasil",
         source="IBGE, IPCA (SIDRA 1737)", url="https://sidra.ibge.gov.br/tabela/1737", fetch=f_ipca_12m),
    dict(id="ipca_regioes", title="Inflação (IPCA) por região metropolitana, 12 meses", unit="%", freq="Mensal",
         geo="Regiões metropolitanas e capitais", source="IBGE, IPCA (SIDRA 655, 2938, 1419, 7060)",
         url="https://sidra.ibge.gov.br/tabela/7060", fetch=f_ipca_regioes,
         note="Acumulado em 12 meses calculado a partir da variação mensal; áreas entram quando o IBGE passa a medi-las"),
    dict(id="selic", title="Taxa Selic", unit="% ao ano", freq="Mensal", geo="Brasil",
         source="Banco Central, via IPEADATA (BM12_TJOVER12)", url="http://www.ipeadata.gov.br/",
         fetch=f_selic, note="Selic over acumulada no mês, anualizada"),
    dict(id="cambio", title="Dólar comercial", unit="R$ por US$", freq="Mensal", geo="Brasil",
         source="Banco Central, via IPEADATA (BM12_ERC12)", url="http://www.ipeadata.gov.br/",
         fetch=f_cambio, note="Média mensal, taxa de compra"),
    dict(id="salario_minimo", title="Salário mínimo", unit="R$", freq="Mensal", geo="Brasil", money=True,
         source="Ministério do Trabalho, via IPEADATA (MTE12_SALMIN12)", url="http://www.ipeadata.gov.br/",
         fetch=f_salario_minimo),
    dict(id="desemprego_uf", title="Taxa de desemprego", unit="%", freq="Trimestral", geo="Brasil e estados",
         source="IBGE, PNAD Contínua (SIDRA 4099)", url="https://sidra.ibge.gov.br/tabela/4099",
         fetch=f_desemprego_uf, note="Série começa em 2012"),
    dict(id="renda_uf", title="Renda média do trabalho", unit="R$ por mês", freq="Trimestral", money=True,
         geo="Brasil e estados", source="IBGE, PNAD Contínua (SIDRA 6472)", url="https://sidra.ibge.gov.br/tabela/6472",
         fetch=f_renda_uf, note="Série começa em 2012; rendimento habitual de todos os trabalhos"),
]


# ---------- write ----------

def write(series):
    rows = sorted({(d, g): v for d, g, v in series["fetch"]() if d[:4] >= START}.items())
    if not rows:
        raise RuntimeError(f"{series['id']}: no rows")
    money = series.get("money")
    path = DATA / f"{series['id']}.csv"
    with path.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["date", "geo", "value"] + (["value_real"] if money else []))
        for (d, g), v in rows:
            w.writerow([d, g, v] + ([round(to_real(v, d), 2)] if money else []))
    dates = [d for (d, _), _ in rows]
    return {k: v for k, v in series.items() if k != "fetch"} | {
        "rows": len(rows), "since": min(dates), "until": max(dates), "file": f"{series['id']}.csv"}


def main(only):
    DATA.mkdir(exist_ok=True)
    cat_path = DATA / "catalog.json"
    catalog = json.loads(cat_path.read_text()) if cat_path.exists() else {"series": {}}
    for s in SERIES:
        if only and s["id"] not in only:
            continue
        meta = write(s)
        catalog["series"][s["id"]] = meta
        print(f"{s['id']:<20} {meta['rows']:>6} rows  {meta['since']} → {meta['until']}")
    catalog["base"] = base_month()
    cat_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main(set(sys.argv[1:]))
