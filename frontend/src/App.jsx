import { useState, useEffect, useCallback } from "react";
import Landing from "./Landing";

const API = "/api";
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const BLOOD_COLORS = {
  "A+": "#dc2626", "A-": "#ef4444", "B+": "#2563eb", "B-": "#60a5fa",
  "AB+": "#7c3aed", "AB-": "#a78bfa", "O+": "#16a34a", "O-": "#4ade80",
};

const fetchJSON = async (url, opts = {}) => {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opts });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
};

// ── Theme tokens ──────────────────────────────────────────────────────────────
const T = {
  light: {
    bg: "#f3f4f6", sidebar: "#fff", sidebarBorder: "#e5e7eb",
    card: "#fff", cardBorder: "#e5e7eb",
    text: "#111827", subtext: "#6b7280", muted: "#9ca3af",
    input: "#fff", inputBorder: "#d1d5db", inputBg: "#f9fafb",
    trHover: "#fafafa", tdText: "#374151",
    statusGreen: "#f0fdf4", statusGreenBorder: "#f0fdf4",
    navActive: "#dc2626", navInactive: "transparent",
    navTextActive: "#fff", navTextInactive: "#6b7280",
    footerBg: "#f0fdf4", toggleBg: "#e5e7eb", toggleKnob: "#fff",
  },
  dark: {
    bg: "#000000", sidebar: "#0d0d0d", sidebarBorder: "#1f1f1f",
    card: "#0d0d0d", cardBorder: "#1f1f1f",
    text: "#ffffff", subtext: "#9ca3af", muted: "#4b5563",
    input: "#000000", inputBorder: "#2a2a2a", inputBg: "#0a0a0a",
    trHover: "#141414", tdText: "#d1d5db",
    statusGreen: "#000000", statusGreenBorder: "#000000",
    navActive: "#dc2626", navInactive: "transparent",
    navTextActive: "#fff", navTextInactive: "#9ca3af",
    footerBg: "#0a0a0a", toggleBg: "#dc2626", toggleKnob: "#fff",
  },
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toasts, remove }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => remove(t.id)} style={{
          background: t.type === "error" ? "#fee2e2" : "#dcfce7",
          color: t.type === "error" ? "#991b1b" : "#166534",
          border: `1px solid ${t.type === "error" ? "#fca5a5" : "#86efac"}`,
          padding: "12px 18px", borderRadius: 8, cursor: "pointer",
          fontFamily: "Inter, sans-serif", fontSize: 14, maxWidth: 320,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}>{t.type === "error" ? "⚠ " : "✓ "}{t.msg}</div>
      ))}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, children, dark }) {
  const t = T[dark ? "dark" : "light"];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: t.card, borderRadius: 12, padding: 28, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", border: `1px solid ${t.cardBorder}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 600, color: t.text }}>{title}</h2>
            {subtitle && <p style={{ margin: "4px 0 0", fontFamily: "Inter, sans-serif", fontSize: 13, color: t.subtext }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.muted, fontSize: 22, cursor: "pointer" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, dark }) {
  const t = T[dark ? "dark" : "light"];
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", color: t.subtext, fontSize: 13, fontFamily: "Inter, sans-serif", marginBottom: 5, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

function BloodBadge({ type }) {
  return <span style={{ background: BLOOD_COLORS[type] || "#dc2626", color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontFamily: "Inter, sans-serif", fontWeight: 700 }}>{type}</span>;
}

function StatusBadge({ status }) {
  const colors = { Pending: ["#fef3c7", "#92400e"], Approved: ["#dbeafe", "#1e40af"], Fulfilled: ["#dcfce7", "#166534"] };
  const [bg, fg] = colors[status] || ["#f3f4f6", "#374151"];
  return <span style={{ background: bg, color: fg, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontFamily: "Inter, sans-serif", fontWeight: 600 }}>● {status}</span>;
}

function useCountUp(target, duration = 900) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const num = typeof target === "number" ? target : parseInt(target, 10);
    if (isNaN(num) || num <= 0) { setCount(target); return; }
    let start = 0;
    const step = Math.max(1, Math.ceil(num / (duration / 16)));
    const id = setInterval(() => {
      start += step;
      if (start >= num) { setCount(num); clearInterval(id); }
      else setCount(start);
    }, 16);
    return () => clearInterval(id);
  }, [target, duration]);
  return count;
}

function StatCard({ label, value, sub, color, icon, dark }) {
  const t = T[dark ? "dark" : "light"];
  const colored = color && color !== "white";
  const animVal = useCountUp(value);
  return (
    <div
      style={{ background: colored ? color : t.card, border: colored ? "none" : `1px solid ${t.cardBorder}`, borderRadius: 10, padding: "20px 24px", color: colored ? "#fff" : t.text, flex: 1, minWidth: 160, transition: "transform 0.25s ease, box-shadow 0.25s ease", cursor: "default" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = colored ? `0 8px 24px ${color}44` : "0 8px 24px rgba(0,0,0,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 13, fontFamily: "Inter, sans-serif", color: colored ? "rgba(255,255,255,0.85)" : t.subtext, marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 30, fontWeight: 700, fontFamily: "Inter, sans-serif", lineHeight: 1 }}>{animVal}</div>
          {sub && <div style={{ fontSize: 12, fontFamily: "Inter, sans-serif", marginTop: 6, color: colored ? "rgba(255,255,255,0.8)" : t.subtext }}>{sub}</div>}
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: colored ? "rgba(255,255,255,0.2)" : (dark ? "#1a1a1a" : "#fef2f2"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{icon}</div>
      </div>
    </div>
  );
}

function AnimatedBar({ height, color, delay }) {
  return (
    <div style={{ width: "100%", height: height || 4, minHeight: 4, borderRadius: "3px 3px 0 0", overflow: "hidden" }}>
      <div className="bar-grow" style={{ width: "100%", height: "100%", background: color, borderRadius: "3px 3px 0 0", transformOrigin: "bottom", animationDelay: `${delay}ms` }} />
    </div>
  );
}

function ProgressRing({ pct, color, size = 48, stroke = 4 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ display: "block" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle className="ring-fill" cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ - (circ * Math.min(pct, 100) / 100)}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dashoffset 1s ease" }} />
    </svg>
  );
}

// ── Input style factory ───────────────────────────────────────────────────────
const makeIS = (dark) => ({
  width: "100%", padding: "9px 12px",
  background: T[dark ? "dark" : "light"].input,
  border: `1px solid ${T[dark ? "dark" : "light"].inputBorder}`,
  borderRadius: 6, color: T[dark ? "dark" : "light"].text,
  fontFamily: "Inter, sans-serif", fontSize: 14, boxSizing: "border-box", outline: "none",
});

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function Dashboard({ toast, setPage, dark }) {
  const [data, setData] = useState(null);
  const t = T[dark ? "dark" : "light"];
  useEffect(() => { fetchJSON(`${API}/dashboard`).then(setData).catch(e => toast(e.message, "error")); }, []);
  if (!data) return <div style={{ padding: 80, textAlign: "center", color: t.muted, fontFamily: "Inter, sans-serif" }}>Loading dashboard…</div>;
  const maxUnits = Math.max(...(data.blood_inventory || []).map(b => b.total_units), 1);
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 24, fontWeight: 700, color: t.text }}>Dashboard</h1>
        <p style={{ margin: "4px 0 0", fontFamily: "Inter, sans-serif", fontSize: 14, color: t.subtext }}>Overview of your blood bank operations</p>
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard dark={dark} label="Total Donors" value={data.total_donors} sub="Registered donors" icon="👥" />
        <StatCard dark={dark} label="Total Donations" value={data.total_donations} sub="This month" color="#dc2626" icon="🩸" />
        <StatCard dark={dark} label="Blood Units" value={data.total_units.toFixed(0)} sub="In stock" icon="💧" />
        <StatCard dark={dark} label="Pending Requests" value={data.pending_requests} sub="Awaiting approval" color="#f59e0b" icon="⚠" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: 20 }}>
          <h3 style={{ margin: "0 0 16px", fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600, color: t.text }}>Blood Stock by Type</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140 }}>
            {BLOOD_TYPES.map((bt, idx) => {
              const item = data.blood_inventory.find(i => i.blood_type === bt) || { total_units: 0 };
              const h = maxUnits > 0 ? (item.total_units / maxUnits) * 110 : 0;
              return (
                <div key={bt} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 10, color: t.subtext, fontFamily: "Inter, sans-serif" }}>{item.total_units.toFixed(0)}</div>
                  <AnimatedBar height={h} color={BLOOD_COLORS[bt]} delay={idx * 80} />
                  <div style={{ fontSize: 10, color: t.subtext, fontFamily: "Inter, sans-serif" }}>{bt}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: 20 }}>
          <h3 style={{ margin: "0 0 16px", fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600, color: t.text }}>Recent Activity</h3>
          {data.recent_donations.length === 0
            ? <p style={{ color: t.muted, fontFamily: "Inter, sans-serif", fontSize: 14 }}>No recent donations</p>
            : data.recent_donations.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: dark ? "#1a1a1a" : "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🩸</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: t.text }}>Donation from {r.name}</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: t.subtext }}>{r.donation_date}</div>
                </div>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: t.subtext }}>{r.quatity} unit(s)</span>
              </div>
            ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        {[
          { icon: "👤", label: "Register Donor", sub: "Add a new blood donor", page: "donors" },
          { icon: "🩸", label: "Record Donation", sub: "Log a new donation", page: "donations" },
          { icon: "📋", label: "New Request", sub: "Handle blood requests", page: "requests" },
          { icon: "📦", label: "Check Stock", sub: "View blood inventory", page: "inventory" },
        ].map(a => (
          <div key={a.label} onClick={() => setPage(a.page)} style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", transition: "transform 0.25s ease, box-shadow 0.25s ease" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
            <div style={{ width: 38, height: 38, background: dark ? "#1a1a1a" : "#fef2f2", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{a.icon}</div>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: t.text }}>{a.label}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: t.subtext }}>{a.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DONORS
// ══════════════════════════════════════════════════════════════════════════════
function Donors({ toast, dark }) {
  const [donors, setDonors] = useState([]);
  const [search, setSearch] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editDonor, setEditDonor] = useState(null);
  const [loading, setLoading] = useState(false);
  const t = T[dark ? "dark" : "light"];

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (ageMin) params.set("age_min", ageMin);
      if (ageMax) params.set("age_max", ageMax);
      setDonors(await fetchJSON(`${API}/donors?${params}`));
    }
    catch (e) { toast(e.message, "error"); }
  }, [search, ageMin, ageMax]);
  useEffect(() => { load(); }, [load]);

  const saveDonor = async (form, id) => {
    setLoading(true);
    try {
      if (id) { await fetchJSON(`${API}/donors/${id}`, { method: "PUT", body: JSON.stringify(form) }); toast("Donor updated!"); setEditDonor(null); }
      else { await fetchJSON(`${API}/donors`, { method: "POST", body: JSON.stringify(form) }); toast("Donor added!"); setShowAdd(false); }
      load();
    } catch (e) { toast(e.message, "error"); } finally { setLoading(false); }
  };

  const del = async (id, name) => {
    if (!confirm(`Delete ${name}?`)) return;
    try { await fetchJSON(`${API}/donors/${id}`, { method: "DELETE" }); toast("Deleted."); load(); }
    catch (e) { toast(e.message, "error"); }
  };

  return (
    <div>
      <PageHeader title="Donors" sub="Manage registered blood donors" dark={dark}>
        <button onClick={() => setShowAdd(true)} style={redBtnS}>+ Add Donor</button>
      </PageHeader>
      <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: 20 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by ID, name, blood type, contact or location..." dark={dark} />
        <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: t.subtext, whiteSpace: "nowrap" }}>Age filter:</span>
          <input
            type="number" placeholder="Min age" value={ageMin} onChange={e => setAgeMin(e.target.value)} min="0" max="120"
            style={{ width: 90, padding: "7px 10px", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 6, color: t.text, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none" }}
          />
          <span style={{ color: t.muted, fontSize: 13 }}>—</span>
          <input
            type="number" placeholder="Max age" value={ageMax} onChange={e => setAgeMax(e.target.value)} min="0" max="120"
            style={{ width: 90, padding: "7px 10px", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 6, color: t.text, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none" }}
          />
          {(ageMin || ageMax) && (
            <button onClick={() => { setAgeMin(""); setAgeMax(""); }} style={{ padding: "6px 12px", background: "none", border: `1px solid ${t.inputBorder}`, borderRadius: 6, color: t.subtext, fontFamily: "Inter, sans-serif", fontSize: 12, cursor: "pointer" }}>
              ✕ Clear
            </button>
          )}
        </div>
        <Table cols={["ID", "Name", "Age", "Blood Type", "Contact", "Address", ""]} dark={dark}>
          {donors.length === 0
            ? <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: t.muted, fontFamily: "Inter, sans-serif" }}>No donors found</td></tr>
            : donors.map(d => (
              <tr key={d.donor_id} style={{ borderBottom: `1px solid ${t.cardBorder}` }}
                onMouseEnter={e => e.currentTarget.style.background = t.trHover}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "13px 12px", fontFamily: "Inter, sans-serif", fontSize: 14, color: t.muted, verticalAlign: "middle" }}>#{String(d.donor_id).padStart(4, "0")}</td>
                <td style={{ padding: "13px 12px", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500, color: t.text, verticalAlign: "middle" }}>{d.name}</td>
                <td style={{ padding: "13px 12px", fontFamily: "Inter, sans-serif", fontSize: 14, color: t.tdText, verticalAlign: "middle" }}>{d.Age || "—"}</td>
                <td style={{ padding: "13px 12px", verticalAlign: "middle" }}><BloodBadge type={d.blood_type} /></td>
                <td style={{ padding: "13px 12px", fontFamily: "Inter, sans-serif", fontSize: 14, color: t.tdText, verticalAlign: "middle" }}>{d.contact_no || "—"}</td>
                <td style={{ padding: "13px 12px", fontFamily: "Inter, sans-serif", fontSize: 14, color: t.tdText, verticalAlign: "middle" }}>{d.address || "—"}</td>
                <td style={{ padding: "13px 12px", verticalAlign: "middle" }}>
                  <button onClick={() => setEditDonor(d)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", fontSize: 15, color: t.subtext }}>✏</button>
                  <button onClick={() => del(d.donor_id, d.name)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", fontSize: 15, color: "#dc2626" }}>🗑</button>
                </td>
              </tr>
            ))}
        </Table>
      </div>
      {showAdd && <Modal dark={dark} title="Register Donor" subtitle="Add a new blood donor" onClose={() => setShowAdd(false)}>
        <DonorForm dark={dark} onSubmit={f => saveDonor(f, null)} loading={loading} onClose={() => setShowAdd(false)} />
      </Modal>}
      {editDonor && <Modal dark={dark} title="Edit Donor" subtitle="Update donor details" onClose={() => setEditDonor(null)}>
        <DonorForm dark={dark} initial={editDonor} onSubmit={f => saveDonor(f, editDonor.donor_id)} loading={loading} onClose={() => setEditDonor(null)} />
      </Modal>}
    </div>
  );
}

function DonorForm({ initial, onSubmit, loading, onClose, dark }) {
  const [form, setForm] = useState(initial || { name: "", blood_type: "A+", Age: "", contact_no: "", address: "" });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const iS = makeIS(dark);
  const t = T[dark ? "dark" : "light"];
  return (
    <div>
      <Field dark={dark} label="Full Name *"><input style={iS} value={form.name} onChange={set("name")} placeholder="John Doe" /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field dark={dark} label="Blood Type *"><select style={iS} value={form.blood_type} onChange={set("blood_type")}>{BLOOD_TYPES.map(b => <option key={b}>{b}</option>)}</select></Field>
        <Field dark={dark} label="Age"><input style={iS} type="number" value={form.Age} onChange={set("Age")} placeholder="25" /></Field>
      </div>
      <Field dark={dark} label="Contact No"><input style={iS} value={form.contact_no} onChange={set("contact_no")} placeholder="+91 9876543210" /></Field>
      <Field dark={dark} label="Address"><textarea style={{ ...iS, resize: "vertical", minHeight: 64 }} value={form.address} onChange={set("address")} placeholder="City, State" /></Field>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "10px", background: t.card, color: t.tdText, border: `1px solid ${t.inputBorder}`, borderRadius: 6, fontFamily: "Inter, sans-serif", fontWeight: 500, cursor: "pointer" }}>Cancel</button>
        <button disabled={loading} onClick={() => onSubmit(form)} style={saveBtnS}>{loading ? "Saving…" : "Save Donor"}</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DONATIONS
// ══════════════════════════════════════════════════════════════════════════════
function Donations({ toast, dark }) {
  const [donations, setDonations] = useState([]);
  const [donors, setDonors] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const t = T[dark ? "dark" : "light"];

  const load = useCallback(async () => {
    try { const [d, dn] = await Promise.all([fetchJSON(`${API}/donations`), fetchJSON(`${API}/donors`)]); setDonations(d); setDonors(dn); }
    catch (e) { toast(e.message, "error"); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async (form) => {
    setLoading(true);
    try { await fetchJSON(`${API}/donations`, { method: "POST", body: JSON.stringify(form) }); toast("Donation recorded!"); setShowAdd(false); load(); }
    catch (e) { toast(e.message, "error"); } finally { setLoading(false); }
  };

  const del = async (id) => {
    if (!confirm("Delete this donation?")) return;
    try { await fetchJSON(`${API}/donations/${id}`, { method: "DELETE" }); toast("Deleted."); load(); }
    catch (e) { toast(e.message, "error"); }
  };

  const thisMonth = donations.filter(d => d.donation_date?.startsWith(new Date().toISOString().slice(0, 7))).length;
  const totalQty = donations.reduce((s, d) => s + (d.quatity || 0), 0);

  return (
    <div>
      <PageHeader title="Donations" sub="Track all blood donations" dark={dark}>
        <button onClick={() => setShowAdd(true)} style={redBtnS}>+ Record Donation</button>
      </PageHeader>
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        {[["Total Donations", donations.length], ["Total Volume", `${totalQty} units`], ["This Month", thisMonth]].map(([l, v]) => (
          <div key={l} style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: 20, flex: 1 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: t.subtext, marginBottom: 4 }}>{l}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 28, fontWeight: 700, color: t.text }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: 20 }}>
        <Table cols={["ID", "Donor", "Date", "Quantity", ""]} dark={dark}>
          {donations.length === 0
            ? <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: t.muted, fontFamily: "Inter, sans-serif" }}>No donations recorded yet</td></tr>
            : donations.map(d => (
              <tr key={d.donation_id} style={{ borderBottom: `1px solid ${t.cardBorder}` }}
                onMouseEnter={e => e.currentTarget.style.background = t.trHover}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "13px 12px", color: t.muted, fontFamily: "Inter, sans-serif", fontSize: 13 }}>#{String(d.donation_id).padStart(4, "0")}</td>
                <td style={{ padding: "13px 12px" }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 500, color: t.text, fontSize: 14 }}>{d.donor_name}</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: t.subtext }}>Blood Type: {d.blood_type}</div>
                </td>
                <td style={{ padding: "13px 12px", fontFamily: "Inter, sans-serif", fontSize: 13, color: t.tdText }}>📅 {d.donation_date}</td>
                <td style={{ padding: "13px 12px" }}><span style={{ background: dark ? "#1a0000" : "#fee2e2", color: "#dc2626", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontFamily: "Inter, sans-serif", fontWeight: 600 }}>{d.quatity} units</span></td>
                <td style={{ padding: "13px 12px" }}><button onClick={() => del(d.donation_id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", fontSize: 15, color: "#dc2626" }}>🗑</button></td>
              </tr>
            ))}
        </Table>
      </div>
      {showAdd && <Modal dark={dark} title="Record Donation" subtitle="Log a new blood donation" onClose={() => setShowAdd(false)}>
        <DonationForm dark={dark} donors={donors} onSubmit={add} loading={loading} onClose={() => setShowAdd(false)} />
      </Modal>}
    </div>
  );
}

function DonationForm({ donors, onSubmit, loading, onClose, dark }) {
  const [form, setForm] = useState({ donor_id: "", donation_date: new Date().toISOString().split("T")[0], quatity: "1" });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const iS = makeIS(dark);
  const t = T[dark ? "dark" : "light"];
  return (
    <div>
      <Field dark={dark} label="Donor *">
        <select style={iS} value={form.donor_id} onChange={set("donor_id")}>
          <option value="">Select donor…</option>
          {donors.map(d => <option key={d.donor_id} value={d.donor_id}>{d.name} ({d.blood_type})</option>)}
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field dark={dark} label="Date *"><input style={iS} type="date" value={form.donation_date} onChange={set("donation_date")} /></Field>
        <Field dark={dark} label="Quantity (units)"><input style={iS} type="number" value={form.quatity} onChange={set("quatity")} min="1" /></Field>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "10px", background: t.card, color: t.tdText, border: `1px solid ${t.inputBorder}`, borderRadius: 6, fontFamily: "Inter, sans-serif", fontWeight: 500, cursor: "pointer" }}>Cancel</button>
        <button disabled={loading} onClick={() => onSubmit(form)} style={saveBtnS}>{loading ? "Recording…" : "Record Donation"}</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOOD STOCK
// ══════════════════════════════════════════════════════════════════════════════
function BloodStock({ toast, dark }) {
  const [inventory, setInventory] = useState([]);
  const t = T[dark ? "dark" : "light"];
  useEffect(() => { fetchJSON(`${API}/inventory`).then(setInventory).catch(e => toast(e.message, "error")); }, []);
  const total = inventory.reduce((s, i) => s + i.total_units, 0);
  const low = inventory.filter(i => i.total_units < 10).length;
  const maxU = Math.max(...inventory.map(i => i.total_units), 1);
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 24, fontWeight: 700, color: t.text }}>Blood Stock</h1>
        <p style={{ margin: "4px 0 0", fontFamily: "Inter, sans-serif", fontSize: 14, color: t.subtext }}>Monitor blood inventory levels</p>
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <StatCard dark={dark} label="Total Units" value={total.toFixed(0)} color="#dc2626" icon="💧" />
        <StatCard dark={dark} label="Low Stock Types" value={low} color="#f59e0b" icon="⚠" />
        <StatCard dark={dark} label="Types Tracked" value={inventory.length} icon="🔬" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        {BLOOD_TYPES.map(bt => {
          const item = inventory.find(i => i.blood_type === bt) || { donor_count: 0, donation_count: 0, total_units: 0 };
          const pct = (item.total_units / maxU) * 100;
          const isLow = item.total_units < 10;
          const color = BLOOD_COLORS[bt] || "#dc2626";
          return (
            <div key={bt}
              style={{ background: isLow ? (dark ? "#141400" : "#fffbeb") : t.card, border: `1px solid ${isLow ? "#fde68a" : t.cardBorder}`, borderRadius: 10, padding: 20, transition: "transform 0.25s ease, box-shadow 0.25s ease", cursor: "default" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ background: color, color: "#fff", padding: "4px 10px", borderRadius: 6, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14 }}>{bt}</span>
                <ProgressRing pct={pct} color={isLow ? "#f59e0b" : color} size={40} stroke={3.5} />
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: t.subtext, marginBottom: 4 }}>Available Units</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 28, fontWeight: 700, color: isLow ? "#f59e0b" : t.text, marginBottom: 10 }}>{item.total_units.toFixed(0)}</div>
              <div style={{ background: dark ? "#1f1f1f" : "#e5e7eb", borderRadius: 4, height: 6, marginBottom: 8 }}>
                <div className="bar-grow" style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: isLow ? "#f59e0b" : color, borderRadius: 4 }} />
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: t.subtext }}>{item.donor_count} donors · {item.donation_count} donations</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RECIPIENTS
// ══════════════════════════════════════════════════════════════════════════════
function Recipients({ toast, dark }) {
  const [recipients, setRecipients] = useState([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editRec, setEditRec] = useState(null);
  const [loading, setLoading] = useState(false);
  const t = T[dark ? "dark" : "light"];

  const load = useCallback(async () => {
    const rp = new URLSearchParams(); if (search) rp.set('search', search); try { setRecipients(await fetchJSON(`${API}/recipients?${rp}`)); }
    catch (e) { toast(e.message, "error"); }
  }, [search]);
  useEffect(() => { load(); }, [load]);

  const save = async (form, id) => {
    setLoading(true);
    try {
      if (id) { await fetchJSON(`${API}/recipients/${id}`, { method: "PUT", body: JSON.stringify(form) }); toast("Recipient updated!"); setEditRec(null); }
      else { await fetchJSON(`${API}/recipients`, { method: "POST", body: JSON.stringify(form) }); toast("Recipient added!"); setShowAdd(false); }
      load();
    } catch (e) { toast(e.message, "error"); } finally { setLoading(false); }
  };

  const del = async (id, name) => {
    if (!confirm(`Delete ${name}?`)) return;
    try { await fetchJSON(`${API}/recipients/${id}`, { method: "DELETE" }); toast("Deleted."); load(); }
    catch (e) { toast(e.message, "error"); }
  };

  return (
    <div>
      <PageHeader title="Recipients" sub="Manage blood recipients" dark={dark}>
        <button onClick={() => setShowAdd(true)} style={redBtnS}>+ Add Recipient</button>
      </PageHeader>
      <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: 20 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by ID, name, blood type, phone or location..." dark={dark} />
        <Table cols={["ID", "Name", "Blood Type", "Contact", "Address", ""]} dark={dark}>
          {recipients.length === 0
            ? <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: t.muted, fontFamily: "Inter, sans-serif" }}>No recipients found</td></tr>
            : recipients.map(r => (
              <tr key={r.recipient_id} style={{ borderBottom: `1px solid ${t.cardBorder}` }}
                onMouseEnter={e => e.currentTarget.style.background = t.trHover}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "13px 12px", color: t.muted, fontFamily: "Inter, sans-serif", fontSize: 13 }}>#{String(r.recipient_id).padStart(4, "0")}</td>
                <td style={{ padding: "13px 12px", fontFamily: "Inter, sans-serif", fontWeight: 500, color: t.text, fontSize: 14 }}>{r.name}</td>
                <td style={{ padding: "13px 12px" }}><BloodBadge type={r.blood_type} /></td>
                <td style={{ padding: "13px 12px", fontFamily: "Inter, sans-serif", fontSize: 14, color: t.tdText }}>{r.contact_no || "—"}</td>
                <td style={{ padding: "13px 12px", fontFamily: "Inter, sans-serif", fontSize: 14, color: t.tdText }}>{r.address || "—"}</td>
                <td style={{ padding: "13px 12px" }}>
                  <button onClick={() => setEditRec(r)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", fontSize: 15, color: t.subtext }}>✏</button>
                  <button onClick={() => del(r.recipient_id, r.name)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", fontSize: 15, color: "#dc2626" }}>🗑</button>
                </td>
              </tr>
            ))}
        </Table>
      </div>
      {showAdd && <Modal dark={dark} title="Add Recipient" subtitle="Register a new blood recipient" onClose={() => setShowAdd(false)}>
        <RecipientForm dark={dark} onSubmit={f => save(f, null)} loading={loading} onClose={() => setShowAdd(false)} />
      </Modal>}
      {editRec && <Modal dark={dark} title="Edit Recipient" onClose={() => setEditRec(null)}>
        <RecipientForm dark={dark} initial={editRec} onSubmit={f => save(f, editRec.recipient_id)} loading={loading} onClose={() => setEditRec(null)} />
      </Modal>}
    </div>
  );
}

function RecipientForm({ initial, onSubmit, loading, onClose, dark }) {
  const [form, setForm] = useState(initial || { name: "", blood_type: "A+", contact_no: "", address: "" });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const iS = makeIS(dark);
  const t = T[dark ? "dark" : "light"];
  return (
    <div>
      <Field dark={dark} label="Full Name *"><input style={iS} value={form.name} onChange={set("name")} placeholder="Alice Cooper" /></Field>
      <Field dark={dark} label="Blood Type *"><select style={iS} value={form.blood_type} onChange={set("blood_type")}>{BLOOD_TYPES.map(b => <option key={b}>{b}</option>)}</select></Field>
      <Field dark={dark} label="Contact No"><input style={iS} value={form.contact_no} onChange={set("contact_no")} placeholder="+91 9876543210" /></Field>
      <Field dark={dark} label="Address"><textarea style={{ ...iS, resize: "vertical", minHeight: 64 }} value={form.address} onChange={set("address")} placeholder="City, State" /></Field>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "10px", background: t.card, color: t.tdText, border: `1px solid ${t.inputBorder}`, borderRadius: 6, fontFamily: "Inter, sans-serif", fontWeight: 500, cursor: "pointer" }}>Cancel</button>
        <button disabled={loading} onClick={() => onSubmit(form)} style={saveBtnS}>{loading ? "Saving…" : "Save Recipient"}</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REQUESTS
// ══════════════════════════════════════════════════════════════════════════════
function Requests({ toast, dark }) {
  const [requests, setRequests] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const t = T[dark ? "dark" : "light"];

  const load = useCallback(async () => {
    try { const [r, rec] = await Promise.all([fetchJSON(`${API}/requests`), fetchJSON(`${API}/recipients`)]); setRequests(r); setRecipients(rec); }
    catch (e) { toast(e.message, "error"); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async (form) => {
    setLoading(true);
    try { await fetchJSON(`${API}/requests`, { method: "POST", body: JSON.stringify(form) }); toast("Request created!"); setShowAdd(false); load(); }
    catch (e) { toast(e.message, "error"); } finally { setLoading(false); }
  };

  const updateStatus = async (id, status) => {
    try { await fetchJSON(`${API}/requests/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }); toast(`Marked as ${status}`); load(); }
    catch (e) { toast(e.message, "error"); }
  };

  const del = async (id) => {
    if (!confirm("Delete this request?")) return;
    try { await fetchJSON(`${API}/requests/${id}`, { method: "DELETE" }); toast("Deleted."); load(); }
    catch (e) { toast(e.message, "error"); }
  };

  const pending = requests.filter(r => r.status === "Pending").length;
  const approved = requests.filter(r => r.status === "Approved").length;
  const fulfilled = requests.filter(r => r.status === "Fulfilled").length;

  return (
    <div>
      <PageHeader title="Blood Requests" sub="Manage blood requests from recipients" dark={dark}>
        <button onClick={() => setShowAdd(true)} style={redBtnS}>+ New Request</button>
      </PageHeader>
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        {[["Total Requests", requests.length, t.card], ["Pending", pending, dark ? "#111100" : "#fffbeb"], ["Approved", approved, dark ? "#00080f" : "#eff6ff"], ["Fulfilled", fulfilled, dark ? "#001a00" : "#f0fdf4"]].map(([l, v, bg]) => (
          <div key={l} style={{ background: bg, border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: 20, flex: 1 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: t.subtext, marginBottom: 4 }}>{l}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 28, fontWeight: 700, color: t.text }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: 20 }}>
        <Table cols={["ID", "Recipient", "Blood Type", "Date", "Status", "Actions"]} dark={dark}>
          {requests.length === 0
            ? <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: t.muted, fontFamily: "Inter, sans-serif" }}>No requests yet</td></tr>
            : requests.map(r => (
              <tr key={r.request_id} style={{ borderBottom: `1px solid ${t.cardBorder}` }}
                onMouseEnter={e => e.currentTarget.style.background = t.trHover}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "13px 12px", color: t.muted, fontFamily: "Inter, sans-serif", fontSize: 13 }}>#{String(r.request_id).padStart(4, "0")}</td>
                <td style={{ padding: "13px 12px" }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 500, color: t.text, fontSize: 14 }}>{r.recipient_name}</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: t.subtext }}>{r.recipient_contact || r.contact_no || ""}</div>
                </td>
                <td style={{ padding: "13px 12px" }}><BloodBadge type={r.blood_type} /></td>
                <td style={{ padding: "13px 12px", fontFamily: "Inter, sans-serif", fontSize: 13, color: t.tdText }}>📅 {r.request_date}</td>
                <td style={{ padding: "13px 12px" }}><StatusBadge status={r.status} /></td>
                <td style={{ padding: "13px 12px" }}>
                  {r.status === "Pending" && <>
                    <button onClick={() => updateStatus(r.request_id, "Approved")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", fontSize: 18, color: "#16a34a" }} title="Approve">✓</button>
                    <button onClick={() => del(r.request_id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", fontSize: 18, color: "#dc2626" }} title="Reject">✕</button>
                  </>}
                  {r.status === "Approved" && (
                    <button onClick={() => updateStatus(r.request_id, "Fulfilled")} style={{ background: dark ? "#001233" : "#dbeafe", color: dark ? "#60a5fa" : "#1e40af", border: "none", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontFamily: "Inter, sans-serif", fontWeight: 600, cursor: "pointer" }}>Mark Fulfilled</button>
                  )}
                  {r.status === "Fulfilled" && <span style={{ color: t.muted, fontSize: 13, fontFamily: "Inter, sans-serif" }}>—</span>}
                </td>
              </tr>
            ))}
        </Table>
      </div>
      {showAdd && <Modal dark={dark} title="New Blood Request" subtitle="Submit a blood request for a recipient" onClose={() => setShowAdd(false)}>
        <RequestForm dark={dark} recipients={recipients} onSubmit={add} loading={loading} onClose={() => setShowAdd(false)} />
      </Modal>}
    </div>
  );
}

function RequestForm({ recipients, onSubmit, loading, onClose, dark }) {
  const [form, setForm] = useState({ recipient_id: "", blood_type: "A+", request_date: new Date().toISOString().split("T")[0], contact_no: "" });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const iS = makeIS(dark);
  const t = T[dark ? "dark" : "light"];
  const handleRecipientChange = (e) => {
    const id = e.target.value;
    const rec = recipients.find(r => String(r.recipient_id) === String(id));
    setForm(f => ({ ...f, recipient_id: id, blood_type: rec ? rec.blood_type : f.blood_type, contact_no: rec ? (rec.contact_no || "") : f.contact_no }));
  };
  return (
    <div>
      <Field dark={dark} label="Recipient *">
        <select style={iS} value={form.recipient_id} onChange={handleRecipientChange}>
          <option value="">Select recipient…</option>
          {recipients.map(r => <option key={r.recipient_id} value={r.recipient_id}>{r.name} ({r.blood_type})</option>)}
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field dark={dark} label="Blood Type *"><select style={iS} value={form.blood_type} onChange={set("blood_type")}>{BLOOD_TYPES.map(b => <option key={b}>{b}</option>)}</select></Field>
        <Field dark={dark} label="Request Date *"><input style={iS} type="date" value={form.request_date} onChange={set("request_date")} /></Field>
      </div>
      <Field dark={dark} label="Contact No"><input style={iS} value={form.contact_no} onChange={set("contact_no")} placeholder="+91 9876543210" /></Field>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "10px", background: t.card, color: t.tdText, border: `1px solid ${t.inputBorder}`, borderRadius: 6, fontFamily: "Inter, sans-serif", fontWeight: 500, cursor: "pointer" }}>Cancel</button>
        <button disabled={loading} onClick={() => onSubmit(form)} style={saveBtnS}>{loading ? "Submitting…" : "Submit Request"}</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════
function PageHeader({ title, sub, children, dark }) {
  const t = T[dark ? "dark" : "light"];
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 24, fontWeight: 700, color: t.text }}>{title}</h1>
        <p style={{ margin: "4px 0 0", fontFamily: "Inter, sans-serif", fontSize: 14, color: t.subtext }}>{sub}</p>
      </div>
      {children}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder, dark }) {
  const t = T[dark ? "dark" : "light"];
  return (
    <div style={{ position: "relative", marginBottom: 16 }}>
      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: t.muted }}>🔍</span>
      <input style={{ width: "100%", padding: "9px 12px 9px 36px", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 6, color: t.text, fontFamily: "Inter, sans-serif", fontSize: 14, boxSizing: "border-box", outline: "none" }}
        placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function Table({ cols, children, dark }) {
  const t = T[dark ? "dark" : "light"];
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
          {cols.map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: t.subtext, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

// ── Global styles (no theme dependency) ──────────────────────────────────────
const redBtnS = { background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" };
const saveBtnS = { flex: 1, padding: "10px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, fontFamily: "Inter, sans-serif", fontWeight: 600, cursor: "pointer" };

// ══════════════════════════════════════════════════════════════════════════════
// APP
// ══════════════════════════════════════════════════════════════════════════════
let tid = 0;
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [showLanding, setShowLanding] = useState(true);

  const handleEnter = () => setShowLanding(false);
  const [toasts, setToasts] = useState([]);
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("bb_theme") === "dark"; } catch { return false; }
  });

  const toggleDark = () => setDark(d => {
    const next = !d;
    try { localStorage.setItem("bb_theme", next ? "dark" : "light"); } catch {}
    return next;
  });

  const toast = useCallback((msg, type = "success") => {
    const id = ++tid;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  const th = T[dark ? "dark" : "light"];

  const nav = [
    { id: "dashboard", label: "Dashboard", icon: "⊞" },
    { id: "donors", label: "Donors", icon: "👤" },
    { id: "donations", label: "Donations", icon: "🩸" },
    { id: "inventory", label: "Blood Stock", icon: "📦" },
    { id: "requests", label: "Requests", icon: "📋" },
    { id: "recipients", label: "Recipients", icon: "🏥" },
  ];

  if (showLanding) {
    return <Landing onEnter={handleEnter} dark={dark} toggleDark={toggleDark} />;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${th.bg}; font-family: Inter, sans-serif; transition: background 0.2s; }
        input:focus, select:focus, textarea:focus { border-color: #dc2626 !important; box-shadow: 0 0 0 2px rgba(220,38,38,0.15); }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
        option { background: ${th.input}; color: ${th.text}; }
        @keyframes page-enter { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .page-transition { animation: page-enter 250ms ease both; }
        @keyframes bar-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        .bar-grow { animation: bar-grow 0.7s ease-out both; transform-origin: bottom; }
        @keyframes ring-anim { from { stroke-dashoffset: var(--circ); } }
        .ring-fill { animation: ring-anim 1s ease-out both; }
      `}</style>
      <Toast toasts={toasts} remove={id => setToasts(t => t.filter(x => x.id !== id))} />
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Sidebar */}
        <aside style={{ width: 220, background: dark ? "linear-gradient(180deg, #0d0d0d 0%, #1a0a0a 100%)" : `linear-gradient(180deg, ${th.sidebar} 0%, #fef2f2 100%)`, borderRight: `1px solid ${th.sidebarBorder}`, display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 100, transition: "background 0.3s" }}>
          {/* Logo */}
          <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${th.sidebarBorder}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, background: "#dc2626", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🩸</div>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, color: th.text, fontSize: 15 }}>BloodBank</div>
                <div style={{ fontFamily: "Inter, sans-serif", color: th.muted, fontSize: 11 }}>Management System</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "12px 10px" }}>
            {nav.map(n => {
              const active = page === n.id;
              return (
                <button key={n.id} onClick={() => setPage(n.id)} style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "9px 12px", border: "none", borderRadius: 7,
                  background: active ? "#dc2626" : th.navInactive,
                  color: active ? "#fff" : th.navTextInactive,
                  fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: active ? 600 : 400,
                  cursor: "pointer", marginBottom: 2, textAlign: "left", transition: "all 0.15s",
                }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = dark ? "#1a1a1a" : "#f3f4f6"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                  <span>{n.icon}</span>{n.label}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div style={{ padding: "14px 16px", borderTop: `1px solid ${th.sidebarBorder}` }}>
            {/* Theme Toggle */}
            <div onClick={toggleDark} style={{
              marginBottom: 12, cursor: "pointer", userSelect: "none",
              width: 36, height: 36, borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: dark
                ? "linear-gradient(145deg, #1e3a5f, #2d6a9f)"
                : "linear-gradient(145deg, #fbbf24, #f97316)",
              boxShadow: dark
                ? "0 2px 10px rgba(45,106,159,0.6), inset 0 1px 0 rgba(255,255,255,0.1)"
                : "0 2px 10px rgba(249,115,22,0.5), inset 0 1px 0 rgba(255,255,255,0.5)",
              transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
              position: "relative", overflow: "hidden",
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

            {/* Status */}
            <div style={{ background: dark ? "#0a0a0a" : "#f0fdf4", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: th.subtext, marginBottom: 4 }}>Connected to backend</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 500, color: "#16a34a" }}>System Active</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, marginLeft: 220, padding: 28, minHeight: "100vh", background: th.bg, transition: "background 0.2s" }}>
          <div key={page} className="page-transition">
            {page === "dashboard" && <Dashboard dark={dark} toast={toast} setPage={setPage} />}
            {page === "donors" && <Donors dark={dark} toast={toast} />}
            {page === "donations" && <Donations dark={dark} toast={toast} />}
            {page === "inventory" && <BloodStock dark={dark} toast={toast} />}
            {page === "requests" && <Requests dark={dark} toast={toast} />}
            {page === "recipients" && <Recipients dark={dark} toast={toast} />}
          </div>
        </main>
      </div>
    </>
  );
}