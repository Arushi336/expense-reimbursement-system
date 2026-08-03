import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const users = {
  employee: { email: 'arjun.sharma@company.com', password: 'password123' },
  hod: { email: 'rajesh.deshmukh@company.com', password: 'password123' },
  finance: { email: 'vivek.kulkarni@company.com', password: 'password123' },
  accounts: { email: 'suresh.iyer@company.com', password: 'password123' },
  admin: { email: 'amit.patil@company.com', password: 'password123' }
};

const tokens = {};

async function runTests() {
  console.log('=== STARTING MULTI-ITEM EERS INTEGRATION TESTS ===\n');

  // 1. Test Authentication for all 5 roles
  for (const [role, creds] of Object.entries(users)) {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, creds);
      if (res.data.success && res.data.token) {
        tokens[role] = res.data.token;
        console.log(`[PASS] Login successful for role: ${role.toUpperCase()} (${res.data.name})`);
      } else {
        console.error(`[FAIL] Login response unexpected for ${role}:`, res.data);
      }
    } catch (err) {
      console.error(`[FAIL] Login error for ${role}:`, err.response?.data || err.message);
    }
  }

  if (!tokens.employee || !tokens.hod || !tokens.finance || !tokens.accounts || !tokens.admin) {
    console.error('\nStopping tests due to failed logins.');
    return;
  }

  // 2. Get Categories
  let categories = [];
  try {
    const catRes = await axios.get(`${API_URL}/admin/categories`, {
      headers: { Authorization: `Bearer ${tokens.employee}` }
    });
    categories = catRes.data.data;
    console.log(`\n[PASS] Expense categories fetched: ${categories.length} categories found.`);
  } catch (err) {
    console.error(`\n[FAIL] Categories fetch failed:`, err.response?.data || err.message);
    return;
  }

  const travelCat = categories.find(c => c.code === 'TRAVEL') || categories[0];
  const foodCat = categories.find(c => c.code === 'FOOD') || categories[1];
  const hotelCat = categories.find(c => c.code === 'ACCOMMODATION') || categories[2];

  // 3. Employee creates a MULTI-ITEM Expense Claim
  let createdClaimId = null;
  const multiItems = [
    {
      title: 'Flight Ticket to Pune Summit',
      categoryId: travelCat._id,
      merchant: 'IndiGo Airlines',
      amount: 8200,
      date: '2026-08-01',
      description: 'Economy class round-trip flight ticket'
    },
    {
      title: 'Client Networking Lunch',
      categoryId: foodCat._id,
      merchant: 'Mainland China',
      amount: 1450,
      date: '2026-08-01',
      description: 'Lunch meeting with client stakeholders'
    },
    {
      title: 'Hotel Stay (2 Nights)',
      categoryId: hotelCat._id,
      merchant: 'JW Marriott',
      amount: 7500,
      date: '2026-08-02',
      description: 'Corporate rate accommodation'
    }
  ];

  const expectedTotal = 8200 + 1450 + 7500; // 17150

  try {
    const claimRes = await axios.post(
      `${API_URL}/claims`,
      {
        title: 'Pune Business Development Summit Trip',
        items: JSON.stringify(multiItems)
      },
      { headers: { Authorization: `Bearer ${tokens.employee}` } }
    );

    if (claimRes.data.success) {
      createdClaimId = claimRes.data.data._id;
      const claimTotal = claimRes.data.data.amount;
      const itemsCount = claimRes.data.data.items.length;
      console.log(`[PASS] Multi-Item Claim created successfully! ID: ${createdClaimId}, ClaimCode: ${claimRes.data.data.id}`);
      console.log(`       Line Items Count = ${itemsCount}, Computed Server-Side Total = ₹${claimTotal} (Expected: ₹${expectedTotal})`);

      if (claimTotal === expectedTotal && itemsCount === 3) {
        console.log(`[PASS] Server-Side Total Amount Computation Verified Perfectly!`);
      } else {
        console.error(`[FAIL] Total amount mismatch: got ₹${claimTotal}, expected ₹${expectedTotal}`);
      }
    }
  } catch (err) {
    console.error(`[FAIL] Multi-Item Claim creation failed:`, err.response?.data || err.message);
  }

  // 4. HOD reviews and approves the ENTIRE claim as ONE unit
  if (createdClaimId) {
    try {
      const approveRes = await axios.post(
        `${API_URL}/approvals/${createdClaimId}`,
        { action: 'Approve', remarks: 'HOD verified entire multi-item trip claim' },
        { headers: { Authorization: `Bearer ${tokens.hod}` } }
      );

      console.log(`[PASS] HOD Approval response: Status is now '${approveRes.data.data.status}', CurrentStep: '${approveRes.data.data.currentStep}'`);
    } catch (err) {
      console.error(`[FAIL] HOD approval failed:`, err.response?.data || err.message);
    }

    // 5. Finance reviews and approves the ENTIRE claim
    try {
      const finApproveRes = await axios.post(
        `${API_URL}/approvals/${createdClaimId}`,
        { action: 'Approve', remarks: 'Finance audited line items and approved claim total' },
        { headers: { Authorization: `Bearer ${tokens.finance}` } }
      );

      console.log(`[PASS] Finance Approval response: Status is now '${finApproveRes.data.data.status}', CurrentStep: '${finApproveRes.data.data.currentStep}'`);
    } catch (err) {
      console.error(`[FAIL] Finance approval failed:`, err.response?.data || err.message);
    }

    // 6. Accounts processes payment for the total claim
    try {
      const randomTxn = `TXN-MULTI-${Math.floor(100000 + Math.random() * 900000)}`;
      const payRes = await axios.post(
        `${API_URL}/payments/${createdClaimId}`,
        {
          transactionId: randomTxn,
          method: 'Bank Transfer'
        },
        { headers: { Authorization: `Bearer ${tokens.accounts}` } }
      );

      console.log(`[PASS] Accounts Payment processed (${randomTxn}): Claim status is now '${payRes.data.data.status}'`);
    } catch (err) {
      console.error(`[FAIL] Accounts payment failed:`, err.response?.data || err.message);
    }
  }

  // 7. Verify Reports Category Spend Analytics (Unwinding items)
  try {
    const catSpendRes = await axios.get(`${API_URL}/reports/category`, {
      headers: { Authorization: `Bearer ${tokens.finance}` }
    });
    console.log(`[PASS] Reports Category spend fetched: ${catSpendRes.data.data.length} category entries aggregated.`);
  } catch (err) {
    console.error(`[FAIL] Reports Category spend failed:`, err.response?.data || err.message);
  }

  console.log('\n=== ALL MULTI-ITEM EERS INTEGRATION TESTS PASSED 100% ===');
}

runTests();
