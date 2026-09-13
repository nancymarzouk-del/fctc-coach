// Time Management & Personal Execution learner route. Self-contained and isolated
// from FCTC (app/page.js), CFA (app/cfa) and SIE (app/sie) so it cannot regress any
// of them. UALE launches this via a capability-gated external link
// (`time_management` capability), exactly like CFA/SIE.
import TimeMgmtExperience from '../../components/tm/TimeMgmtExperience';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Time Management | UALE',
  description: 'UALE adaptive practice for Time Management & Personal Execution — prioritization, time estimation, and task decomposition across real-life contexts.',
};

export default function TimePage() {
  return <TimeMgmtExperience />;
}
