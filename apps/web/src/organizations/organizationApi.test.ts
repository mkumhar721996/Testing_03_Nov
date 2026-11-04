import { fetchOrganizations } from './organizationApi'

afterEach(() => vi.unstubAllGlobals())

describe('fetchOrganizations', () => {
  it('sends the caller role and organization id as headers (AC9, AC10)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
    vi.stubGlobal('fetch', fetchMock)
    await fetchOrganizations({ role: 'org_staff', organizationId: 'org-a' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/organizations$/)
    expect(init.headers).toEqual({ 'x-user-role': 'org_staff', 'x-organization-id': 'org-a' })
  })

  it('omits the organization id header when there is none', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
    vi.stubGlobal('fetch', fetchMock)
    await fetchOrganizations({ role: 'wfc_admin' })
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ 'x-user-role': 'wfc_admin' })
  })

  it('rejects on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    await expect(fetchOrganizations({ role: 'wfc_admin' })).rejects.toThrow()
  })
})
