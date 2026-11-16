import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dashboardApi, type DashboardData } from "../../lib/api";
import { Layout } from "../../components/Layout";
import {
  glassCard,
  pageTitle,
  sectionTitle,
  mutedText,
  errorText,
  releaseBadgeStyle,
  severityBadgeStyle,
} from "../../design/tokens";
import type { CSSProperties } from "react";

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardApi.get()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><p style={mutedText}>Loading dashboard…</p></Layout>;
  if (error) return <Layout><p style={errorText}>{error}</p></Layout>;
  if (!data) return <Layout><p style={mutedText}>No data.</p></Layout>;

  const { summary, recentProjects, recentReleases, recentIncidents } = data;

  return (
    <Layout>
      <h1 style={{ ...pageTitle, marginBottom: "1.75rem" }}>Dashboard</h1>

      {/* Summary cards */}
      <div style={summaryGrid}>
        <SummaryCard label="Projects" value={summary.projects.total} sub={`${summary.projects.active} active`} color="#D96AA8" />
        <SummaryCard label="Releases" value={summary.releases.total} sub={`${summary.releases.success} succeeded`} color="#22c55e" />
        <SummaryCard label="Running" value={summary.deployments.running} sub="deployments" color="#3b82f6" />
        <SummaryCard label="Failed" value={summary.releases.failed} sub="releases" color="#ef4444" />
        <SummaryCard label="Open Incidents" value={summary.incidents.open} sub={`${summary.incidents.resolved} resolved`} color="#f59e0b" />
        <SummaryCard label="Pending Approvals" value={summary.approvals.pending} sub="awaiting review" color="#8b5cf6" />
        <SummaryCard label="Recoveries" value={summary.recovery.completed} sub={`of ${summary.recovery.total} total`} color="#06b6d4" />
        <SummaryCard label="Active" value={summary.releases.active} sub="in pipeline" color="#ec4899" />
      </div>

      <div style={twoCol}>
        {/* Recent Projects */}
        <section>
          <div style={sectionHeader}>
            <h2 style={{ ...sectionTitle, margin: 0 }}>Projects</h2>
            <Link to="/projects" style={viewAll}>View all →</Link>
          </div>
          {recentProjects.length === 0 ? (
            <p style={mutedText}>No projects yet.</p>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {recentProjects.map((p) => (
                <Link key={p.id} to={`/projects/${p.id}`} style={projectCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, color: "#45283E", fontSize: "0.875rem" }}>{p.name}</span>
                    {p.latestReleaseStatus && (
                      <span style={releaseBadgeStyle(p.latestReleaseStatus)}>{p.latestReleaseStatus}</span>
                    )}
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "#B89AAE" }}>
                    Created {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent Incidents */}
        <section>
          <div style={sectionHeader}>
            <h2 style={{ ...sectionTitle, margin: 0 }}>Open Incidents</h2>
          </div>
          {recentIncidents.length === 0 ? (
            <div style={{ ...glassCard, padding: "1.25rem" }}>
              <p style={{ ...mutedText, margin: 0 }}>✓ No open incidents.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {recentIncidents.map((inc) => (
                <div key={inc.id} style={{ ...glassCard, padding: "1rem 1.25rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.4rem" }}>
                    <span style={severityBadgeStyle(inc.severity)}>{inc.severity}</span>
                    <span style={{ fontSize: "0.72rem", color: "#95758A" }}>{inc.type.replace(/_/g, " ")}</span>
                  </div>
                  <p style={{ fontSize: "0.82rem", color: "#6b4f65", margin: "0 0 0.3rem", lineHeight: 1.4 }}>
                    {inc.description}
                  </p>
                  <span style={{ fontSize: "0.7rem", color: "#B89AAE" }}>
                    {new Date(inc.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent Releases */}
      <section style={{ marginTop: "2rem" }}>
        <div style={sectionHeader}>
          <h2 style={{ ...sectionTitle, margin: 0 }}>Recent Releases</h2>
        </div>
        {recentReleases.length === 0 ? (
          <p style={mutedText}>No releases yet.</p>
        ) : (
          <div style={{ ...glassCard, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr>
                  {["Project", "Version", "Status", "Date"].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentReleases.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid rgba(242,197,220,0.28)" }}>
                    <td style={td}>{r.projectName}</td>
                    <td style={{ ...td, fontFamily: "ui-monospace, monospace", fontWeight: 600 }}>{r.version}</td>
                    <td style={td}><span style={releaseBadgeStyle(r.status)}>{r.status}</span></td>
                    <td style={{ ...td, color: "#95758A", fontSize: "0.78rem" }}>
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Layout>
  );
}

function SummaryCard({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  return (
    <div style={{ ...glassCard, padding: "1.25rem 1.5rem" }}>
      <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "#95758A", textTransform: "uppercase", letterSpacing: "0.055em", margin: "0 0 0.5rem" }}>{label}</p>
      <p style={{ fontSize: "2rem", fontWeight: 800, color, margin: "0 0 0.25rem", lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: "0.72rem", color: "#B89AAE", margin: 0 }}>{sub}</p>
    </div>
  );
}

const summaryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
  gap: "1rem",
  marginBottom: "2rem",
};

const twoCol: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "2rem",
};

const sectionHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1rem",
};

const viewAll: CSSProperties = {
  fontSize: "0.78rem",
  color: "#D96AA8",
  textDecoration: "none",
  fontWeight: 500,
};

const projectCard: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  textDecoration: "none",
  background: "rgba(255,255,255,0.50)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "1px solid rgba(255,255,255,0.68)",
  boxShadow: "0 4px 16px rgba(190,100,150,0.08)",
  borderRadius: "12px",
  padding: "0.875rem 1rem",
};

const th: CSSProperties = {
  padding: "0.75rem 1rem",
  textAlign: "left",
  fontSize: "0.7rem",
  fontWeight: 700,
  color: "#95758A",
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  borderBottom: "1px solid rgba(242,197,220,0.50)",
  background: "rgba(255,255,255,0.30)",
};

const td: CSSProperties = {
  padding: "0.75rem 1rem",
  color: "#45283E",
};
