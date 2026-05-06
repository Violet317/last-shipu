import { request } from './client'
import { apiConfig } from './config'

export interface RequestLoginCodeRequest {
  email: string
}

export interface RequestLoginCodeResponse {
  sent: boolean
}

export interface EmailLoginRequest {
  email: string
  code: string
}

export interface AuthTokensResponse {
  accessToken: string
  refreshToken: string
  expiresAtMs: number
}

function buildMockTokens(kind: 'guest' | 'email'): AuthTokensResponse {
  const now = Date.now()
  const suffix = kind === 'guest' ? 'guest' : 'user'
  return {
    accessToken: `mock_access_${suffix}_${now}`,
    refreshToken: `mock_refresh_${suffix}_${now}`,
    expiresAtMs: now + 30 * 24 * 60 * 60 * 1000,
  }
}

export async function requestLoginCode(body: RequestLoginCodeRequest): Promise<RequestLoginCodeResponse> {
  if (!apiConfig.baseUrl) {
    await new Promise<void>((r) => setTimeout(r, 300))
    return { sent: Boolean(body.email) }
  }
  return await request<RequestLoginCodeResponse, RequestLoginCodeRequest>({
    url: '/api/auth/code',
    method: 'POST',
    body,
    auth: false,
    retry: 0,
  })
}

export async function loginWithEmail(body: EmailLoginRequest): Promise<AuthTokensResponse> {
  if (!apiConfig.baseUrl) {
    await new Promise<void>((r) => setTimeout(r, 400))
    return buildMockTokens('email')
  }
  return await request<AuthTokensResponse, EmailLoginRequest>({
    url: '/api/auth/login',
    method: 'POST',
    body,
    auth: false,
    retry: 0,
  })
}

export interface UserProfileResponse {
  id: string
  email: string
  nickname: string
}

export async function fetchMe(): Promise<UserProfileResponse> {
  if (!apiConfig.baseUrl) {
    await new Promise<void>((r) => setTimeout(r, 200))
    return { id: 'mock_user', email: 'mock@local', nickname: 'Mock用户' }
  }
  return await request<UserProfileResponse>({
    url: '/api/auth/me',
    method: 'GET',
    retry: 0,
  })
}

export async function guestLogin(): Promise<AuthTokensResponse> {
  if (!apiConfig.baseUrl) {
    await new Promise<void>((r) => setTimeout(r, 250))
    return buildMockTokens('guest')
  }
  return await request<AuthTokensResponse, undefined>({
    url: '/api/auth/guest',
    method: 'POST',
    auth: false,
    retry: 0,
  })
}
