import { useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ChartCard, LegendItem, type Headline } from "@/components/ChartCard"
import { dateLabel, eventKey, fmt, geoName, monthLabel, tick } from "@/lib/format"
import { usePrefs } from "@/lib/prefs"
import type { Event, Fmt, SeriesData } from "@/lib/types"

export const COLOR = { br: "var(--chart-1)", uf: "var(--chart-2)", other: "var(--chart-3)", mark: "var(--chart-4)" }

/**
 * uf        every state in grey, Brasil in blue, the chosen state in amber (rates, comparable across states)
 * focus     only the chosen state, or Brasil (absolute values, where SP would flatten everyone else)
 * national  the Brasil line only
 * countries every country in grey, Brasil in amber, names at the line ends
 * areas     metro areas in grey; the chosen state's areas in amber
 */
export type Mode = "uf" | "focus" | "national" | "countries" | "areas"

export default function TimeChart({ data, fmt: f, mode, anchor, title, description, terms, cases, peak }: {
  data: SeriesData
  fmt: Fmt
  mode: Mode
  peak?: boolean  // headline the highest point instead of the latest (event series like COVID)
  anchor: string
  title?: string
  description: string
  terms: Event[]
  cases: Event[]
}) {
  const prefs = usePrefs()
  const [real, setReal] = useState(true)
  const vals = data.real && real ? data.real : data.values
  const geos = Object.keys(vals)
  const last = data.dates.length - 1

  const { focus, others } = useMemo(() => {
    const uf = prefs.uf
    switch (mode) {
      case "national": return { focus: ["BR"], others: [] as string[] }
      case "focus": return { focus: [vals[uf] ? uf : vals.BR ? "BR" : uf], others: [] }
      case "countries": return { focus: ["BRA"], others: geos.filter((g) => g !== "BRA") }
      case "areas": {
        const mine = geos.filter((g) => g.endsWith(` - ${uf}`))
        return { focus: mine, others: geos.filter((g) => !mine.includes(g)) }
      }
      default: return { focus: uf !== "BR" && vals[uf] ? ["BR", uf] : ["BR"], others: geos.filter((g) => g !== "BR" && g !== uf) }
    }
  }, [mode, prefs.uf, vals])

  const colorOf = (g: string) => (mode === "countries" || mode === "areas" || g !== "BR" ? COLOR.uf : COLOR.br)
  const rows = useMemo(
    () => data.dates.map((d, i) => Object.fromEntries([["d", d], ...geos.map((g) => [g, vals[g][i]])])),
    [data, vals],
  )
  const ticks = useMemo(() => pickTicks(data.dates), [data.dates])
  const unit = data.real && real ? `R$ de ${monthLabel(data.base)}` : data.meta.money ? "R$ da época" : data.meta.unit

  const overlays = [
    ...(prefs.terms ? terms.map((e) => ({ ...e, kind: "term" as const })) : []),
    ...(prefs.cases ? cases.map((e) => ({ ...e, kind: "case" as const })) : []),
  ]
    .map((e) => ({ ...e, x: eventKey(e.date, data.dates[0]) }))
    .filter((e) => data.dates.includes(e.x))

  // Headline: the line people care about, its latest value, Brasil beside it, and where it started.
  const headline: Headline | null = useMemo(() => {
    const p = mode === "uf" ? focus[focus.length - 1] : focus[0]
    if (!p || !vals[p]) return null
    if (peak) {
      const pk = (g: string) => vals[g].reduce<number>((b, v, i) => (v != null && v > (vals[g][b] ?? -Infinity) ? i : b), 0)
      const i = pk(p)
      const compare = mode === "uf" && p !== "BR" && vals.BR
        ? [{ label: `Pico no Brasil · ${dateLabel(data.dates[pk("BR")])}`, value: fmt(vals.BR[pk("BR")], f) }] : []
      return { label: `Pico em ${geoName(p)} · ${dateLabel(data.dates[i])}`, value: fmt(vals[p][i], f), color: colorOf(p), compare }
    }
    const li = lastValid(vals[p], last), fi = vals[p].findIndex((v) => v != null)
    const compare: { label: string; value: string }[] = []
    if (mode === "uf" && p !== "BR") compare.push({ label: "Brasil", value: fmt(vals.BR?.[li], f) })
    if (mode !== "countries" && fi >= 0 && fi < li) compare.push({ label: `Em ${dateLabel(data.dates[fi])}`, value: fmt(vals[p][fi], f) })
    return { label: `${geoName(p)} · ${dateLabel(data.dates[li])}`, value: fmt(vals[p][li], f), color: colorOf(p), compare }
  }, [focus, vals, mode, f, peak])

  // Line-end labels: values for the highlighted lines, names for countries; pushed apart so they never collide.
  const endLabels = useMemo(() => {
    const items = (mode === "countries" ? [...others, ...focus] : focus).flatMap((g) => {
      const li = lastValid(vals[g], last)
      if (li < 0) return []
      return [{ g, li, v: vals[g][li] as number, text: mode === "countries" ? geoName(g) : fmt(vals[g][li], f),
        color: mode === "countries" && g !== "BRA" ? "var(--muted-foreground)" : colorOf(g), strong: focus.includes(g) }]
    })
    const all = Object.values(vals).flat().filter((v): v is number => v != null)
    const lo = Math.min(0, ...all), hi = Math.max(...all)
    const gap = (hi - lo) * 0.065
    const byEnd = new Map<number, typeof items>()
    for (const it of items) byEnd.set(it.li, [...(byEnd.get(it.li) ?? []), it])
    return [...byEnd.values()].flatMap((group) => {
      // push labels away from the nearer edge so none ends up outside the plot
      const mean = group.reduce((a, it) => a + it.v, 0) / group.length
      const up = mean < (lo + hi) / 2
      group.sort((a, b) => (up ? a.v - b.v : b.v - a.v))
      let prev = up ? -Infinity : Infinity
      return group.map((it) => {
        const y = up ? Math.max(it.v, prev + gap) : Math.min(it.v, prev - gap)
        prev = y
        return { ...it, y }
      })
    })
  }, [focus, others, vals, mode, f])

  return (
    <ChartCard
      meta={data.meta}
      anchor={anchor}
      title={title}
      description={`${description} Em ${unit}.`}
      headline={headline}
      action={data.real && (
        <ToggleGroup variant="outline" size="sm" value={[real ? "real" : "nominal"]}
          onValueChange={(v) => v[0] && setReal(v[0] === "real")} aria-label="Valores em">
          <ToggleGroupItem value="real">R$ de hoje</ToggleGroupItem>
          <ToggleGroupItem value="nominal">R$ da época</ToggleGroupItem>
        </ToggleGroup>
      )}
      legend={
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {mode === "areas" && focus.length === 0 && <span>Escolha um estado no topo para destacar suas regiões metropolitanas.</span>}
          {focus.map((g) => <LegendItem key={g} color={colorOf(g)} label={geoName(g)} />)}
          {others.length > 0 && <LegendItem color={COLOR.other} label={mode === "countries" ? "Outros países" : mode === "areas" ? "Outras regiões" : "Outros estados"} />}
          {prefs.terms && <LegendItem color="var(--muted-foreground)" label="Início de mandato" dashed />}
          {prefs.cases && overlays.some((o) => o.kind === "case") && <LegendItem color={COLOR.mark} label="Caso de corrupção" dashed />}
        </div>
      }
    >
      <ChartContainer config={{}} className="aspect-auto h-72 w-full sm:h-80">
        <LineChart data={rows} margin={{ left: 4, right: mode === "countries" ? 84 : 76, top: 22, bottom: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="2 3" />
          <XAxis dataKey="d" ticks={ticks} tickFormatter={(d: string) => d.slice(0, 4)} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis tickLine={false} axisLine={false} width={f.startsWith("brl") ? 76 : f === "int" ? 64 : 48}
            domain={[minOf(vals) >= 0 ? 0 : "auto", "auto"]} tickFormatter={(v: number) => tick(v, f)} />
          <ChartTooltip
            cursor={{ stroke: "var(--border)" }}
            content={({ active, label }) => {
              if (!active || label == null) return null
              const i = data.dates.indexOf(String(label))
              const shown = focus.length ? focus : others.slice(0, 1)
              return (
                <div className="grid min-w-44 gap-1 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
                  <div className="font-medium">{dateLabel(String(label))}</div>
                  {shown.map((g) => (
                    <div key={g} className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ background: colorOf(g) }} />
                        {geoName(g)}
                      </span>
                      <span className="num font-medium">{fmt(vals[g]?.[i], f)}</span>
                    </div>
                  ))}
                  {overlays.filter((o) => o.x === label).map((o) => (
                    <div key={o.label} className="max-w-64 border-t pt-1 text-muted-foreground">{o.kind === "term" ? "Posse: " : "Caso: "}{o.label}</div>
                  ))}
                </div>
              )
            }}
          />
          {(data.meta.breaks ?? []).filter((b) => data.dates.includes(b)).map((b) => (
            <ReferenceLine key={`b${b}`} x={b} stroke="var(--foreground)" strokeOpacity={0.35}
              label={{ value: "quebra de série", position: "insideTopLeft", fill: "var(--muted-foreground)", fontSize: 10 }} />
          ))}
          {overlays.map((o, k) => (
            <ReferenceLine key={`${o.kind}${o.date}`} x={o.x}
              stroke={o.kind === "term" ? "var(--muted-foreground)" : COLOR.mark}
              strokeOpacity={o.kind === "term" ? 0.45 : 0.8} strokeDasharray={o.kind === "term" ? "2 4" : "4 3"}
              label={o.kind === "term"
                ? { value: o.label, position: "top", fill: "var(--muted-foreground)", fontSize: 10 }
                // cases cluster in time: stagger their labels on three heights so neighbours don't overlap
                : { value: o.label, position: "insideBottomLeft", offset: 6 + (k % 3) * 14, fill: COLOR.mark, fontSize: 10 }} />
          ))}
          {others.map((g) => (
            <Line key={g} dataKey={g} stroke={COLOR.other} strokeOpacity={0.22} strokeWidth={1} dot={false}
              isAnimationActive={false} activeDot={false} connectNulls />
          ))}
          {focus.map((g) => (
            <Line key={g} dataKey={g} stroke={colorOf(g)} strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} />
          ))}
          {focus.map((g) => {
            const li = lastValid(vals[g], last)
            return li < 0 ? null : <ReferenceDot key={`dot${g}`} x={data.dates[li]} y={vals[g][li] as number} r={3.5}
              fill={colorOf(g)} stroke="var(--card)" strokeWidth={2} ifOverflow="visible" />
          })}
          {endLabels.map((l) => (
            <ReferenceDot key={`lab${l.g}`} x={data.dates[l.li]} y={l.y} r={0} ifOverflow="visible"
              label={{ value: l.text, position: "right", offset: 8, fill: l.color, fontSize: 11, fontWeight: l.strong ? 600 : 400 }} />
          ))}
        </LineChart>
      </ChartContainer>
    </ChartCard>
  )
}

function minOf(vals: Record<string, (number | null)[]>) {
  let m = Infinity
  for (const arr of Object.values(vals)) for (const v of arr) if (v != null && v < m) m = v
  return m
}

function lastValid(arr: (number | null)[] | undefined, from: number) {
  for (let i = from; i >= 0; i--) if (arr?.[i] != null) return i
  return -1
}

/** ~8 ticks on year boundaries, whatever the frequency. */
function pickTicks(dates: string[]) {
  const firsts = dates.filter((d, i) => i === 0 || d.slice(0, 4) !== dates[i - 1].slice(0, 4))
  const step = Math.max(1, Math.ceil(firsts.length / 8))
  return firsts.filter((_, i) => i % step === 0)
}
