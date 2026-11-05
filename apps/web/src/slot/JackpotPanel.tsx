import { JACKPOT_HIT_TIER_ID, JACKPOT_TIERS } from './gameConfig'

export function JackpotPanel({ hit }: { hit: boolean }) {
  const rows = [JACKPOT_TIERS.slice(0, 3), JACKPOT_TIERS.slice(3)]
  return (
    <section className="scene" data-wf-id="scene" aria-label="Jackpots">
      <div data-wf-id="jackpot-panel">
        {rows.map((tiers, i) => (
          <div key={i} className="jackpot-row">
            {tiers.map((t) => (
              <div
                key={t.id}
                data-testid="jackpot-tier"
                className={`tier${hit && t.id === JACKPOT_HIT_TIER_ID ? ' is-hit' : ''}`}
              >
                <span className="tier-name">{t.name}</span>
                <span className="tier-value">{t.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="game-logo" data-wf-id="game-logo">
        Flaming Hot Gold™
      </div>
    </section>
  )
}
