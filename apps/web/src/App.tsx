import { useState } from 'react'
import { BetControl } from './components/BetControl'

export default function App() {
  // No spin endpoint exists yet, so the balance is local state only.
  const [balance] = useState(100)
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
      <h1 className="text-3xl font-bold text-slate-900">Web App</h1>
      <BetControl balance={balance} onSpin={() => {}} />
    </main>
  )
}
