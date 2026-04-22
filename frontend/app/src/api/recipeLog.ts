import { request } from './client'

export interface RecipeLogCreateRequest {
  name: string
  kcal: number
  ingredients: string[]
  steps: string[]
  imageBase64?: string
}

export interface RecipeLogCreateResponse {
  id: string
}

export async function createRecipeLog(body: RecipeLogCreateRequest): Promise<RecipeLogCreateResponse> {
  return await request<RecipeLogCreateResponse, RecipeLogCreateRequest>({
    method: 'POST',
    url: '/api/recipe',
    body,
  })
}

