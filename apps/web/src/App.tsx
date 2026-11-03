import { useState } from 'react'
import AppHeader, { type View } from './components/AppHeader'
import Toast from './components/Toast'
import AddReadingScreen from './screens/AddReadingScreen'
import DashboardScreen from './screens/DashboardScreen'

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [toast, setToast] = useState<'reading-saved' | null>(null)

  return (
    <>
      <AppHeader active={view} onNavigate={setView} />
      <main style={{ padding: 'var(--space-4)' }}>
        {view === 'log' ? (
          <AddReadingScreen
            onSaved={() => {
              setToast('reading-saved')
              setView('dashboard')
            }}
            onCancel={() => setView('dashboard')}
          />
        ) : (
          <DashboardScreen />
        )}
      </main>
      {toast === 'reading-saved' && <Toast message="Reading saved" onDismiss={() => setToast(null)} />}
    </>
  )
}
