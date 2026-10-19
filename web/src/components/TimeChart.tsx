import { useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis, LabelList } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ChartCard, LegendItem } from "@/components/ChartCard"
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

export default function TimeChart({ data, fmt: f, mode, title, description, terms, cases }: {
  data: SeriesData
  fmt: Fmt
  mode: Mode
  title?: string
  description: string
  terms: Event[]
  cases: Event[]
}) {
  const prefs = usePrefs()
  const [real, setReal] = useState(true)
  const vals = data.real && real ? data.real : data.values
  const geos = Object.keys(vals)

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

  const rows = useMemo(
    () => data.dates.map((d, i) => Object.fromEntries([["d", d], ...geos.map((g) => [g, vals[g][i]])])),
    [data, vals],
  )
  const ticks = useMemo(() => pickTicks(data.dates), [data.dates])
  const sample = data.dates[0]
  const colorOf = (g: string) => (g === "BR" ? COLOR.br : COLOR.uf)
  const focusLabel = (g: string) => geoName(g)

  const overlays = [
    ...(prefs.terms ? terms.map((e) => ({ ...e, kind: "term" as const })) : []),
    ...(prefs.cases ? cases.map((e) => ({ ...e, kind: "case" as const })) : []),
  ]
    .map((e) => ({ ...e, x: eventKey(e.date, sample) }))
    .filter((e) => data.dates.includes(e.x))

  const unit = data.real && real ? `R$ de ${monthLabel(data.base)}` : data.meta.money ? "R$ da época" : data.meta.unit
  const lastIdx = data.dates.length - 1

  return (
    <ChartCard
      meta={data.meta}
      title={title}
      description={`${description} Em ${unit}.`}
      action={data.real && (
        <ToggleGroup variant="outline" size="sm" value={[real ? "real" : "nominal"]}
          onValueChange={(v) => v[0] && setReal(v[0] === "real")} aria-label="Valores em">
          <ToggleGroupItem value="real">R$ de hoje</ToggleGroupItem>
          <ToggleGroupItem value="nominal">R$ da época</ToggleGroupItem>
        </ToggleGroup>
      )}
      legend={
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {mode === "areas" && focus.length === 0 && <span>Escolha um estado para destacar suas regiões metropolitanas.</span>}
          {focus.map((g) => <LegendItem key={g} color={mode === "countries" || mode === "areas" ? COLOR.uf : colorOf(g)} label={focusLabel(g)} />)}
          {others.length > 0 && <LegendItem color={COLOR.other} label={mode === "countries" ? "Outros países" : mode === "areas" ? "Outras regiões" : "Outros estados"} />}
          {prefs.terms && <LegendItem color="var(--muted-foreground)" label="Início de mandato" dashed />}
          {prefs.cases && overlays.some((o) => o.kind === "case") && <LegendItem color={COLOR.mark} label="Caso de corrupção" dashed />}
        </div>
      }
    >
      <ChartContainer config={{}} className="aspect-auto h-72 w-full sm:h-80">
        <LineChart data={rows} margin={{ left: 4, right: mode === "countries" ? 72 : 24, top: 22, bottom: 4 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="d" ticks={ticks} tickFormatter={(d: string) => d.slice(0, 4)} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis tickLine={false} axisLine={false} width={f.startsWith("brl") ? 76 : f === "int" ? 64 : 48}
            domain={[minOf(vals) >= 0 ? 0 : "auto", "auto"]} tickFormatter={(v: number) => tick(v, f)} />
          <ChartTooltip
            content={({ active, label }) => {
              if (!active || label == null) return null
              const i = data.dates.indexOf(String(label))
              const shown = focus.length ? focus : others.slice(0, 1)
              return (
                <div className="grid min-w-40 gap-1 rounded-lg border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md">
                  <div className="font-medium">{dateLabel(String(label))}</div>
                  {shown.map((g) => (
                    <div key={g} className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-[2px]" style={{ background: mode === "countries" || mode === "areas" ? COLOR.uf : colorOf(g) }} />
                        {focusLabel(g)}
                      </span>
                      <span className="font-mono font-medium">{fmt(vals[g]?.[i], f)}</span>
                    </div>
                  ))}
                  {overlays.filter((o) => o.x === label).map((o) => (
                    <div key={o.label} className="max-w-64 text-muted-foreground">{o.kind === "term" ? "Posse: " : "Caso: "}{o.label}</div>
                  ))}
                </div>
              )
            }}
          />
          {(data.meta.breaks ?? []).filter((b) => data.dates.includes(b)).map((b) => (
            <ReferenceLine key={`b${b}`} x={b} stroke="var(--foreground)" strokeOpacity={0.4}
              label={{ value: "quebra de série", position: "insideTopLeft", fill: "var(--muted-foreground)", fontSize: 10 }} />
          ))}
          {overlays.map((o, k) => (
            <ReferenceLine key={`${o.kind}${o.date}`} x={o.x}
              stroke={o.kind === "term" ? "var(--muted-foreground)" : COLOR.mark}
              strokeOpacity={o.kind === "term" ? 0.6 : 0.8} strokeDasharray={o.kind === "term" ? "2 4" : "4 3"}
              label={o.kind === "term"
                ? { value: o.label, position: "top", fill: "var(--muted-foreground)", fontSize: 10 }
                // cases cluster in time: stagger their labels on three heights so neighbours don't overlap
                : { value: o.label, position: "insideBottomLeft", offset: 6 + (k % 3) * 14, fill: COLOR.mark, fontSize: 10 }} />
          ))}
          {others.map((g) => (
            <Line key={g} dataKey={g} stroke={COLOR.other} strokeOpacity={0.3} strokeWidth={1} dot={false}
              isAnimationActive={false} activeDot={false} connectNulls>
              {mode === "countries" && <LabelList dataKey={g} content={endLabel(lastValidIndex(vals[g], lastIdx), geoName(g), "var(--muted-foreground)")} />}
            </Line>
          ))}
          {focus.map((g) => (
            <Line key={g} dataKey={g} stroke={mode === "countries" || mode === "areas" ? COLOR.uf : colorOf(g)}
              strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls>
              {mode === "countries" && <LabelList dataKey={g} content={endLabel(lastValidIndex(vals[g], lastIdx), geoName(g), COLOR.uf)} />}
            </Line>
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

function lastValidIndex(arr: (number | null)[] | undefined, from: number) {
  for (let i = from; i >= 0; i--) if (arr?.[i] != null) return i
  return -1
}

function endLabel(at: number, text: string, color: string) {
  // eslint-disable-next-line react/display-name
  return (p: { index?: number; x?: number | string; y?: number | string }) =>
    p.index === at ? <text x={Number(p.x) + 6} y={Number(p.y) + 3} fontSize={10} fill={color}>{text}</text> : null
}

/** ~8 ticks on year boundaries, whatever the frequency. */
function pickTicks(dates: string[]) {
  const firsts = dates.filter((d, i) => i === 0 || d.slice(0, 4) !== dates[i - 1].slice(0, 4))
  const step = Math.max(1, Math.ceil(firsts.length / 8))
  return firsts.filter((_, i) => i % step === 0)
}
