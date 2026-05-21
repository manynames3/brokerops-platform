"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ReviewStatus = "open" | "in_review" | "resolved";
type LoadStatus = "loading" | "ready" | "unavailable" | "unauthorized" | "signed_out";

type ExceptionRow = {
  id: string;
  kind: string;
  severity: string;
  status: ReviewStatus;
  expected_amount_cents: number | null;
  actual_amount_cents: number;
  external_policy_id: string;
  account_name: string;
  payment_date: string;
  source_row_number: number;
  created_at?: string;
};

type ExceptionDetail = {
  id: string;
  kind: string;
  severity: string;
  status: ReviewStatus;
  expected_amount_cents: number | null;
  actual_amount_cents: number;
  external_policy_id: string;
  account_name: string;
  payment_date: string;
  premium_cents: number;
  commission_rate: string;
  expected_commission_rate: string | null;
  source_row_number: number;
  created_at: string;
  resolved_at: string | null;
};

type StatementFile = {
  id: string;
  file_name: string;
  status: string;
  row_count: number;
  carrier_name: string;
  created_at: string;
};

type PolicyRecord = {
  id: string;
  external_policy_id: string;
  account_name: string;
  expected_commission_rate: string;
  effective_date: string;
  carrier_name: string;
  created_at: string;
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

type ValidationError = {
  rowNumber: number;
  field?: string;
  code: string;
  message: string;
};

type ImportResponse = {
  ok: boolean;
  statementFileId?: string;
  importedRows?: number;
  exceptionsCreated?: number;
  exceptions?: Array<{ id: string; kind: string; message: string }>;
  errors?: ValidationError[];
};

type PolicyImportResponse = {
  ok: boolean;
  carrierId?: string;
  importedPolicies?: number;
  errors?: ValidationError[];
};

type AiReview = {
  id?: string;
  exceptionId?: string;
  exception_id?: string;
  reviewStatus?: string;
  review_status?: string;
  summary: string;
  likelyCause?: string;
  likely_cause?: string;
  recommendedNextStep?: string;
  recommended_next_step?: string;
  evidenceIds?: string[];
  evidence_ids?: string[];
  confidence: string;
  missingInformation?: string[];
  missing_information?: string[];
  promptVersion?: string;
  prompt_version?: string;
  provider: string;
  model?: string;
  model_metadata?: { model?: string; provider?: string; mode?: string };
  created_at?: string;
};

type AuditEvent = {
  id: string;
  actor: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type ExceptionDetailResponse = {
  exception: ExceptionDetail;
  aiReviews: AiReview[];
  auditEvents: AuditEvent[];
};

type AuthSession = {
  token: string;
  expiresAt: string;
  user: {
    email: string;
    displayName: string;
    role: string;
    organizationName: string;
  };
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

const sampleCsv = [
  "external_policy_id,account_name,payment_date,premium_cents,commission_rate,commission_amount_cents",
  "POL-1001,Acme Manufacturing,2026-02-15,100000,10%,10000",
  "POL-1003,Summit Retail Group,2026-02-15,200000,10%,20000",
  "POL-9999,Unknown Account,2026-02-15,50000,10%,5000",
  "POL-1004,Harbor Foods,2026-02-15,125000,10%,12500",
  "POL-1004,Harbor Foods,2026-02-15,125000,10%,12500"
].join("\n");

const samplePolicyCsv = [
  "external_policy_id,account_name,expected_commission_rate,effective_date",
  "POL-1001,Acme Manufacturing,10%,2025-01-01",
  "POL-1002,Cedar Logistics,8%,2025-01-01",
  "POL-1003,Summit Retail Group,12%,2025-01-01",
  "POL-1004,Harbor Foods,10%,2025-01-01"
].join("\n");

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");
const requestAccessUrl = process.env.NEXT_PUBLIC_REQUEST_ACCESS_URL || "#pilot";
const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL || "ops@brokerops.local";
const workspaceName = process.env.NEXT_PUBLIC_WORKSPACE_NAME || "BrokerOps Demo Workspace";
const authStorageKey = "brokerops-auth-session";

export default function Home() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);
  const [statements, setStatements] = useState<StatementFile[]>([]);
  const [policies, setPolicies] = useState<PolicyRecord[]>([]);
  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ExceptionDetailResponse | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [detailStatus, setDetailStatus] = useState<LoadStatus>("loading");
  const [carrierName, setCarrierName] = useState("Northstar Mutual");
  const [policyCarrierName, setPolicyCarrierName] = useState("Northstar Mutual");
  const [policyCsv, setPolicyCsv] = useState(samplePolicyCsv);
  const [fileName, setFileName] = useState("northstar-demo.csv");
  const [csv, setCsv] = useState(sampleCsv);
  const [policyImportState, setPolicyImportState] = useState<"idle" | "submitting">("idle");
  const [policyImportResult, setPolicyImportResult] = useState<PolicyImportResponse | null>(null);
  const [importState, setImportState] = useState<"idle" | "submitting">("idle");
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("in_review");
  const [reviewNote, setReviewNote] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [email, setEmail] = useState(demoEmail);
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(authStorageKey);
    if (!saved) {
      setStatus("signed_out");
      setDetailStatus("ready");
      return;
    }

    try {
      const parsed = JSON.parse(saved) as AuthSession;
      if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
        window.localStorage.removeItem(authStorageKey);
        setStatus("signed_out");
        setDetailStatus("ready");
        return;
      }

      setSession(parsed);
    } catch {
      window.localStorage.removeItem(authStorageKey);
      setStatus("signed_out");
      setDetailStatus("ready");
    }
  }, []);

  useEffect(() => {
    if (session) {
      void loadDashboard();
    }
  }, [session?.token]);

  useEffect(() => {
    if (!selectedExceptionId && exceptions.length > 0) {
      setSelectedExceptionId(exceptions[0].id);
    }
  }, [exceptions, selectedExceptionId]);

  useEffect(() => {
    if (!selectedExceptionId) {
      setDetail(null);
      setDetailStatus("ready");
      return;
    }

    void loadExceptionDetail(selectedExceptionId);
  }, [selectedExceptionId]);

  useEffect(() => {
    if (detail?.exception.status) {
      setReviewStatus(detail.exception.status);
    }
  }, [detail?.exception.status]);

  const statusLabel = useMemo(() => {
    if (status === "loading") return "Checking API";
    if (status === "signed_out") return "Sign in required";
    if (status === "unauthorized") return "Session rejected";
    if (status === "unavailable") return "Demo API not connected";
    return "API connected";
  }, [status]);
  const apiReady = status === "ready" && Boolean(session);
  const statementReady = apiReady && policies.length > 0;

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthMessage("Signing in...");
    setStatus("loading");

    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const body = await response.json();

      if (!response.ok) {
        setStatus("signed_out");
        setAuthMessage(body.message || "Sign in failed.");
        return;
      }

      const nextSession = body as AuthSession;
      window.localStorage.setItem(authStorageKey, JSON.stringify(nextSession));
      setSession(nextSession);
      setAuthMessage(null);
    } catch {
      setStatus("unavailable");
      setAuthMessage("The BrokerOps API could not be reached.");
    }
  }

  function signOut() {
    window.localStorage.removeItem(authStorageKey);
    setSession(null);
    setSummary(emptySummary);
    setExceptions([]);
    setStatements([]);
    setPolicies([]);
    setDetail(null);
    setStatus("signed_out");
    setDetailStatus("ready");
  }

  async function loadPolicyFile(file: File | undefined) {
    if (!file) return;
    setPolicyCsv(await file.text());
    setPolicyImportResult(null);
  }

  async function loadStatementFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setCsv(await file.text());
    setImportResult(null);
  }

  async function loadDashboard() {
    if (!session) {
      setStatus("signed_out");
      return;
    }

    setStatus("loading");

    try {
      const [summaryResponse, exceptionsResponse, statementsResponse, policiesResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/dashboard/summary`, { headers: apiHeaders(undefined, session.token) }),
        fetch(`${apiBaseUrl}/exceptions`, { headers: apiHeaders(undefined, session.token) }),
        fetch(`${apiBaseUrl}/statements`, { headers: apiHeaders(undefined, session.token) }),
        fetch(`${apiBaseUrl}/policies`, { headers: apiHeaders(undefined, session.token) })
      ]);

      if (!summaryResponse.ok || !exceptionsResponse.ok || !statementsResponse.ok || !policiesResponse.ok) {
        if ([summaryResponse, exceptionsResponse, statementsResponse, policiesResponse].some((response) => response.status === 401)) {
          window.localStorage.removeItem(authStorageKey);
          setSession(null);
          setSummary(emptySummary);
          setExceptions([]);
          setStatements([]);
          setPolicies([]);
          setStatus("unauthorized");
          return;
        }

        throw new Error("BrokerOps API returned an unhealthy dashboard response.");
      }

      const [summaryData, exceptionsData, statementsData, policiesData] = await Promise.all([
        summaryResponse.json(),
        exceptionsResponse.json(),
        statementsResponse.json(),
        policiesResponse.json()
      ]);

      setSummary(summaryData.summary || emptySummary);
      setExceptions(exceptionsData.exceptions || []);
      setStatements(statementsData.statements || []);
      setPolicies(policiesData.policies || []);
      setStatus("ready");
    } catch {
      setSummary(emptySummary);
      setExceptions([]);
      setStatements([]);
      setPolicies([]);
      setStatus("unavailable");
    }
  }

  async function submitPolicyImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPolicyImportState("submitting");
    setPolicyImportResult(null);
    setActionMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/policies/import`, {
        method: "POST",
        headers: apiHeaders("json", session?.token),
        body: JSON.stringify({
          carrierName: policyCarrierName,
          actor: "demo-operator",
          csv: policyCsv
        })
      });

      const body = await response.json();
      setPolicyImportResult(response.ok ? body : policyImportErrorResult(body, response.status));

      if (!response.ok) {
        return;
      }

      await loadDashboard();
    } catch {
      setPolicyImportResult({
        ok: false,
        errors: [{
          rowNumber: 0,
          code: "api_unavailable",
          message: "The BrokerOps API could not be reached. Start the local API or rebuild the hosted frontend with a deployed API URL."
        }]
      });
    } finally {
      setPolicyImportState("idle");
    }
  }

  async function loadExceptionDetail(exceptionId: string) {
    setDetailStatus("loading");
    setActionMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/exceptions/${exceptionId}`, { headers: apiHeaders(undefined, session?.token) });
      if (!response.ok) {
        throw new Error("Exception detail request failed.");
      }

      setDetail(await response.json());
      setDetailStatus("ready");
    } catch {
      setDetail(null);
      setDetailStatus("unavailable");
    }
  }

  async function submitImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImportState("submitting");
    setImportResult(null);
    setActionMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/statements/import`, {
        method: "POST",
        headers: apiHeaders("json", session?.token),
        body: JSON.stringify({
          carrierName,
          fileName,
          actor: "demo-operator",
          csv
        })
      });

      const body = await response.json();
      setImportResult(response.ok ? body : importErrorResult(body, response.status));

      if (!response.ok) {
        return;
      }

      await loadDashboard();
      const firstExceptionId = body.exceptions?.[0]?.id;
      if (firstExceptionId) {
        setSelectedExceptionId(firstExceptionId);
      }
    } catch {
      setImportResult({
        ok: false,
        errors: [{
          rowNumber: 0,
          code: "api_unavailable",
          message: "The BrokerOps API could not be reached. Start the local API or rebuild the hosted frontend with a deployed API URL."
        }]
      });
    } finally {
      setImportState("idle");
    }
  }

  async function createAiReview() {
    if (!detail?.exception.id) return;
    setActionMessage("Creating evidence-grounded review...");

    try {
      const response = await fetch(`${apiBaseUrl}/exceptions/${detail.exception.id}/ai-review`, {
        method: "POST",
        headers: apiHeaders(undefined, session?.token)
      });

      if (!response.ok) {
        if (response.status === 401) {
          setActionMessage("Your session is no longer authorized. Sign in again before creating an AI review.");
          return;
        }
        throw new Error("AI review request failed.");
      }

      await loadExceptionDetail(detail.exception.id);
      await loadDashboard();
      setActionMessage("AI review saved to the exception audit trail.");
    } catch {
      setActionMessage("AI review could not be created. Confirm the API and database are healthy.");
    }
  }

  async function updateExceptionStatus() {
    if (!detail?.exception.id) return;
    setActionMessage("Saving review status...");

    try {
      const response = await fetch(`${apiBaseUrl}/exceptions/${detail.exception.id}/review`, {
        method: "PATCH",
        headers: apiHeaders("json", session?.token),
        body: JSON.stringify({
          status: reviewStatus,
          actor: "demo-operator",
          note: reviewNote
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          setActionMessage("Your session is no longer authorized. Sign in again before saving review status.");
          return;
        }
        throw new Error("Review status request failed.");
      }

      setReviewNote("");
      await loadExceptionDetail(detail.exception.id);
      await loadDashboard();
      setActionMessage("Review status saved with an audit event.");
    } catch {
      setActionMessage("Review status could not be saved. Confirm the API and database are healthy.");
    }
  }

  async function exportExceptionReport() {
    if (!apiReady) return;
    setActionMessage("Preparing exception report...");

    try {
      const response = await fetch(`${apiBaseUrl}/exceptions/report.csv`, { headers: apiHeaders(undefined, session?.token) });
      if (!response.ok) {
        if (response.status === 401) {
          setActionMessage("Your session is no longer authorized. Sign in again before exporting the report.");
          return;
        }
        throw new Error("Exception report request failed.");
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = "brokerops-exception-report.csv";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
      setActionMessage("Exception report downloaded.");
    } catch {
      setActionMessage("Exception report could not be exported. Confirm the API session and service health.");
    }
  }

  const latestReview = detail?.aiReviews?.[0];

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">BrokerOps Platform</span>
          <h1>Reconcile carrier commission statements with an audit-ready exception queue.</h1>
          <p>
            Import a carrier CSV, validate the rows, compare payments against policy records, and resolve
            commission exceptions with structured evidence.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#import-statement">Try sample workflow</a>
            <a className="button secondary" href={requestAccessUrl}>Request paid pilot</a>
          </div>
        </div>
        <aside className="trust-panel" aria-label="Demo readiness">
          <div className={`status-strip status-${status}`}>
            <span className="status-dot" />
            <span>{statusLabel}</span>
          </div>
          <dl>
            <div>
              <dt>Workspace</dt>
              <dd>{session?.user.organizationName || workspaceName}</dd>
            </div>
            <div>
              <dt>Built for</dt>
              <dd>Agency or MGA operations teams reconciling monthly carrier statements.</dd>
            </div>
            <div>
              <dt>Pilot scope</dt>
              <dd>One carrier statement workflow, one policy export, measurable exceptions reviewed.</dd>
            </div>
          </dl>
          <AuthPanel
            authMessage={authMessage}
            email={email}
            password={password}
            session={session}
            setEmail={setEmail}
            setPassword={setPassword}
            onSignIn={submitLogin}
            onSignOut={signOut}
          />
        </aside>
      </section>

      <section className="workflow-strip" aria-label="Workflow">
        <WorkflowStep title="1. Set policy records" text="Load expected commission rates before statement review." />
        <WorkflowStep title="2. Import statement" text="Load a carrier statement CSV." />
        <WorkflowStep title="3. Reconcile" text="Detect missing policies, duplicates, and commission variance." />
        <WorkflowStep title="4. Review and export" text="Save evidence-backed decisions and download a report." />
      </section>

      {status === "unavailable" || status === "unauthorized" ? <ApiUnavailable status={status} /> : null}
      <section className="notice notice-info">
        <strong>Authenticated workspace boundary.</strong>
        <span>
          Operational API routes require a signed-in user and return only records scoped to that user&apos;s organization.
          Use sanitized exports for demos until production data handling is approved for a paid pilot.
        </span>
      </section>

      <section className="metric-grid" aria-label="Workflow metrics">
        <Metric label="Statement files" value={summary.statement_files} />
        <Metric label="Statement rows" value={summary.statement_rows} />
        <Metric label="Open exceptions" value={summary.open_exceptions} tone="warning" />
        <Metric label="In review" value={summary.in_review_exceptions} />
        <Metric label="High severity" value={summary.high_severity_exceptions} tone="critical" />
        <Metric label="AI reviews" value={summary.ai_reviews} />
      </section>

      <section className="two-column">
        <form className="panel import-panel" onSubmit={submitPolicyImport}>
          <div className="panel-header">
            <div>
              <h2>Set up policy records</h2>
              <p className="muted">Load the expected policy/account records that statement rows reconcile against.</p>
            </div>
            <button className="button secondary compact" type="button" onClick={() => setPolicyCsv(samplePolicyCsv)}>
              Use sample
            </button>
          </div>

          <label>
            Carrier
            <input value={policyCarrierName} onChange={(event) => setPolicyCarrierName(event.target.value)} />
          </label>
          <label>
            Upload policy CSV
            <input
              accept=".csv,text/csv"
              type="file"
              onChange={(event) => void loadPolicyFile(event.target.files?.[0])}
            />
          </label>
          <div className="file-summary">
            <strong>{csvDataRowCount(policyCsv)} policy rows ready</strong>
            <span>Required headers: external_policy_id, account_name, expected_commission_rate, effective_date</span>
          </div>
          <label>
            Policy CSV
            <textarea value={policyCsv} onChange={(event) => setPolicyCsv(event.target.value)} rows={7} />
          </label>

          <button className="button primary" type="submit" disabled={!apiReady || policyImportState === "submitting"}>
            {policyImportState === "submitting" ? "Importing..." : apiReady ? "Import policy records" : "Sign in to import"}
          </button>

          <PolicyImportResult result={policyImportResult} />
        </form>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Policy records</h2>
              <p className="muted">Current expected commission records available for reconciliation.</p>
            </div>
            <span className="badge">{policies.length} loaded</span>
          </div>

          {policies.length === 0 ? (
            <p className="empty-state">
              No policy records are available yet. Import the sample policy CSV before importing statements.
            </p>
          ) : (
            <div className="compact-list">
              {policies.slice(0, 5).map((policy) => (
                <div className="list-row" key={policy.id}>
                  <div>
                    <strong>{policy.external_policy_id}</strong>
                    <span>{policy.account_name} - {formatRate(policy.expected_commission_rate)} expected</span>
                  </div>
                  <span className="badge">{policy.carrier_name}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="two-column">
        <form id="import-statement" className="panel import-panel" onSubmit={submitImport}>
          <div className="panel-header">
            <div>
              <h2>Import statement</h2>
              <p className="muted">Import the carrier statement after policy records are loaded.</p>
            </div>
            <button className="button secondary compact" type="button" onClick={() => setCsv(sampleCsv)}>
              Use sample
            </button>
          </div>

          <label>
            Carrier
            <input value={carrierName} onChange={(event) => setCarrierName(event.target.value)} />
          </label>
          <label>
            File name
            <input value={fileName} onChange={(event) => setFileName(event.target.value)} />
          </label>
          <label>
            Upload statement CSV
            <input
              accept=".csv,text/csv"
              type="file"
              onChange={(event) => void loadStatementFile(event.target.files?.[0])}
            />
          </label>
          <div className="file-summary">
            <strong>{csvDataRowCount(csv)} statement rows ready</strong>
            <span>Required headers: external_policy_id, account_name, payment_date, premium_cents, commission_rate, commission_amount_cents</span>
          </div>
          <label>
            CSV
            <textarea value={csv} onChange={(event) => setCsv(event.target.value)} rows={9} />
          </label>

          <button className="button primary" type="submit" disabled={!statementReady || importState === "submitting"}>
            {importState === "submitting"
              ? "Importing..."
              : !apiReady
                ? "Sign in to import"
                : statementReady
                  ? "Import and reconcile"
                  : "Import policy records first"}
          </button>

          <ImportResult result={importResult} />
        </form>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Recent imports</h2>
              <p className="muted">Latest statement import: {dateTime(summary.latest_statement_at)}</p>
            </div>
          </div>

          {statements.length === 0 ? (
            <p className="empty-state">
              No statement files are available yet. Import the sample CSV to create the first reconciliation queue.
            </p>
          ) : (
            <div className="compact-list">
              {statements.slice(0, 5).map((statement) => (
                <div className="list-row" key={statement.id}>
                  <div>
                    <strong>{statement.file_name}</strong>
                    <span>{statement.carrier_name} - {statement.row_count} rows</span>
                  </div>
                  <span className="badge">{statement.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="two-column queue-layout">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Reconciliation queue</h2>
              <p className="muted">Prioritize exceptions by severity, then review the evidence.</p>
            </div>
            <div className="panel-actions">
              <button className="button secondary compact" type="button" disabled={!apiReady} onClick={exportExceptionReport}>
                Export report
              </button>
              <span className="badge">{summary.resolved_exceptions} resolved</span>
            </div>
          </div>

          {exceptions.length === 0 ? (
            <p className="empty-state">{emptyStateMessage(status)}</p>
          ) : (
            <div className="exception-list">
              {exceptions.map((item) => (
                <button
                  className={`exception-row ${selectedExceptionId === item.id ? "selected" : ""}`}
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedExceptionId(item.id)}
                >
                  <span className={`severity-dot severity-${item.severity}`} />
                  <span>
                    <strong>{labelize(item.kind)}</strong>
                    <small>{item.account_name} - row {item.source_row_number}</small>
                  </span>
                  <span className={`badge badge-${item.severity}`}>{item.status}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="panel detail-panel">
          <ExceptionDetailView
            actionMessage={actionMessage}
            detail={detail}
            detailStatus={detailStatus}
            latestReview={latestReview}
            reviewNote={reviewNote}
            reviewStatus={reviewStatus}
            setReviewNote={setReviewNote}
            setReviewStatus={setReviewStatus}
            onCreateAiReview={createAiReview}
            onUpdateStatus={updateExceptionStatus}
          />
        </section>
      </section>

      <section id="pilot" className="pilot-band">
        <div>
          <span className="eyebrow">Paid pilot readiness</span>
          <h2>Run a focused reconciliation pilot with one real carrier workflow.</h2>
          <p>
            Bring one carrier statement and one policy export. BrokerOps turns the import into validation results,
            reconciliation exceptions, evidence-backed review notes, and an audit trail your operations team can inspect.
          </p>
          <div className="pilot-terms">
            <span>Starting pilot: $750/month after setup</span>
            <span>Scope: one carrier, one policy export, one operator team</span>
            <span>Outcome: exception report and audit trail for each statement cycle</span>
          </div>
        </div>
        <a className="button primary" href={requestAccessUrl}>Request paid pilot</a>
      </section>
    </main>
  );
}

function WorkflowStep({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function AuthPanel({
  authMessage,
  email,
  password,
  session,
  setEmail,
  setPassword,
  onSignIn,
  onSignOut
}: {
  authMessage: string | null;
  email: string;
  password: string;
  session: AuthSession | null;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  onSignIn: (event: FormEvent<HTMLFormElement>) => void;
  onSignOut: () => void;
}) {
  if (session) {
    return (
      <div className="auth-panel">
        <div>
          <span>Signed in</span>
          <strong>{session.user.displayName}</strong>
          <small>{session.user.email} - {session.user.role}</small>
        </div>
        <button className="button secondary compact" type="button" onClick={onSignOut}>Sign out</button>
      </div>
    );
  }

  return (
    <form className="auth-panel auth-form" onSubmit={onSignIn}>
      <label>
        Email
        <input value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Local default: brokerops-demo-password"
        />
      </label>
      <button className="button primary compact" type="submit">Sign in</button>
      {authMessage ? <p className="action-message">{authMessage}</p> : null}
    </form>
  );
}

function ApiUnavailable({ status }: { status: Extract<LoadStatus, "unavailable" | "unauthorized"> }) {
  if (status === "unauthorized") {
    return (
      <section className="notice notice-warning">
        <strong>Session is not accepted.</strong>
        <span>
          The API is reachable, but it rejected this session. Sign in again with an active BrokerOps user.
        </span>
      </section>
    );
  }

  return (
    <section className="notice notice-warning">
      <strong>Demo API is not connected.</strong>
      <span>
        The frontend is configured for <code>{apiBaseUrl}</code>. Start the local API or rebuild the Cloudflare
        Pages deployment with a public BrokerOps API URL.
      </span>
    </section>
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

function PolicyImportResult({ result }: { result: PolicyImportResponse | null }) {
  if (!result) return null;

  if (!result.ok) {
    return (
      <div className="notice notice-error">
        <strong>Policy import needs attention.</strong>
        <ul>
          {(result.errors || []).map((error, index) => (
            <li key={`${error.code}-${index}`}>
              Row {error.rowNumber}: {error.field ? `${error.field} - ` : ""}{error.message}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="notice notice-success">
      <strong>Policy records imported.</strong>
      <span>{result.importedPolicies} policy records are ready for reconciliation.</span>
    </div>
  );
}

function ImportResult({ result }: { result: ImportResponse | null }) {
  if (!result) return null;

  if (!result.ok) {
    return (
      <div className="notice notice-error">
        <strong>Import needs attention.</strong>
        <ul>
          {(result.errors || []).map((error, index) => (
            <li key={`${error.code}-${index}`}>
              Row {error.rowNumber}: {error.field ? `${error.field} - ` : ""}{error.message}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="notice notice-success">
      <strong>Statement imported and reconciled.</strong>
      <span>
        {result.importedRows} rows processed, {result.exceptionsCreated} exceptions created.
      </span>
    </div>
  );
}

function ExceptionDetailView({
  actionMessage,
  detail,
  detailStatus,
  latestReview,
  reviewNote,
  reviewStatus,
  setReviewNote,
  setReviewStatus,
  onCreateAiReview,
  onUpdateStatus
}: {
  actionMessage: string | null;
  detail: ExceptionDetailResponse | null;
  detailStatus: LoadStatus;
  latestReview: AiReview | undefined;
  reviewNote: string;
  reviewStatus: ReviewStatus;
  setReviewNote: (value: string) => void;
  setReviewStatus: (value: ReviewStatus) => void;
  onCreateAiReview: () => void;
  onUpdateStatus: () => void;
}) {
  if (detailStatus === "loading") {
    return <p className="empty-state">Loading exception evidence.</p>;
  }

  if (detailStatus === "unavailable") {
    return <p className="empty-state">Exception evidence could not be loaded from the API.</p>;
  }

  if (!detail) {
    return <p className="empty-state">Select an exception to review the evidence and audit history.</p>;
  }

  const exception = detail.exception;

  return (
    <>
      <div className="panel-header">
        <div>
          <h2>{labelize(exception.kind)}</h2>
          <p className="muted">{exception.account_name} - policy {exception.external_policy_id}</p>
        </div>
        <span className={`badge badge-${exception.severity}`}>{exception.severity}</span>
      </div>

      <div className="evidence-grid">
        <Evidence label="Expected" value={money(exception.expected_amount_cents)} />
        <Evidence label="Actual" value={money(exception.actual_amount_cents)} />
        <Evidence label="Premium" value={money(exception.premium_cents)} />
        <Evidence label="Payment date" value={dateOnly(exception.payment_date)} />
      </div>

      <section className="review-block">
        <div className="review-heading">
          <h3>Evidence-grounded AI review</h3>
          <button className="button secondary compact" type="button" onClick={onCreateAiReview}>
            Create review
          </button>
        </div>
        {latestReview ? (
          <div className="ai-review">
            <strong>{latestReview.summary}</strong>
            <p>{latestReview.likelyCause || latestReview.likely_cause}</p>
            <dl>
              <div>
                <dt>Next step</dt>
                <dd>{latestReview.recommendedNextStep || latestReview.recommended_next_step}</dd>
              </div>
              <div>
                <dt>Evidence IDs</dt>
                <dd>{(latestReview.evidenceIds || latestReview.evidence_ids || []).join(", ")}</dd>
              </div>
              <div>
                <dt>Confidence</dt>
                <dd>{latestReview.confidence}</dd>
              </div>
              <div>
                <dt>Prompt</dt>
                <dd>{latestReview.promptVersion || latestReview.prompt_version}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="empty-state">No AI review has been saved for this exception yet.</p>
        )}
      </section>

      <section className="review-block">
        <h3>Human review</h3>
        <div className="review-controls">
          <label>
            Status
            <select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as ReviewStatus)}>
              <option value="open">Open</option>
              <option value="in_review">In review</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>
          <label>
            Review note
            <textarea
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              placeholder="Record the carrier follow-up or resolution rationale."
              rows={3}
            />
          </label>
          <button className="button primary" type="button" onClick={onUpdateStatus}>Save review status</button>
        </div>
        {actionMessage ? <p className="action-message">{actionMessage}</p> : null}
      </section>

      <section className="review-block">
        <h3>Audit trail</h3>
        {detail.auditEvents.length === 0 ? (
          <p className="empty-state">No audit events have been recorded yet.</p>
        ) : (
          <div className="timeline">
            {detail.auditEvents.map((event) => (
              <div key={event.id}>
                <strong>{labelize(event.action)}</strong>
                <span>{event.actor} - {dateTime(event.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Evidence({ label, value }: { label: string; value: string }) {
  return (
    <div className="evidence-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
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

function dateOnly(value: string | null) {
  if (!value) return "Unavailable";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

function labelize(value: string) {
  return value.replaceAll("_", " ");
}

function formatRate(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return `${Math.round(parsed * 10000) / 100}%`;
}

function csvDataRowCount(value: string) {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return Math.max(lines.length - 1, 0);
}

function emptyStateMessage(status: LoadStatus) {
  if (status === "loading") return "Loading reconciliation queue.";
  if (status === "signed_out") return "Sign in to import statements and review exceptions.";
  if (status === "unauthorized") return "The API rejected this session.";
  if (status === "unavailable") return "Connect the BrokerOps API to import statements and review exceptions.";
  return "No reconciliation exceptions returned. Import the sample CSV to create a review queue.";
}

function apiHeaders(format?: "json", token?: string) {
  const headers: Record<string, string> = {};

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  if (format === "json") {
    headers["content-type"] = "application/json";
  }

  return headers;
}

function policyImportErrorResult(body: unknown, statusCode: number): PolicyImportResponse {
  if (isValidationErrorBody(body)) {
    return body;
  }

  return {
    ok: false,
    errors: [apiErrorToValidationError(body, statusCode)]
  };
}

function importErrorResult(body: unknown, statusCode: number): ImportResponse {
  if (isValidationErrorBody(body)) {
    return body;
  }

  return {
    ok: false,
    errors: [apiErrorToValidationError(body, statusCode)]
  };
}

function isValidationErrorBody(body: unknown): body is { ok: false; errors: ValidationError[] } {
  return Boolean(
    body &&
    typeof body === "object" &&
    Array.isArray((body as { errors?: unknown }).errors)
  );
}

function apiErrorToValidationError(body: unknown, statusCode: number): ValidationError {
  const message = body && typeof body === "object" && "message" in body && typeof body.message === "string"
    ? body.message
    : "The API rejected the request before import validation could run.";

  return {
    rowNumber: 0,
    code: statusCode === 401 ? "authentication_required" : "api_error",
    message
  };
}
