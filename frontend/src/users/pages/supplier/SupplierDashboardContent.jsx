// src/users/pages/supplier/SupplierDashboardContent.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';   // ← added useNavigate
import {
  Package,
  Truck,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Eye,
  DollarSign,
  FileText,
  Calendar,
  MapPin,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Bell,
  ArrowRight,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const COLORS = ['#11402D', '#34D399', '#60A5FA', '#FBBF24', '#F59E0B', '#EF4444', '#8B5CF6'];

const SupplierDashboardContent = () => {
  const navigate = useNavigate();   // ← added
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    stats: {
      myListings: 0,
      collectionRequests: 0,
      pendingCollections: 0,
      completedCollections: 0,
    },
    recentListings: [],
    upcomingPickups: [],
    notifications: [],
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ─── auth-aware fetch helper ─────────────────────────────
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        redirectToLogin('You are not signed in.');
        return;
      }

      const response = await fetch(`${API_URL}/supplier/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // ── Handle 401 (expired / invalid JWT) ──
      if (response.status === 401) {
        redirectToLogin('Your session has expired. Please sign in again.');
        return;
      }

      // ── Handle 403 (valid token, wrong role) ──
      if (response.status === 403) {
        setError('You do not have permission to view this dashboard.');
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || `Failed to load dashboard (${response.status})`);
      }

      const data = await response.json();
      setDashboardData({
        stats: {
          myListings: data?.stats?.myListings ?? 0,
          collectionRequests: data?.stats?.collectionRequests ?? 0,
          pendingCollections: data?.stats?.pendingCollections ?? 0,
          completedCollections: data?.stats?.completedCollections ?? 0,
          // keep any additional fields the backend sends
          ...data?.stats,
        },
        recentListings: data?.recentListings ?? [],
        upcomingPickups: data?.upcomingPickups ?? [],
        notifications: data?.notifications ?? [],
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      // Network failure vs server error
      setError(
        err.name === 'TypeError'
          ? 'Cannot reach the server. Please check your connection.'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Clear stale auth and bounce to login ────────────────
  const redirectToLogin = (reason) => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    sessionStorage.setItem('authRedirectReason', reason || '');
    navigate('/login', { replace: true });
  };

  // ─── Chart Data ──────────────────────────────────────────────
  const wasteTypeData = dashboardData.recentListings.reduce((acc, item) => {
    const existing = acc.find((d) => d.name === item.waste_type);
    if (existing) {
      existing.value += Number(item.quantity);
    } else {
      acc.push({ name: item.waste_type, value: Number(item.quantity) });
    }
    return acc;
  }, []);

  // Sample trend data (in real app, fetch from backend)
  const trendData = [
    { day: 'Mon', listings: 2, pickups: 1 },
    { day: 'Tue', listings: 4, pickups: 3 },
    { day: 'Wed', listings: 3, pickups: 2 },
    { day: 'Thu', listings: 5, pickups: 4 },
    { day: 'Fri', listings: 7, pickups: 6 },
    { day: 'Sat', listings: 3, pickups: 2 },
    { day: 'Sun', listings: 1, pickups: 1 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#11402D] border-t-[#9CF06B] rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Loading supplier dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-2xl mx-auto">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="font-display text-xl font-bold text-red-700">Unable to Load Dashboard</h3>
        <p className="text-red-600 mt-2">{error}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium"
          >
            Try Again
          </button>
          <button
            onClick={() => redirectToLogin('Signed out manually.')}
            className="px-6 py-3 bg-white border border-red-200 text-red-700 rounded-xl hover:bg-red-50 transition font-medium"
          >
            Sign In Again
          </button>
        </div>
      </div>
    );
  }

  const { stats, recentListings, upcomingPickups, notifications } = dashboardData;

  return (
    <div className="space-y-6">
      {/* ─── STAT CARDS ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Total Listings"
          value={stats.myListings}
          color="emerald"
        />
        <StatCard
          icon={Truck}
          label="Collection Requests"
          value={stats.collectionRequests}
          color="blue"
        />
        <StatCard
          icon={Clock}
          label="Pending Collections"
          value={stats.pendingCollections}
          color="yellow"
        />
        <StatCard
          icon={CheckCircle}
          label="Completed"
          value={stats.completedCollections}
          color="green"
        />
      </div>

      {/* ─── CHARTS ROW ──────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pie Chart – Waste Type Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-gray-900 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-[#11402D]" />
              Waste Type Distribution
            </h3>
            <span className="text-xs text-gray-400">by quantity (kg)</span>
          </div>
          {wasteTypeData.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">No data to display</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={wasteTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name }) => name}
                >
                  {wasteTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} kg`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Area/Bar Chart – Activity Trend */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#11402D]" />
              Weekly Activity
            </h3>
            <span className="text-xs text-gray-400">last 7 days</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="listings"
                stackId="1"
                stroke="#11402D"
                fill="#11402D"
                fillOpacity={0.3}
                name="Listings"
              />
              <Area
                type="monotone"
                dataKey="pickups"
                stackId="1"
                stroke="#34D399"
                fill="#34D399"
                fillOpacity={0.3}
                name="Pickups"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── UPCOMING PICKUPS ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-display font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#11402D]" />
            Upcoming Pickups
          </h3>
          <Link to="/dashboard/tracking" className="text-sm text-[#11402D] hover:underline">
            View All
          </Link>
        </div>
        {upcomingPickups.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No upcoming pickups scheduled.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {upcomingPickups.map((pickup) => (
              <div key={pickup.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{pickup.waste_type}</p>
                    <p className="text-sm text-gray-500">
                      {pickup.quantity} {pickup.unit || 'kg'} · {pickup.location}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(pickup.pickup_date).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-400">{pickup.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── TABLE: Recent Listings ──────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-display font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#11402D]" />
            Recent Listings
          </h3>
          <Link to="/dashboard/listings" className="text-sm text-[#11402D] hover:underline">
            View All
          </Link>
        </div>
        {recentListings.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No listings yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 font-medium">
                <tr>
                  <th className="px-6 py-3 text-left">Waste Type</th>
                  <th className="px-6 py-3 text-left">Quantity</th>
                  <th className="px-6 py-3 text-left">Location</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentListings.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-3 font-medium text-gray-900">{item.waste_type}</td>
                    <td className="px-6 py-3 text-gray-700">
                      {item.quantity} {item.unit || 'kg'}
                    </td>
                    <td className="px-6 py-3 text-gray-700">{item.location}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          item.status === 'available'
                            ? 'bg-green-100 text-green-700'
                            : item.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── NOTIFICATIONS ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-display font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#11402D]" />
            Notifications
          </h3>
          <Link to="/dashboard/notifications" className="text-sm text-[#11402D] hover:underline">
            View All
          </Link>
        </div>
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No new notifications.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.slice(0, 5).map((notif) => (
              <div key={notif.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50/50 transition">
                <div className="w-8 h-8 rounded-full bg-[#11402D]/10 flex items-center justify-center text-[#11402D] flex-shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                  <p className="text-sm text-gray-500 truncate">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(notif.created_at).toLocaleDateString()}
                  </p>
                </div>
                {!notif.is_read && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── QUICK ACTIONS ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-display font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ActionButton to="/dashboard/post-waste" icon={Plus} label="Post Waste" color="emerald" />
          <ActionButton to="/dashboard/requests" icon={Eye} label="View Requests" color="blue" />
          <ActionButton to="/dashboard/tracking" icon={Truck} label="Track Collection" color="yellow" />
          <ActionButton to="/dashboard/payments" icon={DollarSign} label="View Payments" color="green" />
        </div>
      </div>
    </div>
  );
};

// ─── Sub‑components ─────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, color }) => {
  const colorMap = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100' },
  };
  const style = colorMap[color] || colorMap.blue;

  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border ${style.border}`}>
      <div className={`w-10 h-10 rounded-xl ${style.bg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${style.text}`} />
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
};

const ActionButton = ({ to, icon: Icon, label, color }) => {
  const colorMap = {
    emerald: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-50 hover:bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-600',
    green: 'bg-green-50 hover:bg-green-100 text-green-600',
  };
  const style = colorMap[color] || colorMap.blue;

  return (
    <Link to={to} className={`flex items-center gap-3 p-4 rounded-xl ${style} transition`}>
      <Icon className="w-5 h-5" />
      <span className="font-medium text-gray-900 text-sm">{label}</span>
    </Link>
  );
};

export default SupplierDashboardContent;