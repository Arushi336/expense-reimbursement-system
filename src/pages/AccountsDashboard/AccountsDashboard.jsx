import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses } from '../../hooks/useExpenses';
import api from '../../services/api';
import DashboardCard from '../../components/DashboardCard/DashboardCard';
import ExpenseTable from '../../components/Tables/ExpenseTable';
import { FiDollarSign, FiClock, FiCheckSquare, FiFolderPlus } from 'react-icons/fi';

const AccountsDashboard = () => {
  const { user } = useAuth();
  const { expenses, fetchExpenses, executePayment, executeApproval } = useExpenses();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchStatsAndClaims = async () => {
    fetchExpenses();
    try {
      const res = await api.get('/reports/dashboard');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error(err.message);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsAndClaims();
  }, []);

  const handleAction = async (expenseId, nextStatus, comment) => {
    if (nextStatus === 'Approved & Settled') {
      await executePayment(expenseId, comment || `TXN-${Date.now()}`);
    } else {
      let action = 'Approve';
      if (nextStatus === 'Returned for Correction') {
        action = 'Return for Correction';
      } else if (nextStatus === 'Rejected') {
        action = 'Reject';
      }
      await executeApproval(expenseId, action, comment);
    }
    fetchStatsAndClaims();
  };

  const handleGenerateACHBatch = async () => {
    const pendingSettlement = expenses.filter(e => e.status === 'Pending Settlement');
    if (pendingSettlement.length === 0) {
      setSuccessMsg('No claims pending settlement.');
      setTimeout(() => setSuccessMsg(''), 3000);
      return;
    }

    try {
      setStatsLoading(true);
      // Compile direct deposit records
      const headers = ['RecordType', 'BankRouting', 'BankAccount', 'EmployeeName', 'Amount', 'RefID'];
      const rows = pendingSettlement.map(e => [
        'ACH-CR', '021000021', '1234567890', e.employeeName, e.amount.toFixed(2), e.id
      ]);
      const fileContent = "data:text/plain;charset=utf-8," 
        + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(fileContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `ACH_direct_deposit_batch_${new Date().toISOString().split('T')[0]}.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Execute settlements in backend
      for (const claim of pendingSettlement) {
        const batchTxnId = `BATCH-${Date.now().toString().slice(-6)}-${claim.id}`;
        await executePayment(claim._id, batchTxnId, 'ACH Payout');
      }

      setSuccessMsg(`Successfully generated bank ACH direct deposit file and settled ${pendingSettlement.length} claims.`);
      fetchStatsAndClaims();
    } catch (err) {
      console.error(err.message);
    } finally {
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-corporate-950 to-slate-900 p-8 rounded-2xl text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-corporate-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-40 h-40 bg-corporate-600/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Accounts Payable Settler</h1>
          <p className="text-sm text-slate-300 mt-1">Disburse payments, generate direct deposit batches, and reconcile bank transfers.</p>
        </div>
        <button
          onClick={handleGenerateACHBatch}
          className="relative z-10 flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl text-sm shadow-md transition-all active:scale-95 shrink-0 button-premium"
        >
          <FiFolderPlus size={16} /> Generate ACH Transfer Batch
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold rounded-xl animate-fade-in">
          {successMsg}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {statsLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-2/3"></div>
              <div className="h-8 bg-slate-200 rounded w-1/2"></div>
            </div>
          ))
        ) : (
          <>
            <DashboardCard
              title="Pending Payments"
              value={`${stats?.pendingPayments || 0} Claims`}
              subtext={`Total value: ₹${(stats?.pendingAmount || 0).toFixed(2)}`}
              icon={FiClock}
              trend={stats?.pendingPayments > 0 ? 'Pending Payout' : 'Queue Settled'}
              trendType={stats?.pendingPayments > 0 ? 'negative' : 'positive'}
            />
            <DashboardCard
              title="Completed Payments"
              value={`${stats?.completedPayments || 0} Claims`}
              subtext={`Total paid: ₹${(stats?.completedAmount || 0).toFixed(2)}`}
              icon={FiCheckSquare}
              trendType="positive"
            />
            <DashboardCard
              title="Today's Transfers"
              value={`${expenses.filter(e => e.status === 'Approved & Settled' && new Date(e.updatedAt).toDateString() === new Date().toDateString()).length} Payouts`}
              subtext="Processed in current batch"
              icon={FiDollarSign}
              trendType="positive"
            />
          </>
        )}
      </div>

      {/* Accounts Settlement Table */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Payout Settlement List</h2>
          <p className="text-xs text-slate-500">Expenses fully audited by Finance waiting for direct bank transfer</p>
        </div>
        <ExpenseTable 
          expenses={expenses} 
          onAction={handleAction} 
          userRole="Accounts" 
        />
      </div>
    </div>
  );
};

export default AccountsDashboard;
