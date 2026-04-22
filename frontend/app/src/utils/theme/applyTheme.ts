import type { ThemeTokenMap } from './buildDarkTokens'
import { buildDarkTokens } from './buildDarkTokens'

export type ThemePalette = 'green' | 'ochre'
export type ThemeMode = 'light' | 'dark'

const tokenNames = [
  '--color-primary',
  '--color-primary-container',
  '--color-on-primary',
  '--color-on-primary-container',
  '--color-secondary',
  '--color-brand',
  '--color-brand-container',
  '--color-on-brand',
  '--color-on-brand-container',
  '--color-accent',
  '--color-accent-600',
  '--color-accent-400',
  '--color-accent-100',
  '--color-accent-50',
  '--color-background',
  '--color-surface',
  '--color-surface-container',
  '--color-surface-container-low',
  '--color-surface-container-high',
  '--color-surface-container-lowest',
  '--color-appbar-bg',
  '--color-on-surface',
  '--color-on-surface-variant',
  '--color-outline',
  '--color-outline-variant',
  '--color-error',
  '--color-on-error',
] as const

type TokenName = (typeof tokenNames)[number]

function getRootEl(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.documentElement
}

function readLightTokens(root: HTMLElement): ThemeTokenMap {
  const computed = getComputedStyle(root)
  const map: ThemeTokenMap = {}
  for (const name of tokenNames) {
    const v = computed.getPropertyValue(name).trim()
    if (v) map[name] = v
  }
  return map
}

function clearTokenOverrides(root: HTMLElement): void {
  for (const name of tokenNames) {
    root.style.removeProperty(name)
  }
}

export function applyTheme(palette: ThemePalette, mode: ThemeMode): void {
  const root = getRootEl()
  if (!root) return

  root.classList.remove('theme-green', 'theme-ochre')
  root.classList.add(palette === 'green' ? 'theme-green' : 'theme-ochre')

  if (mode === 'light') {
    clearTokenOverrides(root)
    return
  }

  const light = readLightTokens(root)
  const dark = buildDarkTokens(light)
  for (const [k, v] of Object.entries(dark) as Array<[TokenName, string]>) {
    root.style.setProperty(k, v)
  }
}
