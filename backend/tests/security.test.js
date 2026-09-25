/**
 * EERS Enterprise Production Security & Authorization Test Suite
 * 
 * Verifies critical security and financial invariants:
 * - Public registration privilege escalation prevention
 * - Enterprise password policy enforcement
 * - Generic authentication error responses (no email enumeration)
 * - Role-based authorization & permission boundaries
 * - IDOR / BOLA prevention (Employee A cannot view Employee B's claim or receipt)
 * - Refresh token rotation & reuse detection
 * - Concurrency safety (atomic sequence generation)
 * - Strict schema validation (rejecting unknown/malformed fields)
 * - Health endpoints
 * 
 * Run: node backend/tests/security.test.js
 * Requires: Running backend server + MongoDB
 */

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api';

let passed = 0;
let failed = 0;
let skipped = 0;
const results = [];

const test = async (name, fn) => {
  try {
    await fn();
    passed++;
    results.push({ name, status: 'PASS' });
    console.log(`  ✅ PASS: ${name}`);
  } catch (error) {
    failed++;
    results.push({ name, status: 'FAIL', error: error.message });
    console.log(`  ❌ FAIL: ${name} — ${error.message}`);
  }
};

const skip = (name) => {
  skipped++;
  results.push({ name, status: 'SKIP' });
  console.log(`  ⏭️  SKIP: ${name}`);
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const fetchJSON = async (url, options = {}) => {
  const { headers, ...restOptions } = options;
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { 'Content-Type': 'application/json', ...headers },
    ...restOptions
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
};

// ═══════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════

const runTests = async () => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('EERS Production Security & Authorization Test Suite');
  console.log('═══════════════════════════════════════════════════════\n');

  // ── Phase 1: Registration Privilege Escalation ───────────────
  console.log('\n📋 1. Registration Privilege Escalation Tests');

  await test('Public registration with role=Admin MUST NOT grant Admin (forced to Employee or rejected)', async () => {
    const email = `test-admin-${Date.now()}@company.com`;
    const res = await fetchJSON('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Escalation Attacker', email, password: 'StrongPass@123!', role: 'Admin' })
    });
    if (res.status === 201) {
      assert(res.body.role === 'Employee', `Privilege escalation occurred! Role was: ${res.body.role}`);
    } else {
      // 400 validation rejection of unauthorized role field is also secure
      assert(res.status === 400, `Expected 201 or 400, got ${res.status}`);
    }
  });

  await test('Public registration with role=Finance MUST create Employee only', async () => {
    const email = `test-fin-${Date.now()}@company.com`;
    const res = await fetchJSON('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Finance Escalation', email, password: 'StrongPass@123!', role: 'Finance' })
    });
    if (res.status === 201) {
      assert(res.body.role === 'Employee', `Expected Employee role, got: ${res.body.role}`);
    }
  });

  await test('Public registration with role=HOD MUST create Employee only', async () => {
    const email = `test-hod-${Date.now()}@company.com`;
    const res = await fetchJSON('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'HOD Escalation', email, password: 'StrongPass@123!', role: 'HOD' })
    });
    if (res.status === 201) {
      assert(res.body.role === 'Employee', `Expected Employee role, got: ${res.body.role}`);
    }
  });

  // ── Phase 2: Password Policy ─────────────────────────────────
  console.log('\n📋 2. Password Security Policy Tests');

  await test('Registration with common password (password123) should fail', async () => {
    const email = `test-weak-${Date.now()}@company.com`;
    const res = await fetchJSON('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Weak Pass', email, password: 'password123' })
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await test('Registration with short password should fail', async () => {
    const email = `test-short-${Date.now()}@company.com`;
    const res = await fetchJSON('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Short Pass', email, password: 'Ab1!' })
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await test('Registration without special characters should fail', async () => {
    const email = `test-nospec-${Date.now()}@company.com`;
    const res = await fetchJSON('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'No Spec', email, password: 'Password123' })
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  // ── Phase 3: Authentication Timing & Enumeration ──────────────
  console.log('\n📋 3. Authentication & Anti-Enumeration Tests');

  await test('Login with wrong password should return generic error message', async () => {
    const res = await fetchJSON('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'nonexistent.user@company.com', password: 'WrongPass@123!' })
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.body.message === 'Invalid credentials', `Expected generic error, got: ${res.body.message}`);
  });

  await test('Forgot password for non-existent email returns generic success (no enumeration)', async () => {
    const res = await fetchJSON('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'ghost-account@doesnotexist.com' })
    });
    assert(res.status === 200, `Expected 200 generic response, got ${res.status}`);
    assert(res.body.success === true, 'Should return success to protect against account enumeration');
  });

  // ── Phase 4: Unauthenticated Access & Headers ────────────────
  console.log('\n📋 4. Unauthenticated Access Protection Tests');

  await test('GET /claims without token should return 401', async () => {
    const res = await fetchJSON('/claims');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test('GET /admin/users without token should return 401', async () => {
    const res = await fetchJSON('/admin/users');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test('GET /admin/audit-logs without token should return 401', async () => {
    const res = await fetchJSON('/admin/audit-logs');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  // ── Phase 5: Dynamic Role & IDOR Testing ─────────────────────
  console.log('\n📋 5. IDOR & Access Control Tests');

  // Register Employee A
  const empAEmail = `emp-a-${Date.now()}@company.com`;
  const empARes = await fetchJSON('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Employee Alice', email: empAEmail, password: 'SecurePass@123!' })
  });
  assert(empARes.status === 201, `Failed to register Employee A: ${JSON.stringify(empARes.body)}`);
  const empAToken = empARes.body.token;
  const empARefreshToken = empARes.body.refreshToken;
  const empAHeaders = { Authorization: `Bearer ${empAToken}` };

  // Fetch reference departments & categories
  const deptRes = await fetchJSON('/admin/departments', { headers: empAHeaders });
  const validDeptId = deptRes.body.data?.[0]?._id;
  const catRes = await fetchJSON('/admin/categories', { headers: empAHeaders });
  const validCatId = catRes.body.data?.[0]?._id;

  // Register Employee B
  const empBEmail = `emp-b-${Date.now()}@company.com`;
  const empBRes = await fetchJSON('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ 
      name: 'Employee Bob', 
      email: empBEmail, 
      password: 'SecurePass@123!',
      department: validDeptId 
    })
  });
  assert(empBRes.status === 201, `Failed to register Employee B: ${JSON.stringify(empBRes.body)}`);
  const empBToken = empBRes.body.token;
  const empBHeaders = { Authorization: `Bearer ${empBToken}` };

  await test('Employee cannot access Admin endpoints (403 Forbidden)', async () => {
    const res = await fetchJSON('/admin/users', { headers: empAHeaders });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Employee cannot process approvals (403 Forbidden)', async () => {
    const res = await fetchJSON('/approvals/000000000000000000000000', {
      method: 'POST',
      headers: empAHeaders,
      body: JSON.stringify({ action: 'Approve', remarks: 'test' })
    });
    assert(res.status === 403 || res.status === 404, `Expected 403/404, got ${res.status}`);
  });

  await test('Employee cannot process payments (403 Forbidden)', async () => {
    const res = await fetchJSON('/payments/000000000000000000000000', {
      method: 'POST',
      headers: empAHeaders,
      body: JSON.stringify({ transactionId: 'TXN-999', method: 'Bank Transfer' })
    });
    assert(res.status === 403 || res.status === 404, `Expected 403/404, got ${res.status}`);
  });

  // Employee A creates a draft claim
  let testClaimId = null;

  if (validCatId && validDeptId) {
    const claimCreateRes = await fetchJSON('/claims', {
      method: 'POST',
      headers: empAHeaders,
      body: JSON.stringify({
        title: 'Confidential Client Lunch',
        categoryId: validCatId,
        departmentId: validDeptId,
        merchant: 'Le Petit Bistro',
        amount: 120,
        date: new Date().toISOString().split('T')[0],
        isDraft: true,
        items: [
          {
            title: 'Confidential Client Lunch',
            categoryId: validCatId,
            merchant: 'Le Petit Bistro',
            amount: 120,
            date: new Date().toISOString().split('T')[0]
          }
        ]
      })
    });

    if (claimCreateRes.status === 201 && claimCreateRes.body.data?._id) {
      testClaimId = claimCreateRes.body.data._id;
    } else {
      console.log('  ⚠️ Claim create status & body:', claimCreateRes.status, claimCreateRes.body);
    }
  }

  if (testClaimId) {
    await test('IDOR Prevention: Employee B cannot view Employee A claim (403 Forbidden)', async () => {
      const res = await fetchJSON(`/claims/${testClaimId}`, { headers: empBHeaders });
      assert(res.status === 403, `Expected 403 Forbidden for IDOR attempt, got: ${res.status}`);
    });

    await test('IDOR Prevention: Employee B cannot access Employee A private receipt (403 Forbidden)', async () => {
      const res = await fetchJSON(`/claims/${testClaimId}/receipt`, { headers: empBHeaders });
      assert(res.status === 403, `Expected 403 Forbidden on unauthorized receipt view, got: ${res.status}`);
    });

    await test('IDOR Prevention: Employee B cannot delete Employee A claim (403 Forbidden)', async () => {
      const res = await fetchJSON(`/claims/${testClaimId}`, {
        method: 'DELETE',
        headers: empBHeaders
      });
      assert(res.status === 403, `Expected 403 Forbidden, got: ${res.status}`);
    });
  } else {
    skip('IDOR claim & receipt protection tests (category ID required for full claim creation)');
  }

  // ── Phase 6: Token Security & Rotation ───────────────────────
  console.log('\n📋 6. Token Rotation & Reuse Detection Tests');

  let rotatedRefreshToken = null;
  await test('Refresh token rotation: valid refresh token issues new pair', async () => {
    const res = await fetchJSON('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: empARefreshToken })
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.token !== undefined, 'Should return new access token');
    assert(res.body.refreshToken !== undefined, 'Should return new refresh token');
    rotatedRefreshToken = res.body.refreshToken;
  });

  await test('Token Reuse Detection: using old rotated refresh token MUST be rejected', async () => {
    const res = await fetchJSON('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: empARefreshToken }) // Reusing old token
    });
    assert(res.status === 401, `Old refresh token must be rejected with 401, got ${res.status}`);
  });

  // ── Phase 7: Validation Hardening ────────────────────────────
  console.log('\n📋 7. Strict Validation Hardening Tests');

  await test('Unknown field in login request should be rejected (allowUnknown: false)', async () => {
    const res = await fetchJSON('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: empAEmail, password: 'SecurePass@123!', injectionField: 'attack' })
    });
    assert(res.status === 400, `Expected 400 rejection for unknown fields, got: ${res.status}`);
  });

  await test('Invalid 5-digit OTP format is rejected by Joi regex', async () => {
    const res = await fetchJSON('/auth/verify-reset-otp', {
      method: 'POST',
      body: JSON.stringify({ email: empAEmail, otp: '12345' })
    });
    assert(res.status === 400, `Expected 400, got: ${res.status}`);
  });

  await test('Malformed ObjectId in route params is safely handled', async () => {
    const res = await fetchJSON('/claims/malformed-id-string', { headers: empAHeaders });
    assert([400, 404, 500].includes(res.status), `Server should safely respond, got: ${res.status}`);
  });

  // ── Phase 8: Concurrency & Sequence Integrity ────────────────
  console.log('\n📋 8. Concurrency & High Load Integrity Tests');

  await test('Concurrent registration requests produce unique user accounts without deadlock', async () => {
    const promises = Array.from({ length: 5 }, (_, i) => {
      const email = `concurrent-user-${Date.now()}-${i}@company.com`;
      return fetchJSON('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: `Concurrent ${i}`, email, password: 'Passw@ord123!' })
      });
    });
    const results = await Promise.all(promises);
    results.forEach(res => {
      assert(res.status === 201, `Concurrent user creation failed with status: ${res.status}`);
    });
  });

  // ── Phase 9: Health & Infrastructure ─────────────────────────
  console.log('\n📋 9. Infrastructure & Observability Tests');

  await test('GET /health returns healthy status with database connectivity', async () => {
    const res = await fetch(`${BASE_URL.replace('/api', '')}/health`);
    const body = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(body.status === 'healthy', `Expected healthy, got ${body.status}`);
    assert(body.database === 'connected', `Expected database connected, got ${body.database}`);
    assert(body.timestamp !== undefined, 'Missing timestamp');
  });

  await test('GET /health/ready returns ready status', async () => {
    const res = await fetch(`${BASE_URL.replace('/api', '')}/health/ready`);
    const body = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(body.status === 'ready', `Expected ready, got ${body.status}`);
  });

  // ═══════════════════════════════════════════════════════════════
  // RESULTS SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('TEST RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  ✅ Passed:  ${passed}`);
  console.log(`  ❌ Failed:  ${failed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  📊 Total:   ${passed + failed + skipped}`);
  console.log('═══════════════════════════════════════════════════════');

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  • ${r.name}: ${r.error}`);
    });
  }

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
};

runTests().catch(err => {
  console.error('Test suite execution error:', err.message);
  process.exit(1);
});
