export type ReconciliationStatus = "matched" | "exception" | "reviewed";

export type ExceptionKind =
  | "commission_amount_mismatch"
  | "missing_policy"
  | "duplicate_payment"
  | "unexpected_fee"
  | "payment_date_mismatch"
  | "unmatched_account";

export interface ReconciliationException {
  id: string;
  kind: ExceptionKind;
  statementRowId: string;
  policyId: string | null;
  severity: "low" | "medium" | "high";
  status: "open" | "in_review" | "resolved";
  expectedAmountCents: number | null;
  actualAmountCents: number;
  createdAt: string;
}

export interface AiExceptionReview {
  exceptionId: string;
  summary: string;
  likelyCause: string;
  recommendedNextStep: string;
  evidenceIds: string[];
  confidence: "low" | "medium" | "high";
  missingInformation: string[];
}
