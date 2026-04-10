# Workspace

## Overview

Enterprise-grade Donation Management Platform — a production-ready audit system for religious/social events with RBAC, QR fraud prevention, real-time analytics, and full audit logs.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind + shadcn/ui + framer-motion + recharts

## Artifacts

### donation-platform (web, preview: /)
Full-stack Donation Management Platform with:
- Public Dashboard (live stats, recent donations feed, auto-refresh every 30s)
- Collector Panel (add donations, view receipts)
- Admin Panel (analytics, charts, user management, audit logs)
- QR Verification page (/verify/:id — hash-based tamper detection)
- Login page with role-based access (super_admin, admin, collector, public)

### api-server (API, preview: /api)
Express 5 REST API with:
- Auth routes: /api/auth/login, /api/auth/logout, /api/auth/me
- Donations CRUD: /api/donations + /api/donations/:id/verify
- Users CRUD: /api/users
- Analytics: /api/analytics/summary|daily|top-collectors|amount-distribution
- Audit logs: /api/audit-logs

## Database Schema

- **users** — id, name, mobile (unique), role, is_active, timestamps
- **donations** — id, donation_id (unique), name, mobile, amount, purpose, collector_id (FK), hash, timestamps
- **audit_logs** — id, user_id (FK), action, details, ip_address, created_at

## Security

- SHA-256 HMAC hash on every donation (donationId + amount + SECRET_KEY)
- QR verification: hash recalculated server-side, mismatch = "Tampered" alert
- RBAC: super_admin > admin > collector > public
- Audit log on every critical action (login, donation create/delete, user create/update/delete)
- IP tracking on all audit logs

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/donation-platform run dev` — run frontend locally

## Roles

| Role        | Access                        |
|-------------|-------------------------------|
| super_admin | Full control                  |
| admin       | View + manage + analytics     |
| collector   | Entry + view receipts         |
| public      | Read-only public dashboard    |

## Login (Demo Credentials)

Use any mobile number. Role is selected on login screen. Pre-seeded users:
- 9876543210 (super_admin - Ramesh Sharma)
- 9876543211 (admin - Suresh Patel)
- 9876543212 (collector - Collector Mohan)
- 9876543213 (collector - Collector Priya)
- 9876543214 (collector - Collector Ravi)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
