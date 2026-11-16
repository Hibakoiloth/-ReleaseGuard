import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  monitoringApi,
  incidentsApi,
  deploymentsApi,
  type MonitoringRecord,
  type MonitoringStatus,
  type Incident,
  type Deployment,
} from "../../lib/api";
import { Layout } from "../../components/Layout";
import {
  glassCard,
  pageTitle,
  sectionTitle,
  mutedText,
  errorText,
  backLink,
  metaItem,
  metaLabel,
  metaValue,
  tableStyle,
  thStyle,
  tdStyle,
  severityBadgeStyle,
  deployBadgeStyle,
} from "../../design/tokens";

const INTERVAL_OPTIONS = [
  { label: "5s",   value: 5_000 },
  { label: "10s",  value: 10_000 },
  { label: "30s",  value: 30_000 },
  { label: "1min", value: 60_000 },
  { label: "5min", value: 300_000 },
];

export function MonitoringDashboard() {
  const { id: projectId, releaseId, deploymentId } = useParams<{
    id: string;
    releaseId: string;
    deploymentId: string;
  }>();

  const [deployment, setDeployment]         = useState<Deployment | null>(null);
  const [records, setRecords]               = useState<MonitoringRecord[]>([]);
  const [incidents, setIncidents]           = useState<Incident[]>([]);
  const [monStatus, setMonStatus]           = useState<MonitoringStatus | null>(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [controlBusy, setControlBusy]       = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchAll() {
    if (!projectId || !releaseId || !deploymentId) return;
    const [deps, recs, incs, status] = await Promise.all([
      deploymentsApi.list(projectId, releaseId),
      monitoringApi.list(projectId, releaseId, deploymentId, 20),
      incidentsApi.list(projectId, releaseId, deploymentId),
      monitoringApi.getStatus(projectId, releaseId, deploymentId),
    ]);
    setDeployment(deps.find((d) => d.id === deploymentId) ?? null);
    setRecords(recs);
    setIncidents(incs);
    setMonStatus(status);
  }

  function startPoll(intervalMs: number) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchAll().catch(() => {}), intervalMs);
  }

  useEffect(() => {
    if (!projectId || !releaseId || !deploymentId) return;
    fetchAll()
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    startPoll(5_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [projectId, releaseId, deploymentId]);

  async function handlePauseResume() {
    if (!projectId || !releaseId || !deploymentId || controlBusy) return;
    setControlBusy(true);
    try {
      const next = monStatus?.paused
        ? await monitoringApi.resume(projectId, releaseId, deploymentId)
        : await monitoringApi.pause(projectId, releaseId, deploymentId);
      setMonStatus(next);
      if (next.paused) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
      } else {
        startPoll(next.intervalMs);
      }
    } finally {
      setControlBusy(false);
    }
  }

  async function handleIntervalChange(intervalMs: number) {
    if (!projectId || !releaseId || !deploymentId || controlBusy) return;
    setControlBusy(true);
    try {
      const next = await monitoringApi.setInterval(projectId, releaseId, deploymentId, intervalMs);
      setMonStatus(next);
      if (!next.paused) startPoll(intervalMs);
    } finally {
      setControlBusy(false);
    }
  }

  if (loading) return <Layout><p style={mutedText}>Loading…</p></Layout>;
  if (error)   return <Layout><p style={errorText}>{error}</p></Layout>;

  const latest    = records[0];
  const isHealthy = latest?.status === "HEALTHY";
  const openIncidents = incidents.filter((i) => i.status === "OPEN");
  const maxTime = Math.max(1, ...records.map((r) => r.responseTimeMs ?? 0));
  const isPaused = monStatus?.paused ?? false;

  return (
    <Layout>
      <Link to={`/projects/${projectId}/releases/${releaseId}`} style={backLink}>
        ← Back to release
      </Link>

      <div style={headerRow}>
        <h1 style={pageTitle}>Monitoring</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {/* Interval selector */}
          {monStatus && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#B89AAE", fontWeight: 600 }}>Check every</span>
              <select
                value={monStatus.intervalMs}
                disabled={controlBusy || isPaused}
                onChange={(e) => handleIntervalChange(Number(e.target.value))}
                style={{
                  background: "rgba(255,255,255,0.18)",
                  border: "1px solid rgba(242,197,220,0.5)",
                  borderRadius: "8px",
                  color: "#45283E",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  padding: "0.3rem 0.55rem",
                  cursor: isPaused ? "not-allowed" : "pointer",
                  opacity: isPaused ? 0.5 : 1,
                }}
              >
                {INTERVAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Pause / Resume */}
          {monStatus && (
            <button
              onClick={handlePauseResume}
              disabled={controlBusy || !monStatus.active}
              style={{
                background: isPaused
                  ? "linear-gradient(135deg, #22c55e, #16a34a)"
                  : "rgba(255,255,255,0.22)",
                border: isPaused
                  ? "none"
                  : "1px solid rgba(242,197,220,0.55)",
                borderRadius: "8px",
                color: isPaused ? "#fff" : "#45283E",
                fontWeight: 700,
                fontSize: "0.78rem",
                padding: "0.35rem 0.9rem",
                cursor: controlBusy || !monStatus.active ? "not-allowed" : "pointer",
                opacity: controlBusy ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              {isPaused ? "▶ Resume" : "⏸ Pause"}
            </button>
          )}

          {/* Health badge */}
          {latest && (
            <span
              style={{
                color: "#fff",
                background: isPaused
                  ? "linear-gradient(135deg, #9ca3af, #6b7280)"
                  : isHealthy
                    ? "linear-gradient(135deg, #22c55e, #16a34a)"
                    : "linear-gradient(135deg, #ef4444, #dc2626)",
                borderRadius: "20px",
                padding: "0.4rem 1.1rem",
                fontSize: "0.82rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                boxShadow: isPaused
                  ? "none"
                  : isHealthy
                    ? "0 4px 14px rgba(34,197,94,0.35)"
                    : "0 4px 14px rgba(239,68,68,0.35)",
              }}
            >
              {isPaused ? "⏸ PAUSED" : isHealthy ? "● HEALTHY" : "● UNHEALTHY"}
            </span>
          )}
        </div>
      </div>

      {isPaused && (
        <div style={{
          background: "rgba(255,237,213,0.55)",
          border: "1px solid rgba(251,146,60,0.4)",
          borderRadius: "10px",
          padding: "0.75rem 1.25rem",
          marginBottom: "1.25rem",
          fontSize: "0.85rem",
          color: "#9a3412",
          fontWeight: 500,
        }}>
          Monitoring is paused. Health checks are not running. Click <strong>Resume</strong> to restart.
        </div>
      )}

      {/* Container info */}
      {deployment && (
        <div style={{ ...glassCard, padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ ...sectionTitle, marginBottom: "0.875rem" }}>Container</h2>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <InfoRow label="Status">
              <span style={deployBadgeStyle(deployment.status)}>{deployment.status}</span>
            </InfoRow>
            <InfoRow label="Image">{deployment.imageTag}</InfoRow>
            {deployment.containerId && (
              <InfoRow label="Container ID">
                <span style={{ fontFamily: "monospace" }}>{deployment.containerId.slice(0, 12)}</span>
              </InfoRow>
            )}
            {deployment.hostPort && (
              <InfoRow label="Port">
                <span style={{ fontFamily: "monospace" }}>:{deployment.hostPort}</span>
              </InfoRow>
            )}
          </div>
        </div>
      )}

      {/* Response time chart */}
      {records.length > 0 && (
        <div style={{ ...glassCard, padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ ...sectionTitle, marginBottom: "1rem" }}>
            Response time — last {records.length} checks
          </h2>
          <div style={chartContainer}>
            {[...records].reverse().map((r) => {
              const height = r.responseTimeMs
                ? Math.max(5, (r.responseTimeMs / maxTime) * 80)
                : 5;
              const healthy = r.status === "HEALTHY";
              return (
                <div
                  key={r.id}
                  title={`${r.responseTimeMs ?? 0}ms — ${new Date(r.recordedAt).toLocaleTimeString()}`}
                  style={{
                    flex: "1 1 0",
                    minWidth: "4px",
                    maxWidth: "20px",
                    height: `${height}px`,
                    background: healthy
                      ? "linear-gradient(180deg, #EC8FC3, #D96AA8)"
                      : "linear-gradient(180deg, #fca5a5, #ef4444)",
                    borderRadius: "3px 3px 0 0",
                    transition: "height 0.25s",
                    opacity: healthy ? 1 : 0.85,
                  }}
                />
              );
            })}
          </div>
          {latest?.responseTimeMs !== null && (
            <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#95758A" }}>
              Latest: <strong style={{ color: "#D96AA8" }}>{latest.responseTimeMs}ms</strong>
            </p>
          )}
        </div>
      )}

      {/* Check history */}
      <div style={{ ...glassCard, padding: 0, overflow: "hidden", marginBottom: "1.5rem" }}>
        <div style={{ padding: "1.25rem 1.5rem 0.75rem" }}>
          <h2 style={sectionTitle}>Check history</h2>
        </div>
        {records.length === 0 ? (
          <p style={{ ...mutedText, padding: "0 1.5rem 1.25rem" }}>No checks yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {["Time", "Status", "Response (ms)", "Error"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr
                    key={r.id}
                    style={r.status === "UNHEALTHY" ? { background: "rgba(252,165,165,0.10)" } : {}}
                  >
                    <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "0.8rem" }}>
                      {new Date(r.recordedAt).toLocaleTimeString()}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        color: r.status === "HEALTHY" ? "#22c55e" : "#ef4444",
                        letterSpacing: "0.04em",
                      }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "0.8rem" }}>
                      {r.responseTimeMs ?? "—"}
                    </td>
                    <td style={{ ...tdStyle, fontSize: "0.8rem", color: "#95758A" }}>
                      {r.errorMessage ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Incidents */}
      <div style={{ ...glassCard, padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <h2 style={sectionTitle}>Incidents</h2>
          {openIncidents.length > 0 && (
            <span style={{
              background: "rgba(252,165,165,0.40)",
              color: "#991b1b",
              border: "1px solid rgba(248,113,113,0.45)",
              borderRadius: "20px",
              padding: "0.15rem 0.6rem",
              fontSize: "0.7rem",
              fontWeight: 700,
            }}>
              {openIncidents.length} open
            </span>
          )}
        </div>
        {incidents.length === 0 ? (
          <p style={mutedText}>No incidents.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.875rem" }}>
            {incidents.map((inc) => {
              const isOpen = inc.status === "OPEN";
              const incidentPath = `/projects/${projectId}/releases/${releaseId}/deployments/${deploymentId}/incidents/${inc.id}`;
              return (
                <div
                  key={inc.id}
                  style={{
                    background: isOpen
                      ? "rgba(252,228,241,0.55)"
                      : "rgba(255,255,255,0.30)",
                    border: `1px solid ${isOpen ? "rgba(248,113,113,0.35)" : "rgba(242,197,220,0.40)"}`,
                    borderRadius: "12px",
                    padding: "1rem 1.25rem",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "#45283E" }}>
                      {inc.type.replace(/_/g, " ")}
                    </span>
                    <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                      <span style={severityBadgeStyle(inc.severity)}>{inc.severity}</span>
                      <span style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        padding: "0.22rem 0.65rem",
                        borderRadius: "20px",
                        letterSpacing: "0.05em",
                        background: isOpen ? "rgba(252,165,165,0.42)" : "rgba(134,239,172,0.42)",
                        color: isOpen ? "#991b1b" : "#166534",
                        border: `1px solid ${isOpen ? "rgba(248,113,113,0.45)" : "rgba(74,222,128,0.45)"}`,
                      }}>
                        {inc.status}
                      </span>
                    </div>
                  </div>
                  <p style={{ margin: "0.5rem 0 0.3rem", fontSize: "0.875rem", color: "#6b4f65", lineHeight: 1.5 }}>
                    {inc.description}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                    <p style={{ fontSize: "0.75rem", color: "#B89AAE", margin: 0 }}>
                      {new Date(inc.createdAt).toLocaleString()}
                    </p>
                    <Link
                      to={incidentPath}
                      style={{
                        fontSize: "0.75rem",
                        color: "#D96AA8",
                        textDecoration: "none",
                        border: "1px solid rgba(242,197,220,0.7)",
                        borderRadius: "6px",
                        padding: "0.2rem 0.6rem",
                        fontWeight: 600,
                      }}
                    >
                      View analysis →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={metaItem}>
      <span style={metaLabel}>{label}</span>
      <span style={metaValue}>{children}</span>
    </div>
  );
}

const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1.75rem",
  flexWrap: "wrap",
  gap: "0.75rem",
};

const chartContainer: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: "3px",
  height: "90px",
};
