import { afterEach, beforeEach } from 'vitest'
import { NoAddressError, NotSignedInError, SlotTakenError, bookingApi } from './bookingApi'

const input = { serviceId: 's', addressId: 'a', day: '2026-11-09', window: '08:00-11:00' }

function respond(status: number, body: unknown = {}) {
  const fetchMock = vi.fn().mockResolvedValue({ status, ok: status < 400, json: async () => body })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  localStorage.setItem('userId', 'c1')
  localStorage.setItem('userRole', 'customer')
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('bookingApi', () => {
  it('sends the stand-in identity headers and the booking body', async () => {
    const fetchMock = respond(201, { bookingId: 'b1' })
    await bookingApi.postHomeVisit(input)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/home-visits$/)
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'x-user-id': 'c1', 'x-user-role': 'customer' })
    expect(JSON.parse(init.body)).toEqual(input)
  })

  it('asks for the slots of a day and address', async () => {
    const fetchMock = respond(200)
    await bookingApi.fetchHomeVisitSlots('2026-11-09', 'home')
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/home-visit-slots\?day=2026-11-09&addressId=home$/)
  })

  it('throws NotSignedInError on 401', async () => {
    respond(401)
    await expect(bookingApi.fetchAddresses()).rejects.toBeInstanceOf(NotSignedInError)
  })

  it('throws SlotTakenError on 409', async () => {
    respond(409)
    await expect(bookingApi.postHomeVisit(input)).rejects.toBeInstanceOf(SlotTakenError)
  })

  it('throws NoAddressError on the missing-address 400', async () => {
    respond(400, { message: 'Add an address before you book.' })
    await expect(bookingApi.postHomeVisit(input)).rejects.toBeInstanceOf(NoAddressError)
  })

  it('throws a plain error on any other 400 or 500', async () => {
    respond(400, { message: 'window must be one of ...' })
    await expect(bookingApi.postHomeVisit(input)).rejects.toThrow('Request failed: 400')
    respond(500)
    await expect(bookingApi.fetchCategories()).rejects.toThrow('Request failed: 500')
  })
})
