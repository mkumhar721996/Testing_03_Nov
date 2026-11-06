import { test, expect } from '@playwright/test'

const home = { id: 'home', label: 'Home', line: '22 Mill Lane, Leeds', timeZone: 'Europe/London' }
const service = { id: 'boiler-service', categoryId: 'heat', name: 'Boiler service', note: 'Annual check' }

test('a signed-in customer books a home visit and sees the fixed fee', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('userId', 'c1')
    localStorage.setItem('userRole', 'customer')
  })
  await page.route('**/service-categories', (route) =>
    route.fulfill({
      json: { categories: [{ id: 'heat', name: 'Heating and boilers' }], visitFee: { amount: 35, currency: 'GBP' } },
    }),
  )
  await page.route('**/service-categories/heat/services', (route) => route.fulfill({ json: [service] }))
  await page.route('**/addresses', (route) => route.fulfill({ json: [home] }))
  await page.route('**/home-visit-slots**', (route) =>
    route.fulfill({
      json: {
        day: '2026-11-09',
        timeZone: 'Europe/London',
        zoneLabel: 'GMT',
        slots: [{ window: '08:00-11:00', bookable: true }],
      },
    }),
  )
  await page.route('**/home-visits', (route) =>
    route.fulfill({
      status: 201,
      json: {
        bookingId: 'b1',
        status: 'confirmed',
        visitFee: { amount: 35, currency: 'GBP' },
        service,
        address: home,
        day: '2026-11-09',
        window: '08:00-11:00',
        zoneLabel: 'GMT',
      },
    }),
  )

  await page.goto('/#/book-visit')
  await page.getByText('Heating and boilers').click()
  await page.getByText('Boiler service').click()
  await page.getByText('Home', { exact: true }).click()
  await expect(page.getByText(/35\.00/)).toBeVisible()
  await page.getByText(/08:00-11:00/).click()
  await page.getByRole('button', { name: 'Confirm booking' }).click()
  await expect(page.getByText('Booking confirmed')).toBeVisible()
})
