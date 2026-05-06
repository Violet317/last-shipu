import { apiConfig } from './config'
import { request } from './client'

export interface OcrReceiptItem {
  text: string
  confidence?: number
}

export interface OcrReceiptResponse {
  items: OcrReceiptItem[]
}

export interface OcrTextResponse {
  texts: string[]
}

export interface ParsedReceiptItem {
  name: string
  qty: number
  unit: string
  purchasedAtMs: number
  shelfLifeDays: number
  storage: 'fridge' | 'freezer' | 'room'
}

export interface OcrParseReceiptResponse {
  items: ParsedReceiptItem[]
}

export async function ocrReceipt(body: { imageBase64: string }): Promise<OcrReceiptResponse> {
  if (!apiConfig.baseUrl) {
    await new Promise<void>((r) => setTimeout(r, 300))
    return { items: [{ text: '菠菜', confidence: 0.6 }, { text: '鸡蛋', confidence: 0.6 }] }
  }
  return await request<OcrReceiptResponse, { imageBase64: string }>({ url: '/api/ocr/receipt', method: 'POST', body })
}

export async function ocrParseReceipt(body: { imageBase64: string }): Promise<OcrParseReceiptResponse> {
  if (!apiConfig.baseUrl) {
    await new Promise<void>((r) => setTimeout(r, 400))
    return {
      items: [
        { name: '菠菜', qty: 300, unit: 'g', purchasedAtMs: Date.now(), shelfLifeDays: 3, storage: 'fridge' },
        { name: '鸡蛋', qty: 500, unit: 'g', purchasedAtMs: Date.now(), shelfLifeDays: 14, storage: 'fridge' },
      ],
    }
  }
  return await request<OcrParseReceiptResponse, { imageBase64: string }>({ url: '/api/ocr/parse-receipt', method: 'POST', body })
}

export async function ocrTextRegions(body: { regions: Array<{ imageBase64: string }> }): Promise<OcrTextResponse> {
  if (!apiConfig.baseUrl) {
    await new Promise<void>((r) => setTimeout(r, 250))
    return { texts: body.regions.map(() => '菠菜') }
  }
  return await request<OcrTextResponse, { regions: Array<{ imageBase64: string }> }>({ url: '/api/ocr/text', method: 'POST', body })
}

