#!/usr/bin/env python3
"""Checks the committed CSVs against their catalog and against known official values.

Offline, standard library only:  python3 tests/test_data.py
"""
import csv
import json
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
CATALOG = json.loads((DATA / "catalog.json").read_text())
UFS = {"RO", "AC", "AM", "RR", "PA", "AP", "TO", "MA", "PI", "CE", "RN", "PB", "PE", "AL", "SE", "BA",
       "MG", "ES", "RJ", "SP", "PR", "SC", "RS", "MS", "MT", "GO", "DF"}


def rows(sid):
    return list(csv.DictReader((DATA / f"{sid}.csv").open()))


def value(sid, date, geo="BR", col="value"):
    hit = [r for r in rows(sid) if r["date"] == date and r["geo"] == geo]
    assert hit, f"{sid}: no row for {date} {geo}"
    return float(hit[0][col])


def next_period(d):
    if "-Q" in d:
        y, q = int(d[:4]), int(d[-1])
        return f"{y + q // 4}-Q{q % 4 + 1}"
    if len(d) == 7:
        y, m = int(d[:4]), int(d[5:])
        return f"{y + m // 12}-{m % 12 + 1:02d}"
    return str(int(d) + 1)


# Years with no official figure, by series (documented in catalog notes).
KNOWN_GAPS = {"populacao_uf": {"2023"}, "fpe_uf": {"2011", "2014"}}


def check_structure():
    for sid, meta in CATALOG["series"].items():
        rs = rows(sid)
        assert len(rs) == meta["rows"], f"{sid}: {len(rs)} rows, catalog says {meta['rows']}"
        keys = [(r["date"], r["geo"]) for r in rs]
        assert len(keys) == len(set(keys)), f"{sid}: duplicate date/geo"
        assert all(r["value"] not in ("", "nan") for r in rs), f"{sid}: empty value"
        if meta.get("money"):
            assert all(float(r["value_real"]) > 0 for r in rs), f"{sid}: bad value_real"
        # every geo has a contiguous run from its first to its last period
        by_geo = {}
        for d, g in keys:
            by_geo.setdefault(g, set()).add(d)
        for g, ds in by_geo.items():
            d, last = min(ds), max(ds)
            while d != last:
                d = next_period(d)
                assert d in ds or d in KNOWN_GAPS.get(sid, set()), f"{sid}: {g} missing {d}"
        if "estados" in meta["geo"]:
            assert UFS | {"BR"} <= set(by_geo), f"{sid}: missing states {UFS - set(by_geo)}"
    assert CATALOG["base"] >= "2026-01", "deflator base month looks stale"


def check_known_values():
    # Values as published by IBGE / BCB / MTE, checked by hand.
    assert value("ipca_12m", "2002-01") == 7.62
    assert value("pib_uf", "2002") == 1488787276
    assert value("desemprego_uf", "2012-Q1") == 8.0
    assert value("salario_minimo", "2002-03") == 180 and value("salario_minimo", "2002-04") == 200
    assert 2.3 < value("cambio", "2002-01") < 2.45
    assert value("pib_trimestral", "2020-Q2") < -9      # pandemic quarter
    assert 18 < value("selic", "2002-01") < 21
    assert value("caged_saldo_br", "2008-12") < -600000                 # 2008 crisis
    assert value("homicidios_uf", "2017") == 32.1                        # Atlas da Violência peak
    assert 11 < value("mortalidade_infantil_uf", "2023") < 14
    assert value("fpe_uf", "2002", "SC", col="value_real") > value("fpe_uf", "2002", "SC")
    # derived: per capita = PIB (R$ mil) / population
    pc = value("pib_per_capita_uf", "2010", "SC")
    assert abs(pc - value("pib_uf", "2010", "SC") * 1000 / value("populacao_uf", "2010", "SC")) < 0.01
    # deflator: the base month is worth itself
    base = CATALOG["base"]
    assert value("salario_minimo", base, col="value_real") == value("salario_minimo", base)


if __name__ == "__main__":
    check_structure()
    check_known_values()
    print(f"ok: {len(CATALOG['series'])} series")
