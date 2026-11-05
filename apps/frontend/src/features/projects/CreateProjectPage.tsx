import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { projectsApi } from "../../lib/api";
import { Layout } from "../../components/Layout";
import { formStyles as s } from "../../components/formStyles";

const DEFAULTS = {
  name: "",
  description: "",
  repositoryUrl: "",
  buildCommand: "npm run build",
  testCommand: "npm test",
  dockerfilePath: "Dockerfile",
  healthCheckPath: "/health",
};

export function CreateProjectPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(DEFAULTS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof DEFAULTS, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const project = await projectsApi.create({
        ...form,
        description: form.description || null,
      });
      navigate(`/projects/${project.id}`);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  const field = (
    label: string,
    key: keyof typeof DEFAULTS,
    type = "text",
    placeholder = ""
  ) => (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        style={s.input}
      />
    </div>
  );

  return (
    <Layout>
      <div style={{ maxWidth: "640px" }}>
        <h1 style={{ marginBottom: "1.5rem" }}>New project</h1>
        <div style={formCard}>
          <form onSubmit={handleSubmit}>
            {field("Project name *", "name")}
            <div style={s.field}>
              <label style={s.label}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                style={s.textarea}
              />
            </div>
            {field("Repository URL *", "repositoryUrl", "url", "https://github.com/org/repo")}
            {field("Build command *", "buildCommand", "text", "npm run build")}
            {field("Test command *", "testCommand", "text", "npm test")}
            {field("Dockerfile path *", "dockerfilePath", "text", "Dockerfile")}
            {field("Health check path *", "healthCheckPath", "text", "/health")}
            {error && <p style={s.error}>{error}</p>}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button type="submit" disabled={loading} style={{ ...s.button, width: "auto", padding: "0.6rem 1.5rem" }}>
                {loading ? "Creating…" : "Create project"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/projects")}
                style={cancelStyle}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

const formCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e5e5",
  borderRadius: "8px",
  padding: "1.75rem",
};

const cancelStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid #ddd",
  borderRadius: "6px",
  padding: "0.6rem 1.25rem",
  cursor: "pointer",
  fontSize: "1rem",
};
