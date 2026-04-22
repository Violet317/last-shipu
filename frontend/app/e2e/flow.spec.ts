import { test, expect } from '@playwright/test'

test('tabbar icons and navigation', async ({ page }) => {
  await page.goto('/pages/home')
  await expect(page.getByText('🏠 首页', { exact: true })).toBeVisible()
  await expect(page.getByText('🥬 食材库', { exact: true })).toBeVisible()
  await expect(page.getByText('✨ 创作', { exact: true })).toBeVisible()
  await expect(page.getByText('🧩 扩展', { exact: true })).toBeVisible()
  await expect(page.getByText('👤 我的', { exact: true })).toBeVisible()

  await page.getByText('👤 我的', { exact: true }).click()
  await expect(page).toHaveURL(/\/pages\/me/)
})

test('my page entry navigates to recipe record', async ({ page }) => {
  await page.goto('/pages/me')
  await page.getByText('食谱记录').click()
  await expect(page).toHaveURL(/\/pages\/recipe/)
})

test('ingredients selection flows into aiCreate and shortcut fills input', async ({ page }) => {
  await page.goto('/pages/ingredients')

  await page.getByText('番茄').first().click()
  await page.getByText('厨具', { exact: true }).click()
  await page.getByText('平底锅').first().click()

  await page.getByText('开始创作', { exact: true }).click()
  await expect(page).toHaveURL(/\/pages\/aiCreate/)

  await expect(page.getByText('番茄')).toBeVisible()
  await expect(page.getByText('平底锅')).toBeVisible()

  await page.getByText('减脂餐').click()
  const input = page.locator('.composer input')
  await expect(input).toHaveValue(/减脂餐|减脂/)
})
