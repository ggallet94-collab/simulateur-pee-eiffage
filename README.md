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
api/
  cours.js               → fonction serverless Vercel, récupère le cours Eiffage
                           côté serveur (clé API jamais exposée au navigateur)
```

Pour ajouter une autre entreprise plus tard (VINCI, Bouygues...), créer un fichier
`src/config/vinciConfig.js` sur le même modèle que `eiffageConfig.js`, sans toucher
au reste du code.

## Développement local

```bash
npm install
npm run dev
```

L'appel au cours en direct (`/api/cours`) ne fonctionne qu'une fois déployé sur Vercel
(ou via `vercel dev` en local), car il s'agit d'une fonction serverless.

## Déploiement

1. Créer un projet sur [vercel.com](https://vercel.com), lié à ce repo GitHub
2. Dans Project Settings > Environment Variables, ajouter `ANTHROPIC_API_KEY`
   (voir `.env.example`)
3. Déployer

## Variables d'environnement

Copier `.env.example` en `.env.local` pour le développement local avec `vercel dev`.
Ne jamais commiter `.env.local` (déjà exclu via `.gitignore`).
