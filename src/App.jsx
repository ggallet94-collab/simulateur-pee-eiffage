import { useState, useMemo, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

import { C } from "./config/theme.js";
import { EIFFAGE_CONFIG as CFG } from "./config/eiffageConfig.js";
import { fmt, pct, n2, calcBrute } from "./utils/format.js";
import { Field, Slider, KPI, Divider, InfoRow, TT, InRow } from "./components/UI.jsx";

export default function App() {
  const [salaireMensuel, setSalaireMensuel] = useState("3975");
  const [primes, setPrimes] = useState("5000");
  const salairebrut = String(Math.round(n2(salaireMensuel) * CFG.moisSalaire));
  const [coursActuel, setCoursActuel] = useState("140.50");
  const [coursLoading, setCoursLoading] = useState(false);
  const [coursMsg, setCoursMsg] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [historique, setHistorique] = useState(CFG.historiqueDefaut);
  const [nextId, setNextId] = useState(CFG.historiqueDefaut.length + 1);
  const [proj, setProj] = useState({
    versementStr: "14000", participationStr: "300",
    rendement: 6, dividende: 3, anneesProjection: 15,
    arbitrage: true, arbitragePct: 100,
  });
  const upd = (k) => (v) => setProj((p) => ({ ...p, [k]: v }));
  const updH = (id, f, v) => setHistorique((h) => h.map((r) => (r.id === id ? { ...r, [f]: v } : r)));
  const addH = () => {
    const lastY = historique.length > 0 ? Math.max(...historique.map((h) => parseInt(h.year) || 2026)) : 2026;
    const ny = String(lastY + 1);
    setHistorique((h) => [...h, { id: nextId, year: ny, versement: "0", participation: "0", prixSouscription: "0", perfDiv: "3.7", psRate: CFG.defaultPsRate(ny) }]);
    setNextId((n) => n + 1);
  };

  // Cours récupéré via la fonction serverless /api/cours (clé API côté serveur, jamais exposée au client)
  const refreshCours = useCallback(async () => {
    setCoursLoading(true); setCoursMsg("Recherche en cours…");
    try {
      const res = await fetch("/api/cours");
      const data = await res.json();
      if (data.price) {
        setCoursActuel(data.price);
        setLastUpdated(new Date());
        setCoursMsg(`✓ ${data.price} € · tout mis à jour`);
      } else {
        setCoursMsg("Cours introuvable — saisir manuellement.");
      }
    } catch (e) {
      setCoursMsg("Erreur réseau.");
    }
    setCoursLoading(false);
    setTimeout(() => setCoursMsg(""), 5000);
  }, []);

  const cA = n2(coursActuel);

  const derived = useMemo(() => {
    const total = n2(salairebrut) + n2(primes);
    return { total, plafond: total * 0.25, depassement: Math.max(0, n2(proj.versementStr) - total * 0.25) };
  }, [salairebrut, primes, proj.versementStr]);

  const sortedHist = useMemo(() => [...historique]
    .map((h) => ({ ...h, year: parseInt(h.year) || 0 }))
    .filter((h) => h.year > 0).sort((a, b) => a.year - b.year), [historique]);

  const histCalc = useMemo(() => historique.map((row) => {
    const cash = n2(row.versement) + n2(row.participation);
    const ps = n2(row.prixSouscription);
    const nbParts = ps > 0 ? cash / ps : 0;
    const brute = calcBrute(row, sortedHist, cA);
    const pv = brute !== null ? brute - cash : null;
    const psR = n2(row.psRate) / 100;
    const psEur = pv !== null && pv > 0 ? pv * psR : 0;
    const nette = brute !== null ? brute - psEur : null;
    return { id: row.id, cash, nbParts, brute, pv, psEur, nette };
  }), [historique, sortedHist, cA]);

  const totalBrut = histCalc.reduce((s, h) => s + (h.brute || 0), 0);
  const totalPS = histCalc.reduce((s, h) => s + h.psEur, 0);
  const totalNet = totalBrut - totalPS;
  const totalCash = histCalc.reduce((s, h) => s + h.cash, 0);

  const lastHistYear = sortedHist.length > 0 ? sortedHist[sortedHist.length - 1].year : 2026;
  const firstProjYear = lastHistYear + 1;

  const histChartRows = useMemo(() => sortedHist.map((yr) => {
    const yrRow = historique.find((r) => parseInt(r.year) === yr.year);
    const psY = yrRow ? n2(yrRow.prixSouscription) : 0;
    const coursY = psY > 0 ? psY / (1 - CFG.decotePct) : cA;

    let total = 0;
    historique.forEach((row) => {
      const acqYear = parseInt(row.year);
      if (isNaN(acqYear) || acqYear > yr.year) return;
      const ps = n2(row.prixSouscription);
      const cash = n2(row.versement) + n2(row.participation);
      if (ps <= 0 || cash <= 0) return;
      let parts = cash / ps;
      for (const dyrObj of sortedHist) {
        const dy = parseInt(dyrObj.year);
        if (dy >= acqYear && dy <= yr.year) parts *= (1 + n2(dyrObj.perfDiv) / 100);
      }
      total += parts * coursY;
    });

    return {
      year: yr.year, yearLabel: String(yr.year), type: "reel",
      portfolio: Math.round(total),
      capitalReel: Math.round(total),
      versements: 0, participations: 0, decote: 0, marche: 0, retraitDispo: 0,
    };
  }), [sortedHist, historique, cA]);

  const projRows = useMemo(() => {
    const { rendement, dividende, anneesProjection, arbitrage, arbitragePct, versementStr, participationStr } = proj;
    const r = (rendement + dividende) / 100;

    let cohorts = [];
    historique.forEach((row) => {
      const acqYear = parseInt(row.year);
      if (isNaN(acqYear)) return;
      const h = histCalc.find((x) => x.id === row.id);
      const val = h && h.brute ? h.brute : 0;
      if (val > 0) {
        const unlockI = acqYear + CFG.delaiBlocageAns - firstProjYear;
        cohorts.push({ v: val, yi: unlockI - CFG.delaiBlocageAns });
      }
    });

    let cumV = 0, cumP = 0, cumD = 0, retraitDispo = 0;
    const rows = [];

    for (let i = 0; i < anneesProjection; i++) {
      cohorts = cohorts.map((c) => ({ ...c, v: c.v * (1 + r) }));
      retraitDispo *= (1 + r);

      const cash = n2(versementStr) + n2(participationStr);
      if (cash > 0) { cohorts.push({ v: cash * (1 + CFG.decotePct), yi: i }); cumD += cash * CFG.decotePct; }
      cumV += n2(versementStr);
      cumP += n2(participationStr);

      const unlocking = cohorts.filter((c) => c.yi === i - CFG.delaiBlocageAns);
      cohorts = cohorts.filter((c) => c.yi !== i - CFG.delaiBlocageAns);
      if (unlocking.length > 0) {
        const totalVal = unlocking.reduce((s, c) => s + c.v, 0);
        if (arbitrage) {
          const toA = Math.min(totalVal * (arbitragePct / 100), CFG.plafondArbitrageAnnuel);
          const toR = totalVal - toA;
          if (toA > 0) { cohorts.push({ v: toA * (1 + CFG.decotePct), yi: i }); cumD += toA * CFG.decotePct; }
          retraitDispo += toR;
        } else {
          retraitDispo += totalVal;
        }
      }

      const portfolio = cohorts.reduce((s, c) => s + c.v, 0) + retraitDispo;
      const marche = Math.max(0, portfolio - totalBrut - cumD - cumV - cumP - retraitDispo);
      rows.push({
        year: firstProjYear + i, yearLabel: String(firstProjYear + i), type: "projete",
        portfolio: Math.round(portfolio),
        capitalReel: Math.round(totalBrut),
        versements: Math.round(cumV), participations: Math.round(cumP),
        decote: Math.round(cumD), marche: Math.round(marche),
        retraitDispo: Math.round(retraitDispo),
      });
    }
    return rows;
  }, [totalBrut, proj, firstProjYear, historique, histCalc]);

  const allChartRows = [...histChartRows, ...projRows];
  const last = projRows[projRows.length - 1] || {};

  const SEGS = [
    { key: "capitalReel", color: C.green, label: "Capital réel actuel" },
    { key: "versements", color: C.blue, label: "Versements" },
    { key: "participations", color: C.cyan, label: "Part./Int." },
    { key: "decote", color: C.gold, label: "Gain décote" },
    { key: "marche", color: C.purple, label: "Perf. marché" },
    { key: "retraitDispo", color: C.orange, label: "Retrait dispo" },
  ];

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", fontFamily: "system-ui,sans-serif" }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      <div style={{ padding: "10px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 5, height: 24, background: `linear-gradient(${C.goldLight},${C.gold})`, borderRadius: 3 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.goldLight }}>PEE {CFG.label} · Simulateur</div>
            <div style={{ fontSize: 10, color: C.muted }}>Valorisation auto · Cours live · PS par cohorte · Arbitrage {CFG.plafondArbitrageAnnuel / 1000}K/an</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid rgba(201,160,82,0.4)`, borderRadius: 9, padding: "7px 12px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, color: C.muted }}>Cours {CFG.tickerLabel}</div>
            {lastUpdated && <div style={{ fontSize: 9, color: C.green }}>Mis à jour {lastUpdated.toLocaleDateString("fr-FR")} {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
            <input value={coursActuel} onChange={(e) => { setCoursActuel(e.target.value); setLastUpdated(new Date()); }}
              style={{ background: "transparent", border: "none", outline: "none", padding: "4px 8px", fontSize: 17, color: C.goldLight, fontWeight: 700, width: 64, textAlign: "right" }} />
            <span style={{ paddingRight: 8, color: C.muted, fontSize: 12 }}>€</span>
          </div>
          <button onClick={refreshCours} disabled={coursLoading}
            style={{ background: coursLoading ? "#1c2535" : C.gold, border: "none", borderRadius: 7, padding: "6px 13px", fontSize: 12,
              color: coursLoading ? C.muted : "#111", fontWeight: 600, cursor: coursLoading ? "default" : "pointer",
              display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
            <span style={{ display: "inline-block", animation: coursLoading ? "spin 1s linear infinite" : "none", fontSize: 14 }}>⟳</span>
            {coursLoading ? "Recherche…" : "Actualiser tout"}
          </button>
          {coursMsg && <div style={{ fontSize: 11, color: C.green, maxWidth: 160 }}>{coursMsg}</div>}
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 61px)" }}>
        <div style={{ width: 262, flexShrink: 0, borderRight: `1px solid ${C.border}`, padding: "13px 12px", overflowY: "auto", background: "#0b0f18" }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4, color: C.muted, marginBottom: 10 }}>Profil salarial</div>
          <Field label="Salaire brut mensuel" value={salaireMensuel} onChange={setSalaireMensuel} suffix="€" />
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 10px", marginBottom: 10, fontSize: 11, display: "flex", flexDirection: "column", gap: 3 }}>
            <InfoRow l={`Convention BTP × ${CFG.moisSalaire} mois`} v={`${n2(salaireMensuel).toLocaleString("fr-FR")} × ${CFG.moisSalaire}`} />
            <InfoRow l="Brut annuel calculé" v={fmt(n2(salairebrut))} c={C.goldLight} />
          </div>
          <Field label="Primes annuelles" value={primes} onChange={setPrimes} suffix="€" />
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 10px", marginBottom: 4, fontSize: 11, display: "flex", flexDirection: "column", gap: 3 }}>
            <InfoRow l="Brut total" v={fmt(derived.total)} />
            <InfoRow l="Plafond invest. volontaire (25 %)" v={fmt(derived.plafond)} c={C.goldLight} />
            <div style={{ fontSize: 10, color: C.muted }}>↳ Participation / intéressement hors plafond</div>
          </div>

          <Divider label="Projection annuelle" />
          <Field label="Versement volontaire projeté (avril)" value={proj.versementStr} onChange={upd("versementStr")} suffix="€"
            color={derived.depassement > 0 ? C.red : C.text} />
          {derived.depassement > 0 && (
            <div style={{ background: "rgba(248,113,113,0.08)", border: `1px solid rgba(248,113,113,0.25)`, borderRadius: 6, padding: "5px 9px", marginBottom: 9, fontSize: 11, color: C.red }}>
              ⚠️ Dépasse le plafond de {fmt(derived.depassement)}
            </div>
          )}
          <Field label="Participation / Intéressement projeté" value={proj.participationStr} onChange={upd("participationStr")} suffix="€" />

          <Divider label="Hypothèses marché (projection)" />
          <Slider label={`Performance cours ${CFG.label} (%/an)`} value={proj.rendement} onChange={upd("rendement")} min={-20} max={30} step={0.5} display={`${proj.rendement >= 0 ? "+" : ""}${proj.rendement.toFixed(1)} %`} />
          <Slider label="Rendement dividende (%/an)" value={proj.dividende} onChange={upd("dividende")} min={0} max={10} step={0.5} display={`${proj.dividende.toFixed(1)} %`} />
          <Slider label="Années de projection" value={proj.anneesProjection} onChange={upd("anneesProjection")} min={1} max={30} step={1} display={`${proj.anneesProjection} ans`} />

          <div style={{ background: C.card, border: `1px solid rgba(52,211,153,0.2)`, borderRadius: 7, padding: "7px 10px", marginBottom: 11, fontSize: 11, display: "flex", flexDirection: "column", gap: 3 }}>
            <InfoRow l="Capital ancrage (valorisation réelle)" v={fmt(totalBrut)} c={C.green} />
            <div style={{ fontSize: 10, color: C.muted }}>↳ Point de départ de la projection</div>
          </div>

          <Divider label={`Arbitrage après ${CFG.delaiBlocageAns} ans`} />
          <div style={{ background: C.card, border: `1px solid ${proj.arbitrage ? C.gold : C.border}`, borderRadius: 8, padding: "9px 11px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: proj.arbitrage ? 11 : 0 }}>
              <div onClick={() => upd("arbitrage")(!proj.arbitrage)}
                style={{ width: 36, height: 20, borderRadius: 10, background: proj.arbitrage ? C.gold : C.border, cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: proj.arbitrage ? 19 : 3, transition: "left .2s" }} />
              </div>
              <span style={{ fontSize: 11, color: proj.arbitrage ? C.goldLight : C.muted, fontWeight: 600 }}>Activer l'arbitrage</span>
            </div>
            {proj.arbitrage && (<>
              <Slider label="% arbitré par année de déblocage" value={proj.arbitragePct} onChange={upd("arbitragePct")} min={0} max={100} step={5} display={`${proj.arbitragePct} %`} />
              <div style={{ fontSize: 11, display: "flex", flexDirection: "column", gap: 4 }}>
                <InfoRow l="Montant max arbitrable par an" v={fmt(CFG.plafondArbitrageAnnuel)} c={C.goldLight} />
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>
                  À chaque déblocage, jusqu'à {fmt(CFG.plafondArbitrageAnnuel)} peuvent être réinjectés avec la décote −{CFG.decotePct * 100}% (moyenne 20 séances Euronext de février).<br />
                  Le solde au-delà reste investi sur {CFG.label} en "retrait disponible".
                </div>
              </div>
            </>)}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "13px 17px" }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 13, overflow: "hidden" }}>
            <div style={{ padding: "9px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Données réelles · FCPE Actionnariat Relais</span>
                <span style={{ fontSize: 10, color: C.muted, marginLeft: 8 }}>
                  Valorisation = parts × {cA.toFixed(2)} €
                  {lastUpdated && <span style={{ color: C.green }}> · actualisé {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>}
                </span>
              </div>
              <button onClick={addH} style={{ background: C.gold, border: "none", borderRadius: 6, padding: "4px 11px", fontSize: 11, color: "#111", fontWeight: 600, cursor: "pointer" }}>+ Année</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: "#0a0e18" }}>
                    {["Année", "Versement", "Part./Int.", "Cash", "Prix souscr. PEE", "Nb parts", "Div. réinvesti /an", "Val. brute", "Plus-value", "Taux PS", "PS dû", "Val. nette", ""].map((h) => (
                      <th key={h} style={{ padding: "6px 8px", color: C.muted, fontSize: 9.5, textAlign: "right", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historique.map((row, i) => {
                    const h = histCalc.find((x) => x.id === row.id) || {};
                    const hasVal = h.brute != null && h.brute > 0;
                    return (
                      <tr key={row.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                        <td style={{ padding: "3px 4px" }}>
                          <InRow value={row.year} onChange={(v) => { updH(row.id, "year", v); updH(row.id, "psRate", CFG.defaultPsRate(v)); }} w={42} color={C.green} />
                        </td>
                        {["versement", "participation"].map((f) => (
                          <td key={f} style={{ padding: "3px 4px" }}>
                            <InRow value={row[f]} onChange={(v) => updH(row.id, f, v)} w={60} suffix="€" />
                          </td>
                        ))}
                        <td style={{ padding: "3px 8px", textAlign: "right", color: C.text }}>{fmt(h.cash || 0)}</td>
                        <td style={{ padding: "3px 4px" }}>
                          <InRow value={row.prixSouscription} onChange={(v) => updH(row.id, "prixSouscription", v)} w={52} color={C.goldLight} suffix="€" bg="rgba(201,160,82,0.06)" bord="rgba(201,160,82,0.25)" />
                        </td>
                        <td style={{ padding: "3px 8px", textAlign: "right", color: C.cyan }}>{h.nbParts > 0 ? h.nbParts.toFixed(2) : "—"}</td>
                        <td style={{ padding: "3px 4px" }}>
                          <InRow value={row.perfDiv} onChange={(v) => updH(row.id, "perfDiv", v)} w={32} color={C.cyan} suffix="%" bg="rgba(34,211,238,0.05)" bord="rgba(34,211,238,0.15)" />
                        </td>
                        <td style={{ padding: "3px 8px", textAlign: "right" }}>
                          {hasVal ? <><div style={{ color: C.green, fontWeight: 700 }}>{fmt(h.brute)}</div><div style={{ fontSize: 9.5, color: C.muted }}>× {cA.toFixed(2)} €</div></> : <span style={{ color: C.muted }}>—</span>}
                        </td>
                        <td style={{ padding: "3px 8px", textAlign: "right" }}>
                          {hasVal && h.pv != null ? <><div style={{ color: h.pv >= 0 ? C.green : C.red, fontWeight: 600 }}>{fmt(h.pv)}</div><div style={{ fontSize: 9.5, color: C.muted }}>{pct((h.pv / (h.cash || 1)) * 100)}</div></> : <span style={{ color: C.muted }}>—</span>}
                        </td>
                        <td style={{ padding: "3px 4px" }}>
                          <InRow value={row.psRate} onChange={(v) => updH(row.id, "psRate", v)} w={32} color={C.red} suffix="%" bg="rgba(248,113,113,0.06)" bord="rgba(248,113,113,0.2)" />
                        </td>
                        <td style={{ padding: "3px 8px", textAlign: "right", color: C.red }}>{h.psEur > 0 ? fmt(-h.psEur) : "—"}</td>
                        <td style={{ padding: "3px 8px", textAlign: "right" }}>
                          {hasVal && h.nette != null ? <><div style={{ color: C.goldLight, fontWeight: 700 }}>{fmt(h.nette)}</div><div style={{ fontSize: 9.5, color: C.muted }}>{pct(((h.nette - h.cash) / (h.cash || 1)) * 100)}</div></> : <span style={{ color: C.muted }}>—</span>}
                        </td>
                        <td style={{ padding: "3px 6px", textAlign: "center" }}>
                          <button onClick={() => setHistorique((h) => h.filter((r) => r.id !== row.id))}
                            style={{ background: "transparent", border: `1px solid rgba(248,113,113,0.2)`, borderRadius: 4, padding: "2px 5px", fontSize: 11, color: C.red, cursor: "pointer" }}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: `2px solid ${C.border}`, background: "rgba(201,160,82,0.05)" }}>
                    <td colSpan={3} style={{ padding: "7px 8px", color: C.goldLight, fontWeight: 700, fontSize: 11 }}>TOTAL</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", color: C.text, fontWeight: 700 }}>{fmt(totalCash)}</td>
                    <td colSpan={4}></td>
                    <td style={{ padding: "7px 8px", textAlign: "right", color: C.green, fontWeight: 700 }}>{fmt(totalBrut)}</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", color: totalBrut - totalCash >= 0 ? C.green : C.red, fontWeight: 700 }}>{fmt(totalBrut - totalCash)}</td>
                    <td></td>
                    <td style={{ padding: "7px 8px", textAlign: "right", color: C.red, fontWeight: 700 }}>{fmt(-totalPS)}</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", color: C.goldLight, fontWeight: 700 }}>{fmt(totalNet)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
              <div style={{ padding: "5px 12px", fontSize: 9.5, color: C.muted, borderTop: `1px solid ${C.border}`, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span>📋 Prix souscription : AMF officiel ({(1 - CFG.decotePct) * 100}% · 20 séances Euronext · fin février)</span>
                <span>⚙️ Val. brute = parts × ∏(1+div) × cours actuel</span>
                <span style={{ color: "rgba(248,113,113,0.6)" }}>🔴 PS au taux de l'année de souscription · PEE exonéré IR</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 9, marginBottom: 12, flexWrap: "wrap" }}>
            <KPI label="Valorisation brute totale" value={fmt(totalBrut)} sub={`+${fmt(totalBrut - totalCash)} de plus-value`} color={C.green} />
            <KPI label="Prélèvements sociaux" value={fmt(-totalPS)} sub="Taux par cohorte · sur PV uniquement" color={C.red} />
            <KPI label="Valorisation nette (après PS)" value={fmt(totalNet)} sub="PEE exonéré d'IR" color={C.goldLight} />
            <KPI label="Capital projeté final" value={fmt(last.portfolio || 0)} sub={`+${proj.anneesProjection} ans · dont ${fmt(last.retraitDispo || 0)} retrait dispo`} color={C.purple} />
          </div>

          {last.portfolio > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 14px", marginBottom: 11 }}>
              <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Répartition projetée à terme</div>
              <div style={{ display: "flex", height: 7, borderRadius: 4, overflow: "hidden", gap: 1 }}>
                {SEGS.map((s) => <div key={s.key} style={{ flex: Math.max(0, (last[s.key] || 0)) / last.portfolio, background: s.color, opacity: 0.85 }} />)}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                {SEGS.map((s) => (
                  <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                    <span style={{ fontSize: 11, color: C.muted }}>{s.label} </span>
                    <span style={{ fontSize: 11, color: C.text, fontWeight: 600 }}>{Math.round(Math.max(0, (last[s.key] || 0)) / last.portfolio * 100)} %</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 6px 4px", marginBottom: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 8, marginBottom: 5, flexWrap: "wrap", gap: 4 }}>
              <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>
                Évolution {sortedHist[0]?.year || "2023"} → {firstProjYear + proj.anneesProjection - 1}
              </span>
              <div style={{ display: "flex", gap: 12, fontSize: 10, paddingRight: 6 }}>
                <span style={{ color: C.green }}>■ Réel (cours actuel)</span>
                <span style={{ color: C.muted }}>┄ Projection</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={allChartRows} margin={{ top: 2, right: 4, bottom: 0, left: 2 }}>
                <defs>
                  {[["cap", C.green], ["v", C.blue], ["p", C.cyan], ["d", C.gold], ["m", C.purple], ["r", C.orange]].map(([id, col]) => (
                    <linearGradient key={id} id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={col} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={col} stopOpacity={0.04} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="yearLabel" tick={{ fill: C.muted, fontSize: 10 }} tickLine={false} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fill: C.muted, fontSize: 10 }} tickLine={false} axisLine={false} width={42} />
                <Tooltip content={<TT />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 5 }} />
                <ReferenceLine x={String(firstProjYear)} stroke={C.gold} strokeDasharray="4 3" strokeWidth={1.5}
                  label={{ value: "→ Projection", fill: C.gold, fontSize: 10, position: "insideTopRight" }} />
                <Area type="monotone" dataKey="capitalReel" name="Capital réel" stackId="1" stroke={C.green} fill="url(#gcap)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="versements" name="Versements" stackId="1" stroke={C.blue} fill="url(#gv)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="participations" name="Part./Int." stackId="1" stroke={C.cyan} fill="url(#gp)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="decote" name="Gain décote" stackId="1" stroke={C.gold} fill="url(#gd)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="marche" name="Perf. marché" stackId="1" stroke={C.purple} fill="url(#gm)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="retraitDispo" name="Retrait dispo" stackId="1" stroke={C.orange} fill="url(#gr)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ fontSize: 9.5, color: "#1e2d3d", textAlign: "center", paddingBottom: 8 }}>
            ⚠️ Simulation indicative. Valorisation réelle = parts × cours actuel · PS au taux de l'année de souscription · Arbitrage plafonné {fmt(CFG.plafondArbitrageAnnuel)} / an · PEE exonéré d'impôt sur le revenu.
          </div>
        </div>
      </div>
    </div>
  );
}
