import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import * as api from './features/readings/readingsApi'

vi.mock('./features/readings/readingsApi', async (orig) => ({
  ...(await orig<typeof import('./features/readings/readingsApi')>()),
  fetchReadingTypes: vi.fn(),
  saveReading: vi.fn(),
}))
const save = vi.mocked(api.saveReading)

const addReadingHeading = () => screen.getByRole('heading', { level: 1, name: 'Add reading' })

describe('App', () => {
  beforeEach(() => {
    vi.mocked(api.fetchReadingTypes).mockResolvedValue([
      { id: 'weight', label: 'Weight', fields: [{ key: 'value', label: 'Value', unit: 'kg', min: 10, max: 300 }] },
    ])
    save.mockReset()
    save.mockResolvedValue(undefined)
  })

  it('lands on the Health dashboard', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Health dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
  })

  it('opens the Add reading form from Log', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('link', { name: 'Log' }))
    expect(addReadingHeading()).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log' })).toHaveAttribute('aria-current', 'page')
  })

  it('cancels back to the dashboard without saving', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('link', { name: 'Log' }))
    await user.type(await screen.findByLabelText('Note'), 'x')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(save).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Health dashboard' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows the dashboard and a persistent Reading saved toast after saving, until dismissed', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('link', { name: 'Log' }))
    await user.selectOptions(await screen.findByLabelText('Type'), 'Weight')
    await user.type(screen.getByLabelText('Value'), '70')
    await user.click(screen.getByRole('button', { name: 'Save reading' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Reading saved')
    expect(screen.getByRole('heading', { name: 'Health dashboard' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('opens the form again from Log while on the dashboard after a save', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('link', { name: 'Log' }))
    await user.selectOptions(await screen.findByLabelText('Type'), 'Weight')
    await user.type(screen.getByLabelText('Value'), '70')
    await user.click(screen.getByRole('button', { name: 'Save reading' }))
    await screen.findByRole('status')
    await user.click(screen.getByRole('link', { name: 'Log' }))
    expect(addReadingHeading()).toBeInTheDocument()
  })
})
