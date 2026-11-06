import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  releasesApi,
  buildsApi,
  testsApi,
  deploymentsApi,
  type Release,
  type BuildExecution,
  type TestExecution,
  type Deployment,
} from "../../lib/api";
import { Layout } from "../../components/Layout";
import {
  glassCard,
  btnPrimary,
  btnGhost,
  linkBtnPrimary,
  pageTitle,
  sectionTitle,
  mutedText,
  errorText,
  backLink,
  metaItem,
  metaLabel,
  metaValue,
  releaseBadgeStyle,
  deployBadgeStyle,
  terminalPre,
} from "../../design/tokens";

const STATUS_ORDER = ["CREATED","BUILDING","TESTING","DEPLOYING","MONITORING","SUCCESS"];
const ACTIVE_STATUSES = new Set(["BUILDING","TESTING","DEPLOYING","MONITORING"]);
const RUNNING_EXEC = new Set(["PENDING","RUNNING"]);

export function ReleaseDetailsPage() {
  const { id: projectId, releaseId } = useParams<{ id: string; releaseId: string }>();
  const [release, setRelease] = useState<Release | null>(null);
  const [builds, setBuilds] = useState<BuildExecution[]>([]);
  const [tests, setTests]   = useState<TestExecution[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function fetchAll() {
    if (!projectId || !releaseId) return;
    const [r, b, t, d] = await Promise.all([
      releasesApi.get(projectId, releaseId),
      buildsApi.list(projectId, releaseId).catch(() => [] as BuildExecution[]),
      testsApi.list(projectId, releaseId).catch(() => [] as TestExecution[]),
      deploymentsApi.list(projectId, releaseId).catch(() => [] as Deployment[]),
    ]);
    setRelease(r); setBuilds(b); setTests(t); setDeployments(d);
    return r;
  }

  useEffect(() => {
    if (!projectId || !releaseId) return;
    fetchAll()
      .then((r) => {
        if (r && ACTIVE_STATUSES.has(r.status)) {
          pollRef.current = setInterval(() => {
            fetchAll().then((u) => { if (u && !ACTIVE_STATUSES.has(u.status)) stopPolling(); });
          }, 3000);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    return stopPolling;
  }, [projectId, releaseId]);

  async function handleStart() {
    if (!projectId || !releaseId) return;
    setStarting(true);
    try {
      const updated = await releasesApi.start(projectId, releaseId);
      setRelease(updated);
      pollRef.current = setInterval(() => {
        fetchAll().then((r) => { if (r && !ACTIVE_STATUSES.has(r.status)) stopPolling(); });
      }, 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }

  if (loading) return <Layout><p style={mutedText}>Loading…</p></Layout>;
  if (error)   return <Layout><p style={errorText}>{error}</p></Layout>;
  if (!release) return <Layout><p style={mutedText}>Release not found.</p></Layout>;

  const isFailed  = release.status === "FAILED" || release.status === "ROLLED_BACK";
  const isTerminal = release.status === "SUCCESS" || isFailed;

  return (
    <Layout>
      <Link to={`/projects/${projectId}`} style={backLink}>← Back to project</Link>

      <div style={headerRow}>
        <h1 style={pageTitle}>
          Release{" "}
          <span style={{ fontFamily: "ui-monospace, monospace", color: "#D96AA8" }}>
            {release.version}
          </span>
        </h1>
        {release.status === "CREATED" && (
          <button
            onClick={handleStart}
            disabled={starting}
            style={btnPrimary}
            className="rg-btn-primary"
          >
            {starting ? "Starting…" : "▶ Start release"}
          </button>
        )}
      </div>

      {/* Progress pipeline */}
      {!isTerminal && (
        <div style={{ ...glassCard, padding: "1.5rem 2rem", marginBottom: "1.75rem", overflowX: "auto" }}>
          <div style={pipelineRow}>
            {STATUS_ORDER.map((step, idx) => {
              const current = STATUS_ORDER.indexOf(release.status);
              const done   = idx < current;
              const active = idx === current;
              const dotColor = done
                ? "#22c55e"
                : active
                ? "#E879B9"
                : "rgba(242,197,220,0.55)";
              return (
                <div key={step} style={pipelineStep}>
                  <div style={pipelineItemWrap}>
                    <div
                      className={active ? "rg-step-active" : undefined}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: dotColor,
                        border: active
                          ? "3px solid rgba(255,255,255,0.9)"
                          : done
                          ? "2px solid rgba(34,197,94,0.4)"
                          : "2px solid rgba(242,197,220,0.5)",
                        flexShrink: 0,
                      }}
                    />
                    <span style={stepLabelStyle(active, done)}>
                      {step}
                    </span>
                  </div>
                  {idx < STATUS_ORDER.length - 1 && (
                    <div
                      style={{
                        flex: 1,
                        height: 2,
                        margin: "0 6px",
                        marginBottom: 18,
                        background: done
                          ? "linear-gradient(90deg, #22c55e, #4ade80)"
                          : "rgba(242,197,220,0.4)",
                        borderRadius: 2,
                        transition: "background 0.4s",
                        alignSelf: "flex-start",
                        marginTop: 9,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isFailed && (
        <div style={failedBanner}>
          Release {release.status.toLowerCase().replace("_", " ")}.
        </div>
      )}

      {/* Meta */}
      <div style={{ ...glassCard, padding: "1.25rem 1.5rem", marginBottom: "1.75rem", display: "grid", gap: "0.875rem" }}>
        <MetaRow label="Status">
          <span style={releaseBadgeStyle(release.status)}>{release.status}</span>
        </MetaRow>
        <MetaRow label="Commit hash">
          <span style={{ fontFamily: "monospace" }}>{release.commitHash ?? "—"}</span>
        </MetaRow>
        <MetaRow label="Created">{new Date(release.createdAt).toLocaleString()}</MetaRow>
        <MetaRow label="Updated">{new Date(release.updatedAt).toLocaleString()}</MetaRow>
      </div>

      {builds.length > 0 && <ExecutionPanel title="Build" executions={builds} />}
      {tests.length > 0  && <ExecutionPanel title="Test"  executions={tests}  />}
      {deployments.length > 0 && (
        <DeploymentPanel
          deployment={deployments[0]}
          projectId={projectId!}
          releaseId={releaseId!}
        />
      )}
    </Layout>
  );
}

function DeploymentPanel({ deployment, projectId, releaseId }: {
  deployment: Deployment;
  projectId: string;
  releaseId: string;
}) {
  return (
    <div style={{ ...glassCard, padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
      <div style={panelHeader}>
        <span style={sectionTitle}>Deployment</span>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {deployment.status === "RUNNING" && (
            <Link
              to={`/projects/${projectId}/releases/${releaseId}/deployments/${deployment.id}`}
              style={{ ...linkBtnPrimary, fontSize: "0.78rem", padding: "0.3rem 0.8rem" }}
              className="rg-btn-primary"
            >
              View monitoring →
            </Link>
          )}
          <span style={deployBadgeStyle(deployment.status)}>{deployment.status}</span>
        </div>
      </div>
      <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.875rem" }}>
        <DeployRow label="Image">{deployment.imageTag}</DeployRow>
        {deployment.containerId && (
          <DeployRow label="Container">{deployment.containerId.slice(0, 12)}</DeployRow>
        )}
        {deployment.hostPort && (
          <DeployRow label="Port">
            <a href={`http://localhost:${deployment.hostPort}`} target="_blank" rel="noreferrer"
               style={{ color: "#D96AA8" }}>
              :{deployment.hostPort}
            </a>
          </DeployRow>
        )}
        {deployment.startedAt && (
          <DeployRow label="Started">{new Date(deployment.startedAt).toLocaleString()}</DeployRow>
        )}
        {deployment.stoppedAt && (
          <DeployRow label="Stopped">{new Date(deployment.stoppedAt).toLocaleString()}</DeployRow>
        )}
      </div>
    </div>
  );
}

function ExecutionPanel({ title, executions }: {
  title: string;
  executions: (BuildExecution | TestExecution)[];
}) {
  const latest = executions[0];
  const [expanded, setExpanded] = useState(false);

  const statusColors: Record<string, string> = {
    PENDING:  "#95758A",
    RUNNING:  "#3b82f6",
    SUCCESS:  "#22c55e",
    FAILED:   "#ef4444",
    TIMED_OUT:"#f59e0b",
  };

  return (
    <div style={{ ...glassCard, padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
      <div style={panelHeader}>
        <span style={sectionTitle}>{title} execution</span>
        <span style={{
          background: statusColors[latest.status] ?? "#95758A",
          color: "#fff",
          borderRadius: "8px",
          padding: "0.2rem 0.65rem",
          fontSize: "0.72rem",
          fontWeight: 700,
          letterSpacing: "0.05em",
        }}>
          {latest.status}{RUNNING_EXEC.has(latest.status) ? " …" : ""}
        </span>
      </div>
      <div style={execMetaRow}>
        {latest.startedAt && (
          <span>Started: {new Date(latest.startedAt).toLocaleTimeString()}</span>
        )}
        {latest.completedAt && (
          <span>Completed: {new Date(latest.completedAt).toLocaleTimeString()}</span>
        )}
        {latest.exitCode !== null && <span>Exit: {latest.exitCode}</span>}
      </div>
      {latest.output && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{ ...btnGhost, padding: "0.3rem 0.875rem", fontSize: "0.78rem", marginTop: "0.5rem" }}
            className="rg-btn-ghost"
          >
            {expanded ? "Hide output" : "Show output"}
          </button>
          {expanded && <pre style={terminalPre}>{latest.output}</pre>}
        </>
      )}
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={metaItem}>
      <span style={metaLabel}>{label}</span>
      <span style={metaValue}>{children}</span>
    </div>
  );
}

function DeployRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={metaItem}>
      <span style={metaLabel}>{label}</span>
      <span style={{ ...metaValue, fontFamily: "ui-monospace, monospace" }}>{children}</span>
    </div>
  );
}

const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1.75rem",
};

const pipelineRow: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  minWidth: "500px",
};

const pipelineStep: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  flex: 1,
};

const pipelineItemWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  flexShrink: 0,
};

function stepLabelStyle(active: boolean, done: boolean): React.CSSProperties {
  return {
    fontSize: "0.64rem",
    fontWeight: active ? 700 : 500,
    color: active ? "#D96AA8" : done ? "#22c55e" : "#B89AAE",
    marginTop: 6,
    textAlign: "center",
    whiteSpace: "nowrap",
    letterSpacing: "0.04em",
  };
}

const failedBanner: React.CSSProperties = {
  background: "rgba(252,165,165,0.25)",
  color: "#991b1b",
  border: "1px solid rgba(248,113,113,0.40)",
  padding: "0.75rem 1rem",
  borderRadius: "12px",
  marginBottom: "1.5rem",
  fontWeight: 600,
  fontSize: "0.875rem",
};

const panelHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "0.25rem",
};

const execMetaRow: React.CSSProperties = {
  display: "flex",
  gap: "1.25rem",
  fontSize: "0.78rem",
  color: "#95758A",
  marginTop: "0.5rem",
  flexWrap: "wrap",
};
