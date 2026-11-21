# InsightBoard

> **CV theme:** Internal Business Dashboard (synthetic / demo data)  
> **Repo:** [deviamav/insightboard](https://github.com/deviamav/insightboard)

**InsightBoard** is a **demo / portfolio** application: a synthetic analytics and funnel toolkit for product and operations teams. All metrics, leads, and conversion figures are **sample or generated data** for dashboard UX exploration — not tooling for misrepresenting real statistics.

## What it demonstrates

- Multi-role dashboard (admin / team views) with period filters and geo breakdowns
- Synthetic statistics entry, import history, and charting (Recharts)
- Campaign **offers** and **funnels** (ZIP landing previews, quiz PDF export)
- User management, session control, JWT auth, Prisma + PostgreSQL
- Theming and i18n (EN/RU message bundles)
- Docker-based production deploy script with Caddy + TLS (optional; for self-hosted demos)

## Stack

- **Next.js** (App Router) · **React** · **TypeScript**
- **Prisma** · **PostgreSQL**
- **Tailwind CSS** · **next-intl** · **Recharts** · **Zod**

## Local development

```bash
cp .env.example .env
# Set DATABASE_URL, ADMIN_SECRET (32+ chars), ADMIN_USERNAME / ADMIN_PASSWORD

docker compose up -d   # Postgres only, or use your own DB
npm install
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Default admin comes from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `.env` on first deploy.

## Environment

See `.env.example` — placeholders only. **Never commit real `.env` files.**

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_SECRET` | JWT signing secret (not the login password) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Bootstrap admin when the users table is empty |
| `NEXT_PUBLIC_APP_URL` | Public URL (local or production) |

## Production (optional)

On Ubuntu 22.04+, from this directory:

```bash
sudo DOMAIN=insightboard.example.com ACME_EMAIL=ops@example.com bash deploy.sh
```

Or use `docker compose -f docker-compose.prod.yml` with `.env` generated from `.env.production.example`.

## License

Portfolio / demonstration use.