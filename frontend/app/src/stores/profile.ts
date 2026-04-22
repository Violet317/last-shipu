import { defineStore, type DefineStoreOptions } from 'pinia'
import { updateProfile } from '@/api/profile'
import { apiConfig } from '@/api/config'
import { useUserStore } from '@/stores/user'

export type Gender = 'male' | 'female' | 'other'

export type ActivityLevel = 1 | 2 | 3 | 4 | 5

export interface ProfileForm {
  avatar200Base64: string
  avatar100Base64: string
  nickname: string
  heightCm: number | null
  weightKg: number | null
  birthDate: string
  gender: Gender
  activityLevel: ActivityLevel
}

export interface AvatarFileRef {
  path: string
  sizeBytes?: number
  name?: string
  type?: string
  file?: File
}

export interface ProfileState {
  form: ProfileForm
  avatarFile: AvatarFileRef | null
  dirty: boolean
  saving: boolean
}

export interface ProfileGetters {
  isDirty(state: ProfileState): boolean
}

export interface ProfileActions {
  setField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]): void
  setAvatar(payload: { avatar200Base64: string; avatar100Base64: string }): void
  setAvatarFile(file: AvatarFileRef | null): void
  markSaved(): void
  save(): Promise<void>
}

type ProfileStoreOptions = Omit<DefineStoreOptions<'profile', ProfileState, ProfileGetters, ProfileActions>, 'id'>

const profileStoreOptions = {
  state: (): ProfileState => ({
    form: {
      avatar200Base64: '',
      avatar100Base64: '',
      nickname: '',
      heightCm: null,
      weightKg: null,
      birthDate: '',
      gender: 'other',
      activityLevel: 3,
    },
    avatarFile: null,
    dirty: false,
    saving: false,
  }),
  getters: {
    isDirty: (state: ProfileState) => state.dirty,
  },
  actions: {
    setField(key, value) {
      this.form = { ...this.form, [key]: value } as ProfileForm
      this.dirty = true
    },
    setAvatar(payload) {
      this.form = { ...this.form, ...payload }
      this.dirty = true
    },
    setAvatarFile(file) {
      this.avatarFile = file
      this.dirty = true
    },
    markSaved() {
      this.dirty = false
    },
    async save() {
      if (this.saving) return
      this.saving = true
      try {
        const userStore = useUserStore()

        if (apiConfig.baseUrl && userStore.isAuthed) {
          await updateProfile({
            nickname: this.form.nickname.trim(),
            heightCm: this.form.heightCm,
            weightKg: this.form.weightKg,
            birthDate: this.form.birthDate,
            gender: this.form.gender,
            activityLevel: this.form.activityLevel,
            avatar200Base64: this.form.avatar200Base64 || undefined,
            avatar100Base64: this.form.avatar100Base64 || undefined,
          })
        } else {
          await new Promise<void>((r) => setTimeout(r, 350))
        }

        const prevId = userStore.profile?.id ? String(userStore.profile.id) : 'local'
        const nextAvatar = this.form.avatar100Base64 || this.form.avatar200Base64 || userStore.profile?.avatarUrl || ''
        userStore.setProfile({ id: prevId, nickname: this.form.nickname.trim(), avatarUrl: nextAvatar })

        this.dirty = false
        uni.showToast({ title: '已更新', icon: 'none' })
      } finally {
        this.saving = false
      }
    },
  },
  persist: {
    key: 'profile',
    mode: 'encrypted',
    paths: ['form'],
  },
} satisfies ProfileStoreOptions

export const useProfileStore = defineStore('profile', profileStoreOptions)
