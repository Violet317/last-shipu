import { defineStore, type DefineStoreOptions } from 'pinia'

export type ChatRole = 'user' | 'assistant'

export interface RecipePreview {
  id: string
  title: string
  coverUrl: string
  durationMinutes: number
  kcal: number
}

export interface ChatMessage {
  id: string
  role: ChatRole
  text: string
  recipe?: RecipePreview
}

export interface ChatState {
  selectedIngredients: string[]
  selectedTools: string[]
  draft: string
  messages: ChatMessage[]
}

export interface ChatGetters {
  selectedCount(state: ChatState): number
}

export interface ChatActions {
  setSelectedIngredients(list: string[]): void
  setSelectedTools(list: string[]): void
  toggleIngredient(name: string): void
  toggleTool(name: string): void
  clearSelected(): void
  setDraft(v: string): void
  pushMessage(msg: ChatMessage): void
  resetMessages(): void
}

type ChatStoreOptions = Omit<DefineStoreOptions<'chat', ChatState, ChatGetters, ChatActions>, 'id'>

const chatStoreOptions = {
  state: (): ChatState => ({
    selectedIngredients: [],
    selectedTools: [],
    draft: '',
    messages: [],
  }),
  getters: {
    selectedCount: (state: ChatState) => state.selectedIngredients.length + state.selectedTools.length,
  },
  actions: {
    setSelectedIngredients(list: string[]) {
      this.selectedIngredients = list
    },
    setSelectedTools(list: string[]) {
      this.selectedTools = list
    },
    toggleIngredient(name: string) {
      const idx = this.selectedIngredients.indexOf(name)
      if (idx >= 0) {
        this.selectedIngredients = this.selectedIngredients.filter((x) => x !== name)
        return
      }
      this.selectedIngredients = [...this.selectedIngredients, name]
    },
    toggleTool(name: string) {
      const idx = this.selectedTools.indexOf(name)
      if (idx >= 0) {
        this.selectedTools = this.selectedTools.filter((x) => x !== name)
        return
      }
      this.selectedTools = [...this.selectedTools, name]
    },
    clearSelected() {
      this.selectedIngredients = []
      this.selectedTools = []
    },
    setDraft(v: string) {
      this.draft = v
    },
    pushMessage(msg: ChatMessage) {
      this.messages = [...this.messages, msg]
    },
    resetMessages() {
      this.messages = []
    },
  },
} satisfies ChatStoreOptions

export const useChatStore = defineStore('chat', chatStoreOptions)
