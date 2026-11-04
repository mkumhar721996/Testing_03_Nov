import { fireEvent, render, screen, within } from '@testing-library/react'
import App from './App'

const profile = { name: 'Jordan Davies', consultancy: 'Northside Heart Clinic', condition: 'Hypertension' }

// fetch is stubbed per URL: /patients/me and /balance are both called on load.
function stubApi(balance: () => Promise<unknown>) {
  const fetchMock = vi.fn((url: string) =>
    url.endsWith('/balance') ? balance() : Promise.resolve({ ok: true, json: async () => profile }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
const balanceOf = (balance: number) => () =>
  Promise.resolve({ ok: true, json: async () => ({ balance }) })

beforeEach(() => {
  window.location.hash = ''
  stubApi(balanceOf(100))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('shows the health dashboard as the home screen (AC4)', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()
    expect(await screen.findByText('Jordan Davies')).toBeInTheDocument()
  })

  it('shows 100 for a first-time player (AC1, AC5)', async () => {
    render(<App />)
    expect(await screen.findByTestId('balance')).toHaveTextContent('100.00')
    expect(screen.queryByText(/previous/i)).toBeNull()
  })

  it('shows the stored server balance (AC2, AC3, AC4)', async () => {
    stubApi(balanceOf(37))
    render(<App />)
    expect(await screen.findByTestId('balance')).toHaveTextContent('37.00')
  })

  it('shows an error in the balance area when the server cannot be reached (AC6)', async () => {
    stubApi(() => Promise.reject(new Error('offline')))
    render(<App />)
    const area = within(await screen.findByTestId('balance-area'))
    expect(await area.findByRole('alert')).toHaveTextContent(/balance/i)
    expect(area.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('shows the stored balance after Retry succeeds (AC7)', async () => {
    const balance = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementation(balanceOf(37))
    stubApi(balance)
    render(<App />)
    const area = within(await screen.findByTestId('balance-area'))
    fireEvent.click(await area.findByRole('button', { name: 'Retry' }))
    expect(await area.findByTestId('balance')).toHaveTextContent('37.00')
    expect(area.queryByRole('alert')).toBeNull()
  })

  it('opens the Add reading form from the dashboard (AC2)', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add reading' }))
    expect(window.location.hash).toBe('#/readings/new')
    expect(await screen.findByRole('heading', { name: 'Add reading' })).toBeVisible()
  })

  it('opens the booking form from the dashboard (AC3)', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Book appointment' }))
    expect(window.location.hash).toBe('#/appointments/new')
    expect(await screen.findByRole('heading', { name: 'Book appointment' })).toBeVisible()
  })
})
