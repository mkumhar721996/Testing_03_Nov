import { useCallback, useEffect, useState } from 'react'
import { identityHeaders } from '../capacity/identity'
import { today } from '../capacity/useSlotCapacity'
import {
  NoAddressError,
  NotSignedInError,
  SlotTakenError,
  bookingApi,
  type Address,
  type BookingApi,
  type Category,
  type ConfirmedBooking,
  type HomeVisitSlots,
  type Service,
  type VisitFee,
} from './bookingApi'

export type BookingView = 'loading' | 'signed-out' | 'no-address' | 'form' | 'confirmed'

/** The days offered in the day select, starting today. */
export const DAYS_OFFERED = 5

export function offeredDays(): string[] {
  const start = Date.parse(`${today()}T00:00:00Z`)
  return Array.from({ length: DAYS_OFFERED }, (_, i) =>
    new Date(start + i * 86_400_000).toISOString().slice(0, 10),
  )
}

export function useBookHomeVisit(api: BookingApi = bookingApi) {
  const signedIn = Boolean(identityHeaders()['x-user-id'])
  const [view, setView] = useState<BookingView>(signedIn ? 'loading' : 'signed-out')
  const [error, setError] = useState<'slot-taken' | 'failed' | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [visitFee, setVisitFee] = useState<VisitFee | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [slots, setSlots] = useState<HomeVisitSlots | null>(null)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [category, setCategory] = useState<string | null>(null)
  const [service, setService] = useState<string | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [day, setDay] = useState(() => offeredDays()[0])
  const [slot, setSlot] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<ConfirmedBooking | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [reloads, setReloads] = useState(0)
  const [slotReloads, setSlotReloads] = useState(0)

  const fail = useCallback((err: unknown) => {
    if (err instanceof NotSignedInError) setView('signed-out')
    else setError('failed')
  }, [])

  useEffect(() => {
    if (!signedIn) return
    let current = true
    setView('loading')
    Promise.all([api.fetchCategories(), api.fetchAddresses()])
      .then(([cats, addrs]) => {
        if (!current) return
        setCategories(cats.categories)
        setVisitFee(cats.visitFee)
        setAddresses(addrs)
        setError(null)
        setView(addrs.length === 0 ? 'no-address' : 'form')
      })
      .catch((err) => {
        if (!current) return
        fail(err)
        setView((v) => (v === 'signed-out' ? v : 'form'))
      })
    return () => {
      current = false
    }
  }, [api, signedIn, fail, reloads])

  useEffect(() => {
    if (!category) return
    let current = true
    api
      .fetchServices(category)
      .then((list) => current && setServices(list))
      .catch((err) => current && fail(err))
    return () => {
      current = false
    }
  }, [api, category, fail])

  useEffect(() => {
    if (!service || !address) {
      setSlots(null)
      return
    }
    let current = true
    setSlotsLoading(true)
    api
      .fetchHomeVisitSlots(day, address)
      .then((s) => current && setSlots(s))
      .catch((err) => current && fail(err))
      .finally(() => current && setSlotsLoading(false))
    return () => {
      current = false
    }
  }, [api, service, address, day, fail, slotReloads])

  function chooseCategory(id: string) {
    setCategory(id)
    setService(null)
    setServices([])
    setSlot(null)
    setError(null)
  }

  function chooseService(id: string) {
    setService(id)
    setSlot(null)
    setError(null)
  }

  function chooseAddress(id: string) {
    setAddress(id)
    setSlot(null)
    setError(null)
  }

  function chooseDay(next: string) {
    setDay(next)
    setSlot(null)
  }

  function chooseSlot(window: string) {
    setSlot(window)
    setError(null)
  }

  const canConfirm = Boolean(category && service && address && slot) && !submitting

  async function confirm() {
    if (!canConfirm || !service || !address || !slot) return
    setSubmitting(true)
    try {
      setConfirmed(await api.postHomeVisit({ serviceId: service, addressId: address, day, window: slot }))
      setView('confirmed')
    } catch (err) {
      if (err instanceof SlotTakenError) {
        setError('slot-taken')
        setSlot(null)
        setSlotReloads((n) => n + 1)
      } else if (err instanceof NoAddressError) setView('no-address')
      else fail(err)
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setCategory(null)
    setService(null)
    setServices([])
    setAddress(null)
    setSlot(null)
    setConfirmed(null)
    setError(null)
    setView('form')
  }

  const retry = () => setReloads((n) => n + 1)

  return {
    view,
    error,
    categories,
    services,
    addresses,
    visitFee,
    slots,
    slotsLoading,
    category,
    service,
    address,
    day,
    slot,
    confirmed,
    submitting,
    canConfirm,
    chooseCategory,
    chooseService,
    chooseAddress,
    chooseDay,
    chooseSlot,
    confirm,
    reset,
    retry,
  }
}
