interface StartPanelProps {
  pending: boolean
  error: boolean
  onStart: () => void
}

export default function StartPanel({ pending, error, onStart }: StartPanelProps) {
  return (
    <section className="card">
      <h1>Play as a guest</h1>
      <p>Play with a fixed play-money balance. No account or payment needed.</p>
      {error && (
        <p role="alert" className="text-ds-sm text-ds-danger">
          We could not start the game. Try again.
        </p>
      )}
      <div>
        <button type="button" className="btn btn-primary btn-lg" disabled={pending} onClick={onStart}>
          {pending ? 'Starting game' : 'Play as guest'}
        </button>
      </div>
    </section>
  )
}
