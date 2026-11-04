import { fetchOrganizations } from './organizationApi'
import { makeOrg } from './testOrganizations'

afterEach(() => vi.unstubAllGlobals())

describe('fetchOrganizations', () => {
  it('gets /organizations and returns the list', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [makeOrg()] })
    vi.stubGlobal('fetch', fetchMock)
    expect(await fetchOrganizations()).toEqual([makeOrg()])
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/organizations$/)
  })

  it('rejects on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(fetchOrganizations()).rejects.toThrow()
  })
})
