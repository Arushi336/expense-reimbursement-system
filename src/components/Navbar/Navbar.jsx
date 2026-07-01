import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { FiMenu, FiBell, FiChevronDown, FiUser, FiShield, FiX, FiCheckCircle } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ toggleSidebar }) => {
  const { user, switchRole, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showSimulator, setShowSimulator] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();

  // Fetch notifications on mount & every 30s
  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        if (res.data.success) {
          setNotifications(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err.message);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleRoleSwitch = async (role) => {
    await switchRole(role.toLowerCase());
    // Direct navigate to corresponding dashboard
    if (role === 'Employee') navigate('/employee');
    else if (role === 'HOD') navigate('/hod');
    else if (role === 'Finance') navigate('/finance');
    else if (role === 'Accounts') navigate('/accounts');
    else if (role === 'Admin') navigate('/admin');
  };

  const handleMarkAsRead = async (notifId) => {
    try {
      const res = await api.put(`/notifications/${notifId}/read`);
      if (res.data.success) {
        setNotifications(prev => prev.map(n => n._id === notifId ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-6 shadow-sm">
      {/* Left Menu Button & Title */}
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 lg:hidden text-slate-600 transition"
        >
          <FiMenu size={20} />
        </button>
        <div>
          <h2 className="text-sm font-semibold text-slate-800 leading-none">Enterprise Expense System</h2>
          <p className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5 tracking-wider hidden sm:block">
            Portal &bull; {user.department?.name || 'Unassigned Department'}
          </p>
        </div>
      </div>

      {/* Simulator + Action Tray */}
      <div className="flex items-center gap-3 md:gap-5">
        {/* Quick Simulator (Direct Role Switchers) */}
        {showSimulator && (
          <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase px-2">Simulate:</span>
            {['Employee', 'HOD', 'Finance', 'Accounts', 'Admin'].map((r) => (
              <button
                key={r}
                onClick={() => handleRoleSwitch(r)}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition ${
                  user.role === r 
                    ? 'bg-corporate-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}

        {/* Small screen simulator selector */}
        <div className="md:hidden">
          <select
            value={user.role}
            onChange={(e) => handleRoleSwitch(e.target.value)}
            className="text-xs font-semibold bg-slate-100 border border-slate-200 rounded-lg py-1 px-1.5 focus:outline-none focus:ring-1 focus:ring-corporate-500 text-slate-700"
          >
            <option value="Employee">Simulate: Employee</option>
            <option value="HOD">Simulate: HOD</option>
            <option value="Finance">Simulate: Finance</option>
            <option value="Accounts">Simulate: Accounts</option>
            <option value="Admin">Simulate: Admin</option>
          </select>
        </div>

        {/* Notification Bell with Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition border border-slate-100"
          >
            <FiBell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div onClick={() => setNotifOpen(false)} className="fixed inset-0 z-40 bg-transparent" />
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-1.5 text-sm overflow-hidden max-h-96 flex flex-col">
                <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                  <span className="font-bold text-slate-800">Notifications</span>
                  <span className="text-[10px] bg-corporate-100 text-corporate-700 px-2 py-0.5 rounded-full font-bold uppercase">{unreadCount} New</span>
                </div>
                <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div 
                        key={n._id} 
                        className={`p-3 text-xs leading-relaxed flex items-start gap-2.5 transition hover:bg-slate-50/50 cursor-pointer ${!n.isRead ? 'bg-blue-50/20 font-medium' : ''}`}
                        onClick={() => {
                          if (!n.isRead) handleMarkAsRead(n._id);
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-corporate-600 mt-1.5 shrink-0" style={{ opacity: n.isRead ? 0 : 1 }}></span>
                        <div className="flex-1 space-y-1">
                          <p className="text-slate-700">{n.message}</p>
                          <span className="text-[10px] text-slate-400 block">{new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 font-medium text-xs">
                      No notifications received.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile Card Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-lg border border-slate-100 transition"
          >
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="w-7 h-7 rounded-lg object-cover bg-slate-100 border border-slate-200"
            />
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-800 leading-none">{user.name}</div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{user.role}</div>
            </div>
            <FiChevronDown size={14} className="text-slate-400" />
          </button>

          {dropdownOpen && (
            <>
              <div onClick={() => setDropdownOpen(false)} className="fixed inset-0 z-40 bg-transparent" />
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 text-sm">
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-xs text-slate-500 font-medium">Account Access</p>
                  <p className="font-semibold text-slate-800 truncate">{user.email}</p>
                </div>
                <div className="py-1 text-slate-700 font-semibold">
                  <button 
                    onClick={() => { setShowSimulator(!showSimulator); setDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FiShield size={15} /> Toggle Quick-Simulator
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2"
                  >
                    Sign Out Session
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
