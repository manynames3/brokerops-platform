export const reviewStatuses = ["open", "in_review", "resolved"] as const;

export type ReviewStatus = (typeof reviewStatuses)[number];

export function isReviewStatus(value: string | undefined): value is ReviewStatus {
  return reviewStatuses.some((status) => status === value);
}

export function buildStatusChangeAuditMetadata(input: {
  previousStatus: string;
  nextStatus: ReviewStatus;
  note?: string;
}) {
  return {
    previousStatus: input.previousStatus,
    nextStatus: input.nextStatus,
    note: input.note?.trim() || null
  };
}
