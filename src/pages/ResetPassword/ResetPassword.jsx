import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FiArrowLeft,
  FiLock,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiAlertCircle
} from 'react-icons/fi';
import api from '../../services/api';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve email from route state
  const emailFromState = location.state?.email || '';
  const [email, setEmail] = useState(emailFromState);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage('');
    setError('');

    const targetEmail = email.trim();
    if (!targetEmail) {
      setError('Corporate email is required to complete password reset.');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      const response = await api.put('/auth/reset-password', {
        email: targetEmail,
        password
      });

      setMessage(
        response.data?.message ||
        'Password reset successful'
      );

      setPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        navigate('/login');
      }, 1800);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to reset password. Please verify your OTP or request a new one.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-corporate-950 flex items-center justify-center p-4">
      {/* Background radial glows */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(14,144,233,0.12),transparent_40%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">

        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 lg:p-10">

          <div className="mb-8">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-corporate-600 transition-colors"
            >
              <FiArrowLeft size={16} />
              Return to Login
            </Link>
          </div>

          <div className="mb-8">
            <div className="w-12 h-12 rounded-2xl bg-corporate-50 flex items-center justify-center mb-5 border border-corporate-100">
              <FiLock className="text-corporate-600" size={23} />
            </div>

            <h1 className="text-2xl font-bold text-slate-950 font-display">
              Reset Password
            </h1>

            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Create a new secure password for your corporate account.
            </p>

            {email && (
              <p className="text-xs font-semibold text-corporate-700 bg-corporate-50 px-2.5 py-1 rounded-md inline-block mt-2">
                Account: {email}
              </p>
            )}
          </div>

          {!email && (
            <div className="mb-5 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <FiAlertCircle size={15} />
                <span>Verification session not detected</span>
              </div>
              <p>Please enter your corporate email to set your new password:</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          )}

          {message && (
            <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium flex gap-3 items-start animate-fadeIn">
              <FiCheckCircle className="mt-0.5 shrink-0" size={18} />
              <div>
                <p className="font-bold">{message}</p>
                <p className="text-xs text-emerald-600 mt-0.5">Redirecting to login...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-5 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                New Password
              </label>

              <div className="relative">
                <FiLock
                  className="absolute left-3.5 top-3.5 text-slate-400"
                  size={18}
                />

                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter new password (min. 6 chars)"
                  className="w-full pl-11 pr-12 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500 transition-all text-slate-800"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Confirm New Password
              </label>

              <div className="relative">
                <FiLock
                  className="absolute left-3.5 top-3.5 text-slate-400"
                  size={18}
                />

                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Confirm new password"
                  className="w-full pl-11 pr-12 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500 transition-all text-slate-800"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={
                    showConfirmPassword
                      ? 'Hide confirm password'
                      : 'Show confirm password'
                  }
                >
                  {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-corporate-600 hover:bg-corporate-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-md shadow-corporate-100 hover:shadow-lg transition-all text-sm"
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
            </button>

          </form>

          <p className="text-xs text-slate-400 text-center mt-7">
            Your password must be at least 6 characters long.
          </p>

        </div>
      </div>
    </div>
  );
};

export default ResetPassword;