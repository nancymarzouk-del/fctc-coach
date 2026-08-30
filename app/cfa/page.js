// CFA Level I learner experience route. Self-contained and isolated from the FCTC
// experience (app/page.js) so it cannot regress FCTC. UALE launches this via a
// capability-gated external link (future `cfa` capability), exactly like FCTC.
import CfaExperience from '../../components/cfa/CfaExperience';

export const dynamic = 'force-dynamic';

export default function CfaPage() {
  return <CfaExperience />;
}
