import XLSX from 'xlsx';
import ExpenseClaim from '../models/ExpenseClaim.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import Payment from '../models/Payment.js';
import mongoose from 'mongoose';

// Helper to gather all raw data based on request filters
const gatherReportData = async (req) => {
  const { startDate, endDate, departmentId, employeeId, categoryId, status, minAmount, maxAmount, search } = req.query;
  const matchQuery = {};

  if (req.user.role === 'Employee') {
    matchQuery.employee = req.user._id;
  } else if (req.user.role === 'HOD') {
    matchQuery.department = req.user.department;
  }

  if (startDate || endDate) {
    matchQuery.date = {};
    if (startDate) matchQuery.date.$gte = new Date(startDate);
    if (endDate) matchQuery.date.$lte = new Date(endDate);
  }

  if (departmentId && req.user.role !== 'Employee') {
    matchQuery.department = new mongoose.Types.ObjectId(departmentId);
  }
  if (employeeId && req.user.role !== 'Employee') {
    matchQuery.employee = new mongoose.Types.ObjectId(employeeId);
  }
  if (categoryId) {
    matchQuery.category = new mongoose.Types.ObjectId(categoryId);
  }
  if (status) {
    matchQuery.status = status;
  } else {
    if (req.user.role !== 'Employee') {
      matchQuery.status = { $ne: 'Draft' };
    }
  }
  if (minAmount || maxAmount) {
    matchQuery.amount = {};
    if (minAmount) matchQuery.amount.$gte = parseFloat(minAmount);
    if (maxAmount) matchQuery.amount.$lte = parseFloat(maxAmount);
  }

  let claims = await ExpenseClaim.find(matchQuery)
    .populate('employee', 'name employeeId email')
    .populate('department', 'name budget')
    .populate('category', 'name')
    .sort({ date: -1 });

  if (search) {
    const searchLower = search.toLowerCase();
    claims = claims.filter(c => {
      const empName = c.employee?.name || '';
      const empId = c.employee?.employeeId || '';
      const deptName = c.department?.name || '';
      const catName = c.category?.name || '';
      const statusVal = c.status || '';
      const titleVal = c.title || '';
      
      return empName.toLowerCase().includes(searchLower) ||
             empId.toLowerCase().includes(searchLower) ||
             deptName.toLowerCase().includes(searchLower) ||
             catName.toLowerCase().includes(searchLower) ||
             statusVal.toLowerCase().includes(searchLower) ||
             titleVal.toLowerCase().includes(searchLower);
    });
  }

  const allDepartments = await Department.find();
  const allUsers = await User.find({ role: { $ne: 'Admin' } }).populate('department', 'name');

  const totalAmountSum = claims.reduce((sum, c) => sum + c.amount, 0);
  const approvedClaims = claims.filter(c => c.status === 'Approved & Settled');
  const pendingClaims = claims.filter(c => ['Submitted', 'Pending Finance', 'Pending Settlement'].includes(c.status));
  const rejectedClaims = claims.filter(c => c.status.startsWith('Rejected'));

  const approvedAmount = approvedClaims.reduce((sum, c) => sum + c.amount, 0);
  const pendingAmount = pendingClaims.reduce((sum, c) => sum + c.amount, 0);
  const rejectedAmount = rejectedClaims.reduce((sum, c) => sum + c.amount, 0);

  // Highest Spending Department
  const deptSpendMap = {};
  approvedClaims.forEach(c => {
    const deptName = c.department?.name || 'Unknown';
    deptSpendMap[deptName] = (deptSpendMap[deptName] || 0) + c.amount;
  });
  let highestSpendingDept = 'N/A';
  let maxDeptSpend = 0;
  Object.entries(deptSpendMap).forEach(([dept, spend]) => {
    if (spend > maxDeptSpend) {
      maxDeptSpend = spend;
      highestSpendingDept = dept;
    }
  });

  // Most Used Category
  const catCountMap = {};
  claims.forEach(c => {
    const catName = c.category?.name || 'Unknown';
    catCountMap[catName] = (catCountMap[catName] || 0) + 1;
  });
  let mostUsedCategory = 'N/A';
  let maxCatCount = 0;
  Object.entries(catCountMap).forEach(([cat, count]) => {
    if (count > maxCatCount) {
      maxCatCount = count;
      mostUsedCategory = cat;
    }
  });

  // Payments
  const paymentRecords = await Payment.find()
    .populate({
      path: 'claimId',
      match: matchQuery,
      populate: [
        { path: 'employee', select: 'name employeeId' },
        { path: 'department', select: 'name' }
      ]
    })
    .sort({ paymentDate: -1 });

  const paymentsFormatted = paymentRecords
    .filter(p => p.claimId !== null)
    .map(p => ({
      transactionId: p.transactionId,
      bankReference: p.bankReference || 'N/A',
      upiReference: p.upiReference || 'N/A',
      amount: p.amount,
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod || 'Bank Transfer',
      paymentStatus: p.paymentStatus || 'Success',
      claimId: p.claimId.id,
      employeeName: p.claimId.employee ? p.claimId.employee.name : 'Unknown',
      employeeId: p.claimId.employee ? p.claimId.employee.employeeId : 'N/A',
      department: p.claimId.department ? p.claimId.department.name : 'Unknown'
    }));

  return {
    claims,
    allDepartments,
    allUsers,
    summary: {
      totalClaims: claims.length,
      totalAmount: totalAmountSum,
      approvedAmount,
      pendingAmount,
      rejectedAmount,
      approvedCount: approvedClaims.length,
      pendingCount: pendingClaims.length,
      rejectedCount: rejectedClaims.length,
      totalEmployees: allUsers.length,
      avgClaimAmount: claims.length > 0 ? totalAmountSum / claims.length : 0,
      highestSpendingDept,
      mostUsedCategory
    },
    approvedClaims,
    pendingClaims,
    rejectedClaims,
    payments: paymentsFormatted
  };
};

// 1. EXPORT EXCEL REPORT
export const exportExcelReport = async (req, res, next) => {
  try {
    const data = await gatherReportData(req);

    const wb = XLSX.book_new();

    // Sheet 1: Dashboard Summary
    const summaryData = [
      { Metric: 'Total Claims Filed', Value: data.summary.totalClaims },
      { Metric: 'Total Amount Claimed (INR)', Value: data.summary.totalAmount },
      { Metric: 'Total Amount Approved (INR)', Value: data.summary.approvedAmount },
      { Metric: 'Total Amount Pending (INR)', Value: data.summary.pendingAmount },
      { Metric: 'Total Amount Rejected (INR)', Value: data.summary.rejectedAmount },
      { Metric: 'Active Employees Count', Value: data.summary.totalEmployees },
      { Metric: 'Average Claim Amount (INR)', Value: data.summary.avgClaimAmount },
      { Metric: 'Highest Spending Department', Value: data.summary.highestSpendingDept },
      { Metric: 'Most Utilized Expense Category', Value: data.summary.mostUsedCategory },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.book_append_sheet(wb, wsSummary, 'Dashboard Summary');

    // Sheet 2: Employee Report
    const employeeData = data.allUsers.map(u => {
      const empClaims = data.claims.filter(c => c.employee && c.employee._id.toString() === u._id.toString());
      return {
        'Employee ID': u.employeeId || 'N/A',
        'Employee Name': u.name,
        'Email Address': u.email,
        'Phone Number': u.phoneNumber || 'N/A',
        'Department': u.department ? u.department.name : 'Unassigned',
        'Total Claims': empClaims.length,
        'Claimed Amount (INR)': empClaims.reduce((sum, c) => sum + c.amount, 0),
        'Approved Amount (INR)': empClaims.filter(c => c.status === 'Approved & Settled').reduce((sum, c) => sum + c.amount, 0),
        'Pending Amount (INR)': empClaims.filter(c => ['Submitted', 'Pending Finance', 'Pending Settlement'].includes(c.status)).reduce((sum, c) => sum + c.amount, 0),
        'Rejected Amount (INR)': empClaims.filter(c => c.status.startsWith('Rejected')).reduce((sum, c) => sum + c.amount, 0)
      };
    });
    const wsEmployee = XLSX.utils.json_to_sheet(employeeData);
    XLSX.book_append_sheet(wb, wsEmployee, 'Employee Report');

    // Sheet 3: Department Report
    const departmentData = data.allDepartments.map(d => {
      const deptClaims = data.claims.filter(c => c.department && c.department._id.toString() === d._id.toString());
      return {
        'Department Code': d.code,
        'Department Name': d.name,
        'Allotted Budget (INR)': d.budget,
        'Total Claims Count': deptClaims.length,
        'Total Spent Amount (INR)': deptClaims.filter(c => c.status === 'Approved & Settled').reduce((sum, c) => sum + c.amount, 0),
        'Approved Amount (INR)': deptClaims.filter(c => c.status === 'Approved & Settled').reduce((sum, c) => sum + c.amount, 0),
        'Pending Amount (INR)': deptClaims.filter(c => ['Submitted', 'Pending Finance', 'Pending Settlement'].includes(c.status)).reduce((sum, c) => sum + c.amount, 0),
        'Rejected Amount (INR)': deptClaims.filter(c => c.status.startsWith('Rejected')).reduce((sum, c) => sum + c.amount, 0)
      };
    });
    const wsDepartment = XLSX.utils.json_to_sheet(departmentData);
    XLSX.book_append_sheet(wb, wsDepartment, 'Department Report');

    // Sheet 4: Category Report
    const categories = await ExpenseCategory.find();
    const categoryData = categories.map(cat => {
      const catClaims = data.claims.filter(c => c.category && c.category._id.toString() === cat._id.toString());
      const total = catClaims.reduce((sum, c) => sum + c.amount, 0);
      const pct = data.summary.totalAmount > 0 ? (total / data.summary.totalAmount) * 100 : 0;
      return {
        'Expense Category': cat.name,
        'Claims Count': catClaims.length,
        'Total Spent (INR)': total,
        'Percentage of Total Spend': `${pct.toFixed(2)}%`
      };
    });
    const wsCategory = XLSX.utils.json_to_sheet(categoryData);
    XLSX.book_append_sheet(wb, wsCategory, 'Category Report');

    // Sheet 5: Monthly Trend
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = months.map((m, index) => {
      const monthClaims = data.claims.filter(c => new Date(c.date).getMonth() === index);
      return {
        'Month': m,
        'Claims Count': monthClaims.length,
        'Total Amount (INR)': monthClaims.reduce((sum, c) => sum + c.amount, 0),
        'Approved (INR)': monthClaims.filter(c => c.status === 'Approved & Settled').reduce((sum, c) => sum + c.amount, 0),
        'Pending (INR)': monthClaims.filter(c => ['Submitted', 'Pending Finance', 'Pending Settlement'].includes(c.status)).reduce((sum, c) => sum + c.amount, 0),
        'Rejected (INR)': monthClaims.filter(c => c.status.startsWith('Rejected')).reduce((sum, c) => sum + c.amount, 0),
      };
    });
    const wsMonthly = XLSX.utils.json_to_sheet(monthlyData);
    XLSX.book_append_sheet(wb, wsMonthly, 'Monthly Trend');

    // Sheet 6: Pending Claims
    const pendingData = data.pendingClaims.map(c => ({
      'Claim ID': c.id,
      'Employee Name': c.employee?.name || 'N/A',
      'Title': c.title,
      'Category': c.category?.name || 'N/A',
      'Amount (INR)': c.amount,
      'Submission Date': new Date(c.date).toLocaleDateString(),
      'Status': c.status
    }));
    const wsPending = XLSX.utils.json_to_sheet(pendingData);
    XLSX.book_append_sheet(wb, wsPending, 'Pending Claims');

    // Sheet 7: Approved Claims
    const approvedList = data.approvedClaims.map(c => ({
      'Claim ID': c.id,
      'Employee Name': c.employee?.name || 'N/A',
      'Title': c.title,
      'Category': c.category?.name || 'N/A',
      'Amount (INR)': c.amount,
      'Settled Date': new Date(c.date).toLocaleDateString()
    }));
    const wsApproved = XLSX.utils.json_to_sheet(approvedList);
    XLSX.book_append_sheet(wb, wsApproved, 'Approved Claims');

    // Sheet 8: Rejected Claims
    const rejectedList = data.rejectedClaims.map(c => ({
      'Claim ID': c.id,
      'Employee Name': c.employee?.name || 'N/A',
      'Title': c.title,
      'Category': c.category?.name || 'N/A',
      'Amount (INR)': c.amount,
      'Status': c.status
    }));
    const wsRejected = XLSX.utils.json_to_sheet(rejectedList);
    XLSX.book_append_sheet(wb, wsRejected, 'Rejected Claims');

    // Sheet 9: Payment History
    const paymentData = data.payments.map(p => ({
      'Transaction ID': p.transactionId,
      'Bank Ref Number': p.bankReference,
      'UPI Ref Number': p.upiReference,
      'Employee ID': p.employeeId,
      'Employee Name': p.employeeName,
      'Department': p.department,
      'Payment Date': new Date(p.paymentDate).toLocaleDateString(),
      'Payment Method': p.paymentMethod,
      'Amount (INR)': p.amount,
      'Status': p.paymentStatus
    }));
    const wsPayments = XLSX.utils.json_to_sheet(paymentData);
    XLSX.book_append_sheet(wb, wsPayments, 'Payment History');

    // Sheet 10: Budget Utilization
    const budgetData = data.allDepartments.map(d => {
      const deptClaims = data.claims.filter(c => c.department && c.department._id.toString() === d._id.toString());
      const spent = deptClaims.filter(c => c.status === 'Approved & Settled').reduce((sum, c) => sum + c.amount, 0);
      const remaining = d.budget - spent;
      const utilization = d.budget > 0 ? (spent / d.budget) * 100 : 0;
      return {
        'Department Name': d.name,
        'Allocated Budget (INR)': d.budget,
        'Spent Budget (INR)': spent,
        'Remaining Budget (INR)': remaining,
        'Utilization Percentage': `${utilization.toFixed(2)}%`
      };
    });
    const wsBudget = XLSX.utils.json_to_sheet(budgetData);
    XLSX.book_append_sheet(wb, wsBudget, 'Budget Utilization');

    const fileBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Fluid_Controls_Enterprise_Report.xlsx');
    res.send(fileBuffer);
  } catch (error) {
    next(error);
  }
};

// 2. EXPORT WORD REPORT (.doc compatible HTML)
export const exportWordReport = async (req, res, next) => {
  try {
    const data = await gatherReportData(req);
    const dateStr = new Date().toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // Build Word Cover Page and styled layout as a single Word-compatible HTML file
    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Fluid Controls Pvt. Ltd. Executive Report</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #334155; margin: 40px; }
          .cover { text-align: center; margin-top: 150px; margin-bottom: 200px; page-break-after: always; }
          .company-logo { font-size: 28px; font-weight: 800; color: #0f172a; margin-bottom: 10px; text-transform: uppercase; }
          .title { font-size: 32px; font-weight: bold; color: #0284c7; margin-bottom: 20px; }
          .meta-info { margin-top: 80px; font-size: 14px; text-align: left; border-top: 2px solid #e2e8f0; padding-top: 20px; width: 300px; margin-left: auto; margin-right: auto; }
          h1 { color: #0f172a; font-size: 20px; border-bottom: 1.5px solid #0284c7; padding-bottom: 6px; margin-top: 40px; }
          p { font-size: 12.5px; line-height: 1.6; text-align: justify; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; }
          th { background-color: #0284c7; color: #ffffff; padding: 10px; font-size: 11px; text-align: left; font-weight: bold; border: 1px solid #0284c7; }
          td { padding: 9px; font-size: 11px; border: 1px solid #e2e8f0; text-align: left; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .signature-box { margin-top: 60px; width: 100%; }
          .signature-box td { border: none; font-size: 12px; }
          .footer { font-size: 10px; color: #94a3b8; text-align: center; margin-top: 80px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <!-- COVER PAGE -->
        <div class="cover">
          <div class="company-logo">Fluid Controls Pvt. Ltd.</div>
          <div class="title">Corporate Expense & Audit Analytical Report</div>
          <p style="font-size:14px; color:#64748b;">Automated Financial Management Dashboard</p>
          <div class="meta-info">
            <strong>Prepared For:</strong> Executive Board / Audit Faculty<br>
            <strong>Generated By:</strong> ${req.user.name} (${req.user.role})<br>
            <strong>Department:</strong> Finance & Audit Admin<br>
            <strong>Generated Date:</strong> ${dateStr}<br>
            <strong>Reporting Period:</strong> Current Fiscal Cycle
          </div>
        </div>

        <!-- EXECUTIVE SUMMARY -->
        <h1>Executive Summary</h1>
        <p>
          This executive report provides a comprehensive summary of employee expense claims and corporate reimbursement operations. 
          The data presented outlines overall department spends, budget utilization metrics, employee reimbursement summaries, 
          and audit compliance data. Standard mileage calculations, category expenditure constraints, and double-entry 
          settlements are fully processed in compliance with corporate guidelines.
        </p>

        <!-- FINANCIAL METRICS SUMMARY -->
        <h1>Overall Expense Summary</h1>
        <table>
          <thead>
            <tr>
              <th>Financial Metric Description</th>
              <th>Value Count / Allocation</th>
              <th>Reimbursement Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Total Expense Claims Submitted</td><td>${data.summary.totalClaims} Claims</td><td>₹${data.summary.totalAmount.toFixed(2)}</td></tr>
            <tr><td>Approved and Settled Payments</td><td>${data.summary.approvedCount} Claims</td><td>₹${data.summary.approvedAmount.toFixed(2)}</td></tr>
            <tr><td>Pending Audit and Verification</td><td>${data.summary.pendingCount} Claims</td><td>₹${data.summary.pendingAmount.toFixed(2)}</td></tr>
            <tr><td>Rejected and Non-Compliant Claims</td><td>${data.summary.rejectedCount} Claims</td><td>₹${data.summary.rejectedAmount.toFixed(2)}</td></tr>
            <tr><td>Average Claim Amount</td><td>--</td><td>₹${data.summary.avgClaimAmount.toFixed(2)}</td></tr>
          </tbody>
        </table>

        <!-- DEPARTMENT SPEND -->
        <h1>Department Spend Analysis</h1>
        <table>
          <thead>
            <tr>
              <th>Dept Name</th>
              <th>Total Claims</th>
              <th>Spent Amount (INR)</th>
              <th>Approved Amount (INR)</th>
              <th>Pending Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            ${data.allDepartments.map(d => {
              const deptClaims = data.claims.filter(c => c.department && c.department._id.toString() === d._id.toString());
              const total = deptClaims.reduce((sum, c) => sum + c.amount, 0);
              const approved = deptClaims.filter(c => c.status === 'Approved & Settled').reduce((sum, c) => sum + c.amount, 0);
              const pending = deptClaims.filter(c => ['Submitted', 'Pending Finance', 'Pending Settlement'].includes(c.status)).reduce((sum, c) => sum + c.amount, 0);
              return `
                <tr>
                  <td><strong>${d.name}</strong></td>
                  <td>${deptClaims.length}</td>
                  <td>₹${total.toFixed(2)}</td>
                  <td>₹${approved.toFixed(2)}</td>
                  <td>₹${pending.toFixed(2)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- EMPLOYEE SPEND -->
        <h1>Employee Claims Detail</h1>
        <table>
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Employee Name</th>
              <th>Department</th>
              <th>Claims</th>
              <th>Approved (INR)</th>
              <th>Pending (INR)</th>
              <th>Total Claimed (INR)</th>
            </tr>
          </thead>
          <tbody>
            ${data.allUsers.map(u => {
              const empClaims = data.claims.filter(c => c.employee && c.employee._id.toString() === u._id.toString());
              const total = empClaims.reduce((sum, c) => sum + c.amount, 0);
              const approved = empClaims.filter(c => c.status === 'Approved & Settled').reduce((sum, c) => sum + c.amount, 0);
              const pending = empClaims.filter(c => ['Submitted', 'Pending Finance', 'Pending Settlement'].includes(c.status)).reduce((sum, c) => sum + c.amount, 0);
              return `
                <tr>
                  <td>${u.employeeId || 'N/A'}</td>
                  <td>${u.name}</td>
                  <td>${u.department ? u.department.name : 'Unassigned'}</td>
                  <td>${empClaims.length}</td>
                  <td>₹${approved.toFixed(2)}</td>
                  <td>₹${pending.toFixed(2)}</td>
                  <td><strong>₹${total.toFixed(2)}</strong></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- AUDIT RECOMMENDATIONS & CONCLUSION -->
        <h1>Recommendations & Conclusion</h1>
        <p>
          1. <strong>Budget Compliance:</strong> Departments like <strong>${data.summary.highestSpendingDept}</strong> exhibit high-frequency expenditure volumes. It is recommended to review the category parameters and limit alerts.
          <br>
          2. <strong>OCR Integration:</strong> Ensure receipt match validations are strictly verified before accounts settlement to block policy violations.
          <br>
          3. <strong>Payment Settle SLA:</strong> The average settlement time between verification and bank transfer can be optimized by initiating automated daily ACH batches.
        </p>

        <!-- SIGNATURE SECTION -->
        <table class="signature-box">
          <tr>
            <td>Prepared By: ___________________</td>
            <td style="text-align: right;">Verified & Approved By: ___________________</td>
          </tr>
          <tr>
            <td>Finance Officer Signature</td>
            <td style="text-align: right;">Authorized Auditor Signature</td>
          </tr>
        </table>

        <div class="footer">
          Fluid Controls Pvt. Ltd. &bull; Page 1 of 1 &bull; System Generated Document
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'application/vnd.ms-word');
    res.setHeader('Content-Disposition', 'attachment; filename=Fluid_Controls_Executive_Report.doc');
    res.send(wordHtml);
  } catch (error) {
    next(error);
  }
};

// 3. EXPORT PRINTABLE PDF REPORT (Generates standard HTML layout with print trigger)
export const exportPdfReport = async (req, res, next) => {
  try {
    const data = await gatherReportData(req);
    const dateStr = new Date().toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // Generate a print-ready HTML template. The frontend can display this or download it, 
    // and trigger `window.print()` to print as PDF with native headers/footers/signature lines.
    const pdfHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fluid Controls Pvt. Ltd. Expense Report</title>
        <style>
          @media print {
            body { font-size: 11px; margin: 20px; }
            .no-print { display: none; }
            .page-break { page-break-before: always; }
          }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 30px; max-width: 900px; margin: 0 auto; line-height: 1.5; }
          .header { border-bottom: 2.5px solid #0f172a; padding-bottom: 12px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
          .company-name { font-size: 20px; font-weight: 800; color: #0284c7; text-transform: uppercase; }
          .report-title { font-size: 16px; font-weight: bold; text-align: right; color: #475569; }
          .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px; font-size: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; }
          .meta-item strong { color: #475569; }
          h2 { font-size: 14px; border-left: 4px solid #0284c7; padding-left: 8px; color: #0f172a; margin-top: 30px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 25px; }
          th { background: #f1f5f9; color: #334155; padding: 8px; font-size: 10.5px; text-align: left; font-weight: bold; border-bottom: 2px solid #cbd5e1; border-top: 1px solid #e2e8f0; }
          td { padding: 8px; font-size: 10.5px; border-bottom: 1px solid #e2e8f0; text-align: left; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 25px; }
          .kpi-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
          .kpi-title { font-size: 9.5px; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .kpi-val { font-size: 14.5px; font-weight: bold; color: #0f172a; margin-top: 4px; }
          .signature-box { width: 100%; border: none; margin-top: 50px; }
          .signature-box td { border: none; font-size: 11px; padding: 25px 0 0 0; }
          .footer-section { text-align: center; font-size: 9.5px; color: #94a3b8; border-top: 1px solid #e2e8f0; margin-top: 60px; padding-top: 10px; }
          .btn-print { background: #0284c7; color: white; padding: 10px 18px; border: none; border-radius: 6px; font-weight: bold; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
        </style>
      </head>
      <body>
        <div class="no-print" style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 18px; border-radius: 8px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 12.5px; color: #166534; font-weight: 600;">Print Portal Enabled. Click print to generate PDF file.</span>
          <button class="btn-print" onclick="window.print()">Print Document</button>
        </div>

        <!-- HEADER -->
        <div class="header">
          <div class="company-name">Fluid Controls Pvt. Ltd.</div>
          <div class="report-title">Corporate Audit Audit Report</div>
        </div>

        <!-- META DETAILS -->
        <div class="meta-grid">
          <div class="meta-item"><strong>Generated By:</strong> ${req.user.name} (${req.user.role})</div>
          <div class="meta-item"><strong>Department:</strong> ${req.user.department ? req.user.department.name : 'Finance & Audit'}</div>
          <div class="meta-item"><strong>Generated Date & Time:</strong> ${dateStr}</div>
          <div class="meta-item"><strong>Report Period:</strong> Current Audit Cycle (INR Base)</div>
        </div>

        <!-- KPI SUMMARY CARDS -->
        <h2>Summary Indicators</h2>
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-title">Total Spend</div><div class="kpi-val">₹${data.summary.totalAmount.toFixed(2)}</div></div>
          <div class="kpi-card"><div class="kpi-title">Approved</div><div class="kpi-val">₹${data.summary.approvedAmount.toFixed(2)}</div></div>
          <div class="kpi-card"><div class="kpi-title">Pending</div><div class="kpi-val">₹${data.summary.pendingAmount.toFixed(2)}</div></div>
          <div class="kpi-card"><div class="kpi-title">Rejected</div><div class="kpi-val">₹${data.summary.rejectedAmount.toFixed(2)}</div></div>
        </div>

        <!-- DEPARTMENT EXPENSES -->
        <h2>Department-wise Performance</h2>
        <table>
          <thead>
            <tr>
              <th>Dept Name</th>
              <th>Allotted Budget</th>
              <th>Spent Amount</th>
              <th>Approved Amount</th>
              <th>Pending Amount</th>
            </tr>
          </thead>
          <tbody>
            ${data.allDepartments.map(d => {
              const deptClaims = data.claims.filter(c => c.department && c.department._id.toString() === d._id.toString());
              const total = deptClaims.reduce((sum, c) => sum + c.amount, 0);
              const approved = deptClaims.filter(c => c.status === 'Approved & Settled').reduce((sum, c) => sum + c.amount, 0);
              const pending = deptClaims.filter(c => ['Submitted', 'Pending Finance', 'Pending Settlement'].includes(c.status)).reduce((sum, c) => sum + c.amount, 0);
              return `
                <tr>
                  <td><strong>${d.name}</strong></td>
                  <td>₹${d.budget.toFixed(2)}</td>
                  <td>₹${total.toFixed(2)}</td>
                  <td>₹${approved.toFixed(2)}</td>
                  <td>₹${pending.toFixed(2)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- CATEGORY WISE REPORT -->
        <h2>Category Distribution</h2>
        <table>
          <thead>
            <tr>
              <th>Expense Category</th>
              <th>Claims Count</th>
              <th>Total Spent (INR)</th>
              <th>Percentage Share</th>
            </tr>
          </thead>
          <tbody>
            ${await Promise.all(
              (await ExpenseCategory.find()).map(async (cat) => {
                const catClaims = data.claims.filter(c => c.category && c.category._id.toString() === cat._id.toString());
                const total = catClaims.reduce((sum, c) => sum + c.amount, 0);
                const pct = data.summary.totalAmount > 0 ? (total / data.summary.totalAmount) * 100 : 0;
                return `
                  <tr>
                    <td>${cat.name}</td>
                    <td>${catClaims.length} Claims</td>
                    <td>₹${total.toFixed(2)}</td>
                    <td>${pct.toFixed(2)}%</td>
                  </tr>
                `;
              })
            ).then(results => results.join(''))}
          </tbody>
        </table>

        <div class="page-break"></div>

        <!-- DETAILED EXPENDITURE TABLE -->
        <h2>Itemized Claims Audit</h2>
        <table>
          <thead>
            <tr>
              <th>Claim ID</th>
              <th>Employee</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.claims.slice(0, 15).map(c => `
              <tr>
                <td>${c.id}</td>
                <td>${c.employee ? c.employee.name : 'Unknown'}</td>
                <td>${c.category ? c.category.name : 'N/A'}</td>
                <td>₹${c.amount.toFixed(2)}</td>
                <td>${new Date(c.date).toLocaleDateString()}</td>
                <td>${c.status}</td>
              </tr>
            `).join('')}
            ${data.claims.length > 15 ? `<tr><td colspan="6" style="text-align: center; color: #64748b;">And ${data.claims.length - 15} more claims itemized in full spreadsheet database.</td></tr>` : ''}
          </tbody>
        </table>

        <!-- SIGNATURE AND VERIFICATION -->
        <h2>Authorization Signatures</h2>
        <table class="signature-box">
          <tr>
            <td>Prepared By: ___________________</td>
            <td style="text-align: right;">Verified By: ___________________</td>
          </tr>
          <tr>
            <td>(Finance Officer / Accounts Executive)</td>
            <td style="text-align: right;">(Department Head / Auditor Approval)</td>
          </tr>
        </table>

        <!-- FOOTER -->
        <div class="footer-section">
          Fluid Controls Pvt. Ltd. &bull; System Generated Printable PDF &bull; Page 1 of 1
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(pdfHtml);
  } catch (error) {
    next(error);
  }
};
