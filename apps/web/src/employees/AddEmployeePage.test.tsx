import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { AddEmployeePage } from './AddEmployeePage'
import * as api from './employeesApi'

vi.mock('./employeesApi', async (importActual) => ({
  ...(await importActual<typeof import('./employeesApi')>()),
  fetchFormOptions: vi.fn(),
  createEmployee: vi.fn(),
}))

const options: api.FormOptions = {
  departments: [
    { id: 'd1', name: 'Engineering' },
    { id: 'd2', name: 'Finance' },
  ],
  jobTitles: [
    { id: 't1', name: 'Software Engineer' },
    { id: 't2', name: 'Payroll Analyst' },
  ],
  managers: [
    { id: 'm1', name: 'Priya Shah' },
    { id: 'm2', name: 'Daniel Reyes' },
  ],
}

const fetchFormOptions = vi.mocked(api.fetchFormOptions)
const createEmployee = vi.mocked(api.createEmployee)

beforeEach(() => {
  vi.resetAllMocks()
  fetchFormOptions.mockResolvedValue(options)
})

const optionNames = (label: string) =>
  within(screen.getByLabelText(label)).getAllByRole('option').map((o) => o.textContent)

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

async function fillAll() {
  await screen.findByRole('option', { name: 'Engineering' })
  type('First name', 'Maria')
  type('Last name', 'Okafor')
  type('Personal email', 'maria.okafor@example.com')
  type('Phone', '+44 20 7946 0000')
  type('Work email', 'maria.okafor@acme.com')
  type('Department', 'd1')
  type('Job title', 't1')
  type('Manager', 'm1')
}

describe('AddEmployeePage', () => {
  it('saves every entered field and never sends a status (AC1)', async () => {
    createEmployee.mockResolvedValue({ employee: { id: 'e1' }, invitation: { status: 'sent', sentAt: null, expiresAt: null } })
    const onSaved = vi.fn()
    render(<AddEmployeePage onSaved={onSaved} onCancel={() => {}} />)
    await fillAll()
    fireEvent.click(screen.getByRole('button', { name: 'Save employee' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('e1'))
    expect(createEmployee).toHaveBeenCalledWith({
      firstName: 'Maria',
      lastName: 'Okafor',
      personalEmail: 'maria.okafor@example.com',
      phone: '+44 20 7946 0000',
      workEmail: 'maria.okafor@acme.com',
      departmentId: 'd1',
      jobTitleId: 't1',
      managerId: 'm1',
    })
    expect(createEmployee.mock.calls[0][0]).not.toHaveProperty('status')
  })

  it('offers only Organization structure values (AC2)', async () => {
    render(<AddEmployeePage onSaved={() => {}} onCancel={() => {}} />)
    await screen.findByRole('option', { name: 'Engineering' })
    expect(optionNames('Department')).toEqual(['Select a department', 'Engineering', 'Finance'])
    expect(optionNames('Job title')).toEqual(['Select a job title', 'Software Engineer', 'Payroll Analyst'])
    expect(optionNames('Manager')).toEqual(['Select a manager', 'Priya Shah', 'Daniel Reyes'])
  })

  it('shows a skeleton while the lists load, then a Retry alert on failure (AC2)', async () => {
    fetchFormOptions.mockRejectedValueOnce(new Error('down'))
    render(<AddEmployeePage onSaved={() => {}} onCancel={() => {}} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load the department, job title and manager lists.")
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(fetchFormOptions).toHaveBeenCalledTimes(2)
    expect(await screen.findByRole('option', { name: 'Engineering' })).toBeInTheDocument()
  })

  it('shows the read-only Pending start status before saving (AC6)', async () => {
    render(<AddEmployeePage onSaved={() => {}} onCancel={() => {}} />)
    await screen.findByRole('option', { name: 'Engineering' })
    expect(screen.getByText('Pending start')).toBeInTheDocument()
  })

  it('names the duplicate work email and keeps the entered values (AC5)', async () => {
    createEmployee.mockRejectedValue(new api.WorkEmailInUseError())
    render(<AddEmployeePage onSaved={() => {}} onCancel={() => {}} />)
    await fillAll()
    fireEvent.click(screen.getByRole('button', { name: 'Save employee' }))
    expect(await screen.findByText('This work email is already in use.')).toBeInTheDocument()
    expect(screen.getByLabelText('Work email')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Employee not saved.')
    expect(screen.getByLabelText('First name')).toHaveValue('Maria')
    expect(screen.getByLabelText('Department')).toHaveValue('d1')
  })

  it('shows a generic failure and keeps the values', async () => {
    createEmployee.mockRejectedValue(new Error('500'))
    render(<AddEmployeePage onSaved={() => {}} onCancel={() => {}} />)
    await fillAll()
    fireEvent.click(screen.getByRole('button', { name: 'Save employee' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't save the employee. Try again.")
    expect(screen.getByLabelText('Last name')).toHaveValue('Okafor')
  })

  it('shows inline errors for missing required fields without saving', async () => {
    render(<AddEmployeePage onSaved={() => {}} onCancel={() => {}} />)
    await screen.findByRole('option', { name: 'Engineering' })
    fireEvent.click(screen.getByRole('button', { name: 'Save employee' }))
    expect(screen.getByLabelText('First name')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Department')).toHaveAttribute('aria-invalid', 'true')
    expect(createEmployee).not.toHaveBeenCalled()
  })

  it('calls onCancel', async () => {
    const onCancel = vi.fn()
    render(<AddEmployeePage onSaved={() => {}} onCancel={onCancel} />)
    await screen.findByRole('option', { name: 'Engineering' })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
