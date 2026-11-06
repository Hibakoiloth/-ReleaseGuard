import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { saveAuth } from "./AuthProvider";
import { formStyles as s } from "../../components/formStyles";

export function SignupPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? "Sign up failed");
      saveAuth(body.token, body.userId, body.username);
      navigate("/projects");
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <main style={s.page}>
      <div style={s.card}>
        <h1 style={s.logo}>ReleaseGuard</h1>
        <p style={s.heading}>Create your account</p>
        <form onSubmit={handleSubmit}>
          <div style={s.field}>
            <label style={s.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              style={s.input}
              className="rg-input"
              autoComplete="username"
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={s.input}
              className="rg-input"
              autoComplete="new-password"
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              style={s.input}
              className="rg-input"
              autoComplete="new-password"
            />
          </div>
          {error && <p style={s.error}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={s.button}
            className="rg-btn-primary"
          >
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>
        <p style={s.hint}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#D96AA8", fontWeight: 700 }}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
