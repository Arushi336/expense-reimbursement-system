import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses } from '../../hooks/useExpenses';
import api from '../../services/api';
import DashboardCard from '../../components/DashboardCard/DashboardCard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import { 
  FiDollarSign, FiClock, FiAlertCircle, FiTrendingUp, 
  FiPlus, FiChevronRight, FiFileText, FiActivity, FiCheckCircle
} from 'react-icons/fi';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const { expenses, fetchExpenses, loading: expensesLoading } = useExpenses();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchExpenses({ employee: user._id });
    
    const fetchStats = async () => {
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

    const fetchActivity = async () => {
      try {
        const res = await api.get('/notifications');
        if (res.data.success) {
          setActivities(res.data.data.slice(0, 4));
        }
      } catch (err) {
        console.error(err.message);
      }
    };

    fetchStats();
    fetchActivity();
  }, [user, fetchExpenses]);

  const budgetAllotted = user.allottedBudget || 15000;
  const totalReimbursed = stats?.totalReimbursed || 0;
  const budgetPercentage = Math.min(Math.round((totalReimbursed / budgetAllotted) * 100), 100);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-corporate-950 to-slate-900 p-8 rounded-2xl text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-corporate-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-40 h-40 bg-corporate-600/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Welcome Back, {user.name}!</h1>
          <p className="text-sm text-slate-300 mt-1">Submit new claims, review approval status, and manage department quotas.</p>
        </div>
        <button
          onClick={() => navigate('/submit-expense')}
          className="relative z-10 flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl text-sm shadow-md transition-all active:scale-95 shrink-0 button-premium"
        >
          <FiPlus size={16} /> File New Claim
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statsLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-2/3"></div>
              <div className="h-8 bg-slate-200 rounded w-1/2"></div>
            </div>
          ))
        ) : (
          <>
            <DashboardCard
              title="Total Claims"
              value={`${stats?.totalClaims || 0} claims`}
              subtext="Accumulated submissions"
              icon={FiFileText}
            />
            <DashboardCard
              title="Pending"
              value={`${stats?.pending || 0} claims`}
              subtext="Awaiting review decision"
              icon={FiClock}
            />
            <DashboardCard
              title="Approved"
              value={`${stats?.approved || 0} claims`}
              subtext="Passed validation checks"
              icon={FiCheckCircle}
              trendType="positive"
            />
            <DashboardCard
              title="Rejected"
              value={`${stats?.rejected || 0} claims`}
              subtext="Returned or non-compliant"
              icon={FiAlertCircle}
              trendType={(stats?.rejected || 0) > 0 ? 'negative' : 'neutral'}
            />
            <DashboardCard
              title="Reimbursed"
              value={`₹${totalReimbursed.toFixed(2)}`}
              subtext="Fully disbursed payouts"
              icon={FiDollarSign}
              trendType="positive"
            />
          </>
        )}
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Claims */}
        <div className="lg:col-span-2 card-premium rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900">Recent Claims</h2>
              <button 
                onClick={() => navigate('/expense-history')}
                className="text-xs font-semibold text-corporate-600 hover:text-corporate-700 flex items-center gap-1 hover:underline"
              >
                View History <FiChevronRight />
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold text-xs uppercase">
                    <th className="pb-3 pr-2">ID</th>
                    <th className="pb-3">Title</th>
                    <th className="pb-3 text-right">Amount</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expensesLoading ? (
                    [...Array(3)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-4"><div className="h-3 bg-slate-200 rounded w-12"></div></td>
                        <td className="py-4"><div className="h-3 bg-slate-200 rounded w-28"></div></td>
                        <td className="py-4"><div className="h-3 bg-slate-200 rounded w-16 float-right"></div></td>
                        <td className="py-4"><div className="h-3 bg-slate-200 rounded w-16"></div></td>
                        <td className="py-4"><div className="h-6 bg-slate-200 rounded w-20 float-right"></div></td>
                      </tr>
                    ))
                  ) : (
                    expenses.slice(0, 4).map((exp) => (
                      <tr key={exp._id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 pr-2 font-mono text-xs text-slate-500">{exp.id}</td>
                        <td className="py-3 font-semibold text-slate-800">
                          {exp.title}
                          <span className="block text-[10px] text-slate-400 font-normal">{exp.category?.name} &bull; {exp.merchant}</span>
                        </td>
                        <td className="py-3 text-right font-bold text-slate-800">₹{exp.amount.toFixed(2)}</td>
                        <td className="py-3 text-slate-500 text-xs">{new Date(exp.date).toLocaleDateString()}</td>
                        <td className="py-3 text-right">
                          <StatusBadge status={exp.status} />
                        </td>
                      </tr>
                    ))
                  )}
                  {expenses.length === 0 && !expensesLoading && (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400 font-medium">
                        No claims filed yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Quota & Recent Activity Feed */}
        <div className="space-y-6">
          {/* Budget Progress */}
          <div className="card-premium rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="text-md font-bold text-slate-900">Yearly Budget Quota</h2>
              <p className="text-xs text-slate-500">Corporate allowance utilization tracker</p>
            </div>
            
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Allotted Budget Utilization</span>
                <span>{budgetPercentage}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border">
                <div 
                  className="h-full bg-gradient-to-r from-corporate-500 to-corporate-600 rounded-full transition-all duration-500" 
                  style={{ width: `${budgetPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>Spent: ₹{totalReimbursed.toFixed(2)}</span>
                <span>Limit: ₹{budgetAllotted.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Recent Activity Panel */}
          <div className="card-premium rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="text-md font-bold text-slate-900 flex items-center gap-1.5"><FiActivity className="text-corporate-600" /> Recent Activity</h2>
              <p className="text-xs text-slate-500">Chronological history of claim updates</p>
            </div>

            <div className="space-y-3">
              {activities.length > 0 ? (
                activities.map((act) => (
                  <div key={act._id} className="flex gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-corporate-500 mt-1.5 shrink-0"></span>
                    <div className="text-xs leading-relaxed text-slate-700">
                      <p>{act.message}</p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{new Date(act.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs font-medium">
                  No recent activity records.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
