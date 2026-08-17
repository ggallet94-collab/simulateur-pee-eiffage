import { useState } from "react";
import { C } from "../config/theme.js";
import { ACCESS_PASSWORD } from "../config/access.js";

const STORAGE_KEY = "pee_access_granted";

export default function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(STORAGE_KEY) === "1");
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (input === ACCESS_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (unlocked) return children;

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,sans-serif" }}>
      <form onSubmit={submit} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "28px 26px", width: 280 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.goldLight, marginBottom: 4 }}>PEE Eiffage · Simulateur</div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 18 }}>Accès protégé — entrer le mot de passe</div>
        <input
          type="password"
          autoFocus
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false); }}
          style={{ width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${error ? C.red : C.border}`, borderRadius: 6, padding: "9px 11px", fontSize: 14, color: C.text, outline: "none", marginBottom: 10 }}
        />
        {error && <div style={{ fontSize: 11, color: C.red, marginBottom: 10 }}>Mot de passe incorrect.</div>}
        <button type="submit" style={{ width: "100%", background: C.gold, border: "none", borderRadius: 7, padding: "9px 0", fontSize: 13, color: "#111", fontWeight: 600, cursor: "pointer" }}>
          Accéder au simulateur
        </button>
      </form>
    </div>
  );
}