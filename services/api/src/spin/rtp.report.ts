import type { RtpReport } from './rtp.simulator';

export function formatRtpReport(r: RtpReport): string {
  return [
    `Spins simulated: ${r.spins}`,
    `Settled on all ${r.paylinesSettled} fixed paylines`,
    `Total stake: ${r.totalStake.toFixed(2)}`,
    `Base game win: ${r.baseGameWin.toFixed(2)}`,
    `Free game win: ${r.freeGameWin.toFixed(2)}`,
    `Return to player: ${(r.rtp * 100).toFixed(3)}%`,
  ].join('\n');
}
