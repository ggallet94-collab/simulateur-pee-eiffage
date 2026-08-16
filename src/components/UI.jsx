import { C } from "../config/theme.js";
import { fmt } from "../utils/format.js";

export const Field = ({ label, value, onChange, suffix = "", color = C.text }) => (
  <div style={{ marginBottom: 11 }}>
    {label && <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>{label}</div>}
    <div style={{ display: "flex", alignItems: "center", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "7px 9px", fontSize: 13, color, minWidth: 0 }} />
      {suffix && <span style={{ paddingRight: 7, color: C.muted, fontSize: 11, flexShrink: 0 }}>{suffix}</span>}
    </div>
  </div>
);

export const Slider = ({ label, value, onChange, min, max, step, display }) => (
  <div style={{ marginBottom: 11 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
      <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
      <span style={{ fontSize: 12, color: C.goldLight, fontWeight: 600 }}>{display}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: C.gold, cursor: "pointer" }} />
  </div>
);

export const KPI = ({ label, value, sub, color = C.goldLight }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", flex: 1, minWidth: 120 }}>
    <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 700, color }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>}
  </div>
);

export const Divider = ({ label }) => (
  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4, color: C.muted, marginBottom: 10, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>{label}</div>
);

export const InfoRow = ({ l, v, c = C.text }) => (
  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
    <span style={{ color: C.muted }}>{l}</span><span style={{ color: c, fontWeight: 600 }}>{v}</span>
  </div>
);

export const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, i) => s + i.value, 0);
  return (
    <div style={{ background: "#080c14", border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 14px", fontSize: 12 }}>
      <div style={{ color: C.goldLight, fontWeight: 700, marginBottom: 7 }}>{label}</div>
      {[...payload].reverse().map((i) => (
        <div key={i.name} style={{ display: "flex", justifyContent: "space-between", gap: 18, marginBottom: 2 }}>
          <span style={{ color: i.color }}>{i.name}</span><span style={{ color: C.text, fontWeight: 600 }}>{fmt(i.value)}</span>
        </div>
      ))}
      <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 7, paddingTop: 7, display: "flex", justifyContent: "space-between", color: C.goldLight, fontWeight: 700 }}>
        <span>Total</span><span>{fmt(total)}</span>
      </div>
    </div>
  );
};

export const InRow = ({ value, onChange, w = 52, color = C.text, suffix = "", bg = C.bg, bord = C.border }) => (
  <div style={{ display: "flex", alignItems: "center", background: bg, border: `1px solid ${bord}`, borderRadius: 5 }}>
    <input value={value} onChange={(e) => onChange(e.target.value)}
      style={{ background: "transparent", border: "none", outline: "none", padding: "3px 5px", fontSize: 11, color, width: w, textAlign: "right" }} />
    {suffix && <span style={{ paddingRight: 4, color: C.muted, fontSize: 10 }}>{suffix}</span>}
  </div>
);
