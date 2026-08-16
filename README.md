# Simulateur PEE Eiffage

Simulateur de projection PEE (FCPE Actionnariat Relais) — cohortes historiques, valorisation live, arbitrage 5 ans.

## Structure

```
src/
  config/
    theme.js           → palette de couleurs
    eiffageConfig.js    → toutes les règles spécifiques Eiffage (convention BTP, décote,
                           plafond arbitrage, taux PS, historique par défaut)
  utils/
    format.js           → formatage (fmt, pct) et calculs de valorisation (calcBrute)
  components/
    UI.jsx               → composants réutilisables (Field, Slider, KPI, tooltip graphique...)
  App.jsx                → composant principal
```

Pour ajouter une autre entreprise plus tard (VINCI, Bouygues...), créer un fichier
`src/config/vinciConfig.js` sur le même modèle que `eiffageConfig.js`, sans toucher
au reste du code.

Le cours de l'action est saisi manuellement (champ éditable en haut à droite).
Aucune dépendance API externe pour le V1 — le déploiement est donc purement statique.

## Développement local

```bash
npm install
npm run dev
```

## Déploiement

Projet 100% statique : n'importe quel hébergeur statique fonctionne (Vercel, Netlify...).
Sur Vercel : créer un projet lié à ce repo GitHub, aucune configuration supplémentaire
requise, déployer directement.

## Évolution future : cours automatique

Si besoin d'automatiser la récupération du cours plus tard, préférer une API financière
dédiée (Alpha Vantage, Twelve Data — gratuites en tier de base) plutôt qu'un LLM avec
recherche web, plus rapide, plus fiable et sans coût par appel. Prévoir alors une fonction
serverless (`api/cours.js`) pour garder la clé API côté serveur.
