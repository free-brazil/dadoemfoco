import type { ReactNode } from "react"
import { Download } from "lucide-react"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { dateLabel } from "@/lib/format"
import type { Meta } from "@/lib/types"

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "")

export type Headline = {
  label: string        // "Santa Catarina · 2º tri 2026"
  value: string        // "2,1%"
  color: string
  compare?: { label: string; value: string }[]  // [{label: "Brasil", value: "5,4%"}, {label: "Em 2012", value: "4,2%"}]
}

export function ChartCard({ meta, anchor, title, description, action, headline, legend, children }: {
  meta: Meta
  anchor: string
  title?: string
  description: string
  action?: ReactNode
  headline?: Headline | null
  legend?: ReactNode
  children: ReactNode
}) {
  return (
    <Card id={anchor} className="scroll-mt-6 sm:scroll-mt-32 gap-5">
      <CardHeader>
        <h2 className="text-lg font-semibold leading-tight">{title ?? meta.title}</h2>
        <CardDescription className="max-w-2xl">{description}</CardDescription>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      {headline && (
        <div className="flex flex-wrap items-end gap-x-8 gap-y-2 px-(--card-spacing)">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">{headline.label}</span>
            <span className="font-display text-4xl font-semibold leading-none" style={{ color: headline.color }}>{headline.value}</span>
          </div>
          {headline.compare?.map((c) => (
            <div key={c.label} className="flex flex-col pb-0.5">
              <span className="text-xs text-muted-foreground">{c.label}</span>
              <span className="num text-base font-medium">{c.value}</span>
            </div>
          ))}
        </div>
      )}
      <CardContent className="flex flex-col gap-3">
        {legend}
        {children}
        {meta.note && <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">Nota: {meta.note}.</p>}
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="min-w-0">
          Fonte: <a className="underline decoration-border underline-offset-2 hover:text-foreground hover:decoration-current" href={meta.url} target="_blank" rel="noopener">{meta.source}</a>
        </span>
        <div className="flex items-center gap-3">
          <span className="num">{meta.freq.toLowerCase()} · {dateLabel(meta.since)}–{dateLabel(meta.until)}</span>
          <a href={`${BASE}/data/${meta.file}`} download
            className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 font-medium text-foreground hover:bg-muted">
            <Download className="size-3.5" aria-hidden /> CSV
          </a>
        </div>
      </CardFooter>
    </Card>
  )
}

export function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      {dashed
        ? <span className="h-3 w-0 border-l border-dashed" style={{ borderColor: color }} />
        : <span className="h-[3px] w-4 rounded-full" style={{ background: color }} />}
      {label}
    </span>
  )
}
