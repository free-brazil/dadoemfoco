import { useState } from "react"
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ChartCard } from "@/components/ChartCard"
import { COLOR } from "@/components/TimeChart"
import { dateLabel, fmt, geoName, monthLabel, tick } from "@/lib/format"
import { usePrefs } from "@/lib/prefs"
import type { Fmt, SeriesData } from "@/lib/types"

/** The 27 states at the latest period, highest first, chosen state highlighted. */
export default function RankingChart({ data, fmt: f, title, description }: {
  data: SeriesData
  fmt: Fmt
  title?: string
  description: string
}) {
  const { uf } = usePrefs()
  const [real, setReal] = useState(true)
  const vals = data.real && real ? data.real : data.values
  const last = data.dates.length - 1
  const rows = Object.keys(vals).filter((g) => g !== "BR" && vals[g][last] != null)
    .map((g) => ({ g, v: vals[g][last] as number }))
    .sort((a, b) => b.v - a.v)
  const rank = rows.findIndex((r) => r.g === uf) + 1
  const unit = data.real && real ? `R$ de ${monthLabel(data.base)}` : data.meta.money ? "R$ da época" : data.meta.unit

  return (
    <ChartCard
      meta={data.meta}
      title={title ?? `${data.meta.title}, ${dateLabel(data.dates[last])}`}
      description={`${description} Em ${unit}.${rank ? ` ${geoName(uf)} está em ${rank}º de ${rows.length}.` : ""}`}
      action={data.real && (
        <ToggleGroup variant="outline" size="sm" value={[real ? "real" : "nominal"]}
          onValueChange={(v) => v[0] && setReal(v[0] === "real")} aria-label="Valores em">
          <ToggleGroupItem value="real">R$ de hoje</ToggleGroupItem>
          <ToggleGroupItem value="nominal">R$ da época</ToggleGroupItem>
        </ToggleGroup>
      )}
    >
      <ChartContainer config={{}} className="aspect-auto w-full" style={{ height: rows.length * 22 + 40 }}>
        <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 16 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v: number) => tick(v, f)} />
          <YAxis type="category" dataKey="g" tickLine={false} axisLine={false} width={32} interval={0} />
          <ChartTooltip cursor={{ fill: "var(--muted)" }}
            content={({ active, payload }) => active && payload?.length ? (
              <div className="rounded-lg border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md">
                <div className="font-medium">{geoName((payload[0].payload as { g: string }).g)}</div>
                <div className="font-mono">{fmt(payload[0].value as number, f)}</div>
              </div>
            ) : null} />
          <Bar dataKey="v" radius={[0, 3, 3, 0]} isAnimationActive={false}>
            {rows.map((r) => <Cell key={r.g} fill={r.g === uf ? COLOR.uf : COLOR.other} fillOpacity={r.g === uf ? 1 : 0.45} />)}
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}
