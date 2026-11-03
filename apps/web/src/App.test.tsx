import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the guest start screen', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Play as a guest' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play as guest' })).toBeInTheDocument()
  })
})
