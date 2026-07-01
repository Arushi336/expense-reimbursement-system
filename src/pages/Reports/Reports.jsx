import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  CategorySpendChart, 
  DepartmentSpendChart, 
  MonthlyTrendChart,
  ApprovalTimeChart 
} from '../../components/Charts/ExpenseCharts';
import { FiPieChart, FiBarChart2, FiTrendingUp, FiCheckCircle } from 'react-icons/fi';

const Reports = () => {
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [approvalTimeData, setApprovalTimeData] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const [resMonthly, resCategory, resDept, resDashboard, resApprovalTime] = await Promise.all([
          api.get('/reports/monthly'),
          api.get('/reports/category'),
          api.get('/reports/department'),
          api.get('/reports/dashboard'),
          api.get('/reports/approval-time')
        ]);

        if (resMonthly.data.success) setMonthlyData(resMonthly.data.data);
        if (resCategory.data.success) setCategoryData(resCategory.data.data);
        if (resDept.data.success) setDepartmentData(resDept.data.data);
        if (resDashboard.data.success) setDashboardStats(resDashboard.data.data);
        if (resApprovalTime.data.success) setApprovalTimeData(resApprovalTime.data.data);
      } catch (err) {
        console.error('Error fetching report analytics:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  const totalSpend = dashboardStats?.totalReimbursementAmount || dashboardStats?.totalReimbursed || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-display">Spend Reports & Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Interactive graphics depicting operational expenditure and policy compliance rates.</p>
      </div>

      {/* Analysis Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 space-y-2 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
              <div className="h-6 bg-slate-200 rounded w-2/3"></div>
            </div>
          ))
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-corporate-50 rounded-lg text-corporate-600">
                <FiBarChart2 size={24} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cumulative Corporate Spent</span>
                <span className="text-xl font-bold text-slate-900">₹{totalSpend.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-rose-50 rounded-lg text-rose-600 border border-rose-100">
                <FiPieChart size={24} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Out of Policy Flagged</span>
                <span className="text-xl font-bold text-slate-900">14.8% of claims</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100">
                <FiCheckCircle size={24} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SLA Compliance Rate</span>
                <span className="text-xl font-bold text-slate-900">96.4%</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Spend Card */}
        <div className="card-premium rounded-2xl p-6">
          <div>
            <h2 className="text-md font-bold text-slate-900 mb-1">Expenditure by Category</h2>
            <p className="text-xs text-slate-500 mb-4">Percentage breakdown of processed claims</p>
          </div>
          {loading ? (
            <div className="h-80 bg-slate-100 rounded-xl animate-pulse" />
          ) : (
            <CategorySpendChart data={categoryData} />
          )}
        </div>

        {/* Department Spent vs Budget Card */}
        <div className="card-premium rounded-2xl p-6">
          <div>
            <h2 className="text-md font-bold text-slate-900 mb-1">Department Budget Comparison</h2>
            <p className="text-xs text-slate-500 mb-4">Total spent against annual allocation budget</p>
          </div>
          {loading ? (
            <div className="h-80 bg-slate-100 rounded-xl animate-pulse" />
          ) : (
            <DepartmentSpendChart data={departmentData} />
          )}
        </div>

        {/* Monthly Trend Area Chart */}
        <div className="card-premium rounded-2xl p-6 lg:col-span-2">
          <div>
            <h2 className="text-md font-bold text-slate-900 mb-1">Reimbursement Monthly Timeline</h2>
            <p className="text-xs text-slate-500 mb-4">Aggregated spending logs from current fiscal year</p>
          </div>
          {loading ? (
            <div className="h-80 bg-slate-100 rounded-xl animate-pulse" />
          ) : (
            <MonthlyTrendChart data={monthlyData} />
          )}
        </div>

        {/* Approval Time Analysis Line Chart */}
        <div className="card-premium rounded-2xl p-6 lg:col-span-2">
          <div>
            <h2 className="text-md font-bold text-slate-900 mb-1">Approval Time Analysis</h2>
            <p className="text-xs text-slate-500 mb-4">Average approval speed metrics in days for departments and audits</p>
          </div>
          {loading ? (
            <div className="h-80 bg-slate-100 rounded-xl animate-pulse" />
          ) : (
            <ApprovalTimeChart data={approvalTimeData} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
