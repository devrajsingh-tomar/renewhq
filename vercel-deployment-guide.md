# RenewHQ Vercel Deployment Guide

RenewHQ is architected to run entirely on Vercel serverless containers, leveraging Neon PostgreSQL, Upstash Redis, and Vercel Cron Jobs. Follow these steps to deploy RenewHQ to production:

---

## 1. Prerequisites & Services

You will need accounts on the following free-tier friendly services:
1. **Vercel** (for Next.js deployment and Vercel Crons)
2. **Neon DB** (Vercel-optimized Serverless PostgreSQL)
3. **Upstash** (Vercel-compatible Redis for rate-limiting or task logs)
4. **Resend** (Serverless email dispatch API)

---

## 2. Setting Up Neon PostgreSQL
1. Sign in to [Neon](https://neon.tech) and create a new project.
2. Select PostgreSQL 15, name your database `renewhq`, and copy the serverless connection string:
   `postgresql://[user]:[password]@[host]/renewhq?sslmode=require`
3. Save this value as your **`DATABASE_URL`**.

---

## 3. Setting Up Upstash Redis
1. Sign in to [Upstash](https://upstash.com) and create a new Redis database.
2. Under details, copy the URL and password, or use the connection string.
3. Save this value as your **`REDIS_URL`**.

---

## 4. Environment Variables Configuration

Configure the following environment variables inside the Vercel dashboard:

| Variable | Description | Example Value |
| --- | --- | --- |
| `DATABASE_URL` | Neon Serverless connection link | `postgresql://...` |
| `JWT_SECRET` | Custom security seed string | `your-high-entropy-jwt-secret-string` |
| `NEXT_PUBLIC_APP_URL` | Base canonical production URL | `https://renewhq.com` |
| `NEXT_PUBLIC_DEFAULT_WHATSAPP_NUMBER` | Target number for manual renewals | `919999999999` (with country code) |
| `REDIS_URL` | Upstash Redis connection url | `redis://...` |

---

## 5. Vercel Deployment Flow

### Option A: One-Click Deploy via GitHub
1. Create a new GitHub repository and push your local workspace files.
2. Go to your **Vercel Dashboard** and click **Add New > Project**.
3. Import your GitHub repository.
4. Expand **Environment Variables** and insert the keys listed in Section 4.
5. Click **Deploy**. Vercel will build, optimize, and launch your serverless app.

### Option B: Deploying via Vercel CLI
If you have Vercel CLI installed:
```bash
# Link project and deploy in one command
vercel --prod
```

---

## 6. Verification & Automated Cron Jobs
* **Vercel Cron Setup**: Once deployed, Vercel will automatically parse the `vercel.json` file and register a daily cron task scheduled to execute `/api/cron/reminders` at midnight.
* **Manual Verification**: You can verify that the cron operates by hitting the endpoint `/api/cron/reminders` from your browser or calling a curl script.
