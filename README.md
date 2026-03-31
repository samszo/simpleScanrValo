# simpleScanrValo

Une application Web très simple pour importer des données Scanr dans Omeka S.

## Description

Cette application permet de :
- Rechercher des données dans [Scanr](https://scanr.enseignementsup-recherche.gouv.fr/) (structures de recherche, chercheurs, publications, projets)
- Sélectionner des résultats
- Les importer directement dans une instance [Omeka S](https://omeka.org/s/) via son API REST

## Technologie

L'application est développée en **TypeScript** avec [Vite](https://vite.dev/) comme outil de build.

## Installation

```bash
npm install
```

## Développement

```bash
npm run dev
```

Ouvre l'application à l'adresse http://localhost:5173

## Build

```bash
npm run build
```

Les fichiers compilés sont générés dans le dossier `dist/`.

## Utilisation

1. **Configurer Omeka S** : Renseignez l'URL de votre instance Omeka S et vos clés API dans la section "Configuration Omeka S"
2. **Rechercher** : Sélectionnez le type d'entité (structures, personnes, publications, projets) et entrez un terme de recherche
3. **Sélectionner** : Cochez les éléments à importer
4. **Importer** : Cliquez sur "Importer" pour envoyer les données dans Omeka S

## API utilisées

- **Scanr API** : `https://api.scanr.esri.fr/api/v2/` — API publique du Ministère de l'Enseignement supérieur
- **Omeka S API** : REST API de votre instance Omeka S (authentification par clé API)
