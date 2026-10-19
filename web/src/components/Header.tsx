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

export default function Header({ themes, current }: { themes: { slug: string; title: string }[]; current: string }) {
  const prefs = usePrefs()
  const q = query(prefs)
  const toggles = [...(prefs.terms ? ["terms"] : []), ...(prefs.cases ? ["cases"] : [])]
  useEffect(() => {  // on phones the nav scrolls sideways: bring the current page's tab into view
    document.querySelector('nav [aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" })
  }, [])
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <a href={`${BASE}/${q}`} className="flex flex-col">
          <span className="text-xl font-semibold tracking-tight">Dado em Foco</span>
          <span className="text-sm text-muted-foreground">Dados públicos do Brasil desde 2002, com a fonte de cada número.</span>
        </a>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nos gráficos</span>
            <ToggleGroup variant="outline" value={toggles} multiple
              onValueChange={(v) => setPrefs({ terms: v.includes("terms"), cases: v.includes("cases") })}
              aria-label="Marcações nos gráficos">
              <ToggleGroupItem value="terms" className="h-8">Mandatos</ToggleGroupItem>
              <ToggleGroupItem value="cases" className="h-8">Casos de corrupção</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="uf-select" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Seu estado</label>
            <Select items={ITEMS} value={prefs.uf} onValueChange={(v) => v && setPrefs({ uf: v as string })}>
              <SelectTrigger id="uf-select" className="w-60"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ITEMS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <nav aria-label="Temas" className="-mx-1 overflow-x-auto">
        <ul className="flex w-max gap-1 rounded-lg bg-muted p-1 text-sm">
          {themes.map((t) => (
            <li key={t.slug}>
              <a href={`${BASE}/${t.slug}/${q}`} aria-current={t.slug === current ? "page" : undefined}
                className="block rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-sm">
                {t.title}
              </a>
            </li>
          ))}
          <li>
            <a href={`${BASE}/sobre/${q}`} aria-current={current === "sobre" ? "page" : undefined}
              className="block rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-sm">
              Sobre
            </a>
          </li>
        </ul>
      </nav>
    </div>
  )
}
