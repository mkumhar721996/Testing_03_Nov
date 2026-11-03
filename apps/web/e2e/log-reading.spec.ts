import { test, expect, type Page } from '@playwright/test'

// Fixture type only: the real limits are served by the API and owned by Product.
const TYPES = [
  { id: 'fx', label: 'Fixture', fields: [{ key: 'value', label: 'Value', unit: 'fx', min: 10, max: 20 }] },
]

async function mockApi(page: Page) {
  const saved: unknown[] = []
  await page.route('**/reading-types', (route) => route.fulfill({ json: TYPES }))
  await page.route('**/readings', (route) => {
    saved.push(route.request().postDataJSON())
    return route.fulfill({ status: 201, json: {} })
  })
  return saved
}

async function openForm(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'Log' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Add reading' })).toBeVisible()
}

test('a valid save lands on the dashboard with a toast that stays until dismissed', async ({ page }) => {
  const saved = await mockApi(page)
  await openForm(page)
  await page.getByLabel('Type').selectOption({ label: 'Fixture' })
  await page.getByLabel('Value').fill('15')
  await page.getByRole('button', { name: 'Save reading' }).click()
  await expect(page.getByRole('heading', { name: 'Health dashboard' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Reading saved')
  await page.waitForTimeout(1500)
  await expect(page.getByRole('status')).toBeVisible()
  expect(saved).toHaveLength(1)
  await page.getByRole('button', { name: 'Dismiss' }).click()
  await expect(page.getByRole('status')).toHaveCount(0)
})

test('Cancel returns to the dashboard without saving', async ({ page }) => {
  const saved = await mockApi(page)
  await openForm(page)
  await page.getByLabel('Note').fill('draft')
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('heading', { name: 'Health dashboard' })).toBeVisible()
  expect(saved).toHaveLength(0)
})

test('an offline save shows a reconnect error and keeps the values', async ({ page, context }) => {
  await mockApi(page)
  await openForm(page)
  await page.getByLabel('Type').selectOption({ label: 'Fixture' })
  await page.getByLabel('Value').fill('15')
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Save reading' }).click()
  await expect(page.getByText(/reconnect/i)).toBeVisible()
  await expect(page.getByLabel('Value')).toHaveValue('15')
})
