import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SaveError, fetchReadingTypes, saveReading } from './readingsApi'

const body = { clientRequestId: 'req-1', type: 'fx', values: { value: 15 }, date: '2026-11-03' }

describe('readingsApi', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('posts the reading as JSON', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 201 }))
    await saveReading(body)
    expect(fetchMock).toHaveBeenCalledWith('/readings', expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }))
  })

  it('throws offline without calling the network when the device is offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    await expect(saveReading(body)).rejects.toMatchObject({ kind: 'offline' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws failed on a network error or non-2xx response', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(saveReading(body)).rejects.toMatchObject({ kind: 'failed' })
    fetchMock.mockResolvedValue(new Response('{}', { status: 500 }))
    await expect(saveReading(body)).rejects.toBeInstanceOf(SaveError)
    await expect(saveReading(body)).rejects.toMatchObject({ kind: 'failed' })
  })

  it('throws invalid with the server field and message on a 400', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ field: 'value', message: 'Too high.' }), { status: 400 }))
    await expect(saveReading(body)).rejects.toMatchObject({ kind: 'invalid', field: 'value', message: 'Too high.' })
  })

  it('fetches the reading types', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([{ id: 'fx' }]), { status: 200 }))
    await expect(fetchReadingTypes()).resolves.toEqual([{ id: 'fx' }])
  })

  it('rejects when the reading types cannot be loaded', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 500 }))
    await expect(fetchReadingTypes()).rejects.toBeInstanceOf(Error)
  })
})
