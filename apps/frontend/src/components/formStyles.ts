import type { CSSProperties } from "react";

export const formStyles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1.5rem",
  } as CSSProperties,

  card: {
    background: "rgba(255, 255, 255, 0.62)",
    backdropFilter: "blur(28px)",
    WebkitBackdropFilter: "blur(28px)",
    border: "1px solid rgba(255, 255, 255, 0.84)",
    boxShadow: "0 16px 56px rgba(190, 100, 150, 0.16)",
    borderRadius: "24px",
    padding: "2.75rem",
    width: "100%",
    maxWidth: "420px",
  } as CSSProperties,

  logo: {
    margin: "0 0 0.2rem",
    fontSize: "1.55rem",
    fontWeight: 800,
    color: "#D96AA8",
    letterSpacing: "-0.025em",
  } as CSSProperties,

  heading: {
    margin: "0 0 1.75rem",
    fontSize: "0.95rem",
    fontWeight: 500,
    color: "#95758A",
  } as CSSProperties,

  field: { marginBottom: "1.1rem" } as CSSProperties,

  label: {
    display: "block",
    marginBottom: "0.4rem",
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "#95758A",
    textTransform: "uppercase",
    letterSpacing: "0.055em",
  } as CSSProperties,

  input: {
    width: "100%",
    padding: "0.65rem 0.9rem",
    fontSize: "0.95rem",
    background: "rgba(255, 255, 255, 0.65)",
    border: "1px solid rgba(242, 197, 220, 0.82)",
    borderRadius: "12px",
    color: "#45283E",
    boxSizing: "border-box" as const,
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    fontFamily: "inherit",
  } as CSSProperties,

  textarea: {
    width: "100%",
    padding: "0.65rem 0.9rem",
    fontSize: "0.95rem",
    background: "rgba(255, 255, 255, 0.65)",
    border: "1px solid rgba(242, 197, 220, 0.82)",
    borderRadius: "12px",
    color: "#45283E",
    boxSizing: "border-box" as const,
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    resize: "vertical" as const,
    minHeight: "90px",
    fontFamily: "inherit",
  } as CSSProperties,

  error: {
    color: "#c0394e",
    fontSize: "0.85rem",
    marginBottom: "0.875rem",
    padding: "0.55rem 0.8rem",
    background: "rgba(239, 68, 68, 0.09)",
    borderRadius: "10px",
    border: "1px solid rgba(239, 68, 68, 0.22)",
  } as CSSProperties,

  button: {
    width: "100%",
    padding: "0.72rem",
    background: "linear-gradient(135deg, #EC8FC3 0%, #D96AA8 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "14px",
    fontSize: "0.95rem",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "0.5rem",
    boxShadow: "0 4px 16px rgba(216, 100, 160, 0.34)",
    letterSpacing: "0.01em",
    fontFamily: "inherit",
  } as CSSProperties,

  hint: {
    marginTop: "1.25rem",
    textAlign: "center" as const,
    fontSize: "0.85rem",
    color: "#95758A",
  } as CSSProperties,
};
