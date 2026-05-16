export function expectedCommissionAmountCents(premiumCents: number, expectedRate: number) {
  return Math.round(premiumCents * expectedRate);
}

export function classifyCommissionVariance(expectedCents: number, actualCents: number) {
  const variance = actualCents - expectedCents;

  if (variance === 0) {
    return { status: "matched" as const, variance };
  }

  return {
    status: "exception" as const,
    variance,
    severity: Math.abs(variance) >= 2500 ? "high" : "medium"
  };
}
