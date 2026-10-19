import { useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { UF_NAMES } from "@/lib/format"
import { query, setPrefs, usePrefs } from "@/lib/prefs"

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "")
const ITEMS = [
  { value: "BR", label: "Brasil (nenhum estado)" },
  ...Object.keys(UF_NAMES).filter((k) => k !== "BR")
    .sort((a, b) => UF_NAMES[a].localeCompare(UF_NAMES[b], "pt-BR"))
    .map((k) => ({ value: k, label: `${UF_NAMES[k]} (${k})` })),
]

export function Mark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" fill="var(--chart-1)" />
      <rect x="7" y="17" width="4" height="8" rx="1" fill="var(--primary-foreground)" />
      <rect x="14" y="11" width="4" height="14" rx="1" fill="var(--primary-foreground)" />
      <rect x="21" y="7" width="4" height="18" rx="1" fill="var(--chart-2)" />
    </svg>
  )
}

export default function Header({ themes, current }: { themes: { slug: string; title: string }[]; current: string }) {
  const prefs = usePrefs()
  const q = query(prefs)
  const toggles = [...(prefs.terms ? ["terms"] : []), ...(prefs.cases ? ["cases"] : [])]
  useEffect(() => {  // on phones the nav scrolls sideways: bring the current page's tab into view
    document.querySelector('nav [aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" })
  }, [])
  const tab = "block whitespace-nowrap border-b-2 border-transparent px-1 pb-2 pt-1 text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:border-[var(--chart-2)] aria-[current=page]:font-medium aria-[current=page]:text-foreground"
  return (
    <div className="flex flex-col gap-3 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <a href={`${BASE}/${q}`} className="flex items-center gap-2.5" aria-label="Dado em Foco, início">
          <Mark />
          <span className="font-display text-xl font-bold">Dado em Foco</span>
        </a>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="uf-select" className="sr-only">Seu estado</label>
          <Select items={ITEMS} value={prefs.uf} onValueChange={(v) => v && setPrefs({ uf: v as string })}>
            <SelectTrigger id="uf-select" className="w-auto min-w-56">
              <span className="text-muted-foreground">Seu estado:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITEMS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <ToggleGroup variant="outline" size="sm" value={toggles} multiple
            onValueChange={(v) => setPrefs({ terms: v.includes("terms"), cases: v.includes("cases") })}
            aria-label="Marcações nos gráficos">
            <ToggleGroupItem value="terms" className="h-8" title="Linhas no início de cada mandato presidencial">Mandatos</ToggleGroupItem>
            <ToggleGroupItem value="cases" className="h-8" title="Linhas nos principais casos de corrupção">Casos</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      <nav aria-label="Temas" className="-mb-px overflow-x-auto">
        <ul className="flex w-max gap-5 text-sm">
          {[...themes, { slug: "sobre", title: "Sobre" }].map((t) => (
            <li key={t.slug}>
              <a href={`${BASE}/${t.slug}/${q}`} aria-current={t.slug === current ? "page" : undefined} className={tab}>{t.title}</a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
