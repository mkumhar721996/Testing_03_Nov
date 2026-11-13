import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AuthPage } from './AuthPage'

const user = { id: 'u1', email: 'sam@example.com', role: 'customer' }
const res = (status: number, body?: unknown) => ({ ok: status < 400, status, json: async () => body })

/** Answers the session check first, then each later request in order. */
function stubServer(...answers: ReturnType<typeof res>[]) {
  const fetchMock = vi.fn().mockResolvedValueOnce(res(401, {}))
  answers.forEach((a) => fetchMock.mockResolvedValueOnce(a))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
const openRegister = async () => {
  fireEvent.click(await screen.findByRole('tab', { name: 'Create account' }))
}
const submit = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

afterEach(() => vi.unstubAllGlobals())

describe('AuthPage', () => {
  it('shows skeletons while the stored session is checked', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    const { container } = render(<AuthPage />)
    expect(container.querySelector('.skeleton')).not.toBeNull()
  })

  it('shows the sign-in form to a visitor', async () => {
    stubServer()
    render(<AuthPage />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in to your account' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Sign in' })).toHaveAttribute('aria-selected', 'true')
  })

  it('has no phone field on the registration form (AC5)', async () => {
    stubServer()
    render(<AuthPage />)
    await openRegister()
    expect(screen.queryByLabelText(/phone/i)).toBeNull()
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(screen.getByText('At least 8 characters, with a letter and a digit.')).toBeInTheDocument()
  })

  it('registers and shows the signed-in panel with the role (AC1)', async () => {
    const fetchMock = stubServer(res(201, user))
    render(<AuthPage />)
    await openRegister()
    type('Email', 'sam@example.com')
    type('Password', 'Passw0rd')
    submit('Create account')
    expect(await screen.findByText('Signed in as sam@example.com')).toBeInTheDocument()
    expect(screen.getByText('customer')).toHaveClass('badge')
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ email: 'sam@example.com', password: 'Passw0rd' })
  })

  it.each(['Pass1', 'password', '12345678'])('refuses password %s inline without a request (AC9)', async (pw) => {
    const fetchMock = stubServer()
    render(<AuthPage />)
    await openRegister()
    type('Email', 'sam@example.com')
    type('Password', pw)
    submit('Create account')
    expect(screen.getByText('Password needs at least 8 characters, a letter and a digit.')).toBeVisible()
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('refuses a bad email inline without a request (AC10)', async () => {
    const fetchMock = stubServer()
    render(<AuthPage />)
    await openRegister()
    type('Email', 'sam@localhost')
    type('Password', 'Passw0rd')
    submit('Create account')
    expect(screen.getByText(/Enter an email address with one @/)).toBeVisible()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('shows the generic message for a duplicate email (AC11)', async () => {
    stubServer(res(409, { message: 'Registration could not be completed' }))
    render(<AuthPage />)
    await openRegister()
    type('Email', 'sam@example.com')
    type('Password', 'Passw0rd')
    submit('Create account')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Registration could not be completed')
    expect(alert.textContent).not.toMatch(/already (exists|registered)/i)
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows the generic message when sign-in is refused (AC12)', async () => {
    stubServer(res(401, { message: 'Email or password is incorrect' }))
    render(<AuthPage />)
    await screen.findByRole('heading', { name: 'Sign in to your account' })
    type('Email', 'sam@example.com')
    type('Password', 'WrongPass9')
    submit('Sign in')
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect')
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Email')).toHaveValue('sam@example.com')
  })

  it('shows the locked state and disables sign-in on a 429', async () => {
    stubServer(res(429, { message: 'Too many failed sign-in attempts for this email. Try again in 15 minutes.' }))
    render(<AuthPage />)
    await screen.findByRole('heading', { name: 'Sign in to your account' })
    type('Email', 'sam@example.com')
    type('Password', 'Passw0rd1')
    submit('Sign in')
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many failed sign-in attempts for this email')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
  })

  it('signs out and returns to an empty sign-in form with the email focused (AC4)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(res(200, user)).mockResolvedValueOnce(res(204)))
    render(<AuthPage />)
    await screen.findByText('Signed in as sam@example.com')
    submit('Sign out')
    expect(await screen.findByRole('status')).toHaveTextContent('You have been signed out.')
    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveFocus())
    expect(screen.getByLabelText('Email')).toHaveValue('')
  })
})
