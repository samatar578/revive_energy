// src/users/pages/producer/ProducerMarketplace.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, MapPin, Search, Filter, ChevronDown, RefreshCw, Plus, Eye,
  AlertCircle, Clock, Building2, X, Truck, CreditCard, ShieldCheck,
  Check, ArrowRight, Inbox,
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
    setRequesting(listingId);
    const item = listings.find((l) => l.id === listingId);
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

      setSuccessData({
        waste_type: item?.waste_type || "Waste",
        location: item?.location || "",
        quantity: `${item?.quantity || 0} ${item?.unit || "kg"}`,
      });
      setShowSuccess(true);

      setListings((prev) => prev.filter((l) => l.id !== listingId));
      setSelectedListing(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRequesting(null);
    }
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
   PREMIUM SUCCESS MODAL — animated SVG check, step tracker,
   particle burst, and a CTA to jump straight to My Requests
   ═══════════════════════════════════════════════════════════════ */
function RequestSuccessModal({ data, onClose }) {
  const [autoClose, setAutoClose] = useState(true);

  useEffect(() => {
    if (!autoClose) return;
    const timer = setTimeout(onClose, 4500);
    return () => clearTimeout(timer);
  }, [autoClose, onClose]);

  // Pause auto-close when hovering over the card
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
      {/* Particle burst on mount */}
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
        {/* Top accent gradient */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background: "linear-gradient(90deg, #9CF06B 0%, #5FCB8E 50%, #9CF06B 100%)" }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-10 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="px-6 pt-8 pb-6">
          {/* ─── Animated SVG checkmark with rings ────────────── */}
          <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
            {/* Expanding ripple rings */}
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

            {/* Main circle with soft inner shadow */}
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
              {/* SVG animated checkmark */}
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

              {/* Shine sweep */}
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

          {/* ─── Title & subtitle ─────────────────────────────── */}
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

          {/* ─── Step tracker ─────────────────────────────────── */}
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

          {/* ─── Detail card ──────────────────────────────────── */}
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

          {/* ─── CTA button ───────────────────────────────────── */}
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

          {/* ─── Auto-dismiss progress bar ──────────────────────── */}
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

/* ─── Small helper components ──────────────────────────────────── */

function StepPill({ active, label }) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide transition ${
        active
          ? "bg-[#11402D] text-white"
          : "bg-[#11402D]/5 text-[#5A7060]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-[#9CF06B]" : "bg-[#5A7060]/40"
        }`}
      />
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

/* ─── Particle burst around the success card ──────────────────── */
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
            animate={{
              x,
              y,
              opacity: [0, 1, 1, 0],
              scale: [0, 1, 1, 0.4],
            }}
            transition={{
              duration: 1.4,
              delay: 0.2 + Math.random() * 0.15,
              ease: "easeOut",
            }}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              background:
                i % 3 === 0
                  ? "#9CF06B"
                  : i % 3 === 1
                  ? "#5FCB8E"
                  : "#FDE047",
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