import type { ReactNode } from 'react'

const TILE_COUNT = 15
const TILE_BASE =
  'flex aspect-square items-center justify-center rounded-[var(--radius-md)] border-[length:var(--border-width)] border-solid'
const TILE = `${TILE_BASE} border-[var(--color-border)] bg-[var(--color-bg-muted)] text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)]`
const SCATTER_TILE = `${TILE_BASE} border-[var(--color-warning)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]`
const REELS = 'grid grid-cols-5 gap-[var(--space-1)]'
const RESTING_GRID = Array.from({ length: 3 }, () => Array<string>(5).fill(''))

function StarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[var(--control-height-sm)] w-[var(--control-height-sm)] fill-current stroke-current"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

export function ReelGrid({
  grid,
  scatterCount = 0,
  busy = false,
  children,
}: {
  grid?: string[][]
  scatterCount?: number
  busy?: boolean
  children?: ReactNode
}) {
  const label = grid ? `Reels: ${scatterCount} scatters` : 'Reels at rest, no scatters'
  return (
    <div className="card" aria-busy={busy || undefined}>
      {busy ? (
        <div className={REELS} aria-hidden="true">
          {Array.from({ length: TILE_COUNT }, (_, i) => (
            <span key={i} className={`skeleton ${TILE}`} />
          ))}
        </div>
      ) : (
        <div className={REELS} role="img" aria-label={label}>
          {(grid ?? RESTING_GRID).flat().map((symbol, i) =>
            symbol === 'SCATTER' ? (
              <div key={i} className={SCATTER_TILE}>
                <StarIcon />
                <span className="sr-only">Scatter</span>
              </div>
            ) : (
              <div key={i} className={TILE}>
                {symbol}
              </div>
            ),
          )}
        </div>
      )}
      {children}
    </div>
  )
}
