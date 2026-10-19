/** SVG path for a sparkline of `values` in a w×h box (nulls skipped). Pure: used at build time and in islands. */
export function sparkPath(values: (number | null)[], w = 120, h = 32, pad = 2) {
  const pts = values.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] != null)
  if (pts.length < 2) return ""
  const ys = pts.map((p) => p[1])
  const min = Math.min(...ys), max = Math.max(...ys), span = max - min || 1
  const x = (i: number) => pad + (i / (values.length - 1)) * (w - 2 * pad)
  const y = (v: number) => h - pad - ((v - min) / span) * (h - 2 * pad)
  return pts.map(([i, v], k) => `${k ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("")
}
