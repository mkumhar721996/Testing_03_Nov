import { test, expect } from '@playwright/test'

test('home page shows the health dashboard', async ({ page }) => {
  await page.route('**/patients/me', (route) =>
    route.fulfill({
      json: { name: 'Jordan Davies', consultancy: 'Northside Heart Clinic', condition: 'Hypertension' },
    }),
  )
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
  await expect(page.getByText('Jordan Davies')).toBeVisible()
})
