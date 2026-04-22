import { defineStore, type DefineStoreOptions } from 'pinia'
import { applyTheme, type ThemeMode, type ThemePalette } from '@/utils/theme/applyTheme'

export type ThemeModeSetting = 'system' | ThemeMode

export interface ThemeState {
  palette: ThemePalette
  mode: ThemeModeSetting
  resolvedMode: ThemeMode
}

export interface ThemeGetters {
  isDark(state: ThemeState): boolean
}

export interface ThemeActions {
  init(): void
  syncSystemTheme(): void
  setMode(mode: ThemeModeSetting): void
  toggleDark(): void
  setPalette(palette: ThemePalette): void
}

function getSystemPreferredMode(): ThemeMode {
  if (typeof window !== 'undefined' && 'matchMedia' in window) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  const sys = uni.getSystemInfoSync() as unknown as { theme?: string }
  return sys.theme === 'dark' ? 'dark' : 'light'
}

function resolveMode(mode: ThemeModeSetting): ThemeMode {
  return mode === 'system' ? getSystemPreferredMode() : mode
}

type ThemeStoreOptions = Omit<DefineStoreOptions<'theme', ThemeState, ThemeGetters, ThemeActions>, 'id'>

const themeStoreOptions = {
  state: (): ThemeState => ({
    palette: 'ochre',
    mode: 'system',
    resolvedMode: 'light',
  }),
  getters: {
    isDark: (state: ThemeState) => state.resolvedMode === 'dark',
  },
  actions: {
    init() {
      this.resolvedMode = resolveMode(this.mode)
      applyTheme(this.palette, this.resolvedMode)
    },
    syncSystemTheme() {
      if (this.mode !== 'system') return
      const next = getSystemPreferredMode()
      if (next === this.resolvedMode) return
      this.resolvedMode = next
      applyTheme(this.palette, this.resolvedMode)
    },
    setMode(mode: ThemeModeSetting) {
      this.mode = mode
      this.resolvedMode = resolveMode(mode)
      applyTheme(this.palette, this.resolvedMode)
    },
    toggleDark() {
      if (this.mode === 'system') {
        this.setMode(this.resolvedMode === 'dark' ? 'light' : 'dark')
        return
      }
      this.setMode(this.mode === 'dark' ? 'light' : 'dark')
    },
    setPalette(palette: ThemePalette) {
      this.palette = palette
      applyTheme(this.palette, this.resolvedMode)
    },
  },
  persist: {
    key: 'theme',
    mode: 'encrypted',
    paths: ['palette', 'mode'],
  },
} satisfies ThemeStoreOptions

export const useThemeStore = defineStore('theme', themeStoreOptions)
