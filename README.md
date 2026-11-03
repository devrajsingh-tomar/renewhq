# RenewHQ - Multi-Tenant SaaS Billing & Renewal Manager

RenewHQ is a production-ready, full-stack multi-tenant SaaS application built for web agencies to manage client services, hosting contracts, domains, SSL renewals, AMC agreements, and manual billing workflows.

---

## Technical Stack
* **Frontend**: Next.js (App Router, dynamic layouts), TypeScript, Tailwind CSS, Lucide Icons, Recharts (premium charts), and dynamic white-labeled CSS themes.
* **Backend**: Next.js REST API routes, custom JWT authentication using secure HttpOnly cookies, and tenant-scoped query filters.
* **Database**: Prisma ORM, PostgreSQL.
* **Automation**: Built-in visual simulation scheduler engine to process alerts (30d, 15d, 7d, 1d, and Overdue) and trigger date extensions automatically.
* **Packaging**: Production-ready Dockerfile and `docker-compose.yml` defining PostgreSQL and Redis services.

---

## Getting Started (Local Development Setup)

Follow these quick commands to spin up RenewHQ on your machine:

### 1. Spin up Databases via Docker
Run the following command to start PostgreSQL 15 and Redis:
```bash
docker compose up -d postgres redis
```

### 2. Apply Database Schema
Push the schema to your PostgreSQL database instance using Prisma:
```bash
npx prisma db push
```

### 3. Run Data Seed
Populate default SaaS plans, super admins, demo agencies, clients, unpaid invoices, and mock payments:
```bash
npm run db:seed
```

### 4. Run Development Server
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the marketing page and agency registration form.

---

## Local Subdomain Resolution & Testing Guide

RenewHQ uses standard multi-tenant subdomain resolution. In modern browsers, `*.localhost` automatically routes to `127.0.0.1`. This means you can test subdomains locally without editing your hosts file!

* **Marketing Landing Page & Sign Up**: [http://localhost:3000](http://localhost:3000)
* **Super Admin Console**: [http://localhost:3000/super-admin](http://localhost:3000/super-admin)
* **Demo Agency Portal (Pixelcraft Studios)**: [http://pixelcraft.localhost:3000/login](http://pixelcraft.localhost:3000/login)

---

## Demo Accounts Credentials

You can use these pre-seeded accounts to explore all user roles out of the box:

### 1. Platform Super Admin (Main Domain)
* **URL**: [http://localhost:3000/super-admin](http://localhost:3000/super-admin)
* **Email**: `admin@renewhq.com`
* **Password**: `admin123`
* **Features**: View MRR cash flows, monitor trial limits, block or approve agency subdomains.

### 2. Agency Admin (Demo Subdomain)
* **URL**: [http://pixelcraft.localhost:3000/login](http://pixelcraft.localhost:3000/login)
* **Email**: `pixeladmin@pixelcraft.com`
* **Password**: `pixel123`
* **Features**: View client counts, configure custom renewal categories, verify pending manual payments (UPI screenshots/reference IDs), trigger automated reminders, custom primary HEX branding.

### 3. Agency Client (Demo Subdomain Portal)
* **URL**: [http://pixelcraft.localhost:3050/login](http://pixelcraft.localhost:3000/login) (Log in with client credentials)
* **Email**: `client1@acmax.com`
* **Password**: `client123`
* **Features**: View active contracts and due dates, click "Pay & Renew Now" to view the UPI QR code, input transaction references, and trigger a pre-populated WhatsApp confirmation redirect link.
