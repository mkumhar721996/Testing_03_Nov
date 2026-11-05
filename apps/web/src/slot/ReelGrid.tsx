import { symbolView, type ApiSymbol } from './symbols'

// Invented idle grid shown before the first spin (the API has no endpoint for it).
const START_GRID: ApiSymbol[][] = [
  ['S1', 'S2', 'WILD', 'S3', 'SCATTER'],
  ['S5', 'S4', 'S6', 'S1', 'S2'],
  ['S3', 'S7', 'S4', 'S8', 'WILD'],
]

interface ReelGridProps {
  grid: ApiSymbol[][] | null
  spinning: boolean
  turbo?: boolean
}

export function ReelGrid({ grid, spinning, turbo = false }: ReelGridProps) {
  const shown = grid ?? START_GRID
  const classes = ['reel-grid', spinning ? 'is-spinning' : '', spinning && turbo ? 'is-turbo' : ''].filter(Boolean)
  return (
    <div
      data-wf-id="reel-grid"
      role="group"
      aria-label="Reel grid, 3 rows by 5 reels"
      aria-busy={spinning}
      className={classes.join(' ')}
    >
      {shown.flatMap((cells, r) =>
        cells.map((symbol, c) => {
          const { label } = symbolView(symbol)
          return (
            <div key={`${r}-${c}`} role="img" aria-label={`Row ${r + 1}, reel ${c + 1}: ${label}`} className="reel-cell">
              <span className="sym-glyph">{label}</span>
            </div>
          )
        }),
      )}
    </div>
  )
}
