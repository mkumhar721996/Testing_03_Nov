import { useEffect, useState } from 'react'
import { SlotCapacityPage } from './capacity/SlotCapacityPage'
import { DashboardPage } from './dashboard/DashboardPage'
import { SlotGamePage } from './slot/SlotGamePage'

const ADD_READING = '#/readings/new'
const BOOK_APPOINTMENT = '#/appointments/new'
const SLOT_GAME = '#/slot'
const SLOT_CAPACITY = '#/settings/slot-capacity'

// Hash navigation is a stand-in until the shell, router and form stories land.
function useRoute() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

const landings: Record<string, string> = {
  [ADD_READING]: 'Add reading',
  [BOOK_APPOINTMENT]: 'Book appointment',
}

export default function App() {
  const route = useRoute()
  if (route === SLOT_GAME) return <SlotGamePage />
  if (route === SLOT_CAPACITY) return <SlotCapacityPage />
  const landing = landings[route]
  if (landing) {
    return (
      <main aria-label={landing} className="p-[var(--space-3)] text-[var(--color-fg)]">
        <h1 className="text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)]">{landing}</h1>
      </main>
    )
  }
  return (
    <main>
      <DashboardPage
        onAddReading={() => (window.location.hash = ADD_READING)}
        onBookAppointment={() => (window.location.hash = BOOK_APPOINTMENT)}
      />
    </main>
  )
}
