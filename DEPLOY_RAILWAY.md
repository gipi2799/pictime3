# Deploy on Railway (production MVP)

This app is a **single Node.js process**: `npm run build` then `npm start`. It listens on **`process.env.PORT`** (Railway sets this automatically). The stack is **Next.js 14 (App Router)**, **PostgreSQL** via Prisma, and **local file storage** for uploads in `public/uploads/`.

---

## 1. Prerequisites

- A [Railway](https://railway.app) account
- A Git repository with this project (or deploy from GitHub)

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

## 4. Storage

This MVP uses **local file storage** in `public/uploads/`.

No S3-compatible bucket is required for the MVP. Uploaded images, thumbnails, and previews are stored locally on the server file system.

If you later want S3, add `STORAGE_URL`, `STORAGE_BUCKET`, `STORAGE_KEY`, and `STORAGE_SECRET`, and update `src/lib/storage.ts` accordingly.

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

If uploads fail, check your Railway logs and ensure the app can write to `public/uploads/` in the deployed environment.

---

## 9. Custom domain

In Railway: service → **Settings** → **Networking** → add a custom domain, then set `NEXTAUTH_URL` to that HTTPS URL.

---

## Summary checklist

- [ ] `DATABASE_URL` from Railway Postgres  
- [ ] `NEXTAUTH_URL`, `NEXTAUTH_SECRET`  
- [ ] Deploy → `npm run build` / `npm start`  
- [ ] (Optional) `npx prisma db seed` for demo content  
