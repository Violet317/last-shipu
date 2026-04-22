import { defineStore, type DefineStoreOptions } from 'pinia'

export type Language = 'zh-CN' | 'en'
export type ThemeModeSetting = 'system' | 'light' | 'dark'

export interface SettingsState {
  notifySport: boolean
  notifyWater: boolean
  notifyAchievement: boolean
  privacyLeaderboard: boolean
  privacyFriendView: boolean
  language: Language
  themeMode: ThemeModeSetting
}

export interface SettingsGetters {
  isEnglish(state: SettingsState): boolean
}

export interface SettingsActions {
  setLanguage(v: Language): void
  setThemeMode(v: ThemeModeSetting): void
  toggle(key: keyof Omit<SettingsState, 'language' | 'themeMode'>): void
  clearCache(): void
}

type SettingsStoreOptions = Omit<DefineStoreOptions<'settings', SettingsState, SettingsGetters, SettingsActions>, 'id'>

const settingsStoreOptions = {
  state: (): SettingsState => ({
    notifySport: true,
    notifyWater: true,
    notifyAchievement: true,
    privacyLeaderboard: true,
    privacyFriendView: true,
    language: 'zh-CN',
    themeMode: 'system',
  }),
  getters: {
    isEnglish: (state: SettingsState) => state.language === 'en',
  },
  actions: {
    setLanguage(v: Language) {
      this.language = v
    },
    setThemeMode(v: ThemeModeSetting) {
      this.themeMode = v
    },
    toggle(key) {
      const cur = this[key] as unknown as boolean
      this[key] = (!cur) as unknown as SettingsState[typeof key]
    },
    clearCache() {
      uni.clearStorageSync()
      uni.showToast({ title: '已清除缓存', icon: 'none' })
    },
  },
} satisfies SettingsStoreOptions

export const useSettingsStore = defineStore('settings', settingsStoreOptions)
