import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import DashboardCard from '../../components/DashboardCard/DashboardCard';
import { FiSliders, FiActivity, FiUsers, FiLock, FiCheck } from 'react-icons/fi';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [mileageRate, setMileageRate] = useState('0.67');
  const [travelCap, setTravelCap] = useState('2000');
  const [mealsCap, setMealsCap] = useState('150');
  const [savedMsg, setSavedMsg] = useState(false);

  const fetchAdminData = async () => {
    try {
      const [resStats, resLogs, resDepts, resCats] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/admin/audit-logs'),
        api.get('/admin/departments'),
        api.get('/admin/categories')
      ]);

      if (resStats.data.success) setStats(resStats.data.data);
      if (resLogs.data.success) setLogs(resLogs.data.data.slice(0, 8));
      if (resDepts.data.success) setDepartments(resDepts.data.data);
      if (resCats.data.success) setCategories(resCats.data.data);
    } catch (err) {
      console.error('Error fetching admin data:', err.message);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavedMsg(true);
    // Mock save log
    try {
      await api.get('/admin/audit-logs'); // trigger activity
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
    setTimeout(() => setSavedMsg(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-corporate-950 to-slate-900 p-8 rounded-2xl text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-corporate-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-40 h-40 bg-corporate-600/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">System Administration Console</h1>
          <p className="text-sm text-slate-300 mt-1">Configure limits, manage compliance rules, and review security logs.</p>
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
              title="Employees"
              value={`${stats?.totalEmployees || 0} Accounts`}
              subtext="Registered corporate accounts"
              icon={FiUsers}
              trendType="positive"
            />
            <DashboardCard
              title="Claims"
              value={`${stats?.totalClaims || 0} Submissions`}
              subtext={`Total: ₹${(stats?.totalReimbursementAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`}
              icon={FiActivity}
              trendType="positive"
            />
            <DashboardCard
              title="Departments"
              value={`${departments.length} Units`}
              subtext="Budget centers configured"
              icon={FiSliders}
              trendType="neutral"
            />
          </>
        )}
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Corporate Departments List */}
        <div className="card-premium rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Departments & Budgets</h2>
            <p className="text-xs text-slate-500">Corporate units and assigned HODs</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                  <th className="pb-3">Code</th>
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Department Head</th>
                  <th className="pb-3 text-right">Annual Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {departments.map((dept) => (
                  <tr key={dept._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-2.5 font-mono text-slate-500">{dept.code}</td>
                    <td className="py-2.5 text-slate-900 font-bold">{dept.name}</td>
                    <td className="py-2.5 text-slate-600">{dept.hod?.name || 'Unassigned'}</td>
                    <td className="py-2.5 text-right font-bold text-slate-900">₹{dept.budget?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Reimbursement settings */}
        <div className="card-premium rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Global Limit Configuration</h2>
            <p className="text-xs text-slate-500 mb-6">Modify system policy caps, threshold triggers, and rates</p>
            
            {savedMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1.5 animate-fade-in">
                <FiCheck /> Configured rules updated successfully.
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Travel Reimbursement Cap (₹)</label>
                <input
                  type="number"
                  value={travelCap}
                  onChange={(e) => setTravelCap(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-corporate-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Meals & Entertainment Cap (₹)</label>
                <input
                  type="number"
                  value={mealsCap}
                  onChange={(e) => setMealsCap(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-corporate-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">IRS Standard Mileage Rate (₹ / Km)</label>
                <input
                  type="text"
                  value={mileageRate}
                  onChange={(e) => setMileageRate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-corporate-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-corporate-600 hover:bg-corporate-700 text-white font-bold text-sm rounded-lg shadow transition"
              >
                Apply Setting Modifications
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Admin Audit Log Table */}
      <div className="card-premium rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Security Audit Logs</h2>
          <p className="text-xs text-slate-500">Immutable chronological record of administrative actions</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Actor</th>
                <th className="pb-3">Action</th>
                <th className="pb-3">Transaction Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3 font-mono text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="py-3 text-slate-900 font-bold">{log.actor?.name || 'System'} ({log.actor?.role || 'Admin'})</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 bg-slate-100 rounded border font-semibold text-slate-600">{log.action}</span>
                  </td>
                  <td className="py-3 text-slate-600">{log.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
