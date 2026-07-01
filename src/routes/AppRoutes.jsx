import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import Login from '../pages/Login/Login';
import EmployeeDashboard from '../pages/EmployeeDashboard/EmployeeDashboard';
import HODDashboard from '../pages/HODDashboard/HODDashboard';
import FinanceDashboard from '../pages/FinanceDashboard/FinanceDashboard';
import AccountsDashboard from '../pages/AccountsDashboard/AccountsDashboard';
import AdminDashboard from '../pages/AdminDashboard/AdminDashboard';
import ExpenseForm from '../pages/ExpenseForm/ExpenseForm';
import ExpenseHistory from '../pages/ExpenseHistory/ExpenseHistory';
import Reports from '../pages/Reports/Reports';
import NotFound from '../pages/NotFound/NotFound';
import { useAuth } from '../hooks/useAuth';

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />

      {/* Protected Routes wrapped in AppLayout */}
      <Route element={<AppLayout />}>
        <Route path="/" element={
          user ? <Navigate to={`/${user.role.toLowerCase()}`} replace /> : <Navigate to="/login" replace />
        } />
        
        <Route path="/employee" element={<EmployeeDashboard />} />
        <Route path="/hod" element={<HODDashboard />} />
        <Route path="/finance" element={<FinanceDashboard />} />
        <Route path="/accounts" element={<AccountsDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        
        <Route path="/submit-expense" element={<ExpenseForm />} />
        <Route path="/expense-history" element={<ExpenseHistory />} />
        <Route path="/reports" element={<Reports />} />
      </Route>

      {/* Fallback Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
