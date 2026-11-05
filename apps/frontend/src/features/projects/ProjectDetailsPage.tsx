import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { projectsApi, releasesApi, type Project, type Release } from "../../lib/api";
import { Layout } from "../../components/Layout";

export function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([projectsApi.get(id), releasesApi.list(id)])
      .then(([p, r]) => {
        setProject(p);
        setReleases(r);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleArchive() {
    if (!project) return;
    setArchiving(true);
    try {
      const updated = await projectsApi.archive(project.id);
      setProject(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setArchiving(false);
    }
  }

  if (loading) return <Layout><p>Loading…</p></Layout>;
  if (error) return <Layout><p style={{ color: "#c0392b" }}>{error}</p></Layout>;
  if (!project) return <Layout><p>Project not found.</p></Layout>;

  return (
    <Layout>
      <div style={rowStyle}>
        <div>
          <Link to="/projects" style={backStyle}>← Projects</Link>
          <h1 style={titleStyle}>{project.name}</h1>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          {project.status === "ACTIVE" && (
            <button onClick={handleArchive} disabled={archiving} style={archiveBtn}>
              {archiving ? "Archiving…" : "Archive"}
            </button>
          )}
        </div>
      </div>

      <div style={metaGrid}>
        <MetaField label="Status">{project.status}</MetaField>
        <MetaField label="Repository">{project.repositoryUrl}</MetaField>
        <MetaField label="Build">{project.buildCommand}</MetaField>
        <MetaField label="Test">{project.testCommand}</MetaField>
        <MetaField label="Dockerfile">{project.dockerfilePath}</MetaField>
        <MetaField label="Health check">{project.healthCheckPath}</MetaField>
        {project.description && (
          <MetaField label="Description">{project.description}</MetaField>
        )}
      </div>

      <div style={sectionHeader}>
        <h2 style={sectionTitle}>Releases</h2>
        {project.status === "ACTIVE" && (
          <Link to={`/projects/${project.id}/releases/new`} style={btnStyle}>
            + New release
          </Link>
        )}
      </div>

      {releases.length === 0 ? (
        <p style={{ color: "#888" }}>No releases yet.</p>
      ) : (
        <div style={tableContainer}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th>Version</Th>
                <Th>Status</Th>
                <Th>Commit</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {releases.map((r) => (
                <tr
                  key={r.id}
                  style={trStyle}
                  onClick={() => navigate(`/projects/${id}/releases/${r.id}`)}
                >
                  <Td>{r.version}</Td>
                  <Td><span style={releaseBadge(r.status)}>{r.status}</span></Td>
                  <Td>{r.commitHash ? r.commitHash.slice(0, 7) : "—"}</Td>
                  <Td>{new Date(r.createdAt).toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={metaItem}>
      <span style={metaLabel}>{label}</span>
      <span style={metaValue}>{children}</span>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={thStyle}>{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={tdStyle}>{children}</td>;
}

const rowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" };
const backStyle: React.CSSProperties = { color: "#888", fontSize: "0.875rem", textDecoration: "none", display: "block", marginBottom: "0.25rem" };
const titleStyle: React.CSSProperties = { margin: 0 };
const archiveBtn: React.CSSProperties = { background: "none", border: "1px solid #ddd", borderRadius: "6px", padding: "0.4rem 1rem", cursor: "pointer", fontSize: "0.875rem" };
const metaGrid: React.CSSProperties = { background: "#fff", border: "1px solid #e5e5e5", borderRadius: "8px", padding: "1.25rem", marginBottom: "2rem", display: "grid", gap: "0.75rem" };
const metaItem: React.CSSProperties = { display: "flex", gap: "1rem", alignItems: "baseline" };
const metaLabel: React.CSSProperties = { fontSize: "0.8rem", fontWeight: 600, color: "#888", width: "100px", flexShrink: 0 };
const metaValue: React.CSSProperties = { fontSize: "0.9rem", wordBreak: "break-all" };
const sectionHeader: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" };
const sectionTitle: React.CSSProperties = { margin: 0 };
const btnStyle: React.CSSProperties = { background: "#0f3460", color: "#fff", padding: "0.45rem 1rem", borderRadius: "6px", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 };
const tableContainer: React.CSSProperties = { overflowX: "auto" };
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #e5e5e5", borderRadius: "8px" };
const thStyle: React.CSSProperties = { padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.8rem", fontWeight: 600, color: "#888", borderBottom: "1px solid #e5e5e5" };
const tdStyle: React.CSSProperties = { padding: "0.75rem 1rem", fontSize: "0.875rem", borderBottom: "1px solid #f3f4f6" };
const trStyle: React.CSSProperties = { cursor: "pointer" };

function releaseBadge(status: string): React.CSSProperties {
  const colors: Record<string, [string, string]> = {
    CREATED: ["#eff6ff", "#1d4ed8"],
    BUILDING: ["#fef3c7", "#92400e"],
    TESTING: ["#f0fdf4", "#166534"],
    DEPLOYING: ["#faf5ff", "#6b21a8"],
    MONITORING: ["#ecfeff", "#164e63"],
    SUCCESS: ["#d1fae5", "#065f46"],
    FAILED: ["#fee2e2", "#991b1b"],
    ROLLED_BACK: ["#f3f4f6", "#374151"],
  };
  const [bg, color] = colors[status] ?? ["#f3f4f6", "#374151"];
  return { fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: "12px", background: bg, color, fontWeight: 600 };
}
