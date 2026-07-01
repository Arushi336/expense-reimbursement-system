import React from 'react';

const StatusBadge = ({ status }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'Approved & Settled':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Pending Settlement':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Pending Finance':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Pending HOD':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Queried':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Draft':
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyles()}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>
      {status}
    </span>
  );
};

export default StatusBadge;
