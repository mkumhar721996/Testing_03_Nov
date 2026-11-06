import { useEffect, useState } from 'react'
import { ChoiceCard } from '../components/ChoiceCard'
import { TechniciansShell } from '../technicians/TechniciansShell'
import { BookingSummary, formatMoney } from './BookingSummary'
import { SlotPicker } from './SlotPicker'
import { bookingApi, type BookingApi } from './bookingApi'
import { offeredDays, useBookHomeVisit } from './useBookHomeVisit'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', href: '#' },
  { id: 'items', label: 'Items', href: '#' },
  { id: 'settings', label: 'Settings', href: '#' },
]

const TOAST_ADD_ADDRESS = 'Adding an address is handled in your account'
const TOAST_BOOKINGS = 'Your bookings are shown in your account'

export function BookHomeVisitPage({ api = bookingApi }: { api?: BookingApi }) {
  const b = useBookHomeVisit(api)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const service = b.services.find((s) => s.id === b.service)
  const address = b.addresses.find((a) => a.id === b.address)
  const missing = [
    !b.category && 'category',
    !b.service && 'service',
    !b.address && 'address',
    !b.slot && 'time slot',
  ].filter((m): m is string => Boolean(m))

  return (
    <TechniciansShell current="items" items={NAV} muted footer="Web App · Help · Privacy">
      <div className="flex flex-col gap-[var(--space-4)] text-[var(--color-fg)]">
        <h1 className="text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)]">Book a home visit</h1>

        {b.view === 'loading' && (
          <div aria-busy="true" className="stack">
            <span role="status" className="text-[var(--color-fg-muted)]">
              Loading your booking form
            </span>
            {[0, 1, 2].map((i) => (
              <span key={i} className="skeleton" />
            ))}
          </div>
        )}

        {b.view === 'signed-out' && (
          <div className="empty-state">
            <h2>Sign in to book a home visit</h2>
            <p>
              Your booking was not made because you are not signed in. Sign in, then choose your service,
              address and slot. No booking has been created.
            </p>
          </div>
        )}

        {b.view === 'no-address' && (
          <>
            <div className="alert alert-warning" role="alert">
              <strong>Add an address before you book.</strong> A home visit needs a saved address. No booking
              has been created.
            </div>
            <div className="empty-state">
              <h2>No saved addresses</h2>
              <p>Addresses you save to your account appear here, and you can choose one for the visit.</p>
              <button type="button" className="btn btn-primary" onClick={() => setToast(TOAST_ADD_ADDRESS)}>
                Add an address
              </button>
            </div>
          </>
        )}

        {b.view === 'confirmed' && b.confirmed && (
          <section
            role="status"
            aria-labelledby="confirmed-heading"
            className="card flex flex-col gap-[var(--space-3)]"
          >
            <span className="badge badge-success self-start">Confirmed</span>
            <h2 id="confirmed-heading" className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)]">
              Booking confirmed
            </h2>
            <p className="m-0 text-[var(--color-fg-muted)]">
              Confirmed straight away. No approval is needed. This booking is saved to your account.
            </p>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-[var(--space-3)] gap-y-[var(--space-2)]">
              <dt className="text-[var(--color-fg-muted)]">Service</dt>
              <dd className="m-0">{b.confirmed.service.name}</dd>
              <dt className="text-[var(--color-fg-muted)]">Address</dt>
              <dd className="m-0">
                {b.confirmed.address.label}, {b.confirmed.address.line}
              </dd>
              <dt className="text-[var(--color-fg-muted)]">Slot</dt>
              <dd className="m-0">
                {b.confirmed.day}, {b.confirmed.window} {b.confirmed.zoneLabel}
              </dd>
            </dl>
            <div className="flex items-center justify-between gap-[var(--space-3)]">
              <span>Fixed visit fee</span>
              <strong>{formatMoney(b.confirmed.visitFee)}</strong>
            </div>
            <div className="flex flex-wrap gap-[var(--space-2)]">
              <button type="button" className="btn btn-primary" onClick={() => setToast(TOAST_BOOKINGS)}>
                View my bookings
              </button>
              <button type="button" className="btn btn-secondary" onClick={b.reset}>
                Book another visit
              </button>
            </div>
          </section>
        )}

        {b.view === 'form' && (
          <>
            {b.error === 'failed' && (
              <div className="alert alert-danger" role="alert">
                <p>The booking form did not load. Check your connection and try again.</p>
                <button type="button" className="btn btn-secondary" onClick={b.retry}>
                  Try again
                </button>
              </div>
            )}
            {b.error === 'slot-taken' && (
              <div className="alert alert-danger" role="alert">
                <strong>That slot was just taken.</strong> Another customer booked the last place while you
                were confirming, so no booking was made. Choose another slot and confirm again.
              </div>
            )}
            <div className="grid gap-[var(--space-4)] md:grid-cols-[minmax(0,1fr)_var(--sidebar-width)]">
              <form noValidate className="flex flex-col gap-[var(--space-4)]" onSubmit={(e) => e.preventDefault()}>
                <fieldset className="flex flex-col gap-[var(--space-2)]">
                  <legend className="font-[var(--font-weight-bold)]">1. Category</legend>
                  {b.categories.map((c) => (
                    <ChoiceCard
                      key={c.id}
                      name="category"
                      label={c.name}
                      checked={b.category === c.id}
                      onChange={() => b.chooseCategory(c.id)}
                    />
                  ))}
                </fieldset>

                <fieldset disabled={!b.category} className="flex flex-col gap-[var(--space-2)]">
                  <legend className="font-[var(--font-weight-bold)]">2. Service</legend>
                  {!b.category && (
                    <p className="text-[var(--color-fg-muted)]">Choose a category to see its services.</p>
                  )}
                  {b.services.map((s) => (
                    <ChoiceCard
                      key={s.id}
                      name="service"
                      label={s.name}
                      description={s.note}
                      checked={b.service === s.id}
                      onChange={() => b.chooseService(s.id)}
                    />
                  ))}
                </fieldset>

                <fieldset className="flex flex-col gap-[var(--space-2)]">
                  <legend className="font-[var(--font-weight-bold)]">3. Address for the visit</legend>
                  <p className="text-[var(--color-fg-muted)]">Only addresses saved to your account are shown.</p>
                  {b.addresses.map((a) => (
                    <ChoiceCard
                      key={a.id}
                      name="address"
                      label={a.label}
                      description={a.line}
                      checked={b.address === a.id}
                      onChange={() => b.chooseAddress(a.id)}
                    />
                  ))}
                  <div>
                    <button type="button" className="btn btn-ghost" onClick={() => setToast(TOAST_ADD_ADDRESS)}>
                      Add an address
                    </button>
                  </div>
                </fieldset>

                <SlotPicker
                  days={offeredDays()}
                  day={b.day}
                  slots={b.slots}
                  loading={b.slotsLoading}
                  slot={b.slot}
                  enabled={Boolean(b.service && b.address)}
                  onDay={b.chooseDay}
                  onSlot={b.chooseSlot}
                />
              </form>

              <BookingSummary
                service={service?.name}
                address={address && `${address.label}, ${address.line}`}
                slot={b.slot ? `${b.day}, ${b.slot} ${b.slots?.zoneLabel ?? ''}`.trim() : undefined}
                fee={b.visitFee}
                missing={missing}
                canConfirm={b.canConfirm}
                submitting={b.submitting}
                onConfirm={b.confirm}
              />
            </div>
          </>
        )}

        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </div>
    </TechniciansShell>
  )
}
