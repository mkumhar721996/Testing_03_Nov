import { useEffect } from 'react'

const AUTO_HIDE_MS = 4000

interface ToastProps {
  message: string
  onHide: () => void
}

export default function Toast({ message, onHide }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onHide, AUTO_HIDE_MS)
    return () => clearTimeout(timer)
  }, [message, onHide])

  return (
    <div className="toast" role="status">
      {message}
    </div>
  )
}
