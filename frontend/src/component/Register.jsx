// src/component/Register.jsx
import { useNavigate, Link } from "react-router-dom";
import {
  Recycle,
  Building2,
  Zap,
  Truck,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

const ROLES = [
  {
    id: "waste-supplier",
    icon: Building2,
    label: "Waste Supplier",
    desc: "Hotels · Farms · Markets · Factories",
    hint: "Post waste streams and receive collection requests",
  },
  {
    id: "energy-producer",
    icon: Zap,
    label: "Energy Producer",
    desc: "Biogas · Recycling · WtE plants",
    hint: "Source waste feedstock and produce clean energy",
  },
  {
    id: "transport-partner",
    icon: Truck,
    label: "Transport Partner",
    desc: "Logistics · Fleet owners · Collection agents",
    hint: "Move waste between suppliers and producers",
  },
];

export default function Register() {
  const navigate = useNavigate();

  const handlePick = (roleId) => {
    // Navigate back to /login with the chosen role.
    // Login.jsx picks this up from location.state and opens the
    // signup flow pre-selected with the role.
    navigate("/login", { state: { signupRole: roleId } });
  };

  return (
    <div className="reg-shell">
      {/* ─── Background decoration ─── */}
      <div className="reg-bg" aria-hidden>
        <div className="reg-bg-grid" />
        <div className="reg-bg-glow reg-bg-glow-a" />
        <div className="reg-bg-glow reg-bg-glow-b" />
      </div>

      {/* ─── Card ─── */}
      <div className="reg-card">
        {/* Brand */}
        <div className="flex items-center justify-center mb-6">
          <div className="brand-lockup">
            <div className="brand-icon">
              <Recycle className="w-5 h-5" />
            </div>
            <span className="brand-wordmark">
              Re<span className="text-emerald-600">V</span>ive
              <span className="text-emerald-600"> Energy</span>
            </span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <span className="eyebrow">Get started</span>
          <h1 className="reg-title">Create your account</h1>
          <p className="reg-sub">
            Pick the role that best describes you. We'll tailor the next few
            steps accordingly.
          </p>
        </div>

        {/* Role cards */}
        <div className="space-y-3">
          {ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => handlePick(role.id)}
                className="role-card"
              >
                <div className="role-icon">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="role-title">{role.label}</div>
                  <div className="role-desc">{role.desc}</div>
                  <div className="role-hint">{role.hint}</div>
                </div>
                <ArrowRight className="role-arrow" />
              </button>
            );
          })}
        </div>

        {/* Back to login */}
        <div className="mt-7 pt-5 border-t border-slate-100 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        </div>

        {/* Trust footer */}
        <div className="reg-footer">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Takes less than 2 minutes to set up</span>
        </div>
      </div>

      <style>{REG_STYLES}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLES — original layout, new background
   ═══════════════════════════════════════════════════════════════ */
const REG_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

/* ─── Shell ──────────────────────────────────────────────── */
.reg-shell {
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
.reg-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.reg-bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(17, 64, 45, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(17, 64, 45, 0.05) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(ellipse at 50% 45%, black 20%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 45%, black 20%, transparent 75%);
}
.reg-bg-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.55;
}
.reg-bg-glow-a {
  width: 480px; height: 480px;
  top: -12%; left: -8%;
  background: radial-gradient(circle, rgba(163, 230, 53, 0.5), transparent 65%);
}
.reg-bg-glow-b {
  width: 420px; height: 420px;
  bottom: -14%; right: -6%;
  background: radial-gradient(circle, rgba(52, 211, 153, 0.4), transparent 65%);
}

/* ─── Card ───────────────────────────────────────────────── */
.reg-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 520px;
  background: #FFFFFF;
  border-radius: 24px;
  border: 1px solid #E5EDE8;
  padding: 32px 28px;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.05),
    0 8px 32px -12px rgba(15, 23, 42, 0.14),
    0 24px 60px -20px rgba(15, 23, 42, 0.10);
  animation: regEnter 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
@keyframes regEnter {
  0% { opacity: 0; transform: translateY(12px) scale(0.99); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

/* ─── Brand lockup ─── */
.brand-lockup { display: inline-flex; align-items: center; gap: 10px; }
.brand-icon {
  width: 36px; height: 36px;
  border-radius: 11px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #11402D 0%, #0A2115 100%);
  color: #A3E635;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.15) inset,
    0 6px 14px -6px rgba(17, 64, 45, 0.55);
}
.brand-wordmark {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 17px;
  letter-spacing: -0.015em;
  color: #0F172A;
}

/* ─── Header ─── */
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
.reg-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 26px;
  line-height: 1.15;
  font-weight: 700;
  color: #0F172A;
  letter-spacing: -0.02em;
  margin-top: 12px;
}
.reg-sub {
  margin-top: 8px;
  font-size: 14px;
  color: #64748B;
  line-height: 1.55;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

/* ─── Role card ─── */
.role-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 16px;
  border-radius: 14px;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  cursor: pointer;
  transition: all 0.18s ease;
  font-family: inherit;
  width: 100%;
  text-align: left;
}
.role-card:hover {
  border-color: #11402D;
  background: linear-gradient(90deg, rgba(163, 230, 53, 0.06), rgba(17, 64, 45, 0.02));
  transform: translateY(-1px);
  box-shadow: 0 10px 24px -12px rgba(17, 64, 45, 0.22);
}
.role-icon {
  width: 42px; height: 42px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(17, 64, 45, 0.06);
  color: #11402D;
  flex-shrink: 0;
  transition: background 0.18s ease, transform 0.18s ease;
}
.role-card:hover .role-icon {
  background: #11402D;
  color: #A3E635;
  transform: rotate(-4deg) scale(1.05);
}
.role-title {
  font-size: 14.5px;
  font-weight: 700;
  color: #0F172A;
  letter-spacing: -0.005em;
}
.role-desc {
  font-size: 12.5px;
  color: #475569;
  margin-top: 2px;
  font-weight: 500;
}
.role-hint {
  font-size: 11.5px;
  color: #94A3B8;
  margin-top: 4px;
  line-height: 1.4;
}
.role-arrow {
  width: 16px; height: 16px;
  color: #94A3B8;
  flex-shrink: 0;
  transition: transform 0.18s ease, color 0.18s ease;
}
.role-card:hover .role-arrow {
  color: #11402D;
  transform: translateX(3px);
}

/* ─── Trust footer ─── */
.reg-footer {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #F1F5F9;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 11.5px;
  color: #94A3B8;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.05em;
}
.reg-footer svg { color: #A3E635; }

/* ─── Mobile ─── */
@media (max-width: 480px) {
  .reg-shell { padding: 16px 12px; }
  .reg-card { border-radius: 20px; padding: 26px 22px; }
  .reg-title { font-size: 22px; }
  .role-icon { width: 38px; height: 38px; }
  .role-title { font-size: 14px; }
  .role-desc { font-size: 12px; }
}

@media (prefers-reduced-motion: reduce) {
  .reg-card { animation: none !important; }
  .role-card,
  .role-icon,
  .role-arrow { transition: none !important; }
}
`;

