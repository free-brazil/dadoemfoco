import type { Fmt } from "./types"
import type { Mode } from "@/components/TimeChart"

export type ChartSpec =
  | { id: string; kind: "time"; fmt: Fmt; mode: Mode; title?: string; description: string; peak?: boolean }
  | { id: string; kind: "ranking"; fmt: Fmt; title?: string; description: string }

export type Theme = { slug: string; title: string; intro: string; charts: ChartSpec[]; corruption?: boolean }

export const THEMES: Theme[] = [
  {
    slug: "economia", title: "Economia",
    intro: "Quanto a economia produz, no país e em cada estado.",
    charts: [
      { id: "pib_trimestral", kind: "time", fmt: "pp", mode: "national", description: "Crescimento do PIB sobre o mesmo trimestre do ano anterior, descontada a inflação." },
      { id: "pib_uf", kind: "time", fmt: "brl_mil", mode: "focus", title: "PIB", description: "Tudo o que a economia produziu no ano, no Brasil ou no estado escolhido." },
      { id: "pib_per_capita_uf", kind: "ranking", fmt: "brl", description: "PIB dividido pela população." },
      { id: "pib_per_capita_uf", kind: "time", fmt: "brl", mode: "uf", title: "PIB per capita ao longo do tempo", description: "PIB dividido pela população, ano a ano." },
    ],
  },
  {
    slug: "precos-e-juros", title: "Preços e juros",
    intro: "Inflação, juros, câmbio e salário mínimo.",
    charts: [
      { id: "ipca_12m", kind: "time", fmt: "pct", mode: "national", description: "Quanto os preços subiram nos 12 meses anteriores." },
      { id: "ipca_regioes", kind: "time", fmt: "pct", mode: "areas", description: "A inflação em 12 meses medida em cada região metropolitana ou capital." },
      { id: "selic", kind: "time", fmt: "pct", mode: "national", description: "A taxa básica de juros da economia." },
      { id: "cambio", kind: "time", fmt: "brl_rate", mode: "national", description: "Quantos reais custava um dólar, em média no mês." },
      { id: "salario_minimo", kind: "time", fmt: "brl", mode: "national", description: "O salário mínimo nacional." },
    ],
  },
  {
    slug: "trabalho", title: "Trabalho",
    intro: "Desemprego, renda e empregos com carteira assinada.",
    charts: [
      { id: "desemprego_uf", kind: "time", fmt: "pct", mode: "uf", description: "Parcela da força de trabalho que procura emprego e não encontra." },
      { id: "renda_uf", kind: "time", fmt: "brl", mode: "uf", description: "Renda média mensal de quem trabalha, somando todos os trabalhos." },
      { id: "caged_saldo_br", kind: "time", fmt: "int", mode: "national", description: "Vagas com carteira assinada abertas menos as fechadas no mês." },
      { id: "caged_saldo_uf", kind: "time", fmt: "int", mode: "focus", description: "Vagas com carteira assinada abertas menos as fechadas no mês, no estado escolhido." },
    ],
  },
  {
    slug: "contas-publicas", title: "Contas públicas",
    intro: "Dinheiro que a União repassa aos estados.",
    charts: [
      { id: "fpe_uf", kind: "ranking", fmt: "brl", description: "Repasse do Fundo de Participação dos Estados no ano." },
      { id: "fpe_uf", kind: "time", fmt: "brl", mode: "focus", title: "FPE ao longo do tempo", description: "Repasse do FPE ao estado escolhido, ano a ano." },
    ],
  },
  {
    slug: "corrupcao", title: "Corrupção", corruption: true,
    intro: "O que dá para medir sobre corrupção com dados oficiais, e os principais casos desde 2002.",
    charts: [
      { id: "cpi_0a100", kind: "time", fmt: "num", mode: "national", description: "Nota do Brasil no índice da Transparência Internacional; quanto maior, menos corrupção percebida." },
      { id: "cpi_0a10", kind: "time", fmt: "num1", mode: "national", description: "A mesma medida na escala antiga, de 0 a 10. Não compare com a escala atual." },
      { id: "sancoes_vigentes_uf", kind: "ranking", fmt: "int", title: "Sanções em vigor por estado do órgão", description: "Empresas e pessoas impedidas de contratar com o poder público, pelo estado do órgão que aplicou a sanção." },
    ],
  },
  {
    slug: "sociedade", title: "Sociedade",
    intro: "Violência e saúde das crianças.",
    charts: [
      { id: "homicidios_uf", kind: "time", fmt: "num1", mode: "uf", description: "Homicídios por 100 mil habitantes." },
      { id: "mortalidade_infantil_uf", kind: "time", fmt: "num1", mode: "uf", description: "Bebês que morreram antes de completar 1 ano, por mil nascidos vivos." },
    ],
  },
  {
    slug: "covid", title: "COVID-19",
    intro: "A pandemia de 2020 a 2023, nos estados e comparada com outros países.",
    charts: [
      { id: "covid_obitos_uf", kind: "time", fmt: "num1", mode: "uf", peak: true, description: "Mortes por COVID-19 notificadas no mês, por 100 mil habitantes." },
      { id: "covid_excesso_uf", kind: "time", fmt: "pp", mode: "uf", peak: true, description: "Quantas mortes, por todas as causas, houve acima do normal para o mês." },
      { id: "covid_vacinacao_uf", kind: "time", fmt: "pct", mode: "uf", description: "Parcela da população com duas doses ou dose única." },
      { id: "covid_mortes_mundo", kind: "time", fmt: "int", mode: "countries", description: "Mortes por COVID-19 confirmadas, acumuladas, por milhão de habitantes." },
      { id: "covid_excesso_mundo", kind: "time", fmt: "int", mode: "countries", description: "Mortes acima do esperado desde 2020, acumuladas, por milhão de habitantes." },
    ],
  },
]
