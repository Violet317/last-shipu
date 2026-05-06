import type { Env } from '../../lib/env'
import { stripDataUrl, ZhipuError } from './client'

function uniqKeepOrder(list: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const s of list) {
    const t = s.trim()
    if (!t) continue
    if (seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

function extractMdResults(v: unknown): string | null {
  if (!v || typeof v !== 'object') return null
  const obj = v as Record<string, unknown>
  if (typeof obj.md_results === 'string' && obj.md_results.trim()) return obj.md_results
  if (obj.data && typeof obj.data === 'object') {
    const d = obj.data as Record<string, unknown>
    if (typeof d.md_results === 'string' && d.md_results.trim()) return d.md_results
  }
  return null
}

function extractReceiptItemsFromMarkdown(md: string): string[] {
  const out: string[] = []
  const text = md
    .replace(/\r\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  for (const line of lines) {
    const m = /^\s*\d+\.\s*([^\d]{1,20})\s*$/.exec(line)
    if (m) out.push(m[1].trim())
  }

  if (out.length > 0) return uniqKeepOrder(out)

  const re = /(?:^|\s)(\d+)\.\s*([^\s\d]{1,20})/g
  let m2: RegExpExecArray | null = null
  while ((m2 = re.exec(text))) {
    const name = (m2[2] || '').trim()
    if (name) out.push(name)
  }
  return uniqKeepOrder(out)
}

function collectLikelyText(v: unknown, limit: number): string[] {
  const out: string[] = []
  const seen = new Set<unknown>()

  const banned = new Set(['text', 'table', 'seal', 'doc_title', 'image', 'formula'])

  function push(s: unknown) {
    const t = String(s ?? '').trim()
    if (!t) return
    if (banned.has(t.toLowerCase())) return
    if (t.startsWith('<') && t.endsWith('>')) return
    if (t.startsWith('```')) return
    out.push(t)
  }

  function walk(x: unknown, keyHint: string): void {
    if (out.length >= limit) return
    if (x == null) return
    if (typeof x === 'string') {
      if (keyHint.includes('text') || keyHint.includes('content') || keyHint.includes('word') || keyHint.includes('label')) {
        push(x)
      }
      return
    }
    if (typeof x === 'number' || typeof x === 'boolean') return
    if (seen.has(x)) return
    if (typeof x === 'object') {
      seen.add(x)
      if (Array.isArray(x)) {
        for (const it of x) walk(it, keyHint)
        return
      }
      const obj = x as Record<string, unknown>
      for (const [k, v2] of Object.entries(obj)) {
        const kh = k.toLowerCase()
        walk(v2, kh)
      }
    }
  }

  walk(v, '')
  return out
}

/* ── 阿里云 OCR ── */

interface AliyunOcrResponse {
  content?: string
  prism_wordsInfo?: Array<{ word?: string }>
  error_code?: number
  error_msg?: string
}

function isPriceOrQty(text: string): boolean {
  const t = text.trim()
  // 纯数字
  if (/^\d+(\.\d+)?$/.test(t)) return true
  // 价格
  if (/^[¥￥$€£]\s*\d/.test(t)) return true
  // 数量标记 x2 *3
  if (/^[xX*×]\s*\d/.test(t)) return true
  // 带单位的数量：1克 3kg 20ml 5升 200g 0.5kg
  if (/^\d+(\.\d+)?\s*(g|kg|mg|ml|l|L|个|件|瓶|包|盒|袋|克|千克|毫克|毫升|升|斤|两|钱|盎司|磅|片|块|根|条|颗|瓣|把|束|只|尾|头|条|粒|滴|勺|碗|盘|杯|罐|听|支|管|张|卷|捆|串|堆|坨|团|枚)$/.test(t)) return true
  // 纯序号 1. 2) (3) 等
  if (/^\(?\d+[\.\)\】\〕]$/.test(t)) return true
  // 常见非食材词
  const nonFood = new Set(['合计', '总计', '小计', '应收', '实收', '找零', '现金', '刷卡', '支付宝', '微信', '优惠', '折扣', '会员', '积分', '找赎', '应付', '支付', '订单', '单号', '编号', '时间', '日期', '地址', '电话', '欢迎', '光临', '谢谢', '惠顾', '客服', '热线', '门店', '店铺', '收银', '机号', '工号', '流水', '票号', 'NO', 'Tel', 'TEL', 'Fax', ' Add', 'add:', '欢迎光临', '多谢惠顾'])
  if (nonFood.has(t)) return true
  return false
}

function parseAliyunContent(content: string): string[] {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length >= 1 && l.length <= 30 && !isPriceOrQty(l))

  // 小票常见格式：商品名 价格 数量，取第一个非数字非价格的部分
  const items: string[] = []
  for (const line of lines) {
    const parts = line.split(/\s+/)
    const name = parts.find((p) => p.length >= 1 && p.length <= 15 && !isPriceOrQty(p))
    if (name && !items.includes(name)) items.push(name)
  }

  return items.length > 0 ? items : lines
}

async function callAliyunOcr(appCode: string, imageDataUrl: string): Promise<{ texts: string[] }> {
  if (!appCode) return { texts: [] }

  const { dataUrl, base64 } = stripDataUrl(imageDataUrl)
  const isUrl = /^https?:\/\//i.test(dataUrl)

  const body: Record<string, unknown> = {
    prob: false,
    charInfo: false,
    rotate: false,
    table: false,
  }
  if (isUrl) {
    body.url = dataUrl
  } else {
    body.img = base64 || dataUrl
  }

  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), 45000)
  try {
    const res = await fetch('https://gjbsb.market.alicloudapi.com/ocrservice/advanced', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `APPCODE ${appCode}`,
      },
      body: JSON.stringify(body),
      signal: ac.signal,
    })

    const json = (await res.json()) as AliyunOcrResponse

    if (json.error_code) {
      console.warn(`[Aliyun OCR] error ${json.error_code}: ${json.error_msg}`)
      return { texts: [] }
    }

    const content = json.content || ''
    const items = parseAliyunContent(content)
    if (items.length > 0) return { texts: uniqKeepOrder(items) }

    // fallback: 从 prism_wordsInfo 提取
    const words = json.prism_wordsInfo?.map((w) => w.word).filter(Boolean) || []
    return { texts: uniqKeepOrder(words) }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    console.warn(`[Aliyun OCR] exception: ${msg}`)
    return { texts: [] }
  } finally {
    clearTimeout(t)
  }
}

/* ── 智谱 OCR（保留作 fallback）── */

async function callZhipuOcr(apiKey: string, imageDataUrl: string, model: string): Promise<{ texts: string[] }> {
  if (!apiKey) throw new ZhipuError('ZHIPU_NOT_CONFIGURED', 'OCR_API_KEY 未配置', 500)

  const { dataUrl, base64, mime } = stripDataUrl(imageDataUrl)
  const isUrl = /^https?:\/\//i.test(dataUrl)
  const payload = {
    model: model.toLowerCase() === 'glm-ocr' ? 'glm-ocr' : model,
    file: isUrl ? dataUrl : mime ? dataUrl : base64 || dataUrl,
  }

  const res = await fetch('https://open.bigmodel.cn/api/paas/v4/layout_parsing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  const text = await res.text()
  let json: unknown = null
  try { json = text ? JSON.parse(text) : null } catch { json = null }

  if (!res.ok) {
    const msg = (json && typeof json === 'object' && (json as any).message) || ''
    throw new ZhipuError('ZHIPU_HTTP_ERROR', `智谱请求失败(${res.status})${msg ? '：' + msg : ''}`, res.status)
  }

  const md = extractMdResults(json)
  if (md) {
    const items = extractReceiptItemsFromMarkdown(md)
    if (items.length > 0) return { texts: items }
  }

  const texts = uniqKeepOrder(collectLikelyText(json, 200))
  return { texts }
}

/* ── 入口 ── */

export async function zhipuOcrText(env: Env, imageDataUrl: string): Promise<{ texts: string[] }> {
  const provider = (env.OCR_PROVIDER || '').trim().toLowerCase()

  if (provider === 'aliyun') {
    return await callAliyunOcr(env.ALIYUN_OCR_APPCODE, imageDataUrl)
  }

  if (provider === 'zhipu') {
    const model = (env.ZHIPU_OCR_MODEL || '').trim()
    const apiKey = (env.OCR_API_KEY || '').trim()
    return await callZhipuOcr(apiKey, imageDataUrl, model)
  }

  // 默认：返回 mock
  const mockItems = ['菠菜', '鸡蛋', '番茄', '土豆', '洋葱', '胡萝卜', '鸡胸肉', '牛奶']
  const shuffled = [...mockItems].sort(() => Math.random() - 0.5)
  return { texts: shuffled.slice(0, 4) }
}
