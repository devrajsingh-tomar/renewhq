const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runPlaywrightSuite() {
  console.log('====================================================');
  console.log(' RENEWHQ PLAYWRIGHT AUTHENTICATION VERIFICATION');
  console.log(` Target Base URL: ${BASE_URL}`);
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  const browser = await chromium.launch({ headless: true });

  try {
    // ---------------------------------------------------------------
    // TEST 1: Direct URL Access Without Authentication (Route Protection)
    // ---------------------------------------------------------------
    console.log('--- TEST 1: Direct URL Access Without Authentication ---');
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();

    // 1a. Direct access to /dashboard
    console.log('  Navigating directly to /dashboard without session...');
    await page1.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    const currentUrl1a = page1.url();
    console.log(`  Result URL: ${currentUrl1a}`);
    assert(currentUrl1a.includes('/login'), 'Access to /dashboard without session redirected to /login');

    // 1b. Direct access to /agency/pixelcraft/dashboard
    console.log('  Navigating directly to /agency/pixelcraft/dashboard without session...');
    await page1.goto(`${BASE_URL}/agency/pixelcraft/dashboard`, { waitUntil: 'networkidle' });
    const currentUrl1b = page1.url();
    console.log(`  Result URL: ${currentUrl1b}`);
    assert(currentUrl1b.includes('/login'), 'Access to /agency/pixelcraft/dashboard without session redirected to login');
    await page1.screenshot({ path: path.join(SCREENSHOT_DIR, '01-direct-access-blocked.png') });
    await ctx1.close();

    // ---------------------------------------------------------------
    // TEST 2: Incorrect Password Rejection
    // ---------------------------------------------------------------
    console.log('\n--- TEST 2: Incorrect Password Rejection ---');
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();

    await page2.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page2.fill('input[type="email"]', 'admin@renewhq.com');
    await page2.fill('input[type="password"]', 'WrongPassword!@#');

    const [loginResponse2] = await Promise.all([
      page2.waitForResponse(res => res.url().includes('/api/auth/login'), { timeout: 25000 }),
      page2.click('button[type="submit"]')
    ]);
    const loginResponseStatus = loginResponse2.status();
    let loginResponseBody = null;
    try {
      loginResponseBody = await loginResponse2.json();
    } catch {}

    console.log(`  HTTP Response: ${loginResponseStatus}`);
    console.log(`  Response Body: ${JSON.stringify(loginResponseBody)}`);
    assert(loginResponseStatus === 401, 'Login API returned HTTP 401 Unauthorized for incorrect password');
    
    await page2.waitForSelector('text=Invalid email or password', { timeout: 10000 });
    const pageContent2 = await page2.content();
    assert(pageContent2.includes('Invalid email or password'), 'UI displays "Invalid email or password" error banner');
    await page2.screenshot({ path: path.join(SCREENSHOT_DIR, '02-incorrect-password.png') });
    await ctx2.close();

    // ---------------------------------------------------------------
    // TEST 3: Suspended Account Login Rejection
    // ---------------------------------------------------------------
    console.log('\n--- TEST 3: Suspended Account Login Rejection ---');
    const ctx3 = await browser.newContext();
    const page3 = await ctx3.newPage();

    await page3.goto(`${BASE_URL}/agency/pixelcraft/login`, { waitUntil: 'networkidle' });
    await page3.fill('input[type="email"]', 'suspended@pixelcraft.com');
    await page3.fill('input[type="password"]', 'suspended123');

    const [suspendedResponse] = await Promise.all([
      page3.waitForResponse(res => res.url().includes('/api/auth/login'), { timeout: 25000 }),
      page3.click('button[type="submit"]')
    ]);
    const suspendedStatus = suspendedResponse.status();
    let suspendedBody = null;
    try {
      suspendedBody = await suspendedResponse.json();
    } catch {}

    console.log(`  HTTP Response: ${suspendedStatus}`);
    console.log(`  Response Body: ${JSON.stringify(suspendedBody)}`);
    assert(suspendedStatus === 403, 'Login API returned HTTP 403 Forbidden for suspended user');

    await page3.waitForSelector('text=suspended', { timeout: 10000 });
    const pageContent3 = await page3.content();
    assert(pageContent3.includes('suspended'), 'UI displays account suspended rejection error');
    await page3.screenshot({ path: path.join(SCREENSHOT_DIR, '03-suspended-account-rejected.png') });
    await ctx3.close();

    // ---------------------------------------------------------------
    // TEST 4: Super Admin Login, Session Persistence & Logout
    // ---------------------------------------------------------------
    console.log('\n--- TEST 4: Super Admin Login, Refresh Persistence & Logout ---');
    const ctx4 = await browser.newContext();
    const page4 = await ctx4.newPage();

    await page4.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page4.fill('input[type="email"]', 'admin@renewhq.com');
    await page4.fill('input[type="password"]', 'admin123');

    const [superAdminResponse] = await Promise.all([
      page4.waitForResponse(res => res.url().includes('/api/auth/login'), { timeout: 25000 }),
      page4.click('button[type="submit"]')
    ]);
    const superAdminStatus = superAdminResponse.status();
    await page4.waitForURL(url => url.pathname.includes('/super-admin'), { timeout: 25000 });
    await page4.waitForSelector('text=Total Agencies', { timeout: 35000 });

    console.log(`  HTTP Response: ${superAdminStatus}`);
    console.log(`  Landed on: ${page4.url()}`);
    assert(superAdminStatus === 200, 'Login API returned HTTP 200 OK for Super Admin');
    assert(page4.url().includes('/super-admin'), 'Redirected to /super-admin');

    const cookies4 = await ctx4.cookies();
    const sessionCookie4 = cookies4.find(c => c.name === 'renewhq_session');
    assert(sessionCookie4 !== undefined && sessionCookie4.value.length > 0, 'Session cookie renewhq_session is present and non-empty');
    await page4.screenshot({ path: path.join(SCREENSHOT_DIR, '04-superadmin-dashboard.png') });

    // 4b. Test Session Persistence after Refresh
    console.log('  Testing session persistence on page refresh...');
    await page4.reload({ waitUntil: 'networkidle' });
    await page4.waitForSelector('text=Total Agencies', { timeout: 35000 });
    assert(page4.url().includes('/super-admin'), 'Page reloaded and remained on /super-admin without redirecting to login');
    const content4Reload = await page4.content();
    assert(content4Reload.includes('Total Agencies') || content4Reload.includes('Platform Governance'), 'Dashboard metrics preserved after refresh');
    await page4.screenshot({ path: path.join(SCREENSHOT_DIR, '04b-superadmin-refreshed.png') });

    // 4c. Test Logout
    console.log('  Testing Super Admin logout...');
    const logoutRes = await page4.evaluate(async () => {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      return res.status;
    });
    assert(logoutRes === 200, 'Logout endpoint returned HTTP 200');

    await page4.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    assert(page4.url().includes('/login'), 'After logout, direct navigation to /dashboard redirects to /login');
    await page4.screenshot({ path: path.join(SCREENSHOT_DIR, '04c-superadmin-logged-out.png') });
    await ctx4.close();

    // ---------------------------------------------------------------
    // TEST 5: Agency Admin Login, CRUD, and Dashboard
    // ---------------------------------------------------------------
    console.log('\n--- TEST 5: Agency Admin Login & Dashboard ---');
    const ctx5 = await browser.newContext();
    const page5 = await ctx5.newPage();

    await page5.goto(`${BASE_URL}/agency/pixelcraft/login`, { waitUntil: 'networkidle' });
    await page5.fill('input[type="email"]', 'pixeladmin@pixelcraft.com');
    await page5.fill('input[type="password"]', 'pixel123');

    const [agencyAdminResponse] = await Promise.all([
      page5.waitForResponse(res => res.url().includes('/api/auth/login'), { timeout: 25000 }),
      page5.click('button[type="submit"]')
    ]);
    const agencyAdminStatus = agencyAdminResponse.status();
    await page5.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 25000 });
    await page5.waitForSelector('text=Overview Panel', { timeout: 35000 });
    await page5.waitForSelector('text=Staff Team', { timeout: 15000 });
    await page5.waitForSelector('text=Branding & Settings', { timeout: 15000 });

    console.log(`  HTTP Response: ${agencyAdminStatus}`);
    console.log(`  Landed on: ${page5.url()}`);
    assert(agencyAdminStatus === 200, 'Login API returned HTTP 200 for Agency Admin');
    assert(page5.url().includes('/agency/pixelcraft/dashboard'), 'Redirected to Agency Admin dashboard');

    const content5 = await page5.content();
    assert(content5.includes('Pixelcraft Studios') || content5.includes('Overview'), 'Agency dashboard loaded with agency context');
    assert(content5.includes('Staff Team'), 'Agency Admin has Staff Team management tab');
    assert(content5.includes('Branding &amp; Settings') || content5.includes('Branding & Settings'), 'Agency Admin has Branding & Settings tab');
    await page5.screenshot({ path: path.join(SCREENSHOT_DIR, '05-agency-admin-dashboard.png') });
    await ctx5.close();

    // ---------------------------------------------------------------
    // TEST 6: Agency Staff Login & Role Visibility Restrictions
    // ---------------------------------------------------------------
    console.log('\n--- TEST 6: Agency Staff Login & Role Restrictions ---');
    const ctx6 = await browser.newContext();
    const page6 = await ctx6.newPage();

    await page6.goto(`${BASE_URL}/agency/pixelcraft/login`, { waitUntil: 'networkidle' });
    await page6.fill('input[type="email"]', 'staff@pixelcraft.com');
    await page6.fill('input[type="password"]', 'staff123');

    const [staffResponse] = await Promise.all([
      page6.waitForResponse(res => res.url().includes('/api/auth/login'), { timeout: 25000 }),
      page6.click('button[type="submit"]')
    ]);
    const staffStatus = staffResponse.status();
    await page6.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 25000 });
    await page6.waitForSelector('text=Staff View', { timeout: 35000 });

    console.log(`  HTTP Response: ${staffStatus}`);
    console.log(`  Landed on: ${page6.url()}`);
    assert(staffStatus === 200, 'Login API returned HTTP 200 for Staff');
    assert(page6.url().includes('/agency/pixelcraft/dashboard'), 'Redirected to agency dashboard');

    const content6 = await page6.content();
    assert(content6.includes('Staff View'), 'UI indicates Staff View mode');
    assert(!content6.includes('Branding &amp; Settings') && !content6.includes('Branding & Settings'), 'Branding & Settings tab is hidden for Staff');
    assert(!content6.includes('Staff Team'), 'Staff Team management tab is hidden for Staff');
    await page6.screenshot({ path: path.join(SCREENSHOT_DIR, '06-staff-dashboard.png') });
    await ctx6.close();

    // ---------------------------------------------------------------
    // TEST 7: Client Login, Client Portal & Role-Based Redirection
    // ---------------------------------------------------------------
    console.log('\n--- TEST 7: Client Login, Client Portal & Role-Based Redirection ---');
    const ctx7 = await browser.newContext();
    const page7 = await ctx7.newPage();

    await page7.goto(`${BASE_URL}/agency/pixelcraft/login`, { waitUntil: 'networkidle' });
    await page7.fill('input[type="email"]', 'client1@acmax.com');
    await page7.fill('input[type="password"]', 'client123');

    const [clientResponse] = await Promise.all([
      page7.waitForResponse(res => res.url().includes('/api/auth/login'), { timeout: 25000 }),
      page7.click('button[type="submit"]')
    ]);
    const clientStatus = clientResponse.status();
    await page7.waitForURL(url => url.pathname.includes('/client/dashboard'), { timeout: 25000 });
    await page7.waitForSelector('text=Client Subscription Portal', { timeout: 35000 });

    console.log(`  HTTP Response: ${clientStatus}`);
    console.log(`  Landed on: ${page7.url()}`);
    assert(clientStatus === 200, 'Login API returned HTTP 200 for Client');
    assert(page7.url().includes('/client/dashboard'), 'Redirected to Client Portal');

    const content7 = await page7.content();
    assert(content7.includes('Client Subscription Portal'), 'Client portal loaded successfully');
    await page7.screenshot({ path: path.join(SCREENSHOT_DIR, '07-client-dashboard.png') });

    // 7b. Test Client trying to access Agency Admin dashboard
    console.log('  Testing Client attempting to access Admin dashboard...');
    await page7.goto(`${BASE_URL}/agency/pixelcraft/dashboard`, { waitUntil: 'networkidle' });
    await page7.waitForURL(url => url.pathname.includes('/client/dashboard'), { timeout: 25000 });
    console.log(`  Result URL: ${page7.url()}`);
    assert(page7.url().includes('/client/dashboard'), 'Client attempting to access /dashboard was redirected back to /client/dashboard');
    await page7.screenshot({ path: path.join(SCREENSHOT_DIR, '07b-client-role-boundary.png') });

    // 7c. Test Client refresh persistence
    console.log('  Testing Client refresh persistence...');
    await page7.reload({ waitUntil: 'networkidle' });
    await page7.waitForSelector('text=Client Subscription Portal', { timeout: 35000 });
    assert(page7.url().includes('/client/dashboard'), 'Client portal persisted across page reload');
    await ctx7.close();

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n====================================================');
  console.log(` PLAYWRIGHT SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPlaywrightSuite().catch((e) => {
  console.error(e);
  process.exit(1);
});
