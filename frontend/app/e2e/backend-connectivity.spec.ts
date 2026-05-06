import { test, expect } from '@playwright/test'

test('frontend can call backend LLM and OCR', async ({ page }) => {
  test.setTimeout(120000)

  await page.goto('/pages/login')
  const guest = page.getByText('访客登录', { exact: true })
  try {
    await guest.waitFor({ state: 'visible', timeout: 3000 })
    await guest.click()
    await expect(page).toHaveURL(/\/pages\/home/, { timeout: 30000 })
  } catch {
    await page.goto('/pages/home')
  }

  await page.goto('/pages/home')
  await page.getByText('✨ 创作', { exact: true }).click()
  await expect(page).toHaveURL(/\/pages\/aiCreate/, { timeout: 30000 })

  const apiBase = await page.evaluate(async () => {
    const m = await import('/src/api/config.ts')
    return (m as any).apiConfig?.baseUrl ?? ''
  })
  expect(String(apiBase)).toContain('127.0.0.1:8787')

  const input = page.locator('.composer input')
  await input.waitFor({ state: 'visible', timeout: 30000 })
  await input.fill('15分钟内做一份晚餐，土豆和番茄快坏了，请优先用掉。')
  const send = page.locator('.composer .send')
  await send.waitFor({ state: 'visible', timeout: 30000 })
  const llmRespPromise = page.waitForResponse((res) => res.url().includes('/api/recipes/generate') && res.status() === 200, { timeout: 60000 })
  await send.click({ force: true })
  const llmResp = await llmRespPromise
  expect(llmResp.url()).toContain('127.0.0.1:8787')
  const llmJson = await llmResp.json()
  expect(llmJson?.code).toBe('0')

  const receiptUrl = 'https://raw.githubusercontent.com/dottxt-ai/outlines/refs/heads/main/docs/cookbook/images/trader-joes-receipt.jpg'
  const encoded = encodeURIComponent(receiptUrl)
  const ocrRespPromise = page.waitForResponse((res) => res.url().includes('/api/ocr/receipt') && res.status() === 200, { timeout: 60000 })
  await page.goto(`/pages/pantryImport?mode=receipt&path=${encoded}`)
  const ocrResp = await ocrRespPromise
  expect(ocrResp.url()).toContain('127.0.0.1:8787')
  const ocrJson = await ocrResp.json()
  expect(ocrJson?.code).toBe('0')
  expect(Array.isArray(ocrJson?.data?.items)).toBeTruthy()
})
