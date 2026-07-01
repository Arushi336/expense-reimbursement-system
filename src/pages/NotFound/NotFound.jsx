import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FiAlertTriangle } from 'react-icons/fi';

const NotFound = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleReturn = () => {
    if (!user) {
      navigate('/login');
    } else {
      navigate(`/${user.role.toLowerCase()}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 space-y-6 animate-fade-in">
      <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center border border-rose-100 shadow-sm">
        <FiAlertTriangle size={32} />
      </div>

      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight font-display">404 - Page Not Found</h1>
        <p className="text-sm text-slate-500 max-w-md leading-relaxed mx-auto">
          The requested system node or resource could not be located. It might have been relocated, or you might lack sufficient routing permissions.
        </p>
      </div>

      <button
        onClick={handleReturn}
        className="px-6 py-2.5 bg-corporate-600 hover:bg-corporate-700 text-white font-bold rounded-xl text-sm shadow transition active:scale-95"
      >
        Return to Portal Console
      </button>
    </div>
  );
};

export default NotFound;
