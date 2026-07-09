import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses } from '../../hooks/useExpenses';
import api from '../../services/api';
import DashboardCard from '../../components/DashboardCard/DashboardCard';
import ExpenseTable from '../../components/Tables/ExpenseTable';
import { FiUsers, FiClock, FiDollarSign, FiAlertTriangle } from 'react-icons/fi';

const HODDashboard = () => {
  const { user } = useAuth();
  const { expenses, fetchExpenses, executeApproval } = useExpenses();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStatsAndClaims = async () => {
    fetchExpenses({ department: user.department?._id });
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
    if (user.department?._id) {
      fetchStatsAndClaims();
    }
  }, [user]);

  const handleAction = async (expenseId, nextStatus, comment) => {
    // Map status string back to action type
    let action = 'Approve';
    if (nextStatus === 'Queried' || nextStatus === 'Returned for Correction') {
      action = 'Return for Correction';
    } else if (nextStatus === 'Rejected') {
      action = 'Reject';
    }
    
    await executeApproval(expenseId, action, comment);
    // Refresh stats
    fetchStatsAndClaims();
  };

  const getAverageApprovalTime = () => {
    const approvedClaims = expenses.filter(c => 
      c.history && c.history.length > 0 && 
      c.history.some(h => h.action === 'Approve' && h.role === 'HOD')
    );
    
    if (approvedClaims.length === 0) return 'N/A';
    
    let totalMs = 0;
    let count = 0;
    
    approvedClaims.forEach(c => {
      const submitLog = c.history.find(h => h.action === 'Submit');
      const approveLog = c.history.find(h => h.action === 'Approve' && h.role === 'HOD');
      
      if (submitLog && approveLog) {
        const diffMs = new Date(approveLog.timestamp) - new Date(submitLog.timestamp);
        if (diffMs > 0) {
          totalMs += diffMs;
          count++;
        }
      }
    });
    
    if (count === 0) return 'N/A';
    
    const avgDays = (totalMs / (1000 * 60 * 60 * 24));
    if (avgDays < 0.1) {
      const avgHours = (totalMs / (1000 * 60 * 60));
      return `${avgHours.toFixed(1)} Hours`;
    }
    return `${avgDays.toFixed(1)} Days`;
  };

  const totalApproved = stats?.totalApprovedAmount || 0;
  const deptBudget = user.department?.budget || 120000;
  const budgetUsagePercent = Math.min(Math.round((totalApproved / deptBudget) * 100), 100);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-corporate-950 to-slate-900 p-8 rounded-2xl text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-corporate-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-40 h-40 bg-corporate-600/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Department Head Console</h1>
          <p className="text-sm text-slate-300 mt-1">Managing approvals for <strong className="text-corporate-300">{user.department?.name || 'Unassigned'} Department</strong></p>
        </div>
      </div>

      {/* KPI Cards */}
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
              title="Pending Approvals"
              value={`${stats?.pendingReviews || 0} Claims`}
              subtext="Awaiting department head review"
              icon={FiClock}
              trend={stats?.pendingReviews > 0 ? 'Action Needed' : 'Clear'}
              trendType={stats?.pendingReviews > 0 ? 'negative' : 'positive'}
            />
            <DashboardCard
              title="Department Spend"
              value={`₹${totalApproved.toFixed(2)}`}
              subtext={`Allotted Limit: ₹${deptBudget.toLocaleString()}`}
              icon={FiDollarSign}
            />
            <DashboardCard
              title="Average Approval Time"
              value={getAverageApprovalTime()}
              subtext="Real-time HOD action latency"
              icon={FiClock}
              trendType="positive"
            />
          </>
        )}
      </div>

      {/* Department budget utilization progress bar */}
      <div className="card-premium rounded-2xl p-5">
        <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
          <span>Department Budget Progress</span>
          <span>{budgetUsagePercent}% Spent</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
          <div 
            className="h-full bg-gradient-to-r from-corporate-600 to-corporate-400 rounded-full transition-all duration-500" 
            style={{ width: `${budgetUsagePercent}%` }}
          />
        </div>
      </div>

      {/* Main Approvals Queue Table */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Approvals Queue</h2>
          <p className="text-xs text-slate-500">Expenses requiring first-level Department Head approval</p>
        </div>
        <ExpenseTable 
          expenses={expenses} 
          onAction={handleAction} 
          userRole="HOD" 
        />
      </div>
    </div>
  );
};

export default HODDashboard;
