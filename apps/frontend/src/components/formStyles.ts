import type { CSSProperties } from "react";

export const formStyles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    background: "#f5f5f5",
  } as CSSProperties,

  card: {
    background: "#fff",
    borderRadius: "8px",
    padding: "2.5rem",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 2px 16px rgba(0,0,0,0.1)",
  } as CSSProperties,

  logo: {
    margin: "0 0 0.25rem",
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#0f3460",
  } as CSSProperties,

  heading: {
    margin: "0 0 1.5rem",
    fontSize: "1.25rem",
    fontWeight: 600,
    color: "#333",
  } as CSSProperties,

  field: {
    marginBottom: "1rem",
  } as CSSProperties,

  label: {
    display: "block",
    marginBottom: "0.35rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#555",
  } as CSSProperties,

  input: {
    width: "100%",
    padding: "0.5rem 0.75rem",
    fontSize: "1rem",
    border: "1px solid #ddd",
    borderRadius: "6px",
    boxSizing: "border-box" as const,
    outline: "none",
  } as CSSProperties,

  textarea: {
    width: "100%",
    padding: "0.5rem 0.75rem",
    fontSize: "1rem",
    border: "1px solid #ddd",
    borderRadius: "6px",
    boxSizing: "border-box" as const,
    resize: "vertical" as const,
    minHeight: "80px",
  } as CSSProperties,

  error: {
    color: "#c0392b",
    fontSize: "0.875rem",
    marginBottom: "0.75rem",
  } as CSSProperties,

  button: {
    width: "100%",
    padding: "0.65rem",
    background: "#0f3460",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "0.5rem",
  } as CSSProperties,

  hint: {
    marginTop: "1rem",
    textAlign: "center" as const,
    fontSize: "0.875rem",
    color: "#666",
  } as CSSProperties,
};
