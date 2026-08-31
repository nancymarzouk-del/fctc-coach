// CFA Level I learner experience route. Self-contained and isolated from the FCTC
// experience (app/page.js) so it cannot regress FCTC. UALE launches this via a
// capability-gated external link (future `cfa` capability), exactly like FCTC.
import CfaExperience from '../../components/cfa/CfaExperience';

export const dynamic = 'force-dynamic';

// Route-specific metadata so the CFA browser tab reads as UALE/CFA — NOT the FCTC
// firefighter title set on the shared app's root layout. This overrides only /cfa;
// the FCTC routes keep their own FCTC metadata (no cross-contamination).
export const metadata = {
  title: 'CFA Level I | UALE',
  description: 'CFA Level I aligned practice within UALE — diagnostic, topic practice, readiness, and mock exams.',
};

export default function CfaPage() {
  return <CfaExperience />;
}
