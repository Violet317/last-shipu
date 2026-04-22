import { request } from './client'
import { apiConfig } from './config'

export interface GenerateRecipeRequest {
  prompt: string
  ingredients: string[]
  tools?: string[]
}

export interface RecipeStep {
  index: number
  text: string
}

export interface RecipeDetail {
  id: string
  title: string
  coverUrl: string
  description: string
  tags: string[]
  kcal: number
  durationMinutes: number
  steps: RecipeStep[]
}

export async function generateRecipe(body: GenerateRecipeRequest): Promise<RecipeDetail> {
  if (!apiConfig.baseUrl) {
    await new Promise<void>((r) => setTimeout(r, 500))
    const id = `mock_recipe_${Date.now()}`
    const title = body.ingredients.includes('鸡肉') ? '青柠罗勒煎鸡胸' : '青柠罗勒煎龙利鱼'
    return {
      id,
      title,
      coverUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuC7g9Xubj1mw5Nqvwh8GQjITBuDD4S4L1tVZbbqL4iOoIQ7EozhKX2qAI7JxZcXxG3yT9L8cxlYrrTs7qJDTqad7q2hQZr8m8kgKJmR5Bv8cX4c0fD1Q9dS5w7E4o0bPrVQK',
      description: '酸甜清新，适合轻食晚餐与高蛋白需求。',
      tags: ['清爽', '高蛋白'],
      kcal: 250,
      durationMinutes: 20,
      steps: [
        { index: 1, text: '准备食材，擦干鱼排/鸡胸，加入盐、黑胡椒和少量橄榄油腌制。' },
        { index: 2, text: '热锅少油，中火煎至两面金黄熟透。' },
        { index: 3, text: '挤入青柠汁，撒上罗勒碎，出锅装盘。' },
      ],
    }
  }
  return await request<RecipeDetail, GenerateRecipeRequest>({
    url: '/api/recipes/generate',
    method: 'POST',
    body,
  })
}
