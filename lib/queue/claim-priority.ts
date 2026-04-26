/**
 * Recovery priority: higher dollar exposure = higher priority (same as legacy CRA).
 */
export function calculatePriority(claim: Record<string, unknown>) {
  const raw = (claim?.amount ?? claim?.billed_amount ?? claim?.recoveryAmount ?? 0) as unknown;
  const amount = typeof raw === "number" ? raw : parseFloat(String(raw)) || 0;
  const priorityScore = Math.max(0, amount);
  return {
    priorityScore,
    label: `$${priorityScore.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  };
}
