/**
 * Recovery priority: higher dollar exposure = higher priority (simple, auditable).
 * Optional: multiply or add for certain denial types later.
 */
export function calculatePriority(claim) {
  const raw = claim?.amount ?? claim?.billed_amount ?? claim?.recoveryAmount ?? 0;
  const amount = typeof raw === 'number' ? raw : parseFloat(raw) || 0;
  const priorityScore = Math.max(0, amount);
  return {
    priorityScore,
    /** Display in dashboard Priority column */
    label: `$${priorityScore.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  };
}
