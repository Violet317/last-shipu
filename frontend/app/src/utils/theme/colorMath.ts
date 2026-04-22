export interface Rgb {
  r: number
  g: number
  b: number
}

export function clamp01(v: number): number {
  if (v < 0) return 0
  if (v > 1) return 1
  return v
}

export function hexToRgb(hex: string): Rgb | null {
  const h = hex.trim().replace(/^#/, '')
  if (h.length !== 6) return null
  const n = Number.parseInt(h, 16)
  if (Number.isNaN(n)) return null
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  }
}

export function rgbToHex(rgb: Rgb): string {
  const r = Math.round(rgb.r).toString(16).padStart(2, '0')
  const g = Math.round(rgb.g).toString(16).padStart(2, '0')
  const b = Math.round(rgb.b).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}

export function invert(rgb: Rgb): Rgb {
  return { r: 255 - rgb.r, g: 255 - rgb.g, b: 255 - rgb.b }
}

function srgbToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(rgb: Rgb): number {
  const r = srgbToLinear(rgb.r)
  const g = srgbToLinear(rgb.g)
  const b = srgbToLinear(rgb.b)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const k = clamp01(t)
  return {
    r: a.r * (1 - k) + b.r * k,
    g: a.g * (1 - k) + b.g * k,
    b: a.b * (1 - k) + b.b * k,
  }
}

export function ensureContrast(fg: Rgb, bg: Rgb, min: number): Rgb {
  if (contrastRatio(fg, bg) >= min) return fg
  const white: Rgb = { r: 255, g: 255, b: 255 }
  const black: Rgb = { r: 0, g: 0, b: 0 }
  const bgLum = relativeLuminance(bg)
  const target = bgLum < 0.5 ? white : black
  let lo = 0
  let hi = 1
  let best = fg
  for (let i = 0; i < 18; i += 1) {
    const mid = (lo + hi) / 2
    const cand = mix(fg, target, mid)
    const ratio = contrastRatio(cand, bg)
    if (ratio >= min) {
      best = cand
      hi = mid
    } else {
      lo = mid
    }
  }
  return best
}

