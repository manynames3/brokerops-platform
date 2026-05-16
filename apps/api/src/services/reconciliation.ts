export function expectedCommissionAmountCents(premiumCents: number, expectedRate: number) {
  return Math.round(premiumCents * expectedRate);
}

export function classifyCommissionVariance(expectedCents: number, actualCents: number) {
  const variance = actualCents - expectedCents;

  if (variance === 0) {
    return { status: "matched" as const, variance };
  }

  const severity: "high" | "medium" = Math.abs(variance) >= 2500 ? "high" : "medium";

  return {
    status: "exception" as const,
    variance,
    severity
  };
}

export type NormalizedStatementRow = {
  externalPolicyId: string;
  accountName: string;
  paymentDate: string;
  premiumCents: number;
  commissionRate: number;
  commissionAmountCents: number;
  sourceRowNumber: number;
};

export type PolicySnapshot = {
  id: string;
  externalPolicyId: string;
  accountName: string;
  expectedCommissionRate: number;
};

export type ReconciliationFinding = {
  kind: "commission_amount_mismatch" | "missing_policy" | "duplicate_payment" | "unmatched_account";
  sourceRowNumber: number;
  policyId: string | null;
  severity: "low" | "medium" | "high";
  expectedAmountCents: number | null;
  actualAmountCents: number;
  message: string;
};

export function reconcileStatementRows(
  rows: NormalizedStatementRow[],
  policies: PolicySnapshot[]
): ReconciliationFinding[] {
  const policiesByExternalId = new Map(policies.map((policy) => [policy.externalPolicyId, policy]));
  const duplicateKeys = new Map<string, number[]>();

  for (const row of rows) {
    const key = [
      row.externalPolicyId,
      row.paymentDate,
      row.premiumCents,
      row.commissionAmountCents
    ].join("|");
    duplicateKeys.set(key, [...(duplicateKeys.get(key) || []), row.sourceRowNumber]);
  }

  const duplicateSourceRows = new Set<number>();
  for (const sourceRows of duplicateKeys.values()) {
    for (const sourceRowNumber of sourceRows.slice(1)) {
      duplicateSourceRows.add(sourceRowNumber);
    }
  }

  const findings: ReconciliationFinding[] = [];

  for (const row of rows) {
    const policy = policiesByExternalId.get(row.externalPolicyId);

    if (!policy) {
      findings.push({
        kind: "missing_policy",
        sourceRowNumber: row.sourceRowNumber,
        policyId: null,
        severity: "medium",
        expectedAmountCents: null,
        actualAmountCents: row.commissionAmountCents,
        message: `No policy record exists for external policy ID ${row.externalPolicyId}.`
      });
    } else {
      const expectedAmountCents = expectedCommissionAmountCents(row.premiumCents, policy.expectedCommissionRate);
      const normalizedPolicyAccount = normalizeAccountName(policy.accountName);
      const normalizedStatementAccount = normalizeAccountName(row.accountName);

      if (normalizedPolicyAccount !== normalizedStatementAccount) {
        findings.push({
          kind: "unmatched_account",
          sourceRowNumber: row.sourceRowNumber,
          policyId: policy.id,
          severity: "medium",
          expectedAmountCents,
          actualAmountCents: row.commissionAmountCents,
          message: `Statement account "${row.accountName}" does not match policy account "${policy.accountName}".`
        });
      }

      const variance = classifyCommissionVariance(expectedAmountCents, row.commissionAmountCents);
      if (variance.status === "exception") {
        findings.push({
          kind: "commission_amount_mismatch",
          sourceRowNumber: row.sourceRowNumber,
          policyId: policy.id,
          severity: variance.severity,
          expectedAmountCents,
          actualAmountCents: row.commissionAmountCents,
          message: `Commission amount varies by ${variance.variance} cents from the expected policy schedule.`
        });
      }
    }

    if (duplicateSourceRows.has(row.sourceRowNumber)) {
      findings.push({
        kind: "duplicate_payment",
        sourceRowNumber: row.sourceRowNumber,
        policyId: policy?.id || null,
        severity: "medium",
        expectedAmountCents: policy
          ? expectedCommissionAmountCents(row.premiumCents, policy.expectedCommissionRate)
          : null,
        actualAmountCents: row.commissionAmountCents,
        message: "Statement row duplicates an earlier payment with the same policy, date, premium, and commission amount."
      });
    }
  }

  return findings;
}

function normalizeAccountName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
