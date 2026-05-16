import type { NormalizedStatementRow } from "./reconciliation.js";

export type StatementValidationError = {
  rowNumber: number;
  field?: string;
  code: string;
  message: string;
};

type HeaderName =
  | "external_policy_id"
  | "account_name"
  | "payment_date"
  | "premium_cents"
  | "commission_rate"
  | "commission_amount_cents";

const requiredHeaders: HeaderName[] = [
  "external_policy_id",
  "account_name",
  "payment_date",
  "premium_cents",
  "commission_rate",
  "commission_amount_cents"
];

export function normalizeStatementCsv(csv: string): {
  rows: NormalizedStatementRow[];
  errors: StatementValidationError[];
} {
  const records = parseCsvRecords(csv);
  const errors: StatementValidationError[] = [];

  if (records.length === 0) {
    return {
      rows: [],
      errors: [{
        rowNumber: 1,
        code: "empty_csv",
        message: "CSV input must include a header row and at least one data row."
      }]
    };
  }

  const headers = records[0].map((header) => header.trim().toLowerCase());
  const headerIndexes = new Map(headers.map((header, index) => [header, index]));

  for (const header of requiredHeaders) {
    if (!headerIndexes.has(header)) {
      errors.push({
        rowNumber: 1,
        field: header,
        code: "missing_header",
        message: `CSV is missing required header "${header}".`
      });
    }
  }

  if (errors.length > 0) {
    return { rows: [], errors };
  }

  const rows: NormalizedStatementRow[] = [];

  records.slice(1).forEach((record, index) => {
    const rowNumber = index + 2;
    if (record.every((value) => value.trim() === "")) {
      return;
    }

    const externalPolicyId = getCell(record, headerIndexes, "external_policy_id");
    const accountName = getCell(record, headerIndexes, "account_name");
    const paymentDate = getCell(record, headerIndexes, "payment_date");
    const premiumCents = parseCents(getCell(record, headerIndexes, "premium_cents"));
    const commissionRate = parseRate(getCell(record, headerIndexes, "commission_rate"));
    const commissionAmountCents = parseCents(getCell(record, headerIndexes, "commission_amount_cents"));

    if (!externalPolicyId) {
      errors.push(requiredFieldError(rowNumber, "external_policy_id"));
    }
    if (!accountName) {
      errors.push(requiredFieldError(rowNumber, "account_name"));
    }
    if (!isIsoDate(paymentDate)) {
      errors.push({
        rowNumber,
        field: "payment_date",
        code: "invalid_date",
        message: "payment_date must be a valid YYYY-MM-DD date."
      });
    }
    if (premiumCents === null) {
      errors.push(numberFieldError(rowNumber, "premium_cents"));
    }
    if (commissionRate === null) {
      errors.push({
        rowNumber,
        field: "commission_rate",
        code: "invalid_rate",
        message: "commission_rate must be a decimal rate or percentage between 0 and 1."
      });
    }
    if (commissionAmountCents === null) {
      errors.push(numberFieldError(rowNumber, "commission_amount_cents"));
    }

    if (
      externalPolicyId &&
      accountName &&
      isIsoDate(paymentDate) &&
      premiumCents !== null &&
      commissionRate !== null &&
      commissionAmountCents !== null
    ) {
      rows.push({
        externalPolicyId,
        accountName,
        paymentDate,
        premiumCents,
        commissionRate,
        commissionAmountCents,
        sourceRowNumber: rowNumber
      });
    }
  });

  if (records.length > 1 && rows.length === 0 && errors.length === 0) {
    errors.push({
      rowNumber: 2,
      code: "no_data_rows",
      message: "CSV input must include at least one non-empty data row."
    });
  }

  return { rows, errors };
}

export function parseCsvRecords(csv: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        field += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      record.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      record.push(field);
      records.push(record);
      record = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  return records.filter((row) => row.some((value) => value.trim() !== ""));
}

function getCell(record: string[], headerIndexes: Map<string, number>, header: HeaderName) {
  const index = headerIndexes.get(header);
  if (index === undefined) return "";
  return (record[index] || "").trim();
}

function requiredFieldError(rowNumber: number, field: string): StatementValidationError {
  return {
    rowNumber,
    field,
    code: "required_field",
    message: `${field} is required.`
  };
}

function numberFieldError(rowNumber: number, field: string): StatementValidationError {
  return {
    rowNumber,
    field,
    code: "invalid_money",
    message: `${field} must be a non-negative whole-cent integer or dollar amount.`
  };
}

function parseCents(value: string) {
  const cleaned = value.trim().replace(/[$,\s]/g, "");
  if (!cleaned) return null;

  if (/^\d+$/.test(cleaned)) {
    return Number(cleaned);
  }

  if (/^\d+\.\d{1,2}$/.test(cleaned)) {
    return Math.round(Number(cleaned) * 100);
  }

  return null;
}

function parseRate(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return null;

  const isPercent = cleaned.endsWith("%");
  const parsed = Number(isPercent ? cleaned.slice(0, -1) : cleaned);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  const rate = isPercent || parsed > 1 ? parsed / 100 : parsed;
  if (rate < 0 || rate > 1) {
    return null;
  }

  return rate;
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}
