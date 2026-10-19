import type { ReactNode } from "react"
import { Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { dateLabel } from "@/lib/format"
import type { Meta } from "@/lib/types"

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "")

export function ChartCard({ meta, title, description, action, children, legend }: {
  meta: Meta
  title?: string
  description: string
  action?: ReactNode
  legend?: ReactNode
  children: ReactNode
}) {
  return (
    <Card id={meta.id} className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="text-base">{title ?? meta.title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {legend}
        {children}
        {meta.note && <p className="text-xs text-muted-foreground">Nota: {meta.note}.</p>}
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Fonte: <a className="underline underline-offset-2 hover:text-foreground" href={meta.url} target="_blank" rel="noopener">{meta.source}</a>
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{meta.freq}</Badge>
          <Badge variant="secondary">{dateLabel(meta.since)} – {dateLabel(meta.until)}</Badge>
          <a
            href={`${BASE}/data/${meta.file}`}
            download
            className="inline-flex h-7 items-center gap-1 rounded-md border px-2 font-medium text-foreground hover:bg-muted"
          >
            <Download className="size-3.5" /> CSV
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
        : <span className="h-0.5 w-4 rounded" style={{ background: color }} />}
      {label}
    </span>
  )
}
