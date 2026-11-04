import { formatRtpReport } from './rtp.report';
import { simulateRtp } from './rtp.simulator';

console.log(formatRtpReport(simulateRtp({ spins: 10_000_000, bet: 10, seed: 1 })));
