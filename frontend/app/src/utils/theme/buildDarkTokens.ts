import { contrastRatio, ensureContrast, hexToRgb, invert, rgbToHex } from './colorMath'

export type CssVarName = `--${string}`

export type ThemeTokenMap = Record<CssVarName, string>

const textMinContrast = 4.5

function getRgbOrThrow(hex: string) {
  const rgb = hexToRgb(hex)
  if (!rgb) throw new Error(`Invalid hex: ${hex}`)
  return rgb
}

function clampDarkSurface(rgb: { r: number; g: number; b: number }) {
  const max = 34
  return {
    r: Math.min(rgb.r, max),
    g: Math.min(rgb.g, max),
    b: Math.min(rgb.b, max),
  }
}

export function buildDarkTokens(light: ThemeTokenMap): ThemeTokenMap {
  const dark: ThemeTokenMap = {}

  for (const [k, v] of Object.entries(light) as Array<[CssVarName, string]>) {
    if (!k.startsWith('--color-')) continue
    const rgb = getRgbOrThrow(v)
    dark[k] = rgbToHex(invert(rgb))
  }

  const bgHex = dark['--color-background'] ?? '#000000'
  const bgRgb = getRgbOrThrow(bgHex)
  dark['--color-background'] = rgbToHex(clampDarkSurface(bgRgb))

  const surfaceKeys: Array<CssVarName> = [
    '--color-surface',
    '--color-surface-container',
    '--color-surface-container-low',
    '--color-surface-container-high',
    '--color-surface-container-lowest',
    '--color-appbar-bg',
  ]
  for (const sk of surfaceKeys) {
    const sv = dark[sk]
    if (!sv) continue
    dark[sk] = rgbToHex(clampDarkSurface(getRgbOrThrow(sv)))
  }

  const onSurfaceKeys: Array<CssVarName> = [
    '--color-on-surface',
    '--color-on-surface-variant',
    '--color-on-primary',
    '--color-on-primary-container',
    '--color-on-brand',
    '--color-on-brand-container',
    '--color-on-error',
  ]

  for (const tk of onSurfaceKeys) {
    const tv = dark[tk]
    if (!tv) continue
    const fgRgb = getRgbOrThrow(tv)
    const ensured = ensureContrast(fgRgb, getRgbOrThrow(dark['--color-background'] ?? bgHex), textMinContrast)
    dark[tk] = rgbToHex(ensured)
  }

  const primaryKey: CssVarName = '--color-primary'
  const primaryHex = dark[primaryKey]
  if (primaryHex) {
    const fg = getRgbOrThrow(primaryHex)
    const bg = getRgbOrThrow(dark['--color-background'] ?? bgHex)
    if (contrastRatio(fg, bg) < 3) {
      dark[primaryKey] = rgbToHex(ensureContrast(fg, bg, 3))
    }
  }

  return dark
}
