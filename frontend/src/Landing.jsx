import { useState, useEffect } from "react";

// ── CSS Keyframe Animations (injected once) ──────────────────────────────────
const keyframes = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

@keyframes pulse-glow {
  0%, 100% { opacity: 0.15; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(1.05); }
}

@keyframes float-up {
  0% { opacity: 0; transform: translateY(60px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes float-up-delay {
  0%, 30% { opacity: 0; transform: translateY(60px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes slide-in-left {
  0% { opacity: 0; transform: translateX(-40px); }
  100% { opacity: 1; transform: translateX(0); }
}

@keyframes count-fade {
  0% { opacity: 0; transform: translateY(20px) scale(0.9); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes ripple {
  0% { transform: scale(0.8); opacity: 0.4; }
  100% { transform: scale(2.5); opacity: 0; }
}

@keyframes nav-slide-down {
  0% { opacity: 0; transform: translateY(-20px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  14% { transform: scale(1.15); }
  28% { transform: scale(1); }
  42% { transform: scale(1.1); }
  56% { transform: scale(1); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;

// ── Theme tokens for Landing ─────────────────────────────────────────────────
const LT = {
  light: {
    bg: "#ffffff",
    text: "#111827",
    subtext: "#6b7280",
    muted: "#9ca3af",
    cardBg: "#f9fafb",
    cardBorder: "#e5e7eb",
    navBg: "rgba(255,255,255,0.85)",
    navBorder: "rgba(0,0,0,0.06)",
    sectionBorder: "#e5e7eb",
    statGradient: "linear-gradient(180deg, rgba(220,38,38,0.05) 0%, transparent 100%)",
    ctaBg: "linear-gradient(135deg, rgba(220,38,38,0.06) 0%, rgba(220,38,38,0.02) 100%)",
    ctaBorder: "rgba(220,38,38,0.12)",
    footerBorder: "#e5e7eb",
    gridLine: "rgba(0,0,0,0.03)",
    rippleBorder: "rgba(220,38,38,0.12)",
    orbAlpha1: "0.1",
    orbAlpha2: "0.06",
    heroFade: "linear-gradient(to top, #ffffff, transparent)",
    toggleBg: "linear-gradient(145deg, #fbbf24, #f97316)",
    toggleShadow: "0 2px 10px rgba(249,115,22,0.5)",
    toggleIcon: "sun",
  },
  dark: {
    bg: "#000000",
    text: "#ffffff",
    subtext: "#9ca3af",
    muted: "#4b5563",
    cardBg: "#0d0d0d",
    cardBorder: "#1f1f1f",
    navBg: "rgba(0, 0, 0, 0.85)",
    navBorder: "rgba(255,255,255,0.06)",
    sectionBorder: "#1f1f1f",
    statGradient: "linear-gradient(180deg, rgba(220,38,38,0.03) 0%, transparent 100%)",
    ctaBg: "linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(220,38,38,0.02) 100%)",
    ctaBorder: "rgba(220,38,38,0.15)",
    footerBorder: "#1f1f1f",
    gridLine: "rgba(255,255,255,0.02)",
    rippleBorder: "rgba(220,38,38,0.15)",
    orbAlpha1: "0.2",
    orbAlpha2: "0.12",
    heroFade: "linear-gradient(to top, #000000, transparent)",
    toggleBg: "linear-gradient(145deg, #1e3a5f, #2d6a9f)",
    toggleShadow: "0 2px 10px rgba(45,106,159,0.6)",
    toggleIcon: "moon",
  },
};

// ── Animated Counter Hook ────────────────────────────────────────────────────
function useCounter(end, duration = 2000, startOnMount = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!startOnMount) return;
    const num = parseInt(end, 10);
    if (isNaN(num) || num <= 0) { setCount(end); return; }
    setCount(0);
    const step = Math.max(1, Math.ceil(num / (duration / 16)));
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= num) {
        setCount(num);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration, startOnMount]);

  return count;
}

// ── Intersection Observer Hook ───────────────────────────────────────────────
function useInView(threshold = 0.2) {
  const [ref, setRef] = useState(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(ref);
    return () => obs.disconnect();
  }, [ref, threshold]);

  return [setRef, inView];
}

// ── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, description, delay, dark }) {
  const [hovered, setHovered] = useState(false);
  const [ref, inView] = useInView(0.15);
  const t = LT[dark ? "dark" : "light"];

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: "1 1 300px",
        background: hovered
          ? dark ? "linear-gradient(145deg, #1a1a1a, #0d0d0d)" : "linear-gradient(145deg, #f3f4f6, #ffffff)"
          : t.cardBg,
        border: `1px solid ${hovered ? "#dc2626" : t.cardBorder}`,
        borderRadius: 16,
        padding: "40px 32px",
        cursor: "default",
        transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        transform: hovered ? "translateY(-8px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 20px 60px rgba(220, 38, 38, 0.15), 0 0 0 1px rgba(220, 38, 38, 0.1)"
          : dark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 4px 20px rgba(0,0,0,0.06)",
        animation: inView ? `float-up 0.8s ${delay}s both ease-out` : "none",
        opacity: inView ? undefined : 0,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: hovered
            ? "linear-gradient(135deg, #dc2626, #991b1b)"
            : "rgba(220, 38, 38, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          marginBottom: 24,
          transition: "all 0.4s ease",
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 20,
          fontWeight: 700,
          color: t.text,
          margin: "0 0 12px",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 15,
          color: t.subtext,
          lineHeight: 1.7,
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
}

// ── Stat Item ────────────────────────────────────────────────────────────────
function StatItem({ value, label, suffix, delay, dark }) {
  const [ref, inView] = useInView(0.2);
  const t = LT[dark ? "dark" : "light"];
  const numericValue = parseInt(value, 10);
  const count = useCounter(isNaN(numericValue) ? 0 : numericValue, 2000, inView);
  const display = isNaN(numericValue) ? value : count + (suffix || "");

  return (
    <div
      ref={ref}
      style={{
        flex: "1 1 200px",
        textAlign: "center",
        padding: "32px 16px",
        animation: inView ? `count-fade 0.7s ${delay}s both ease-out` : "none",
        opacity: inView ? undefined : 0,
      }}
    >
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 48,
          fontWeight: 900,
          color: "#dc2626",
          lineHeight: 1,
          marginBottom: 8,
          letterSpacing: "-0.02em",
        }}
      >
        {display}
      </div>
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 15,
          color: t.subtext,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ── Theme Toggle Button ──────────────────────────────────────────────────────
function ThemeToggle({ dark, toggleDark }) {
  const t = LT[dark ? "dark" : "light"];
  return (
    <div
      onClick={toggleDark}
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        background: t.toggleBg,
        boxShadow: t.toggleShadow,
        transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.12) rotate(-8deg)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1) rotate(0deg)"}
    >
      <div style={{ position: "absolute", top: 3, left: 4, width: 10, height: 3, borderRadius: 4, background: "rgba(255,255,255,0.3)", transform: "rotate(-15deg)", pointerEvents: "none" }} />
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" fill="#c8e6ff" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4.5" fill="#fff" />
          <g stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="2" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="2" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="4.93" x2="7.05" y2="7.05" />
            <line x1="16.95" y1="16.95" x2="19.07" y2="19.07" />
            <line x1="4.93" y1="19.07" x2="7.05" y2="16.95" />
            <line x1="16.95" y1="7.05" x2="19.07" y2="4.93" />
          </g>
        </svg>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LANDING PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function Landing({ onEnter, dark, toggleDark }) {
  const [scrolled, setScrolled] = useState(false);
  const [heroRef, heroInView] = useInView(0.1);
  const [apiData, setApiData] = useState(null);
  const t = LT[dark ? "dark" : "light"];

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  // Fetch real data from dashboard API
  useEffect(() => {
    fetch("/api/dashboard", { headers: { "Content-Type": "application/json" } })
      .then(res => res.json())
      .then(setApiData)
      .catch(() => {});
  }, []);

  const features = [
    {
      icon: "👥",
      title: "Donor Management",
      description:
        "Register, track, and manage blood donors with comprehensive profiles, blood type records, and donation history all in one place.",
    },
    {
      icon: "📦",
      title: "Blood Stock Tracking",
      description:
        "Real-time inventory monitoring for all 8 blood types. Get alerts on low stock levels and track units across your entire network.",
    },
    {
      icon: "📋",
      title: "Request Management",
      description:
        "Streamline blood requests from receipt to fulfillment. Approve, track, and manage every request with full audit trails.",
    },
  ];

  // Use real API data synced with dashboard
  const stats = apiData ? [
    { value: String(apiData.total_donors), suffix: "+", label: "Donors" },
    { value: String(apiData.total_donations), suffix: "+", label: "Donations" },
    { value: String(Math.round(apiData.total_units)), suffix: "", label: "Blood Units" },
    { value: String(apiData.pending_requests), suffix: "", label: "Pending Requests" },
  ] : null;

  return (
    <>
      <style>{keyframes}</style>
      <div
        style={{
          background: t.bg,
          color: t.text,
          fontFamily: "Inter, sans-serif",
          minHeight: "100vh",
          overflowX: "hidden",
          transition: "background 0.3s ease, color 0.3s ease",
        }}
      >
        {/* ── Navbar ───────────────────────────────────────────────────── */}
        <nav
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: scrolled ? "14px 40px" : "20px 40px",
            background: scrolled ? t.navBg : "transparent",
            backdropFilter: scrolled ? "blur(20px)" : "none",
            borderBottom: scrolled
              ? `1px solid ${t.navBorder}`
              : "1px solid transparent",
            transition: "all 0.3s ease",
            animation: "nav-slide-down 0.6s ease-out both",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                background: "linear-gradient(135deg, #dc2626, #991b1b)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                animation: "heartbeat 2s ease-in-out infinite",
              }}
            >
              🩸
            </div>
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 800,
                fontSize: 20,
                color: t.text,
                letterSpacing: "-0.01em",
              }}
            >
              BloodBank
            </span>
          </div>
          <ThemeToggle dark={dark} toggleDark={toggleDark} />
        </nav>

        {/* ── Hero Section ────────────────────────────────────────────── */}
        <section
          ref={heroRef}
          style={{
            position: "relative",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {/* Animated background elements */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            {/* Large gradient orb */}
            <div
              style={{
                position: "absolute",
                top: "-20%",
                right: "-10%",
                width: 700,
                height: 700,
                borderRadius: "50%",
                background:
                  `radial-gradient(circle, rgba(220,38,38,${t.orbAlpha1}) 0%, transparent 70%)`,
                animation: "pulse-glow 6s ease-in-out infinite",
              }}
            />
            {/* Second orb */}
            <div
              style={{
                position: "absolute",
                bottom: "-15%",
                left: "-5%",
                width: 500,
                height: 500,
                borderRadius: "50%",
                background:
                  `radial-gradient(circle, rgba(220,38,38,${t.orbAlpha2}) 0%, transparent 70%)`,
                animation: "pulse-glow 8s ease-in-out infinite 2s",
              }}
            />
            {/* Grid overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  `linear-gradient(${t.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${t.gridLine} 1px, transparent 1px)`,
                backgroundSize: "60px 60px",
              }}
            />
            {/* Ripple at center */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 200,
                height: 200,
                marginTop: -100,
                marginLeft: -100,
                borderRadius: "50%",
                border: `1px solid ${t.rippleBorder}`,
                animation: "ripple 4s ease-out infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 200,
                height: 200,
                marginTop: -100,
                marginLeft: -100,
                borderRadius: "50%",
                border: `1px solid ${t.rippleBorder}`,
                opacity: 0.7,
                animation: "ripple 4s ease-out infinite 2s",
              }}
            />
          </div>

          {/* Hero content */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              textAlign: "center",
              maxWidth: 800,
              padding: "0 24px",
            }}
          >
            {/* Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(220, 38, 38, 0.1)",
                border: "1px solid rgba(220, 38, 38, 0.2)",
                borderRadius: 100,
                padding: "8px 20px",
                marginBottom: 32,
                animation: "float-up 0.8s ease-out both",
              }}
            >
              <span style={{ fontSize: 14 }}>❤️</span>
              <span
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#dc2626",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Blood Donation Management System
              </span>
            </div>

            {/* Headline */}
            <h1
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "clamp(40px, 7vw, 76px)",
                fontWeight: 900,
                lineHeight: 1.05,
                margin: "0 0 24px",
                letterSpacing: "-0.03em",
                color: t.text,
                animation: "float-up 0.8s 0.15s ease-out both",
              }}
            >
              Save Lives,
              <br />
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #dc2626, #ef4444, #dc2626)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  animation: "gradient-shift 4s ease infinite",
                }}
              >
                Manage Blood
              </span>
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "clamp(16px, 2vw, 20px)",
                color: t.subtext,
                lineHeight: 1.7,
                maxWidth: 560,
                margin: "0 auto 48px",
                animation: "float-up 0.8s 0.3s ease-out both",
              }}
            >
              A complete platform to manage donors, track blood inventory, and
              streamline requests — saving lives with every unit.
            </p>

            {/* CTA Button */}
            <div style={{ animation: "float-up 0.8s 0.45s ease-out both" }}>
              <button
                id="enter-dashboard-btn"
                onClick={onEnter}
                style={{
                  background: "linear-gradient(135deg, #dc2626, #b91c1c)",
                  color: "#ffffff",
                  border: "none",
                  padding: "18px 48px",
                  borderRadius: 12,
                  fontFamily: "Inter, sans-serif",
                  fontSize: 17,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow:
                    "0 8px 32px rgba(220, 38, 38, 0.35), 0 0 0 0 rgba(220,38,38,0)",
                  letterSpacing: "0.01em",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                  e.currentTarget.style.boxShadow =
                    "0 12px 48px rgba(220, 38, 38, 0.45), 0 0 0 4px rgba(220,38,38,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0) scale(1)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 32px rgba(220, 38, 38, 0.35), 0 0 0 0 rgba(220,38,38,0)";
                }}
              >
                Enter Dashboard →
              </button>
            </div>
          </div>

          {/* Bottom fade */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 120,
              background: t.heroFade,
              pointerEvents: "none",
            }}
          />
        </section>

        {/* ── Features Section ────────────────────────────────────────── */}
        <section
          style={{
            padding: "100px 40px 120px",
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 800,
                color: t.text,
                margin: "0 0 16px",
                letterSpacing: "-0.02em",
              }}
            >
              Everything You Need
            </h2>
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 17,
                color: t.muted,
                maxWidth: 500,
                margin: "0 auto",
                lineHeight: 1.6,
              }}
            >
              Powerful tools to manage your blood bank operations from end to
              end.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {features.map((f, i) => (
              <FeatureCard
                key={f.title}
                icon={f.icon}
                title={f.title}
                description={f.description}
                delay={i * 0.15}
                dark={dark}
              />
            ))}
          </div>
        </section>

        {/* ── Stats Section ───────────────────────────────────────────── */}
        <section
          style={{
            borderTop: `1px solid ${t.sectionBorder}`,
            borderBottom: `1px solid ${t.sectionBorder}`,
            background: t.statGradient,
          }}
        >
          <div
            style={{
              maxWidth: 1000,
              margin: "0 auto",
              padding: "80px 40px",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {stats ? stats.map((s, i) => (
              <StatItem
                key={s.label}
                value={s.value}
                suffix={s.suffix}
                label={s.label}
                delay={i * 0.12}
                dark={dark}
              />
            )) : (
              <div style={{ padding: "32px 16px", textAlign: "center", color: t.subtext, fontFamily: "Inter, sans-serif", fontSize: 15 }}>Loading live stats…</div>
            )}
          </div>
        </section>

        {/* ── CTA Banner ──────────────────────────────────────────────── */}
        <section
          style={{
            padding: "100px 40px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              maxWidth: 700,
              margin: "0 auto",
              background: t.ctaBg,
              border: `1px solid ${t.ctaBorder}`,
              borderRadius: 24,
              padding: "64px 40px",
            }}
          >
            <h2
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "clamp(24px, 3.5vw, 36px)",
                fontWeight: 800,
                color: t.text,
                margin: "0 0 16px",
                letterSpacing: "-0.02em",
              }}
            >
              Ready to Save Lives?
            </h2>
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 16,
                color: t.muted,
                maxWidth: 440,
                margin: "0 auto 32px",
                lineHeight: 1.7,
              }}
            >
              Access the dashboard to start managing donors, donations, and
              blood stock instantly.
            </p>
            <button
              onClick={onEnter}
              style={{
                background: "#dc2626",
                color: "#ffffff",
                border: "none",
                padding: "16px 40px",
                borderRadius: 10,
                fontFamily: "Inter, sans-serif",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 6px 24px rgba(220,38,38,0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#b91c1c";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 10px 36px rgba(220,38,38,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#dc2626";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 6px 24px rgba(220,38,38,0.3)";
              }}
            >
              Enter Dashboard →
            </button>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <footer
          style={{
            borderTop: `1px solid ${t.footerBorder}`,
            padding: "40px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                background: "#dc2626",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              🩸
            </div>
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 700,
                fontSize: 15,
                color: t.text,
              }}
            >
              BloodBank
            </span>
          </div>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              color: t.muted,
              margin: 0,
            }}
          >
            Blood Donation Management System — Built with React & Python
          </p>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              color: t.muted,
              margin: 0,
            }}
          >
            © {new Date().getFullYear()} BloodBank. All rights reserved.
          </p>
        </footer>
      </div>
    </>
  );
}
