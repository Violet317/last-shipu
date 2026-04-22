import { apiConfig } from './config'
import { ApiError, type ApiResponse, type RequestOptions } from './types'
import { useUserStore } from '@/stores/user'

type RawResponse = { statusCode: number; data: unknown }

let h5Axios:
  | null
  | ((options: {
      url: string
      method: NonNullable<UniApp.RequestOptions['method']>
      headers: Record<string, string>
      data: unknown
      timeout: number
    }) => Promise<RawResponse>) = null

// #ifdef H5
import axios, { AxiosError, type AxiosRequestConfig } from 'axios'

const h5Instance = axios.create({
  baseURL: apiConfig.baseUrl || undefined,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  validateStatus: () => true,
})

h5Instance.interceptors.request.use((config) => {
  const user = useUserStore()
  const token = user.tokens?.accessToken
  if (token) {
    ;(config.headers as Record<string, string>).Authorization = `Bearer ${token}`
  }
  return config
})

h5Axios = async (options) => {
  try {
    const config: AxiosRequestConfig = {
      url: options.url,
      method: options.method as AxiosRequestConfig['method'],
      headers: options.headers,
      data: options.data,
      timeout: options.timeout,
      validateStatus: () => true,
    }
    const res = await h5Instance.request(config)
    return { statusCode: res.status, data: res.data }
  } catch (e) {
    const err = e as AxiosError
    if (err.response) return { statusCode: err.response.status, data: err.response.data }
    throw err
  }
}
// #endif

async function uniRequest(options: UniApp.RequestOptions): Promise<UniApp.RequestSuccessCallbackResult> {
  return await new Promise<UniApp.RequestSuccessCallbackResult>((resolve, reject) => {
    uni.request({
      ...options,
      success: (res: UniApp.RequestSuccessCallbackResult) => resolve(res),
      fail: (err: UniApp.GeneralCallbackResult) => reject(err),
    })
  })
}

async function rawRequest(options: {
  url: string
  method: NonNullable<UniApp.RequestOptions['method']>
  header: Record<string, string>
  data: unknown
  timeout: number
}): Promise<RawResponse> {
  // #ifdef H5
  if (h5Axios) {
    return await h5Axios({
      url: options.url,
      method: options.method,
      headers: options.header,
      data: options.data,
      timeout: options.timeout,
    })
  }
  // #endif

  const res = await uniRequest({
    url: options.url,
    method: options.method,
    header: options.header,
    data: options.data as unknown as UniApp.RequestOptions['data'],
    timeout: options.timeout,
  })
  return { statusCode: res.statusCode, data: res.data as unknown }
}

function joinUrl(baseUrl: string, url: string): string {
  if (!baseUrl) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const a = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const b = url.startsWith('/') ? url : `/${url}`
  return `${a}${b}`
}

async function refreshTokenIfNeeded(): Promise<boolean> {
  const user = useUserStore()
  const refreshToken = user.tokens?.refreshToken
  if (!refreshToken) return false

  try {
    const res = await rawRequest({
      url: joinUrl(apiConfig.baseUrl, '/api/auth/refresh'),
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { refreshToken },
      timeout: 15000,
    })

    const payload = res.data as unknown as ApiResponse<{ accessToken: string; refreshToken: string; expiresAtMs: number }>
    if (!payload || typeof payload !== 'object') return false
    if (payload.code !== '0') return false
    user.setTokens(payload.data)
    return true
  } catch {
    return false
  }
}

export async function request<TResponse, TBody = unknown>(options: RequestOptions<TBody>): Promise<TResponse> {
  const user = useUserStore()
  const retry = options.retry ?? 1
  const timeout = options.timeoutMs ?? 15000
  const auth = options.auth ?? true

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  }

  if (auth && user.tokens?.accessToken) headers.Authorization = `Bearer ${user.tokens.accessToken}`

  for (let attempt = 0; attempt <= retry; attempt += 1) {
    try {
      const res = await rawRequest({
        url: joinUrl(apiConfig.baseUrl, options.url),
        method: options.method,
        header: headers,
        data: options.body as unknown,
        timeout,
      })

      const statusCode = res.statusCode
      const payload = res.data as unknown as ApiResponse<TResponse>

      if (statusCode === 401 && auth) {
        const refreshed = await refreshTokenIfNeeded()
        if (refreshed) {
          const nextHeaders = { ...headers }
          const nextToken = useUserStore().tokens?.accessToken
          if (nextToken) nextHeaders.Authorization = `Bearer ${nextToken}`
          const retried = await rawRequest({
            url: joinUrl(apiConfig.baseUrl, options.url),
            method: options.method,
            header: nextHeaders,
            data: options.body as unknown,
            timeout,
          })
          if (retried.statusCode >= 200 && retried.statusCode < 300) {
            const retriedPayload = retried.data as unknown as ApiResponse<TResponse>
            if (retriedPayload.code !== '0') throw new ApiError({ code: retriedPayload.code, message: retriedPayload.message })
            return retriedPayload.data
          }
        }
        throw new ApiError({ code: 'AUTH_EXPIRED', message: '登录已过期' }, 401)
      }

      if (statusCode < 200 || statusCode >= 300) {
        throw new ApiError({ code: 'HTTP_ERROR', message: `请求失败(${statusCode})` }, statusCode)
      }

      if (!payload || typeof payload !== 'object') {
        throw new ApiError({ code: 'BAD_RESPONSE', message: '响应格式错误' }, statusCode)
      }

      if (payload.code !== '0') {
        throw new ApiError({ code: payload.code, message: payload.message }, statusCode)
      }

      return payload.data
    } catch (e) {
      const isLast = attempt === retry
      if (isLast) {
        if (e instanceof ApiError) {
          uni.showToast({ title: e.message, icon: 'none' })
          throw e
        }
        uni.showToast({ title: '网络异常，请稍后再试', icon: 'none' })
        throw new ApiError({ code: 'NETWORK_ERROR', message: '网络异常，请稍后再试' })
      }
    }
  }

  throw new ApiError({ code: 'UNKNOWN', message: '未知错误' })
}
