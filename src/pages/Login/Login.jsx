import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FiLock, FiMail, FiArrowRight, FiShield, FiCpu } from 'react-icons/fi';
import fluidLogo from '../../assets/fluid_logo_main.png';
import fluidBuilding from '../../assets/fluid_building.png';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your corporate email');
      return;
    }
    try {
      setError('');
      const loggedUser = await login(email, password);
      if (loggedUser) {
        navigate(`/${loggedUser.role.toLowerCase()}`);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-corporate-950 flex justify-center items-center p-4">
      {/* Background radial glows */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(14,144,233,0.12),transparent_40%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />

      {/* Main Container Card */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200/50 max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-[620px]">
        {/* Left Side: Immersive Brand Display */}
        <div className="lg:col-span-5 relative flex flex-col justify-end p-6 min-h-[450px] lg:min-h-0 overflow-hidden">
          {/* Company picture at 100% opacity */}
          <img src={fluidBuilding} alt="Fluid Controls Facility" className="absolute inset-0 w-full h-full object-cover" />
          
          {/* Subtle gradient overlays to protect readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-slate-950/50 pointer-events-none" />

          {/* Glass text panel at the bottom */}
          <div className="relative z-10 bg-slate-950/70 backdrop-blur-lg rounded-2xl p-5 border border-white/10 shadow-2xl space-y-3.5">
            <div>
              <span className="text-[9px] font-extrabold text-corporate-400 uppercase tracking-widest block mb-1">Fluid Controls Pvt. Ltd.</span>
              <h2 className="text-lg font-extrabold text-white tracking-tight leading-snug">
                Employee Expense Reimbursement System
              </h2>
            </div>
            <div className="pt-2.5 border-t border-white/10 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-300 tracking-wide uppercase italic">"Engineering Connections Everyday"</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-center bg-slate-50/40">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div>
              <img src={fluidLogo} alt="Fluid Controls Logo" className="h-10 w-auto object-contain mb-6 bg-white p-2 rounded-xl border border-slate-200/60 shadow-sm" />
              <h2 className="text-2xl font-bold text-slate-950 font-display">Sign In</h2>
              <p className="text-xs text-slate-500 mt-1.5 font-semibold">Access your expense dashboard with corporate email credentials.</p>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-150 text-rose-700 text-xs font-semibold rounded-xl animate-shake">
                {error}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Corporate Email Address</label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500 transition-all font-medium text-slate-800"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Access Token / Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500 transition-all font-medium text-slate-800"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-xs pt-1">
                <label className="flex items-center gap-1.5 text-slate-500 font-semibold cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-corporate-600 focus:ring-corporate-500" />
                  Remember station
                </label>
                <a href="#forgot" className="text-corporate-600 font-bold hover:underline">Forgot access key?</a>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-corporate-600 hover:bg-corporate-700 text-white rounded-xl font-bold shadow-md shadow-corporate-100 hover:shadow-lg transition-all duration-200 flex justify-center items-center gap-2 group text-xs mt-2"
              >
                Launch Console <FiArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            {/* Spacer */}
            <div className="pt-2 border-t border-slate-100/50" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
