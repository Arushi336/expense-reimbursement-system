import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts';

const COLORS = ['#035ba1', '#0e90e9', '#38abf9', '#7cc8fc', '#bae0fd', '#082a4a'];

// Custom Tooltip component for standard corporate design
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs border border-slate-700">
        {label && <p className="font-semibold mb-1 border-b border-slate-700 pb-1">{label}</p>}
        {payload.map((item, idx) => {
          const isDays = item.name.includes('Days') || item.name.includes('Review');
          return (
            <p key={idx} className="flex justify-between items-center gap-4">
              <span style={{ color: item.color || '#fff' }} className="font-medium">{item.name}:</span>
              <span className="font-bold">
                {isDays ? `${Number(item.value).toFixed(1)} Days` : `₹${Number(item.value).toFixed(2)}`}
              </span>
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

export const CategorySpendChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="h-80 flex items-center justify-center text-slate-400 text-xs">No spend records recorded.</div>;
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="bottom" height={36} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const DepartmentSpendChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="h-80 flex items-center justify-center text-slate-400 text-xs">No department records.</div>;
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="Spent" fill="#0e90e9" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Budget" fill="#bae0fd" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const MonthlyTrendChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="h-80 flex items-center justify-center text-slate-400 text-xs">No history trends yet.</div>;
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0e90e9" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#0e90e9" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="Total" stroke="#0e90e9" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ApprovalTimeChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="h-80 flex items-center justify-center text-slate-400 text-xs">No approval timeline data.</div>;
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}d`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line type="monotone" dataKey="HOD" stroke="#0e90e9" strokeWidth={2} activeDot={{ r: 8 }} name="HOD (Days)" />
          <Line type="monotone" dataKey="Finance" stroke="#f43f5e" strokeWidth={2} activeDot={{ r: 8 }} name="Finance (Days)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
