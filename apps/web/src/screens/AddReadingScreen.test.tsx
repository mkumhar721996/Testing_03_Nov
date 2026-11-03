import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReadingTypeConfig } from '../features/readings/readingTypes'
import { todayLocal } from '../features/readings/readingTypes'
import * as api from '../features/readings/readingsApi'
import AddReadingScreen from './AddReadingScreen'

// Fixture types only: the real limits are served by the API and owned by Product.
const TYPES: ReadingTypeConfig[] = [
  { id: 'weight', label: 'Weight', fields: [{ key: 'value', label: 'Value', unit: 'kg', min: 10, max: 300 }] },
  {
    id: 'bp',
    label: 'Blood pressure',
    fields: [
      { key: 'systolic', label: 'Systolic', unit: 'mmHg', min: 50, max: 250 },
      { key: 'diastolic', label: 'Diastolic', unit: 'mmHg', min: 30, max: 150 },
    ],
  },
]

vi.mock('../features/readings/readingsApi', async (orig) => ({
  ...(await orig<typeof import('../features/readings/readingsApi')>()),
  fetchReadingTypes: vi.fn(),
  saveReading: vi.fn(),
}))
const fetchTypes = vi.mocked(api.fetchReadingTypes)
const save = vi.mocked(api.saveReading)

async function setup() {
  const user = userEvent.setup()
  const onSaved = vi.fn()
  const onCancel = vi.fn()
  render(<AddReadingScreen onSaved={onSaved} onCancel={onCancel} />)
  await screen.findByLabelText('Type')
  const saveBtn = () => screen.getByRole('button', { name: 'Save reading' })
  return { user, onSaved, onCancel, saveBtn }
}

describe('AddReadingScreen', () => {
  beforeEach(() => {
    fetchTypes.mockResolvedValue(TYPES)
    save.mockReset()
    save.mockResolvedValue(undefined)
  })
  afterEach(() => vi.useRealTimers())

  it('shows Type, Value, Date and Note, with today as the date and no later date allowed', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 3, 9))
    await setup()
    expect(screen.getByLabelText('Type')).toBeInTheDocument()
    expect(screen.getByLabelText('Value')).toBeInTheDocument()
    expect(screen.getByLabelText('Note')).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toHaveValue('2026-11-03')
    expect(screen.getByLabelText('Date')).toHaveAttribute('max', todayLocal())
  })

  it('flags a typed future date and disables Save', async () => {
    const { user, saveBtn } = await setup()
    await user.selectOptions(screen.getByLabelText('Type'), 'Weight')
    await user.type(screen.getByLabelText('Value'), '70')
    const date = screen.getByLabelText('Date')
    await user.clear(date)
    await user.type(date, '2999-01-01')
    expect(date).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Choose today or an earlier date.')).toBeInTheDocument()
    expect(saveBtn()).toBeDisabled()
  })

  it('shows the unit next to the value, and two mmHg fields for Blood pressure', async () => {
    const { user } = await setup()
    await user.selectOptions(screen.getByLabelText('Type'), 'Weight')
    expect(screen.getByText('kg')).toBeInTheDocument()
    expect(screen.getByLabelText('Value')).toHaveAccessibleDescription('kg')
    await user.selectOptions(screen.getByLabelText('Type'), 'Blood pressure')
    expect(screen.getByLabelText('Systolic')).toBeInTheDocument()
    expect(screen.getByLabelText('Diastolic')).toBeInTheDocument()
    expect(screen.getAllByText('mmHg')).toHaveLength(2)
  })

  it('rejects below-min and above-max values with range and unit, and disables Save', async () => {
    const { user, saveBtn } = await setup()
    await user.selectOptions(screen.getByLabelText('Type'), 'Weight')
    const value = screen.getByLabelText('Value')
    await user.type(value, '9')
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a value between 10 and 300 kg.')
    expect(value).toHaveAttribute('aria-invalid', 'true')
    expect(saveBtn()).toBeDisabled()
    await user.clear(value)
    await user.type(value, '301')
    expect(await screen.findByRole('alert')).toHaveTextContent('between 10 and 300 kg')
    expect(saveBtn()).toBeDisabled()
  })

  it('enables Save only when a type is chosen and every value is in range', async () => {
    const { user, saveBtn } = await setup()
    expect(saveBtn()).toBeDisabled()
    await user.selectOptions(screen.getByLabelText('Type'), 'Weight')
    expect(saveBtn()).toBeDisabled()
    await user.type(screen.getByLabelText('Value'), '70')
    expect(saveBtn()).toBeEnabled()
    await user.selectOptions(screen.getByLabelText('Type'), 'Blood pressure')
    await user.type(screen.getByLabelText('Systolic'), '120')
    expect(saveBtn()).toBeDisabled()
    await user.type(screen.getByLabelText('Diastolic'), '80')
    expect(saveBtn()).toBeEnabled()
  })

  it.each([['10'], ['300'], ['70']])('saves %s (min, max, in range) with Note left empty', async (raw) => {
    const { user, saveBtn, onSaved } = await setup()
    await user.selectOptions(screen.getByLabelText('Type'), 'Weight')
    await user.type(screen.getByLabelText('Value'), raw)
    await user.click(saveBtn())
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'weight', values: { value: Number(raw) }, note: undefined }),
    )
    expect(onSaved).toHaveBeenCalledOnce()
  })

  it('cancels without saving', async () => {
    const { user, onCancel } = await setup()
    await user.type(screen.getByLabelText('Note'), 'hello')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
    expect(save).not.toHaveBeenCalled()
  })

  it('disables Save while saving and sends one request on a double tap', async () => {
    save.mockReturnValue(new Promise(() => {}))
    const { user, saveBtn } = await setup()
    await user.selectOptions(screen.getByLabelText('Type'), 'Weight')
    await user.type(screen.getByLabelText('Value'), '70')
    await user.dblClick(saveBtn())
    expect(save).toHaveBeenCalledTimes(1)
    expect(saveBtn()).toBeDisabled()
  })

  it('keeps values, shows an inline error and re-enables Save after a failure; retry reuses the request id', async () => {
    save.mockRejectedValueOnce(new api.SaveError('failed'))
    const { user, saveBtn, onSaved } = await setup()
    await user.selectOptions(screen.getByLabelText('Type'), 'Weight')
    await user.type(screen.getByLabelText('Value'), '70')
    await user.click(saveBtn())
    expect(await screen.findByText(/couldn't save your reading/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Value')).toHaveValue('70')
    expect(saveBtn()).toBeEnabled()
    await user.click(saveBtn())
    expect(save.mock.calls[1][0].clientRequestId).toBe(save.mock.calls[0][0].clientRequestId)
    expect(onSaved).toHaveBeenCalledOnce()
  })

  it('tells the patient to reconnect when offline and keeps the values', async () => {
    save.mockRejectedValue(new api.SaveError('offline'))
    const { user, saveBtn } = await setup()
    await user.selectOptions(screen.getByLabelText('Type'), 'Weight')
    await user.type(screen.getByLabelText('Value'), '70')
    await user.click(saveBtn())
    expect(await screen.findByText(/reconnect/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Value')).toHaveValue('70')
    expect(saveBtn()).toBeEnabled()
  })

  it('shows the server message on the named field for an invalid response', async () => {
    save.mockRejectedValue(new api.SaveError('invalid', 'value', 'Enter a value between 10 and 300 kg.'))
    const { user, saveBtn } = await setup()
    await user.selectOptions(screen.getByLabelText('Type'), 'Weight')
    await user.type(screen.getByLabelText('Value'), '70')
    await user.click(saveBtn())
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a value between 10 and 300 kg.')
    expect(screen.getByLabelText('Value')).toHaveAttribute('aria-invalid', 'true')
  })

  it('offers Try again when the reading types fail to load', async () => {
    fetchTypes.mockRejectedValueOnce(new Error('boom'))
    const user = userEvent.setup()
    render(<AddReadingScreen onSaved={() => {}} onCancel={() => {}} />)
    await user.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByLabelText('Type')).toBeInTheDocument()
  })
})
