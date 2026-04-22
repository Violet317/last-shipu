import { defineStore, type DefineStoreOptions } from 'pinia'

export interface FeedbackImage {
  id: string
  path: string
  sizeBytes: number
}

export interface FeedbackState {
  text: string
  images: FeedbackImage[]
  submitting: boolean
  dirty: boolean
  thanksVisible: boolean
}

export interface FeedbackGetters {
  isDirty(state: FeedbackState): boolean
}

export interface FeedbackActions {
  setText(v: string): void
  addImages(list: FeedbackImage[]): void
  removeImage(id: string): void
  reorder(from: number, to: number): void
  showThanks(): void
  hideThanks(): void
  reset(): void
}

type FeedbackStoreOptions = Omit<DefineStoreOptions<'feedback', FeedbackState, FeedbackGetters, FeedbackActions>, 'id'>

const feedbackStoreOptions = {
  state: (): FeedbackState => ({
    text: '',
    images: [],
    submitting: false,
    dirty: false,
    thanksVisible: false,
  }),
  getters: {
    isDirty: (state: FeedbackState) => state.dirty,
  },
  actions: {
    setText(v: string) {
      this.text = v
      this.dirty = true
    },
    addImages(list: FeedbackImage[]) {
      this.images = [...this.images, ...list].slice(0, 3)
      this.dirty = true
    },
    removeImage(id: string) {
      this.images = this.images.filter((x) => x.id !== id)
      this.dirty = true
    },
    reorder(from: number, to: number) {
      if (from === to) return
      const arr = [...this.images]
      const item = arr.splice(from, 1)[0]
      if (!item) return
      arr.splice(to, 0, item)
      this.images = arr
      this.dirty = true
    },
    showThanks() {
      this.thanksVisible = true
    },
    hideThanks() {
      this.thanksVisible = false
    },
    reset() {
      this.text = ''
      this.images = []
      this.submitting = false
      this.dirty = false
      this.thanksVisible = false
    },
  },
} satisfies FeedbackStoreOptions

export const useFeedbackStore = defineStore('feedback', feedbackStoreOptions)

