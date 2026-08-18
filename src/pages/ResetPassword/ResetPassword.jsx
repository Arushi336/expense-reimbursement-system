import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiLock,
  FiCheckCircle,
  FiEye,
  FiEyeOff
} from 'react-icons/fi';
import api from '../../services/api';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

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

    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      const response = await api.put(`/auth/reset-password/${token}`, {
        password,
        confirmPassword
      });

      setMessage(
        response.data?.message ||
        'Your password has been reset successfully.'
      );

      setPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'The reset link is invalid or has expired. Please request a new one.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-corporate-950 flex items-center justify-center p-4">

      <div className="w-full max-w-md">

        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 lg:p-10">

          <div className="mb-8">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-corporate-600 transition-colors"
            >
              <FiArrowLeft size={16} />
              Back to Login
            </Link>
          </div>

          <div className="mb-8">
            <div className="w-12 h-12 rounded-2xl bg-corporate-50 flex items-center justify-center mb-5">
              <FiLock className="text-corporate-600" size={23} />
            </div>

            <h1 className="text-2xl font-bold text-slate-950">
              Reset Password
            </h1>

            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Create a new password for your account.
            </p>
          </div>

          {message && (
            <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium flex gap-3 items-start">
              <FiCheckCircle className="mt-0.5 shrink-0" size={18} />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="mb-5 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
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
    placeholder="Enter new password"
    className="w-full pl-11 pr-12 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500"
    required
  />

  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
    aria-label={showPassword ? 'Hide password' : 'Show password'}
  >
    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
  </button>
</div>
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
    className="w-full pl-11 pr-12 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500"
    required
  />

  <button
    type="button"
    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-corporate-600 hover:bg-corporate-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-md transition-all"
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
            </button>

          </form>

          <p className="text-xs text-slate-400 text-center mt-7">
            Your password must be at least 8 characters long.
          </p>

        </div>
      </div>
    </div>
  );
};

export default ResetPassword;