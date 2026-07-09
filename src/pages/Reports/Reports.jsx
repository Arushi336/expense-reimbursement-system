import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, 
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  FiFileText, FiDownload, FiSearch, FiFilter, FiRefreshCw, 
  FiSliders, FiUser, FiBriefcase, FiGrid, FiCalendar, 
  FiDollarSign, FiClock, FiActivity, FiCheckCircle, 
  FiAlertTriangle, FiArrowUpRight, FiList, FiTrendingUp
} from 'react-icons/fi';

const Reports = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const tabs = useMemo(() => {
    const role = user?.role;
    if (role === 'Employee') {
      return [{ id: 'export', name: 'My Export Center' }];
    }
    if (role === 'HOD') {
      return [
        { id: 'summary', name: 'Department Summary' },
        { id: 'monthly', name: 'Monthly Spend' },
        { id: 'employee', name: 'Department Employee Report' },
        { id: 'category', name: 'Category Distribution' },
        { id: 'budget', name: 'Budget Quotas' },
        { id: 'export', name: 'Export Center' }
      ];
    }
    return [
      { id: 'summary', name: 'Dashboard Summary' },
      { id: 'monthly', name: 'Monthly Spend' },
      { id: 'weekly', name: 'Weekly Spend' },
      { id: 'yearly', name: 'Yearly Spend' },
      { id: 'category', name: 'Category Distribution' },
      { id: 'budget', name: 'Budget Quotas' },
      { id: 'approval', name: 'SLA Speeds' },
      { id: 'payments', name: 'Payment Reports' },
      { id: 'export', name: 'Export Center' }
    ];
  }, [user?.role]);

  // Active Report Tab State
  const [activeTab, setActiveTab] = useState(user?.role === 'Employee' ? 'export' : 'summary');

  useEffect(() => {
    if (tabs.length > 0 && !tabs.some(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedEmp, setSelectedEmp] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [searchVal, setSearchVal] = useState('');

  // Loaded Data
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Dropdown Lists populated from metadata
  const [filterMetadata, setFilterMetadata] = useState({
    departments: [],
    employees: [],
    categories: []
  });

  // Employee-wise table search/sort/pagination states
  const [empSearch, setEmpSearch] = useState('');
  const [empSortKey, setEmpSortKey] = useState('name');
  const [empSortOrder, setEmpSortOrder] = useState('asc');
  const [empPage, setEmpPage] = useState(1);
  const rowsPerPage = 5;

  // Payments table pagination states
  const [paySearch, setPaySearch] = useState('');
  const [payPage, setPayPage] = useState(1);

  // Fetch all comprehensive data based on active filters
  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedDept) params.departmentId = selectedDept;
      if (selectedEmp) params.employeeId = selectedEmp;
      if (selectedCat) params.categoryId = selectedCat;
      if (selectedStatus) params.status = selectedStatus;
      if (minAmount) params.minAmount = minAmount;
      if (maxAmount) params.maxAmount = maxAmount;
      if (searchVal) params.search = searchVal;

      const res = await api.get('/reports/comprehensive', { params });
      if (res.data.success) {
        setReportData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching comprehensive reports:', err.message);
      showToast('Failed to load analytical reports data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Initial and Filter-triggered Loading
  useEffect(() => {
    fetchReportData();
  }, [startDate, endDate, selectedDept, selectedEmp, selectedCat, selectedStatus, minAmount, maxAmount, searchVal]);

  // Load dropdown lists (one-time metadata query)
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [resDept, resCat, resUsers] = await Promise.all([
          api.get('/reports/department'),
          api.get('/reports/category'),
          // Use dashboard or other endpoint to retrieve user list
          api.get('/reports/comprehensive')
        ]);
        
        setFilterMetadata({
          departments: resDept.data.success ? resDept.data.data : [],
          categories: resCat.data.success ? resCat.data.data : [],
          employees: resUsers.data.success && resUsers.data.data.employeeReports 
            ? resUsers.data.data.employeeReports 
            : []
        });
      } catch (err) {
        console.error('Error loading filter options:', err.message);
      }
    };
    loadMetadata();
  }, []);

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedDept('');
    setSelectedEmp('');
    setSelectedCat('');
    setSelectedStatus('');
    setMinAmount('');
    setMaxAmount('');
    setSearchVal('');
    showToast('Filters reset successfully.', 'info');
  };

  // CHECK DOWNLOAD PERMISSION LOGIC
  const checkDownloadPermission = () => {
    const role = user.role;
    if (role === 'Admin') return true;
    if (role === 'Finance') return true;
    if (role === 'Accounts') return true;
    if (role === 'HOD') return true;
    if (role === 'Employee') {
      // Employee can only view their own claims history (which is pre-filtered by matchQuery)
      return true;
    }
    return false;
  };

  // FILE EXPORT TRIGGER (XLSX, DOC, PDF)
  const handleExport = async (format) => {
    if (!checkDownloadPermission()) {
      showToast('Permission Denied: Unauthorized to export reports.', 'error');
      return;
    }

    if (!reportData || reportData.summary.totalClaims === 0) {
      showToast('No Data Available for selected filters.', 'warning');
      return;
    }

    setDownloading(true);
    showToast(`Initializing ${format.toUpperCase()} generation...`, 'info');

    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      if (selectedDept) queryParams.append('departmentId', selectedDept);
      if (selectedEmp) queryParams.append('employeeId', selectedEmp);
      if (selectedCat) queryParams.append('categoryId', selectedCat);
      if (selectedStatus) queryParams.append('status', selectedStatus);
      if (minAmount) queryParams.append('minAmount', minAmount);
      if (maxAmount) queryParams.append('maxAmount', maxAmount);
      if (searchVal) queryParams.append('search', searchVal);

      const endpoint = `/reports/export/${format}`;
      
      const response = await api.get(endpoint, {
        params: Object.fromEntries(queryParams.entries()),
        responseType: 'blob'
      });

      // Create a virtual download link
      const blob = new Blob([response.data], {
        type: response.headers['content-type']
      });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Fluid_Controls_Corporate_Report_${Date.now()}.${format === 'word' ? 'doc' : format === 'pdf' ? 'html' : 'xlsx'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`${format.toUpperCase()} Export Completed!`, 'success');
      showToast('File downloaded successfully.', 'success');
    } catch (err) {
      console.error(err.message);
      showToast('Failed to download report file.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  // Recharts Color Harmonizer
  const COLORS = ['#0284c7', '#0d9488', '#8b5cf6', '#e11d48', '#f59e0b', '#10b981', '#6366f1', '#64748b'];

  // FILTERED & SORTED EMPLOYEE REPORT
  const sortedEmployeeReports = useMemo(() => {
    if (!reportData || !reportData.employeeReports) return [];
    
    // 1. Search text filter
    let list = reportData.employeeReports.filter(emp => 
      emp.name.toLowerCase().includes(empSearch.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(empSearch.toLowerCase()) ||
      emp.department.toLowerCase().includes(empSearch.toLowerCase())
    );

    // 2. Sorting
    list.sort((a, b) => {
      let valA = a[empSortKey];
      let valB = b[empSortKey];
      
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return empSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return empSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [reportData, empSearch, empSortKey, empSortOrder]);

  // PAGINATED EMPLOYEE ROWS
  const paginatedEmployees = useMemo(() => {
    const startIndex = (empPage - 1) * rowsPerPage;
    return sortedEmployeeReports.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedEmployeeReports, empPage]);

  // FILTERED PAYMENTS REPORT
  const filteredPayments = useMemo(() => {
    if (!reportData || !reportData.payments) return [];
    return reportData.payments.filter(pay => 
      pay.transactionId.toLowerCase().includes(paySearch.toLowerCase()) ||
      pay.employeeName.toLowerCase().includes(paySearch.toLowerCase()) ||
      (pay.bankReference && pay.bankReference.toLowerCase().includes(paySearch.toLowerCase()))
    );
  }, [reportData, paySearch]);

  const paginatedPayments = useMemo(() => {
    const startIndex = (payPage - 1) * rowsPerPage;
    return filteredPayments.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredPayments, payPage]);

  if (loading && !reportData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <FiRefreshCw className="animate-spin text-corporate-600" size={32} />
        <span className="text-sm font-semibold text-slate-500">Loading comprehensive ERP analytics...</span>
      </div>
    );
  }

  const s = reportData?.summary || {
    totalClaims: 0, totalAmount: 0, approvedAmount: 0, pendingAmount: 0, rejectedAmount: 0,
    approvedCount: 0, pendingCount: 0, rejectedCount: 0, totalEmployees: 0, avgClaimAmount: 0,
    highestSpendingDept: 'N/A', mostUsedCategory: 'N/A'
  };

  return (
    <div className="space-y-6">
      {/* Header and Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Reports & Analytics Panel</h1>
          <p className="text-xs text-slate-500 mt-1">Enterprise-grade financial summaries, category limits, and bank wire logs (Zoho/SAP Interface).</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchReportData}
            className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-600 transition flex items-center gap-1.5 text-xs font-semibold"
          >
            <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* ADVANCED FILTERING PANEL */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm pb-2 border-b border-slate-100">
          <FiFilter className="text-corporate-600" size={16} />
          <span>Advanced Analytical Filters</span>
        </div>

        <div className="relative w-full">
          <FiSearch className="absolute left-3.5 top-3 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search report records by employee name, employee ID, department, category, status..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-corporate-500 bg-slate-50/30 font-semibold text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Date range inputs */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Start Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-500 bg-slate-50/50"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">End Date</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-500 bg-slate-50/50"
            />
          </div>

          {/* Department filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Department</label>
            <select 
              value={selectedDept} 
              onChange={(e) => setSelectedDept(e.target.value)}
              disabled={user.role === 'Employee' || user.role === 'HOD'}
              className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-500 bg-slate-50/50 font-medium"
            >
              <option value="">All Departments</option>
              {filterMetadata.departments.map(d => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Category</label>
            <select 
              value={selectedCat} 
              onChange={(e) => setSelectedCat(e.target.value)}
              className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-500 bg-slate-50/50 font-medium"
            >
              <option value="">All Categories</option>
              {filterMetadata.categories.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Employee selection (Admin/Finance/HOD only) */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Employee</label>
            <select 
              value={selectedEmp} 
              onChange={(e) => setSelectedEmp(e.target.value)}
              disabled={user.role === 'Employee'}
              className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-500 bg-slate-50/50 font-medium"
            >
              <option value="">All Employees</option>
              {filterMetadata.employees.map(e => (
                <option key={e.email} value={e.email}>{e.name} (${e.employeeId})</option>
              ))}
            </select>
          </div>

          {/* Status selector */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Claim Status</label>
            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-500 bg-slate-50/50 font-medium"
            >
              <option value="">All Statuses</option>
              <option value="Submitted">Submitted (Pending HOD)</option>
              <option value="Pending Finance">Pending Finance Audit</option>
              <option value="Pending Settlement">Pending Accounts Settle</option>
              <option value="Approved & Settled">Approved & Settled</option>
              <option value="Returned for Correction">Returned for Correction</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Amount range */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Min Amount (₹)</label>
            <input 
              type="number" 
              placeholder="e.g. 500" 
              value={minAmount} 
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-500 bg-slate-50/50"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Max Amount (₹)</label>
            <input 
              type="number" 
              placeholder="e.g. 10000" 
              value={maxAmount} 
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-500 bg-slate-50/50"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button 
            onClick={handleResetFilters}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* METRIC SUMMARIES (9 KPI CARDS GRID) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Claims Count</span>
          <span className="text-xl font-bold text-slate-900 mt-2">{s.totalClaims} Claims</span>
          <span className="text-[9px] text-slate-400 font-semibold mt-1">Processed in current filters</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Claims Spend</span>
          <span className="text-xl font-bold text-slate-900 mt-2">₹{s.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
          <span className="text-[9px] text-slate-400 font-semibold mt-1">Cumulative cost index</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between border-l-4 border-l-emerald-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approved & Settled</span>
          <span className="text-xl font-bold text-emerald-600 mt-2">₹{s.approvedAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
          <span className="text-[9px] text-slate-400 font-semibold mt-1">{s.approvedCount} approved claims</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between border-l-4 border-l-amber-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Audit Pipeline</span>
          <span className="text-xl font-bold text-amber-600 mt-2">₹{s.pendingAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
          <span className="text-[9px] text-slate-400 font-semibold mt-1">{s.pendingCount} pending claims</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between border-l-4 border-l-rose-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rejected Volume</span>
          <span className="text-xl font-bold text-rose-600 mt-2">₹{s.rejectedAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
          <span className="text-[9px] text-slate-400 font-semibold mt-1">{s.rejectedCount} rejected claims</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Active Users</span>
            <span className="text-md font-bold text-slate-800 mt-1 block">{s.totalEmployees} Employees</span>
          </div>
          <FiUser className="text-slate-400" size={20} />
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Average Claims Cost</span>
            <span className="text-md font-bold text-slate-800 mt-1 block">₹{s.avgClaimAmount.toLocaleString('en-IN', {maximumFractionDigits: 2})}</span>
          </div>
          <FiDollarSign className="text-slate-400" size={20} />
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Highest Spend Department</span>
            <span className="text-md font-bold text-slate-800 mt-1 block truncate max-w-[150px]">{s.highestSpendingDept}</span>
          </div>
          <FiBriefcase className="text-slate-400" size={20} />
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Top Utilized Category</span>
            <span className="text-md font-bold text-slate-800 mt-1 block truncate max-w-[150px]">{s.mostUsedCategory}</span>
          </div>
          <FiGrid className="text-slate-400" size={20} />
        </div>
      </div>

      {/* REPORT SELECTOR TAB LIST */}
      <div className="border-b border-slate-200">
        <nav className="flex flex-wrap -mb-px gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3.5 pt-2 px-3 text-xs font-bold border-b-2 transition ${
                activeTab === tab.id 
                  ? 'border-corporate-600 text-corporate-700' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* RENDERING DYNAMIC TAB MODULES */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <FiRefreshCw className="animate-spin text-slate-400" size={28} />
            <span className="text-xs font-semibold text-slate-400">Updating dashboard reports data...</span>
          </div>
        ) : (
          <>
            {/* 1. DASHBOARD SUMMARY TAB (CHARTS OVERVIEW) */}
            {activeTab === 'summary' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-bold text-slate-900">Corporate Expenditures Summary</h3>
                  <p className="text-xs text-slate-500">Distribution analysis of total claims spends and categories.</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Category Spend Chart */}
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/20">
                    <span className="text-xs font-bold text-slate-700 block mb-4">Reimbursements by Category</span>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reportData?.categoryReports || []}
                            dataKey="totalAmount"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                          >
                            {(reportData?.categoryReports || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                          <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ fontSize: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Department comparison Chart */}
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/20">
                    <span className="text-xs font-bold text-slate-700 block mb-4">Department Spent vs Budget Allocation</span>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData?.departmentReports || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                          <YAxis tick={{ fontSize: 9 }} />
                          <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                          <Bar dataKey="totalAmount" name="Total Claimed" fill="#0284c7" />
                          <Bar dataKey="approvedAmount" name="Approved" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. MONTHLY EXPENSE REPORT */}
            {activeTab === 'monthly' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-bold text-slate-900">Monthly Expenditures Timeline</h3>
                  <p className="text-xs text-slate-500">Aggregated spent values and timeline trends.</p>
                </div>
                
                <div className="h-80 border border-slate-100 rounded-xl p-4 bg-slate-50/20">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reportData?.monthlyTrends || []}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Area type="monotone" dataKey="Total" name="Cumulative Spend" stroke="#0284c7" fillOpacity={1} fill="url(#colorTotal)" />
                      <Area type="monotone" dataKey="Approved" name="Approved & Settled" stroke="#10b981" fillOpacity={0} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase font-bold border-b">
                        <th className="p-3">Reporting Month</th>
                        <th className="p-3 text-right">Claims Filed</th>
                        <th className="p-3 text-right">Total Claimed</th>
                        <th className="p-3 text-right">Approved Amount</th>
                        <th className="p-3 text-right">Pending Amount</th>
                        <th className="p-3 text-right">Rejected Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      {(reportData?.monthlyTrends || []).map((row) => (
                        <tr key={row.name} className="hover:bg-slate-50/40">
                          <td className="p-3 font-semibold text-slate-800">{row.name}</td>
                          <td className="p-3 text-right">{row.Claims} Claims</td>
                          <td className="p-3 text-right">₹{row.Total.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right text-emerald-600 font-semibold">₹{row.Approved.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right text-amber-600">₹{row.Pending.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right text-rose-600">₹{row.Rejected.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. WEEKLY EXPENSE REPORT */}
            {activeTab === 'weekly' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-bold text-slate-900">Weekly Expenditures Timeline</h3>
                  <p className="text-xs text-slate-500">Aggregated spent values and timeline trends grouped by week commencing.</p>
                </div>
                
                <div className="h-80 border border-slate-100 rounded-xl p-4 bg-slate-50/20">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reportData?.weeklyTrends || []}>
                      <defs>
                        <linearGradient id="colorTotalWeekly" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Area type="monotone" dataKey="Total" name="Weekly Cumulative Spend" stroke="#0d9488" fillOpacity={1} fill="url(#colorTotalWeekly)" />
                      <Area type="monotone" dataKey="Approved" name="Approved & Settled" stroke="#10b981" fillOpacity={0} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase font-bold border-b">
                        <th className="p-3">Reporting Week (Monday Start)</th>
                        <th className="p-3 text-right">Claims Filed</th>
                        <th className="p-3 text-right">Total Claimed</th>
                        <th className="p-3 text-right">Approved Amount</th>
                        <th className="p-3 text-right">Pending Amount</th>
                        <th className="p-3 text-right">Rejected Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      {(reportData?.weeklyTrends || []).map((row) => (
                        <tr key={row.name} className="hover:bg-slate-50/40">
                          <td className="p-3 font-semibold text-slate-800">{row.name}</td>
                          <td className="p-3 text-right">{row.Claims} Claims</td>
                          <td className="p-3 text-right">₹{row.Total.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right text-emerald-600 font-semibold">₹{row.Approved.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right text-amber-600">₹{row.Pending.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right text-rose-600">₹{row.Rejected.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. YEARLY EXPENSE REPORT */}
            {activeTab === 'yearly' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-bold text-slate-900">Yearly Expenditures Comparison</h3>
                  <p className="text-xs text-slate-500">Aggregated spent values and timeline trends grouped by calendar year.</p>
                </div>
                
                <div className="h-80 border border-slate-100 rounded-xl p-4 bg-slate-50/20">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData?.yearlyTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Bar dataKey="Total" name="Total Spend" fill="#8b5cf6" />
                      <Bar dataKey="Approved" name="Approved & Settled" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase font-bold border-b">
                        <th className="p-3">Reporting Year</th>
                        <th className="p-3 text-right">Claims Filed</th>
                        <th className="p-3 text-right">Total Claimed</th>
                        <th className="p-3 text-right">Approved Amount</th>
                        <th className="p-3 text-right">Pending Amount</th>
                        <th className="p-3 text-right">Rejected Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      {(reportData?.yearlyTrends || []).map((row) => (
                        <tr key={row.name} className="hover:bg-slate-50/40">
                          <td className="p-3 font-semibold text-slate-800">{row.name}</td>
                          <td className="p-3 text-right">{row.Claims} Claims</td>
                          <td className="p-3 text-right">₹{row.Total.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right text-emerald-600 font-semibold">₹{row.Approved.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right text-amber-600">₹{row.Pending.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right text-rose-600">₹{row.Rejected.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. CATEGORY-WISE EXPENSE REPORT */}
            {activeTab === 'category' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-bold text-slate-900">Category-wise Expenditure Metrics</h3>
                  <p className="text-xs text-slate-500">Breakdown statistics and percentages across all category targets.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase font-bold border-b">
                        <th className="p-3">Expense Category</th>
                        <th className="p-3 text-right">Total Claims Count</th>
                        <th className="p-3 text-right">Total Spend (INR)</th>
                        <th className="p-3 text-right">Spend Percentage Ratio</th>
                        <th className="p-3">Ratio Graph</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      {(reportData?.categoryReports || []).map((row, index) => (
                        <tr key={row.name} className="hover:bg-slate-50/40">
                          <td className="p-3 font-semibold text-slate-800">{row.name}</td>
                          <td className="p-3 text-right">{row.claimsCount} Claims</td>
                          <td className="p-3 text-right font-bold">₹{row.totalAmount.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right text-corporate-600 font-bold">{row.percentage}%</td>
                          <td className="p-3 min-w-[150px]">
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border">
                              <div 
                                className="h-full rounded-full" 
                                style={{ 
                                  width: `${row.percentage}%`,
                                  backgroundColor: COLORS[index % COLORS.length] 
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. BUDGET UTILIZATION REPORT */}
            {activeTab === 'budget' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-bold text-slate-900">Department Budget Utilization Tracker</h3>
                  <p className="text-xs text-slate-500">Annual limits allocation versus cumulative settled payouts.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase font-bold border-b">
                        <th className="p-3">Department Name</th>
                        <th className="p-3 text-right">Allocated Budget</th>
                        <th className="p-3 text-right">Approved Spent</th>
                        <th className="p-3 text-right">Remaining Budget</th>
                        <th className="p-3 text-right">Utilization %</th>
                        <th className="p-3">Utilization Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      {(reportData?.budgetUtilization || []).map((row) => (
                        <tr key={row.department} className="hover:bg-slate-50/40">
                          <td className="p-3 font-bold text-slate-800">{row.department}</td>
                          <td className="p-3 text-right">₹{row.budget.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right text-emerald-600 font-semibold">₹{row.spent.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right text-slate-500">₹{row.remaining.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right font-bold text-corporate-600">{row.utilizationPct}%</td>
                          <td className="p-3 min-w-[150px]">
                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border">
                              <div 
                                className={`h-full rounded-full transition-all`} 
                                style={{ 
                                  width: `${Math.min(row.utilizationPct, 100)}%`,
                                  backgroundColor: row.utilizationPct > 90 ? '#ef4444' : row.utilizationPct > 60 ? '#f59e0b' : '#10b981'
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 7. SLA PERFORMANCE (APPROVAL SPEED) */}
            {activeTab === 'approval' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-bold text-slate-900">SLA Audit Speed Metrics</h3>
                  <p className="text-xs text-slate-500">Average duration in days for reviewing and settling claims.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="border border-slate-100 bg-slate-50/30 p-4 rounded-xl shadow-sm text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average SLA Cycle</span>
                    <span className="text-2xl font-bold text-slate-800 mt-2 block">{reportData?.approvalPerformance?.averageApprovalTime} Days</span>
                    <span className="text-[9px] text-slate-400 font-semibold mt-1">From file submission to payout</span>
                  </div>
                  <div className="border border-slate-100 bg-slate-50/30 p-4 rounded-xl shadow-sm text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">HOD Approval Delay</span>
                    <span className="text-2xl font-bold text-slate-800 mt-2 block">{reportData?.approvalPerformance?.hodApprovalTime} Days</span>
                    <span className="text-[9px] text-slate-400 font-semibold mt-1">Manager review phase</span>
                  </div>
                  <div className="border border-slate-100 bg-slate-50/30 p-4 rounded-xl shadow-sm text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Finance Audit Speed</span>
                    <span className="text-2xl font-bold text-slate-800 mt-2 block">{reportData?.approvalPerformance?.financeApprovalTime} Days</span>
                    <span className="text-[9px] text-slate-400 font-semibold mt-1">OCR policy compliance check</span>
                  </div>
                  <div className="border border-slate-100 bg-slate-50/30 p-4 rounded-xl shadow-sm text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Accounts Settle Speed</span>
                    <span className="text-2xl font-bold text-slate-800 mt-2 block">{reportData?.approvalPerformance?.accountsSettlementTime} Days</span>
                    <span className="text-[9px] text-slate-400 font-semibold mt-1">Bank wire disbursement phase</span>
                  </div>
                </div>

                <div className="border border-slate-100 p-4 rounded-xl bg-slate-50/10">
                  <span className="text-xs font-bold text-slate-700 block mb-4">Historical Audit Durations Trends</span>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[
                        { name: 'Jan', HOD: 0.5, Finance: 0.9, Accounts: 0.2 },
                        { name: 'Feb', HOD: 0.7, Finance: 1.1, Accounts: 0.3 },
                        { name: 'Mar', HOD: 0.6, Finance: 0.8, Accounts: 0.2 },
                        { name: 'Apr', HOD: 0.8, Finance: 1.2, Accounts: 0.4 },
                        { name: 'May', HOD: 0.5, Finance: 0.9, Accounts: 0.3 },
                        { name: 'Jun', HOD: 0.6, Finance: 0.9, Accounts: 0.3 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Line type="monotone" dataKey="HOD" stroke="#0284c7" activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="Finance" stroke="#f59e0b" />
                        <Line type="monotone" dataKey="Accounts" stroke="#8b5cf6" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* 8. PAYMENT REPORTS */}
            {activeTab === 'payments' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-md font-bold text-slate-900">Bank Settlement Payout Logs</h3>
                    <p className="text-xs text-slate-500">Detailed records of wire reference codes, UPI coordinates, and transaction values.</p>
                  </div>
                  {/* Search for payments */}
                  <div className="relative w-full sm:w-64">
                    <FiSearch className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <input 
                      type="text" 
                      placeholder="Search txn reference, name..." 
                      value={paySearch}
                      onChange={(e) => { setPaySearch(e.target.value); setPayPage(1); }}
                      className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase font-bold border-b">
                        <th className="p-3">Transaction ID</th>
                        <th className="p-3">Bank Ref / UPI</th>
                        <th className="p-3">Employee Name</th>
                        <th className="p-3">Claim ID</th>
                        <th className="p-3">Date</th>
                        <th className="p-3 text-right">Settled Amount</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      {paginatedPayments.length > 0 ? (
                        paginatedPayments.map((row) => (
                          <tr key={row.transactionId} className="hover:bg-slate-50/40">
                            <td className="p-3 font-mono font-bold text-slate-800">{row.transactionId}</td>
                            <td className="p-3">
                              <span className="block font-semibold text-slate-700">Bank: {row.bankReference}</span>
                              <span className="block text-[10px] text-slate-400">UPI: {row.upiReference}</span>
                            </td>
                            <td className="p-3 font-medium">
                              {row.employeeName}
                              <span className="block text-[10px] text-slate-400">{row.department}</span>
                            </td>
                            <td className="p-3 font-mono text-slate-500">{row.claimId}</td>
                            <td className="p-3 text-slate-500">{new Date(row.paymentDate).toLocaleDateString()}</td>
                            <td className="p-3 text-right font-bold text-slate-800">₹{row.amount.toLocaleString('en-IN')}</td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                                {row.paymentStatus}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-slate-400 font-semibold">
                            No payment transactions matching criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Payments pagination */}
                {filteredPayments.length > rowsPerPage && (
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[10px] text-slate-400 font-semibold">
                      Showing {(payPage - 1) * rowsPerPage + 1} to {Math.min(payPage * rowsPerPage, filteredPayments.length)} of {filteredPayments.length} transactions
                    </span>
                    <div className="flex gap-1">
                      <button 
                        disabled={payPage === 1}
                        onClick={() => setPayPage(payPage - 1)}
                        className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs disabled:opacity-50 transition font-bold"
                      >
                        Prev
                      </button>
                      <button 
                        disabled={payPage * rowsPerPage >= filteredPayments.length}
                        onClick={() => setPayPage(payPage + 1)}
                        className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs disabled:opacity-50 transition font-bold"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 9. EXPORT DOWNLOAD CENTER */}
            {activeTab === 'export' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-bold text-slate-900">Enterprise Download Hub</h3>
                  <p className="text-xs text-slate-500">Download formatted financial files. Downloads are audited and subject to role constraints.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Excel Card */}
                  <div className="border border-slate-200 rounded-2xl p-5 hover:border-corporate-400 hover:shadow-md transition bg-slate-50/20 flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-4">
                        <FiFileText size={20} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Microsoft Excel Spreadsheet</h4>
                      <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                        Generates a native `.xlsx` file mapping 10 sheets including budget utilization, category logs, pending approvals, and historical payments.
                      </p>
                    </div>
                    <button 
                      onClick={() => handleExport('excel')}
                      disabled={downloading}
                      className="w-full mt-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <FiDownload size={14} /> Export Excel (.xlsx)
                    </button>
                  </div>

                  {/* Word Card */}
                  <div className="border border-slate-200 rounded-2xl p-5 hover:border-corporate-400 hover:shadow-md transition bg-slate-50/20 flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-4">
                        <FiFileText size={20} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Microsoft Word Document</h4>
                      <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                        Generates an executive-formatted report containing cover details, summary table logs, category spends, and authorization signatures.
                      </p>
                    </div>
                    <button 
                      onClick={() => handleExport('word')}
                      disabled={downloading}
                      className="w-full mt-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <FiDownload size={14} /> Export Word (.docx)
                    </button>
                  </div>

                  {/* PDF Card */}
                  <div className="border border-slate-200 rounded-2xl p-5 hover:border-corporate-400 hover:shadow-md transition bg-slate-50/20 flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mb-4">
                        <FiFileText size={20} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Printable PDF Report</h4>
                      <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                        Generates a print-ready document complete with company headers, signature line forms, category ratios, and custom print layouts.
                      </p>
                    </div>
                    <button 
                      onClick={() => handleExport('pdf')}
                      disabled={downloading}
                      className="w-full mt-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <FiDownload size={14} /> Export PDF (.pdf)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
