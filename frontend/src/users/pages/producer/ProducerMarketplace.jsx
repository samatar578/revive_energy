// src/users/pages/producer/ProducerMarketplace.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, MapPin, Search, Filter, ChevronDown, RefreshCw, Plus, Eye,
  AlertCircle, Clock, Building2, X, Truck, CreditCard, ShieldCheck,
  Check, ArrowRight, Inbox, Send, Sparkles, User as UserIcon, Zap,
} from "lucide-react";
import { toast } from "react-toastify";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function ProducerMarketplace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [listings, setListings] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [requesting, setRequesting] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [animatingListing, setAnimatingListing] = useState(null);
  const requestResultRef = useRef(null);

  const getToken = () => localStorage.getItem("token");

  const fetchListings = async () => {
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      const response = await fetch(`${API_URL}/producer/available-waste`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Failed to load marketplace");
      setListings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchListings(); }, []);

  const locations = useMemo(
    () => [...new Set(listings.map((i) => i.location).filter(Boolean))],
    [listings]
  );

  const filteredListings = useMemo(() => {
    let f = [...listings];
    if (filterStatus !== "all") f = f.filter((i) => i.status === filterStatus);
    if (filterLocation !== "all") f = f.filter((i) => i.location === filterLocation);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      f = f.filter(
        (i) =>
          i.waste_type?.toLowerCase().includes(q) ||
          i.location?.toLowerCase().includes(q) ||
          i.supplier_name?.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q)
      );
    }
    return f;
  }, [listings, searchQuery, filterStatus, filterLocation]);

  const getAmounts = (item) => ({
    wasteAmount: item.waste_value ?? 0,
    transportFee: item.transport_fee ?? 0,
    platformFee: item.platform_fee ?? 0,
    totalAmount: item.total_amount ?? 0,
  });

  const handleRequest = async (listingId) => {
    const item = listings.find((l) => l.id === listingId);
    if (!item) return;

    setRequesting(listingId);
    requestResultRef.current = null;

    const apiPromise = (async () => {
      try {
        const token = getToken();
        if (!token) throw new Error("Not authenticated");
        const response = await fetch(`${API_URL}/producer/request-waste/${listingId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ message: "I would like to request this waste." }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Request failed");
        return { ok: true };
      } catch (err) {
        return { ok: false, message: err.message };
      }
    })();

    apiPromise.then((result) => { requestResultRef.current = result; });
    setSelectedListing(null);
    setAnimatingListing(item);
  };

  const finishRequestAnimation = (item, result) => {
    setAnimatingListing(null);
    setRequesting(null);
    if (result?.ok) {
      setSuccessData({
        waste_type: item?.waste_type || "Waste",
        location: item?.location || "",
        quantity: `${item?.quantity || 0} ${item?.unit || "kg"}`,
      });
      setShowSuccess(true);
      setListings((prev) => prev.filter((l) => l.id !== item.id));
    } else {
      toast.error(result?.message || "Request failed");
    }
  };

  const handleRequestAnimationComplete = () => {
    const item = animatingListing;
    if (!item) return;
    if (!requestResultRef.current) {
      setTimeout(() => {
        finishRequestAnimation(item, requestResultRef.current || { ok: true });
      }, 250);
      return;
    }
    finishRequestAnimation(item, requestResultRef.current);
  };

  const handleRequestAnimationSkip = () => {
    const item = animatingListing;
    if (!item) return;
    finishRequestAnimation(item, requestResultRef.current || { ok: true });
  };

  const getStatusBadge = (status) => {
    const map = {
      available: "bg-green-100 text-green-700",
      requested: "bg-yellow-100 text-yellow-700",
      approved: "bg-emerald-100 text-emerald-700",
      assigned: "bg-blue-100 text-blue-700",
      collected: "bg-purple-100 text-purple-700",
      delivered: "bg-indigo-100 text-indigo-700",
      completed: "bg-gray-100 text-gray-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return map[status] || "bg-gray-100 text-gray-700";
  };

  const formatCurrency = (a) => `KSh ${Number(a || 0).toLocaleString("en-KE")}`;
  const formatDate = (s) =>
    !s ? "N/A" : new Date(s).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });

  const statusOptions = ["all", "available", "requested", "approved", "assigned", "collected"];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-[#11402D] border-t-[#9CF06B]" />
          <p className="mt-4 text-gray-500">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
        <h3 className="text-xl font-bold text-red-700">Unable to Load Marketplace</h3>
        <p className="mt-2 text-red-600">{error}</p>
        <button onClick={fetchListings} className="mt-6 rounded-xl bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-700">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse available waste and request supply from verified suppliers
          </p>
        </div>
        <button onClick={fetchListings} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total Listings" value={listings.length} />
        <Stat label="Available" value={listings.filter((l) => l.status === "available").length} color="text-green-600" />
        <Stat label="Requested" value={listings.filter((l) => l.status === "requested").length} color="text-yellow-600" />
        <Stat label="Locations" value={locations.length} color="text-blue-600" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by waste type, location, supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-8 text-sm outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Status</option>
              {statusOptions.filter((s) => s !== "all").map((status) => (
                <option key={status} value={status}>{status.toUpperCase()}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          {locations.length > 0 && (
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-8 text-sm outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Locations</option>
                {locations.map((location) => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          )}
          <span className="text-sm text-gray-500">
            {filteredListings.length} of {listings.length}
          </span>
        </div>
      </div>

      {filteredListings.length === 0 ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <Package className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-700">No waste listings found</h3>
          <p className="mt-2 text-gray-500">Try adjusting your filters or check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredListings.map((item) => {
            const amounts = getAmounts(item);
            return (
              <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-base font-bold text-gray-900">{item.waste_type}</h4>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" /> {item.location}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getStatusBadge(item.status)}`}>
                    {item.status || "unknown"}
                  </span>
                </div>
                <div className="relative mt-2 h-24 w-full overflow-hidden rounded-xl bg-gray-100">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.waste_type}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const parent = e.target.parentElement;
                        if (parent) {
                          const ph = parent.querySelector('.placeholder-fallback');
                          if (ph) ph.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className={`placeholder-fallback ${item.image_url ? 'hidden' : 'flex'} absolute inset-0 flex-col items-center justify-center text-gray-400`}
                    style={{ display: item.image_url ? 'none' : 'flex' }}
                  >
                    <Package className="h-8 w-8" />
                    <span className="text-[10px]">No image</span>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm text-gray-700">
                  <InfoSmall icon={Package} label="Qty" value={`${item.quantity} ${item.unit || "kg"}`} />
                  <InfoSmall icon={Building2} label="Supplier" value={item.supplier_name || "Unknown"} />
                  <InfoSmall icon={Clock} label="Listed" value={formatDate(item.created_at)} />
                  <InfoSmall icon={CreditCard} label="Total" value={formatCurrency(amounts.totalAmount)} strong />
                </div>
                <div className="mt-3 rounded-xl bg-[#F4FBF6] p-2 text-[10px] text-gray-600">
                  <div className="flex items-center gap-1.5 font-semibold text-[#11402D]">
                    <ShieldCheck className="h-3.5 w-3.5" /> Escrow protected
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setSelectedListing(item)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="h-3.5 w-3.5" /> Details
                  </button>
                  {item.status === "available" ? (
                    <button
                      onClick={() => handleRequest(item.id)}
                      disabled={requesting === item.id}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#11402D] py-1.5 text-xs font-bold text-white hover:bg-[#0E2A1C] disabled:opacity-70"
                    >
                      {requesting === item.id ? (
                        <>
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" /> Request
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex flex-1 items-center justify-center rounded-xl bg-gray-50 py-1.5 text-xs text-gray-500">
                      Not available
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedListing && (
        <ListingDetailsModal
          listing={selectedListing}
          amounts={getAmounts(selectedListing)}
          requesting={requesting}
          onClose={() => setSelectedListing(null)}
          onRequest={() => handleRequest(selectedListing.id)}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      )}

      <AnimatePresence>
        {animatingListing && (
          <RequestAnimation
            key={animatingListing.id}
            listing={animatingListing}
            onComplete={handleRequestAnimationComplete}
            onSkip={handleRequestAnimationSkip}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccess && successData && (
          <RequestSuccessModal
            data={successData}
            onClose={() => {
              setShowSuccess(false);
              setSuccessData(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CINEMATIC REQUEST ANIMATION — "Energy Transfer"
   Phases: enter → assembling → launching → impact → synced → done
   ═══════════════════════════════════════════════════════════════ */
function RequestAnimation({ listing, onComplete, onSkip }) {
  const [phase, setPhase] = useState("enter");
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase("assembling"), 300),
      setTimeout(() => setPhase("launching"),  1600),
      setTimeout(() => setPhase("impact"),     2400),
      setTimeout(() => setPhase("synced"),     2800),
      setTimeout(() => setPhase("done"),       3250),
      setTimeout(() => onCompleteRef.current?.(), 3750),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onSkip?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  const wasteType = listing?.waste_type || "Waste";
  const supplierName = listing?.supplier_name || "Supplier";

  // ─── Geometry (matches viewBox 520×260) ───
  const START = { x: 80, y: 185 };
  const END   = { x: 440, y: 185 };
  const bezier = (t) => {
    const P0 = START;
    const P1 = { x: 260, y: -110 };
    const P2 = END;
    const mt = 1 - t;
    return {
      x: mt * mt * P0.x + 2 * mt * t * P1.x + t * t * P2.x,
      y: mt * mt * P0.y + 2 * mt * t * P1.y + t * t * P2.y,
    };
  };

  const ARC_X = [0, 0.25, 0.5, 0.75, 1].map((t) => bezier(t).x);
  const ARC_Y = [0, 0.25, 0.5, 0.75, 1].map((t) => bezier(t).y);

  const beamPath = `M ${START.x} ${START.y} Q 260 -110 ${END.x} ${END.y}`;

  const isComposed  = phase === "assembling" || phase === "launching" || phase === "impact" || phase === "synced" || phase === "done";
  const isFlying    = phase === "launching";
  const isImpact    = phase === "impact";
  const isSynced    = phase === "synced" || phase === "done";
  const hasLanded   = phase === "impact" || phase === "synced" || phase === "done";

  // ─── 6 shards that assemble the hexagonal core ───
  const SHARDS = [
    { i: 0, tx:  0,   ty: -22, rot:   0, fromX: -180, fromY: -120 },
    { i: 1, tx:  19,  ty: -11, rot:  60, fromX:  220, fromY: -140 },
    { i: 2, tx:  19,  ty:  11, rot: 120, fromX:  240, fromY:  120 },
    { i: 3, tx:  0,   ty:  22, rot: 180, fromX:  -60, fromY:  160 },
    { i: 4, tx: -19,  ty:  11, rot: 240, fromX: -220, fromY:  120 },
    { i: 5, tx: -19,  ty: -11, rot: 300, fromX: -240, fromY: -120 },
  ];

  const coreAnim = (() => {
    if (phase === "enter" || phase === "assembling") {
      return { x: START.x, y: START.y, scale: 1, opacity: isComposed ? 1 : 0 };
    }
    if (phase === "launching") {
      return {
        x: ARC_X,
        y: ARC_Y,
        scale: [1, 1.15, 1.08, 1, 1],
        opacity: 1,
        transition: { duration: 0.85, ease: [0.4, 0, 0.2, 1], times: [0, 0.25, 0.5, 0.75, 1] },
      };
    }
    return {
      x: END.x,
      y: END.y,
      scale: [1, 1.3, 0.4],
      opacity: [1, 1, 0],
      transition: { duration: 0.5, times: [0, 0.3, 1], ease: "easeOut" },
    };
  })();

  return (
    <motion.div
      className="req-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <style>{REQ_STYLES}</style>

      <motion.div
        className={`req-card ${isImpact ? "req-shaking" : ""}`}
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
      >
        {/* ─── Header ─── */}
        <div className="req-card-header">
          <div className="req-card-header-left">
            <div className="req-card-logo">
              <Zap className="req-card-logo-icon" />
            </div>
            <div>
              <p className="req-card-title">Transmitting Request</p>
              <p className="req-card-sub">#{listing?.id} · {wasteType}</p>
            </div>
          </div>
          <button
            type="button"
            className="req-skip"
            onClick={onSkip}
            aria-label="Skip animation"
          >
            Skip
          </button>
        </div>

        {/* ─── Stage ─── */}
        <div className="req-stage">
          <div className="req-stage-inner">
            {/* Background layers */}
            <div className="req-bg-mesh" aria-hidden />
            <div className="req-bg-orbs" aria-hidden>
              <span className="req-orb req-orb-a" />
              <span className="req-orb req-orb-b" />
              <span className="req-orb req-orb-c" />
            </div>
            <div className="req-vignette" aria-hidden />

            {/* Ambient dust particles */}
            <div className="req-dust" aria-hidden>
              {Array.from({ length: 22 }).map((_, i) => {
                const x = (i * 137.5) % 520;
                const y = (i * 217.3) % 260;
                const d = 4 + ((i * 3) % 6);
                return (
                  <motion.span
                    key={i}
                    className="req-dust-particle"
                    style={{ left: x, top: y }}
                    animate={{
                      y: [y, y - 14, y],
                      opacity: [0.15, 0.55, 0.15],
                    }}
                    transition={{
                      duration: d,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: "easeInOut",
                    }}
                  />
                );
              })}
            </div>

            {/* Beam SVG */}
            <svg
              className="req-beam-svg"
              viewBox="0 0 520 260"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="reqBeamGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#11402D" stopOpacity="0.05" />
                  <stop offset="0.5" stopColor="#9CF06B" />
                  <stop offset="1" stopColor="#5FCB8E" stopOpacity="0.05" />
                </linearGradient>
                <filter id="reqBeamGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="reqImpactFlash" cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
                  <stop offset="0.35" stopColor="#9CF06B" stopOpacity="0.7" />
                  <stop offset="1" stopColor="#9CF06B" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Dashed guide */}
              <path
                d={beamPath}
                fill="none"
                stroke="rgba(156,240,107,0.2)"
                strokeWidth="1.5"
                strokeDasharray="4 9"
                strokeLinecap="round"
              />

              {/* Animated beam fill */}
              <motion.path
                d={beamPath}
                fill="none"
                stroke="url(#reqBeamGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="url(#reqBeamGlow)"
                initial={{ pathLength: 0 }}
                animate={{
                  pathLength: isFlying || hasLanded ? 1 : 0,
                  opacity: isSynced ? [0.9, 1, 0.9] : 1,
                }}
                transition={{
                  pathLength: { duration: 0.85, ease: [0.4, 0, 0.2, 1] },
                  opacity: isSynced
                    ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.3 },
                }}
              />

              {/* Hexagonal shockwave on impact */}
              <AnimatePresence>
                {isImpact && (
                  <>
                    <motion.polygon
                      key="hex1"
                      points="0,-42 36,-21 36,21 0,42 -36,21 -36,-21"
                      fill="none"
                      stroke="#9CF06B"
                      strokeWidth="2.5"
                      style={{ transformOrigin: `${END.x}px ${END.y}px`, transformBox: "fill-box" }}
                      initial={{ x: END.x, y: END.y, scale: 0.2, opacity: 1 }}
                      animate={{ scale: 3.4, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                    />
                    <motion.polygon
                      key="hex2"
                      points="0,-42 36,-21 36,21 0,42 -36,21 -36,-21"
                      fill="none"
                      stroke="#D8FFB8"
                      strokeWidth="1.5"
                      style={{ transformOrigin: `${END.x}px ${END.y}px`, transformBox: "fill-box" }}
                      initial={{ x: END.x, y: END.y, scale: 0.2, opacity: 0.7 }}
                      animate={{ scale: 2.6, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.05, delay: 0.12, ease: "easeOut" }}
                    />
                  </>
                )}
              </AnimatePresence>
            </svg>

            {/* Impact flash */}
            <AnimatePresence>
              {isImpact && (
                <motion.div
                  className="req-flash"
                  style={{ left: END.x, top: END.y }}
                  initial={{ scale: 0.3, opacity: 0.95 }}
                  animate={{ scale: 3.2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                />
              )}
            </AnimatePresence>

            {/* Producer node */}
            <div className="req-node req-node-left">
              <motion.div
                className="req-node-ring req-node-ring-a"
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="req-node-ring req-node-ring-b"
                animate={{ rotate: -360 }}
                transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className={`req-node-core ${isComposed ? "is-charged" : ""}`}
                animate={
                  isSynced
                    ? { scale: [1, 1.08, 1] }
                    : isComposed && phase === "assembling"
                    ? { scale: [1, 1.06, 1] }
                    : { scale: 1 }
                }
                transition={{
                  duration: isSynced ? 1.4 : 0.9,
                  repeat: isSynced || phase === "assembling" ? Infinity : 0,
                  ease: "easeInOut",
                }}
              >
                <UserIcon className="req-node-icon" />
              </motion.div>
              <p className="req-node-label">You</p>
              <p className="req-node-sub">Producer</p>

              {/* Launch shockwave */}
              <AnimatePresence>
                {isFlying && (
                  <>
                    {[0, 0.12, 0.24].map((d, i) => (
                      <motion.span
                        key={i}
                        className="req-node-shock"
                        initial={{ scale: 0.4, opacity: 0.75 }}
                        animate={{ scale: 3.6, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1, delay: d, ease: "easeOut" }}
                      />
                    ))}
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Supplier node */}
            <div className="req-node req-node-right">
              <motion.div
                className="req-node-ring req-node-ring-a"
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="req-node-ring req-node-ring-b"
                animate={{ rotate: -360 }}
                transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className={`req-node-core req-node-core-supplier ${hasLanded ? "is-received" : ""}`}
                animate={
                  isImpact
                    ? { scale: [1, 1.35, 1] }
                    : isSynced
                    ? { scale: [1, 1.08, 1] }
                    : { scale: 1 }
                }
                transition={{
                  duration: isImpact ? 0.5 : isSynced ? 1.4 : 0.3,
                  repeat: isSynced ? Infinity : 0,
                  ease: isImpact ? "easeOut" : "easeInOut",
                }}
              >
                <Building2 className="req-node-icon" />
              </motion.div>
              <p className="req-node-label">{supplierName}</p>
              <p className="req-node-sub">Supplier</p>

              {/* Received checkmark */}
              <AnimatePresence>
                {isSynced && (
                  <motion.div
                    className="req-received-badge"
                    initial={{ scale: 0, opacity: 0, y: 8, rotate: -45 }}
                    animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.1 }}
                  >
                    <Check className="req-received-check" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ─── THE CORE (6 shards) ─── */}
            <motion.div
              className="req-core-wrapper"
              style={{ left: 0, top: 0 }}
              initial={{ x: START.x, y: START.y, opacity: 0 }}
              animate={coreAnim}
              exit={{ opacity: 0 }}
            >
              {/* Orbiting satellite ring around the core */}
              {isComposed && (
                <motion.div
                  className="req-core-orbit"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <span className="req-core-orbit-dot" />
                </motion.div>
              )}

              {/* Glow halo */}
              <motion.span
                className="req-core-glow"
                animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.55, 0.9, 0.55] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden
              />

              {/* 6 shards */}
              {SHARDS.map((s) => (
                <motion.div
                  key={s.i}
                  className="req-shard"
                  style={{
                    left: "50%",
                    top: "50%",
                    transform: `translate(-50%, -50%) rotate(${s.rot}deg)`,
                  }}
                  initial={{
                    x: s.fromX,
                    y: s.fromY,
                    scale: 0,
                    opacity: 0,
                    rotate: s.rot + 180,
                  }}
                  animate={
                    isComposed
                      ? {
                          x: 0,
                          y: 0,
                          scale: 1,
                          opacity: 1,
                          rotate: s.rot,
                        }
                      : {}
                  }
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.05 * s.i,
                  }}
                >
                  <svg viewBox="-12 -18 24 36" width="22" height="34">
                    <polygon
                      points="0,-18 12,0 0,18 -12,0"
                      fill="url(#reqShardGrad)"
                      stroke="rgba(255,255,255,0.35)"
                      strokeWidth="0.8"
                    />
                  </svg>
                </motion.div>
              ))}

              {/* Center core dot */}
              <motion.span
                className="req-core-dot"
                animate={
                  isFlying
                    ? { scale: [1, 1.4, 1], opacity: 1 }
                    : { scale: [0.8, 1.1, 0.8], opacity: [0.7, 1, 0.7] }
                }
                transition={{
                  duration: isFlying ? 0.85 : 1.4,
                  repeat: isFlying ? 0 : Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Comet trail */}
              <AnimatePresence>
                {isFlying && (
                  <>
                    {[0.06, 0.14, 0.22, 0.32, 0.42, 0.54, 0.68].map((d, i) => (
                      <motion.span
                        key={i}
                        className="req-comet-tail"
                        initial={{
                          x: ARC_X,
                          y: ARC_Y,
                          scale: 0,
                          opacity: 0,
                        }}
                        animate={{
                          x: ARC_X,
                          y: ARC_Y,
                          scale: [0, 1 - i * 0.1, 0],
                          opacity: [0, 0.9 - i * 0.1, 0],
                        }}
                        transition={{
                          duration: 0.6,
                          delay: d,
                          ease: "easeOut",
                        }}
                        style={{ width: 10 - i, height: 10 - i }}
                      />
                    ))}
                  </>
                )}
              </AnimatePresence>

              {/* Spark particles trailing behind the comet */}
              <AnimatePresence>
                {isFlying && (
                  <>
                    {[0.04, 0.1, 0.18, 0.26, 0.36, 0.48, 0.6, 0.72].map((d, i) => (
                      <motion.span
                        key={`spark-${i}`}
                        className="req-comet-spark"
                        initial={{ x: ARC_X, y: ARC_Y, scale: 0, opacity: 0 }}
                        animate={{
                          x: ARC_X,
                          y: ARC_Y,
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 0.5,
                          delay: d,
                          ease: "easeOut",
                        }}
                      />
                    ))}
                  </>
                )}
              </AnimatePresence>
            </motion.div>

            {/* SVG defs for shard gradient */}
            <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
              <defs>
                <linearGradient id="reqShardGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#D8FFB8" />
                  <stop offset="0.5" stopColor="#9CF06B" />
                  <stop offset="1" stopColor="#5FCB8E" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Success overlay */}
          <AnimatePresence>
            {phase === "done" && (
              <motion.div
                className="req-success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                <motion.span
                  className="req-success-ring"
                  initial={{ scale: 0.5, opacity: 0.9 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                  aria-hidden
                />
                <motion.div
                  className="req-success-icon"
                  initial={{ scale: 0.4, rotate: -18 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 20 }}
                >
                  <Check className="req-success-icon-svg" />
                </motion.div>
                <motion.h2
                  className="req-success-title"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.08 }}
                >
                  Request Sent
                </motion.h2>
                <motion.p
                  className="req-success-sub"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.16 }}
                >
                  {wasteType} → {supplierName}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── Footer ─── */}
        <div className="req-card-footer">
          <div className="req-steps">
            <StepDot
              active={phase === "enter" || phase === "assembling"}
              done={phase !== "enter" && phase !== "assembling"}
              label="Assemble"
            />
            <StepDot
              active={phase === "launching"}
              done={phase === "impact" || phase === "synced" || phase === "done"}
              label="Transmit"
            />
            <StepDot
              active={phase === "impact" || phase === "synced" || phase === "done"}
              done={phase === "synced" || phase === "done"}
              label="Received"
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StepDot({ active, done, label }) {
  return (
    <div className={`req-step ${active ? "is-active" : ""} ${done ? "is-done" : ""}`}>
      <span className="req-step-dot">
        {done ? <Check className="req-step-check" /> : null}
      </span>
      <span className="req-step-label">{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PREMIUM SUCCESS MODAL (unchanged)
   ═══════════════════════════════════════════════════════════════ */
function RequestSuccessModal({ data, onClose }) {
  const [autoClose, setAutoClose] = useState(true);

  useEffect(() => {
    if (!autoClose) return;
    const timer = setTimeout(onClose, 4500);
    return () => clearTimeout(timer);
  }, [autoClose, onClose]);

  const handleMouseEnter = () => setAutoClose(false);
  const handleMouseLeave = () => setAutoClose(true);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0E2A1C]/40 backdrop-blur-md px-4"
      onClick={onClose}
    >
      <ParticleBurst />

      <motion.div
        initial={{ scale: 0.85, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 12, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[400px] overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_-20px_rgba(17,64,45,0.4)]"
      >
        <div
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background: "linear-gradient(90deg, #9CF06B 0%, #5FCB8E 50%, #9CF06B 100%)" }}
        />

        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-10 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="px-6 pt-8 pb-6">
          <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
            <motion.div
              initial={{ scale: 0.6, opacity: 0.7 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 1.4, ease: "easeOut" }}
              className="absolute inset-0 rounded-full bg-[#9CF06B]/40"
            />
            <motion.div
              initial={{ scale: 0.6, opacity: 0.5 }}
              animate={{ scale: 2.7, opacity: 0 }}
              transition={{ duration: 1.6, ease: "easeOut", delay: 0.2 }}
              className="absolute inset-0 rounded-full bg-[#9CF06B]/30"
            />
            <motion.div
              initial={{ scale: 0.6, opacity: 0.35 }}
              animate={{ scale: 3.1, opacity: 0 }}
              transition={{ duration: 1.8, ease: "easeOut", delay: 0.35 }}
              className="absolute inset-0 rounded-full bg-[#9CF06B]/20"
            />

            <motion.div
              initial={{ scale: 0.3, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 15, delay: 0.05 }}
              className="relative flex h-20 w-20 items-center justify-center rounded-full"
              style={{
                background: "linear-gradient(135deg, #9CF06B 0%, #5FCB8E 100%)",
                boxShadow:
                  "0 10px 30px -8px rgba(156,240,107,0.6), inset 0 -3px 8px rgba(0,0,0,0.08), inset 0 3px 8px rgba(255,255,255,0.3)",
              }}
            >
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <motion.path
                  d="M10 20.5 L17 27 L30 13.5"
                  stroke="#FFFFFF"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.35, duration: 0.5, ease: "easeOut" }}
                />
              </svg>

              <motion.div
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 40, opacity: [0, 0.6, 0] }}
                transition={{ delay: 0.6, duration: 0.9, ease: "easeInOut" }}
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
              >
                <div
                  className="h-full w-6 -skew-x-12"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.75) 50%, transparent 100%)",
                  }}
                />
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center"
          >
            <h3 className="text-[22px] font-bold tracking-tight text-[#0E2A1C]">
              Request Sent
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#5A7060]">
              Your request is now with the supplier.
              <br />
              We'll notify you once they respond.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-5 flex items-center justify-center gap-1.5"
          >
            <StepPill active label="Sent" />
            <Connector />
            <StepPill label="Review" />
            <Connector />
            <StepPill label="Approved" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mt-5 rounded-2xl border border-[#11402D]/8 bg-gradient-to-br from-[#F6FCF8] to-[#EBF7EF] p-4"
          >
            <div className="space-y-2.5">
              <DetailRow icon={Package} label="Waste Type" value={data.waste_type} />
              <DetailRow icon={Truck} label="Quantity" value={data.quantity} />
              {data.location && (
                <DetailRow icon={MapPin} label="Location" value={data.location} />
              )}
            </div>
          </motion.div>

          <motion.a
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            href="/dashboard/my-requests"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#11402D] py-3 text-sm font-semibold text-white transition hover:bg-[#0E2A1C]"
          >
            <Inbox className="h-4 w-4" />
            Track in My Requests
            <ArrowRight className="h-3.5 w-3.5" />
          </motion.a>

          <div className="mt-4 h-0.5 w-full overflow-hidden rounded-full bg-[#11402D]/8">
            {autoClose && (
              <motion.div
                key={autoClose ? "running" : "paused"}
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 4.5, ease: "linear" }}
                className="h-full rounded-full bg-gradient-to-r from-[#9CF06B] to-[#5FCB8E]"
              />
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StepPill({ active, label }) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide transition ${
        active ? "bg-[#11402D] text-white" : "bg-[#11402D]/5 text-[#5A7060]"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#9CF06B]" : "bg-[#5A7060]/40"}`} />
      {label}
    </div>
  );
}

function Connector() {
  return <div className="h-[2px] w-3 rounded-full bg-[#11402D]/10" />;
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-[#5A7060]">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/70">
          <Icon className="h-3 w-3" />
        </div>
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <span className="max-w-[55%] truncate text-[12px] font-bold text-[#0E2A1C]">
        {value}
      </span>
    </div>
  );
}

function ParticleBurst() {
  const particles = Array.from({ length: 14 });
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {particles.map((_, i) => {
        const angle = (i / particles.length) * Math.PI * 2;
        const distance = 140 + Math.random() * 60;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        const size = 4 + Math.random() * 4;
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{ x, y, opacity: [0, 1, 1, 0], scale: [0, 1, 1, 0.4] }}
            transition={{ duration: 1.4, delay: 0.2 + Math.random() * 0.15, ease: "easeOut" }}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              background: i % 3 === 0 ? "#9CF06B" : i % 3 === 1 ? "#5FCB8E" : "#FDE047",
              boxShadow: `0 0 12px rgba(156,240,107,0.6)`,
            }}
          />
        );
      })}
    </div>
  );
}

function Stat({ label, value, color = "text-gray-900" }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function InfoSmall({ icon: Icon, label, value, strong }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 text-gray-500">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <span className={`truncate text-right text-xs ${strong ? "font-bold text-[#11402D]" : "font-medium text-gray-800"}`}>
        {value}
      </span>
    </div>
  );
}

function ListingDetailsModal({ listing, amounts, requesting, onClose, onRequest, formatCurrency, formatDate }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{listing.waste_type}</h2>
            <p className="mt-1 text-sm text-gray-500">Listed on {formatDate(listing.created_at)}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 transition -mt-1 -mr-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          <div className="relative h-40 w-full overflow-hidden rounded-2xl bg-gray-100">
            {listing.image_url ? (
              <img
                src={listing.image_url}
                alt={listing.waste_type}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const parent = e.target.parentElement;
                  if (parent) {
                    const ph = parent.querySelector('.placeholder-fallback');
                    if (ph) ph.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div
              className={`placeholder-fallback ${listing.image_url ? 'hidden' : 'flex'} absolute inset-0 flex-col items-center justify-center text-gray-400`}
              style={{ display: listing.image_url ? 'none' : 'flex' }}
            >
              <Package className="h-12 w-12" />
              <span className="text-sm">No image provided</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-gray-50 p-4">
              <h3 className="mb-3 font-bold text-gray-900">Waste Information</h3>
              <div className="space-y-2 text-sm">
                <Row label="Quantity" value={`${listing.quantity} ${listing.unit || "kg"}`} />
                <Row label="Category" value={listing.category || "General"} />
                <Row label="Location" value={listing.location || "N/A"} />
                <Row label="Supplier" value={listing.supplier_name || "Unknown Supplier"} />
              </div>
            </div>
            <div className="rounded-2xl bg-[#F4FBF6] p-4">
              <h3 className="mb-3 font-bold text-gray-900">Estimated Payment</h3>
              <div className="space-y-2 text-sm">
                <Row label="Waste Amount" value={formatCurrency(amounts.wasteAmount)} />
                <Row label="Transport Fee" value={formatCurrency(amounts.transportFee)} />
                <Row label="Platform Fee" value={formatCurrency(amounts.platformFee)} />
                <div className="border-t border-green-100 pt-2">
                  <Row label="Total Amount" value={formatCurrency(amounts.totalAmount)} strong />
                </div>
              </div>
            </div>
          </div>

          {listing.description && (
            <div className="rounded-2xl border border-gray-100 p-4">
              <h3 className="mb-2 font-bold text-gray-900">Description</h3>
              <p className="text-sm text-gray-600">{listing.description}</p>
            </div>
          )}

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            <div className="flex items-center gap-2 font-bold">
              <Truck className="h-4 w-4" /> Workflow
            </div>
            <p className="mt-1">
              Request waste first. After the supplier approves it, you will pay through M-Pesa from My Requests.
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-3 font-bold text-gray-700 hover:bg-gray-50 transition"
          >
            Close
          </button>
          {listing.status === "available" && (
            <button
              onClick={onRequest}
              disabled={requesting === listing.id}
              className="flex-1 rounded-xl bg-[#11402D] py-3 font-bold text-white hover:bg-[#0E2A1C] disabled:opacity-70 transition"
            >
              {requesting === listing.id ? "Sending..." : "Request Waste"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className={strong ? "font-bold text-[#11402D]" : "font-medium text-gray-800"}>
        {value}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLES — "Energy Transfer"
   ═══════════════════════════════════════════════════════════════ */
const REQ_STYLES = `
/* ─── Backdrop ─────────────────────────────────────────── */
.req-overlay {
  position: fixed; inset: 0;
  z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  background: rgba(8, 26, 18, 0.65);
  backdrop-filter: blur(12px) saturate(1.15);
  -webkit-backdrop-filter: blur(12px) saturate(1.15);
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ─── Card shell ───────────────────────────────────────── */
.req-card {
  position: relative;
  width: 100%;
  max-width: 560px;
  border-radius: 26px;
  overflow: hidden;
  background: linear-gradient(180deg, #0F4C36 0%, #0A2B1D 100%);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.08) inset,
    0 50px 100px -30px rgba(0,0,0,0.75),
    0 0 0 1px rgba(156,240,107,0.1);
  color: #F6F8F4;
}
.req-card.req-shaking {
  animation: req-shake 0.42s cubic-bezier(.36,.07,.19,.97) both;
}
@keyframes req-shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-3px, 0, 0); }
  40%, 60% { transform: translate3d(3px, 0, 0); }
}

/* ─── Header ───────────────────────────────────────────── */
.req-card-header {
  position: relative; z-index: 3;
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.req-card-header-left { display: flex; align-items: center; gap: 12px; }
.req-card-logo {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(156,240,107,0.24), rgba(156,240,107,0.06));
  color: #9CF06B;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.12) inset,
    0 6px 18px -8px rgba(156,240,107,0.5);
}
.req-card-logo-icon { width: 20px; height: 20px; }
.req-card-title { margin: 0; font-size: 14px; font-weight: 700; letter-spacing: -0.01em; color: #FFFFFF; }
.req-card-sub { margin: 2px 0 0; font-size: 11.5px; color: rgba(246,248,244,0.6); font-weight: 500; }

.req-skip {
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
.req-skip:hover { background: rgba(255,255,255,0.14); color: #fff; border-color: rgba(255,255,255,0.22); }
.req-skip:focus-visible { outline: 2px solid #9CF06B; outline-offset: 2px; }

/* ─── Stage ────────────────────────────────────────────── */
.req-stage {
  position: relative;
  height: 260px;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 100%, rgba(156,240,107,0.18) 0%, transparent 65%),
    linear-gradient(180deg, rgba(10,43,29,0.35) 0%, rgba(10,43,29,0.15) 100%);
}
.req-stage-inner {
  position: relative;
  width: 520px;
  height: 260px;
  margin: 0 auto;
  transform-origin: center center;
}

/* Background mesh */
.req-bg-mesh {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(156,240,107,0.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(156,240,107,0.055) 1px, transparent 1px);
  background-size: 26px 26px;
  mask-image: radial-gradient(ellipse at 50% 50%, black 30%, transparent 78%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 50%, black 30%, transparent 78%);
  pointer-events: none;
}

/* Floating background orbs for depth */
.req-bg-orbs { position: absolute; inset: 0; pointer-events: none; }
.req-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(28px);
  opacity: 0.55;
}
.req-orb-a {
  width: 140px; height: 140px;
  left: -30px; top: 60%;
  background: radial-gradient(circle, rgba(156,240,107,0.5), transparent 70%);
  animation: req-drift-a 9s ease-in-out infinite;
}
.req-orb-b {
  width: 180px; height: 180px;
  right: -40px; top: -30%;
  background: radial-gradient(circle, rgba(95,203,142,0.35), transparent 70%);
  animation: req-drift-b 11s ease-in-out infinite;
}
.req-orb-c {
  width: 100px; height: 100px;
  left: 40%; top: 30%;
  background: radial-gradient(circle, rgba(216,255,184,0.3), transparent 70%);
  animation: req-drift-c 13s ease-in-out infinite;
}
@keyframes req-drift-a {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(20px, -20px); }
}
@keyframes req-drift-b {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-30px, 20px); }
}
@keyframes req-drift-c {
  0%, 100% { transform: translate(0, 0); opacity: 0.4; }
  50% { transform: translate(15px, 15px); opacity: 0.65; }
}

.req-vignette {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(10,43,29,0.5) 100%);
  pointer-events: none;
}

/* Ambient dust */
.req-dust { position: absolute; inset: 0; pointer-events: none; }
.req-dust-particle {
  position: absolute;
  width: 2px; height: 2px;
  border-radius: 50%;
  background: #D8FFB8;
  box-shadow: 0 0 6px rgba(216,255,184,0.9);
}

.req-beam-svg {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  z-index: 1;
}

/* ─── Orbital Nodes ───────────────────────────────────── */
.req-node {
  position: absolute;
  top: 185px;
  display: flex; flex-direction: column; align-items: center;
  gap: 5px;
  transform: translate(-50%, -50%);
  z-index: 4;
}
.req-node-left { left: 80px; }
.req-node-right { left: 440px; }

/* Orbital rings around nodes */
.req-node-ring {
  position: absolute;
  top: 25px; left: 50%;
  margin-left: -42px;
  width: 84px; height: 84px;
  border-radius: 50%;
  border: 1px dashed rgba(156,240,107,0.35);
  pointer-events: none;
  transform-origin: center center;
}
.req-node-ring-b {
  width: 100px; height: 100px;
  margin-left: -50px;
  margin-top: -8px;
  border-style: dotted;
  border-color: rgba(156,240,107,0.22);
}

.req-node-core {
  position: relative;
  display: flex; align-items: center; justify-content: center;
  width: 50px; height: 50px;
  border-radius: 15px;
  background: linear-gradient(135deg, #0F4C36 0%, #0A2B1D 100%);
  color: #9CF06B;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.16) inset,
    0 0 0 1.5px rgba(156,240,107,0.35),
    0 12px 30px -10px rgba(156,240,107,0.5);
  transition: box-shadow 0.4s ease, color 0.4s ease;
}
.req-node-core.is-charged {
  color: #D8FFB8;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.22) inset,
    0 0 0 2px rgba(156,240,107,0.75),
    0 0 24px 2px rgba(156,240,107,0.55),
    0 18px 40px -10px rgba(156,240,107,0.7);
}
.req-node-core.is-received {
  color: #D8FFB8;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.24) inset,
    0 0 0 2.5px rgba(156,240,107,0.9),
    0 0 32px 4px rgba(156,240,107,0.65),
    0 20px 44px -10px rgba(156,240,107,0.75);
}
.req-node-core-supplier {
  background: linear-gradient(135deg, #14442F 0%, #0A2B1D 100%);
}
.req-node-icon { width: 22px; height: 22px; position: relative; z-index: 1; }
.req-node-label {
  font-size: 11.5px; font-weight: 700; color: #FFFFFF;
  max-width: 120px; text-align: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-top: 4px;
}
.req-node-sub {
  font-size: 9px; font-weight: 700;
  color: rgba(246,248,244,0.45);
  text-transform: uppercase; letter-spacing: 0.14em;
}

/* Node launch shockwave */
.req-node-shock {
  position: absolute;
  top: 25px; left: 50%;
  width: 50px; height: 50px;
  margin-left: -25px;
  margin-top: -25px;
  border-radius: 50%;
  border: 2px solid #9CF06B;
  pointer-events: none;
}

/* Received check badge */
.req-received-badge {
  position: absolute;
  top: -4px; right: -4px;
  display: flex; align-items: center; justify-content: center;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #9CF06B 0%, #5FCB8E 100%);
  box-shadow:
    0 6px 14px -4px rgba(156,240,107,0.65),
    0 0 0 2.5px #0A2B1D;
  z-index: 6;
}
.req-received-check { width: 12px; height: 12px; color: #0A2B1D; stroke-width: 3; }

/* ─── Energy Core (6 shards) ──────────────────────────── */
.req-core-wrapper {
  position: absolute;
  width: 60px; height: 60px;
  margin-left: -30px;
  margin-top: -30px;
  z-index: 5;
  will-change: transform, opacity;
  pointer-events: none;
}

.req-core-glow {
  position: absolute;
  inset: -22px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(156,240,107,0.55) 0%, transparent 65%);
  pointer-events: none;
}

.req-core-orbit {
  position: absolute;
  inset: -14px;
  border-radius: 50%;
  border: 1px solid rgba(156,240,107,0.45);
  pointer-events: none;
}
.req-core-orbit-dot {
  position: absolute;
  top: -3px; left: 50%;
  margin-left: -3px;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #D8FFB8;
  box-shadow: 0 0 10px rgba(216,255,184,0.95);
}

.req-shard {
  position: absolute;
  width: 22px; height: 34px;
  transform-origin: center center;
  filter: drop-shadow(0 0 8px rgba(156,240,107,0.55));
  will-change: transform, opacity;
}
.req-shard svg { display: block; }

.req-core-dot {
  position: absolute;
  top: 50%; left: 50%;
  width: 12px; height: 12px;
  margin-left: -6px;
  margin-top: -6px;
  border-radius: 50%;
  background: radial-gradient(circle, #FFFFFF 0%, #D8FFB8 55%, transparent 100%);
  box-shadow: 0 0 18px rgba(216,255,184,0.95);
}

/* Comet trail (fading dots behind the core) */
.req-comet-tail {
  position: absolute;
  top: 50%; left: 50%;
  width: 10px; height: 10px;
  margin-left: -5px;
  margin-top: -5px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(216,255,184,0.95) 0%, rgba(156,240,107,0.5) 55%, transparent 100%);
  filter: blur(0.5px);
  pointer-events: none;
}

/* Spark particles */
.req-comet-spark {
  position: absolute;
  top: 50%; left: 50%;
  width: 5px; height: 5px;
  margin-left: -2.5px;
  margin-top: -2.5px;
  border-radius: 50%;
  background: #FFFFFF;
  box-shadow: 0 0 12px #D8FFB8, 0 0 4px #FFFFFF;
  pointer-events: none;
}

/* Impact flash */
.req-flash {
  position: absolute;
  width: 40px; height: 40px;
  margin-left: -20px;
  margin-top: -20px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(156,240,107,0.55) 40%, transparent 70%);
  filter: blur(6px);
  pointer-events: none;
  z-index: 3;
}

/* ─── Success overlay ──────────────────────────────────── */
.req-success {
  position: absolute;
  left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  display: flex; flex-direction: column; align-items: center;
  text-align: center;
  color: #F6F8F4;
  pointer-events: none;
  width: 100%;
  z-index: 8;
}
.req-success-ring {
  position: absolute;
  left: 50%; top: 38px;
  width: 96px; height: 96px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2.5px solid #9CF06B;
  pointer-events: none;
}
.req-success-icon {
  display: flex; align-items: center; justify-content: center;
  width: 68px; height: 68px;
  border-radius: 50%;
  background: linear-gradient(135deg, #9CF06B 0%, #5FCB8E 100%);
  color: #0A2B1D;
  box-shadow:
    0 20px 46px -16px rgba(156,240,107,0.75),
    0 1px 0 rgba(255,255,255,0.4) inset;
  margin-bottom: 12px;
}
.req-success-icon-svg { width: 34px; height: 34px; stroke-width: 3; }
.req-success-title {
  font-size: 20px; font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
  color: #FFFFFF;
}
.req-success-sub {
  margin: 4px 0 0;
  font-size: 12.5px;
  font-weight: 600;
  color: rgba(156,240,107,0.95);
  letter-spacing: 0.01em;
}

/* ─── Footer / steps ───────────────────────────────────── */
.req-card-footer {
  position: relative;
  z-index: 3;
  padding: 12px 20px 16px;
  border-top: 1px solid rgba(255,255,255,0.06);
  background: rgba(0,0,0,0.15);
}
.req-steps {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px;
}
.req-step {
  display: flex; align-items: center; gap: 8px;
  flex: 1;
  font-size: 11px;
  font-weight: 600;
  color: rgba(246,248,244,0.4);
  letter-spacing: 0.03em;
  text-transform: uppercase;
  transition: color 0.25s ease;
}
.req-step.is-active { color: #9CF06B; }
.req-step.is-done { color: rgba(246,248,244,0.75); }
.req-step-dot {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  flex-shrink: 0;
  transition: all 0.25s ease;
}
.req-step.is-active .req-step-dot {
  background: #9CF06B;
  border-color: #9CF06B;
  box-shadow: 0 0 0 4px rgba(156,240,107,0.2);
  animation: req-step-pulse 1.4s ease-in-out infinite;
}
@keyframes req-step-pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(156,240,107,0.2); }
  50%      { box-shadow: 0 0 0 7px rgba(156,240,107,0.05); }
}
.req-step.is-done .req-step-dot {
  background: #9CF06B;
  border-color: #9CF06B;
}
.req-step-check { width: 10px; height: 10px; color: #0A2B1D; }
.req-step-label { font-size: 10.5px; letter-spacing: 0.06em; }

/* ─── Responsive ───────────────────────────────────────── */
@media (max-width: 620px) {
  .req-card { max-width: 100%; border-radius: 20px; }
  .req-stage { height: 230px; }
  .req-stage-inner {
    transform: scale(0.78);
    transform-origin: center center;
    height: 260px;
  }
  .req-success-icon { width: 60px; height: 60px; }
  .req-success-icon-svg { width: 30px; height: 30px; }
  .req-success-title { font-size: 17px; }
  .req-success-sub { font-size: 11.5px; }
  .req-step-label { font-size: 9.5px; }
}
@media (max-width: 420px) {
  .req-stage-inner { transform: scale(0.66); }
  .req-stage { height: 200px; }
}

/* ─── Reduced motion ───────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .req-step.is-active .req-step-dot { animation: none !important; }
  .req-orb, .req-dust-particle { animation: none !important; }
}
`;

export { REQ_STYLES };