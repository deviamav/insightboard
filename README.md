# InsightBoard

![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-App%20Router-black?logo=nextdotjs)
![Recharts](https://img.shields.io/badge/Recharts-charts-orange)
![License](https://img.shields.io/badge/license-MIT-green)

**Product analytics dashboard** for exploring KPI layouts, filters, and team views — powered by **synthetic sample data** only.

> This is a UI / architecture demo. Numbers are generated or imported as samples. It is **not** a tool for fabricating real business statistics.

## Why reviewers care

- Polished **dashboard UX** (periods, regions, charts, tables)
- Auth + roles + session handling on **Prisma / PostgreSQL**
- i18n-ready message catalogs
- Clear “sample data” positioning for ethical portfolio use

## Features

- Multi-role dashboard with period filters and regional breakdowns
- Charts (Recharts) and import history for sample metrics
- Campaign / landing preview tools (ZIP) for UI exploration
- JWT auth, user admin, theming
- Optional Docker / Caddy self-host scripts (`example.com` placeholders)

## Stack

`Next.js` · `TypeScript` · `Prisma` · `PostgreSQL` · `Tailwind` · `next-intl` · `Recharts` · `Zod`

## Quick start

```bash
cp .env.example .env
# DATABASE_URL, ADMIN_SECRET (32+), ADMIN_USERNAME / ADMIN_PASSWORD

docker compose up -d
npm install
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000 — bootstrap admin comes from `.env` on first run.

## Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL |
| `ADMIN_SECRET` | JWT signing secret |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | First admin when DB is empty |
| `NEXT_PUBLIC_APP_URL` | App URL |

## License

MIT — portfolio / demonstration use. Synthetic data only.
