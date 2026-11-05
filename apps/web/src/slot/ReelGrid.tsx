import { symbolView, type ApiSymbol, type SymbolIcon, type SymbolTint } from './symbols'

// Invented idle grid shown before the first spin (the API has no endpoint for it).
const START_GRID: ApiSymbol[][] = [
  ['S1', 'S2', 'WILD', 'S3', 'SCATTER'],
  ['S5', 'S4', 'S6', 'S1', 'S2'],
  ['S3', 'S7', 'S4', 'S8', 'WILD'],
]

const TINTS: Record<SymbolTint, string> = {
  a: 'bg-[var(--color-danger-bg)] border-[var(--color-danger)] text-[var(--color-danger)]',
  k: 'bg-[var(--color-info-bg)] border-[var(--color-info)] text-[var(--color-info)]',
  q: 'bg-[var(--color-success-bg)] border-[var(--color-success)] text-[var(--color-success)]',
  j: 'bg-[color-mix(in_srgb,var(--sym-purple)_12%,var(--color-bg))] border-[var(--sym-purple)] text-[var(--sym-purple)]',
  p1: 'bg-[var(--color-danger)] border-[var(--color-danger)] text-[var(--color-on-primary)]',
  p2: 'bg-[var(--color-success)] border-[var(--color-success)] text-[var(--color-on-primary)]',
  p3: 'bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-on-primary)]',
  p4: 'bg-[var(--sym-purple)] border-[var(--sym-purple)] text-[var(--color-on-primary)]',
  wild: 'bg-[var(--color-fg)] border-[var(--color-fg)] text-[var(--color-bg)]',
  scatter: 'bg-[var(--color-border-strong)] border-[var(--color-border-strong)] text-[var(--color-on-primary)]',
}

const SPINNING =
  'bg-[var(--color-bg-muted)] border-dashed border-[var(--color-border)] text-[var(--color-fg-muted)]'

const ICON_PATHS: Record<Exclude<SymbolIcon, 'letter'>, string> = {
  picture: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6',
  wild: 'M12 2l3 6.3 7 1-5 4.9 1.2 6.9L12 17.8 5.8 21.1 7 14.2 2 9.3l7-1z',
  scatter: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a2 2 0 0 0 3.4 0',
}

const WINNING = 'outline outline-[length:calc(3*var(--border-width))] outline-offset-[var(--space-1)] outline-[var(--color-fg)]'

interface ReelCellProps {
  row: number
  reel: number
  symbol: ApiSymbol
  spinning: boolean
  winning: boolean
}

function ReelCell({ row, reel, symbol, spinning, winning }: ReelCellProps) {
  const { label, tint, icon } = symbolView(symbol)
  return (
    <div
      role="img"
      aria-label={`Row ${row}, reel ${reel}: ${label}${winning ? ', winning symbol' : ''}`}
      className={`relative flex min-h-[72px] flex-col items-center justify-center gap-[var(--space-1)] rounded-[var(--radius-md)] border border-solid p-[var(--space-1)] text-center text-[length:var(--font-size-sm)] leading-[1.15] [overflow-wrap:anywhere] ${spinning ? SPINNING : TINTS[tint]} ${winning ? WINNING : ''}`}
    >
      {winning && (
        <svg
          className="icon absolute right-[var(--space-1)] top-[var(--space-1)] rounded-full bg-[var(--color-bg)] text-[var(--color-success)]"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M5 12l5 5 9-10" />
        </svg>
      )}
      {icon === 'letter' ? (
        <span className="text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)]">{label}</span>
      ) : (
        <>
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d={ICON_PATHS[icon]} />
          </svg>
          <span className="font-[var(--font-weight-medium)]">{label}</span>
        </>
      )}
    </div>
  )
}

interface ReelGridProps {
  grid: ApiSymbol[][] | null
  spinning: boolean
  /** "row-reel" keys (zero-based) of winning cells; given only for the winning grid. */
  winCells?: Set<string>
  label?: string
}

export function ReelGrid({ grid, spinning, winCells, label = 'Reel grid, 3 rows by 5 reels' }: ReelGridProps) {
  const shown = grid ?? START_GRID
  return (
    <div
      data-wf-id={winCells ? 'reel-grid-win' : 'reel-grid'}
      role="group"
      aria-label={label}
      className="grid grid-cols-5 gap-[var(--space-2)] [--sym-purple:color-mix(in_srgb,var(--color-danger)_50%,var(--color-primary))]"
    >
      {shown.flatMap((cells, r) =>
        cells.map((symbol, c) => (
          <ReelCell
            key={`${r}-${c}`}
            row={r + 1}
            reel={c + 1}
            symbol={symbol}
            spinning={spinning}
            winning={winCells?.has(`${r}-${c}`) ?? false}
          />
        )),
      )}
    </div>
  )
}
