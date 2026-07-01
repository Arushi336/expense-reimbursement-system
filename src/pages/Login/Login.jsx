import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FiLock, FiMail, FiArrowRight, FiShield, FiCpu } from 'react-icons/fi';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('sarah.jenkins@corporate.com');
  const [password, setPassword] = useState('password123');
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

  const handleShortcutLogin = async (roleKey) => {
    try {
      setError('');
      await switchRole(roleKey);
      navigate(`/${roleKey}`);
    } catch (err) {
      setError('Failed to simulate role switch');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-corporate-950 via-corporate-900 to-slate-900 flex justify-center items-center p-4">
      {/* Visual background decorations */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(14,144,233,0.15),transparent)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-corporate-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Main card panel */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/50 max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-[600px]">
        {/* Left Side Info Panel */}
        <div className="lg:col-span-5 bg-gradient-to-br from-corporate-800 to-corporate-950 p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=600')` }} />
          
          <div className="relative z-10 flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-corporate-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
              E
            </div>
            <span className="font-bold text-lg tracking-wider">EERS SYSTEM</span>
          </div>

          <div className="relative z-10 my-10 space-y-6">
            <h1 className="text-3xl font-extrabold tracking-tight leading-tight">
              Enterprise Grade Expense Control
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Streamline reimbursement cycles, enforce policy compliance, and generate instant spend reports for your organization.
            </p>

            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg text-corporate-400"><FiShield size={16} /></div>
                <span className="text-xs font-semibold text-slate-200">ISO 27001 Certified Security</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg text-corporate-400"><FiCpu size={16} /></div>
                <span className="text-xs font-semibold text-slate-200">AI-Powered Receipt Audit Engine</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 text-xs text-slate-400">
            &copy; 2026 EERS Corporation. All rights reserved.
          </div>
        </div>

        {/* Right Side Form Panel */}
        <div className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Sign In to Dashboard</h2>
              <p className="text-sm text-slate-500 mt-1">Enter your corporate credentials below</p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Corporate Email Address</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-corporate-500 bg-white focus:bg-white"
                    placeholder="name@corporate.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Access Token / Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-corporate-500 bg-white focus:bg-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <label className="flex items-center gap-1.5 text-slate-500 font-semibold cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-corporate-600 focus:ring-corporate-500" />
                  Remember this workstation
                </label>
                <a href="#forgot" className="text-corporate-600 font-bold hover:underline">Forgot access token?</a>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-corporate-600 hover:bg-corporate-700 text-white rounded-lg font-bold shadow-md shadow-corporate-100 hover:shadow-lg transition-all duration-200 flex justify-center items-center gap-2 group"
              >
                Launch Console <FiArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            {/* Spacer */}
            <div className="pt-6 border-t border-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
