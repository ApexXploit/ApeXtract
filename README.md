# ApeXtract

![ApeXtract](src/assets/apexflow-logo.png)

Plateforme locale de web scraping, crawling et data intelligence développée par **ApeXploit**.

## Fonctionnalités

- extraction par sélecteurs CSS avec aperçu dynamique ;
- détection automatique et sélecteur visuel ;
- rendu JavaScript avec Chrome/Playwright ;
- pagination automatique et crawl multi-pages ;
- règles d’inclusion, d’exclusion et respect de `robots.txt` ;
- enrichissement liste vers fiches détaillées ;
- pipeline de nettoyage et transformations ;
- comparaison des changements ;
- recettes et planifications persistantes ;
- journal d’exécution, reprise des erreurs et exports CSV/JSON ;
- tutoriels intégrés.

## Installation

```bash
npm install
npm run dev
```

L’interface est disponible sur `http://localhost:5173` et l’API sur `http://localhost:4174`.

Le rendu JavaScript utilise actuellement Google Chrome installé sur macOS à l’emplacement standard.

## Production

```bash
npm run build
npm start
```

## Conformité

ApeXtract inclut une vérification optionnelle de `robots.txt`. Utilisez l’outil uniquement sur des pages et des données auxquelles vous êtes autorisé à accéder.

## Identité

Le logo associe l’identité cyber d’ApeXploit aux fonctions d’ApeXtract : les pattes mécaniques évoquent le web crawling, tandis que le globe, le document et la base de données représentent la collecte, la structuration et l’export des données.
