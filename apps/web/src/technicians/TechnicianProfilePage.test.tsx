import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NotAdminError, ValidationError, type Job, type TechniciansApi, type TechnicianProfile } from './techniciansApi'
import { TechnicianProfilePage } from './TechnicianProfilePage'

const job = (id: string, date: string): Job => ({
  id,
  title: id,
  customer: 'Acme',
  scheduledDate: date,
  scheduledTime: null,
  technicianId: 't1',
  status: 'open',
})

/** A small stateful fake of the server, so the screen is tested against what it would show after each action. */
function fakeApi(jobs: Job[] = []) {
  const profile: TechnicianProfile = {
    id: 't1',
    name: 'Priya Nair',
    loginEmail: 'priya@x.example',
    phone: null,
    serviceArea: null,
    notes: null,
    active: true,
    workingHours: [{ weekday: 1, start: '08:00', end: '16:00' }],
    daysOff: [],
  }
  const api = {
    getTechnician: vi.fn(async () => structuredClone(profile)),
    listJobsHeldBy: vi.fn(async () => structuredClone(jobs.filter((j) => j.technicianId === 't1'))),
    listAssignableTechnicians: vi.fn(async () => [
      { ...profile },
      { ...profile, id: 't2', name: 'Sam Lee' },
    ].filter((t) => t.active || t.id !== 't1')),
    updateProfile: vi.fn(async (_id: string, p: { phone: string; serviceArea: string }) => {
      Object.assign(profile, { phone: p.phone || null, serviceArea: p.serviceArea || null })
      return profile
    }),
    saveWeeklyHours: vi.fn(async (_id: string, days: TechnicianProfile['workingHours']) => {
      profile.workingHours = days
    }),
    markDayOff: vi.fn(async (_id: string, date: string) => {
      profile.daysOff.push(date)
      return { technician: profile, jobsNeedingReassignment: jobs.filter((j) => j.scheduledDate === date) }
    }),
    removeDayOff: vi.fn(),
    deactivateTechnician: vi.fn(async () => {
      profile.active = false
      return { technician: profile, jobsNeedingReassignment: jobs }
    }),
    activateTechnician: vi.fn(async () => {
      profile.active = true
      return profile
    }),
    reassignJob: vi.fn(async (jobId: string, techId: string) => {
      const j = jobs.find((x) => x.id === jobId)!
      j.technicianId = techId
      return j
    }),
  }
  return { api: api as unknown as TechniciansApi, mock: api, profile }
}

const openTab = (name: string) => fireEvent.click(screen.getByRole('tab', { name: new RegExp(name) }))

describe('TechnicianProfilePage', () => {
  it('shows saved profile details after saving (AC2)', async () => {
    const { api } = fakeApi()
    render(<TechnicianProfilePage id="t1" api={api} />)
    fireEvent.change(await screen.findByLabelText('Phone'), { target: { value: '555-0101' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))
    await waitFor(() => expect(within(screen.getByLabelText('Saved profile')).getByText('555-0101')).toBeInTheDocument())
  })

  it('shows saved weekly hours (AC3)', async () => {
    const { api, mock } = fakeApi()
    render(<TechnicianProfilePage id="t1" api={api} />)
    await screen.findByRole('heading', { name: 'Priya Nair' })
    openTab('Weekly hours')
    fireEvent.click(screen.getByLabelText('Tuesday'))
    fireEvent.change(screen.getByLabelText('Tuesday start time'), { target: { value: '07:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save weekly hours' }))
    await waitFor(() =>
      expect(mock.saveWeeklyHours).toHaveBeenCalledWith('t1', [
        { weekday: 1, start: '08:00', end: '16:00' },
        { weekday: 2, start: '07:00', end: '17:00' },
      ]),
    )
    await waitFor(() => expect(screen.getByLabelText('Tuesday start time')).toHaveValue('07:00'))
  })

  it('refuses an end time not after the start and keeps showing the saved schedule (AC15)', async () => {
    const { api, mock } = fakeApi()
    mock.saveWeeklyHours.mockRejectedValueOnce(new ValidationError('Some working hours cannot be saved', { 1: 'End time must be after the start time' }))
    render(<TechnicianProfilePage id="t1" api={api} />)
    await screen.findByRole('heading', { name: 'Priya Nair' })
    openTab('Weekly hours')
    fireEvent.change(screen.getByLabelText('Monday end time'), { target: { value: '07:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save weekly hours' }))
    expect(await screen.findByText('End time must be after the start time')).toBeInTheDocument()
    expect(screen.getByLabelText('Monday start time')).toHaveValue('08:00')
    expect(screen.getByLabelText('Monday end time')).toHaveValue('16:00')
  })

  it('lists a marked day off (AC4)', async () => {
    const { api } = fakeApi()
    render(<TechnicianProfilePage id="t1" api={api} />)
    await screen.findByRole('heading', { name: 'Priya Nair' })
    openTab('Days off')
    expect(screen.getByText(/No days off marked/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Day off'), { target: { value: '2026-11-12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Mark day off' }))
    expect(within(await screen.findByRole('list', { name: 'Days off' })).getByText('12 Nov 2026')).toBeInTheDocument()
  })

  it('deactivates after confirmation and activates again (AC5, AC6)', async () => {
    const { api } = fakeApi()
    render(<TechnicianProfilePage id="t1" api={api} />)
    await screen.findByRole('heading', { name: 'Priya Nair' })
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Deactivate technician' }))
    expect(await screen.findByText('Inactive')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Activate' }))
    expect(await screen.findByText('Active')).toBeInTheDocument()
  })

  it('shows each open job to reassign on deactivation, still assigned to the technician (AC7, AC9)', async () => {
    const { api } = fakeApi([job('job-1', '2026-11-12'), job('job-2', '2026-11-13')])
    render(<TechnicianProfilePage id="t1" api={api} />)
    await screen.findByRole('heading', { name: 'Priya Nair' })
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Deactivate technician' }))
    const panel = (await screen.findByText('Needs reassignment')).closest('.alert') as HTMLElement
    expect(within(panel).getByRole('button', { name: 'Reassign job-1' })).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Reassign job-2' })).toBeInTheDocument()
    expect(within(panel).getAllByText('Priya Nair', { selector: 'strong' })).toHaveLength(2)
  })

  it('offers only other active technicians and reassigns a job (AC8)', async () => {
    const { api, mock } = fakeApi([job('job-1', '2026-11-12')])
    render(<TechnicianProfilePage id="t1" api={api} />)
    await screen.findByRole('heading', { name: 'Priya Nair' })
    openTab('Open jobs')
    const select = screen.getByLabelText('Reassign job-1 to')
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['Choose a technician', 'Sam Lee'])
    fireEvent.change(select, { target: { value: 't2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reassign job-1' }))
    await waitFor(() => expect(mock.reassignJob).toHaveBeenCalledWith('job-1', 't2'))
    expect(await screen.findByText(/holds no open jobs/)).toBeInTheDocument()
  })

  it('shows only the jobs on the marked day for reassignment (AC11, AC12)', async () => {
    const { api } = fakeApi([job('job-1', '2026-11-12')])
    render(<TechnicianProfilePage id="t1" api={api} />)
    await screen.findByRole('heading', { name: 'Priya Nair' })
    openTab('Days off')
    fireEvent.change(screen.getByLabelText('Day off'), { target: { value: '2026-11-13' } })
    fireEvent.click(screen.getByRole('button', { name: 'Mark day off' }))
    await screen.findByText('13 Nov 2026')
    expect(screen.queryByText('Needs reassignment')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Day off'), { target: { value: '2026-11-12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Mark day off' }))
    expect(await screen.findByText('Needs reassignment')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reassign job-1' })).toBeInTheDocument()
  })

  it('moves between tabs with the arrow keys', async () => {
    const { api } = fakeApi()
    render(<TechnicianProfilePage id="t1" api={api} />)
    await screen.findByRole('heading', { name: 'Priya Nair' })
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Profile' }), { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'Weekly hours' })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows the not-admin alert (AC10)', async () => {
    const { api, mock } = fakeApi()
    mock.getTechnician.mockRejectedValueOnce(new NotAdminError('no'))
    render(<TechnicianProfilePage id="t1" api={api} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Only an admin')
  })

  it('shows a loading skeleton first', async () => {
    render(<TechnicianProfilePage id="t1" api={fakeApi().api} />)
    expect(screen.getByLabelText('Loading technician')).toBeInTheDocument()
    await screen.findByRole('heading', { name: 'Priya Nair' })
  })
})
