import { describe, expect, it, vi, beforeEach } from 'vitest'
import { apiConfig } from './config'

describe('recipe api', () => {
  beforeEach(() => {
    apiConfig.baseUrl = ''
  })

  it('returns mock recipe when baseUrl is empty', async () => {
    const { generateRecipe } = await import('./recipe')
    const r = await generateRecipe({ prompt: 'test', ingredients: ['鸡肉'], tools: ['平底锅'] })
    expect(r.id).toBeTruthy()
    expect(r.title.length).toBeGreaterThan(0)
    expect(r.steps.length).toBeGreaterThan(0)
  })

  it('uses /api prefix when calling backend', async () => {
    vi.resetModules()
    const request = vi.fn(async () => ({
      id: '1',
      title: 't',
      coverUrl: 'u',
      description: 'd',
      tags: [],
      kcal: 1,
      durationMinutes: 1,
      steps: [{ index: 1, text: 'x' }],
    }))
    vi.doMock('./client', () => ({ request }))

    const { apiConfig } = await import('./config')
    apiConfig.baseUrl = 'https://example.com'
    const { generateRecipe } = await import('./recipe')
    await generateRecipe({ prompt: 'p', ingredients: [], tools: [] })
    expect(request).toHaveBeenCalled()
    const arg = ((request.mock.calls as unknown as any[])[0]?.[0] ?? null) as any
    expect(arg?.url).toBe('/api/recipes/generate')
  })
})
