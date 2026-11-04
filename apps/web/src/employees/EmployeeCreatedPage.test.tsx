import { fireEvent, render, screen } from '@testing-library/react'
import { EmployeeCreatedPage } from './EmployeeCreatedPage'
import * as api from './employeesApi'

vi.mock('./employeesApi', async (importActual) => ({
  ...(await importActual<typeof import('./employeesApi')>()),
  fetchEmployee: vi.fn(),
  fetchInvitation: vi.fn(),
  resendInvitation: vi.fn(),
}))

const employee: api.EmployeeSummary = {
  id: 'e1',
  name: 'Maria Okafor',
  workEmail: 'maria.okafor@acme.com',
  department: 'Engineering',
  jobTitle: 'Software Engineer',
  manager: 'Priya Shah',
  status: 'pending_start',
}
const notDelivered: api.InvitationView = { status: 'not_delivered', sentAt: null, expiresAt: null }
const sentNow: api.InvitationView = { status: 'sent', sentAt: '2026-11-04T09:00:00Z', expiresAt: '2026-11-18T09:00:00Z' }

const fetchInvitation = vi.mocked(api.fetchInvitation)
const resendInvitation = vi.mocked(api.resendInvitation)

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.fetchEmployee).mockResolvedValue(employee)
})

describe('EmployeeCreatedPage', () => {
  it('confirms the save and shows Pending start (AC6)', async () => {
    fetchInvitation.mockResolvedValue(sentNow)
    render(<EmployeeCreatedPage id="e1" />)
    expect(await screen.findByText('Software Engineer, Engineering. Manager: Priya Shah')).toBeInTheDocument()
    expect(screen.getByText('Pending start')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Employee saved. Maria Okafor was added. Status: Pending start.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('warns when the invitation was not delivered and offers a resend (AC8)', async () => {
    fetchInvitation.mockResolvedValue(notDelivered)
    render(<EmployeeCreatedPage id="e1" />)
    const warning = await screen.findByRole('alert')
    expect(warning).toHaveTextContent('Invitation not delivered')
    expect(warning).toHaveTextContent('could not be sent to maria.okafor@acme.com')
    expect(screen.getByRole('button', { name: 'Resend invitation' })).toBeInTheDocument()
  })

  it('resends and clears the warning (AC9)', async () => {
    fetchInvitation.mockResolvedValue(notDelivered)
    resendInvitation.mockResolvedValue(sentNow)
    render(<EmployeeCreatedPage id="e1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Resend invitation' }))
    expect(resendInvitation).toHaveBeenCalledWith('e1')
    expect(await screen.findByText('Invitation sent.')).toBeInTheDocument()
    expect(screen.getByText('Invitation: sent just now, valid for 14 days')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps the warning when the resend fails (AC9)', async () => {
    fetchInvitation.mockResolvedValue(notDelivered)
    resendInvitation.mockRejectedValue(new Error('500'))
    render(<EmployeeCreatedPage id="e1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Resend invitation' }))
    expect(await screen.findByRole('button', { name: 'Resend invitation' })).toBeEnabled()
    expect(screen.getByRole('alert')).toHaveTextContent('Invitation not delivered')
  })

  it('offers to reissue an expired invitation (AC11)', async () => {
    fetchInvitation.mockResolvedValue({ status: 'expired', sentAt: '2026-10-21T09:00:00Z', expiresAt: '2026-11-04T09:00:00Z' })
    resendInvitation.mockResolvedValue(sentNow)
    render(<EmployeeCreatedPage id="e1" />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Invitation expired')
    expect(alert).toHaveTextContent('21 Oct 2026')
    fireEvent.click(screen.getByRole('button', { name: 'Reissue invitation' }))
    expect(resendInvitation).toHaveBeenCalledWith('e1')
    expect(await screen.findByText('Invitation sent.')).toBeInTheDocument()
  })

  it('shows a Retry alert when loading fails', async () => {
    fetchInvitation.mockRejectedValueOnce(new Error('down')).mockResolvedValue(sentNow)
    render(<EmployeeCreatedPage id="e1" />)
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load this employee")
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('maria.okafor@acme.com')).toBeInTheDocument()
  })
})
