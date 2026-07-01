import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const ExpenseContext = createContext(null);

export const ExpenseProvider = ({ children }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const fetchExpenses = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status && filters.status !== 'ALL') params.status = filters.status;
      if (filters.category && filters.category !== 'ALL') params.category = filters.category;
      if (filters.department && filters.department !== 'ALL') params.department = filters.department;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.employee) params.employee = filters.employee;

      const res = await api.get('/claims', { params });
      if (res.data.success) {
        setExpenses(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error.message);
      showToast('Failed to retrieve expense claims from server.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const addExpense = async (claimData, file) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('title', claimData.title);
      formData.append('categoryId', claimData.categoryId);
      formData.append('merchant', claimData.merchant);
      formData.append('amount', claimData.amount);
      formData.append('date', claimData.date);
      formData.append('description', claimData.description || '');
      formData.append('isDraft', claimData.isDraft ? 'true' : 'false');
      
      if (claimData.items) {
        formData.append('items', JSON.stringify(claimData.items));
      }

      if (file) {
        formData.append('receipt', file);
      }

      const res = await api.post('/claims', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        showToast(claimData.isDraft ? 'Draft saved successfully.' : 'Claim submitted successfully.', 'success');
        setExpenses(prev => [res.data.data, ...prev]);
        return res.data.data;
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to file expense claim.';
      showToast(msg, 'error');
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const updateExpense = async (claimId, claimData, file) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('title', claimData.title);
      formData.append('categoryId', claimData.categoryId);
      formData.append('merchant', claimData.merchant);
      formData.append('amount', claimData.amount);
      formData.append('date', claimData.date);
      formData.append('description', claimData.description || '');
      formData.append('isDraft', claimData.isDraft ? 'true' : 'false');
      
      if (claimData.items) {
        formData.append('items', JSON.stringify(claimData.items));
      }

      if (file) {
        formData.append('receipt', file);
      }

      const res = await api.put(`/claims/${claimId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        showToast('Claim updated successfully.', 'success');
        setExpenses(prev => prev.map(e => e._id === claimId ? res.data.data : e));
        return res.data.data;
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to edit expense claim.';
      showToast(msg, 'error');
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const executeApproval = async (claimId, action, remarks) => {
    try {
      setLoading(true);
      const res = await api.post(`/approvals/${claimId}`, { action, remarks });
      if (res.data.success) {
        showToast(`Claim successfully ${action}d.`, 'success');
        setExpenses(prev => prev.map(e => e._id === claimId ? res.data.data : e));
        return res.data.data;
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Audit action failed.';
      showToast(msg, 'error');
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const executePayment = async (claimId, transactionId, method = 'Bank Transfer') => {
    try {
      setLoading(true);
      const res = await api.post(`/payments/${claimId}`, { transactionId, method });
      if (res.data.success) {
        showToast('Disbursement completed successfully.', 'success');
        setExpenses(prev => prev.map(e => e._id === claimId ? res.data.data : e));
        return res.data.data;
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Settlement failed.';
      showToast(msg, 'error');
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const deleteClaim = async (claimId) => {
    try {
      setLoading(true);
      const res = await api.delete(`/claims/${claimId}`);
      if (res.data.success) {
        showToast('Draft deleted successfully.', 'success');
        setExpenses(prev => prev.filter(e => e._id !== claimId));
        return true;
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Deletion failed.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ExpenseContext.Provider value={{ 
      expenses, loading, fetchExpenses, addExpense, updateExpense, 
      executeApproval, executePayment, deleteClaim 
    }}>
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpenses = () => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpenses must be used within an ExpenseProvider');
  }
  return context;
};
export default useExpenses;
