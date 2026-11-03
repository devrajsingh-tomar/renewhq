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

async function main() {
  const pixelcraft = await prisma.agency.findUnique({
    where: { subdomain: 'pixelcraft' }
  });

  if (!pixelcraft) {
    throw new Error('Pixelcraft agency not found');
  }

  const hashedPassword = await bcrypt.hash('suspended123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'suspended@pixelcraft.com' },
    update: {
      password: hashedPassword,
      status: 'SUSPENDED',
      role: 'STAFF',
      tenantId: pixelcraft.id
    },
    create: {
      name: 'Suspended Staff',
      email: 'suspended@pixelcraft.com',
      password: hashedPassword,
      role: 'STAFF',
      status: 'SUSPENDED',
      tenantId: pixelcraft.id
    }
  });

  console.log(`[OK] Suspended test user configured: ${user.email} (Status: ${user.status})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
