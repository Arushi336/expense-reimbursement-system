import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  FiGrid, FiPlusCircle, FiFileText, FiPieChart, 
  FiSliders, FiLogOut, FiActivity, FiUsers 
} from 'react-icons/fi';
import fluidLogo from '../../assets/fluid_logo_main.png';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  // Define navigation items based on user roles
  const getNavLinks = () => {
    const common = [
      { name: 'Expense History', path: '/expense-history', icon: FiFileText }
    ];

    switch (user.role) {
      case 'Employee':
        return [
          { name: 'Dashboard', path: '/employee', icon: FiGrid },
          { name: 'File New Claim', path: '/submit-expense', icon: FiPlusCircle },
          ...common
        ];
      case 'HOD':
        return [
          { name: 'Department Dashboard', path: '/hod', icon: FiGrid },
          ...common
        ];
      case 'Finance':
        return [
          { name: 'Auditing Dashboard', path: '/finance', icon: FiGrid },
          ...common,
          { name: 'Compliance Reports', path: '/reports', icon: FiPieChart },
        ];
      case 'Accounts':
        return [
          { name: 'Settlement Dashboard', path: '/accounts', icon: FiGrid },
          ...common,
          { name: 'Financial Reports', path: '/reports', icon: FiPieChart },
        ];
      case 'Admin':
        return [
          { name: 'Admin Dashboard', path: '/admin', icon: FiGrid },
          ...common,
        ];
      default:
        return common;
    }
  };

  const menuItems = getNavLinks();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div 
          onClick={toggleSidebar}
          className="fixed inset-0 z-20 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-30 w-64 border-r border-slate-200 bg-white flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo Brand Header */}
          <div className="h-16 border-b border-slate-100 flex items-center px-6 bg-white">
            <img src={fluidLogo} alt="Fluid Controls Logo" className="h-7 w-auto object-contain" />
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 px-3 mb-2 uppercase tracking-wider">
              {user.role} Space
            </p>
            {menuItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={idx}
                  to={item.path}
                  onClick={() => {
                    // Close sidebar on mobile after clicking
                    if (window.innerWidth < 1024) toggleSidebar();
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                      isActive 
                        ? 'bg-corporate-600 text-white shadow-md shadow-corporate-100' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon size={18} className="shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/30">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition duration-150"
          >
            <FiLogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
