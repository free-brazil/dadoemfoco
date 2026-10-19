// Build-time only (runs in Astro frontmatter): reads ../data, the same CSVs people download.
import fs from "node:fs"
import path from "node:path"
import type { Event, Meta, SeriesData } from "./types"

const DATA = path.resolve(process.cwd(), "../data")

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = [], cell = "", quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ",") { row.push(cell); cell = "" }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(cell); rows.push(row); row = []; cell = ""
    } else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const [head, ...body] = rows.filter((r) => r.length > 1 || r[0])
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])))
}

const readCsv = (file: string) => parseCsv(fs.readFileSync(path.join(DATA, file), "utf8"))

export const catalog: { base: string; series: Record<string, Meta> } =
  JSON.parse(fs.readFileSync(path.join(DATA, "catalog.json"), "utf8"))

export function series(id: string): SeriesData {
  const meta = catalog.series[id]
  if (!meta) throw new Error(`unknown series ${id}`)
  const rows = readCsv(meta.file)
  const dates = [...new Set(rows.map((r) => r.date))].sort()
  const idx = new Map(dates.map((d, i) => [d, i]))
  const values: Record<string, (number | null)[]> = {}
  const real: Record<string, (number | null)[]> = {}
  for (const r of rows) {
    values[r.geo] ??= Array(dates.length).fill(null)
    values[r.geo][idx.get(r.date)!] = Number(r.value)
    if (meta.money) {
      real[r.geo] ??= Array(dates.length).fill(null)
      real[r.geo][idx.get(r.date)!] = Number(r.value_real)
    }
  }
  return { id, meta, base: catalog.base, dates, values, ...(meta.money ? { real } : {}) }
}

export const curated = (name: string) => readCsv(`curated/${name}.csv`)

export const terms: Event[] = curated("mandatos").map((r) => ({ date: r.date, label: r.label, note: r.how }))
export const cases: Event[] = curated("casos").map((r) => ({ date: r.date, label: r.name, note: r.what }))
