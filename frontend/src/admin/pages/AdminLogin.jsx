// src/admin/pages/AdminLogin.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Recycle,
  AlertCircle,
  Sparkles,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function AdminLogin() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        if (user.role === "admin") navigate("/admin");
      } catch (e) {
        // invalid data — stay on login
      }
    }
  }, [navigate]);

  const handleChange = (e) => {
    setError("");
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.email.trim() || !formData.password.trim()) {
      setError("Please enter both email and password");
      toast.error("Please enter both email and password");
      return;
    }

    try {
      setIsSubmitting(true);
      const toastId = toast.loading("Logging in as Admin...");

      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Login failed");
      if (data.user.role !== "admin") throw new Error("Access denied. Admin only.");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      toast.update(toastId, {
        render: "Welcome Admin! 🎉",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      setTimeout(() => navigate("/admin"), 800);
    } catch (err) {
      console.error("Admin login error:", err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-auth-shell">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      {/* ─── Background decoration ─── */}
      <div className="admin-auth-bg" aria-hidden>
        <div className="admin-auth-bg-grid" />
        <div className="admin-auth-bg-glow admin-auth-bg-glow-a" />
        <div className="admin-auth-bg-glow admin-auth-bg-glow-b" />
      </div>

      <div className="admin-card">
        {/* Admin badge */}
        <div className="admin-badge">
          <div className="admin-badge-icon">
            <Shield className="w-5 h-5" />
          </div>
          <span className="admin-badge-label">
            Admin Portal
            <Sparkles className="w-3 h-3" />
          </span>
        </div>

        {/* Header */}
        <div className="text-center mb-7">
          <span className="eyebrow">Secure Access</span>
          <h1 className="auth-title">Sign in as Admin</h1>
          <p className="auth-sub">
            Enter your credentials to access the dashboard
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
          <div>
            <Label>Admin Email</Label>
            <Field icon={Mail}>
              <input
                type="email"
                name="email"
                placeholder="admin@reviveenergy.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="off"
                className="ainput"
              />
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Password</Label>
              <Link
                to="/admin/forgot-password"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline -mt-2"
              >
                Forgot password?
              </Link>
            </div>
            <Field icon={Lock}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
                className="ainput"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="ainput-eye"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </Field>
          </div>

          {error && (
            <div className="error-banner">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="primary-btn w-full mt-2"
          >
            {isSubmitting ? (
              <>
                <span className="btn-spinner" />
                Verifying...
              </>
            ) : (
              <>
                Access Dashboard
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security notice */}
        <div className="admin-notice">
          <ShieldCheck className="w-4 h-4 admin-notice-icon" />
          <div className="text-left">
            <p className="admin-notice-title">Restricted area</p>
            <p className="admin-notice-desc">
              This portal is monitored. All access attempts are logged.
            </p>
          </div>
        </div>

        {/* Back link */}
        <p className="mt-7 text-sm text-slate-600 text-center">
          <Link
            to="/"
            className="font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1.5 transition-colors"
          >
            <Recycle className="w-4 h-4" />
            Back to ReVive Energy
          </Link>
        </p>
      </div>

      <style>{STYLES}</style>
    </div>
  );
}

/* ─── Small helper components ─── */
function Field({ icon: Icon, children }) {
  return (
    <div className="afield">
      <Icon className="afield-icon" />
      {children}
    </div>
  );
}

function Label({ children }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">
      {children}
    </label>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLES — homepage background + decorative grid & glows
   ═══════════════════════════════════════════════════════════════ */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

/* ─── Shell ──────────────────────────────────────────────── */
.admin-auth-shell {
  position: relative;
  min-height: calc(100vh - 72px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 18px;
  background: #F6F8F4;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  color: #0F172A;
  overflow: hidden;
}

/* ─── Background decoration ─────────────────────────────── */
.admin-auth-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.admin-auth-bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(17, 64, 45, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(17, 64, 45, 0.05) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(ellipse at 50% 45%, black 20%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 45%, black 20%, transparent 75%);
}
.admin-auth-bg-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.55;
}
.admin-auth-bg-glow-a {
  width: 480px; height: 480px;
  top: -12%; left: -8%;
  background: radial-gradient(circle, rgba(163, 230, 53, 0.5), transparent 65%);
}
.admin-auth-bg-glow-b {
  width: 420px; height: 420px;
  bottom: -14%; right: -6%;
  background: radial-gradient(circle, rgba(52, 211, 153, 0.4), transparent 65%);
}

/* ─── Card ───────────────────────────────────────────────── */
.admin-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 440px;
  background: #FFFFFF;
  border-radius: 24px;
  border: 1px solid #E5EDE8;
  padding: 32px 28px;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.05),
    0 8px 32px -12px rgba(15, 23, 42, 0.14),
    0 24px 60px -20px rgba(15, 23, 42, 0.10);
  animation: cardEnter 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
@keyframes cardEnter {
  0% { opacity: 0; transform: translateY(12px) scale(0.99); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

/* ─── Admin badge (top of card) ──────────────────────────── */
.admin-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 22px;
}
.admin-badge-icon {
  width: 36px; height: 36px;
  border-radius: 11px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #11402D 0%, #0A2115 100%);
  color: #A3E635;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.15) inset,
    0 6px 14px -6px rgba(17, 64, 45, 0.55);
}
.admin-badge-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #0F172A;
}
.admin-badge-label svg { color: #A3E635; }

/* ─── Typography ─────────────────────────────────────────── */
.eyebrow {
  display: inline-block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #11402D;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(17, 64, 45, 0.06);
  border: 1px solid rgba(17, 64, 45, 0.08);
}
.auth-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 24px;
  line-height: 1.15;
  font-weight: 700;
  color: #0F172A;
  letter-spacing: -0.02em;
  margin-top: 12px;
}
.auth-sub {
  margin-top: 6px;
  font-size: 13.5px;
  color: #64748B;
  line-height: 1.55;
}

/* ─── Fields ─────────────────────────────────────────────── */
.afield {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}
.afield:hover { border-color: #CBD5E1; background: #FFFFFF; }
.afield:focus-within {
  background: #FFFFFF;
  border-color: #11402D;
  box-shadow: 0 0 0 4px rgba(17, 64, 45, 0.08);
}
.afield-icon {
  width: 16px; height: 16px;
  color: #94A3B8;
  flex-shrink: 0;
  transition: color 0.15s ease;
}
.afield:focus-within .afield-icon { color: #11402D; }
.ainput {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: 14px;
  color: #0F172A;
  min-width: 0;
}
.ainput::placeholder { color: #94A3B8; }
.ainput-eye {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #94A3B8;
  padding: 4px;
  margin: -4px;
  border-radius: 6px;
  transition: color 0.15s ease, background 0.15s ease;
  flex-shrink: 0;
}
.ainput-eye:hover { color: #475569; background: #F1F5F9; }

/* ─── Primary button ─────────────────────────────────────── */
.primary-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px 20px;
  border-radius: 12px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  color: #FFFFFF;
  background: linear-gradient(135deg, #0F3624 0%, #11402D 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.12s ease, box-shadow 0.2s ease;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.12) inset,
    0 10px 24px -12px rgba(17, 64, 45, 0.6);
}
.primary-btn::before {
  content: '';
  position: absolute;
  top: 0; left: -40%;
  width: 40%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent);
  transform: skewX(-20deg);
  transition: left 0.6s ease;
  pointer-events: none;
}
.primary-btn:hover:not(:disabled)::before { left: 110%; }
.primary-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.12) inset,
    0 16px 32px -14px rgba(17, 64, 45, 0.75);
}
.primary-btn:active:not(:disabled) { transform: translateY(0); }
.primary-btn:disabled { opacity: 0.72; cursor: not-allowed; }
.primary-btn:focus-visible {
  outline: none;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.12) inset,
    0 0 0 4px rgba(17, 64, 45, 0.25);
}
.btn-spinner {
  width: 14px; height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #FFFFFF;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── Error banner ───────────────────────────────────────── */
.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  border-radius: 10px;
  background: linear-gradient(180deg, #FEF2F2, #FEE2E2);
  border: 1px solid #FECACA;
  font-size: 13px;
  font-weight: 500;
  color: #B91C1C;
}

/* ─── Security notice (below form) ───────────────────────── */
.admin-notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 22px;
  padding: 12px 14px;
  border-radius: 12px;
  background: linear-gradient(180deg, #F0FDF4, #ECFDF5);
  border: 1px solid #BBF7D0;
}
.admin-notice-icon {
  color: #059669;
  flex-shrink: 0;
  margin-top: 1px;
}
.admin-notice-title {
  font-size: 12px;
  font-weight: 700;
  color: #065F46;
  letter-spacing: -0.005em;
}
.admin-notice-desc {
  font-size: 11.5px;
  color: #047857;
  margin-top: 1px;
  line-height: 1.5;
}

/* ─── Toast overrides ────────────────────────────────────── */
.Toastify__toast {
  font-family: 'Inter', sans-serif !important;
  border-radius: 12px !important;
  box-shadow: 0 16px 40px -10px rgba(0,0,0,0.4) !important;
}
.Toastify__toast--success { background: linear-gradient(135deg, #0E2A1C, #11402D) !important; }
.Toastify__toast--error { background: linear-gradient(135deg, #7f1d1d, #991b1b) !important; }
.Toastify__toast--info { background: linear-gradient(135deg, #1e3a5f, #1a4a7a) !important; }
.Toastify__toast--warning { background: linear-gradient(135deg, #78350f, #92400e) !important; }
.Toastify__progress-bar { background: #A3E635 !important; }

/* ─── Reduced motion ─────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .admin-card { animation: none !important; }
}

/* ─── Mobile ─────────────────────────────────────────────── */
@media (max-width: 480px) {
  .admin-auth-shell { padding: 16px 12px; }
  .admin-card { border-radius: 20px; padding: 26px 22px; }
  .auth-title { font-size: 22px; }
}
`;

export default AdminLogin;