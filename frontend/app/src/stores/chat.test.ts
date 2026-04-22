import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from './chat'

describe('chat store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('toggles ingredients and tools and counts selection', () => {
    const s = useChatStore()
    expect(s.selectedCount).toBe(0)

    s.toggleIngredient('番茄')
    s.toggleIngredient('番茄')
    expect(s.selectedIngredients).toEqual([])

    s.toggleIngredient('番茄')
    s.toggleTool('平底锅')
    expect(s.selectedIngredients).toEqual(['番茄'])
    expect(s.selectedTools).toEqual(['平底锅'])
    expect(s.selectedCount).toBe(2)

    s.setSelectedIngredients(['鸡蛋'])
    s.setSelectedTools(['空气炸锅'])
    expect(s.selectedIngredients).toEqual(['鸡蛋'])
    expect(s.selectedTools).toEqual(['空气炸锅'])

    s.setDraft('hi')
    expect(s.draft).toBe('hi')
    s.pushMessage({ id: 'm1', role: 'user', text: 't' })
    expect(s.messages.length).toBe(1)
    s.resetMessages()
    expect(s.messages.length).toBe(0)

    s.clearSelected()
    expect(s.selectedCount).toBe(0)
  })
})
