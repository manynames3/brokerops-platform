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

function money(cents: number | null) {
  if (cents === null) return "Unavailable";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function Home() {
  const exceptions = await getExceptions();

  return (
    <main>
      <section style={{ marginBottom: 32 }}>
        <span className="badge">Production-capable platform foundation</span>
        <h1>BrokerOps Platform</h1>
        <p className="muted" style={{ fontSize: 18, maxWidth: 780 }}>
          Insurance back-office reconciliation with ECS/RDS-ready infrastructure, PostgreSQL workflow data,
          Redis-compatible caching, observability, blue-green deployment support, and evidence-grounded
          AI-assisted exception review.
        </p>
      </section>

      <section className="grid grid-cols-3" style={{ marginBottom: 24 }}>
        <div className="card">
          <h2>Workflow</h2>
          <p className="muted">Carrier statement ingestion, normalization, reconciliation, exceptions, and audit events.</p>
        </div>
        <div className="card">
          <h2>Platform</h2>
          <p className="muted">Terraform, ECS, RDS PostgreSQL, ElastiCache-compatible caching, CI/CD, and runbooks.</p>
        </div>
        <div className="card">
          <h2>Operations</h2>
          <p className="muted">CloudWatch-ready boundaries, PostgreSQL query analysis, rollout controls, and cost-aware environments.</p>
        </div>
      </section>

      <section className="card">
        <h2>Open reconciliation exceptions</h2>
        {exceptions.length === 0 ? (
          <p className="muted">No exceptions returned. Seed the local database or check API health.</p>
        ) : (
          exceptions.map((item) => (
            <div className="exception" key={item.id}>
              <strong>{item.kind.replaceAll("_", " ")}</strong>
              <span className="muted">
                {item.account_name} · {item.external_policy_id} · row {item.source_row_number}
              </span>
              <span>
                Expected: {money(item.expected_amount_cents)} · Actual: {money(item.actual_amount_cents)}
              </span>
              <span className="badge">{item.severity} severity</span>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
