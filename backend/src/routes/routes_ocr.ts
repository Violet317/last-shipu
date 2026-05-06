import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { Env } from '../lib/env'
import { fail, ok } from '../lib/response'
import { zhipuOcrText } from '../providers/zhipu/ocr'
import { parseReceiptWithLlm } from '../providers/zhipu/llm'

const base64Schema = z.string().min(20).max(8_000_000)

export async function registerOcrRoutes(app: FastifyInstance, env: Env): Promise<void> {
  // 原始 OCR：返回识别到的文字列表
  app.post('/api/ocr/receipt', async (req, reply) => {
    const parsed = z.object({ imageBase64: base64Schema }).safeParse(req.body)
    if (!parsed.success) return fail(reply, 400, 'BAD_REQUEST', '参数错误')

    const r = await zhipuOcrText(env, parsed.data.imageBase64)
    return reply.send(ok({ items: r.texts.map((text) => ({ text })) }))
  })

  // 区域 OCR
  app.post('/api/ocr/text', async (req, reply) => {
    const parsed = z.object({ regions: z.array(z.object({ imageBase64: base64Schema })).min(1).max(10) }).safeParse(req.body)
    if (!parsed.success) return fail(reply, 400, 'BAD_REQUEST', '参数错误')

    const out: string[] = []
    for (const r of parsed.data.regions) {
      const one = await zhipuOcrText(env, r.imageBase64)
      out.push(one.texts[0] ?? '')
    }
    return reply.send(ok({ texts: out }))
  })

  // OCR + LLM 解析：返回结构化食材数据
  app.post('/api/ocr/parse-receipt', async (req, reply) => {
    const parsed = z.object({ imageBase64: base64Schema }).safeParse(req.body)
    if (!parsed.success) return fail(reply, 400, 'BAD_REQUEST', '参数错误')

    // 1. OCR 识别原始文字
    const ocrResult = await zhipuOcrText(env, parsed.data.imageBase64)
    const ocrText = ocrResult.texts.join('\n')
    if (!ocrText.trim()) {
      return reply.send(ok({ items: [] }))
    }

    // 2. LLM 解析成结构化数据
    const items = await parseReceiptWithLlm(env, ocrText)
    return reply.send(ok({ items }))
  })
}
