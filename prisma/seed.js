const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  try {
    await prisma.activityLog.deleteMany({});
    await prisma.supportTicket.deleteMany({});
    await prisma.reminder.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.service.deleteMany({});
    await prisma.serviceCategory.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.agency.deleteMany({});
    await prisma.plan.deleteMany({});
  } catch (err) {
    console.log('Database tables already empty or not yet created.');
  }

  console.log('Creating plans...');
  const freePlan = await prisma.plan.create({
    data: {
      name: 'Free',
      clientLimit: 5,
      storageLimit: 100,
      reminderLimit: 50,
      staffLimit: 1,
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: JSON.stringify(['5 Clients', '100MB Storage', 'Basic Reminders', '1 Staff User']),
    },
  });

  const starterPlan = await prisma.plan.create({
    data: {
      name: 'Starter',
      clientLimit: 25,
      storageLimit: 1024,
      reminderLimit: 500,
      staffLimit: 3,
      monthlyPrice: 1499,
      yearlyPrice: 14990,
      features: JSON.stringify(['25 Clients', '1GB Storage', 'WhatsApp Redirect Link', '3 Staff Accounts']),
    },
  });

  const professionalPlan = await prisma.plan.create({
    data: {
      name: 'Professional',
      clientLimit: 100,
      storageLimit: 5120,
      reminderLimit: 2000,
      staffLimit: 10,
      monthlyPrice: 3499,
      yearlyPrice: 34990,
      features: JSON.stringify(['100 Clients', '5GB Storage', 'Advanced Reminders', '10 Staff Accounts', 'White-Label Branding']),
    },
  });

  const enterprisePlan = await prisma.plan.create({
    data: {
      name: 'Enterprise',
      clientLimit: 1000,
      storageLimit: 51200,
      reminderLimit: 10000,
      staffLimit: 100,
      monthlyPrice: 9999,
      yearlyPrice: 99990,
      features: JSON.stringify(['Unlimited Clients', '50GB Storage', 'Custom Domain Support', 'Priority Support', 'Full White-Label']),
    },
  });

  console.log('Creating users...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // 1. Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      name: 'RenewHQ Super Admin',
      email: 'admin@renewhq.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
  });

  // 2. Demo Agency
  console.log('Creating Demo Agency...');
  const pixelcraft = await prisma.agency.create({
    data: {
      name: 'Pixelcraft Studios',
      subdomain: 'pixelcraft',
      logoUrl: '',
      primaryColor: '#4F46E5', // Indigo
      planId: professionalPlan.id,
      status: 'ACTIVE',
    },
  });

  // 3. Demo Agency Subscription
  await prisma.subscription.create({
    data: {
      agencyId: pixelcraft.id,
      planId: professionalPlan.id,
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    },
  });

  // 4. Demo Agency Admin User
  const pixelAdminPassword = await bcrypt.hash('pixel123', 10);
  const pixelAdmin = await prisma.user.create({
    data: {
      name: 'Alex Carter',
      email: 'pixeladmin@pixelcraft.com',
      password: pixelAdminPassword,
      role: 'AGENCY_ADMIN',
      tenantId: pixelcraft.id,
    },
  });

  // 5. Demo Agency Staff User
  const pixelStaffPassword = await bcrypt.hash('staff123', 10);
  const pixelStaff = await prisma.user.create({
    data: {
      name: 'Sarah Connor',
      email: 'staff@pixelcraft.com',
      password: pixelStaffPassword,
      role: 'STAFF',
      tenantId: pixelcraft.id,
    },
  });

  // 6. Service Categories
  console.log('Creating Service Categories...');
  const catHosting = await prisma.serviceCategory.create({ data: { name: 'Hosting', tenantId: pixelcraft.id } });
  const catDomain = await prisma.serviceCategory.create({ data: { name: 'Domain Renewal', tenantId: pixelcraft.id } });
  const catSSL = await prisma.serviceCategory.create({ data: { name: 'SSL Certificate', tenantId: pixelcraft.id } });
  const catWorkspace = await prisma.serviceCategory.create({ data: { name: 'Google Workspace', tenantId: pixelcraft.id } });
  const catAMC = await prisma.serviceCategory.create({ data: { name: 'Annual Maintenance Contract', tenantId: pixelcraft.id } });

  // 7. Clients
  console.log('Creating Clients...');
  const client1Password = await bcrypt.hash('client123', 10);
  const clientUser1 = await prisma.user.create({
    data: {
      name: 'John Doe (Acmax)',
      email: 'client1@acmax.com',
      password: client1Password,
      role: 'CLIENT',
      tenantId: pixelcraft.id,
    },
  });

  const client1 = await prisma.client.create({
    data: {
      name: 'John Doe',
      email: 'client1@acmax.com',
      phone: '9876543210',
      companyName: 'Acmax Corp',
      address: 'Tech Park, Block B, Bangalore, India',
      tenantId: pixelcraft.id,
      userId: clientUser1.id,
    },
  });

  const client2Password = await bcrypt.hash('client223', 10);
  const clientUser2 = await prisma.user.create({
    data: {
      name: 'Jane Smith (Beta)',
      email: 'client2@betasol.com',
      password: client2Password,
      role: 'CLIENT',
      tenantId: pixelcraft.id,
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: 'Jane Smith',
      email: 'client2@betasol.com',
      phone: '9998887776',
      companyName: 'Beta Solutions',
      address: 'Ring Road, Sector 5, Pune, India',
      tenantId: pixelcraft.id,
      userId: clientUser2.id,
    },
  });

  // 8. Services
  console.log('Creating Services...');
  
  // Service A: Active, Paid
  const serviceA = await prisma.service.create({
    data: {
      name: 'Google Workspace - 10 Users',
      description: 'Business Starter subscription for 10 email ids.',
      amount: 4800,
      billingCycle: 'YEARLY',
      startDate: new Date(Date.now() - 350 * 24 * 60 * 60 * 1000), 
      expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),  
      status: 'ACTIVE',
      paymentStatus: 'PAID',
      clientId: client1.id,
      tenantId: pixelcraft.id,
      categoryId: catWorkspace.id,
    },
  });

  // Service B: Active, Unpaid (due soon)
  const serviceB = await prisma.service.create({
    data: {
      name: 'VPS Cloud Hosting - Linux',
      description: '4 vCPU, 8GB RAM Cloud Server for web apps.',
      amount: 12000,
      billingCycle: 'YEARLY',
      startDate: new Date(Date.now() - 360 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      paymentStatus: 'UNPAID',
      clientId: client1.id,
      tenantId: pixelcraft.id,
      categoryId: catHosting.id,
    },
  });

  // Service C: Overdue (expired 3 days ago)
  const serviceC = await prisma.service.create({
    data: {
      name: 'Let’s Encrypt Wildcard SSL',
      description: 'SSL certificate renewal for wildcard domains.',
      amount: 1500,
      billingCycle: 'YEARLY',
      startDate: new Date(Date.now() - 368 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      paymentStatus: 'OVERDUE',
      clientId: client1.id,
      tenantId: pixelcraft.id,
      categoryId: catSSL.id,
    },
  });

  // Service D: Active, Paid
  const serviceD = await prisma.service.create({
    data: {
      name: 'AMC - E-commerce Support',
      description: 'Monthly 20 hours dedicated developer support.',
      amount: 25000,
      billingCycle: 'HALF_YEARLY',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      paymentStatus: 'PAID',
      clientId: client2.id,
      tenantId: pixelcraft.id,
      categoryId: catAMC.id,
    },
  });

  // Service E: Unpaid (pending manual approval)
  const serviceE = await prisma.service.create({
    data: {
      name: 'betasol.in Domain Renewal',
      description: 'Domain registry fee for betasol.in',
      amount: 899,
      billingCycle: 'YEARLY',
      startDate: new Date(Date.now() - 364 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      paymentStatus: 'UNPAID',
      clientId: client2.id,
      tenantId: pixelcraft.id,
      categoryId: catDomain.id,
    },
  });

  console.log('Creating payments...');
  // Paid Payment for Service A
  await prisma.payment.create({
    data: {
      amount: 4800,
      status: 'APPROVED',
      referenceNumber: 'TXN87654321',
      paymentMethod: 'UPI',
      serviceId: serviceA.id,
      clientId: client1.id,
      tenantId: pixelcraft.id,
      verifiedByUserId: pixelAdmin.id,
    },
  });

  // Pending payment proof upload for Service E
  await prisma.payment.create({
    data: {
      amount: 899,
      status: 'PENDING_APPROVAL',
      referenceNumber: 'UPI99887766',
      paymentMethod: 'UPI',
      serviceId: serviceE.id,
      clientId: client2.id,
      tenantId: pixelcraft.id,
    },
  });

  console.log('Creating invoices...');
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-001',
      amount: 4800,
      taxAmount: 0,
      totalAmount: 4800,
      status: 'PAID',
      dueDate: new Date(Date.now() - 350 * 24 * 60 * 60 * 1000),
      serviceId: serviceA.id,
      clientId: client1.id,
      tenantId: pixelcraft.id,
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-002',
      amount: 12000,
      taxAmount: 0,
      totalAmount: 12000,
      status: 'UNPAID',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      serviceId: serviceB.id,
      clientId: client1.id,
      tenantId: pixelcraft.id,
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-003',
      amount: 1500,
      taxAmount: 0,
      totalAmount: 1500,
      status: 'UNPAID',
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      serviceId: serviceC.id,
      clientId: client1.id,
      tenantId: pixelcraft.id,
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-004',
      amount: 899,
      taxAmount: 0,
      totalAmount: 899,
      status: 'UNPAID', 
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      serviceId: serviceE.id,
      clientId: client2.id,
      tenantId: pixelcraft.id,
    },
  });

  console.log('Creating activity logs...');
  await prisma.activityLog.create({
    data: {
      action: 'LOGIN',
      details: 'Super Admin logged in from 127.0.0.1',
      userId: superAdmin.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      action: 'SERVICE_CREATED',
      details: 'Service Google Workspace added for John Doe',
      userId: pixelAdmin.id,
      tenantId: pixelcraft.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      action: 'PAYMENT_SUBMITTED',
      details: 'Manual payment reference UPI99887766 submitted by Jane Smith',
      tenantId: pixelcraft.id,
    },
  });

  console.log('Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
