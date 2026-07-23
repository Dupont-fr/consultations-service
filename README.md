# MediSys — consultations-service

Microservice de gestion des consultations médicales, examens et notifications pour MediSys. Gère le cycle de vie complet d'une consultation : création (accueil), prise en charge (médecin), modification, transfert entre hôpitaux, et examens associés.

## Stack

- **Runtime** : Node.js
- **Framework** : Express
- **Base de données** : PostgreSQL (via `pg` Pool)
- **Auth** : JWT (via middleware) + X-Internal-Key (appels inter-services)
- **WebSocket** : Socket.IO (notifications temps réel)
- **Chiffrement** : AES-256-GCM (données sensibles)

## Démarrage

```bash
cp .env.example .env
# éditer .env avec vos identifiants
npm install
npm run dev
```

Port par défaut : `5003` (HTTP) / `3003` (WebSocket)

## Variables d'environnement

| Variable | Description | Défaut |
|---|---|---|
| `PORT` | Port du service | 5003 |
| `NODE_ENV` | Environnement | development |
| `DATABASE_URL` | URL de connexion PostgreSQL | — |
| `JWT_SECRET` | Clé JWT (doit correspondre au gateway) | — |
| `CORS_ORIGIN` | Origines CORS (comma-separated) | `http://localhost:5173` |
| `INTERNAL_API_KEY` | Clé pour appels inter-services | — |
| `ENCRYPTION_KEY` | Clé hex 64 chars pour AES-256-GCM | — |
| `SOCKET_PORT` | Port WebSocket | 3003 |

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Mode développement |
| `npm start` | Production |
| `node scripts/encrypt-existing.js` | Chiffrer les données existantes |

## Endpoints API

### Consultations (JWT requis)

| Méthode | Route | Description |
|---|---|---|
| GET | `/` | Liste des consultations (filtres : patientId, doctorId, doctorHospital, doctorSpecialty, statut, page, limit) |
| GET | `/:id` | Détail d'une consultation (avec interventions et examens) |
| POST | `/register` | Créer une consultation (par l'accueil) — max 1/patient/service/hôpital/jour |
| PUT | `/:id` | Modifier une consultation |
| PUT | `/:id/transfer` | Transférer vers un autre hôpital |
| DELETE | `/:id` | Supprimer une consultation |

### Examens (JWT requis)

| Méthode | Route | Description |
|---|---|---|
| GET | `/examen/:consultationId` | Liste des examens d'une consultation |
| POST | `/examen` | Créer un examen (notif WebSocket + DB) |
| PUT | `/examen/:id` | Modifier un examen |
| PUT | `/examen/:id/status` | Changer le statut d'un examen |
| DELETE | `/examen/:id` | Supprimer un examen |

### Notifications (JWT ou X-Internal-Key)

| Méthode | Route | Description |
|---|---|---|
| GET | `/notifications` | Liste des notifications (filtres : hospital, user_id, type, unread) |
| GET | `/notifications/unread-count` | Nombre de notifications non lues |
| POST | `/notifications` | Créer une notification (appels inter-services) |
| PUT | `/notifications/read-all` | Marquer toutes comme lues |
| PUT | `/notifications/:id/read` | Marquer une notification comme lue |

## Contrainte métier

- **Maximum 1 consultation** par patient, par service, par hôpital, par jour
- Violation = erreur 409 Conflict

## Filtrage par hôpital

- Les consultations sont filtrées par `doctorHospital` (injecté depuis le JWT) pour tous les rôles sauf ADMIN
- Les médecins (`MEDECIN`) voient uniquement les consultations de leur spécialité
- Le transfert crée une copie dans l'hôpital de destination et archive l'originale (statut `transferee`)

## WebSocket

Le serveur Socket.IO tourne sur le port `3003` et émet :
- `examen:new` — quand un nouvel examen est créé
- `notification:new` — quand une notification est créée

Le client se connecte via `VITE_SOCKET_URL` côté frontend.

## Structure

```
src/
├── config/
│   └── db.js              # Pool PostgreSQL + initDB (consultations, examens, notifications, interventions)
├── controllers/
│   ├── consultation.controller.js
│   ├── examen.controller.js
│   └── notification.controller.js
├── middlewares/
│   ├── auth.middleware.js   # JWT + X-Internal-Key
│   └── errorHandler.js
├── routes/
│   ├── consultation.routes.js
│   ├── examen.routes.js
│   └── notification.routes.js
├── services/
│   ├── consultation.service.js
│   ├── examen.service.js
│   └── notification.service.js
├── scripts/
│   └── encrypt-existing.js  # Chiffrement des données existantes
└── server.js
```

## Base de données

Tables créées automatiquement au premier démarrage :

- `consultations` — informations médicales, médecin, statut, hôpital, transfert
- `consultation_interventions` — historique des actions (création, prise en charge, modification, transfert)
- `examens` — examens liés aux consultations (type, description, statut, résultats)
- `notifications` — notifications stockées (hospital, user_id, type, title, message, link, read)

## Dépôts liés

| Service | Dépôt |
|---|---|
| Frontend | [Dupont-fr/IN3_project-frontend](https://github.com/Dupont-fr/IN3_project-frontend) |
| Gateway | [Dupont-fr/api-getway](https://github.com/Dupont-fr/api-getway) |
| User-service | [Dupont-fr/Hospital](https://github.com/Dupont-fr/Hospital) |
| Patient-service | [Dupont-fr/patient-service](https://github.com/Dupont-fr/patient-service) |
| Statistic-service | [Dupont-fr/Statistique-service](https://github.com/Dupont-fr/Statistique-service) |
