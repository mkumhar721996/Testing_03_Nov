import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AuthPage } from './AuthPage'

const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body })
const sam = { id: 'u1', email: 'sam@example.com', role: 'customer' }

beforeEach(() => {
  sessionStorage.clear()
  vi.stubEnv('VITE_API_BASE_URL', '')
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const submit = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const openRegister = () => fireEvent.click(screen.getByRole('tab', { name: 'Create account' }))

describe('AuthPage', () => {
  it('registers and shows the signed-in panel with the role (AC1)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(201, { token: 't', user: sam }))
    vi.stubGlobal('fetch', fetchMock)
    render(<AuthPage />)
    openRegister()
    type('Email', 'sam@example.com')
    type('Password', 'Passw0rd1')
    submit('Create account')
    expect(await screen.findByText('Signed in as sam@example.com')).toBeVisible()
    expect(screen.getByText('customer')).toHaveClass('badge')
  })

  it('signs in with an existing account (AC2)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, { token: 't', user: sam })))
    render(<AuthPage />)
    type('Email', 'sam@example.com')
    type('Password', 'Passw0rd1')
    submit('Sign in')
    expect(await screen.findByText('Signed in as sam@example.com')).toBeVisible()
  })

  it('shows an error and marks both fields invalid when sign-in is refused (AC3, AC4)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(401, { message: 'Email or password is incorrect' })))
    render(<AuthPage />)
    type('Email', 'sam@example.com')
    type('Password', 'WrongPass9')
    submit('Sign in')
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect')
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Email')).toHaveValue('sam@example.com')
  })

  it('signs out and shows the signed-out notice (AC5)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(200, { token: 't', user: sam })).mockResolvedValue(json(204, null)))
    render(<AuthPage />)
    type('Email', 'sam@example.com')
    type('Password', 'Passw0rd1')
    submit('Sign in')
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('status')).toHaveTextContent('You have been signed out.')
    expect(sessionStorage.getItem('auth-token')).toBeNull()
    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveFocus())
  })

  it('has no phone field on the registration form (AC6)', () => {
    render(<AuthPage />)
    openRegister()
    expect(screen.queryByLabelText(/phone/i)).toBeNull()
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
  })

  it('refuses a weak password inline without sending a request (AC10)', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<AuthPage />)
    openRegister()
    type('Email', 'sam@example.com')
    type('Password', 'password')
    submit('Create account')
    expect(screen.getByText('Password needs at least 8 characters, a letter and a digit.')).toBeVisible()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses a malformed email inline without sending a request (AC12)', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<AuthPage />)
    openRegister()
    type('Email', 'a@@b.com')
    type('Password', 'Passw0rd1')
    submit('Create account')
    expect(screen.getByText(/Enter an email address with one @/)).toBeVisible()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the generic message for a duplicate email without saying it exists (AC15)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(409, { message: 'Registration could not be completed' })))
    render(<AuthPage />)
    openRegister()
    type('Email', 'sam@example.com')
    type('Password', 'Passw0rd1')
    submit('Create account')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Registration could not be completed')
    expect(alert.textContent).not.toMatch(/already (exists|registered)/i)
  })

  it('shows the locked warning and disables sign-in on a 429 (AC13)', async () => {
    const message = 'Too many failed sign-in attempts for this email. Try again in 15 minutes.'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(429, { message })))
    render(<AuthPage />)
    type('Email', 'sam@example.com')
    type('Password', 'Passw0rd1')
    submit('Sign in')
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many failed sign-in attempts for this email')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
  })
})
