import { useEffect, useState } from 'react'
import { BookHomeVisitPage } from './booking/BookHomeVisitPage'
import { SlotCapacityPage } from './capacity/SlotCapacityPage'
import { DashboardPage } from './dashboard/DashboardPage'
import { SlotGamePage } from './slot/SlotGamePage'
import { TechnicianProfilePage } from './technicians/TechnicianProfilePage'
import { TechniciansPage } from './technicians/TechniciansPage'

const ADD_READING = '#/readings/new'
const BOOK_APPOINTMENT = '#/appointments/new'
const SLOT_GAME = '#/slot'
const TECHNICIANS = '#/technicians'
const SLOT_CAPACITY = '#/settings/slot-capacity'
const BOOK_VISIT = '#/book-visit'

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
  if (route === TECHNICIANS) return <TechniciansPage />
  if (route.startsWith(`${TECHNICIANS}/`)) {
    const id = decodeURIComponent(route.slice(TECHNICIANS.length + 1))
    return <TechnicianProfilePage key={id} id={id} />
  }
  if (route === SLOT_CAPACITY) return <SlotCapacityPage />
  if (route === BOOK_VISIT) return <BookHomeVisitPage />
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
