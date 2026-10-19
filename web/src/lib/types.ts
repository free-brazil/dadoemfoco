export type Meta = {
  id: string
  title: string
  unit: string
  freq: string
  geo: string
  source: string
  url: string
  note?: string
  money?: boolean
  breaks?: string[]
  rows: number
  since: string
  until: string
  file: string
}

export type SeriesData = {
  id: string
  meta: Meta
  base: string // YYYY-MM of the deflator
  dates: string[] // "2002", "2012-Q1" or "2002-01"
  values: Record<string, (number | null)[]>
  real?: Record<string, (number | null)[]>
}

export type Event = { date: string; label: string; note: string }

export type Fmt = "pct" | "pp" | "brl_mil" | "brl" | "brl_rate" | "int" | "num" | "num1"
