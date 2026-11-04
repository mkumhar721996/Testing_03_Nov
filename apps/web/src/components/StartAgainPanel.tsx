interface StartAgainPanelProps {
  onStartAgain: () => void
}

export function StartAgainPanel({ onStartAgain }: StartAgainPanelProps) {
  return (
    <div
      data-wf-id="start-again-panel"
      className="flex flex-wrap items-center justify-between gap-[var(--space-3)] rounded-[var(--radius-md)] border-[length:var(--border-width)] border-solid border-[var(--color-warning)] bg-[var(--color-warning-bg)] p-[var(--space-3)]"
    >
      <div className="flex flex-col">
        <span className="font-[var(--font-weight-bold)]">You have no balance left.</span>
        <span>Start again and your balance goes back to 100.</span>
      </div>
      <button type="button" className="btn btn-primary btn-lg" onClick={onStartAgain}>
        Start again
      </button>
    </div>
  )
}
