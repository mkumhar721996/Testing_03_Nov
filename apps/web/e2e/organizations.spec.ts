import { test, expect } from '@playwright/test'

test('opens an organization detail panel from the row menu and closes it with Escape', async ({ page }) => {
  await page.route('**/organizations', (route) =>
    route.fulfill({
      json: [
        {
          id: 'org-1', name: 'Alpha Org', type: null, reference: null, phone: null, street: null, street2: null,
          city: 'Seattle', state: 'WA', postalCode: null, adminName: 'Dana', adminEmail: null, adminPhone: null,
          createdByName: null, createdByRole: null, createdAt: '2026-01-02T03:04:05.000Z',
        },
      ],
    }),
  )
  await page.goto('/#/organizations')
  const trigger = page.getByRole('button', { name: 'More actions for Alpha Org' })
  await trigger.click()
  await page.getByRole('menuitem', { name: 'View details' }).click()
  await expect(page.getByRole('dialog', { name: 'Organization details' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(trigger).toBeFocused()
})
