# MediSys — consultations-service

Microservice de gestion des consultations médicales pour MediSys. Gère le cycle de vie complet d'une consultation : création (accueil), prise en charge (médecin), modification, transfert entre hôpitaux.

## Stack

- **Runtime** : Node.js
- **Framework** : Express
- **Base de données** : PostgreSQL (via `pg` Pool)
- **Auth** : JWT (via middleware)

## Démarrage

```bash
cp .env.example .env
# éditer .env avec vos identifiants
npm install
npm run dev
```

Port par défaut : `5003`

## Variables d'environnement

| Variable | Description | Défaut |
|---|---|---|
| `PORT` | Port du service | 5003 |
| `NODE_ENV` | Environnement | development |
| `DATABASE_URL` | URL de connexion PostgreSQL | — |
| `JWT_SECRET` | Clé JWT (doit correspondre au gateway) | — |

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Mode développement |
| `npm start` | Production |

## Endpoints API

Toutes les routes nécessitent un header `Authorization: Bearer <token>`.

| Méthode | Route | Description |
|---|---|---|
| GET | `/` | Liste des consultations (filtres : patientId, doctorId, doctorHospital, doctorSpecialty, statut, page, limit) |
| GET | `/:id` | Détail d'une consultation (avec interventions) |
| POST | `/register` | Créer une consultation (par l'accueil) |
| PUT | `/:id` | Modifier une consultation |
| PUT | `/:id/transfer` | Transférer une consultation vers un autre hôpital |
| DELETE | `/:id` | Supprimer une consultation |

## Filtrage par hôpital et spécialité

- Les consultations sont filtrées par `doctorHospital` (injecté depuis le JWT) pour tous les rôles sauf ADMIN
- Les médecins (`MEDECIN`) voient uniquement les consultations de leur spécialité (`doctorSpecialty`), y compris celles prises en charge via les interventions
- Le transfert crée une copie de la consultation dans l'hôpital de destination et archive l'originale (statut `transferee`)

## Structure

```
src/
├── config/
│   └── db.js              # Pool PostgreSQL + initDB (création automatique des tables)
├── controllers/
│   └── consultation.controller.js
├── middlewares/
│   ├── auth.middleware.js
│   └── errorHandler.js
├── routes/
│   └── consultation.routes.js
├── services/
│   └── consultation.service.js
└── server.js
```

## Base de données

Tables créées automatiquement au premier démarrage :

- `consultations` — informations médicales, médecin, statut, hôpital, transfert
- `consultation_interventions` — historique des actions (création, prise en charge, modification, transfert)

## Dépôts liés

| Service | Dépôt |
|---|---|
| Frontend | [Dupont-fr/IN3_project-frontend](https://github.com/Dupont-fr/IN3_project-frontend) |
| Gateway | [Dupont-fr/api-getway](https://github.com/Dupont-fr/api-getway) |
| User-service | [Dupont-fr/Hospital](https://github.com/Dupont-fr/Hospital) |
| Patient-service | [Dupont-fr/patient-service](https://github.com/Dupont-fr/patient-service) |
| Statistic-service | [Dupont-fr/Statistique-service](https://github.com/Dupont-fr/Statistique-service) |
