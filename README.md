# Dado em Foco

Dados públicos do Brasil desde 2002, em gráficos curados — com a fonte de cada número.

## Dados

Os CSVs ficam em `data/`, um por série, e podem ser baixados livremente. `data/catalog.json` diz a
fonte, a unidade, a frequência e o período de cada um. Séries em reais têm duas colunas: `value`
(R$ da época) e `value_real` (corrigido pelo IPCA até o mês em `catalog.json` → `base`).

Atualizar tudo (só Python 3, sem dependências):

```sh
python3 scripts/refresh.py          # todas as séries
python3 scripts/refresh.py selic    # só uma
python3 tests/test_data.py          # confere os CSVs
```

Spec da v1: `docs/specs/2026-10-19-v1-design.md`.
