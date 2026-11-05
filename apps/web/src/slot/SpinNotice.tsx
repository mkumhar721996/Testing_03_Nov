import type { Notice } from './useSlotGame'

interface SpinNoticeProps {
  spinning: boolean
  lowBalance: boolean
  notice: Notice
}

// One live region that always keeps its height, so the layout does not jump between states.
export function SpinNotice({ spinning, lowBalance, notice }: SpinNoticeProps) {
  return (
    <div className="notice" aria-live="polite">
      {spinning && (
        <div className="alert items-center">
          <span className="spinner" aria-hidden="true" />
          <span>Spinning. The bet and Spin are locked until the reels stop.</span>
        </div>
      )}
      {!spinning && notice?.kind === 'win' && <div className="alert alert-success">{notice.text}</div>}
      {!spinning && notice?.kind === 'jackpot' && (
        <div className="alert alert-info">
          <span className="badge badge-warning">Jackpot spin</span>
          <span>{notice.text}</span>
        </div>
      )}
      {!spinning && notice?.kind === 'error' && (
        <div className="alert alert-danger" role="alert">
          {notice.text}
        </div>
      )}
      {!spinning && notice?.kind === 'autoplay' && <div className="alert alert-info">{notice.text}</div>}
      {!spinning && lowBalance && (
        <div className="alert alert-warning">
          Your balance is below the lowest bet of 1 credit. Spin is turned off.
        </div>
      )}
      {!spinning && !notice && !lowBalance && (
        <p className="notice-hint">Bet 1, 2, 3, 5 or 10 credits. Autoplay runs 10, 20, 50 or 100 spins.</p>
      )}
    </div>
  )
}
