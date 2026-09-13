// FINRA SIE learner experience route. Self-contained and isolated from FCTC
// (app/page.js) and CFA (app/cfa) so it cannot regress either. UALE launches this
// via a capability-gated external link (`sie` capability), exactly like CFA.
import SieExperience from '../../components/sie/SieExperience';

export const dynamic = 'force-dynamic';

// Route-specific metadata so the SIE browser tab reads as UALE/SIE — NOT the FCTC
// firefighter title on the shared root layout. Overrides only /sie.
export const metadata = {
  title: 'FINRA SIE | UALE',
  description: 'FINRA SIE aligned practice within UALE — adaptive, section-based learning toward the Securities Industry Essentials exam.',
};

export default function SiePage() {
  return <SieExperience />;
}
