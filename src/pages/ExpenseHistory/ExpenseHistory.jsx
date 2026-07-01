import React, { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses } from '../../hooks/useExpenses';
import ExpenseTable from '../../components/Tables/ExpenseTable';

const ExpenseHistory = () => {
  const { user } = useAuth();
  const { expenses, fetchExpenses, loading } = useExpenses();

  useEffect(() => {
    // Fetch claims on page load
    fetchExpenses();
  }, [fetchExpenses]);

  const handleAction = async (expenseId, nextStatus, comment) => {
    // approvals decisions mapping
    let action = 'Approve';
    if (nextStatus === 'Queried' || nextStatus === 'Returned for Correction') {
      action = 'Return for Correction';
    } else if (nextStatus === 'Rejected') {
      action = 'Reject';
    }
    
    await executeApproval(expenseId, action, comment);
    fetchExpenses();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-display">Expense Claims Archive</h1>
        <p className="text-sm text-slate-500 mt-1">
          {user.role === 'Employee' && 'Review and track the progress of all your filed reimbursement requests.'}
          {user.role === 'HOD' && `Managing historical approvals for the ${user.department?.name || ''} department.`}
          {['Finance', 'Accounts', 'Admin'].includes(user.role) && 'Global database registry of all corporate expense submissions.'}
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white border rounded-xl space-y-3">
          <div className="w-10 h-10 border-4 border-corporate-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-medium">Fetching expense archives...</p>
        </div>
      ) : (
        <ExpenseTable 
          expenses={expenses} 
          onAction={handleAction} 
          userRole={user.role} 
        />
      )}
    </div>
  );
};

export default ExpenseHistory;
