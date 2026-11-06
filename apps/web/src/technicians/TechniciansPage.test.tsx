import { fireEvent, render, screen, within } from '@testing-library/react'
import { NotAdminError, ValidationError, type TechniciansApi, type TechnicianSummary } from './techniciansApi'
import { TechniciansPage } from './TechniciansPage'

const summary = (over: Partial<TechnicianSummary> = {}): TechnicianSummary => ({
  id: 't1',
  name: 'Priya Nair',
  loginEmail: 'priya@x.example',
  phone: null,
  serviceArea: null,
  notes: null,
  active: true,
  workingDays: [1, 2],
  openJobCount: 0,
  nextDayOff: null,
  ...over,
})

const apiWith = (over: Partial<TechniciansApi>) => ({ listTechnicians: vi.fn().mockResolvedValue([]), ...over }) as unknown as TechniciansApi

function fillAndSubmit(name: string, email: string) {
  const dialog = screen.getByRole('dialog')
  fireEvent.change(within(dialog).getByLabelText('Full name'), { target: { value: name } })
  fireEvent.change(within(dialog).getByLabelText('Login email'), { target: { value: email } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create technician' }))
}

describe('TechniciansPage', () => {
  it('shows technicians with their status (AC5, AC6)', async () => {
    const api = apiWith({
      listTechnicians: vi.fn().mockResolvedValue([summary(), summary({ id: 't2', name: 'Sam Lee', active: false })]),
    })
    render(<TechniciansPage api={api} />)
    const row = (await screen.findByText('Sam Lee')).closest('tr')!
    expect(within(row).getByText('Inactive')).toBeInTheDocument()
    expect(within(screen.getByText('Priya Nair').closest('tr')!).getByText('Active')).toBeInTheDocument()
  })

  it('shows a loading skeleton, then the empty state with one action', async () => {
    render(<TechniciansPage api={apiWith({})} />)
    expect(screen.getByLabelText('Loading technicians')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Create the first technician' })).toBeInTheDocument()
  })

  it('offers a retry when loading fails', async () => {
    const listTechnicians = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue([summary()])
    render(<TechniciansPage api={apiWith({ listTechnicians })} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Priya Nair')).toBeInTheDocument()
  })

  it('filters by status', async () => {
    const listTechnicians = vi.fn().mockResolvedValue([])
    render(<TechniciansPage api={apiWith({ listTechnicians })} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Inactive' }))
    expect(screen.getByRole('button', { name: 'Inactive' })).toHaveAttribute('aria-pressed', 'true')
    await screen.findByRole('button', { name: 'Create the first technician' })
    expect(listTechnicians).toHaveBeenLastCalledWith('inactive')
  })

  it('creates a technician that appears as active (AC1)', async () => {
    const listTechnicians = vi.fn().mockResolvedValueOnce([]).mockResolvedValue([summary()])
    const createTechnician = vi.fn().mockResolvedValue(summary())
    render(<TechniciansPage api={apiWith({ listTechnicians, createTechnician })} />)
    fireEvent.click(await screen.findByRole('button', { name: 'New technician' }))
    fillAndSubmit('Priya Nair', 'priya@x.example')
    const row = (await screen.findByText('Priya Nair', { selector: 'td' })).closest('tr')!
    expect(within(row).getByText('Active')).toBeInTheDocument()
    expect(createTechnician).toHaveBeenCalledWith({ name: 'Priya Nair', loginEmail: 'priya@x.example', phone: '', serviceArea: '' })
    expect(screen.getByRole('status')).toHaveTextContent('created and shown as active')
  })

  it('indicates a blank required field and creates nothing (AC14)', async () => {
    const createTechnician = vi.fn()
    render(<TechniciansPage api={apiWith({ createTechnician })} />)
    fireEvent.click(await screen.findByRole('button', { name: 'New technician' }))
    fillAndSubmit('  ', 'a@x.example')
    const name = screen.getByLabelText('Full name')
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Enter the technician’s full name')).toHaveClass('field-error')
    expect(screen.getByLabelText('Login email')).not.toHaveAttribute('aria-invalid')
    expect(createTechnician).not.toHaveBeenCalled()
  })

  it('flags both required fields when both are blank (AC14)', async () => {
    const createTechnician = vi.fn()
    render(<TechniciansPage api={apiWith({ createTechnician })} />)
    fireEvent.click(await screen.findByRole('button', { name: 'New technician' }))
    fillAndSubmit('', '   ')
    expect(screen.getByLabelText('Full name')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Login email')).toHaveAttribute('aria-invalid', 'true')
    expect(createTechnician).not.toHaveBeenCalled()
  })

  it('shows a general message when saving fails without field errors', async () => {
    const createTechnician = vi.fn().mockRejectedValue(new Error('boom'))
    render(<TechniciansPage api={apiWith({ createTechnician })} />)
    fireEvent.click(await screen.findByRole('button', { name: 'New technician' }))
    fillAndSubmit('A', 'a@x.example')
    expect(await screen.findByText(/could not be saved/)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes the form with Cancel without creating anything', async () => {
    const createTechnician = vi.fn()
    render(<TechniciansPage api={apiWith({ createTechnician })} />)
    fireEvent.click(await screen.findByRole('button', { name: 'New technician' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(createTechnician).not.toHaveBeenCalled()
  })

  it('shows server field errors in the form', async () => {
    const createTechnician = vi.fn().mockRejectedValue(new ValidationError('x', { loginEmail: 'Already used' }))
    render(<TechniciansPage api={apiWith({ createTechnician })} />)
    fireEvent.click(await screen.findByRole('button', { name: 'New technician' }))
    fillAndSubmit('A', 'a@x.example')
    expect(await screen.findByText('Already used')).toBeInTheDocument()
  })

  it('shows the not-admin state with the primary button disabled (AC10)', async () => {
    const listTechnicians = vi.fn().mockRejectedValue(new NotAdminError('no'))
    render(<TechniciansPage api={apiWith({ listTechnicians })} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Only an admin')
    const button = screen.getByRole('button', { name: 'New technician' })
    expect(button).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(button)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
