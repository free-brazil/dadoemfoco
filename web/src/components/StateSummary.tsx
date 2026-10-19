import { dateLabel, fmt, geoName } from "@/lib/format"
import { usePrefs } from "@/lib/prefs"
import type { Fmt } from "@/lib/types"

export type Stat = {
  label: string
  date: string
  fmt: Fmt
  values: Record<string, number> // by geo, latest period
  higherIsBetter: boolean
  href: string
}

/** The chosen state (or Brasil) in a handful of latest numbers, each next to Brasil and its rank. */
export default function StateSummary({ stats }: { stats: Stat[] }) {
  const { uf } = usePrefs()
  const g = stats.every((s) => s.values[uf] != null) ? uf : "BR"
  return (
    <section aria-labelledby="summary-title" className="flex flex-col gap-3">
      <h2 id="summary-title" className="text-sm font-medium text-muted-foreground">
        {g === "BR" ? "O Brasil em números recentes" : `${geoName(g)} em números recentes`}
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => {
          const states = Object.entries(s.values).filter(([k]) => k !== "BR").sort((a, b) => (s.higherIsBetter ? b[1] - a[1] : a[1] - b[1]))
          const rank = states.findIndex(([k]) => k === g) + 1
          return (
            <a key={s.label} href={s.href} className="flex flex-col gap-1 rounded-lg border bg-card p-4 hover:border-ring">
              <span className="text-xs text-muted-foreground">{s.label}, {dateLabel(s.date)}</span>
              <span className="text-2xl font-semibold tracking-tight" style={{ color: g === "BR" ? "var(--chart-1)" : "var(--chart-2)" }}>
                {fmt(s.values[g], s.fmt)}
              </span>
              <span className="text-xs text-muted-foreground">
                {g === "BR" ? "média nacional" : `Brasil: ${fmt(s.values.BR, s.fmt)} · ${rank}º melhor de ${states.length}`}
              </span>
            </a>
          )
        })}
      </div>
    </section>
  )
}
