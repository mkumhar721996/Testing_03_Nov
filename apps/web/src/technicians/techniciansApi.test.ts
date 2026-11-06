import {
  createTechnician,
  deactivateTechnician,
  NotAdminError,
  saveWeeklyHours,
  ValidationError,
} from './techniciansApi'

beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', ''))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const respond = (status: number, body?: unknown) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body }))

describe('techniciansApi', () => {
  it('POSTs a new technician as an admin', async () => {
    respond(201, { id: 't1' })
    await expect(createTechnician({ name: 'A', loginEmail: 'a@x.example' })).resolves.toEqual({ id: 't1' })
    expect(fetch).toHaveBeenCalledWith(
      '/technicians',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'A', loginEmail: 'a@x.example' }),
        headers: expect.objectContaining({ 'x-user-role': 'admin' }),
      }),
    )
  })

  it('raises NotAdminError on 403', async () => {
    respond(403)
    await expect(deactivateTechnician('t1')).rejects.toBeInstanceOf(NotAdminError)
  })

  it('returns field errors from a 400 as a ValidationError', async () => {
    respond(400, { message: 'Some working hours cannot be saved', errors: { 1: 'End time must be after the start time' } })
    const err = await saveWeeklyHours('t1', []).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ValidationError)
    expect((err as ValidationError).errors).toEqual({ 1: 'End time must be after the start time' })
  })

  it('resolves with nothing on 204', async () => {
    respond(204)
    await expect(saveWeeklyHours('t1', [])).resolves.toBeUndefined()
  })
})
