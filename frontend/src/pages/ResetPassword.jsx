import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiLock } from "react-icons/fi";
import api from "../api/axios";
import Layout from "../components/Layout";
import { UICard } from "../components/ui";
import usePageTitle from "../hooks/usePageTitle";

function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  usePageTitle("Reset Password");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await api.get("auth/status/").catch(() => {});
      await api.post("auth/password-reset/confirm/", { uid, token, password: form.password });
      navigate("/reset-password/success", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Unable to reset password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div style={{ minHeight: "calc(100vh - 150px)", display: "grid", placeItems: "center", padding: "24px 0" }}>
        <UICard style={{ width: "min(460px, 100%)", padding: "28px", boxShadow: "0 22px 70px rgba(0,0,0,0.22)" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "18px" }}>
            <FiLock size={20} color="var(--accent)" />
          </div>
          <h1 className="bebas" style={{ fontSize: "40px", letterSpacing: "2px", lineHeight: 1, marginBottom: "8px" }}>RESET PASSWORD</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "24px" }}>Set a new password for your account.</p>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>New Password</span>
              <input className="input-base" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" required />
            </label>
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Confirm Password</span>
              <input className="input-base" type="password" value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} autoComplete="new-password" required />
            </label>
            {error && <div style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</div>}
            <button className="btn-accent" type="submit" disabled={submitting} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              {submitting ? "Saving..." : "Save Password"}
              <FiCheck size={15} />
            </button>
            <button className="btn-ghost" type="button" onClick={() => navigate("/login")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <FiArrowLeft size={14} />
              Back to Login
            </button>
          </form>
        </UICard>
      </div>
    </Layout>
  );
}

export default ResetPassword;
