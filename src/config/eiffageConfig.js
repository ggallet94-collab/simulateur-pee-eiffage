// Tout ce qui est spécifique à Eiffage est regroupé ici.
// Le jour où tu ajoutes VINCI/Bouygues, tu crées un VINCI_CONFIG à côté
// avec la même forme, sans toucher au reste de l'app.

export const EIFFAGE_CONFIG = {
  id: "eiffage",
  label: "Eiffage",
  ticker: "FGR.PA",
  tickerLabel: "Eiffage FGR.PA · Euronext",

  // Convention collective : nombre de mois de salaire utilisé pour annualiser le brut
  moisSalaire: 13.3,

  // Décote à la souscription (moyenne 20 séances Euronext, fin février)
  decotePct: 0.20,

  // Plafond d'arbitrage / réinvestissement par année de déblocage (tous cohortes confondues)
  plafondArbitrageAnnuel: 25000,

  // Délai de blocage réglementaire (années) avant déblocage d'une cohorte
  delaiBlocageAns: 5,

  // Taux de prélèvements sociaux par défaut selon l'année de souscription
  // (LFSS 2026 : 18.6% à partir de 2026, 17.2% avant)
  defaultPsRate: (year) => (parseInt(year) >= 2026 ? "18.6" : "17.2"),

  // Historique par défaut affiché au premier chargement (données réelles de l'utilisateur)
  historiqueDefaut: [
    { id: 1, year: "2023", versement: "15000", participation: "245", prixSouscription: "80.20", perfDiv: "3.5", psRate: "17.2" },
    { id: 2, year: "2024", versement: "15000", participation: "0", prixSouscription: "77.57", perfDiv: "4.1", psRate: "17.2" },
    { id: 3, year: "2025", versement: "14200", participation: "150", prixSouscription: "71.14", perfDiv: "4.85", psRate: "17.2" },
    { id: 4, year: "2026", versement: "14000", participation: "300", prixSouscription: "106.55", perfDiv: "3.7", psRate: "18.6" },
  ],
};
