import { request } from './client'

export interface UpdateProfileRequest {
  nickname: string
  heightCm: number | null
  weightKg: number | null
  birthDate: string
  gender: 'male' | 'female' | 'other'
  activityLevel: 1 | 2 | 3 | 4 | 5
  avatar200Base64?: string
  avatar100Base64?: string
}

export interface UpdateProfileResponse {
  ok: true
}

export async function updateProfile(body: UpdateProfileRequest): Promise<UpdateProfileResponse> {
  return await request<UpdateProfileResponse, UpdateProfileRequest>({
    method: 'POST',
    url: '/api/profile',
    body,
  })
}

