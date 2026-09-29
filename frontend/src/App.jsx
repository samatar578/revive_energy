// src/App.jsx
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

// ─── Import ScrollToTop ──────────────────────────────────────
import ScrollToTop from "./component/ScrollToTop";

// ─── Accessibility Widget ────────────────────────────────────
import AccessibilityWidget from "./component/AccessibilityWidget";

import Navbar from "./component/Navbar";
import Home from "./component/Home";
import Marketplace from "./component/Marketplace";
import Solutions from "./component/Solutions";
import OrganicWasteSolution from "./component/OrganicWasteSolution";
import AgriculturalWasteSolution from "./component/AgriculturalWasteSolution";
import IndustrialWasteSolution from "./component/IndustrialWasteSolution";
import PlasticRecyclingSolution from "./component/PlasticRecyclingSolution";
import Impact from "./component/Impact";
import HowItWorks from "./component/HowItWorks";
import About from "./component/About";
import Resources from "./component/Resources";
import Partners from "./component/Partners";
import Contact from "./component/Contact";
import Login from "./component/Login";
import Signup from "./component/Signup";
import SignupWasteSupplier from "./component/SignupWasteSupplier";
import SignupEnergyProducer from "./component/SignupEnergyProducer";
import WelcomeSplash from "./component/WelcomeSplash";
import FAQ from "./component/FAQ";

import AdminLogin from "./admin/pages/AdminLogin";
import AdminDashboard from "./admin/layout/AdminDashboard";

// ─── Admin Pages ──────────────────────────────────────────────
import AdminDashboardOverview from "./admin/pages/AdminDashboardOverview";
import WasteSources from "./admin/pages/WasteSources";
import WasteListings from "./admin/pages/WasteListings";
import ProcessingPlants from "./admin/pages/ProcessingPlants";
import Transporters from "./admin/pages/Transporters";
import Collections from "./admin/pages/Collections";
import Users from "./admin/pages/Users";
import Companies from "./admin/pages/Companies";
import Payments from "./admin/pages/Payments";
import Analytics from "./admin/pages/Analytics";
import AdminImpactReports from "./admin/pages/AdminImpactReports";
import CarbonCredits from "./admin/pages/CarbonCredits";
import Reviews from "./admin/pages/Reviews";
import Support from "./admin/pages/Support";
import AdminMessages from "./admin/pages/Messages";
import Settings from "./admin/pages/Settings";
import AdminWithdrawals from "./admin/pages/Withdrawals";
import AdminWallet from "./admin/pages/Wallet";
import Disputes from "./admin/pages/Disputes";
import PricingSettings from "./admin/pages/PricingSettings";
import AuditLogs from "./admin/pages/AuditLogs";
import AdminPartnerships from "./admin/pages/AdminPartnerships";
import PlatformTransaction from "./admin/pages/PlatformTransaction";
import PlatformWithdrawals from "./admin/pages/PlatformWithdrawals";
import PlatformWallet from "./admin/pages/PlatformWallet";
import AdminProfile from "./admin/pages/AdminProfile";

import UserDashboard from "./users/layout/UserDashboard";

// Supplier pages
import SupplierDashboardContent from "./users/pages/supplier/SupplierDashboardContent";
import PostWaste from "./users/pages/supplier/PostWaste";
import MyWasteListings from "./users/pages/supplier/MyWasteListings";
import CollectionRequests from "./users/pages/supplier/CollectionRequests";
import CollectionTracking from "./users/pages/supplier/CollectionTracking";

// Producer pages
import ProducerDashboardContent from "./users/pages/producer/ProducerDashboardContent";
import ProducerMarketplace from "./users/pages/producer/ProducerMarketplace";
import MyRequests from "./users/pages/producer/MyRequests";
import IncomingDeliveries from "./users/pages/producer/IncomingDeliveries";

// Transporter pages
import TransportDashboardContent from "./users/pages/transporter/TransportDashboardContent";
import AvailableJobs from "./users/pages/transporter/AvailableJobs";
import AcceptedJobs from "./users/pages/transporter/AcceptedJobs";
import ActiveDeliveries from "./users/pages/transporter/ActiveDeliveries";
import RouteTracking from "./users/pages/transporter/RouteTracking";
import Earnings from "./users/pages/transporter/Earnings";

// Shared pages
import Messages from "./users/pages/shared/Messages";
import Notifications from "./users/pages/shared/Notifications";
import ProfileSettings from "./users/pages/shared/ProfileSettings";
import PaymentInvoices from "./users/pages/shared/PaymentInvoices";
import InvoicePaymentDetails from "./users/pages/shared/InvoicePaymentDetails";
import UserSupport from "./users/pages/shared/Support";
import Wallet from "./users/pages/shared/Wallet";
import Withdrawals from "./users/pages/shared/Withdrawals";

import UserDisputes from "./users/pages/shared/UserDisputes";

function DashboardIndex() {
  const [role, setRole] = useState("supplier");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setRole(user.role || user.user_role || "supplier");
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  if (role === "producer" || role === "energy-producer") {
    return <ProducerDashboardContent />;
  }
  if (role === "transporter" || role === "transport-partner") {
    return <TransportDashboardContent />;
  }
  return <SupplierDashboardContent />;
}

function App() {
  const [showSplash, setShowSplash] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    const splashShown = sessionStorage.getItem("revive_splash_shown");
    if (splashShown === "true") {
      setShowSplash(false);
    } else {
      setShowSplash(true);
      sessionStorage.setItem("revive_splash_shown", "true");
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#F6F8F4]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#11402D] border-t-[#9CF06B]" />
          <p className="mt-4 text-sm text-[#5A7060]">Loading...</p>
        </div>
      </div>
    );
  }

  if (showSplash) {
    return <WelcomeSplash onFinish={() => setShowSplash(false)} />;
  }

  return (
    <BrowserRouter>
      {/* ─── Scroll to top on every route change ────────────── */}
      <ScrollToTop />

      <Routes>
        <Route path="/" element={<><Navbar /><Home /></>} />
        <Route path="/home" element={<><Navbar /><Home /></>} />
        <Route path="/marketplace" element={<><Navbar /><Marketplace /></>} />
        <Route path="/how-it-works" element={<><Navbar /><HowItWorks /></>} />
        <Route path="/about" element={<><Navbar /><About /></>} />
        <Route path="/resources" element={<><Navbar /><Resources /></>} />
        <Route path="/partners" element={<><Navbar /><Partners /></>} />
        <Route path="/contact" element={<><Navbar /><Contact /></>} />
        <Route path="/login" element={<><Navbar /><Login /></>} />
        <Route path="/signup" element={<><Navbar /><Signup /></>} />

        <Route path="/faq" element={<><Navbar /><FAQ /></>} />

        <Route path="/signup/waste-supplier" element={<><Navbar /><SignupWasteSupplier /></>} />
        <Route path="/signup/energy-producer" element={<><Navbar /><SignupEnergyProducer /></>} />

        <Route path="/solutions" element={<><Navbar /><Solutions /></>} />
        <Route path="/solutions/organic-waste" element={<><Navbar /><OrganicWasteSolution /></>} />
        <Route path="/solutions/agricultural-waste" element={<><Navbar /><AgriculturalWasteSolution /></>} />
        <Route path="/solutions/industrial-waste" element={<><Navbar /><IndustrialWasteSolution /></>} />
        <Route path="/solutions/plastic-recycling" element={<><Navbar /><PlasticRecyclingSolution /></>} />
        <Route path="/impact" element={<><Navbar /><Impact /></>} />

        <Route path="/adminlogin" element={<><Navbar /><AdminLogin /></>} />

        {/* ─── Admin Routes ────────────────────────────────────── */}
        <Route path="/admin" element={<AdminDashboard />}>
          <Route index element={<AdminDashboardOverview />} />
          <Route path="waste-sources" element={<WasteSources />} />
          <Route path="waste-listings" element={<WasteListings />} />
          <Route path="processing-plants" element={<ProcessingPlants />} />
          <Route path="transporters" element={<Transporters />} />
          <Route path="collections" element={<Collections />} />
          <Route path="users" element={<Users />} />
          <Route path="companies" element={<Companies />} />
          <Route path="payments" element={<Payments />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="impact-reports" element={<AdminImpactReports />} />
          <Route path="carbon-credits" element={<CarbonCredits />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="support" element={<Support />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="settings" element={<Settings />} />
          <Route path="withdrawals" element={<AdminWithdrawals />} />
          <Route path="wallet" element={<AdminWallet />} />
          <Route path="disputes" element={<Disputes />} />
          <Route path="pricing" element={<PricingSettings />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="partnerships" element={<AdminPartnerships />} />
          <Route path="platform-transactions" element={<PlatformTransaction />} />
          <Route path="platform-withdrawals" element={<PlatformWithdrawals />} />
          <Route path="platform-wallet" element={<PlatformWallet />} />
          <Route path="profile" element={<AdminProfile />} />
        </Route>

        {/* ─── User Dashboard Routes ───────────────────────────── */}
        <Route path="/dashboard" element={<UserDashboard />}>
          <Route index element={<DashboardIndex />} />

          {/* Supplier routes */}
          <Route path="post-waste" element={<PostWaste />} />
          <Route path="listings" element={<MyWasteListings />} />
          <Route path="requests" element={<CollectionRequests />} />
          <Route path="tracking" element={<CollectionTracking />} />

          {/* Producer routes */}
          <Route path="marketplace" element={<ProducerMarketplace />} />
          <Route path="my-requests" element={<MyRequests />} />
          <Route path="incoming-deliveries" element={<IncomingDeliveries />} />

          {/* Transporter routes */}
          <Route path="jobs" element={<AvailableJobs />} />
          <Route path="accepted-jobs" element={<AcceptedJobs />} />
          <Route path="deliveries" element={<ActiveDeliveries />} />
          <Route path="routes" element={<RouteTracking />} />
          <Route path="earnings" element={<Earnings />} />

          {/* Shared routes */}
          <Route path="payments" element={<PaymentInvoices />} />
          <Route path="invoices" element={<PaymentInvoices />} />
          <Route path="payments/details/:paymentId" element={<InvoicePaymentDetails />} />
          <Route path="messages" element={<Messages />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<ProfileSettings />} />
          <Route path="support" element={<UserSupport />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="withdrawals" element={<Withdrawals />} />
          <Route path="disputes" element={<UserDisputes />} />
        </Route>
      </Routes>

      {/* ─── Accessibility Widget (available on every page) ─── */}
      <AccessibilityWidget />
    </BrowserRouter>
  );
}

export default App;