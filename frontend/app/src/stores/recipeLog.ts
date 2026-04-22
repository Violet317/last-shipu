import { defineStore, type DefineStoreOptions } from 'pinia'

export interface RecipeLogItem {
  id: string
  name: string
  kcal: number
  imageUrl: string
  ingredients: string[]
  steps: string[]
}

export interface RecipeLogDraft {
  name: string
  ingredientsText: string
  stepsText: string
  kcal: number | null
  imageBase64: string
  imagePath: string
  imageFile: { path: string; sizeBytes?: number; name?: string; type?: string; file?: File } | null
}

export interface RecipeLogState {
  items: RecipeLogItem[]
  draft: RecipeLogDraft
}

export interface RecipeLogGetters {
  top3(state: RecipeLogState): RecipeLogItem[]
}

export interface RecipeLogActions {
  resetDraft(): void
  setDraft<K extends keyof RecipeLogDraft>(key: K, value: RecipeLogDraft[K]): void
  addFromDraft(): void
}

type RecipeLogStoreOptions = Omit<DefineStoreOptions<'recipeLog', RecipeLogState, RecipeLogGetters, RecipeLogActions>, 'id'>

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`
}

const recipeLogStoreOptions = {
  state: (): RecipeLogState => ({
    items: [
      {
        id: 'm1',
        name: '时令萝卜柑橘沙拉',
        kcal: 210,
        imageUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuC44UE8FiD8gFPbCYBP7q6ajTgCx_4A8nd1HTmVM9f-hbI6xOISeOQH7D06nIZfxP3uRRofCYUa1ixHkDDfoRfcSzcl4FrYmgP71ReCqtgTns_Sc6RNnA46QanyA-P1RE8vgbgdz_hf1jt9bcAH-GojBviOk7Rm4BbZ8Ty2nOfR2WSXFQXObKAutnV8cYUYCqB1FmezZHscTntfJcT0gRIjcM_lFrRWE_EAp4QglPzugCkoa16dJ-fFTwWkoRiwK2o_mAu-tw2r_W4a',
        ingredients: ['萝卜', '橙子', '芝麻菜'],
        steps: ['切片', '拌匀', '调味'],
      },
      {
        id: 'm2',
        name: '烤鹰嘴豆羽衣甘蓝轻食碗',
        kcal: 420,
        imageUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCKqoyaktLhkpTDWeIsz-Tq3xoD19DjsgoiMKrNRQC7vLZ6UpVWaNyiHoTP2D1GeyIx_VI4N5przB4oCwNdqbxSx7ZIMVYVtuuZfJ2o4FzZja-jwDu4rxjRFNIAjNQcAGBnm3-a6pcg2ztkgl6ol7OApVvyJxAW7ai70wHFy10qobzAberq8qKR5dqjS6sEHQrvjiqz2vyR6CHJrmtYCs5Einq1br6eRMqhPh9mH0x39NZFcEalvUnhIPF-uGvXbi6Aw9taj_te0DCB',
        ingredients: ['鹰嘴豆', '羽衣甘蓝', '红薯'],
        steps: ['烘烤', '拼盘', '淋酱'],
      },
      {
        id: 'm3',
        name: '香煎香草肉排配黑醋汁',
        kcal: 560,
        imageUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuC_WJmTxb__DDojW46v4qv3hNo7xESqjnAM0WxwS0vxhkkRoRi94wEz765JA-uL6FIHIDWLIRHZznUrY7m4eTEuFDrptkY6KtgFRhfyKrJ7Ty6ReLPEjXkjDnKn0zFdq9HA_e3qcwhLUkMGlVSrg6Gfid980mBVSEOXbhDiJaMclWmYmiRCJzmChJgJBUzu6PnchzV1-M7K9z8pEkRPdACeLan91eX4mNCjdPuTnsuyCw2NXHb99QIrEuPu4ctOfyPqn8jr5qbOla3k',
        ingredients: ['牛排', '香草', '黑醋'],
        steps: ['煎制', '调汁', '装盘'],
      },
    ],
    draft: {
      name: '',
      ingredientsText: '',
      stepsText: '',
      kcal: null,
      imageBase64: '',
      imagePath: '',
      imageFile: null,
    },
  }),
  getters: {
    top3: (state: RecipeLogState) => state.items.slice(0, 3),
  },
  actions: {
    resetDraft() {
      this.draft = { name: '', ingredientsText: '', stepsText: '', kcal: null, imageBase64: '', imagePath: '', imageFile: null }
    },
    setDraft(key, value) {
      this.draft = { ...this.draft, [key]: value } as RecipeLogDraft
    },
    addFromDraft() {
      const ingredients = this.draft.ingredientsText
        .split(/[,，\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      const steps = this.draft.stepsText
        .split(/\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      const kcal = this.draft.kcal ?? 0
      const imageUrl = this.draft.imageBase64 || this.draft.imagePath || ''
      const item: RecipeLogItem = {
        id: uid('recipe'),
        name: this.draft.name,
        kcal,
        imageUrl,
        ingredients,
        steps,
      }
      this.items = [item, ...this.items]
      this.resetDraft()
    },
  },
} satisfies RecipeLogStoreOptions

export const useRecipeLogStore = defineStore('recipeLog', recipeLogStoreOptions)
