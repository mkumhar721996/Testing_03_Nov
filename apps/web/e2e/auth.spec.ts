import { test, expect, type Page } from '@playwright/test'

const user = { id: 'u1', email: 'priya.raman@northwind.example', name: 'Priya Raman' }

// The API is stubbed at the network edge, like app.spec.ts; the session is a flag the stub flips.
async function stubApi(page: Page, opts: { signedIn: boolean }) {
  let signedIn = opts.signedIn
  await page.route('**/auth/session', (route) =>
    signedIn ? route.fulfill({ json: user }) : route.fulfill({ status: 401, json: { code: 'not_signed_in' } }),
  )
  await page.route('**/auth/sign-in', (route) => {
    const { password } = route.request().postDataJSON()
    if (password !== 'correct-horse') return route.fulfill({ status: 401, json: { code: 'invalid_credentials' } })
    signedIn = true
    return route.fulfill({ json: user })
  })
  await page.route('**/auth/sign-out', (route) => {
    signedIn = false
    return route.fulfill({ status: 204 })
  })
  await page.route('**/patients/me', (route) =>
    route.fulfill({ json: { name: 'Jordan Davies', consultancy: 'Northside Heart Clinic', condition: 'Hypertension' } }),
  )
  await page.route('**/readings**', (route) => route.fulfill({ json: [] }))
}

test('a signed-out person opening the app is sent to the sign-in page', async ({ page }) => {
  await stubApi(page, { signedIn: false })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await expect(page).toHaveURL(/#\/sign-in$/)
})

test('signing in lands on the dashboard and signing out returns to sign-in', async ({ page }) => {
  await stubApi(page, { signedIn: false })
  await page.goto('/')
  await page.getByLabel('Email address').fill(user.email)
  await page.getByLabel('Password').fill('wrong')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toContainText('Email or password is incorrect')

  await page.getByLabel('Password').fill('correct-horse')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByText('You have signed out.')).toBeVisible()
})

test('an expired reset link is refused with a way to request a new one', async ({ page }) => {
  await stubApi(page, { signedIn: false })
  await page.route('**/auth/password-reset/old-token', (route) => route.fulfill({ status: 410, json: { code: 'invalid_link' } }))
  await page.goto('/#/reset-password?token=old-token')
  await expect(page.getByRole('alert')).toContainText('This reset link has expired or has already been used')
  await page.getByRole('button', { name: 'Request a new link' }).click()
  await expect(page.getByRole('heading', { name: 'Forgot your password?' })).toBeVisible()
})
