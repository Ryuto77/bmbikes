import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiMail, FiSend } from "react-icons/fi";
import api from "../api/axios";
import Layout from "../components/Layout";
import { UICard } from "../components/ui";
import usePageTitle from "../hooks/usePageTitle";

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

function RequestPasswordReset() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  usePageTitle("Reset Password");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      await api.get("auth/status/").catch(() => {});
      const res = await api.post("auth/password-reset/", { email });
      setMessage(res.data.message || "If that email matches an active account, a reset link has been sent.");
    } catch (err) {
      setError(err.response?.data?.error || "Unable to request password reset.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div style={{ minHeight: "calc(100vh - 150px)", display: "grid", placeItems: "center", padding: "24px 0" }}>
        <UICard style={{ width: "min(460px, 100%)", padding: "28px", boxShadow: "0 22px 70px rgba(0,0,0,0.22)", position: "relative" }}>
          <button className="btn-ghost" type="button" onClick={() => navigate("/login")} title="Back to login" style={{ position: "absolute", top: "14px", left: "14px", width: "34px", height: "34px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FiArrowLeft size={14} />
          </button>
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", margin: "18px 0 18px" }}>
            <FiMail size={20} color="var(--accent)" />
          </div>
          <h1 className="bebas" style={{ fontSize: "40px", letterSpacing: "2px", lineHeight: 1, marginBottom: "8px" }}>RESET PASSWORD</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "24px" }}>Enter your account email and Best Motors will send a password reset link.</p>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
            <Field label="Account Email" required>
              <input className="input-base" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" autoFocus required />
            </Field>
            {error && <div style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</div>}
            {message && <div style={{ color: "var(--success)", fontSize: "13px" }}>{message}</div>}
            <button className="btn-accent" type="submit" disabled={submitting} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              {submitting ? "Sending..." : "Send Reset Email"}
              <FiSend size={15} />
            </button>
          </form>
        </UICard>
      </div>
    </Layout>
  );
}

export default RequestPasswordReset;
