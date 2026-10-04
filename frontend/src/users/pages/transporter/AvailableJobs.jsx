// src/pages/AvailableJobs.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck,
  MapPin,
  Package,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  ShieldCheck,
  CreditCard,
  Building2,
  User,
  Route,
  Eye,
  Search,
  Check,
  X,
  Clock,
  MessageSquareWarning,
  Ban,
  Phone,
  Mail,
  FileText,
  Info as InfoIcon,
  ArrowRight,
  ArrowRight as ArrowRightIcon,
  Calendar,
  Hash,
  Weight,
  Navigation,
  Copy,
  CheckCheck,
  Zap,
  TrendingUp,
  ArrowUpDown,
  Coins,
  HelpCircle,
} from "lucide-react";
import { toast } from "react-toastify";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ─── LocalStorage keys ───────────────────────────────────────
const DISMISSED_REJECTIONS_KEY = "revive-dismissed-rejections-v1";
const SEEN_REJECTIONS_KEY = "revive-seen-rejections-v1";

// ─── Module-level helpers ─────────────────────────────────────
const formatCurrency = (amount) => {
  const n = Number(amount || 0);
  return `KSh ${n.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const safeNumber = (value) => {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Resolve the transport fee for a job.
 * Priority:
 *   1. job.transport_fee
 *   2. job.estimated_earnings
 *   3. job.earnings
 *   4. job.transport_rate_per_unit × job.quantity  (computed fallback)
 *
 * Returns { amount, source } where source is "explicit" | "computed" | "pending".
 */
const resolveFee = (job) => {
  if (!job) return { amount: 0, source: "pending" };

  const explicitFee = safeNumber(job.transport_fee);
  if (explicitFee > 0) return { amount: explicitFee, source: "explicit" };

  const estimated = safeNumber(job.estimated_earnings);
  if (estimated > 0) return { amount: estimated, source: "explicit" };

  const earnings = safeNumber(job.earnings);
  if (earnings > 0) return { amount: earnings, source: "explicit" };

  // Compute from rate × quantity as a last resort
  const rate = safeNumber(job.transport_rate_per_unit);
  const qty = safeNumber(job.quantity);
  if (rate > 0 && qty > 0) {
    return { amount: Math.round(rate * qty * 100) / 100, source: "computed" };
  }

  return { amount: 0, source: "pending" };
};

const getEarnings = (job) => resolveFee(job).amount;

const getPriority = (job) => {
  const quantity = safeNumber(job?.quantity);
  const earnings = getEarnings(job);
  if (earnings >= 3000 || quantity >= 1000) return "High";
  if (earnings >= 1000 || quantity >= 300) return "Medium";
  return "Low";
};

const PRIORITY_META = {
  High: {
    label: "HIGH",
    chip: "bg-red-50 text-red-600 ring-red-100",
    dot: "bg-red-500",
    glow: "shadow-red-500/20",
  },
  Medium: {
    label: "MED",
    chip: "bg-amber-50 text-amber-600 ring-amber-100",
    dot: "bg-amber-500",
    glow: "shadow-amber-500/20",
  },
  Low: {
    label: "LOW",
    chip: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    dot: "bg-emerald-500",
    glow: "shadow-emerald-500/20",
  },
};

const formatRelative = (isoString) => {
  if (!isoString) return "";
  const then = new Date(isoString).getTime();
  const now = Date.now();
  const sec = Math.max(1, Math.floor((now - then) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(isoString).toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatFullDateTime = (isoString) => {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─── LocalStorage helpers ─────────────────────────────────────
function readIdSet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}
function writeIdSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {}
}

function dedupeById(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (!item || item.id == null) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function truncate(str, n) {
  if (!str) return "";
  return str.length > n ? `${str.slice(0, n)}…` : str;
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function AvailableJobs() {
  const [jobs, setJobs] = useState([]);
  const [rejectedJobs, setRejectedJobs] = useState([]);
  const [dismissedRejections, setDismissedRejections] = useState(() =>
    readIdSet(DISMISSED_REJECTIONS_KEY)
  );
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);
  const [acceptingJob, setAcceptingJob] = useState(null);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("fee-desc");
  const [detailsJob, setDetailsJob] = useState(null);
  const acceptResultRef = useRef(null);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // ─── Data fetching ──────────────────────────────────────────
  const fetchJobs = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`${API_URL}/transporter/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.message || "Failed to load available jobs");

      const availableList = Array.isArray(data) ? data : data.jobs || [];
      const rejectedList = Array.isArray(data) ? [] : data.rejectedJobs || [];

      const embeddedRejections = availableList
        .filter(
          (j) =>
            j.rejection_reason ||
            j.rejected_by_supplier_at ||
            j.was_rejected_by_supplier
        )
        .map((j) => ({ ...j, __embedded: true }));

      const mergedRejections = dedupeById([
        ...rejectedList,
        ...embeddedRejections,
      ]);

      const seen = readIdSet(SEEN_REJECTIONS_KEY);
      const fresh = mergedRejections.filter((r) => !seen.has(r.id));
      if (fresh.length > 0) {
        const isFirstLoad = seen.size === 0;
        fresh.forEach((r) => {
          const reasonTxt = r.rejection_reason
            ? ` — reason: "${truncate(r.rejection_reason, 90)}"`
            : "";
          if (!isFirstLoad) {
            toast.warn(`Collection #${r.id} rejected by supplier${reasonTxt}`, {
              autoClose: 8000,
            });
          }
          seen.add(r.id);
        });
        writeIdSet(SEEN_REJECTIONS_KEY, seen);
      }

      setJobs(availableList);
      setRejectedJobs(mergedRejections);
    } catch (err) {
      setError(err.message || "Something went wrong");
      setJobs([]);
      setRejectedJobs([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // ─── Rejection dismissal ────────────────────────────────────
  const visibleRejections = useMemo(
    () => rejectedJobs.filter((r) => !dismissedRejections.has(r.id)),
    [rejectedJobs, dismissedRejections]
  );

  const dismissRejection = (id) => {
    setDismissedRejections((prev) => {
      const next = new Set(prev);
      next.add(id);
      writeIdSet(DISMISSED_REJECTIONS_KEY, next);
      return next;
    });
  };

  const dismissAllRejections = () => {
    setDismissedRejections((prev) => {
      const next = new Set(prev);
      visibleRejections.forEach((r) => next.add(r.id));
      writeIdSet(DISMISSED_REJECTIONS_KEY, next);
      return next;
    });
  };

  // ─── Accept flow ────────────────────────────────────────────
  const acceptJob = async (job) => {
    setAcceptingId(job.id);
    acceptResultRef.current = null;

    const apiPromise = (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Not authenticated");

        const res = await fetch(
          `${API_URL}/transporter/jobs/${job.id}/accept`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Failed to accept job");
        return { ok: true };
      } catch (err) {
        return { ok: false, message: err.message || "Could not accept job" };
      }
    })();

    if (prefersReducedMotion) {
      const result = await apiPromise;
      acceptResultRef.current = result;
      finishAccept(job, result);
      return;
    }

    setAcceptingJob(job);
    apiPromise.then((result) => {
      acceptResultRef.current = result;
    });
  };

  const finishAccept = (job, result) => {
    setAcceptingJob(null);
    setAcceptingId(null);

    if (result?.ok) {
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      setRejectedJobs((prev) => prev.filter((r) => r.id !== job.id));
      setDetailsJob(null);
      toast.success("Job accepted successfully");
    } else {
      toast.error(result?.message || "Could not accept job");
    }
  };

  const handleAnimationComplete = () => {
    const job = acceptingJob;
    if (!job) return;
    if (!acceptResultRef.current) {
      setTimeout(() => {
        finishAccept(job, acceptResultRef.current || { ok: true });
      }, 250);
      return;
    }
    finishAccept(job, acceptResultRef.current);
  };

  const handleAnimationSkip = () => {
    const job = acceptingJob;
    if (!job) return;
    finishAccept(job, acceptResultRef.current || { ok: true });
  };

  // ─── Filter + Sort ──────────────────────────────────────────
  const filteredJobs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = [...jobs];

    if (q) {
      list = list.filter((job) =>
        [
          job.waste_type,
          job.pickup_location,
          job.delivery_location,
          job.supplier_name,
          job.producer_name,
          job.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    switch (sortBy) {
      case "fee-desc":
        list.sort((a, b) => getEarnings(b) - getEarnings(a));
        break;
      case "fee-asc":
        list.sort((a, b) => getEarnings(a) - getEarnings(b));
        break;
      case "qty-desc":
        list.sort((a, b) => safeNumber(b.quantity) - safeNumber(a.quantity));
        break;
      case "newest":
        list.sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        );
        break;
      default:
        break;
    }

    return list;
  }, [jobs, searchQuery, sortBy]);

  // ─── Stats ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = jobs.reduce((sum, j) => sum + getEarnings(j), 0);
    const pricedJobs = jobs.filter((j) => getEarnings(j) > 0).length;
    const avg = pricedJobs > 0 ? total / pricedJobs : 0;
    const topFee = jobs.reduce((max, j) => Math.max(max, getEarnings(j)), 0);
    const missingCount = jobs.length - pricedJobs;
    return { total, avg, topFee, missingCount, pricedJobs };
  }, [jobs]);

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-[#11402D] border-t-[#9CF06B]" />
          <p className="mt-4 text-sm text-gray-500">Loading available jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Available Jobs</h1>
            <p className="mt-1 text-sm text-gray-500">
              Accept paid waste collection jobs with escrow-secured transport fees.
            </p>
          </div>
          <button
            onClick={() => fetchJobs()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* ─── Rejection Alerts ───────────────────────────────── */}
      <RejectionAlerts
        rejections={visibleRejections}
        totalCount={rejectedJobs.length}
        onDismiss={dismissRejection}
        onDismissAll={dismissAllRejections}
        onViewDetails={(r) => setDetailsJob(r)}
      />

      {/* ─── Stats ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Available Jobs" value={jobs.length} icon={Truck} />
        <Stat
          label="Total Payout Pool"
          value={stats.missingCount > 0 ? `${formatCurrency(stats.total)}*` : formatCurrency(stats.total)}
          icon={Coins}
          color="text-[#11402D]"
          hint={stats.missingCount > 0 ? `${stats.missingCount} job${stats.missingCount === 1 ? "" : "s"} awaiting fee` : null}
        />
        <Stat
          label="Highest Fee"
          value={stats.topFee > 0 ? formatCurrency(stats.topFee) : "—"}
          icon={TrendingUp}
          color="text-emerald-600"
        />
        <Stat
          label="Average Fee"
          value={stats.avg > 0 ? formatCurrency(Math.round(stats.avg)) : "—"}
          icon={CreditCard}
          color="text-blue-600"
        />
      </div>

      {/* ─── Fee data warning ───────────────────────────────── */}
      {stats.missingCount > 0 && jobs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3"
        >
          <HelpCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-amber-900">
            <p className="font-bold">
              {stats.missingCount} job{stats.missingCount === 1 ? " is" : "s are"} missing a transport fee
            </p>
            <p className="mt-0.5 text-amber-800/80">
              These listings were created without a per-unit rate. You can still accept
              them — the supplier will confirm the fee before pickup.
            </p>
          </div>
        </motion.div>
      )}

      {/* ─── Search + Sort ──────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search jobs by location, supplier, producer..."
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="relative sm:ml-auto">
          <ArrowUpDown className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-9 text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="fee-desc">Fee: High to Low</option>
            <option value="fee-asc">Fee: Low to High</option>
            <option value="qty-desc">Quantity: High to Low</option>
            <option value="newest">Newest first</option>
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            ▾
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* ─── Job grid ───────────────────────────────────────── */}
      {filteredJobs.length === 0 ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <Truck className="mx-auto h-16 w-16 text-[#11402D]" />
          <h2 className="mt-4 text-xl font-bold text-gray-900">
            No available jobs yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-gray-500">
            Jobs will appear here after producer payment is confirmed and escrow
            is secured.
          </p>
        </div>
      ) : (
        <motion.div layout className="grid gap-5 lg:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isAccepting={acceptingId === job.id}
                onViewDetails={() => setDetailsJob(job)}
                onAccept={() => acceptJob(job)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ─── Details Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {detailsJob && (
          <JobDetailsModal
            key={detailsJob.id}
            job={detailsJob}
            onClose={() => setDetailsJob(null)}
            onAccept={(job) => {
              setDetailsJob(null);
              acceptJob(job);
            }}
            isAccepting={acceptingId === detailsJob.id}
          />
        )}
      </AnimatePresence>

      {/* ─── Cinematic accept animation ─────────────────────── */}
      <AnimatePresence>
        {acceptingJob && (
          <JobAcceptAnimation
            key={acceptingJob.id}
            job={acceptingJob}
            onComplete={handleAnimationComplete}
            onSkip={handleAnimationSkip}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// JOB CARD
// ═══════════════════════════════════════════════════════════════
function JobCard({ job, isAccepting, onViewDetails, onAccept }) {
  const priority = getPriority(job);
  const meta = PRIORITY_META[priority];
  const { amount: earnings, source: feeSource } = resolveFee(job);
  const hasFee = earnings > 0;
  const isPending = !hasFee;
  const wasRejected =
    !!job.rejection_reason ||
    !!job.was_rejected_by_supplier ||
    !!job.rejected_by_supplier_at;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -12, filter: "blur(4px)" }}
      transition={{
        layout: { type: "spring", stiffness: 320, damping: 32 },
        default: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
      }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,76,54,0.04)] transition-all hover:border-[#11402D]/25 hover:shadow-[0_20px_44px_-18px_rgba(15,76,54,0.25)]"
    >
      <span
        className={`absolute left-0 top-0 h-full w-[3px] ${meta.dot} opacity-70 transition-opacity group-hover:opacity-100`}
        aria-hidden
      />

      {/* ─── Header ────────────────────────────────────────── */}
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#11402D] to-[#0A2B1D] text-[#9CF06B] shadow-md shadow-[#11402D]/20">
          <Truck className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate text-[15px] font-bold text-gray-900 leading-tight">
              {job.waste_type || "Waste Collection Job"}
            </h3>
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ring-1 ${meta.chip}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11.5px] text-gray-500">
            <span className="inline-flex items-center gap-1 font-mono text-gray-400">
              <Hash className="h-3 w-3" />#{job.id}
            </span>
            <span className="h-1 w-1 rounded-full bg-gray-300" />
            <span className="inline-flex items-center gap-1">
              <Package className="h-3 w-3" />
              <span className="font-semibold text-gray-700">
                {job.quantity || "N/A"}
              </span>{" "}
              {job.unit || "kg"}
            </span>
            {job.supplier_name && (
              <>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span className="inline-flex items-center gap-1 truncate max-w-[140px]">
                  <Building2 className="h-3 w-3" />
                  {job.supplier_name}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Rejection strip ─────────────────────────────── */}
      {wasRejected && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2">
          <MessageSquareWarning className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Previously rejected
              </span>
              {job.rejected_by_supplier_at && (
                <span className="text-[10px] text-amber-700/70">
                  · {formatRelative(job.rejected_by_supplier_at)}
                </span>
              )}
            </div>
            {job.rejection_reason ? (
              <p className="mt-0.5 text-[12px] italic leading-snug text-amber-900/80 line-clamp-2">
                "{truncate(job.rejection_reason, 140)}"
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] italic text-amber-700/70">
                No reason provided
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── Route strip ──────────────────────────────────── */}
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-gray-50/80 px-3 py-2.5 text-[12.5px]">
        <span className="flex h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
        <span className="truncate font-medium text-gray-700">
          {job.pickup_location || "Pickup location"}
        </span>
        <ArrowRightIcon className="h-3 w-3 flex-shrink-0 text-gray-400" />
        <span className="flex h-2 w-2 flex-shrink-0 rounded-full bg-blue-500 ring-2 ring-blue-100" />
        <span className="truncate font-medium text-gray-700">
          {job.delivery_location || "Delivery location"}
        </span>
      </div>

      {/* ─── Transport Fee Panel ──────────────────────────── */}
      <div
        className={`mt-4 relative overflow-hidden rounded-2xl border p-4 ${
          isPending
            ? "border-amber-200/60 bg-gradient-to-br from-amber-50/70 via-white to-white"
            : "border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 via-white to-white"
        }`}
      >
        <div
          className={`pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full blur-3xl ${
            isPending ? "bg-amber-200/30" : "bg-emerald-200/30"
          }`}
          aria-hidden
        />
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Coins
                className={`h-3.5 w-3.5 ${
                  isPending ? "text-amber-600" : "text-emerald-700"
                }`}
              />
              <p
                className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
                  isPending ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                Transport Fee
              </p>
            </div>
            <p
              className={`mt-1 leading-none tracking-tight ${
                isPending
                  ? "text-[15px] font-bold text-amber-700"
                  : "text-2xl font-extrabold text-[#0A2B1D]"
              }`}
            >
              {isPending ? "Pending supplier rate" : formatCurrency(earnings)}
            </p>

            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              {isPending ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  <Clock className="h-3 w-3" />
                  Awaiting fee
                </span>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    <ShieldCheck className="h-3 w-3" />
                    Escrow Protected
                  </span>
                  {feeSource === "computed" && (
                    <span className="text-[10px] font-semibold text-gray-400">
                      · est.
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Quick action cluster */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <motion.button
              type="button"
              onClick={onViewDetails}
              whileTap={{ scale: 0.96 }}
              aria-label="View details"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[12.5px] font-semibold text-gray-600 transition hover:border-[#11402D]/30 hover:bg-gray-50 hover:text-[#11402D]"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Details</span>
            </motion.button>

            <motion.button
              type="button"
              onClick={onAccept}
              disabled={isAccepting}
              whileTap={{ scale: 0.96 }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-[#11402D] to-[#0A2B1D] px-3.5 py-2 text-[12.5px] font-bold text-white shadow-md shadow-[#11402D]/25 transition-all hover:shadow-lg hover:shadow-[#11402D]/35 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isAccepting ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  <span>Accepting…</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Accept</span>
                  <ArrowRightIcon className="h-3 w-3 -mr-0.5" />
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

// ═══════════════════════════════════════════════════════════════
// JOB DETAILS MODAL
// ═══════════════════════════════════════════════════════════════
function JobDetailsModal({ job, onClose, onAccept, isAccepting }) {
  const { amount: earnings, source: feeSource } = resolveFee(job);
  const hasFee = earnings > 0;
  const isPending = !hasFee;
  const priority = getPriority(job);
  const meta = PRIORITY_META[priority];
  const wasRejected =
    !!job.rejection_reason ||
    !!job.was_rejected_by_supplier ||
    !!job.rejected_by_supplier_at;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-3xl max-h-[92vh] sm:max-h-[88vh] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={`Job #${job.id} details`}
      >
        <div className="relative flex items-start justify-between gap-4 border-b border-gray-100 bg-gradient-to-br from-[#11402D] to-[#0A2B1D] px-6 py-5 text-white">
          <div className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-[#9CF06B]/15 blur-3xl pointer-events-none" />

          <div className="relative flex items-start gap-3 min-w-0">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#9CF06B]/15">
              <Truck className="h-6 w-6 text-[#9CF06B]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="truncate text-lg font-bold">
                  {job.waste_type || "Waste Collection Job"}
                </h2>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/90 ring-1 ring-white/15">
                  <span
                    className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`}
                  />
                  {priority} priority
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/70">
                <span className="inline-flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  Job #{job.id}
                </span>
                {job.request_id && (
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Request #{job.request_id}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatFullDateTime(job.created_at)}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Fee hero */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden rounded-2xl border p-5 ${
              isPending
                ? "border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-white"
                : "border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-white to-white"
            }`}
          >
            <div
              className={`pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full blur-3xl ${
                isPending ? "bg-amber-200/40" : "bg-emerald-200/40"
              }`}
              aria-hidden
            />
            <div className="relative flex items-center gap-4">
              <div
                className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${
                  isPending
                    ? "bg-gradient-to-br from-amber-500 to-amber-700 shadow-amber-500/30"
                    : "bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-500/30"
                }`}
              >
                {isPending ? (
                  <Clock className="h-7 w-7" />
                ) : (
                  <Coins className="h-7 w-7" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
                    isPending ? "text-amber-700" : "text-emerald-700"
                  }`}
                >
                  {isPending ? "Fee pending" : "You will earn"}
                </p>
                <p
                  className={`mt-0.5 font-extrabold leading-none tracking-tight ${
                    isPending
                      ? "text-xl text-amber-800"
                      : "text-3xl text-[#0A2B1D]"
                  }`}
                >
                  {isPending ? "Awaiting supplier rate" : formatCurrency(earnings)}
                </p>

                {isPending ? (
                  <p className="mt-2 text-[12px] leading-relaxed text-amber-800/80">
                    The supplier hasn't set a per-unit transport rate for this
                    listing yet. You can accept the job now — the fee will be
                    confirmed before pickup.
                  </p>
                ) : (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                      <ShieldCheck className="h-3 w-3" />
                      Escrow Protected
                    </span>
                    <span className="text-[11px] text-emerald-700/80">
                      Released after producer confirms delivery
                    </span>
                    {feeSource === "computed" && (
                      <span className="text-[10px] font-semibold italic text-gray-500">
                        (estimated)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {wasRejected && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-100">
                  <Ban className="h-5 w-5 text-red-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-red-800">
                      Rejected by supplier
                    </p>
                    {job.rejected_by_supplier_at && (
                      <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-700">
                        {formatRelative(job.rejected_by_supplier_at)}
                      </span>
                    )}
                  </div>
                  {job.rejection_reason ? (
                    <div className="mt-2 rounded-xl border-l-4 border-red-400 bg-white px-3 py-2 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 mb-0.5">
                        Reason from supplier
                      </p>
                      <p className="text-sm italic leading-relaxed text-gray-800">
                        "{job.rejection_reason}"
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs italic text-red-700/70">
                      No reason was provided by the supplier.
                    </p>
                  )}
                  {job.rejected_by_supplier_at && (
                    <p className="mt-2 flex items-center gap-1 text-[11px] text-red-600/80">
                      <Clock className="h-3 w-3" />
                      {formatFullDateTime(job.rejected_by_supplier_at)}
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">
                    This job is back in the available pool. Accept only if you
                    can fulfil it as described.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <section>
            <SectionTitle icon={InfoIcon} title="Job details" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <FactCard
                icon={Package}
                label="Quantity"
                value={`${job.quantity || "N/A"} ${job.unit || "kg"}`}
                highlight
              />
              <FactCard
                icon={CreditCard}
                label="Transport fee"
                value={hasFee ? formatCurrency(earnings) : "Pending"}
                highlight
              />
              <FactCard icon={Weight} label="Unit" value={job.unit || "kg"} />
              <FactCard icon={Hash} label="Job ID" value={`#${job.id}`} mono />
              {job.request_id && (
                <FactCard
                  icon={FileText}
                  label="Request ID"
                  value={`#${job.request_id}`}
                  mono
                />
              )}
              {job.listing_id && (
                <FactCard
                  icon={FileText}
                  label="Listing ID"
                  value={`#${job.listing_id}`}
                  mono
                />
              )}
            </div>
          </section>

          <section>
            <SectionTitle icon={User} title="Parties involved" />
            <div className="grid sm:grid-cols-2 gap-3">
              <PartyCard
                role="Supplier"
                icon={Building2}
                name={job.supplier_name || "Unknown Supplier"}
                subtitle={job.supplier_id ? `ID #${job.supplier_id}` : null}
                phone={job.supplier_phone}
                email={job.supplier_email}
              />
              <PartyCard
                role="Producer"
                icon={User}
                name={job.producer_name || "Unknown Producer"}
                subtitle={job.producer_id ? `ID #${job.producer_id}` : null}
                phone={job.producer_phone}
                email={job.producer_email}
              />
            </div>
          </section>

          <section>
            <SectionTitle icon={Navigation} title="Route" />
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <RouteRow
                label="Pickup"
                location={job.pickup_location}
                accent="emerald"
                icon={MapPin}
              />
              <div className="my-3 ml-4 flex items-center gap-2">
                <span className="h-6 w-0.5 bg-gray-300" />
                <ArrowRight className="h-4 w-4 text-gray-400 rotate-90 sm:rotate-0" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Delivery route
                </span>
              </div>
              <RouteRow
                label="Delivery"
                location={job.delivery_location}
                accent="blue"
                icon={MapPin}
              />
              <p className="mt-3 text-[11px] text-gray-400">
                Distance and interactive map can be connected later using Google
                Maps API.
              </p>
            </div>
          </section>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 border-t border-gray-100 bg-gray-50/60 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Close
          </button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => onAccept(job)}
            disabled={isAccepting}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#11402D] py-3 text-sm font-semibold text-white hover:bg-[#0E2A1C] transition disabled:cursor-not-allowed disabled:opacity-70"
          >
            <CheckCircle className="h-4 w-4" />
            {isAccepting
              ? "Accepting..."
              : hasFee
              ? `Accept Job · ${formatCurrency(earnings)}`
              : "Accept Job"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-[#11402D]" />
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
        {title}
      </h3>
    </div>
  );
}

function FactCard({ icon: Icon, label, value, mono = false, highlight = false }) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight
          ? "border-[#11402D]/15 bg-[#11402D]/5"
          : "border-gray-100 bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p
        className={`mt-1 text-sm font-semibold text-gray-900 truncate ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function PartyCard({ role, icon: Icon, name, subtitle, phone, email }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#11402D]/10">
          <Icon className="h-5 w-5 text-[#11402D]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {role}
          </p>
          <p className="mt-0.5 font-semibold text-gray-900 truncate">{name}</p>
          {subtitle && (
            <p className="text-[11px] text-gray-400 font-mono">{subtitle}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {phone && (
              <a
                href={`tel:${phone}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[#11402D] hover:underline"
              >
                <Phone className="h-3 w-3" />
                {phone}
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[#11402D] hover:underline"
              >
                <Mail className="h-3 w-3" />
                {truncate(email, 20)}
              </a>
            )}
            {!phone && !email && (
              <span className="text-gray-400 italic">
                No contact info shared
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RouteRow({ label, location, accent, icon: Icon }) {
  const accents = {
    emerald: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return (
    <div className="flex items-start gap-3">
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${accents[accent]}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          {label}
        </p>
        <p className="text-sm font-semibold text-gray-900">
          {location || "Not specified"}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// REJECTION ALERTS
// ═══════════════════════════════════════════════════════════════
function RejectionAlerts({
  rejections,
  totalCount,
  onDismiss,
  onDismissAll,
  onViewDetails,
}) {
  if (!rejections || rejections.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 via-white to-white p-5 shadow-sm"
    >
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-red-100/60 blur-3xl"
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100 flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Rejected Collections
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {rejections.length} of {totalCount} rejection
              {totalCount === 1 ? "" : "s"} visible · supplier feedback below
            </p>
          </div>
        </div>

        {rejections.length > 1 && (
          <button
            type="button"
            onClick={onDismissAll}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            Dismiss all
          </button>
        )}
      </div>

      <div className="relative space-y-3">
        <AnimatePresence initial={false}>
          {rejections.map((r) => (
            <motion.article
              key={r.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="relative rounded-2xl border border-red-100 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Ban className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <p className="font-bold text-gray-900 truncate">
                      {r.waste_type || "Collection job"}
                    </p>
                    <span className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gray-500">
                      #{r.id}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    {r.supplier_name && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {r.supplier_name}
                      </span>
                    )}
                    {(r.quantity || r.unit) && (
                      <span className="inline-flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {r.quantity} {r.unit || "kg"}
                      </span>
                    )}
                    {r.rejected_by_supplier_at && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelative(r.rejected_by_supplier_at)}
                      </span>
                    )}
                  </div>

                  {(r.pickup_location || r.delivery_location) && (
                    <p className="mt-2 text-xs text-gray-500 truncate">
                      {r.pickup_location || "Pickup"} →{" "}
                      {r.delivery_location || "Delivery"}
                    </p>
                  )}

                  <div
                    className={`mt-3 rounded-xl border-l-4 px-3 py-2 ${
                      r.rejection_reason
                        ? "border-red-400 bg-red-50"
                        : "border-gray-300 bg-gray-50"
                    }`}
                  >
                    <p
                      className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${
                        r.rejection_reason ? "text-red-600" : "text-gray-500"
                      }`}
                    >
                      Supplier reason
                    </p>
                    {r.rejection_reason ? (
                      <p className="text-sm italic leading-relaxed text-gray-800">
                        "{r.rejection_reason}"
                      </p>
                    ) : (
                      <p className="text-xs italic text-gray-500">
                        No reason was provided by the supplier.
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-gray-400">
                      Back in the available pool — you can accept it again.
                    </p>
                    <button
                      type="button"
                      onClick={() => onViewDetails(r)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:border-[#11402D]/40 hover:bg-gray-50 transition whitespace-nowrap"
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDismiss(r.id)}
                  aria-label="Dismiss this rejection"
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition hover:bg-gray-50 hover:text-gray-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

// ═══════════════════════════════════════════════════════════════
// STAT
// ═══════════════════════════════════════════════════════════════
function Stat({ label, value, icon: Icon, color = "text-gray-900", hint }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 truncate">{label}</p>
          <p className={`mt-1 text-xl font-bold truncate ${color}`}>{value}</p>
          {hint && (
            <p className="mt-0.5 text-[10px] font-medium text-amber-600 truncate">
              {hint}
            </p>
          )}
        </div>
        <Icon className={`h-7 w-7 flex-shrink-0 ${color}`} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// JOB ACCEPT ANIMATION
// ═══════════════════════════════════════════════════════════════
function JobAcceptAnimation({ job, onComplete, onSkip }) {
  const [phase, setPhase] = useState("enter");
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase("loading"), 500),
      setTimeout(() => setPhase("loaded"), 1700),
      setTimeout(() => setPhase("departing"), 2150),
      setTimeout(() => setPhase("done"), 2950),
      setTimeout(() => onCompleteRef.current?.(), 3450),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onSkip?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  const earnings = getEarnings(job);
  const hasFee = earnings > 0;
  const wasteType = job?.waste_type || "Waste load";

  const boxes = [
    { x: 64, y: 88, delay: 0.0, spin: -180 },
    { x: 106, y: 88, delay: 0.1, spin: 220 },
    { x: 148, y: 88, delay: 0.2, spin: -160 },
    { x: 85, y: 50, delay: 0.3, spin: 180 },
    { x: 127, y: 50, delay: 0.4, spin: -200 },
  ];

  const isParked =
    phase === "enter" || phase === "loading" || phase === "loaded";

  return (
    <motion.div
      className="ja-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <style>{JA_STYLES}</style>

      <motion.div
        className={`ja-card ja-phase-${phase}`}
        initial={{ opacity: 0, scale: 0.9, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
      >
        <div className="ja-card-header">
          <div className="ja-card-header-left">
            <div className="ja-card-logo">
              <Truck className="ja-card-logo-icon" />
            </div>
            <div>
              <p className="ja-card-title">Accepting Job</p>
              <p className="ja-card-sub">
                #{job?.id} · {wasteType}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="ja-skip"
            onClick={onSkip}
            aria-label="Skip animation"
          >
            Skip
          </button>
        </div>

        <div className="ja-stage">
          <div className="ja-glow" aria-hidden />
          <div className="ja-ground" aria-hidden />

          <div className="ja-truck-center">
            <div className="ja-truck-scale">
              <motion.div
                className="ja-truck"
                initial={{ x: "-420px" }}
                animate={isParked ? { x: 0 } : { x: 420 }}
                transition={{
                  duration:
                    phase === "departing" || phase === "done" ? 0.7 : 0.6,
                  ease:
                    phase === "departing" || phase === "done"
                      ? [0.65, 0, 0.85, 0.15]
                      : [0.22, 1, 0.36, 1],
                }}
              >
                <motion.div
                  className="ja-truck-body"
                  animate={phase === "loaded" ? { y: [0, 7, -3, 0] } : { y: 0 }}
                  transition={{ duration: 0.65, times: [0, 0.3, 0.7, 1] }}
                >
                  <TruckSVG
                    spinning={phase === "enter" || phase === "departing"}
                  />

                  {boxes.map((b, i) => (
                    <motion.div
                      key={i}
                      className="ja-box"
                      style={{ left: b.x, top: b.y, width: 38, height: 38 }}
                      initial={{
                        x: -240 - i * 30,
                        y: -280 - (i % 2) * 50,
                        rotate: b.spin,
                        opacity: 0,
                        scale: 0.4,
                      }}
                      animate={
                        phase === "enter"
                          ? {}
                          : { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }
                      }
                      transition={{
                        delay: phase === "enter" ? 999 : 0.02 + b.delay,
                        duration: 0.7,
                        ease: [0.34, 1.56, 0.64, 1],
                      }}
                    >
                      <BoxSVG />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            </div>
          </div>

          {phase === "departing" && (
            <div className="ja-smoke-layer" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="ja-smoke"
                  initial={{ x: 0, y: 0, opacity: 0.8, scale: 0.4 }}
                  animate={{
                    x: -60 - Math.random() * 80,
                    y: -22 - Math.random() * 40,
                    opacity: 0,
                    scale: 2.2 + Math.random() * 1.2,
                  }}
                  transition={{
                    duration: 1.0 + Math.random() * 0.4,
                    delay: i * 0.05,
                    ease: "easeOut",
                  }}
                />
              ))}
            </div>
          )}

          <AnimatePresence>
            {phase === "loaded" && (
              <motion.div
                className="ja-loaded-badge"
                initial={{ scale: 0.4, y: 16, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
              >
                <CheckCircle className="ja-loaded-badge-icon" />
                <span>Loaded</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {phase === "done" && (
              <motion.div
                className="ja-success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <motion.span
                  className="ja-success-ring"
                  initial={{ scale: 0.5, opacity: 0.9 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                  aria-hidden
                />
                <motion.div
                  className="ja-success-icon"
                  initial={{ scale: 0.4, rotate: -18 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 20 }}
                >
                  <CheckCircle className="ja-success-icon-svg" />
                </motion.div>
                <motion.h2
                  className="ja-success-title"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.08 }}
                >
                  Job Accepted
                </motion.h2>
                <motion.p
                  className="ja-success-sub"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.16 }}
                >
                  {wasteType}
                  {hasFee && ` · ${formatCurrency(earnings)}`}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="ja-card-footer">
          <div className="ja-steps">
            <StepDot
              active={phase === "enter" || phase === "loading"}
              done={phase !== "enter" && phase !== "loading"}
              label="Loading"
            />
            <StepDot
              active={phase === "loaded"}
              done={phase === "departing" || phase === "done"}
              label="Loaded"
            />
            <StepDot
              active={phase === "departing" || phase === "done"}
              done={phase === "done"}
              label="Departing"
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StepDot({ active, done, label }) {
  return (
    <div
      className={`ja-step ${active ? "is-active" : ""} ${
        done ? "is-done" : ""
      }`}
    >
      <span className="ja-step-dot">
        {done ? <Check className="ja-step-check" /> : null}
      </span>
      <span className="ja-step-label">{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TRUCK SVG
// ═══════════════════════════════════════════════════════════════
function TruckSVG({ spinning = false }) {
  const wheelPositions = [80, 180, 270];
  return (
    <svg
      className="ja-truck-svg"
      viewBox="0 0 360 160"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ja-trailer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1F6049" />
          <stop offset="1" stopColor="#0A2B1D" />
        </linearGradient>
        <linearGradient id="ja-cab" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1F6049" />
          <stop offset="1" stopColor="#0A2B1D" />
        </linearGradient>
        <linearGradient id="ja-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D8FFB8" />
          <stop offset="1" stopColor="#7ED957" />
        </linearGradient>
        <radialGradient id="ja-ground-shadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(0,0,0,0.45)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      <ellipse cx="180" cy="152" rx="150" ry="7" fill="url(#ja-ground-shadow)" />
      <rect x="28" y="40" width="196" height="94" rx="9" fill="url(#ja-trailer)" />
      <rect x="32" y="40" width="188" height="6" rx="3" fill="#08221A" />
      <rect x="36" y="48" width="180" height="80" rx="5" fill="#0A1F16" />
      <rect
        x="36"
        y="48"
        width="180"
        height="6"
        rx="3"
        fill="rgba(0,0,0,0.5)"
      />
      <path
        d="M 224 62 L 282 62 Q 314 62 314 92 L 314 116 Q 314 134 296 134 L 224 134 Z"
        fill="url(#ja-cab)"
      />
      <rect x="224" y="62" width="58" height="3" rx="1.5" fill="#2F7A5A" />
      <path
        d="M 232 70 L 282 70 Q 306 70 306 92 L 306 98 L 232 98 Z"
        fill="url(#ja-glass)"
        opacity="0.92"
      />
      <line
        x1="270"
        y1="70"
        x2="282"
        y2="98"
        stroke="#0A2B1D"
        strokeWidth="1.4"
        opacity="0.5"
      />
      <ellipse cx="312" cy="112" rx="3.4" ry="5.5" fill="#FFF7A3" />
      <ellipse
        cx="312"
        cy="112"
        rx="10"
        ry="9"
        fill="#FFF7A3"
        opacity="0.25"
      />
      <rect x="28" y="130" width="286" height="4" rx="2" fill="#061812" />
      {wheelPositions.map((cx, i) => (
        <g
          key={i}
          className={`ja-wheel ${spinning ? "is-spinning" : ""}`}
          style={{ transformOrigin: `${cx}px 134px` }}
        >
          <circle cx={cx} cy="134" r="18" fill="#0A0A0A" />
          <circle cx={cx} cy="134" r="12" fill="#2A2A2A" />
          <circle cx={cx} cy="134" r="4" fill="#666" />
          <rect
            x={cx - 1.5}
            y="120"
            width="3"
            height="14"
            rx="1.5"
            fill="#888"
            opacity="0.6"
          />
        </g>
      ))}
    </svg>
  );
}

function BoxSVG() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true">
      <polygon points="20,2 38,12 20,22 2,12" fill="#E8C79E" />
      <polygon points="2,12 20,22 20,38 2,28" fill="#C49A6C" />
      <polygon points="38,12 20,22 20,38 38,28" fill="#A87D4F" />
      <polygon points="14,7 20,4 26,7 20,11" fill="#8B5E3C" opacity="0.55" />
      <polyline
        points="20,2 38,12 20,22 2,12 20,2"
        fill="none"
        stroke="#7A5230"
        strokeWidth="0.7"
        opacity="0.55"
      />
      <line
        x1="20"
        y1="22"
        x2="20"
        y2="38"
        stroke="#7A5230"
        strokeWidth="0.7"
        opacity="0.55"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const JA_STYLES = `
.ja-overlay {
  position: fixed; inset: 0;
  z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  background: rgba(8, 26, 18, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.ja-card {
  position: relative;
  width: 100%;
  max-width: 520px;
  border-radius: 24px;
  overflow: hidden;
  background: linear-gradient(180deg, #0F4C36 0%, #0A2B1D 100%);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.08) inset,
    0 40px 80px -24px rgba(0,0,0,0.65),
    0 0 0 1px rgba(156,240,107,0.08);
  color: #F6F8F4;
}
.ja-card-header {
  position: relative; z-index: 3;
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.ja-card-header-left { display: flex; align-items: center; gap: 12px; }
.ja-card-logo {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px;
  border-radius: 12px;
  background: rgba(156,240,107,0.14);
  color: #9CF06B;
  box-shadow: 0 1px 0 rgba(255,255,255,0.08) inset;
}
.ja-card-logo-icon { width: 20px; height: 20px; }
.ja-card-title { margin: 0; font-size: 14px; font-weight: 700; letter-spacing: -0.01em; color: #FFFFFF; }
.ja-card-sub { margin: 2px 0 0; font-size: 11.5px; color: rgba(246,248,244,0.6); font-weight: 500; }
.ja-skip {
  padding: 6px 12px;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.85);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 999px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.ja-skip:hover { background: rgba(255,255,255,0.14); color: #fff; border-color: rgba(255,255,255,0.22); }
.ja-skip:focus-visible { outline: 2px solid #9CF06B; outline-offset: 2px; }
.ja-stage {
  position: relative;
  height: 220px;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 90%, rgba(156,240,107,0.16) 0%, transparent 65%);
}
.ja-glow {
  position: absolute; left: 50%; top: 55%;
  width: 520px; height: 220px;
  transform: translate(-50%, -50%);
  background: radial-gradient(ellipse, rgba(156,240,107,0.2) 0%, transparent 62%);
  filter: blur(28px);
  pointer-events: none;
}
.ja-ground {
  position: absolute; left: 8%; right: 8%; top: 78%;
  height: 1.5px;
  background: linear-gradient(90deg, transparent, rgba(156,240,107,0.5), transparent);
  box-shadow: 0 0 16px rgba(156,240,107,0.45);
  pointer-events: none;
}
.ja-truck-center { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
.ja-truck-scale { transform: translateY(-4%) scale(0.78); transform-origin: center center; }
.ja-truck { position: relative; width: 360px; height: 160px; will-change: transform; }
.ja-truck-body { position: absolute; inset: 0; will-change: transform; }
.ja-truck-svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.ja-phase-enter .ja-truck-svg,
.ja-phase-loading .ja-truck-svg,
.ja-phase-loaded .ja-truck-svg { animation: ja-idle 2.2s ease-in-out infinite; }
@keyframes ja-idle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
.ja-wheel.is-spinning { animation: ja-wheel-spin 0.42s linear infinite; }
@keyframes ja-wheel-spin { to { transform: rotate(360deg); } }
.ja-box { position: absolute; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.28)); will-change: transform, opacity; }
.ja-smoke-layer { position: absolute; right: 22%; top: 65%; width: 0; height: 0; pointer-events: none; }
.ja-smoke {
  position: absolute; display: block;
  width: 26px; height: 26px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(220,230,220,0.55), rgba(220,230,220,0) 70%);
}
.ja-loaded-badge {
  position: absolute; left: 50%; top: 12%; transform: translateX(-50%);
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 14px 7px 11px;
  background: linear-gradient(135deg, #9CF06B 0%, #5FCB8E 100%);
  color: #0A2B1D;
  border-radius: 999px;
  font-weight: 800; font-size: 12px; letter-spacing: 0.02em;
  box-shadow: 0 14px 30px -10px rgba(156,240,107,0.55);
  pointer-events: none;
}
.ja-loaded-badge-icon { width: 15px; height: 15px; }
.ja-success {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  display: flex; flex-direction: column; align-items: center;
  text-align: center; color: #F6F8F4;
  pointer-events: none; width: 100%;
}
.ja-success-ring {
  position: absolute; left: 50%; top: 38px;
  width: 96px; height: 96px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2.5px solid #9CF06B;
  pointer-events: none;
}
.ja-success-icon {
  display: flex; align-items: center; justify-content: center;
  width: 68px; height: 68px;
  border-radius: 50%;
  background: linear-gradient(135deg, #9CF06B 0%, #5FCB8E 100%);
  color: #0A2B1D;
  box-shadow:
    0 20px 46px -16px rgba(156,240,107,0.7),
    0 1px 0 rgba(255,255,255,0.4) inset;
  margin-bottom: 12px;
}
.ja-success-icon-svg { width: 34px; height: 34px; stroke-width: 3; }
.ja-success-title { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; margin: 0; color: #FFFFFF; }
.ja-success-sub { margin: 4px 0 0; font-size: 12.5px; font-weight: 600; color: rgba(156,240,107,0.95); letter-spacing: 0.01em; }
.ja-card-footer {
  position: relative; z-index: 3;
  padding: 12px 20px 16px;
  border-top: 1px solid rgba(255,255,255,0.06);
  background: rgba(0,0,0,0.15);
}
.ja-steps { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ja-step {
  display: flex; align-items: center; gap: 8px;
  flex: 1;
  font-size: 11px; font-weight: 600;
  color: rgba(246,248,244,0.4);
  letter-spacing: 0.03em;
  text-transform: uppercase;
  transition: color 0.25s ease;
}
.ja-step.is-active { color: #9CF06B; }
.ja-step.is-done { color: rgba(246,248,244,0.75); }
.ja-step-dot {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  flex-shrink: 0;
  transition: all 0.25s ease;
}
.ja-step.is-active .ja-step-dot {
  background: #9CF06B; border-color: #9CF06B;
  box-shadow: 0 0 0 4px rgba(156,240,107,0.2);
  animation: ja-step-pulse 1.4s ease-in-out infinite;
}
@keyframes ja-step-pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(156,240,107,0.2); }
  50%      { box-shadow: 0 0 0 7px rgba(156,240,107,0.05); }
}
.ja-step.is-done .ja-step-dot { background: #9CF06B; border-color: #9CF06B; }
.ja-step-check { width: 10px; height: 10px; color: #0A2B1D; }
.ja-step-label { font-size: 10.5px; letter-spacing: 0.06em; }

@media (max-width: 560px) {
  .ja-card { max-width: 100%; border-radius: 20px; }
  .ja-stage { height: 190px; }
  .ja-truck-scale { transform: translateY(-4%) scale(0.66); }
  .ja-success-icon { width: 60px; height: 60px; }
  .ja-success-icon-svg { width: 30px; height: 30px; }
  .ja-success-title { font-size: 17px; }
  .ja-success-sub { font-size: 11.5px; }
  .ja-step-label { font-size: 9.5px; }
}

@media (prefers-reduced-motion: reduce) {
  .ja-phase-enter .ja-truck-svg,
  .ja-phase-loading .ja-truck-svg,
  .ja-phase-loaded .ja-truck-svg,
  .ja-wheel.is-spinning,
  .ja-step.is-active .ja-step-dot { animation: none !important; }
}
`;

export { JA_STYLES };