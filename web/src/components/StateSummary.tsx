import { dateLabel, fmt, geoName } from "@/lib/format"
import { usePrefs } from "@/lib/prefs"
import { sparkPath } from "@/lib/spark"
import type { Fmt } from "@/lib/types"

export type Stat = {
  label: string
  date: string
  fmt: Fmt
  values: Record<string, number>                 // latest value by geo
  history: Record<string, (number | null)[]>     // full series by geo, for the sparkline
  since: string
  higherIsBetter: boolean
  href: string
}

/** The chosen state (or Brasil) in a handful of latest numbers, each next to Brasil, its rank and its trend. */
export default function StateSummary({ stats }: { stats: Stat[] }) {
  const { uf } = usePrefs()
  const g = stats.every((s) => s.values[uf] != null) ? uf : "BR"
  const color = g === "BR" ? "var(--chart-1)" : "var(--chart-2)"
  return (
    <section aria-labelledby="summary-title" className="flex flex-col gap-4">
      <h2 id="summary-title" className="text-2xl font-semibold">
        {g === "BR" ? "O Brasil agora" : `${geoName(g)} agora`}
        <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">
          {g === "BR" ? "escolha seu estado no topo para comparar" : "comparado com o Brasil"}
        </span>
      </h2>
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const states = Object.entries(s.values).filter(([k]) => k !== "BR").sort((a, b) => (s.higherIsBetter ? b[1] - a[1] : a[1] - b[1]))
          const rank = states.findIndex(([k]) => k === g) + 1
          return (
            <a key={s.label} href={s.href} className="group flex flex-col gap-2 bg-card p-5 transition-colors hover:bg-muted/50">
              <span className="text-sm font-medium">{s.label}</span>
              <span className="font-display text-4xl font-semibold leading-none" style={{ color }}>{fmt(s.values[g], s.fmt)}</span>
              <svg viewBox="0 0 120 32" className="h-8 w-full" preserveAspectRatio="none" aria-hidden>
                {g !== "BR" && <path d={sparkPath(s.history.BR)} fill="none" stroke="var(--chart-1)" strokeOpacity={0.35} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
                <path d={sparkPath(s.history[g])} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
              </svg>
              <span className="text-xs text-muted-foreground">
                {dateLabel(s.date)}{g === "BR" ? ` · desde ${dateLabel(s.since)}` : ` · Brasil ${fmt(s.values.BR, s.fmt)} · ${rank}º melhor de ${states.length}`}
              </span>
            </a>
          )
        })}
      </div>
    </section>
  )
}
