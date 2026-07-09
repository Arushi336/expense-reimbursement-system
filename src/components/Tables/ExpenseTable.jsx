import React, { useState } from 'react';
import StatusBadge from '../StatusBadge/StatusBadge';
import api from '../../services/api';
import { 
  FiSearch, FiFilter, FiEye, FiCheck, FiX, FiHelpCircle, 
  FiCalendar, FiUser, FiTag, FiFileText, FiDownload,
  FiArrowUp, FiArrowDown, FiActivity, FiBriefcase, FiDollarSign
} from 'react-icons/fi';

const ExpenseTable = ({ expenses, onAction, userRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [actionComment, setActionComment] = useState('');
  const [txnRef, setTxnRef] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Sorting Handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Fetch Full Claim Details on demand
  const handleViewDetails = async (claim) => {
    setModalLoading(true);
    setSelectedExpense(claim); // temporary placement
    try {
      const res = await api.get(`/claims/${claim._id}`);
      if (res.data.success) {
        setSelectedExpense(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching claim details:', err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Filter & Search Logic
  const filteredExpenses = expenses.filter(exp => {
    const titleVal = exp.title || '';
    const nameVal = exp.employee?.name || '';
    const merchantVal = exp.merchant || '';
    const idVal = exp.id || '';

    const matchesSearch = 
      titleVal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nameVal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      merchantVal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      idVal.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Category match is checked by code
    const matchesCategory = categoryFilter === 'ALL' || exp.category?.code === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || exp.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  }).sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (sortField === 'amount') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    aVal = (aVal || '').toString().toLowerCase();
    bVal = (bVal || '').toString().toLowerCase();
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedExpenses = filteredExpenses.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getWorkflowStep = (status) => {
    switch (status) {
      case 'Draft':
      case 'Returned for Correction':
        return 0;
      case 'Submitted':
        return 1;
      case 'Pending Finance':
        return 2;
      case 'Pending Settlement':
        return 3;
      case 'Approved & Settled':
        return 4;
      case 'Rejected by HOD':
      case 'Rejected by Finance':
      case 'Rejected':
        return -1;
      default:
        return 1;
    }
  };

  const workflowStages = [
    { label: 'Employee', desc: 'Draft/Filed' },
    { label: 'HOD', desc: 'Manager Approved' },
    { label: 'Finance', desc: 'Audit Verified' },
    { label: 'Accounts', desc: 'Disbursed' },
    { label: 'Completed', desc: 'Reimbursed' }
  ];

  // Role Action Checker
  const canActOnExpense = (status) => {
    if (userRole === 'HOD' && status === 'Submitted') return true;
    if (userRole === 'Finance' && status === 'Pending Finance') return true;
    if (userRole === 'Accounts' && status === 'Pending Settlement') return true;
    return false;
  };

  const executeAction = (expenseId, nextStatus) => {
    // Require remarks for Reject or Return for Correction actions
    if ((nextStatus === 'Rejected' || nextStatus === 'Returned for Correction') && !actionComment.trim()) {
      alert(`Remarks/Notes are required to return or reject a claim. Please enter your comments in the Decision Remarks box.`);
      return;
    }

    // Require confirmation for Reject
    if (nextStatus === 'Rejected') {
      const confirmReject = window.confirm("Are you sure you want to REJECT this expense claim? This will permanently cancel the approval process.");
      if (!confirmReject) return;
    }

    if (onAction) {
      onAction(expenseId, nextStatus, actionComment);
    }
    setActionComment('');
    setSelectedExpense(null);
  };

  const handleQuickAction = (exp) => {
    if (userRole === 'HOD') {
      if (onAction) onAction(exp._id, 'Pending Finance', 'Quick approved via dashboard');
    } else if (userRole === 'Finance') {
      if (onAction) onAction(exp._id, 'Pending Settlement', 'Quick verified via dashboard');
    } else if (userRole === 'Accounts') {
      const quickTxnId = `TXN-QK-${Math.floor(100000 + Math.random() * 900000)}`;
      if (onAction) onAction(exp._id, 'Approved & Settled', quickTxnId);
    }
  };

  const getActionButtons = (exp) => {
    if (userRole === 'HOD') {
      return (
        <div className="flex gap-2">
          <button 
            onClick={() => executeAction(exp._id, 'Pending Finance')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow transition-colors"
          >
            <FiCheck size={14} /> Approve Claim
          </button>
          <button 
            onClick={() => executeAction(exp._id, 'Returned for Correction')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-semibold shadow transition-colors"
          >
            <FiHelpCircle size={14} /> Return for Correction
          </button>
          <button 
            onClick={() => executeAction(exp._id, 'Rejected')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold shadow transition-colors"
          >
            <FiX size={14} /> Reject
          </button>
        </div>
      );
    }

    if (userRole === 'Finance') {
      return (
        <div className="flex gap-2">
          <button 
            onClick={() => executeAction(exp._id, 'Pending Settlement')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow transition-colors"
          >
            <FiCheck size={14} /> Verify & Pass
          </button>
          <button 
            onClick={() => executeAction(exp._id, 'Returned for Correction')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-semibold shadow transition-colors"
          >
            <FiHelpCircle size={14} /> Return for Correction
          </button>
          <button 
            onClick={() => executeAction(exp._id, 'Rejected')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold shadow transition-colors"
          >
            <FiX size={14} /> Reject Audit
          </button>
        </div>
      );
    }

    if (userRole === 'Accounts') {
      return (
        <div className="w-full space-y-4">
          <div className="bg-slate-100/60 p-3 rounded-xl border border-slate-200 space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Bank Transfer Transaction Reference ID</label>
            <input 
              type="text" 
              placeholder="Enter Bank ACH / Wire Ref (e.g. TXN-987234)"
              value={txnRef}
              onChange={(e) => setTxnRef(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-corporate-500 bg-white"
            />
          </div>
          
          <div className="flex gap-2 justify-end w-full">
            <button 
              onClick={() => {
                if (!txnRef.trim()) {
                  alert("Please enter a Bank Transaction ID to disburse payment.");
                  return;
                }
                if (onAction) onAction(exp._id, 'Approved & Settled', txnRef.trim());
                setTxnRef('');
                setSelectedExpense(null);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold shadow transition-colors"
            >
              <FiCheck size={14} /> Mark as Paid
            </button>
            <button 
              onClick={() => executeAction(exp._id, 'Returned for Correction')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-semibold shadow transition-colors"
            >
              <FiHelpCircle size={14} /> Return for Correction
            </button>
            <button 
              onClick={() => executeAction(exp._id, 'Rejected')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold shadow transition-colors"
            >
              <FiX size={14} /> Reject Payment
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <FiArrowUp className="inline ml-1" /> : <FiArrowDown className="inline ml-1" />;
  };

  const getReceiptSrc = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const parts = url.split(/[\\/]/);
    const filename = parts[parts.length - 1];
    return `http://localhost:5000/uploads/${filename}`;
  };

  const handleExportCSV = () => {
    const headers = ['Claim ID', 'Title', 'Employee', 'Department', 'Amount', 'Date', 'Category', 'Merchant', 'Status'];
    const rows = filteredExpenses.map(e => [
      e.id, e.title, e.employee?.name || '', e.department?.name || '', e.amount, e.date, e.category?.code || '', e.merchant, e.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `claims_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="card-premium rounded-2xl overflow-hidden shadow-sm">
      {/* Filtering Header */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
        <div className="relative w-full md:w-80">
          <FiSearch className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search claim, employee, merchant..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500 bg-white"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-corporate-500"
          >
            <option value="ALL">All Categories</option>
            <option value="TRAVEL">Travel</option>
            <option value="FOOD">Food</option>
            <option value="ACCOMMODATION">Accommodation</option>
            <option value="FUEL">Fuel</option>
            <option value="MEDICAL">Medical</option>
            <option value="SUPPLIES">Office Supplies</option>
            <option value="TRAINING">Training</option>
            <option value="OTHER">Others</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-corporate-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Pending Finance">Pending Finance</option>
            <option value="Pending Settlement">Pending Settlement</option>
            <option value="Approved & Settled">Approved & Settled</option>
            <option value="Returned for Correction">Returned for Correction</option>
            <option value="Rejected by HOD">Rejected by HOD</option>
            <option value="Rejected by Finance">Rejected by Finance</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold bg-white hover:bg-slate-50 text-slate-700 transition"
          >
            <FiDownload size={15} /> Export
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 bg-slate-50 sticky top-0 z-10">
              <th onClick={() => handleSort('id')} className="py-3.5 px-5 cursor-pointer hover:bg-slate-100 transition sticky top-0 bg-slate-50 z-10">ID {getSortIcon('id')}</th>
              <th onClick={() => handleSort('title')} className="py-3.5 px-5 cursor-pointer hover:bg-slate-100 transition sticky top-0 bg-slate-50 z-10">Expense Detail {getSortIcon('title')}</th>
              <th onClick={() => handleSort('employeeName')} className="py-3.5 px-5 cursor-pointer hover:bg-slate-100 transition sticky top-0 bg-slate-50 z-10">Employee {getSortIcon('employeeName')}</th>
              <th onClick={() => handleSort('amount')} className="py-3.5 px-5 cursor-pointer hover:bg-slate-100 transition text-right sticky top-0 bg-slate-50 z-10">Amount {getSortIcon('amount')}</th>
              <th onClick={() => handleSort('date')} className="py-3.5 px-5 cursor-pointer hover:bg-slate-100 transition sticky top-0 bg-slate-50 z-10">Date {getSortIcon('date')}</th>
              <th className="py-3.5 px-5 sticky top-0 bg-slate-50 z-10">Status</th>
              <th className="py-3.5 px-5 text-center sticky top-0 bg-slate-50 z-10">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {paginatedExpenses.length > 0 ? (
              paginatedExpenses.map((exp) => (
                <tr key={exp._id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 px-5 font-mono font-medium text-slate-900">{exp.id}</td>
                  <td className="py-4 px-5">
                    <div className="font-semibold text-slate-900">{exp.title}</div>
                    <div className="text-xs text-slate-500">{exp.merchant} &bull; <span className="italic">{exp.category?.name}</span></div>
                  </td>
                  <td className="py-4 px-5">
                    <div className="font-medium text-slate-900">{exp.employee?.name}</div>
                    <div className="text-xs text-slate-500">{exp.department?.name}</div>
                  </td>
                  <td className="py-4 px-5 text-right font-bold text-slate-900">
                    ₹{exp.amount.toFixed(2)}
                  </td>
                  <td className="py-4 px-5 text-slate-500">{new Date(exp.date).toLocaleDateString()}</td>
                  <td className="py-4 px-5">
                    <StatusBadge status={exp.status} />
                  </td>
                  <td className="py-4 px-5 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleViewDetails(exp)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-355 hover:border-corporate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-sm transition"
                      >
                        <FiEye size={13} className="mr-1" /> View Details
                      </button>

                      {canActOnExpense(exp.status) && (
                        <>
                          <button
                            onClick={() => handleQuickAction(exp)}
                            className="p-1.5 bg-emerald-55 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-600 hover:text-white transition shadow-sm"
                            title={
                              userRole === 'HOD' ? 'Quick Approve' : userRole === 'Finance' ? 'Quick Verify' : 'Quick Settle'
                            }
                          >
                            <FiCheck size={15} />
                          </button>
                          
                          <button
                            onClick={() => {
                              handleViewDetails(exp);
                              setTimeout(() => {
                                const textarea = document.querySelector('textarea[placeholder*="Enter audit rationale"]');
                                if (textarea) {
                                  textarea.focus();
                                  textarea.scrollIntoView({ behavior: 'smooth' });
                                }
                              }, 400);
                            }}
                            className="p-1.5 bg-rose-55 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-600 hover:text-white transition shadow-sm"
                            title="Return or Reject Claim"
                          >
                            <FiX size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="py-8 px-5 text-center text-slate-400 font-medium">
                  No expense records found matching filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <p className="text-xs text-slate-500">
            Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
            <span className="font-semibold">{Math.min(startIndex + itemsPerPage, filteredExpenses.length)}</span> of{' '}
            <span className="font-semibold">{filteredExpenses.length}</span> claims
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-slate-200 rounded text-xs font-medium bg-white hover:bg-slate-50 disabled:opacity-50 transition"
            >
              Prev
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => handlePageChange(i + 1)}
                className={`px-3 py-1.5 border rounded text-xs font-semibold transition ${
                  currentPage === i + 1
                    ? 'bg-corporate-600 border-corporate-600 text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border border-slate-200 rounded text-xs font-medium bg-white hover:bg-slate-50 disabled:opacity-50 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detailed Slide-out Drawer Panel */}
      {selectedExpense && (
        <>
          {/* Backdrop Overlay */}
          <div 
            onClick={() => { setSelectedExpense(null); setActionComment(''); }} 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
          />

          {/* Drawer Card */}
          <div className="fixed top-0 bottom-0 right-0 h-screen w-full max-w-2xl bg-white border-l border-slate-200 shadow-2xl flex flex-col overflow-hidden z-50 animate-slide-in-right">
            {/* Drawer Header (Sticky) */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
              <div>
                <span className="text-xs font-mono font-bold text-slate-500 block mb-1">{selectedExpense.id}</span>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">{selectedExpense.title}</h3>
              </div>
              <button
                onClick={() => { setSelectedExpense(null); setActionComment(''); }}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition shrink-0"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 pb-72 space-y-6">
              {modalLoading ? (
                <div className="p-12 text-center space-y-4">
                  <div className="w-10 h-10 border-4 border-corporate-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-slate-500 font-semibold">Retrieving claim workflow logs...</p>
                </div>
              ) : (
                <>
                  {/* Visual Workflow Stepper Progress Indicator */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">Claim Review Lifecycle</span>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      {workflowStages.map((stage, idx) => {
                        const currentStep = getWorkflowStep(selectedExpense.status);
                        const isCompleted = currentStep > idx;
                        const isActive = currentStep === idx;
                        const isRejected = currentStep === -1;
                        
                        return (
                          <div key={idx} className="flex flex-row sm:flex-col items-center gap-2 flex-1 w-full relative">
                            {idx < workflowStages.length - 1 && (
                              <div className="hidden sm:block absolute top-4 left-1/2 w-full h-[2px] -z-10"
                                   style={{ backgroundColor: isCompleted ? '#10b981' : '#e2e8f0' }} />
                            )}
                            
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isCompleted 
                                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-100' 
                                : isActive 
                                ? 'bg-corporate-600 text-white ring-4 ring-corporate-100' 
                                : isRejected && idx === currentStep + 1
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'bg-slate-200 text-slate-500'
                            }`}>
                              {isCompleted ? <FiCheck size={14} /> : idx + 1}
                            </div>
                            
                            <div className="text-left sm:text-center shrink-0">
                              <span className={`block text-xs font-bold ${
                                isActive ? 'text-corporate-700' : isCompleted ? 'text-emerald-700' : 'text-slate-500'
                              }`}>{stage.label}</span>
                              <span className="block text-[9px] text-slate-400 leading-none">{stage.desc}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Core Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded text-slate-500"><FiUser size={16} /></div>
                      <div>
                        <span className="text-xs text-slate-500 block">Submitted By</span>
                        <span className="text-sm font-semibold text-slate-800">{selectedExpense.employee?.name} ({selectedExpense.department?.name})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded text-slate-500"><FiCalendar size={16} /></div>
                      <div>
                        <span className="text-xs text-slate-500 block">Transaction Date</span>
                        <span className="text-sm font-semibold text-slate-800">{new Date(selectedExpense.date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded text-slate-500"><FiTag size={16} /></div>
                      <div>
                        <span className="text-xs text-slate-500 block">Category & Merchant</span>
                        <span className="text-sm font-semibold text-slate-800">{selectedExpense.category?.name} &bull; {selectedExpense.merchant}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-corporate-50 rounded text-corporate-600 font-bold">₹</div>
                      <div>
                        <span className="text-xs text-slate-500 block">Reimbursement Amount</span>
                        <span className="text-sm font-bold text-corporate-700">₹{selectedExpense.amount?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-slate-500 font-semibold block">Business Rationale</span>
                    <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 p-3 rounded-lg leading-relaxed">{selectedExpense.description || 'No description provided.'}</p>
                  </div>

                  {/* Receipt Image Preview */}
                  <div className="space-y-2">
                    <span className="text-xs text-slate-500 font-semibold block">Receipt Attachment Preview</span>
                    {selectedExpense.receiptUrl ? (
                      <div className="border border-slate-200 rounded-xl overflow-hidden p-2 bg-slate-50">
                        {selectedExpense.receiptUrl.endsWith('.pdf') ? (
                          <div className="flex items-center justify-between p-2">
                            <span className="text-xs text-slate-700 font-semibold flex items-center gap-2"><FiFileText className="text-corporate-600" /> PDF Document Receipt</span>
                            <a href={getReceiptSrc(selectedExpense.receiptUrl)} target="_blank" rel="noreferrer" className="text-xs font-bold text-corporate-600 hover:underline">Download PDF Document</a>
                          </div>
                        ) : (
                          <div className="space-y-2 text-center">
                            <img 
                              src={getReceiptSrc(selectedExpense.receiptUrl)} 
                              alt="Receipt" 
                              className="max-h-60 mx-auto object-contain border bg-white rounded-lg"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const errDiv = e.target.parentNode.querySelector('.receipt-error-msg');
                                if (errDiv) errDiv.style.display = 'block';
                              }}
                            />
                            <div className="receipt-error-msg hidden text-xs text-rose-600 font-semibold p-4 text-center border border-dashed border-rose-200 bg-rose-50/50 rounded-lg">
                              Receipt file could not be loaded (it may have been deleted from local storage).
                            </div>
                            <a href={getReceiptSrc(selectedExpense.receiptUrl)} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-corporate-500 hover:underline text-center block">Open receipt image in new window</a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs font-semibold">
                        No Receipt Document Attached
                      </div>
                    )}
                  </div>

                  {/* Policy Exceptions */}
                  {selectedExpense.policyViolation && (
                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 space-y-1.5">
                      <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider">Policy Compliance Flags</h4>
                      <p className="text-xs text-rose-700 font-semibold">{selectedExpense.policyMessage}</p>
                    </div>
                  )}

                  {/* OCR AI Scanner Predictions */}
                  {selectedExpense.receiptUrl && selectedExpense.ocrConfidence && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5"><FiBriefcase className="text-corporate-600" /> OCR AI Receipt Verification</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] text-slate-500 font-medium">
                        <div>
                          <span>OCR Merchant:</span>
                          <strong className="text-slate-800 block text-xs mt-0.5 truncate" title={selectedExpense.ocrVendor}>{selectedExpense.ocrVendor || 'Not scanned'}</strong>
                        </div>
                        <div>
                          <span>OCR Amount:</span>
                          <strong className="text-slate-800 block text-xs mt-0.5">₹{selectedExpense.ocrAmount?.toFixed(2) || 'Not scanned'}</strong>
                        </div>
                        <div>
                          <span>OCR Date:</span>
                          <strong className="text-slate-800 block text-xs mt-0.5">{selectedExpense.ocrDate ? new Date(selectedExpense.ocrDate).toLocaleDateString() : 'Not scanned'}</strong>
                        </div>
                        <div>
                          <span>Confidence Score:</span>
                          <strong className={`${selectedExpense.ocrConfidence > 90 ? 'text-emerald-600' : 'text-amber-500'} block text-xs mt-0.5`}>{selectedExpense.ocrConfidence}% Match</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timeline Progress */}
                  <div className="space-y-3">
                    <span className="text-xs text-slate-500 font-semibold block">Approval Progress Workflow Log</span>
                    <div className="relative border-l-2 border-slate-100 ml-3 pl-4 space-y-4">
                      {selectedExpense.history?.map((h) => (
                        <div key={h._id} className="relative">
                          <span className="absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full bg-corporate-500 ring-4 ring-white border border-corporate-600"></span>
                          <div>
                            <div className="flex justify-between text-xs text-slate-500 font-semibold">
                              <span>{h.action} by <strong className="text-slate-800">{h.actionBy?.name || 'User'}</strong> ({h.role})</span>
                              <span>{new Date(h.timestamp).toLocaleDateString()}</span>
                            </div>
                            {h.remarks && <p className="text-xs text-slate-600 italic mt-0.5">&ldquo;{h.remarks}&rdquo;</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment information if Settled */}
                  {selectedExpense.status === 'Approved & Settled' && selectedExpense.payment && (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-2">
                      <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5"><FiDollarSign /> Settlement Disbursement Info</h4>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-purple-800 font-medium">
                        <div>
                          <span>Wire Reference ID:</span>
                          <strong className="text-purple-950 block">{selectedExpense.payment.transactionId}</strong>
                        </div>
                        <div>
                          <span>Disbursed On:</span>
                          <strong className="text-purple-950 block">{new Date(selectedExpense.payment.paymentDate).toLocaleDateString()}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sticky Actions Footer */}
            {!modalLoading && (
              canActOnExpense(selectedExpense.status) ? (
                <div className="p-5 border-t border-slate-150 bg-slate-50/95 flex flex-col gap-3 shrink-0">
                  {['HOD', 'Finance', 'Accounts'].includes(userRole) && (
                    <div className="w-full">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Decision Remarks / Notes</label>
                      <textarea
                        placeholder="Enter audit rationale, requested changes, or queries..."
                        value={actionComment}
                        onChange={(e) => setActionComment(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-corporate-500 bg-white"
                        rows="2.5"
                      />
                    </div>
                  )}
                  <div className="flex justify-end gap-2 w-full">
                    {getActionButtons(selectedExpense)}
                  </div>
                </div>
              ) : (
                ['HOD', 'Finance', 'Accounts'].includes(userRole) && (
                  <div className="p-5 border-t border-slate-150 bg-slate-100/90 text-slate-500 text-xs font-semibold text-center shrink-0">
                    This claim is currently in <span className="font-bold text-slate-700">{selectedExpense.status}</span> status and does not require action from your role ({userRole}).
                  </div>
                )
              )
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ExpenseTable;
