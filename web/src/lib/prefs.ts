// Viewer preferences shared by every island on the page: chosen state and the two overlays.
// Lives in the URL (?uf=SC&mandatos=0&casos=1) so a link reproduces the view, with localStorage as memory.
import { useSyncExternalStore } from "react"

export type Prefs = { uf: string; terms: boolean; cases: boolean }
const DEFAULT: Prefs = { uf: "BR", terms: true, cases: false }
const EVT = "dadoemfoco:prefs"

let cached: Prefs | null = null

function read(): Prefs {
  const p = new URLSearchParams(window.location.search)
  let stored: Partial<Prefs> = {}
  try { stored = JSON.parse(localStorage.getItem("dadoemfoco:prefs") || "{}") } catch { /* private mode */ }
  return {
    uf: (p.get("uf") ?? stored.uf ?? DEFAULT.uf).toUpperCase(),
    terms: p.has("mandatos") ? p.get("mandatos") !== "0" : stored.terms ?? DEFAULT.terms,
    cases: p.has("casos") ? p.get("casos") === "1" : stored.cases ?? DEFAULT.cases,
  }
}

export function getPrefs(): Prefs {
  return (cached ??= read())
}

export function query(p: Prefs) {
  const q = new URLSearchParams()
  if (p.uf !== "BR") q.set("uf", p.uf)
  if (!p.terms) q.set("mandatos", "0")
  if (p.cases) q.set("casos", "1")
  const s = q.toString()
  return s ? `?${s}` : ""
}

export function setPrefs(patch: Partial<Prefs>) {
  cached = { ...getPrefs(), ...patch }
  history.replaceState(null, "", window.location.pathname + query(cached) + window.location.hash)
  try { localStorage.setItem("dadoemfoco:prefs", JSON.stringify(cached)) } catch { /* private mode */ }
  window.dispatchEvent(new Event(EVT))
}

function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb)
  return () => window.removeEventListener(EVT, cb)
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, getPrefs, () => DEFAULT)
}
