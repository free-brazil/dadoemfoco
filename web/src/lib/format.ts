import type { Fmt } from "./types"

export const UF_NAMES: Record<string, string> = {
  BR: "Brasil", AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso",
  MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco",
  PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul", RO: "Rondônia",
  RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
}
export const COUNTRY_NAMES: Record<string, string> = {
  BRA: "Brasil", USA: "EUA", IND: "Índia", RUS: "Rússia", IDN: "Indonésia", MEX: "México",
  ARG: "Argentina", CUB: "Cuba", COL: "Colômbia", CHL: "Chile", VEN: "Venezuela",
}
export const geoName = (g: string) => UF_NAMES[g] ?? COUNTRY_NAMES[g] ?? g

const MES = "jan fev mar abr mai jun jul ago set out nov dez".split(" ")

/** "2002" | "2012-Q1" | "2002-01" -> "2002" | "1º tri 2012" | "jan/2002" */
export function dateLabel(d: string) {
  if (d.includes("-Q")) return `${d.slice(-1)}º tri ${d.slice(0, 4)}`
  if (d.length === 7) return `${MES[+d.slice(5) - 1]}/${d.slice(0, 4)}`
  return d
}
export const monthLabel = (ym: string) => `${MES[+ym.slice(5, 7) - 1]}/${ym.slice(0, 4)}`

const nf = (v: number, min = 0, max = min) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: min, maximumFractionDigits: max })

/** Long form, for tooltips and stat tiles. */
export function fmt(v: number | null | undefined, f: Fmt): string {
  if (v == null || Number.isNaN(v)) return "—"
  switch (f) {
    case "pct": return `${nf(v, 1)}%`
    case "pp": return `${v > 0 ? "+" : ""}${nf(v, 1)}%`
    case "brl_mil": return brl(v * 1000)
    case "brl": return brl(v)
    case "brl_rate": return `R$ ${nf(v, 2)}`
    case "int": return nf(Math.round(v))
    case "num1": return nf(v, 1)
    default: return nf(v, 0, 2)
  }
}

/** Short form, for axis ticks. */
export function tick(v: number, f: Fmt): string {
  if (f === "pct" || f === "pp") return `${nf(v, 0, 1)}%`
  if (f === "brl_mil") return brlShort(v * 1000)
  if (f === "brl") return brlShort(v)
  if (f === "brl_rate") return `R$ ${nf(v, 0, 1)}`
  if (Math.abs(v) >= 1e6) return `${nf(v / 1e6, 0, 1)} mi`
  if (Math.abs(v) >= 1e3) return `${nf(v / 1e3, 0, 1)} mil`
  return nf(v, 0, 1)
}

function brl(v: number) {
  const a = Math.abs(v)
  if (a >= 1e12) return `R$ ${nf(v / 1e12, 2)} tri`
  if (a >= 1e9) return `R$ ${nf(v / 1e9, 1)} bi`
  if (a >= 1e6) return `R$ ${nf(v / 1e6, 1)} mi`
  return `R$ ${nf(v, 0)}`
}
function brlShort(v: number) {
  const a = Math.abs(v)
  if (a >= 1e12) return `R$ ${nf(v / 1e12, 0, 1)} tri`
  if (a >= 1e9) return `R$ ${nf(v / 1e9, 0)} bi`
  if (a >= 1e6) return `R$ ${nf(v / 1e6, 0)} mi`
  if (a >= 1e3) return `R$ ${nf(v / 1e3, 0, 1)} mil`
  return `R$ ${nf(v, 0)}`
}

/** Maps an event date (YYYY-MM or YYYY-MM-DD) onto a series' x key. */
export function eventKey(date: string, sample: string) {
  const y = date.slice(0, 4), m = +date.slice(5, 7)
  if (sample.includes("-Q")) return `${y}-Q${Math.ceil(m / 3)}`
  if (sample.length === 7) return date.slice(0, 7)
  return y
}
