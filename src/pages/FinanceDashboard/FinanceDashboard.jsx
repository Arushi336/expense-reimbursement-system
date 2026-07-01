import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses } from '../../hooks/useExpenses';
import api from '../../services/api';
import DashboardCard from '../../components/DashboardCard/DashboardCard';
import ExpenseTable from '../../components/Tables/ExpenseTable';
import { FiCheckSquare, FiClock, FiAlertCircle, FiTrendingUp } from 'react-icons/fi';

const FinanceDashboard = () => {
  const { user } = useAuth();
  const { expenses, fetchExpenses, executeApproval } = useExpenses();
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
    let action = 'Approve';
    if (nextStatus === 'Queried' || nextStatus === 'Returned for Correction') {
      action = 'Return for Correction';
    } else if (nextStatus === 'Rejected') {
      action = 'Reject';
    }
    
    await executeApproval(expenseId, action, comment);
    fetchStatsAndClaims();
  };

  const handleBulkApproveCompliant = async () => {
    const pendingFinance = expenses.filter(e => e.status === 'Pending Finance');
    const compliant = pendingFinance.filter(e => !e.policyViolation);

    if (compliant.length === 0) {
      setSuccessMsg('No pending compliant claims found.');
      setTimeout(() => setSuccessMsg(''), 3000);
      return;
    }

    try {
      setStatsLoading(true);
      for (const claim of compliant) {
        await executeApproval(claim._id, 'Approve', 'Bulk approved (Fully compliant)');
      }
      setSuccessMsg(`Successfully batch-approved ${compliant.length} compliant claims.`);
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
          <h1 className="text-2xl font-bold tracking-tight">Financial Audit Console</h1>
          <p className="text-sm text-slate-300 mt-1">Reviewing global expense submissions and enforcing compliance limits.</p>
        </div>
        <button
          onClick={handleBulkApproveCompliant}
          className="relative z-10 flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl text-sm shadow-md transition-all active:scale-95 shrink-0 button-premium"
        >
          <FiCheckSquare size={16} /> Batch Approve Compliant
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
              title="Pending Verification"
              value={`${stats?.pendingVerification || 0} Claims`}
              subtext="Awaiting financial verification"
              icon={FiClock}
              trend={stats?.pendingVerification > 0 ? 'Action Pending' : 'Queue Empty'}
              trendType={stats?.pendingVerification > 0 ? 'negative' : 'positive'}
            />
            <DashboardCard
              title="Policy Violations"
              value={`${expenses.filter(e => e.policyViolation && e.status === 'Pending Finance').length} Claims`}
              subtext="Failed compliance checks"
              icon={FiAlertCircle}
              trendType={expenses.filter(e => e.policyViolation && e.status === 'Pending Finance').length > 0 ? 'negative' : 'neutral'}
            />
            <DashboardCard
              title="Rejected Claims"
              value={`${stats?.rejected || 0} Claims`}
              subtext="Total rejected this year"
              icon={FiCheckSquare}
              trendType="neutral"
            />
          </>
        )}
      </div>

      {/* Audit Table */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Audit & Validation Queue</h2>
          <p className="text-xs text-slate-500">Global listing of claims that have passed department HOD approval</p>
        </div>
        <ExpenseTable 
          expenses={expenses} 
          onAction={handleAction} 
          userRole="Finance" 
        />
      </div>
    </div>
  );
};

export default FinanceDashboard;
