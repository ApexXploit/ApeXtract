# ApeXtract

<p align="center">
  <img src="src/assets/apexflow-logo.png" alt="Logo ApeXtract" width="300">
</p>

Plateforme locale de web scraping, crawling et data intelligence. ApeXtract
réunit détection automatique, extraction multi-pages, rendu JavaScript,
nettoyage et export des données dans une même application.

## Identité du projet

<table>
  <tr>
    <th>Logo de l'application</th>
    <th>Logo de l'auteur</th>
  </tr>
  <tr>
    <td align="center"><img src="src/assets/apexflow-logo.png" alt="ApeXtract" width="260"></td>
    <td align="center"><img src="src/assets/apexploit-author-logo.png" alt="ApeXploit" width="260"></td>
  </tr>
  <tr>
    <td align="center"><strong>ApeXtract</strong></td>
    <td align="center"><strong>ApeXploit</strong><br><a href="https://github.com/ApexXploit">@ApexXploit</a></td>
  </tr>
</table>

Le logo de l’application associe l’univers cybernétique vert d’ApeXploit aux
fonctions d’ApeXtract. Les pattes mécaniques évoquent le web crawling, tandis
que le globe, le document et la base de données représentent la collecte, la
structuration et l’export des données.

## Fonctionnalités

- extraction par sélecteurs CSS avec aperçu dynamique ;
- détection automatique et sélecteur visuel ;
- rendu JavaScript avec Chrome et Playwright ;
- pagination automatique et crawl multi-pages ;
- règles d’inclusion, d’exclusion et vérification de `robots.txt` ;
- enrichissement des listes depuis les fiches détaillées ;
- pipeline de nettoyage et transformations ;
- comparaison des changements entre deux extractions ;
- recettes et planifications persistantes ;
- journal d’exécution, reprise des erreurs et exports CSV/JSON ;
- tutoriels intégrés.

## Développement

```sh
npm install
npm run dev
```

L’interface est disponible sur `http://localhost:5173` et l’API sur
`http://localhost:4174`. Le rendu JavaScript utilise Google Chrome installé à
l’emplacement standard de macOS.

## Production

```sh
npm run build
npm start
```

## Conformité

ApeXtract inclut une vérification optionnelle de `robots.txt`. Utilisez l’outil
uniquement sur des pages et des données auxquelles vous êtes autorisé à accéder.

## Auteur

Créé par **ApeXploit** — [ApexXploit](https://github.com/ApexXploit).

## Vérifications

```sh
npm run build
```
