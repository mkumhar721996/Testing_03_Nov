import { getGuestId } from './guestId'

beforeEach(() => localStorage.clear())

describe('getGuestId', () => {
  it('stores a UUID on first call and returns the same one after (AC3)', () => {
    const first = getGuestId()
    expect(first).toMatch(/^[0-9a-f-]{36}$/i)
    expect(getGuestId()).toBe(first)
  })

  it('creates a new id once storage is cleared (AC5)', () => {
    const first = getGuestId()
    localStorage.clear()
    expect(getGuestId()).not.toBe(first)
  })

  it('still returns an id when localStorage is unavailable', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(getGuestId()).toMatch(/^[0-9a-f-]{36}$/i)
    spy.mockRestore()
  })
})
