interface ToastProps {
  message: string
  onDismiss: () => void
}

/** Confirms a completed action. No auto-dismiss: it stays until the person dismisses it. */
export default function Toast({ message, onDismiss }: ToastProps) {
  return (
    <div className="toast cluster" role="status" style={{ justifyContent: 'space-between' }}>
      <span>{message}</span>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  )
}
