import { request } from './client'

export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
}

export interface ChangePasswordResponse {
  ok: true
}

export async function changePassword(body: ChangePasswordRequest): Promise<ChangePasswordResponse> {
  return await request<ChangePasswordResponse, ChangePasswordRequest>({
    method: 'POST',
    url: '/api/settings/password',
    body,
  })
}

