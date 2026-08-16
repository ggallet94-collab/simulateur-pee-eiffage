export const fmt = (n) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export const pct = (n) => `${n >= 0 ? "+" : ""}${n.toFixed(2)} %`;

export const n2 = (s) => {
  const v = parseFloat(String(s).replace(/[\s\u00a0]/g, "").replace(",", "."));
  return isNaN(v) ? 0 : v;
};

export const calcBrute = (row, sortedHist, cA) => {
  const ps = n2(row.prixSouscription), cA_ = n2(cA);
  if (ps <= 0 || cA_ <= 0) return null;
  const cash = n2(row.versement) + n2(row.participation);
  if (cash <= 0) return null;
  const acqYear = parseInt(row.year);
  if (isNaN(acqYear)) return null;
  let parts = cash / ps;
  for (const yr of sortedHist) if (parseInt(yr.year) >= acqYear) parts *= (1 + n2(yr.perfDiv) / 100);
  return parts * cA_;
};
