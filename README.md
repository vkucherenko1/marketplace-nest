# High-load Marketplace

TypeScript monorepo for a local marketplace preview.

## Stack

- React, Vite, Tailwind CSS
- NestJS services and API gateway
- PostgreSQL, Redis, NATS JetStream, Meilisearch, MinIO
- npm workspaces

## Quick start

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Open:

- Storefront: http://localhost:3000
- API: http://localhost:8080/api/v1
- MinIO console: http://localhost:9001
- Meilisearch: http://localhost:7700

Demo users use the password `Marketplace123!`:

- `admin@market.local`
- `moderator@market.local`
- `buyer@market.local`
- `seller1@market.local`

## Local development

```powershell
npm install
npm run dev
```

See [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) and [TASKS.md](TASKS.md).
