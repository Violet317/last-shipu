import { request } from './client'

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
  return await request<RecipeDetail, GenerateRecipeRequest>({
    url: '/api/recipes/generate',
    method: 'POST',
    body,
    retry: 0, // 禁用重试，避免触发429限流
  })
}
