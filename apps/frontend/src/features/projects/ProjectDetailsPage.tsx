import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { projectsApi, releasesApi, type Project, type Release } from "../../lib/api";
import { Layout } from "../../components/Layout";
import {
  btnDanger,
  linkBtnPrimary,
  pageTitle,
  sectionTitle,
  mutedText,
  errorText,
  backLink,
  metaGrid,
  metaItem,
  metaLabel,
  metaValue,
  tableWrap,
  tableStyle,
  thStyle,
  tdStyle,
  sectionRow,
  releaseBadgeStyle,
} from "../../design/tokens";

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
      .then(([p, r]) => { setProject(p); setReleases(r); })
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

  if (loading) return <Layout><p style={mutedText}>Loading…</p></Layout>;
  if (error)   return <Layout><p style={errorText}>{error}</p></Layout>;
  if (!project) return <Layout><p style={mutedText}>Project not found.</p></Layout>;

  return (
    <Layout>
      <Link to="/projects" style={backLink}>← Projects</Link>

      <div style={headerRow}>
        <h1 style={pageTitle}>{project.name}</h1>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          {project.status === "ACTIVE" && (
            <button
              onClick={handleArchive}
              disabled={archiving}
              style={btnDanger}
              className="rg-btn-ghost"
            >
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

      <div style={sectionRow}>
        <h2 style={sectionTitle}>Releases</h2>
        {project.status === "ACTIVE" && (
          <Link
            to={`/projects/${project.id}/releases/new`}
            style={linkBtnPrimary}
            className="rg-btn-primary"
          >
            + New release
          </Link>
        )}
      </div>

      {releases.length === 0 ? (
        <p style={mutedText}>No releases yet.</p>
      ) : (
        <div style={tableWrap}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Version", "Status", "Commit", "Created"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {releases.map((r) => (
                <tr
                  key={r.id}
                  className="rg-tr-hover"
                  onClick={() => navigate(`/projects/${id}/releases/${r.id}`)}
                >
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{r.version}</td>
                  <td style={tdStyle}>
                    <span style={releaseBadgeStyle(r.status)}>{r.status}</span>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: "ui-monospace, monospace", fontSize: "0.8rem" }}>
                    {r.commitHash ? r.commitHash.slice(0, 7) : "—"}
                  </td>
                  <td style={{ ...tdStyle, color: "#95758A", fontSize: "0.8rem" }}>
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
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

const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "1.5rem",
};
