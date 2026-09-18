# ParcelFlow — Backend

Backend API for **ParcelFlow**, a parcel delivery / courier service (Bangladesh market — BDT currency, bKash payments). It handles merchant onboarding, rider onboarding, parcel creation and pricing, online payments and refunds, the pickup → delivery workflow, and role-based dashboard analytics.

> **API reference:** see [`API_DOC.md`](./API_DOC.md) for every endpoint, its request body, and access rules.

---

## Features

- **Authentication** — email + password with OTP email verification, Google sign-in, JWT access/refresh tokens, forgot / reset / change password.
- **Roles** — `SUPER_ADMIN`, `ADMIN`, `MERCHANT`, `RIDER`, each with its own permissions.
- **Merchants** — self-registration, profile, admin management (block / unblock).
- **Riders** — application with document upload, email verification, admin approval, profile, block / unblock.
- **Pricing rules** — per delivery zone × parcel category; charges are computed on the server and frozen onto each parcel.
- **Parcels** — creation with server-side pricing, bKash payment + refund, cancellation, invoice PDF, admin status control.
- **Assignments** — pickup / delivery legs assigned to riders, with an accept → start → complete / fail / reject workflow.
- **Dashboards** — analytics endpoints for admin, merchant, and rider, including 30-day trends.

---

## Tech stack

| Area | Technology |
| --- | --- |
| Runtime | Node.js (ESM) + TypeScript |
| Framework | Express 5 |
| Database | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`) |
| Cache / OTP | Redis |
| Auth | JWT (`jsonwebtoken`), `bcryptjs`, Google Auth Library |
| Payments | bKash (tokenized checkout) |
| Files | Cloudinary + Multer |
| Email | Nodemailer + EJS templates |
| Validation | Zod |
| Scheduling | node-cron |
| PDF | PDFKit |
| Lint / format | Biome |

---

## Project structure

```
src/
├── app.ts                 # Express app: middleware + route mounting
├── server.ts              # Bootstrap: DB + Redis connect, seeding, cron, listen
├── generated/prisma/      # Generated Prisma client (created by `prisma generate`)
└── app/
    ├── config/            # Environment config loader
    ├── lib/               # prisma, redis, bkash, cloudinary, nodemailer, cron, ...
    ├── middleware/        # auth, validateRequest, globalErrorHandler, notFound
    ├── utils/             # AppError, catchAsync, sendResponse, pricing, jwt, seed, ...
    ├── templates/         # EJS email templates
    └── modules/           # Feature modules (see below)
        ├── auth/
        ├── user/
        ├── admin/
        ├── merchant/
        ├── rider/
        ├── pricingRule/
        ├── parcel/
        ├── assignment/
        └── stats/

prisma/
├── schema/                # Split schema files (user, parcel, assignment, ...)
└── migrations/            # SQL migrations
```

**Module pattern.** Every feature module follows the same layout, which makes the codebase easy to navigate:

```
<module>.route.ts        # Express routes + auth + validation wiring
<module>.controller.ts   # Reads the request, calls the service, sends the response
<module>.service.ts      # Business logic + database access
<module>.validation.ts   # Zod request schemas
<module>.interface.ts    # TypeScript payload types
<module>.constants.ts    # (where needed) enums / lookup maps
```

---

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Redis instance
- Accounts / credentials for bKash, Cloudinary, an SMTP provider, and Google OAuth (for the features that use them)

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy the example file and fill in every value (see [Environment variables](#environment-variables)):

```bash
cp .env.example .env
```

### 3. Set up the database

Run migrations (this also generates the Prisma client):

```bash
npx prisma migrate dev
```

> Already have the schema and just need types? Run `npx prisma generate`.

### 4. Run

```bash
npm run dev
```

The server starts on `PORT` (default `5000`). On boot it connects to PostgreSQL and Redis, **seeds the super-admin / tester accounts** (from env), and starts the background cron jobs.

Health check: `GET http://localhost:5000/` → welcome message.

---

## Environment variables

| Variable | Description |
| --- | --- |
| `NODE_ENV` | `development` or `production` (controls error verbosity) |
| `PORT` | HTTP port (e.g. `5000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `APP_URL` | This backend's public base URL |
| `FRONTEND_URL` | Allowed CORS origin + payment redirect target |
| `BCRYPT_SALT_ROUNDS` | bcrypt cost factor (e.g. `10`) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing secrets |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Token lifetimes (e.g. `1d`, `7d`) |
| `SUPER_ADMIN_NAME` / `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` | Seeded super-admin |
| `TESTER_ADMIN_NAME` / `TESTER_ADMIN_EMAIL` / `TESTER_ADMIN_PASSWORD` | Seeded tester admin |
| `TESTER_RIDER_NAME` / `TESTER_RIDER_EMAIL` / `TESTER_RIDER_PASSWORD` | Seeded tester rider |
| `REDIS_USER` / `REDIS_PASSWORD` / `REDIS_HOST` / `REDIS_PORT` | Redis connection |
| `SMTP_USER` / `SMTP_PASSWORD` / `EMAIL_SENDER` | Email sending |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary |
| `BKASH_BASE_URL` / `BKASH_USERNAME` / `BKASH_PASSWORD` / `BKASH_APP_KEY` / `BKASH_APP_SECRET` / `BKASH_CALLBACK_URL` | bKash tokenized checkout |

---

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start in watch mode (tsx) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm run lint:check` / `lint:fix` | Lint with Biome |
| `npm run format:check` / `format:fix` | Format with Biome |

Common Prisma commands:

| Command | Purpose |
| --- | --- |
| `npx prisma migrate dev` | Create + apply a migration and regenerate the client (local) |
| `npx prisma migrate deploy` | Apply migrations (production) |
| `npx prisma generate` | Regenerate the client from the schema |
| `npx prisma studio` | Browse the database in a GUI |

---

## How it works

**Authentication.** Login / verification returns a JWT **access token** and **refresh token**, sent both in the JSON body and as `httpOnly` cookies. Protected routes accept the token from the `accessToken` cookie **or** an `Authorization: Bearer <token>` header. Each request is re-checked against the database, so blocked or deleted users are rejected immediately.

**Validation & errors.** Request bodies are validated by Zod (`validateRequest` middleware). All responses share one envelope, and errors are normalized by a global error handler (Prisma errors, validation errors, and app errors are mapped to clean messages and status codes).

**Standard response shape:**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "…",
  "data": { },
  "meta": { "page": 1, "limit": 10, "total": 0, "totalPages": 0 }
}
```

`meta` is present only on paginated list endpoints.

**Parcel lifecycle.**

```
CREATED → PICKUP_ASSIGNED → PICKED_UP → AT_HUB → OUT_FOR_DELIVERY → DELIVERED
                                                        └→ DELIVERY_FAILED → (re-attempt) or RETURNED_TO_MERCHANT
(any pre-pickup state) → CANCELLED
```

Riders drive the pickup and delivery legs through assignments; admins manage hub transitions and cancellations. Pricing is always computed on the server from the active pricing rule and frozen onto the parcel — amounts are never taken from the client.

**Background jobs (cron).** Unverified rider applications and old rejected rider applications are cleaned up automatically; a daily job can purge old soft-deleted parcels.

---

## API documentation

Full endpoint reference — paths, methods, access roles, and request bodies — is in **[`API_DOC.md`](./API_DOC.md)**.

Base path for all endpoints: **`/api/v1`**.
