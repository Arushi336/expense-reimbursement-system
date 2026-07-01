import React from 'react';

const DashboardCard = ({ title, value, subtext, icon: Icon, trend, trendType = 'neutral', onClick }) => {
  const getTrendColor = () => {
    if (trendType === 'positive') return 'text-emerald-600 bg-emerald-50';
    if (trendType === 'negative') return 'text-rose-600 bg-rose-50';
    return 'text-slate-500 bg-slate-50';
  };

  return (
    <div 
      className={`card-premium rounded-2xl p-5 ${onClick ? 'cursor-pointer transform hover:-translate-y-1' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500 tracking-wide uppercase">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-2 font-display">{value}</h3>
        </div>
        {Icon && (
          <div className="p-3 bg-corporate-50 rounded-lg text-corporate-600">
            <Icon size={22} />
          </div>
        )}
      </div>
      {(trend || subtext) && (
        <div className="flex items-center mt-4 pt-4 border-t border-slate-100">
          {trend && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold mr-2 ${getTrendColor()}`}>
              {trend}
            </span>
          )}
          {subtext && <span className="text-xs text-slate-500">{subtext}</span>}
        </div>
      )}
    </div>
  );
};

export default DashboardCard;
