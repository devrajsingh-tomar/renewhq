const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL="([^"]+)"/);
const dbUrl = match ? match[1] : process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: { url: dbUrl }
  }
});

async function check() {
  console.log('--- Checking Demo Users in Neon Database ---');
  const demoAccounts = [
    { email: 'admin@renewhq.com', expectedPwd: 'admin123', expectedRole: 'SUPER_ADMIN' },
    { email: 'pixeladmin@pixelcraft.com', expectedPwd: 'pixel123', expectedRole: 'AGENCY_ADMIN' },
    { email: 'staff@pixelcraft.com', expectedPwd: 'staff123', expectedRole: 'STAFF' },
    { email: 'client1@acmax.com', expectedPwd: 'client123', expectedRole: 'CLIENT' },
  ];

  for (const acc of demoAccounts) {
    const user = await prisma.user.findUnique({
      where: { email: acc.email },
      include: { agency: true, client: true },
    });

    if (!user) {
      console.log(`[MISSING] ${acc.email}`);
      continue;
    }

    const matches = await bcrypt.compare(acc.expectedPwd, user.password);
    console.log(`[USER] ${acc.email}:`);
    console.log(`  Role: ${user.role} (matches expected: ${user.role === acc.expectedRole})`);
    console.log(`  Password matches '${acc.expectedPwd}': ${matches}`);
    console.log(`  Agency: ${user.agency?.name} (subdomain: ${user.agency?.subdomain}, status: ${user.agency?.status})`);
    console.log(`  Tenant ID: ${user.tenantId}`);
  }

  const allUsers = await prisma.user.findMany({ select: { email: true, role: true } });
  console.log(`\nTotal users in DB: ${allUsers.length}`);
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
