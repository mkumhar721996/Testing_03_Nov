import { useCallback, useEffect, useState } from 'react'
import { fetchFreeGames, postSpin, type SpinResponse } from './spinApi'

export type GameState =
  | { status: 'idle'; remaining: number }
  | { status: 'submitting'; remaining: number }
  | { status: 'result'; spin: SpinResponse }
  | { status: 'error'; remaining: number }

export function remainingOf(state: GameState): number {
  return state.status === 'result' ? state.spin.freeGames.remaining : state.remaining
}

/** Free games are only ever taken from the server: on load and from each spin response. */
export function useSlotGame() {
  const [state, setState] = useState<GameState>({ status: 'idle', remaining: 0 })

  useEffect(() => {
    const controller = new AbortController()
    fetchFreeGames(controller.signal).then(
      ({ remaining }) => {
        // A spin already under way wins over the initial load.
        if (!controller.signal.aborted) {
          setState((s) => (s.status === 'idle' ? { status: 'idle', remaining } : s))
        }
      },
      () => {
        if (!controller.signal.aborted) {
          setState((s) => (s.status === 'idle' ? { status: 'error', remaining: s.remaining } : s))
        }
      },
    )
    return () => controller.abort()
  }, [])

  const spin = useCallback((bet: number) => {
    setState((s) => ({ status: 'submitting', remaining: remainingOf(s) }))
    postSpin(bet).then(
      (result) => setState({ status: 'result', spin: result }),
      () => setState((s) => ({ status: 'error', remaining: remainingOf(s) })),
    )
  }, [])

  return { state, spin }
}
