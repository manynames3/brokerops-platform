type ExceptionRow = {
  id: string;
  kind: string;
  severity: string;
  status: string;
  expected_amount_cents: number | null;
  actual_amount_cents: number;
  external_policy_id: string;
  account_name: string;
  payment_date: string;
  source_row_number: number;
};

type DashboardSummary = {
  statement_files: number;
  statement_rows: number;
  open_exceptions: number;
  in_review_exceptions: number;
  resolved_exceptions: number;
  high_severity_exceptions: number;
  ai_reviews: number;
  latest_statement_at: string | null;
};

const emptySummary: DashboardSummary = {
  statement_files: 0,
  statement_rows: 0,
  open_exceptions: 0,
  in_review_exceptions: 0,
  resolved_exceptions: 0,
  high_severity_exceptions: 0,
  ai_reviews: 0,
  latest_statement_at: null
};

async function getExceptions(): Promise<ExceptionRow[]> {
  const baseUrl = process.env.API_INTERNAL_URL || "http://localhost:8080";

  try {
    const response = await fetch(`${baseUrl}/exceptions`, { cache: "no-store" });

    if (!response.ok) return [];

    const data = await response.json();
    return data.exceptions || [];
  } catch {
    return [];
  }
}

async function getSummary(): Promise<DashboardSummary> {
  const baseUrl = process.env.API_INTERNAL_URL || "http://localhost:8080";

  try {
    const response = await fetch(`${baseUrl}/dashboard/summary`, { cache: "no-store" });

    if (!response.ok) return emptySummary;

    const data = await response.json();
    return data.summary || emptySummary;
  } catch {
    return emptySummary;
  }
}

function money(cents: number | null) {
  if (cents === null) return "Unavailable";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function dateTime(value: string | null) {
  if (!value) return "No imports";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default async function Home() {
  const [summary, exceptions] = await Promise.all([getSummary(), getExceptions()]);

  return (
    <main>
      <section className="page-header">
        <div>
          <span className="eyebrow">BrokerOps Platform</span>
          <h1>Operations dashboard</h1>
        </div>
        <div className="status-strip">
          <span className="status-dot" />
          <span>Local profile</span>
        </div>
      </section>

      <section className="metric-grid" aria-label="Workflow metrics">
        <Metric label="Statement files" value={summary.statement_files} />
        <Metric label="Statement rows" value={summary.statement_rows} />
        <Metric label="Open exceptions" value={summary.open_exceptions} tone="warning" />
        <Metric label="In review" value={summary.in_review_exceptions} />
        <Metric label="High severity" value={summary.high_severity_exceptions} tone="critical" />
        <Metric label="AI reviews" value={summary.ai_reviews} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Reconciliation queue</h2>
            <p className="muted">Latest statement import: {dateTime(summary.latest_statement_at)}</p>
          </div>
          <span className="badge">{summary.resolved_exceptions} resolved</span>
        </div>

        {exceptions.length === 0 ? (
          <p className="empty-state">No exceptions returned. Seed the local database or check API health.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Exception</th>
                  <th>Account</th>
                  <th>Policy</th>
                  <th>Expected</th>
                  <th>Actual</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {exceptions.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.kind.replaceAll("_", " ")}</strong>
                      <span className="table-note">row {item.source_row_number}</span>
                    </td>
                    <td>{item.account_name}</td>
                    <td>{item.external_policy_id}</td>
                    <td>{money(item.expected_amount_cents)}</td>
                    <td>{money(item.actual_amount_cents)}</td>
                    <td>
                      <span className={`badge badge-${item.severity}`}>{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warning" | "critical";
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value.toLocaleString("en-US")}</strong>
    </div>
  );
}
