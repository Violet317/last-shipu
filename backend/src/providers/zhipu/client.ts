import type { Env } from '../../lib/env'

export class ZhipuError extends Error {
  readonly code: string
  readonly status: number
  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

export function resolveZhipuApiKey(env: Env): string {
  const k = env.ZHIPU_API_KEY || env.OCR_API_KEY || env.LLM_API_KEY || ''
  return k.trim()
}

export function stripDataUrl(dataUrl: string): { mime: string; base64: string; dataUrl: string } {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl.trim())
  if (!m) {
    return { mime: '', base64: dataUrl.trim(), dataUrl: dataUrl.trim() }
  }
  const mime = m[1] || ''
  const base64 = m[2] || ''
  return { mime, base64, dataUrl: dataUrl.trim() }
}

type ZhipuAuthMode = 'bearer' | 'raw'

export async function zhipuPostJson<T>(env: Env, path: string, body: unknown, authMode: ZhipuAuthMode, timeoutMs = 20000): Promise<T> {
  const apiKey = resolveZhipuApiKey(env)
  if (!apiKey) throw new ZhipuError('ZHIPU_NOT_CONFIGURED', 'ZHIPU_API_KEY 未配置', 500)

  const base = (env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/+$/, '')
  const url = path.startsWith('http://') || path.startsWith('https://') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`

  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authMode === 'bearer' ? `Bearer ${apiKey}` : apiKey,
      },
      body: JSON.stringify(body),
      signal: ac.signal,
    })

    const text = await res.text()
    let json: unknown = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = null
    }

    if (!res.ok) {
      const msgFromJson = (() => {
        if (!json || typeof json !== 'object') return ''
        const obj = json as Record<string, unknown>
        const candidates = [
          obj.message,
          obj.msg,
          (obj.error as any)?.message,
          (obj.error as any)?.msg,
        ]
        for (const c of candidates) {
          if (typeof c === 'string' && c.trim()) return c.trim()
        }
        return ''
      })()

      const suffix = msgFromJson ? `：${msgFromJson}` : ''
      if (res.status === 401 || res.status === 403) throw new ZhipuError('ZHIPU_AUTH_ERROR', `智谱鉴权失败${suffix}`, res.status)
      if (res.status === 429) throw new ZhipuError('ZHIPU_QUOTA_EXCEEDED', `智谱额度不足或限流${suffix}`, res.status)
      throw new ZhipuError('ZHIPU_HTTP_ERROR', `智谱请求失败(${res.status})${suffix}`, res.status)
    }

    if (json == null) throw new ZhipuError('ZHIPU_BAD_RESPONSE', '智谱响应非 JSON', 502)
    return json as T
  } catch (e) {
    if (e instanceof ZhipuError) throw e
    const msg = e instanceof Error ? e.message : 'unknown error'
    throw new ZhipuError('ZHIPU_NETWORK_ERROR', msg, 502)
  } finally {
    clearTimeout(t)
  }
}

export async function zhipuPostJsonBearer<T>(env: Env, path: string, body: unknown, timeoutMs = 20000): Promise<T> {
  return await zhipuPostJson<T>(env, path, body, 'bearer', timeoutMs)
}

export async function zhipuPostJsonRawAuth<T>(env: Env, path: string, body: unknown, timeoutMs = 20000): Promise<T> {
  return await zhipuPostJson<T>(env, path, body, 'raw', timeoutMs)
}
