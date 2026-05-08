import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowLeft, FiCheck, FiLock, FiLogIn } from "react-icons/fi";
import api from "../api/axios";
import Layout from "../components/Layout";
import { UICard } from "../components/ui";
import heroImage from "../assets/hero.png";
import brandLogo from "../assets/bm-logo.svg";

function Field({ label, children, required }) {
  return (
    <label style={{ display: "grid", gap: "6px" }}>
      <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}{required && <span style={{ color: "var(--accent)", marginLeft: "3px" }}>*</span>}
      </span>
      {children}
    </label>
  );
}

function resolveReturnPath(from) {
  if (typeof from === "string" && from.startsWith("/") && !from.startsWith("//")) {
    return from === "/login" ? "/" : from;
  }

  if (from && typeof from === "object") {
    const pathname = typeof from.pathname === "string" && from.pathname.startsWith("/") ? from.pathname : "/";
    const search = typeof from.search === "string" ? from.search : "";
    const hash = typeof from.hash === "string" ? from.hash : "";
    return pathname === "/login" ? "/" : `${pathname}${search}${hash}`;
  }

  return "/";
}

function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const returnPath = useMemo(() => resolveReturnPath(location.state?.from), [location.state]);
  const [form, setForm] = useState({ username: "", password: "" });
  const [resetEmail, setResetEmail] = useState("");
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    api.get("auth/status/").then((res) => {
      if (!active) return;
      if (res.data.is_authenticated) {
        navigate(returnPath, { replace: true });
      }
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, [navigate, returnPath]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.get("auth/status/").catch(() => {});
      await api.post("auth/login/", form);
      setForm({ username: "", password: "" });
      window.dispatchEvent(new Event("auth-changed"));
      navigate(returnPath, { replace: true });
    } catch (err) {
      const detail = err.response?.data?.error || err.response?.data?.detail;
      setError(detail || `Login failed${err.response?.status ? ` (${err.response.status})` : ""}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetRequest = async (event) => {
    event.preventDefault();
    setResetError("");
    setResetMessage("");
    setResetSubmitting(true);
    try {
      await api.get("auth/status/").catch(() => {});
      const res = await api.post("auth/password-reset/", { email: resetEmail });
      setResetMessage(res.data.message || "If that email matches an active account, a reset link has been sent.");
    } catch (err) {
      setResetError(err.response?.data?.error || "Unable to request password reset.");
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <Layout>
      <div
        style={{
          minHeight: "calc(100vh - 150px)",
          display: "grid",
          alignItems: "center",
          padding: "24px 0",
        }}
      >
        <div className="login-page-grid" style={{ display: "grid", gridTemplateColumns: "minmax(320px, 0.95fr) minmax(0, 1.05fr)", gap: "18px", alignItems: "stretch" }}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <UICard style={{ height: "100%", minHeight: "430px", padding: "34px 28px 28px", display: "flex", flexDirection: "column", justifyContent: "center", boxShadow: "0 22px 70px rgba(0,0,0,0.22)", position: "relative" }}>
              <button className="btn-ghost" type="button" onClick={() => navigate(returnPath, { replace: true })} title="Back" style={{ position: "absolute", top: "14px", left: "14px", width: "34px", height: "34px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FiArrowLeft size={14} />
              </button>
              <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 0 18px 46px" }}>
                <FiLock size={20} color="var(--accent)" />
              </div>
              <h1 className="bebas" style={{ fontSize: "40px", letterSpacing: "2px", lineHeight: 1, marginBottom: "8px" }}>LOGIN</h1>
              <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "24px" }}>Sign in to continue, then return to the page you came from.</p>

              <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
                  <Field label="Login" required>
                    <input className="input-base" placeholder="Enter your username or email" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} autoComplete="username" autoFocus required />
                  </Field>
                  <Field label="Password" required>
                    <input className="input-base" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="current-password" required />
                  </Field>
                  {error && <div style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</div>}
                  <button className="btn-accent" type="submit" disabled={submitting} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    {submitting ? "Signing in..." : "Login"}
                    {submitting ? <FiLogIn size={14} /> : <FiCheck size={15} />}
                  </button>
              </form>
              <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
                <button className="btn-ghost" type="button" onClick={() => setResetOpen(!resetOpen)} style={{ padding: "8px 10px", fontSize: "13px" }}>
                  Forgot password?
                </button>
                {resetOpen && (
                  <form onSubmit={handleResetRequest} style={{ display: "grid", gap: "10px", padding: "12px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--surface2)" }}>
                    <Field label="Account Email" required>
                      <input className="input-base" type="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} autoComplete="email" required />
                    </Field>
                    {resetError && <div style={{ color: "var(--danger)", fontSize: "13px" }}>{resetError}</div>}
                    {resetMessage && <div style={{ color: "var(--success)", fontSize: "13px" }}>{resetMessage}</div>}
                    <button className="btn-accent" type="submit" disabled={resetSubmitting} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      {resetSubmitting ? "Sending..." : "Send Reset Email"}
                    </button>
                  </form>
                )}
              </div>
            </UICard>
          </motion.div>

          <UICard style={{ minHeight: "430px", overflow: "hidden", position: "relative", display: "flex", alignItems: "end", background: "var(--surface2)" }}>
            <img src={heroImage} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.72))" }} />
            <div style={{ position: "relative", padding: "28px", color: "#fff", width: "100%" }}>
              <img src={brandLogo} alt="" style={{ width: "78px", height: "48px", objectFit: "contain", marginBottom: "14px" }} />
              <div className="brand-wordmark brand-wordmark-hero" aria-label="Best Motors">
                <span className="brand-best">BEST</span>
                <span className="brand-motors">MOTORS</span>
              </div>
              <div style={{ marginTop: "8px", color: "rgba(255,255,255,0.8)", fontSize: "14px" }}>Vehicle stock, finance, and records in one workspace.</div>
            </div>
          </UICard>
        </div>
      </div>
    </Layout>
  );
}

export default Login;
