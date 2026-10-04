// src/component/AccessibilityWidget.jsx
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Accessibility, X, Volume2, VolumeX, Contrast, Link2, Type, AlignJustify,
  Pause, ImageOff, MousePointer2, MessageSquare, LayoutGrid, UserCircle,
  Maximize2, Check, Sparkles, Eye, Book, BookOpen, Ruler, Gauge, Keyboard,
  Focus, RotateCcw, Sun, Moon, Droplet, Underline, Heading1, Move, Info,
  ChevronRight, Search, Command, Shield, Hand, Brain, Baby,
  Wand2, Palette, CheckCircle2, AlertTriangle,
} from "lucide-react";

const STORAGE_KEY = "revive-a11y-settings-v5";
const WELCOMED_KEY = "revive-a11y-welcomed-v1";

// ═══════════════════════════════════════════════════════════════
// DEFAULT SETTINGS
// ═══════════════════════════════════════════════════════════════
const DEFAULT_SETTINGS = {
  contrast: false,
  contrastMode: "standard",
  smartContrast: false,
  highContrastDark: false,
  highContrastLight: false,
  invertColors: false,
  monochrome: false,
  colorBlindMode: null,
  hideImages: false,
  linkUnderline: false,
  highlightLinks: false,
  highlightHeadings: false,
  readingGuide: false,
  readingMask: false,
  readingMode: false,
  textAlign: "default",
  textSize: 100,
  textSpacing: false,
  lineHeight: 100,
  letterSpacing: 0,
  dyslexiaFriendly: false,
  pauseAnimations: false,
  reduceMotion: false,
  saturation: 100,
  brightness: 100,
  screenReader: false,
  voiceSpeed: 1,
  voicePitch: 1,
  muteSounds: false,
  bigCursor: false,
  keyboardNav: false,
  focusMode: false,
  tooltips: false,
  pageStructure: false,
  dictionary: false,
  profile: null,
  oversizedWidget: false,
  widgetPosition: "left",
};

const PROFILES = [
  { id: "blind",       label: "Blind",           desc: "Screen reader + keyboard navigation", icon: Eye },
  { id: "low-vision",  label: "Low Vision",      desc: "High contrast, bigger text",          icon: Eye },
  { id: "dyslexia",    label: "Dyslexia",        desc: "Dyslexia-friendly font",              icon: BookOpen },
  { id: "adhd",        label: "ADHD",            desc: "Reduce distractions",                 icon: Focus },
  { id: "epilepsy",    label: "Epilepsy Safe",   desc: "Pause all animations",                icon: Shield },
  { id: "color-blind", label: "Color Blind",     desc: "Adjust colors",                       icon: Droplet },
  { id: "motor",       label: "Motor Impaired",  desc: "Bigger cursor, focus mode",           icon: Hand },
  { id: "elderly",     label: "Elderly",         desc: "Larger text, easier reading",         icon: Baby },
  { id: "cognitive",   label: "Cognitive",       desc: "Simplified, calmer interface",        icon: Brain },
];

const COLOR_BLIND_MODES = [
  { id: "protanopia",    label: "Protanopia",    desc: "Red-blind" },
  { id: "deuteranopia",  label: "Deuteranopia",  desc: "Green-blind" },
  { id: "tritanopia",    label: "Tritanopia",    desc: "Blue-blind" },
  { id: "achromatopsia", label: "Achromatopsia", desc: "Total color blindness" },
  { id: "inverted",      label: "Inverted",      desc: "Invert all colors" },
];

const CONTRAST_MODES = [
  { id: "standard", label: "Standard" },
  { id: "dark",     label: "Dark" },
  { id: "light",    label: "Light" },
];

// ═══════════════════════════════════════════════════════════════
// APPLY SETTINGS
// ═══════════════════════════════════════════════════════════════
function applySettings(settings) {
  const html = document.documentElement;

  Array.from(html.classList).forEach((cls) => {
    if (cls.startsWith("a11y-")) html.classList.remove(cls);
  });

  html.style.setProperty("--a11y-text-size", `${settings.textSize}%`);
  html.style.setProperty("--a11y-line-height", `${settings.lineHeight}%`);
  html.style.setProperty("--a11y-letter-spacing", `${settings.letterSpacing}px`);
  html.style.setProperty("--a11y-saturation", `${settings.saturation}%`);
  html.style.setProperty("--a11y-brightness", `${settings.brightness}%`);

  const booleanMap = {
    contrast: "a11y-contrast",
    smartContrast: "a11y-smart-contrast",
    hideImages: "a11y-hide-images",
    linkUnderline: "a11y-link-underline",
    highlightLinks: "a11y-highlight-links",
    highlightHeadings: "a11y-highlight-headings",
    readingMode: "a11y-reading-mode",
    textSpacing: "a11y-text-spacing",
    dyslexiaFriendly: "a11y-dyslexia-friendly",
    pauseAnimations: "a11y-pause-animations",
    reduceMotion: "a11y-reduce-motion",
    muteSounds: "a11y-mute-sounds",
    bigCursor: "a11y-big-cursor",
    keyboardNav: "a11y-keyboard-nav",
    focusMode: "a11y-focus-mode",
    tooltips: "a11y-tooltips",
    pageStructure: "a11y-page-structure",
    oversizedWidget: "a11y-oversized-widget",
  };
  Object.entries(booleanMap).forEach(([key, cls]) => {
    if (settings[key]) html.classList.add(cls);
  });

  if (settings.contrastMode && settings.contrastMode !== "standard") {
    html.classList.add(`a11y-contrast-${settings.contrastMode}`);
  }

  if (settings.readingGuide) html.classList.add("a11y-show-reading-guide");
  if (settings.readingMask) html.classList.add("a11y-show-reading-mask");
  if (settings.colorBlindMode) html.classList.add(`a11y-cb-${settings.colorBlindMode}`);
  if (settings.invertColors) html.classList.add("a11y-invert");
  if (settings.monochrome) html.classList.add("a11y-monochrome");
  if (settings.highContrastDark) html.classList.add("a11y-hc-dark");
  if (settings.highContrastLight) html.classList.add("a11y-hc-light");

  if (settings.textAlign && settings.textAlign !== "default") {
    html.classList.add(`a11y-align-${settings.textAlign}`);
  }
  if (settings.profile) html.classList.add(`a11y-profile-${settings.profile}`);
  html.classList.add(`a11y-pos-${settings.widgetPosition}`);
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

// ═══════════════════════════════════════════════════════════════
// MAIN WIDGET
// ═══════════════════════════════════════════════════════════════
export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(() => loadSettings());
  const [activeTab, setActiveTab] = useState("features");
  const [activeView, setActiveView] = useState("main");
  const [mounted, setMounted] = useState(false);
  const [dictResult, setDictResult] = useState(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [toast, setToast] = useState(null);
  const [hasInteracted, setHasInteracted] = useState(() => {
    try {
      return localStorage.getItem(WELCOMED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const guideRef = useRef(null);
  const maskRef = useRef(null);
  const lastSpokenRef = useRef({ text: "", time: 0 });
  const toastTimerRef = useRef(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    applySettings(settings);
    saveSettings(settings);
  }, [settings]);

  // Welcome pulse / auto-dismiss after open
  useEffect(() => {
    if (open && !hasInteracted) {
      setHasInteracted(true);
      try { localStorage.setItem(WELCOMED_KEY, "1"); } catch {}
    }
  }, [open, hasInteracted]);

  // Toast helper
  const showToast = useCallback((message, tone = "success") => {
    setToast({ id: Date.now(), message, tone });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 1800);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        if (!open) setOpen(true);
        setTimeout(() => {
          setActiveTab("features");
          setActiveView("main");
          searchRef.current?.focus();
        }, 250);
      }
      if (e.key === "Escape") {
        if (confirmReset) setConfirmReset(false);
        else if (dictResult) setDictResult(null);
        else if (showShortcuts) setShowShortcuts(false);
        else if (open) setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dictResult, showShortcuts, confirmReset]);

  // Click outside
  useEffect(() => {
    const onClick = (e) => {
      if (
        open &&
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        !triggerRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Reading guide
  useEffect(() => {
    if (!settings.readingGuide) return;
    const onMove = (e) => {
      if (guideRef.current) {
        guideRef.current.style.transform = `translateY(${e.clientY - 12}px)`;
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [settings.readingGuide]);

  // Reading mask
  useEffect(() => {
    if (!settings.readingMask) return;
    const onMove = (e) => {
      if (maskRef.current) {
        const y = e.clientY;
        const top = Math.max(0, y - 60);
        const bottom = Math.max(0, window.innerHeight - y - 60);
        maskRef.current.style.setProperty("--mask-top", `${top}px`);
        maskRef.current.style.setProperty("--mask-bottom", `${bottom}px`);
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [settings.readingMask]);

  // Dictionary
  useEffect(() => {
    if (!settings.dictionary) return;
    const onDblClick = async (e) => {
      const selection = window.getSelection?.();
      const word = selection?.toString?.().trim();
      if (!word || word.length < 2 || word.length > 40) return;
      if (!/^[a-zA-Z'-]+$/.test(word)) return;
      if (panelRef.current?.contains(e.target)) return;
      if (triggerRef.current?.contains(e.target)) return;

      setDictLoading(true);
      setDictResult({ word, data: null });
      try {
        const res = await fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
        );
        if (!res.ok) throw new Error("Word not found");
        const data = await res.json();
        setDictResult({ word, data });
      } catch {
        setDictResult({ word, data: null, error: "Definition not found" });
      } finally {
        setDictLoading(false);
      }
    };
    document.addEventListener("dblclick", onDblClick);
    return () => document.removeEventListener("dblclick", onDblClick);
  }, [settings.dictionary]);

  // Screen reader
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!settings.screenReader) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      return;
    }
    if (!window.speechSynthesis) return;

    let hoverTimer = null;
    const speak = (text) => {
      if (!text) return;
      const cleaned = text.replace(/\s+/g, " ").trim().slice(0, 300);
      if (cleaned.length < 2) return;
      const now = Date.now();
      if (lastSpokenRef.current.text === cleaned && now - lastSpokenRef.current.time < 800) return;
      lastSpokenRef.current = { text: cleaned, time: now };
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(cleaned);
        u.rate = settings.voiceSpeed || 1;
        u.pitch = settings.voicePitch || 1;
        u.lang = "en-US";
        window.speechSynthesis.speak(u);
      } catch {}
    };
    const getText = (el) => {
      if (!el) return "";
      const aria = el.getAttribute?.("aria-label");
      if (aria?.trim()) return aria.trim();
      const alt = el.getAttribute?.("alt");
      if (alt?.trim()) return alt.trim();
      const title = el.getAttribute?.("title");
      if (title?.trim()) return title.trim();
      const txt = (el.innerText || el.textContent || "").trim();
      if (txt.length < 2 || !/[a-zA-Z0-9]/.test(txt)) return "";
      return txt.slice(0, 300);
    };
    const isWidget = (el) =>
      !el?.closest ? false :
      !!(el.closest(".a11y-trigger") || el.closest(".a11y-panel") ||
         el.closest(".a11y-backdrop") || el.closest(".a11y-dict"));
    const onHover = (e) => {
      const target = e.target.closest?.('a, button, [role="button"], h1, h2, h3, h4, h5, h6, label, p, li');
      if (!target || isWidget(target)) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        const text = getText(target);
        if (text) speak(text);
      }, 300);
    };
    const onLeave = () => clearTimeout(hoverTimer);
    const onClick = (e) => {
      const target = e.target.closest?.("a, button, [role='button'], input, textarea, select");
      if (!target || isWidget(target)) return;
      const text = getText(target);
      if (text) speak(text);
    };
    const onFocus = (e) => {
      if (isWidget(e.target)) return;
      const text = getText(e.target);
      if (text) speak(text);
    };
    document.addEventListener("mouseover", onHover);
    document.addEventListener("mouseout", onLeave);
    document.addEventListener("click", onClick);
    document.addEventListener("focusin", onFocus);
    return () => {
      clearTimeout(hoverTimer);
      document.removeEventListener("mouseover", onHover);
      document.removeEventListener("mouseout", onLeave);
      document.removeEventListener("click", onClick);
      document.removeEventListener("focusin", onFocus);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [settings.screenReader, settings.voiceSpeed, settings.voicePitch]);

  const toggle = useCallback((key) => {
    setSettings((prev) => {
      const next = !prev[key];
      showToast(`${labelFor(key)} ${next ? "enabled" : "disabled"}`);
      return { ...prev, [key]: next };
    });
  }, [showToast]);

  const setValue = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetAll = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
    const html = document.documentElement;
    Array.from(html.classList).forEach((cls) => {
      if (cls.startsWith("a11y-")) html.classList.remove(cls);
    });
    html.removeAttribute("data-a11y-filters");
    ["--a11y-text-size", "--a11y-line-height", "--a11y-letter-spacing",
     "--a11y-saturation", "--a11y-brightness"].forEach((v) => {
      html.style.removeProperty(v);
    });
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setActiveTab("features");
    setActiveView("main");
    setQuery("");
    setConfirmReset(false);
    showToast("All settings reset");
  }, [showToast]);

  const setProfile = useCallback((profileId) => {
    setSettings(() => {
      const base = { ...DEFAULT_SETTINGS };
      if (!profileId) return base;
      const presets = {
        blind:        { ...base, screenReader: true, keyboardNav: true, tooltips: true },
        "low-vision": { ...base, textSize: 125, contrast: true, linkUnderline: true, bigCursor: true },
        dyslexia:     { ...base, dyslexiaFriendly: true, textSpacing: true, lineHeight: 150 },
        adhd:         { ...base, pauseAnimations: true, readingMask: true, tooltips: true },
        epilepsy:     { ...base, pauseAnimations: true, reduceMotion: true },
        "color-blind":{ ...base, colorBlindMode: "deuteranopia" },
        motor:        { ...base, bigCursor: true, focusMode: true, keyboardNav: true },
        elderly:      { ...base, textSize: 125, linkUnderline: true, readingGuide: true },
        cognitive:    { ...base, readingMode: true, tooltips: true, pauseAnimations: true },
      };
      return { ...presets[profileId], profile: profileId };
    });
    const profile = PROFILES.find((p) => p.id === profileId);
    showToast(profileId ? `${profile?.label || "Profile"} applied` : "Default profile applied");
    setActiveTab("features");
    setActiveView("main");
  }, [showToast]);

  const activeCount = useMemo(() => {
    return Object.entries(settings).filter(([k, v]) => {
      if (k === "widgetPosition") return false;
      if (k === "profile" || k === "colorBlindMode") return v !== null && v !== undefined;
      if (k === "contrastMode") return v !== "standard";
      if (k === "textAlign") return v !== "default";
      if (k === "textSize" || k === "lineHeight" || k === "saturation" || k === "brightness") {
        return v !== 100;
      }
      if (k === "letterSpacing") return v !== 0;
      if (k === "voiceSpeed" || k === "voicePitch") return v !== 1;
      return v === true;
    }).length;
  }, [settings]);

  const widgetContent = (
    <>
      <style>{A11Y_STYLES}</style>
      <ColorBlindFilters />
      <FilterOverlay settings={settings} />

      <div ref={guideRef} className="a11y-reading-guide" aria-hidden="true" />
      <div ref={maskRef} className="a11y-reading-mask" aria-hidden="true" />

      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className={`a11y-trigger ${!hasInteracted ? "a11y-trigger-hint" : ""}`}
        aria-label="Open accessibility menu"
        aria-expanded={open}
        title="Accessibility Menu (Ctrl+U)"
      >
        {!open ? <Accessibility className="a11y-trigger-icon" /> : <X className="a11y-trigger-icon" />}
        {activeCount > 0 && !open && (
          <motion.span
            key={activeCount}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className="a11y-trigger-badge"
          >
            {activeCount}
          </motion.span>
        )}
        {!open && !hasInteracted && <span className="a11y-trigger-ring" aria-hidden="true" />}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="a11y-backdrop"
              onClick={() => setOpen(false)}
            />

            <motion.aside
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Accessibility"
              initial={{ x: settings.widgetPosition === "left" ? "-100%" : "100%", opacity: 0.7 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: settings.widgetPosition === "left" ? "-100%" : "100%", opacity: 0.7 }}
              transition={{ type: "spring", stiffness: 380, damping: 36, mass: 0.9 }}
              className="a11y-panel"
            >
              <div className="a11y-header">
                <div className="a11y-header-glow" aria-hidden="true" />
                <div className="a11y-header-left">
                  <div className="a11y-header-logo">
                    <Accessibility className="a11y-header-icon" />
                  </div>
                  <div>
                    <h2 className="a11y-header-title">Accessibility</h2>
                    <p className="a11y-header-sub">
                      {activeCount > 0
                        ? `${activeCount} setting${activeCount === 1 ? "" : "s"} active`
                        : "Customize your experience"}
                    </p>
                  </div>
                </div>
                <div className="a11y-header-actions">
                  <button
                    onClick={() => setShowShortcuts(true)}
                    className="a11y-close"
                    aria-label="Keyboard shortcuts"
                    title="Shortcuts"
                  >
                    <Command className="a11y-close-icon" />
                  </button>
                  <button onClick={() => setOpen(false)} className="a11y-close" aria-label="Close menu">
                    <X className="a11y-close-icon" />
                  </button>
                </div>
              </div>

              <div className="a11y-search-wrap">
                <Search className="a11y-search-icon" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search features…"
                  className="a11y-search"
                  aria-label="Search features"
                />
                {!query && (
                  <span className="a11y-search-hint" aria-hidden="true">
                    <kbd className="a11y-kbd a11y-kbd-sm">⌘</kbd>
                    <kbd className="a11y-kbd a11y-kbd-sm">/</kbd>
                  </span>
                )}
                {query && (
                  <button
                    className="a11y-search-clear"
                    onClick={() => setQuery("")}
                    aria-label="Clear"
                  >
                    <X className="a11y-search-clear-icon" />
                  </button>
                )}
              </div>

              <div className="a11y-tabs" role="tablist">
                <TabButton active={activeTab === "features"} onClick={() => { setActiveTab("features"); setActiveView("main"); }} icon={Sparkles} label="Features" />
                <TabButton active={activeTab === "profiles"} onClick={() => { setActiveTab("profiles"); setQuery(""); }} icon={UserCircle} label="Profiles" />
                <TabButton active={activeTab === "settings"} onClick={() => { setActiveTab("settings"); setQuery(""); }} icon={Gauge} label="Tune" />
              </div>

              <div className="a11y-body">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${activeTab}-${activeView}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16 }}
                  >
                    {activeTab === "features" && activeView === "main" && (
                      <FeaturesTab
                        settings={settings}
                        toggle={toggle}
                        setValue={setValue}
                        query={query}
                        onOpenColorBlind={() => setActiveView("colorblind")}
                      />
                    )}
                    {activeTab === "features" && activeView === "colorblind" && (
                      <ColorBlindView settings={settings} setValue={setValue} onBack={() => setActiveView("main")} />
                    )}
                    {activeTab === "profiles" && (
                      <ProfilesTab settings={settings} setProfile={setProfile} query={query} />
                    )}
                    {activeTab === "settings" && (
                      <SettingsTab settings={settings} setValue={setValue} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="a11y-footer">
                <button onClick={() => setConfirmReset(true)} className="a11y-reset" type="button">
                  <RotateCcw className="a11y-reset-icon" />
                  Reset all
                </button>
                <div className="a11y-footer-hint">
                  <Keyboard className="a11y-footer-hint-icon" />
                  <span>Ctrl + U</span>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dictResult && (
          <DictionaryPopup result={dictResult} loading={dictLoading} onClose={() => setDictResult(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShortcuts && (
          <ShortcutsModal onClose={() => setShowShortcuts(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmReset && (
          <ConfirmDialog
            title="Reset all settings?"
            message="This will restore every accessibility option to its default value."
            confirmLabel="Reset"
            tone="danger"
            onCancel={() => setConfirmReset(false)}
            onConfirm={resetAll}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`a11y-toast ${toast.tone === "danger" ? "is-danger" : ""}`}
            role="status"
            aria-live="polite"
          >
            {toast.tone === "danger"
              ? <AlertTriangle className="a11y-toast-icon" />
              : <CheckCircle2 className="a11y-toast-icon" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  if (!mounted || typeof document === "undefined" || !document.body) return null;
  return createPortal(widgetContent, document.body);
}

// ── Util: derive a friendly label for toasts
function labelFor(key) {
  const map = {
    contrast: "Contrast+",
    smartContrast: "Smart Contrast",
    highContrastDark: "Dark Contrast",
    highContrastLight: "Light Contrast",
    invertColors: "Invert Colors",
    monochrome: "Monochrome",
    hideImages: "Hide Images",
    linkUnderline: "Link Underline",
    highlightLinks: "Highlight Links",
    highlightHeadings: "Highlight Titles",
    readingGuide: "Reading Guide",
    readingMask: "Reading Mask",
    readingMode: "Reading Mode",
    textSpacing: "Text Spacing",
    dyslexiaFriendly: "Dyslexia Font",
    pauseAnimations: "Pause Animations",
    reduceMotion: "Reduce Motion",
    screenReader: "Screen Reader",
    muteSounds: "Mute Sounds",
    bigCursor: "Big Cursor",
    keyboardNav: "Keyboard Nav",
    focusMode: "Focus Mode",
    tooltips: "Tooltips",
    pageStructure: "Page Structure",
    dictionary: "Dictionary",
    oversizedWidget: "Oversized Widget",
  };
  return map[key] || key;
}

// ═══════════════════════════════════════════════════════════════
// FILTER OVERLAY
// ═══════════════════════════════════════════════════════════════
function FilterOverlay({ settings }) {
  const classes = ["a11y-filter-overlay"];
  let active = false;

  if (settings.highContrastDark) { classes.push("a11y-fo-hc-dark"); active = true; }
  if (settings.highContrastLight) { classes.push("a11y-fo-hc-light"); active = true; }
  if (settings.invertColors) { classes.push("a11y-fo-invert"); active = true; }
  if (settings.monochrome) { classes.push("a11y-fo-mono"); active = true; }
  if (settings.contrast) {
    if (settings.contrastMode === "dark") classes.push("a11y-fo-contrast-dark");
    else if (settings.contrastMode === "light") classes.push("a11y-fo-contrast-light");
    else classes.push("a11y-fo-contrast");
    active = true;
  }
  if (settings.smartContrast) { classes.push("a11y-fo-smart"); active = true; }
  if (settings.colorBlindMode) { classes.push(`a11y-fo-cb-${settings.colorBlindMode}`); active = true; }
  if (!active &&
      (settings.saturation !== 100 || settings.brightness !== 100)) {
    classes.push("a11y-fo-tune"); active = true;
  }

  if (!active) return null;

  return (
    <div
      className={classes.join(" ")}
      style={{
        "--fo-saturation": `${settings.saturation}%`,
        "--fo-brightness": `${settings.brightness}%`,
      }}
      aria-hidden="true"
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB BUTTON
// ═══════════════════════════════════════════════════════════════
function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={`a11y-tab ${active ? "is-active" : ""}`}
    >
      <Icon className="a11y-tab-icon" />
      <span className="a11y-tab-label">{label}</span>
      {active && (
        <motion.span
          layoutId="a11y-tab-indicator"
          className="a11y-tab-indicator"
          transition={{ type: "spring", stiffness: 500, damping: 34 }}
        />
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// FEATURES TAB
// ═══════════════════════════════════════════════════════════════
function FeaturesTab({ settings, toggle, setValue, query, onOpenColorBlind }) {
  const q = query.trim().toLowerCase();
  const match = (...labels) =>
    !q || labels.some((l) => String(l).toLowerCase().includes(q));

  const sections = [
    {
      label: "Vision",
      items: [
        { icon: Contrast, label: "Contrast +", active: settings.contrast, onClick: () => toggle("contrast") },
        { icon: Wand2, label: "Smart Contrast", active: settings.smartContrast, onClick: () => toggle("smartContrast") },
        { icon: Moon, label: "Dark Contrast", active: settings.highContrastDark, onClick: () => toggle("highContrastDark") },
        { icon: Sun, label: "Light Contrast", active: settings.highContrastLight, onClick: () => toggle("highContrastLight") },
        { icon: Droplet, label: "Color Blind", active: !!settings.colorBlindMode, onClick: onOpenColorBlind, hasSubmenu: true },
        { icon: Palette, label: "Invert Colors", active: settings.invertColors, onClick: () => toggle("invertColors") },
        { icon: Contrast, label: "Monochrome", active: settings.monochrome, onClick: () => toggle("monochrome") },
        { icon: ImageOff, label: "Hide Images", active: settings.hideImages, onClick: () => toggle("hideImages") },
      ],
    },
    {
      label: "Text & Reading",
      items: [
        { icon: Type, label: "Bigger Text", active: settings.textSize > 100,
          onClick: () => setValue("textSize", settings.textSize > 100 ? 100 : 125),
          indicator: `${settings.textSize}%` },
        { icon: AlignJustify, label: "Text Spacing", active: settings.textSpacing, onClick: () => toggle("textSpacing") },
        { icon: Underline, label: "Link Underline", active: settings.linkUnderline, onClick: () => toggle("linkUnderline") },
        { icon: BookOpen, label: "Dyslexia Font", active: settings.dyslexiaFriendly, onClick: () => toggle("dyslexiaFriendly") },
        { icon: Book, label: "Reading Mode", active: settings.readingMode, onClick: () => toggle("readingMode") },
        { icon: Book, label: "Dictionary", active: settings.dictionary, onClick: () => toggle("dictionary") },
        { icon: Ruler, label: "Reading Guide", active: settings.readingGuide, onClick: () => toggle("readingGuide") },
        { icon: Focus, label: "Reading Mask", active: settings.readingMask, onClick: () => toggle("readingMask") },
      ],
    },
    {
      label: "Navigation",
      items: [
        { icon: Link2, label: "Highlight Links", active: settings.highlightLinks, onClick: () => toggle("highlightLinks") },
        { icon: Heading1, label: "Highlight Titles", active: settings.highlightHeadings, onClick: () => toggle("highlightHeadings") },
        { icon: LayoutGrid, label: "Page Structure", active: settings.pageStructure, onClick: () => toggle("pageStructure") },
        { icon: Keyboard, label: "Keyboard Nav", active: settings.keyboardNav, onClick: () => toggle("keyboardNav") },
      ],
    },
    {
      label: "Motion",
      items: [
        { icon: Pause, label: "Pause Animations", active: settings.pauseAnimations, onClick: () => toggle("pauseAnimations") },
        { icon: Move, label: "Reduce Motion", active: settings.reduceMotion, onClick: () => toggle("reduceMotion") },
      ],
    },
    {
      label: "Assistive",
      items: [
        { icon: Volume2, label: "Screen Reader", active: settings.screenReader, onClick: () => toggle("screenReader") },
        { icon: VolumeX, label: "Mute Sounds", active: settings.muteSounds, onClick: () => toggle("muteSounds") },
        { icon: MousePointer2, label: "Big Cursor", active: settings.bigCursor, onClick: () => toggle("bigCursor") },
        { icon: Focus, label: "Focus Mode", active: settings.focusMode, onClick: () => toggle("focusMode") },
        { icon: MessageSquare, label: "Tooltips", active: settings.tooltips, onClick: () => toggle("tooltips") },
        { icon: Maximize2, label: "Oversized", active: settings.oversizedWidget, onClick: () => toggle("oversizedWidget") },
      ],
    },
  ];

  const anyMatch = sections.some((s) => s.items.some((it) => match(it.label, s.label)));

  if (q && !anyMatch) {
    return (
      <div className="a11y-empty">
        <Search className="a11y-empty-icon" />
        <p className="a11y-empty-title">No features found</p>
        <p className="a11y-empty-sub">Try searching for "contrast", "text", or "motion".</p>
      </div>
    );
  }

  return (
    <>
      {sections.map((section) => {
        const items = section.items.filter((it) => match(it.label, section.label));
        if (q && items.length === 0) return null;
        return (
          <div key={section.label}>
            <SectionLabel label={section.label} />
            <div className="a11y-grid">
              {items.map((it) => (
                <FeatureTile key={it.label} {...it} />
              ))}
            </div>
          </div>
        );
      })}

      {!q && (
        <>
          <SectionLabel label="Text Align" />
          <div className="a11y-row-group">
            {["default", "left", "center", "right"].map((align) => (
              <button key={align} type="button" onClick={() => setValue("textAlign", align)}
                className={`a11y-pill ${settings.textAlign === align ? "is-active" : ""}`}>
                {align.charAt(0).toUpperCase() + align.slice(1)}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function ColorBlindView({ settings, setValue, onBack }) {
  return (
    <div className="a11y-list">
      <button type="button" className="a11y-back" onClick={onBack}>
        <ChevronRight className="a11y-back-icon" /> Back
      </button>
      <p className="a11y-list-hint">Adjust colors to compensate for color vision deficiency</p>
      <button type="button" className={`a11y-list-item ${!settings.colorBlindMode ? "is-selected" : ""}`}
        onClick={() => { setValue("colorBlindMode", null); onBack(); }}>
        <div>
          <div className="a11y-list-title">Normal Vision</div>
          <div className="a11y-list-desc">No filter applied</div>
        </div>
        {!settings.colorBlindMode && <Check className="a11y-check-icon" />}
      </button>
      {COLOR_BLIND_MODES.map((mode) => (
        <button type="button" key={mode.id}
          className={`a11y-list-item ${settings.colorBlindMode === mode.id ? "is-selected" : ""}`}
          onClick={() => { setValue("colorBlindMode", mode.id); onBack(); }}>
          <div>
            <div className="a11y-list-title">{mode.label}</div>
            <div className="a11y-list-desc">{mode.desc}</div>
          </div>
          {settings.colorBlindMode === mode.id && <Check className="a11y-check-icon" />}
        </button>
      ))}
    </div>
  );
}

function ProfilesTab({ settings, setProfile, query }) {
  const q = query.trim().toLowerCase();
  return (
    <div className="a11y-list">
      <p className="a11y-list-hint">One-click presets tuned for specific accessibility needs</p>
      <button type="button" className={`a11y-list-item ${!settings.profile ? "is-selected" : ""}`} onClick={() => setProfile(null)}>
        <div>
          <div className="a11y-list-title">Default</div>
          <div className="a11y-list-desc">No preset applied</div>
        </div>
        {!settings.profile && <Check className="a11y-check-icon" />}
      </button>
      {PROFILES
        .filter((p) => !q || p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q))
        .map((profile) => {
          const Icon = profile.icon;
          return (
            <button type="button" key={profile.id}
              className={`a11y-list-item ${settings.profile === profile.id ? "is-selected" : ""}`}
              onClick={() => setProfile(profile.id)}>
              <div className="a11y-list-item-left">
                <div className="a11y-list-icon-badge"><Icon className="a11y-list-icon" /></div>
                <div>
                  <div className="a11y-list-title">{profile.label}</div>
                  <div className="a11y-list-desc">{profile.desc}</div>
                </div>
              </div>
              {settings.profile === profile.id && <Check className="a11y-check-icon" />}
            </button>
          );
        })}
    </div>
  );
}

function SettingsTab({ settings, setValue }) {
  return (
    <>
      <SectionLabel label="Reading" />
      <SliderRow icon={Type} label="Text Size" value={settings.textSize} min={90} max={150} step={5} unit="%" onChange={(v) => setValue("textSize", v)} />
      <SliderRow icon={AlignJustify} label="Line Height" value={settings.lineHeight} min={100} max={220} step={10} unit="%" onChange={(v) => setValue("lineHeight", v)} />
      <SliderRow icon={AlignJustify} label="Letter Spacing" value={settings.letterSpacing} min={0} max={5} step={1} unit="px" onChange={(v) => setValue("letterSpacing", v)} />

      <SectionLabel label="Colors" />
      <SliderRow icon={Droplet} label="Saturation" value={settings.saturation} min={0} max={200} step={10} unit="%" onChange={(v) => setValue("saturation", v)} />
      <SliderRow icon={Sun} label="Brightness" value={settings.brightness} min={50} max={150} step={5} unit="%" onChange={(v) => setValue("brightness", v)} />

      <SectionLabel label="Voice" />
      <SliderRow icon={Volume2} label="Voice Speed" value={settings.voiceSpeed} min={0.5} max={2} step={0.1} unit="x" onChange={(v) => setValue("voiceSpeed", v)} decimals={1} />
      <SliderRow icon={Volume2} label="Voice Pitch" value={settings.voicePitch} min={0.5} max={2} step={0.1} unit="x" onChange={(v) => setValue("voicePitch", v)} decimals={1} />

      <SectionLabel label="Contrast Mode" />
      <div className="a11y-row-group">
        {CONTRAST_MODES.map((mode) => (
          <button key={mode.id} type="button"
            onClick={() => setValue("contrastMode", mode.id)}
            className={`a11y-pill ${settings.contrastMode === mode.id ? "is-active" : ""}`}>
            {mode.label}
          </button>
        ))}
      </div>

      <SectionLabel label="Widget Position" />
      <div className="a11y-row-group">
        <button type="button" onClick={() => setValue("widgetPosition", "left")} className={`a11y-pill ${settings.widgetPosition === "left" ? "is-active" : ""}`}>Left</button>
        <button type="button" onClick={() => setValue("widgetPosition", "right")} className={`a11y-pill ${settings.widgetPosition === "right" ? "is-active" : ""}`}>Right</button>
      </div>
    </>
  );
}

function SectionLabel({ label }) { return <div className="a11y-section-label">{label}</div>; }

function FeatureTile({ icon: Icon, label, active, onClick, indicator, hasSubmenu }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      className={`a11y-tile ${active ? "is-active" : ""}`}
      aria-pressed={active}
    >
      <span className="a11y-tile-icon"><Icon className="a11y-tile-icon-svg" /></span>
      <span className="a11y-tile-label">{label}</span>
      {indicator && <span className="a11y-tile-indicator">{indicator}</span>}
      {hasSubmenu && <ChevronRight className="a11y-tile-submenu" />}
      <AnimatePresence>
        {active && !hasSubmenu && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 24 }}
            className="a11y-tile-check-wrap"
          >
            <Check className="a11y-tile-check" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function SliderRow({ icon: Icon, label, value, min, max, step, unit, onChange, decimals = 0 }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="a11y-slider-row">
      <div className="a11y-slider-header">
        <div className="a11y-slider-label"><Icon className="a11y-slider-icon" /><span>{label}</span></div>
        <span className="a11y-slider-value">{decimals > 0 ? Number(value).toFixed(decimals) : value}{unit}</span>
      </div>
      <div className="a11y-slider-track">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="a11y-slider" style={{ "--pct": `${pct}%` }} />
      </div>
    </div>
  );
}

function DictionaryPopup({ result, loading, onClose }) {
  const { word, data, error } = result;
  const entry = data?.[0];
  const meanings = entry?.meanings?.slice(0, 3) || [];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="a11y-dict" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }} className="a11y-dict-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="a11y-dict-close" onClick={onClose} aria-label="Close">
          <X className="a11y-dict-close-icon" />
        </button>
        <div className="a11y-dict-head">
          <div className="a11y-dict-icon-badge"><Book className="a11y-dict-icon" /></div>
          <div>
            <div className="a11y-dict-word">{word}</div>
            {entry?.phonetic && <div className="a11y-dict-phonetic">{entry.phonetic}</div>}
          </div>
        </div>
        <div className="a11y-dict-body">
          {loading && <div className="a11y-dict-loading"><div className="a11y-dict-spinner" /><span>Looking up…</span></div>}
          {!loading && error && <div className="a11y-dict-error"><Info className="a11y-dict-error-icon" /><span>{error}</span></div>}
          {!loading && meanings.map((meaning, i) => (
            <div key={i} className="a11y-dict-meaning">
              <div className="a11y-dict-pos">{meaning.partOfSpeech}</div>
              <ol className="a11y-dict-defs">
                {meaning.definitions.slice(0, 3).map((def, j) => (
                  <li key={j} className="a11y-dict-def">{def.definition}
                    {def.example && <div className="a11y-dict-example">"{def.example}"</div>}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <div className="a11y-dict-foot">Powered by <strong>Free Dictionary API</strong></div>
      </motion.div>
    </motion.div>
  );
}

function ShortcutsModal({ onClose }) {
  const rows = [
    { keys: ["Ctrl", "U"], desc: "Toggle widget" },
    { keys: ["Ctrl", "/"], desc: "Focus search" },
    { keys: ["Esc"], desc: "Close panel" },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="a11y-dict" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }} className="a11y-dict-card a11y-lang-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="a11y-dict-close" onClick={onClose} aria-label="Close">
          <X className="a11y-dict-close-icon" />
        </button>
        <div className="a11y-dict-head">
          <div className="a11y-dict-icon-badge"><Command className="a11y-dict-icon" /></div>
          <div><div className="a11y-dict-word">Shortcuts</div></div>
        </div>
        <div className="a11y-shortcut-list">
          {rows.map((r, i) => (
            <div key={i} className="a11y-shortcut-row">
              <div className="a11y-shortcut-keys">
                {r.keys.map((k) => <kbd key={k} className="a11y-kbd">{k}</kbd>)}
              </div>
              <span className="a11y-shortcut-desc">{r.desc}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ConfirmDialog({ title, message, confirmLabel = "Confirm", tone = "danger", onCancel, onConfirm }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="a11y-dict"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.94, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 12 }}
        transition={{ type: "spring", stiffness: 340, damping: 26 }}
        className="a11y-confirm-card"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className={`a11y-confirm-icon ${tone === "danger" ? "is-danger" : ""}`}>
          <AlertTriangle className="a11y-confirm-icon-svg" />
        </div>
        <h3 className="a11y-confirm-title">{title}</h3>
        <p className="a11y-confirm-message">{message}</p>
        <div className="a11y-confirm-actions">
          <button type="button" className="a11y-confirm-btn a11y-confirm-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`a11y-confirm-btn ${tone === "danger" ? "a11y-confirm-danger" : "a11y-confirm-primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ColorBlindFilters() {
  return (
    <svg className="a11y-svg-defs" aria-hidden="true">
      <defs>
        <filter id="a11y-protanopia">
          <feColorMatrix type="matrix" values="0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0" />
        </filter>
        <filter id="a11y-deuteranopia">
          <feColorMatrix type="matrix" values="0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0" />
        </filter>
        <filter id="a11y-tritanopia">
          <feColorMatrix type="matrix" values="0.95 0.05 0 0 0 0 0.433 0.567 0 0 0 0.475 0.525 0 0 0 0 0 1 0" />
        </filter>
        <filter id="a11y-achromatopsia">
          <feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0" />
        </filter>
        <filter id="a11y-inverted">
          <feColorMatrix type="matrix" values="-1 0 0 0 1 0 -1 0 0 1 0 0 -1 0 1 0 0 0 1 0" />
        </filter>
      </defs>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════
const A11Y_STYLES = `
.a11y-reading-guide,
.a11y-reading-mask {
  display: none !important;
  pointer-events: none !important;
}
html.a11y-show-reading-guide .a11y-reading-guide { display: block !important; }
html.a11y-show-reading-mask .a11y-reading-mask { display: block !important; }

.a11y-svg-defs { position: absolute; width: 0; height: 0; overflow: hidden; pointer-events: none; }

.a11y-filter-overlay {
  position: fixed; inset: 0; z-index: 999990;
  pointer-events: none;
  background: rgba(255,255,255,0.001);
  will-change: backdrop-filter;
}
.a11y-filter-overlay.a11y-fo-tune {
  backdrop-filter: saturate(var(--fo-saturation,100%)) brightness(var(--fo-brightness,100%));
  -webkit-backdrop-filter: saturate(var(--fo-saturation,100%)) brightness(var(--fo-brightness,100%));
}
.a11y-filter-overlay.a11y-fo-contrast {
  backdrop-filter: contrast(1.35) saturate(var(--fo-saturation,100%)) brightness(var(--fo-brightness,100%));
  -webkit-backdrop-filter: contrast(1.35) saturate(var(--fo-saturation,100%)) brightness(var(--fo-brightness,100%));
}
.a11y-filter-overlay.a11y-fo-contrast-dark {
  backdrop-filter: contrast(1.6) brightness(0.72) saturate(var(--fo-saturation,100%));
  -webkit-backdrop-filter: contrast(1.6) brightness(0.72) saturate(var(--fo-saturation,100%));
}
.a11y-filter-overlay.a11y-fo-contrast-light {
  backdrop-filter: contrast(1.6) brightness(1.18) saturate(var(--fo-saturation,100%));
  -webkit-backdrop-filter: contrast(1.6) brightness(1.18) saturate(var(--fo-saturation,100%));
}
.a11y-filter-overlay.a11y-fo-hc-dark {
  backdrop-filter: contrast(1.8) brightness(0.6) saturate(1.15);
  -webkit-backdrop-filter: contrast(1.8) brightness(0.6) saturate(1.15);
}
.a11y-filter-overlay.a11y-fo-hc-light {
  backdrop-filter: contrast(1.8) brightness(1.25) saturate(1.15);
  -webkit-backdrop-filter: contrast(1.8) brightness(1.25) saturate(1.15);
}
.a11y-filter-overlay.a11y-fo-smart {
  backdrop-filter: contrast(1.15) saturate(var(--fo-saturation,100%)) brightness(var(--fo-brightness,100%));
  -webkit-backdrop-filter: contrast(1.15) saturate(var(--fo-saturation,100%)) brightness(var(--fo-brightness,100%));
}
.a11y-filter-overlay.a11y-fo-cb-protanopia { backdrop-filter: saturate(0.4) hue-rotate(15deg); -webkit-backdrop-filter: saturate(0.4) hue-rotate(15deg); }
.a11y-filter-overlay.a11y-fo-cb-deuteranopia { backdrop-filter: saturate(0.4) hue-rotate(-15deg); -webkit-backdrop-filter: saturate(0.4) hue-rotate(-15deg); }
.a11y-filter-overlay.a11y-fo-cb-tritanopia { backdrop-filter: saturate(0.6) hue-rotate(90deg); -webkit-backdrop-filter: saturate(0.6) hue-rotate(90deg); }
.a11y-filter-overlay.a11y-fo-cb-achromatopsia { backdrop-filter: grayscale(1); -webkit-backdrop-filter: grayscale(1); }
.a11y-filter-overlay.a11y-fo-cb-inverted { backdrop-filter: invert(1); -webkit-backdrop-filter: invert(1); }
.a11y-filter-overlay.a11y-fo-invert { backdrop-filter: invert(1) hue-rotate(180deg); -webkit-backdrop-filter: invert(1) hue-rotate(180deg); }
.a11y-filter-overlay.a11y-fo-mono { backdrop-filter: grayscale(1) contrast(1.2); -webkit-backdrop-filter: grayscale(1) contrast(1.2); }

/* ─── TRIGGER ───────────────────────────────────────────── */
.a11y-trigger {
  position: fixed !important;
  bottom: 20px; left: 20px; top: auto; right: auto;
  z-index: 2147483646 !important;
  display: flex; align-items: center; justify-content: center;
  width: 58px; height: 58px; border-radius: 50%;
  background: linear-gradient(135deg, #0F4C36 0%, #0A2B1D 100%);
  color: white; border: none; cursor: pointer;
  pointer-events: auto !important;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.14) inset,
    0 10px 32px -8px rgba(15,76,54,0.55),
    0 4px 14px -4px rgba(0,0,0,0.25);
  transition: transform 0.24s cubic-bezier(.2,.9,.3,1.4),
              box-shadow 0.24s ease,
              background 0.2s ease;
  font-family: inherit;
}
html.a11y-pos-right .a11y-trigger { left: auto; right: 20px; }
.a11y-trigger:hover {
  transform: scale(1.08) rotate(-3deg);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.2) inset,
    0 16px 44px -8px rgba(15,76,54,0.65),
    0 6px 18px -6px rgba(0,0,0,0.3);
}
.a11y-trigger:active { transform: scale(0.94); }
.a11y-trigger:focus-visible { outline: 3px solid #A8FF7A; outline-offset: 3px; }
.a11y-trigger-icon { width: 26px; height: 26px; transition: transform 0.3s cubic-bezier(.2,.9,.3,1.4); }
.a11y-trigger:hover .a11y-trigger-icon { transform: rotate(8deg); }

.a11y-trigger-badge {
  position: absolute; top: -5px; right: -5px;
  min-width: 22px; height: 22px; padding: 0 6px;
  border-radius: 11px;
  background: linear-gradient(135deg, #FF3D52, #E11D34);
  color: white;
  font-size: 11px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid #fff;
  box-shadow: 0 3px 10px rgba(255,45,62,0.45), 0 0 0 4px rgba(255,45,62,0.12);
  letter-spacing: -0.02em;
}

.a11y-trigger-ring {
  position: absolute; inset: -4px;
  border-radius: 50%;
  border: 2px solid rgba(168,255,122,0.7);
  animation: a11y-ring 2.4s ease-out infinite;
  pointer-events: none;
}
@keyframes a11y-ring {
  0%   { transform: scale(0.9); opacity: 0.9; }
  70%  { transform: scale(1.4); opacity: 0; }
  100% { transform: scale(1.4); opacity: 0; }
}

html.a11y-oversized-widget .a11y-trigger { width: 76px; height: 76px; }
html.a11y-oversized-widget .a11y-trigger-icon { width: 36px; height: 36px; }
html.a11y-oversized-widget .a11y-panel { width: 500px; max-width: 100vw; }
html.a11y-oversized-widget .a11y-tile { padding: 20px 12px; }
html.a11y-oversized-widget .a11y-tile-icon-svg { width: 32px; height: 32px; }

/* ─── BACKDROP ──────────────────────────────────────────── */
.a11y-backdrop {
  position: fixed; inset: 0; z-index: 2147483645;
  background: rgba(10,43,29,0.44);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  pointer-events: auto;
}

/* ─── PANEL ─────────────────────────────────────────────── */
.a11y-panel {
  position: fixed; top: 0; right: 0; bottom: 0;
  z-index: 2147483647;
  width: 420px; max-width: 100vw;
  display: flex; flex-direction: column;
  background: #F6F8F4;
  box-shadow:
    -1px 0 0 rgba(15,76,54,0.06),
    -24px 0 72px -24px rgba(10,43,29,0.4);
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
  touch-action: pan-y;
  overscroll-behavior: contain;
  pointer-events: auto;
  -webkit-font-smoothing: antialiased;
}
html.a11y-pos-left .a11y-panel {
  right: auto; left: 0;
  box-shadow:
    1px 0 0 rgba(15,76,54,0.06),
    24px 0 72px -24px rgba(10,43,29,0.4);
}
@media (max-width: 480px) {
  .a11y-panel { width: 100vw; }
  .a11y-trigger { bottom: 16px; }
  .a11y-trigger, html.a11y-pos-right .a11y-trigger { left: 16px; right: auto; }
  html.a11y-pos-right .a11y-trigger { left: auto; right: 16px; }
}

/* ─── HEADER ────────────────────────────────────────────── */
.a11y-header {
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px;
  background: linear-gradient(135deg, #0F4C36 0%, #0A2B1D 100%);
  color: white;
  flex-shrink: 0;
}
.a11y-header-glow {
  position: absolute; inset: -50% -20% auto auto;
  width: 260px; height: 260px;
  background: radial-gradient(circle, rgba(168,255,122,0.22) 0%, transparent 65%);
  pointer-events: none;
}
.a11y-header-left { position: relative; display: flex; align-items: center; gap: 12px; }
.a11y-header-logo {
  display: flex; align-items: center; justify-content: center;
  width: 42px; height: 42px; border-radius: 13px;
  background: linear-gradient(135deg, rgba(168,255,122,0.2), rgba(168,255,122,0.06));
  color: #A8FF7A;
  box-shadow: 0 1px 0 rgba(255,255,255,0.16) inset;
}
.a11y-header-icon { width: 22px; height: 22px; }
.a11y-header-title { font-size: 15.5px; font-weight: 700; margin: 0; line-height: 1.2; letter-spacing: -0.01em; }
.a11y-header-sub { font-size: 11.5px; margin: 3px 0 0; color: rgba(255,255,255,0.68); font-weight: 500; }
.a11y-header-actions { position: relative; display: flex; gap: 6px; }
.a11y-close {
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 50%;
  background: rgba(255,255,255,0.1); border: none; color: white;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.2s ease;
}
.a11y-close:hover { background: rgba(255,255,255,0.22); transform: scale(1.06); }
.a11y-close:focus-visible { outline: 2px solid #A8FF7A; outline-offset: 2px; }
.a11y-close-icon { width: 15px; height: 15px; }

/* ─── SEARCH ────────────────────────────────────────────── */
.a11y-search-wrap {
  position: relative;
  padding: 12px 14px 0 14px;
  background: #FFFFFF;
  flex-shrink: 0;
}
.a11y-search-icon {
  position: absolute; top: 50%; left: 26px; transform: translateY(-28%);
  width: 15px; height: 15px; color: #6B7E71; pointer-events: none;
}
.a11y-search {
  width: 100%; padding: 11px 40px 11px 34px;
  background: #F0F3EE;
  border: 1px solid transparent;
  border-radius: 11px;
  font-family: inherit;
  font-size: 13px; color: #0A2B1D;
  outline: none;
  transition: all 0.15s ease;
}
.a11y-search::placeholder { color: #97A89E; }
.a11y-search:focus { border-color: #0F4C36; background: #FFFFFF; box-shadow: 0 0 0 3px rgba(15,76,54,0.09); }
.a11y-search-clear {
  position: absolute; top: 50%; right: 22px; transform: translateY(-28%);
  display: flex; align-items: center; justify-content: center;
  width: 22px; height: 22px;
  border-radius: 50%; border: none;
  background: rgba(15,76,54,0.08); color: #0F4C36;
  cursor: pointer;
}
.a11y-search-clear:hover { background: rgba(15,76,54,0.16); }
.a11y-search-clear-icon { width: 11px; height: 11px; }
.a11y-search-hint {
  position: absolute; top: 50%; right: 24px; transform: translateY(-28%);
  display: inline-flex; gap: 3px; pointer-events: none;
  opacity: 0.7;
}

/* ─── TABS ──────────────────────────────────────────────── */
.a11y-tabs {
  position: relative;
  display: flex; gap: 4px; padding: 10px 12px 0 12px;
  background: #FFFFFF;
  border-bottom: 1px solid rgba(15,76,54,0.06);
  flex-shrink: 0;
}
.a11y-tab {
  position: relative;
  flex: 1; display: flex; align-items: center; justify-content: center;
  gap: 6px; padding: 10px 8px;
  background: transparent; border: none;
  border-radius: 10px 10px 0 0;
  color: #5F7368; font-family: inherit;
  font-size: 12px; font-weight: 600;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}
.a11y-tab:hover { color: #0F4C36; background: rgba(15,76,54,0.04); }
.a11y-tab.is-active { color: #0F4C36; }
.a11y-tab-indicator {
  position: absolute; bottom: -1px;
  left: 12px; right: 12px; height: 2.5px;
  background: linear-gradient(90deg, #0F4C36, #A8FF7A);
  border-radius: 2px;
}
.a11y-tab-icon { width: 14px; height: 14px; }
.a11y-tab-label { font-size: 11.5px; }

/* ─── BODY ──────────────────────────────────────────────── */
.a11y-body {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  padding: 16px;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
.a11y-body::-webkit-scrollbar { width: 8px; }
.a11y-body::-webkit-scrollbar-thumb { background: rgba(15,76,54,0.14); border-radius: 4px; border: 2px solid transparent; background-clip: content-box; }
.a11y-body::-webkit-scrollbar-thumb:hover { background: rgba(15,76,54,0.28); background-clip: content-box; }

.a11y-section-label {
  font-size: 10.5px; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.12em;
  color: #5F7368; margin: 18px 4px 8px;
}
.a11y-section-label:first-child { margin-top: 4px; }

.a11y-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }

/* ─── TILE ──────────────────────────────────────────────── */
.a11y-tile {
  position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 16px 10px;
  background: #FFFFFF;
  border: 1px solid rgba(15,76,54,0.08);
  border-radius: 14px; cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease,
              transform 0.18s cubic-bezier(.2,.9,.3,1.2),
              background 0.18s ease, color 0.18s ease;
  font-family: inherit; color: #0A2B1D;
  box-shadow: 0 1px 2px rgba(15,76,54,0.03);
  text-align: center;
}
.a11y-tile:hover {
  border-color: rgba(168,255,122,0.85);
  transform: translateY(-2px);
  box-shadow: 0 12px 26px -12px rgba(15,76,54,0.22), 0 1px 2px rgba(15,76,54,0.04);
}
.a11y-tile:focus-visible { outline: 3px solid #A8FF7A; outline-offset: 2px; }
.a11y-tile.is-active {
  background: linear-gradient(135deg, #0F4C36 0%, #0A2B1D 100%);
  border-color: #0F4C36; color: white;
  box-shadow: 0 12px 28px -10px rgba(15,76,54,0.5), 0 1px 0 rgba(255,255,255,0.12) inset;
}
.a11y-tile.is-active .a11y-tile-icon { background: rgba(168,255,122,0.2); color: #A8FF7A; }
.a11y-tile-icon {
  display: flex; align-items: center; justify-content: center;
  width: 42px; height: 42px; border-radius: 12px;
  background: rgba(15,76,54,0.06); color: #0F4C36;
  transition: all 0.18s ease;
}
.a11y-tile-icon-svg { width: 20px; height: 20px; }
.a11y-tile-label { font-size: 11.5px; font-weight: 600; text-align: center; line-height: 1.3; }
.a11y-tile-indicator {
  position: absolute; top: 6px; left: 8px;
  font-size: 10px; font-weight: 700; color: #0F4C36;
  background: rgba(15,76,54,0.08);
  padding: 2px 6px; border-radius: 6px;
  font-family: ui-monospace, monospace;
  letter-spacing: -0.02em;
}
.a11y-tile.is-active .a11y-tile-indicator { background: rgba(168,255,122,0.2); color: #A8FF7A; }
.a11y-tile-check-wrap {
  position: absolute; top: 6px; right: 6px;
  display: flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; border-radius: 50%;
  background: rgba(168,255,122,0.22);
}
.a11y-tile-check { width: 12px; height: 12px; color: #A8FF7A; }
.a11y-tile-submenu { position: absolute; top: 6px; right: 6px; width: 14px; height: 14px; color: #5F7368; }
.a11y-tile.is-active .a11y-tile-submenu { color: #A8FF7A; }

/* ─── EMPTY ─────────────────────────────────────────────── */
.a11y-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 56px 20px; gap: 8px; text-align: center;
}
.a11y-empty-icon { width: 34px; height: 34px; opacity: 0.35; color: #0F4C36; margin-bottom: 4px; }
.a11y-empty-title { font-size: 14px; font-weight: 700; color: #0A2B1D; margin: 0; }
.a11y-empty-sub { font-size: 12px; color: #5F7368; margin: 0; max-width: 240px; line-height: 1.5; }

/* ─── LIST ──────────────────────────────────────────────── */
.a11y-list { display: flex; flex-direction: column; gap: 8px; }
.a11y-list-hint { font-size: 12px; color: #5F7368; margin: 4px 4px 8px; line-height: 1.55; }
.a11y-back {
  display: inline-flex; align-items: center; gap: 4px;
  align-self: flex-start; padding: 6px 10px; margin-bottom: 4px;
  background: rgba(15,76,54,0.05); border: none;
  color: #0F4C36; font-weight: 600; font-size: 12px;
  cursor: pointer; border-radius: 8px;
  transition: background 0.15s ease; font-family: inherit;
}
.a11y-back:hover { background: rgba(15,76,54,0.12); }
.a11y-back-icon { width: 14px; height: 14px; transform: rotate(180deg); }
.a11y-list-item {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 14px 16px;
  background: #FFFFFF;
  border: 1px solid rgba(15,76,54,0.08);
  border-radius: 12px; cursor: pointer;
  font-size: 14px; font-weight: 500; color: #0A2B1D;
  text-align: left; font-family: inherit;
  transition: border-color 0.15s ease, background 0.15s ease,
              transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 1px 2px rgba(15,76,54,0.03);
}
.a11y-list-item:hover {
  border-color: rgba(168,255,122,0.7);
  background: #F9FCF7;
  transform: translateY(-1px);
  box-shadow: 0 10px 24px -12px rgba(15,76,54,0.22);
}
.a11y-list-item.is-selected { border-color: #0F4C36; background: rgba(15,76,54,0.04); font-weight: 700; box-shadow: 0 0 0 2px rgba(15,76,54,0.06); }
.a11y-list-item-left { display: flex; align-items: center; gap: 12px; }
.a11y-list-icon-badge {
  display: flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; border-radius: 11px;
  background: linear-gradient(135deg, rgba(15,76,54,0.08), rgba(15,76,54,0.03));
  color: #0F4C36; flex-shrink: 0;
}
.a11y-list-icon { width: 18px; height: 18px; }
.a11y-list-title { font-size: 14px; font-weight: 700; color: #0A2B1D; }
.a11y-list-desc { font-size: 11.5px; color: #5F7368; margin-top: 2px; line-height: 1.45; }
.a11y-check-icon { width: 18px; height: 18px; color: #0F4C36; flex-shrink: 0; }

/* ─── PILLS ─────────────────────────────────────────────── */
.a11y-row-group { display: flex; gap: 8px; flex-wrap: wrap; }
.a11y-pill {
  flex: 1; min-width: 80px; padding: 10px 14px;
  background: #FFFFFF;
  border: 1px solid rgba(15,76,54,0.1);
  border-radius: 10px; color: #0A2B1D;
  font-size: 12.5px; font-weight: 600;
  font-family: inherit; cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
  box-shadow: 0 1px 2px rgba(15,76,54,0.03);
}
.a11y-pill:hover { border-color: rgba(168,255,122,0.7); background: #F9FCF7; }
.a11y-pill.is-active {
  background: linear-gradient(135deg, #0F4C36, #0A2B1D);
  border-color: #0F4C36; color: white;
  box-shadow: 0 8px 18px -8px rgba(15,76,54,0.45);
}

/* ─── SLIDER ────────────────────────────────────────────── */
.a11y-slider-row {
  background: #FFFFFF;
  border: 1px solid rgba(15,76,54,0.08);
  border-radius: 14px; padding: 14px 16px; margin-bottom: 10px;
  box-shadow: 0 1px 2px rgba(15,76,54,0.03);
}
.a11y-slider-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.a11y-slider-label { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #0A2B1D; }
.a11y-slider-icon { width: 16px; height: 16px; color: #0F4C36; }
.a11y-slider-value {
  font-size: 12px; font-weight: 700; color: #0F4C36;
  background: rgba(15,76,54,0.06);
  padding: 3px 8px; border-radius: 6px;
  font-family: ui-monospace, monospace;
  min-width: 56px; text-align: center;
}
.a11y-slider-track { position: relative; }
.a11y-slider {
  -webkit-appearance: none; appearance: none;
  width: 100%; height: 6px;
  background: linear-gradient(90deg,
    #0F4C36 0%, #0F4C36 var(--pct,50%),
    rgba(15,76,54,0.12) var(--pct,50%),
    rgba(15,76,54,0.12) 100%);
  border-radius: 3px; outline: none; cursor: pointer;
}
.a11y-slider::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 20px; height: 20px;
  background: white; border: 3px solid #0F4C36;
  border-radius: 50%; cursor: pointer;
  box-shadow: 0 2px 8px rgba(15,76,54,0.3);
  transition: transform 0.15s ease;
}
.a11y-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
.a11y-slider::-moz-range-thumb {
  width: 20px; height: 20px;
  background: white; border: 3px solid #0F4C36;
  border-radius: 50%; cursor: pointer;
}

/* ─── FOOTER ────────────────────────────────────────────── */
.a11y-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px;
  background: #FFFFFF;
  border-top: 1px solid rgba(15,76,54,0.08);
  flex-shrink: 0;
}
.a11y-reset {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px;
  background: transparent;
  border: 1px solid rgba(15,76,54,0.2);
  border-radius: 20px; color: #0F4C36;
  font-weight: 600; font-size: 12px;
  cursor: pointer; font-family: inherit;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}
.a11y-reset:hover { background: rgba(15,76,54,0.05); border-color: #0F4C36; transform: translateY(-1px); }
.a11y-reset-icon { width: 12px; height: 12px; }
.a11y-footer-hint {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px;
  background: rgba(15,76,54,0.06);
  border-radius: 6px; color: #5F7368;
  font-size: 11px; font-weight: 600;
  font-family: ui-monospace, 'SF Mono', monospace;
}
.a11y-footer-hint-icon { width: 12px; height: 12px; }

/* ─── GUIDES ────────────────────────────────────────────── */
.a11y-reading-guide {
  position: fixed;
  left: 0; right: 0; top: 0;
  height: 24px;
  z-index: 999980;
  background: rgba(168,255,122,0.4);
  border-top: 2px solid #A8FF7A;
  border-bottom: 2px solid #A8FF7A;
  pointer-events: none !important;
  transition: transform 0.05s linear;
  box-shadow: 0 4px 24px rgba(168,255,122,0.5);
}
.a11y-reading-mask {
  position: fixed; inset: 0; z-index: 999979;
  pointer-events: none !important;
  background: linear-gradient(
    180deg,
    rgba(0,0,0,0.7) 0,
    rgba(0,0,0,0.7) var(--mask-top,0px),
    transparent var(--mask-top,0px),
    transparent calc(100% - var(--mask-bottom,0px)),
    rgba(0,0,0,0.7) calc(100% - var(--mask-bottom,0px)),
    rgba(0,0,0,0.7) 100%
  );
}

/* ─── DICTIONARY ────────────────────────────────────────── */
.a11y-dict {
  position: fixed; inset: 0; z-index: 2147483647;
  display: flex; align-items: center; justify-content: center;
  background: rgba(10,43,29,0.6);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  padding: 20px;
  animation: a11y-fade-in 0.2s ease;
}
@keyframes a11y-fade-in { from { opacity: 0; } to { opacity: 1; } }
.a11y-dict-card {
  position: relative;
  width: 100%; max-width: 460px; max-height: 82vh;
  background: white; border-radius: 20px;
  box-shadow: 0 40px 100px -30px rgba(10,43,29,0.55);
  display: flex; flex-direction: column;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
}
.a11y-dict-close {
  position: absolute; top: 12px; right: 12px;
  width: 30px; height: 30px; border-radius: 50%;
  background: rgba(15,76,54,0.06); border: none; color: #0A2B1D;
  cursor: pointer; z-index: 2;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s ease;
}
.a11y-dict-close:hover { background: rgba(15,76,54,0.16); }
.a11y-dict-close-icon { width: 14px; height: 14px; }
.a11y-dict-head {
  display: flex; align-items: center; gap: 12px;
  padding: 20px 20px 14px;
  border-bottom: 1px solid rgba(15,76,54,0.08);
}
.a11y-dict-icon-badge {
  display: flex; align-items: center; justify-content: center;
  width: 42px; height: 42px; border-radius: 12px;
  background: linear-gradient(135deg, #0F4C36 0%, #0A2B1D 100%);
  color: #A8FF7A; flex-shrink: 0;
}
.a11y-dict-icon { width: 20px; height: 20px; }
.a11y-dict-word { font-size: 20px; font-weight: 800; color: #0A2B1D; line-height: 1.2; text-transform: capitalize; }
.a11y-dict-phonetic { font-size: 12px; color: #5F7368; margin-top: 2px; font-family: ui-monospace, monospace; }
.a11y-dict-body { padding: 16px 20px; overflow-y: auto; flex: 1; }
.a11y-dict-loading { display: flex; align-items: center; gap: 10px; color: #5F7368; font-size: 13px; padding: 12px 0; }
.a11y-dict-spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(15,76,54,0.15);
  border-top-color: #0F4C36;
  border-radius: 50%;
  animation: a11y-spin 0.8s linear infinite;
}
@keyframes a11y-spin { to { transform: rotate(360deg); } }
.a11y-dict-error {
  display: flex; align-items: center; gap: 8px;
  padding: 12px; background: rgba(255,45,62,0.08);
  border-radius: 10px; color: #FF2D3E; font-size: 13px;
}
.a11y-dict-error-icon { width: 14px; height: 14px; flex-shrink: 0; }
.a11y-dict-meaning { margin-bottom: 16px; }
.a11y-dict-pos {
  display: inline-block;
  font-size: 10px; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.1em;
  color: #0F4C36; background: rgba(168,255,122,0.3);
  padding: 3px 8px; border-radius: 6px; margin-bottom: 8px;
}
.a11y-dict-defs { list-style: none; padding: 0; margin: 0; counter-reset: def; }
.a11y-dict-def {
  position: relative; padding-left: 24px;
  font-size: 13.5px; color: #0A2B1D; line-height: 1.6;
  margin-bottom: 8px; counter-increment: def;
}
.a11y-dict-def::before {
  content: counter(def) ".";
  position: absolute; left: 4px; top: 0;
  color: #A8FF7A; font-weight: 800; font-size: 12px;
}
.a11y-dict-example {
  font-style: italic; color: #5F7368; font-size: 12px;
  margin-top: 4px; padding-left: 6px;
  border-left: 2px solid rgba(168,255,122,0.6);
}
.a11y-dict-foot {
  padding: 10px 20px;
  background: rgba(15,76,54,0.03);
  border-top: 1px solid rgba(15,76,54,0.06);
  font-size: 10.5px; color: #5F7368; text-align: center;
}
.a11y-dict-foot strong { color: #0F4C36; font-weight: 700; }

.a11y-lang-card { max-width: 520px; }

.a11y-shortcut-list { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
.a11y-shortcut-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.a11y-shortcut-keys { display: flex; gap: 4px; }
.a11y-kbd {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 28px; height: 28px; padding: 0 8px;
  background: #F0F3EE;
  border: 1px solid rgba(15,76,54,0.15);
  border-bottom-width: 2px;
  border-radius: 6px;
  font-family: ui-monospace, monospace;
  font-size: 11px; font-weight: 700;
  color: #0A2B1D;
}
.a11y-kbd-sm { min-width: 20px; height: 20px; font-size: 10px; padding: 0 5px; border-bottom-width: 1px; }
.a11y-shortcut-desc { font-size: 13px; color: #5F7368; text-align: right; }

/* ─── CONFIRM ───────────────────────────────────────────── */
.a11y-confirm-card {
  width: 100%; max-width: 380px;
  background: #fff; border-radius: 20px;
  padding: 26px 24px 20px;
  text-align: center;
  box-shadow: 0 40px 100px -30px rgba(10,43,29,0.6);
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
}
.a11y-confirm-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 52px; height: 52px; border-radius: 16px;
  background: rgba(255,45,62,0.1); color: #E11D34;
  margin-bottom: 14px;
}
.a11y-confirm-icon.is-danger { animation: a11y-warn 2s ease-in-out infinite; }
@keyframes a11y-warn { 0%,100% { transform: rotate(0); } 50% { transform: rotate(4deg); } }
.a11y-confirm-icon-svg { width: 26px; height: 26px; }
.a11y-confirm-title { font-size: 17px; font-weight: 800; color: #0A2B1D; margin: 0 0 6px; letter-spacing: -0.01em; }
.a11y-confirm-message { font-size: 13px; color: #5F7368; margin: 0 0 20px; line-height: 1.55; }
.a11y-confirm-actions { display: flex; gap: 8px; }
.a11y-confirm-btn {
  flex: 1; padding: 11px 14px;
  border-radius: 12px; border: 1px solid transparent;
  font-family: inherit; font-size: 13px; font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}
.a11y-confirm-btn:active { transform: scale(0.97); }
.a11y-confirm-cancel { background: rgba(15,76,54,0.06); color: #0A2B1D; }
.a11y-confirm-cancel:hover { background: rgba(15,76,54,0.12); }
.a11y-confirm-danger {
  background: linear-gradient(135deg, #E11D34, #B3121F);
  color: #fff;
  box-shadow: 0 8px 20px -8px rgba(225,29,52,0.5);
}
.a11y-confirm-primary {
  background: linear-gradient(135deg, #0F4C36, #0A2B1D);
  color: #fff;
  box-shadow: 0 8px 20px -8px rgba(15,76,54,0.5);
}

/* ─── TOAST ─────────────────────────────────────────────── */
.a11y-toast {
  position: fixed; left: 50%; bottom: 96px;
  transform: translateX(-50%);
  z-index: 2147483647;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 16px;
  background: #0A2B1D; color: #fff;
  border-radius: 999px;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
  font-size: 12.5px; font-weight: 600;
  letter-spacing: -0.01em;
  box-shadow: 0 20px 44px -12px rgba(10,43,29,0.5), 0 1px 0 rgba(255,255,255,0.1) inset;
  pointer-events: none;
  max-width: calc(100vw - 32px);
}
.a11y-toast-icon { width: 15px; height: 15px; color: #A8FF7A; flex-shrink: 0; }
.a11y-toast.is-danger .a11y-toast-icon { color: #FF8A95; }
@media (max-width: 480px) {
  .a11y-toast { bottom: 88px; }
}

/* ─── SCRIPTS (features scoped to #root) ───────────────── */
html { --a11y-text-size: 100%; }
html #root { font-size: calc(1rem * var(--a11y-text-size) / 100); }

html.a11y-text-spacing #root,
html.a11y-text-spacing #root * {
  line-height: calc(1.5 * var(--a11y-line-height) / 100) !important;
  letter-spacing: var(--a11y-letter-spacing) !important;
  word-spacing: 0.16em !important;
}

html.a11y-link-underline #root a {
  text-decoration: underline !important;
  text-underline-offset: 3px;
  text-decoration-thickness: 1.5px;
}
html.a11y-highlight-links #root a {
  background: #FDE047 !important;
  color: #0A2B1D !important;
  text-decoration: underline !important;
  padding: 1px 4px; border-radius: 3px;
}
html.a11y-highlight-links #root button {
  outline: 2px dashed #FDE047 !important;
  outline-offset: 2px;
}
html.a11y-highlight-headings #root h1,
html.a11y-highlight-headings #root h2,
html.a11y-highlight-headings #root h3,
html.a11y-highlight-headings #root h4,
html.a11y-highlight-headings #root h5,
html.a11y-highlight-headings #root h6 {
  background: linear-gradient(90deg, rgba(168,255,122,0.4), rgba(168,255,122,0.08)) !important;
  border-left: 4px solid #A8FF7A !important;
  padding: 6px 12px !important;
  border-radius: 6px !important;
}
html.a11y-pause-animations #root *,
html.a11y-pause-animations #root *::before,
html.a11y-pause-animations #root *::after {
  animation-duration: 0.001ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.001ms !important;
  scroll-behavior: auto !important;
}
html.a11y-reduce-motion #root *,
html.a11y-reduce-motion #root *::before,
html.a11y-reduce-motion #root *::after {
  animation: none !important;
  transition: none !important;
  scroll-behavior: auto !important;
}
html.a11y-hide-images #root img,
html.a11y-hide-images #root picture,
html.a11y-hide-images #root video {
  visibility: hidden !important;
}
html.a11y-hide-images #root [style*="background-image"] {
  background-image: none !important;
}
html.a11y-dyslexia-friendly #root,
html.a11y-dyslexia-friendly #root * {
  font-family: 'Comic Sans MS', 'Trebuchet MS', Verdana, sans-serif !important;
  letter-spacing: 0.04em !important;
  word-spacing: 0.16em !important;
  line-height: 1.75 !important;
}
html.a11y-reading-mode #root article,
html.a11y-reading-mode #root main,
html.a11y-reading-mode #root .prose {
  max-width: 720px !important;
  margin-left: auto !important;
  margin-right: auto !important;
  font-size: 1.15em !important;
  line-height: 1.85 !important;
  letter-spacing: 0.01em !important;
}
html.a11y-reading-mode #root aside,
html.a11y-reading-mode #root nav:not(.breadcrumbs),
html.a11y-reading-mode #root footer { opacity: 0.35; transition: opacity 0.2s ease; }
html.a11y-reading-mode #root aside:hover,
html.a11y-reading-mode #root nav:hover,
html.a11y-reading-mode #root footer:hover { opacity: 1; }

html.a11y-focus-mode #root *:focus {
  outline: 4px solid #A8FF7A !important;
  outline-offset: 4px !important;
  box-shadow: 0 0 0 8px rgba(168,255,122,0.3) !important;
  position: relative; z-index: 100;
}
html.a11y-keyboard-nav #root :focus-visible {
  outline: 3px solid #0F4C36 !important;
  outline-offset: 2px !important;
  border-radius: 4px;
}

html.a11y-big-cursor,
html.a11y-big-cursor * {
  cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'><path d='M8 4 L8 40 L18 30 L24 44 L30 42 L24 28 L38 28 Z' fill='white' stroke='black' stroke-width='2.5' stroke-linejoin='round'/></svg>") 4 4, auto !important;
}
html.a11y-mute-sounds audio { display: none !important; }

html.a11y-tooltips #root [title] { position: relative; }
html.a11y-tooltips #root [title]:hover::after {
  content: attr(title);
  position: absolute;
  bottom: 100%; left: 50%;
  transform: translateX(-50%);
  padding: 6px 10px;
  background: #0A2B1D; color: white;
  font-size: 12px; border-radius: 6px;
  white-space: nowrap; z-index: 99999;
  pointer-events: none; margin-bottom: 6px;
  font-family: -apple-system, 'Inter', sans-serif;
  font-weight: 500;
}

html.a11y-page-structure #root main,
html.a11y-page-structure #root nav,
html.a11y-page-structure #root header,
html.a11y-page-structure #root footer,
html.a11y-page-structure #root aside,
html.a11y-page-structure #root section {
  outline: 2px dashed #A8FF7A !important;
  outline-offset: -2px;
  position: relative;
}
html.a11y-page-structure #root main::before {
  content: 'MAIN'; position: absolute; top: 0; left: 0;
  background: #A8FF7A; color: #0A2B1D;
  font-size: 10px; font-weight: 800;
  padding: 2px 8px; z-index: 100;
  font-family: monospace; letter-spacing: 0.1em;
}
html.a11y-page-structure #root nav::before {
  content: 'NAV'; position: absolute; top: 0; left: 0;
  background: #5FCB8E; color: #0A2B1D;
  font-size: 10px; font-weight: 800;
  padding: 2px 8px; z-index: 100;
  font-family: monospace; letter-spacing: 0.1em;
}

html.a11y-align-left #root * { text-align: left !important; }
html.a11y-align-center #root * { text-align: center !important; }
html.a11y-align-right #root * { text-align: right !important; }

html.a11y-profile-blind #root { font-size: 105%; }
html.a11y-profile-epilepsy #root * {
  animation-duration: 0.001ms !important;
  transition-duration: 0.001ms !important;
}

@media (prefers-reduced-motion: reduce) {
  .a11y-trigger, .a11y-tile, .a11y-pill, .a11y-list-item, .a11y-tab { transition: none !important; }
  .a11y-trigger-badge, .a11y-trigger-ring, .a11y-confirm-icon.is-danger { animation: none !important; }
}
`;

export { A11Y_STYLES };