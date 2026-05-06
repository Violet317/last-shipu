import { defineStore, type DefineStoreOptions } from 'pinia'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAtMs: number
}

export interface UserProfile {
  id: string
  nickname: string
  avatarUrl: string
}

export interface UserState {
  tokens: AuthTokens | null
  profile: UserProfile | null
}

export interface UserGetters {
  isAuthed(state: UserState): boolean
}

export interface UserActions {
  setTokens(tokens: AuthTokens): void
  clearAuth(): void
  setProfile(profile: UserProfile): void
  fetchProfile(): Promise<void>
}

type UserStoreOptions = Omit<DefineStoreOptions<'user', UserState, UserGetters, UserActions>, 'id'>

const userStoreOptions = {
  state: (): UserState => ({
    tokens: null,
    profile: null,
  }),
  getters: {
    isAuthed: (state: UserState) => Boolean(state.tokens?.accessToken),
  },
  actions: {
    setTokens(tokens: AuthTokens) {
      this.tokens = tokens
    },
    clearAuth() {
      this.tokens = null
      this.profile = null
    },
    setProfile(profile: UserProfile) {
      this.profile = profile
    },
    async fetchProfile() {
      const { fetchMe } = await import('@/api/user')
      try {
        const data = await fetchMe()
        this.profile = {
          id: data.id,
          nickname: data.nickname,
          avatarUrl: '',
        }
      } catch {
        // 静默失败，不阻断流程
      }
    },
  },
  persist: {
    key: 'user',
    mode: 'encrypted',
    paths: ['tokens', 'profile'],
  },
} satisfies UserStoreOptions

export const useUserStore = defineStore('user', userStoreOptions)
