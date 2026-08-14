const PRODUCTIVITY_GOOD_MIN = 80;
const PRODUCTIVITY_WARN_MIN = 50;

function getProductivityTier(score: number): 'good' | 'warn' | 'bad' {
  if (score >= PRODUCTIVITY_GOOD_MIN) return 'good';
  if (score >= PRODUCTIVITY_WARN_MIN) return 'warn';
  return 'bad';
}

export function ProductivityBadge({ score }: { score: number }) {
  const tier = getProductivityTier(score);
  return <span className={`sla-badge sla-badge--${tier}`}>{score}%</span>;
}
