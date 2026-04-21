# Deploy on Railway (production MVP)

This app is a **single Node.js process**: `npm run build` then `npm start`. It listens on **`process.env.PORT`** (Railway sets this automatically). The stack is **Next.js 14 (App Router)**, **PostgreSQL** via Prisma, and **S3-compatible storage** for originals, thumbnails, and previews.

---

## 1. Prerequisites

- A [Railway](https://railway.app) account
- A Git repository with this project (or deploy from GitHub)
- An **S3-compatible bucket** (e.g. [Cloudflare R2](https://developers.cloudflare.com/r2/), AWS S3, [Supabase Storage S3 API](https://supabase.com/docs/guides/storage/s3/authentication), MinIO, etc.)

### Repo layout for Railway / Nixpacks

| File | Purpose |
|------|---------|
| `nixpacks.toml` | Pins **Node 20** (`NIXPACKS_NODE_VERSION`) for the Nixpacks builder |
| `railway.toml` | Uses **NIXPACKS** and sets **`npm run start`** as the deploy command |
| `.nvmrc` | Node **20** for local development |
| `package.json` | `prisma` is a **runtime dependency** so `prisma migrate deploy` works on `npm start` |

**Lockfile (recommended):** run `npm install` locally once and commit **`package-lock.json`**. Nixpacks will use `npm ci` when the lockfile is present for reproducible installs.

---

## 2. Create the Railway project

1. In Railway: **New project** → **Deploy from GitHub** (or empty project + connect repo).
2. Select this repository and the branch to deploy.
3. Railway will detect **Node** and run install/build/start from `package.json`.

---

## 3. Add PostgreSQL

1. In the project: **New** → **Database** → **PostgreSQL**.
2. After it provisions, open the Postgres service → **Variables**.
3. Copy **`DATABASE_URL`** (Railway often injects it into linked services automatically). If you add Postgres as a **plugin** linked to the web service, `DATABASE_URL` is usually available without manual copy.

Ensure the **web service** has `DATABASE_URL` set (reference variable or paste the connection string).

---

## 4. Object storage (S3-compatible)

Create a bucket and access keys in your provider. Then set these on the **web service**:

| Variable | Description |
|----------|-------------|
| `STORAGE_URL` | API endpoint (no trailing slash), e.g. `https://<accountid>.r2.cloudflarestorage.com` |
| `STORAGE_BUCKET` | Bucket name |
| `STORAGE_KEY` | Access key ID |
| `STORAGE_SECRET` | Secret access key |
| `STORAGE_REGION` | Optional; `auto` is fine for R2; use e.g. `us-east-1` for AWS |
| `STORAGE_FORCE_PATH_STYLE` | Optional; `true` for many MinIO setups; omit or `false` for R2 / AWS |

**Cloudflare R2:** enable the S3 API on the bucket, create an R2 API token, and use the R2 endpoint URL from the dashboard.

**AWS S3:** `STORAGE_URL` can be `https://s3.<region>.amazonaws.com` or the regional endpoint your SDK expects; set `STORAGE_REGION` and usually `STORAGE_FORCE_PATH_STYLE=false`.

---

## 5. App URL and NextAuth

On the **web service**, set:

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_URL` | Public URL of the app, e.g. `https://your-app.up.railway.app` |
| `NEXTAUTH_SECRET` | Long random string (`openssl rand -base64 32`) |

After each deploy, if the public URL changes, update `NEXTAUTH_URL`.

---

## 6. Build and start commands

Railway defaults:

- **Build:** `npm install` (or `npm ci`) then `npm run build`
- **Start:** `npm start`

This repo defines:

```json
"build": "prisma generate && next build",
"start": "prisma migrate deploy && next start"
```

- **`prisma migrate deploy`** runs on boot so the database schema stays in sync.
- The server binds to **`PORT`** automatically (`next start` reads `process.env.PORT`).

No separate “serverless” platform is required; this is a normal **Node** server.

---

## 7. Optional: seed demo data

Demo galleries require **network** (placeholder images) and valid **storage** credentials.

Run once (e.g. Railway **Shell** or local with production `DATABASE_URL`):

```bash
npx prisma db seed
```

Creates `admin@test.com` / `123456` and two sample galleries. **Do not** leave this account in production without changing the password or removing the user.

---

## 8. Verify after deploy

1. Open the Railway **public URL**.
2. Register a user or use seeded credentials (if you ran seed).
3. **Dashboard** → create a gallery → **Upload** images.
4. Open the **client gallery** link (`/gallery/<slug>`), select images, download single file and ZIP.

If uploads fail, check storage env vars and bucket CORS (if the browser loads presigned URLs directly; most R2/S3 setups work with HTTPS).

---

## 9. Custom domain

In Railway: service → **Settings** → **Networking** → add a custom domain, then set `NEXTAUTH_URL` to that HTTPS URL.

---

## Summary checklist

- [ ] `DATABASE_URL` from Railway Postgres  
- [ ] `STORAGE_URL`, `STORAGE_BUCKET`, `STORAGE_KEY`, `STORAGE_SECRET`  
- [ ] `NEXTAUTH_URL`, `NEXTAUTH_SECRET`  
- [ ] Deploy → `npm run build` / `npm start`  
- [ ] (Optional) `npx prisma db seed` for demo content  
