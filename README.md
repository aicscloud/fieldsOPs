# FieldOps

SaaS B2B multi-tenant de Field Service Management (MVP).

## Stack

- API: NestJS + Prisma + PostgreSQL
- Web: Next.js (manager + vue terrain PWA-ready)
- Infra locale: Docker Compose (Postgres + MinIO)

## Démarrage

```bash
docker compose up -d
npm install
npm run db:push
npm run dev:api
npm run dev:web
```

Postgres local: `localhost:5433` (évite les conflits avec un Postgres déjà sur 5432).  
MinIO optionnel: `docker compose --profile storage up -d`

- Web: http://localhost:3000
- API: http://localhost:3010/api

## Workflow MVP

1. Inscription (crée Organization + Owner)
2. Créer clients / sites / utilisateurs techniciens
3. Créer et affecter des interventions
4. Technicien: en route → start → pause → complete
5. Manager: dashboard + rapports JSON
