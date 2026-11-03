import { test, expect } from '@playwright/test'

test('home page shows the Health dashboard', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Health dashboard' })).toBeVisible()
})
