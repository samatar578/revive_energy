// src/component/Login.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  Recycle,
  Leaf,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Truck,
  Zap,
  Building2,
  MapPin,
  Utensils,
  Factory,
  Package,
  User,
  Phone,
  Briefcase,
  AlertCircle,
  X,
  Check,
  Apple,
  ShoppingBag,
  TreePine,
  Droplets,
  Gauge,
  Navigation,
  Award,
  RefreshCw,
  Clock,
  Globe,
  Users,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

import ForgotPasswordModal from "./ForgotPasswordModal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const signupOpenedRef = useRef(false);

  // ─── Login state ──────────────────────────────────────────
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ─── Signup state ─────────────────────────────────────────
  const [showSignup, setShowSignup] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState("waste-supplier");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupError, setSignupError] = useState("");

  const [signupData, setSignupData] = useState({
    full_name: "",
    business_name: "",
    business_type: "",
    location: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    wasteTypes: [],
    energyTypes: [],
    vehicleTypes: [],
    capacity: "",
    fleetSize: "",
    coverageArea: "",
    licenseNumber: "",
    referralCode: "",
    country: "KE",
    termsAccepted: false,
  });

  const [emailCode, setEmailCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailTimer, setEmailTimer] = useState(0);
  const [resendEmailDisabled, setResendEmailDisabled] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // ─── Static option data ──────────────────────────────────
  const roleOptions = [
    {
      id: "waste-supplier",
      icon: Building2,
      label: "Waste Supplier",
      description: "Hotels, Farms, Markets, Factories, Restaurants",
      businessTypes: ["Hotel", "Farm", "Market", "Factory", "Restaurant", "Other"],
    },
    {
      id: "energy-producer",
      icon: Zap,
      label: "Energy Producer",
      description: "Biogas Plants, Recycling Companies, WtE Plants",
      businessTypes: [
        "Biogas Plant",
        "Recycling Company",
        "Biomass Company",
        "Waste-to-Energy Plant",
        "Other",
      ],
    },
    {
      id: "transport-partner",
      icon: Truck,
      label: "Transport Partner",
      description: "Logistics Companies, Truck Owners, Collection Agents",
      businessTypes: ["Logistics Company", "Truck Owner", "Collection Agent", "Other"],
    },
  ];

  const wasteTypeOptions = [
    { id: "food-waste", label: "Food Waste", icon: Utensils },
    { id: "fruit-vegetable", label: "Fruit & Veg", icon: Apple },
    { id: "market-waste", label: "Market Waste", icon: ShoppingBag },
    { id: "agricultural", label: "Agricultural", icon: Leaf },
    { id: "plastic", label: "Plastic", icon: Recycle },
    { id: "paper", label: "Paper", icon: Package },
    { id: "organic", label: "Organic", icon: Leaf },
    { id: "industrial", label: "Industrial", icon: Factory },
  ];

  const energyTypeOptions = [
    { id: "biogas", label: "Biogas", icon: Zap },
    { id: "electricity", label: "Electricity", icon: Zap },
    { id: "fertilizer", label: "Fertilizer", icon: Leaf },
    { id: "biochar", label: "Biochar", icon: TreePine },
    { id: "biomass-fuel", label: "Biomass Fuel", icon: Droplets },
    { id: "recycling", label: "Recycling", icon: Recycle },
    { id: "compost", label: "Composting", icon: Leaf },
    { id: "wte", label: "Waste-to-Energy", icon: Zap },
  ];

  const vehicleTypeOptions = [
    { id: "pickup", label: "Pickup Truck", icon: Truck },
    { id: "box-truck", label: "Box Truck", icon: Package },
    { id: "tipper", label: "Tipper", icon: Truck },
    { id: "reefer", label: "Refrigerated", icon: Truck },
    { id: "flatbed", label: "Flatbed", icon: Truck },
    { id: "van", label: "Van", icon: Truck },
  ];

  const capacityOptions = [
    "1-10 tonnes/day",
    "11-50 tonnes/day",
    "51-100 tonnes/day",
    "101-500 tonnes/day",
    "500+ tonnes/day",
  ];

  const fleetSizeOptions = ["1-2", "3-5", "6-10", "11-20", "20+"];

  const countryOptions = [
    { code: "KE", name: "Kenya" },
    { code: "UG", name: "Uganda" },
    { code: "TZ", name: "Tanzania" },
    { code: "RW", name: "Rwanda" },
    { code: "ET", name: "Ethiopia" },
    { code: "NG", name: "Nigeria" },
    { code: "ZA", name: "South Africa" },
    { code: "GH", name: "Ghana" },
  ];

  const currentRole =
    roleOptions.find((role) => role.id === selectedRole) || roleOptions[0];

  // ─── Effects ─────────────────────────────────────────────
  useEffect(() => {
    if (signupOpenedRef.current) return;

    if (location.state?.message) toast.success(location.state.message);

    if (location.state?.email) {
      setLoginData((prev) => ({ ...prev, email: location.state.email }));
    }

    if (location.state?.signupRole) {
      openSignup(location.state.signupRole);
      signupOpenedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    let interval;
    if (emailTimer > 0) {
      interval = setInterval(() => setEmailTimer((prev) => prev - 1), 1000);
    } else if (emailTimer === 0 && emailCodeSent) {
      setResendEmailDisabled(false);
    }
    return () => clearInterval(interval);
  }, [emailTimer, emailCodeSent]);

  const resetSignupState = () => {
    setStep(1);
    setSignupError("");
    setEmailCode("");
    setEmailVerified(false);
    setEmailCodeSent(false);
    setEmailTimer(0);
    setResendEmailDisabled(false);
    setIsSendingEmail(false);
    setSignupData({
      full_name: "",
      business_name: "",
      business_type: "",
      location: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      wasteTypes: [],
      energyTypes: [],
      vehicleTypes: [],
      capacity: "",
      fleetSize: "",
      coverageArea: "",
      licenseNumber: "",
      referralCode: "",
      country: "KE",
      termsAccepted: false,
    });
  };

  const openSignup = (role) => {
    resetSignupState();
    setSelectedRole(role);
    setShowSignup(true);
  };

  const closeSignup = () => {
    setShowSignup(false);
    resetSignupState();
  };

  const handleLoginChange = (e) => {
    setLoginError("");
    setLoginData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSignupChange = (e) => {
    setSignupError("");
    const { name, value, type, checked } = e.target;
    setSignupData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleSelection = (arrayKey, id) => {
    setSignupData((prev) => {
      const current = Array.isArray(prev[arrayKey]) ? prev[arrayKey] : [];
      const updated = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      return { ...prev, [arrayKey]: updated };
    });
  };

  const nextStep = () => {
    if (step === 1) {
      if (!signupData.full_name.trim()) return failSignup("Full name is required");
      if (!signupData.business_name.trim()) return failSignup("Business name is required");
      if (!signupData.business_type) return failSignup("Business type is required");
      if (!signupData.country) return failSignup("Country is required");
    }
    if (step === 2) {
      if (selectedRole === "waste-supplier" && signupData.wasteTypes.length === 0)
        return failSignup("Select at least one waste type");
      if (selectedRole === "energy-producer" && signupData.energyTypes.length === 0)
        return failSignup("Select at least one energy type");
      if (selectedRole === "transport-partner" && signupData.vehicleTypes.length === 0)
        return failSignup("Select at least one vehicle type");
    }
    if (step === 3) {
      if (!signupData.email || !signupData.email.includes("@"))
        return failSignup("Valid email is required");
      if (!signupData.phone.trim()) return failSignup("Phone number is required");
      if (signupData.password.length < 6)
        return failSignup("Password must be at least 6 characters");
      if (signupData.password !== signupData.confirmPassword)
        return failSignup("Passwords do not match");
    }
    if (step === 4 && !signupData.termsAccepted)
      return failSignup("You must accept the terms and conditions");

    setSignupError("");
    setStep((prev) => Math.min(prev + 1, 5));
  };

  const failSignup = (msg) => {
    setSignupError(msg);
    toast.error(msg);
  };

  const prevStep = () => {
    setSignupError("");
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const sendEmailCode = async () => {
    if (!signupData.email || !signupData.email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!signupData.phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    setIsSendingEmail(true);
    const toastId = toast.loading("Sending verification code...");

    try {
      const res = await fetch(`${API_URL}/register/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signupData.email,
          phone: signupData.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send verification email");

      setEmailCodeSent(true);
      setEmailTimer(60);
      setResendEmailDisabled(true);

      toast.update(toastId, {
        render: "Verification code sent to your email 📧",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (err) {
      toast.update(toastId, {
        render: err.message || "Failed to send verification code",
        type: "error",
        isLoading: false,
        autoClose: 4000,
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const verifyEmailCode = async () => {
    if (emailCode.length !== 6) {
      toast.error("Enter the 6‑digit verification code");
      return;
    }
    const toastId = toast.loading("Verifying email...");
    try {
      const res = await fetch(`${API_URL}/register/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signupData.email, code: emailCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid verification code");

      setEmailVerified(true);
      toast.update(toastId, {
        render: "Email verified successfully! ✅",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (err) {
      toast.update(toastId, {
        render: err.message || "Email verification failed",
        type: "error",
        isLoading: false,
        autoClose: 4000,
      });
    }
  };

  const completeSignup = async () => {
    if (!emailVerified) {
      toast.error("Please verify your email first");
      return;
    }
    setIsSigningUp(true);
    const toastId = toast.loading("Creating your account...");

    try {
      const payload = {
        ...signupData,
        role: selectedRole,
        waste_types: signupData.wasteTypes.join(","),
        energy_types: signupData.energyTypes.join(","),
        vehicle_types: signupData.vehicleTypes.join(","),
        capacity: signupData.capacity || "",
        fleet_size: signupData.fleetSize || "",
        coverage_area: signupData.coverageArea || "",
        license_number: signupData.licenseNumber || "",
        referral_code: signupData.referralCode || "",
        country: signupData.country,
      };

      const res = await fetch(`${API_URL}/register/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");

      try {
        await fetch(`${API_URL}/send-welcome-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: signupData.email,
            full_name: signupData.full_name,
            role: selectedRole,
          }),
        });
      } catch (emailErr) {
        console.error("Failed to send welcome email:", emailErr);
      }

      toast.update(toastId, {
        render: "Account created successfully! 🎉 Please login.",
        type: "success",
        isLoading: false,
        autoClose: 4000,
      });

      setShowSignup(false);
      setLoginData((prev) => ({ ...prev, email: signupData.email }));
      resetSignupState();
    } catch (err) {
      toast.update(toastId, {
        render: err.message || "Registration failed",
        type: "error",
        isLoading: false,
        autoClose: 4000,
      });
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginData.email.trim() || !loginData.password.trim()) {
      setLoginError("Please enter both email and password");
      toast.error("Please enter both email and password");
      return;
    }
    setIsSubmitting(true);
    setLoginError("");
    const toastId = toast.loading("Logging in...");

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("loginTime", new Date().toISOString());

      toast.update(toastId, {
        render: `Welcome ${data.user.full_name}! 🎉`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      const redirectMap = {
        supplier: "/dashboard",
        producer: "/dashboard",
        transporter: "/dashboard",
        admin: "/admin",
      };
      setTimeout(() => navigate(redirectMap[data.user.role] || "/dashboard"), 800);
    } catch (err) {
      setLoginError(err.message);
      toast.update(toastId, {
        render: err.message || "Login failed",
        type: "error",
        isLoading: false,
        autoClose: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (e, index) => {
    const value = e.target.value.replace(/\D/g, "");
    if (!value) {
      const newCode = emailCode.split("");
      newCode[index] = "";
      setEmailCode(newCode.join(""));
      return;
    }
    const newCode = emailCode.split("");
    newCode[index] = value[0];
    setEmailCode(newCode.join(""));
    const nextInput = document.getElementById(`email-code-${index + 1}`);
    if (nextInput) nextInput.focus();
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace" && !e.target.value && index > 0) {
      const prevInput = document.getElementById(`email-code-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // ─── Role-specific field renderer ────────────────────────
  const renderRoleSpecificFields = () => {
    const isSelected = (arrayKey, id) => signupData[arrayKey].includes(id);

    if (selectedRole === "waste-supplier") {
      return (
        <div>
          <Label>Select Waste Types *</Label>
          <div className="grid grid-cols-2 gap-2">
            {wasteTypeOptions.map((type) => {
              const Icon = type.icon;
              const selected = isSelected("wasteTypes", type.id);
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => toggleSelection("wasteTypes", type.id)}
                  className={`chip ${selected ? "chip-on" : ""}`}
                >
                  <Icon className="chip-icon" />
                  <span className="chip-label">{type.label}</span>
                  {selected && <Check className="chip-check" />}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (selectedRole === "energy-producer") {
      return (
        <div className="space-y-5">
          <div>
            <Label>Select Energy Types *</Label>
            <div className="grid grid-cols-2 gap-2">
              {energyTypeOptions.map((type) => {
                const Icon = type.icon;
                const selected = isSelected("energyTypes", type.id);
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => toggleSelection("energyTypes", type.id)}
                    className={`chip ${selected ? "chip-on" : ""}`}
                  >
                    <Icon className="chip-icon" />
                    <span className="chip-label">{type.label}</span>
                    {selected && <Check className="chip-check" />}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label>Facility Capacity</Label>
            <Field icon={Gauge}>
              <select
                name="capacity"
                value={signupData.capacity}
                onChange={handleSignupChange}
                className="ainput-select"
              >
                <option value="">Select capacity</option>
                {capacityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div>
          <Label>Fleet Size</Label>
          <Field icon={Gauge}>
            <select
              name="fleetSize"
              value={signupData.fleetSize}
              onChange={handleSignupChange}
              className="ainput-select"
            >
              <option value="">Select fleet size</option>
              {fleetSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option} vehicles
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div>
          <Label>Vehicle Types *</Label>
          <div className="grid grid-cols-2 gap-2">
            {vehicleTypeOptions.map((type) => {
              const Icon = type.icon;
              const selected = isSelected("vehicleTypes", type.id);
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => toggleSelection("vehicleTypes", type.id)}
                  className={`chip ${selected ? "chip-on" : ""}`}
                >
                  <Icon className="chip-icon" />
                  <span className="chip-label">{type.label}</span>
                  {selected && <Check className="chip-check" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label>Coverage Area</Label>
          <Field icon={Navigation}>
            <input
              type="text"
              name="coverageArea"
              value={signupData.coverageArea}
              onChange={handleSignupChange}
              placeholder="e.g. Nairobi, Mombasa"
              className="ainput"
            />
          </Field>
        </div>

        <div>
          <Label>License / Permit Number</Label>
          <Field icon={Award}>
            <input
              type="text"
              name="licenseNumber"
              value={signupData.licenseNumber}
              onChange={handleSignupChange}
              placeholder="Enter license number"
              className="ainput"
            />
          </Field>
        </div>
      </div>
    );
  };

  // ─── Step header ─────────────────────────────────────────
  const StepHeader = () => {
    const titles = [
      { t: "Business Details", s: "Tell us about your business" },
      { t: "Specialization", s: "Select your specialty" },
      { t: "Account Setup", s: "Create your credentials" },
      { t: "Terms & Conditions", s: "Review our policies" },
      { t: "Email Verification", s: "Verify your email address" },
    ];
    const meta = titles[step - 1];
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="eyebrow">Step {step} of 5</span>
          <button
            type="button"
            onClick={closeSignup}
            className="x-btn"
            aria-label="Close signup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          {meta.t}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{meta.s}</p>

        <div className="mt-5 flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex-1">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  item <= step
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-500"
                    : "bg-slate-100"
                }`}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── Step renderers ─────────────────────────────────────
  const Step1 = () => (
    <div className="space-y-4">
      <div>
        <Label>Full Name *</Label>
        <Field icon={User}>
          <input
            type="text"
            name="full_name"
            placeholder="Jane Doe"
            value={signupData.full_name}
            onChange={handleSignupChange}
            autoComplete="off"
            className="ainput"
          />
        </Field>
      </div>
      <div>
        <Label>Business Name *</Label>
        <Field icon={Building2}>
          <input
            type="text"
            name="business_name"
            placeholder="Acme Waste Co."
            value={signupData.business_name}
            onChange={handleSignupChange}
            autoComplete="off"
            className="ainput"
          />
        </Field>
      </div>
      <div>
        <Label>Business Type *</Label>
        <Field icon={Briefcase}>
          <select
            name="business_type"
            value={signupData.business_type}
            onChange={handleSignupChange}
            className="ainput-select"
          >
            <option value="">Select business type</option>
            {currentRole.businessTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Country *</Label>
          <Field icon={Globe}>
            <select
              name="country"
              value={signupData.country}
              onChange={handleSignupChange}
              className="ainput-select"
            >
              {countryOptions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div>
          <Label>Location</Label>
          <Field icon={MapPin}>
            <input
              type="text"
              name="location"
              placeholder="City"
              value={signupData.location}
              onChange={handleSignupChange}
              autoComplete="off"
              className="ainput"
            />
          </Field>
        </div>
      </div>

      <button type="button" onClick={nextStep} className="primary-btn w-full">
        Continue <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );

  const Step2 = () => (
    <div>
      {renderRoleSpecificFields()}
      <div className="flex gap-3 mt-6">
        <button type="button" onClick={prevStep} className="ghost-btn flex-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button type="button" onClick={nextStep} className="primary-btn flex-1">
          Continue
        </button>
      </div>
    </div>
  );

  const Step3 = () => (
    <div className="space-y-4">
      <div>
        <Label>Email Address *</Label>
        <Field icon={Mail}>
          <input
            type="email"
            name="email"
            placeholder="you@company.com"
            value={signupData.email}
            onChange={handleSignupChange}
            autoComplete="off"
            className="ainput"
          />
        </Field>
      </div>
      <div>
        <Label>Phone Number *</Label>
        <Field icon={Phone}>
          <input
            type="tel"
            name="phone"
            placeholder="+254 712 345 678"
            value={signupData.phone}
            onChange={handleSignupChange}
            autoComplete="off"
            className="ainput"
          />
        </Field>
      </div>
      <div>
        <Label>Password *</Label>
        <Field icon={Lock}>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Minimum 6 characters"
            value={signupData.password}
            onChange={handleSignupChange}
            minLength={6}
            autoComplete="new-password"
            className="ainput"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="ainput-eye"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </Field>
      </div>
      <div>
        <Label>Confirm Password *</Label>
        <Field icon={Lock}>
          <input
            type={showPassword ? "text" : "password"}
            name="confirmPassword"
            placeholder="Confirm your password"
            value={signupData.confirmPassword}
            onChange={handleSignupChange}
            autoComplete="new-password"
            className="ainput"
          />
        </Field>
      </div>
      <div>
        <Label>Referral Code (optional)</Label>
        <Field icon={Users}>
          <input
            type="text"
            name="referralCode"
            placeholder="Enter referral code"
            value={signupData.referralCode}
            onChange={handleSignupChange}
            autoComplete="off"
            className="ainput"
          />
        </Field>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={prevStep} className="ghost-btn flex-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button type="button" onClick={nextStep} className="primary-btn flex-1">
          Continue
        </button>
      </div>
    </div>
  );

  const Step4 = () => (
    <div className="space-y-5">
      <label className="terms-card">
        <input
          type="checkbox"
          name="termsAccepted"
          checked={signupData.termsAccepted}
          onChange={handleSignupChange}
          className="terms-check"
        />
        <span className="text-sm leading-relaxed text-slate-700">
          I agree to the{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="terms-link">
            Terms &amp; Conditions
          </a>{" "}
          and{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="terms-link">
            Privacy Policy
          </a>
          .
        </span>
      </label>

      <div className="flex gap-3">
        <button type="button" onClick={prevStep} className="ghost-btn flex-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button type="button" onClick={nextStep} className="primary-btn flex-1">
          Continue
        </button>
      </div>
    </div>
  );

  const Step5 = () => (
    <div className="space-y-5 text-center">
      <div className="flex justify-center">
        <div className="icon-badge">
          <Mail className="w-6 h-6 text-emerald-700" />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-900">Verify your email</h3>
        <p className="text-slate-500 text-sm mt-1">
          We'll send a 6‑digit code to{" "}
          <span className="font-semibold text-slate-700">{signupData.email}</span>
        </p>
      </div>

      {emailCodeSent && (
        <div className="flex justify-center gap-2">
          {[...Array(6)].map((_, index) => (
            <input
              key={index}
              id={`email-code-${index}`}
              type="text"
              maxLength="1"
              value={emailCode[index] || ""}
              onChange={(e) => handleOtpChange(e, index)}
              onKeyDown={(e) => handleOtpKeyDown(e, index)}
              autoComplete="off"
              className="otp-input"
            />
          ))}
        </div>
      )}

      {emailCodeSent && (
        <div className="flex justify-center items-center gap-1.5 text-xs font-medium text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          <span>
            Code expires in {Math.floor(emailTimer / 60)}:
            {(emailTimer % 60).toString().padStart(2, "0")}
          </span>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            if (!emailCodeSent) sendEmailCode();
            else if (!emailVerified) verifyEmailCode();
          }}
          disabled={isSendingEmail || emailVerified}
          className={`flex-1 primary-btn ${
            emailVerified ? "!bg-emerald-600 !from-emerald-600 !to-emerald-700" : ""
          }`}
        >
          {isSendingEmail ? (
            <>
              <span className="btn-spinner" />
              Sending...
            </>
          ) : !emailCodeSent ? (
            "Send Code"
          ) : emailVerified ? (
            <>Verified <Check className="w-4 h-4" /></>
          ) : (
            "Verify Code"
          )}
        </button>

        {emailCodeSent && !emailVerified && (
          <button
            type="button"
            disabled={resendEmailDisabled || isSendingEmail}
            onClick={sendEmailCode}
            className="ghost-btn px-4 disabled:opacity-50"
            aria-label="Resend code"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {emailVerified && (
        <button
          type="button"
          onClick={completeSignup}
          disabled={isSigningUp}
          className="primary-btn w-full !bg-emerald-600 !from-emerald-600 !to-emerald-700"
        >
          {isSigningUp ? (
            <>
              <span className="btn-spinner" />
              Creating...
            </>
          ) : (
            <>
              Create Account <Sparkles className="w-4 h-4" />
            </>
          )}
        </button>
      )}

      <button type="button" onClick={prevStep} className="ghost-btn w-full">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
    </div>
  );

  // ─── MAIN RENDER ────────────────────────────────────────
  return (
    <div className="auth-shell">
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
      <div className="auth-bg" aria-hidden>
        <div className="auth-bg-grid" />
        <div className="auth-bg-glow auth-bg-glow-a" />
        <div className="auth-bg-glow auth-bg-glow-b" />
      </div>

      <div
        className={`auth-card ${showSignup ? "auth-card-wide" : ""}`}
        key={showSignup ? "signup" : "login"}
      >
        <div className="p-7 sm:p-9">
          {!showSignup ? (
            <>
              {/* Brand mark */}
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

              <div className="text-center mb-7">
                <h1 className="auth-title">Welcome back</h1>
                <p className="auth-sub">Sign in to access your dashboard</p>
              </div>

              <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Field icon={Mail}>
                    <input
                      type="email"
                      name="email"
                      placeholder="you@company.com"
                      value={loginData.email}
                      onChange={handleLoginChange}
                      required
                      autoComplete="off"
                      className="ainput"
                    />
                  </Field>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Password</Label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline -mt-2"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Field icon={Lock}>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={handleLoginChange}
                      required
                      autoComplete="new-password"
                      className="ainput"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="ainput-eye"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </Field>
                </div>

                {loginError && (
                  <div className="error-banner">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {loginError}
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
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Register CTA */}
              <p className="mt-7 text-center text-sm text-slate-600">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="font-semibold text-emerald-700 hover:underline"
                >
                  Create one
                </Link>
              </p>
            </>
          ) : (
            <>
              <StepHeader />

              {signupError && (
                <div className="error-banner mb-5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {signupError}
                </div>
              )}

              <form onSubmit={(e) => e.preventDefault()}>
                {step === 1 && Step1()}
                {step === 2 && Step2()}
                {step === 3 && Step3()}
                {step === 4 && Step4()}
                {step === 5 && Step5()}
              </form>
            </>
          )}
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        prefilledEmail={loginData.email}
      />

      <style>{STYLES}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HELPER COMPONENTS — declared OUTSIDE Login()
   ═══════════════════════════════════════════════════════════════ */

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
.auth-shell {
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
.auth-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.auth-bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(17, 64, 45, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(17, 64, 45, 0.05) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(ellipse at 50% 45%, black 20%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 45%, black 20%, transparent 75%);
}
.auth-bg-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.55;
}
.auth-bg-glow-a {
  width: 480px; height: 480px;
  top: -12%; left: -8%;
  background: radial-gradient(circle, rgba(163, 230, 53, 0.5), transparent 65%);
}
.auth-bg-glow-b {
  width: 420px; height: 420px;
  bottom: -14%; right: -6%;
  background: radial-gradient(circle, rgba(52, 211, 153, 0.4), transparent 65%);
}

/* ─── Card ───────────────────────────────────────────────── */
.auth-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 440px;
  background: #FFFFFF;
  border-radius: 24px;
  border: 1px solid #E5EDE8;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.05),
    0 8px 32px -12px rgba(15, 23, 42, 0.14),
    0 24px 60px -20px rgba(15, 23, 42, 0.10);
  overflow: hidden;
  animation: cardEnter 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  transition: max-width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.auth-card-wide { max-width: 520px; }

@keyframes cardEnter {
  0% { opacity: 0; transform: translateY(12px) scale(0.99); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

/* ─── Brand lockup ───────────────────────────────────────── */
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

/* ─── Typography ─────────────────────────────────────────── */
.auth-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 24px;
  line-height: 1.15;
  font-weight: 700;
  color: #0F172A;
  letter-spacing: -0.02em;
}
.auth-sub {
  margin-top: 6px;
  font-size: 13.5px;
  color: #64748B;
  line-height: 1.55;
}
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
.ainput,
.ainput-select {
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
.ainput-select {
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 8l5 5 5-5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0 center;
  background-size: 14px;
  padding-right: 20px;
}
.ainput-select::-ms-expand { display: none; }
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

/* ─── Chips ──────────────────────────────────────────────── */
.chip {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  border-radius: 12px;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}
.chip:hover {
  border-color: #94A3B8;
  background: #FFFFFF;
  transform: translateY(-1px);
}
.chip-on {
  border-color: #11402D;
  background: linear-gradient(180deg, rgba(163, 230, 53, 0.1), rgba(17, 64, 45, 0.03));
  box-shadow: 0 0 0 3px rgba(17, 64, 45, 0.06);
}
.chip-icon { width: 16px; height: 16px; color: #64748B; }
.chip-on .chip-icon { color: #11402D; }
.chip-label {
  font-size: 11.5px;
  font-weight: 600;
  color: #475569;
  line-height: 1.25;
}
.chip-on .chip-label { color: #11402D; }
.chip-check {
  position: absolute;
  top: 8px; right: 8px;
  width: 13px; height: 13px;
  color: #11402D;
}

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

/* ─── Ghost button ───────────────────────────────────────── */
.ghost-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 18px;
  border-radius: 12px;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  color: #475569;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  cursor: pointer;
  transition: all 0.15s ease;
}
.ghost-btn:hover:not(:disabled) {
  border-color: #94A3B8;
  background: #F8FAFC;
  color: #0F172A;
}
.ghost-btn:active:not(:disabled) { transform: translateY(1px); }
.ghost-btn:disabled { opacity: 0.5; cursor: not-allowed; }

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

/* ─── Terms card ─────────────────────────────────────────── */
.terms-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.terms-card:hover { border-color: #CBD5E1; background: #FFFFFF; }
.terms-check {
  width: 16px; height: 16px;
  margin-top: 2px;
  accent-color: #11402D;
  cursor: pointer;
  flex-shrink: 0;
}
.terms-link {
  color: #11402D;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.terms-link:hover { color: #0A2115; }

/* ─── OTP inputs ─────────────────────────────────────────── */
.otp-input {
  width: 46px; height: 56px;
  text-align: center;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 20px;
  font-weight: 600;
  color: #0F172A;
  background: #F8FAFC;
  border: 1.5px solid #E2E8F0;
  border-radius: 12px;
  outline: none;
  transition: all 0.15s ease;
}
.otp-input:hover { border-color: #CBD5E1; }
.otp-input:focus {
  background: #FFFFFF;
  border-color: #11402D;
  box-shadow: 0 0 0 4px rgba(17, 64, 45, 0.1);
}

/* ─── Icon badge (step 5) ────────────────────────────────── */
.icon-badge {
  width: 56px; height: 56px;
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(163, 230, 53, 0.2), rgba(17, 64, 45, 0.08));
  border: 1px solid rgba(17, 64, 45, 0.12);
  box-shadow: 0 8px 24px -12px rgba(17, 64, 45, 0.35);
}

/* ─── X button ───────────────────────────────────────────── */
.x-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px; height: 30px;
  border-radius: 8px;
  color: #94A3B8;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}
.x-btn:hover {
  color: #0F172A;
  background: #F1F5F9;
  border-color: #E2E8F0;
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
  .auth-card { animation: none !important; }
}

/* ─── Mobile ─────────────────────────────────────────────── */
@media (max-width: 480px) {
  .auth-shell { padding: 16px 12px; }
  .auth-card { border-radius: 20px; }
}
`;

export default Login;