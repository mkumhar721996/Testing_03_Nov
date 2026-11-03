import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Toast from './Toast'

describe('Toast', () => {
  afterEach(() => vi.useRealTimers())

  it('stays visible until dismissed', () => {
    vi.useFakeTimers()
    render(<Toast message="Reading saved" onDismiss={() => {}} />)
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(screen.getByRole('status')).toHaveTextContent('Reading saved')
  })

  it('calls onDismiss when Dismiss is pressed', async () => {
    const onDismiss = vi.fn()
    render(<Toast message="Reading saved" onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
