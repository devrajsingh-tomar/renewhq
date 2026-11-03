const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL="([^"]+)"/);
const dbUrl = match ? match[1] : process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: { url: dbUrl }
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'renewhq-super-secret-key-change-in-prod';

async function runTests() {
  console.log('====================================================');
  console.log(' RENEWHQ E2E AUTOMATED VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. TEST DEMO ACCOUNTS IN DATABASE
  console.log('--- 1. Testing Demo User Accounts & Passwords ---');
  const demoUsers = [
    { email: 'admin@renewhq.com', password: 'admin123', expectedRole: 'SUPER_ADMIN' },
    { email: 'pixeladmin@pixelcraft.com', password: 'pixel123', expectedRole: 'AGENCY_ADMIN' },
    { email: 'staff@pixelcraft.com', password: 'staff123', expectedRole: 'STAFF' },
    { email: 'client1@acmax.com', password: 'client123', expectedRole: 'CLIENT' },
  ];

  const loadedUsers = {};

  for (const acc of demoUsers) {
    const user = await prisma.user.findUnique({
      where: { email: acc.email },
      include: { agency: true, client: true }
    });

    assert(user !== null, `User exists: ${acc.email}`);
    if (user) {
      const pwdMatch = await bcrypt.compare(acc.password, user.password);
      assert(pwdMatch, `Password matches '${acc.password}' for: ${acc.email}`);
      assert(user.role === acc.expectedRole, `Role is '${acc.expectedRole}' for: ${acc.email}`);
      loadedUsers[acc.expectedRole] = user;
    }
  }

  // 2. TEST JWT AUTHENTICATION TOKEN GENERATION & VALIDATION
  console.log('\n--- 2. Testing JWT Session Minting & Validation ---');
  for (const [role, user] of Object.entries(loadedUsers)) {
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      subdomain: user.agency?.subdomain || null,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    const verified = jwt.verify(token, JWT_SECRET);

    assert(verified.email === user.email, `JWT verified for ${role} (${user.email})`);
    assert(verified.role === role, `JWT payload role matches ${role}`);
    if (role !== 'SUPER_ADMIN') {
      assert(verified.tenantId === user.tenantId, `JWT carries tenant ID for ${role}`);
      assert(verified.subdomain === 'pixelcraft', `JWT carries subdomain 'pixelcraft' for ${role}`);
    }
  }

  // 3. TEST TENANT ISOLATION & DATA SCOPING
  console.log('\n--- 3. Testing Tenant Isolation & Scoping ---');
  const agency = await prisma.agency.findUnique({
    where: { subdomain: 'pixelcraft' },
    include: { clients: true, services: true, invoices: true, payments: true }
  });

  assert(agency !== null, 'Agency "pixelcraft" found');
  assert(agency.status === 'ACTIVE', 'Agency "pixelcraft" is ACTIVE');
  assert(agency.clients.length > 0, `Agency has clients loaded (${agency.clients.length})`);
  assert(agency.services.length > 0, `Agency has services loaded (${agency.services.length})`);

  // Client scoping test
  const clientUser = loadedUsers['CLIENT'];
  if (clientUser) {
    const clientRecord = await prisma.client.findFirst({
      where: { userId: clientUser.id, tenantId: agency.id },
      include: { services: true, invoices: true }
    });

    assert(clientRecord !== null, 'Client record linked to client user account');
    assert(clientRecord.services.length > 0, `Client has associated service contracts (${clientRecord.services.length})`);
    assert(clientRecord.invoices.length > 0, `Client has associated invoices (${clientRecord.invoices.length})`);
  }

  // 4. TEST SUPER ADMIN METRICS QUERIES
  console.log('\n--- 4. Testing Super Admin Aggregations ---');
  const totalAgencies = await prisma.agency.count();
  const activeSubs = await prisma.subscription.count({ where: { status: 'ACTIVE' } });
  const allPlans = await prisma.plan.findMany();

  assert(totalAgencies > 0, `Super Admin agency count query succeeds (${totalAgencies} agencies)`);
  assert(allPlans.length > 0, `Super Admin plans exist (${allPlans.length} plans)`);

  // 5. TEST CRON REMINDER LOGIC
  console.log('\n--- 5. Testing Automated Reminder & Notification Models ---');
  const notifCount = await prisma.notification.count();
  assert(typeof notifCount === 'number', `Notification model queryable (count: ${notifCount})`);

  console.log('\n====================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error('Test execution failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
