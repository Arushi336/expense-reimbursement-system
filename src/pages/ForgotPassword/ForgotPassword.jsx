import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiMail, FiSend } from 'react-icons/fi';
import api from '../../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your registered email address.');
      return;
    }

    try {
      setLoading(true);

      await api.post('/auth/forgot-password', {
        email: trimmedEmail
      });

      // Navigate to verify-otp with email in state
      navigate('/verify-otp', {
        state: { email: trimmedEmail }
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to process your request. Please try again.'
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
              Back to Login
            </Link>
          </div>

          <div className="mb-8">
            <div className="w-12 h-12 rounded-2xl bg-corporate-50 flex items-center justify-center mb-5 border border-corporate-100">
              <FiMail className="text-corporate-600" size={23} />
            </div>

            <h1 className="text-2xl font-bold text-slate-950 font-display">
              Forgot Password?
            </h1>

            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Enter your registered corporate email address and we'll send you a 6-digit OTP to reset your password.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Corporate Email Address
              </label>

              <div className="relative">
                <FiMail
                  className="absolute left-3.5 top-3.5 text-slate-400"
                  size={18}
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="name@company.com"
                  className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500 transition-all text-slate-800"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-corporate-600 hover:bg-corporate-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-md shadow-corporate-100 hover:shadow-lg transition-all flex justify-center items-center gap-2"
            >
              {loading ? (
                'Sending OTP...'
              ) : (
                <>
                  Send OTP
                  <FiSend size={16} />
                </>
              )}
            </button>

          </form>

          <p className="text-xs text-slate-400 text-center mt-7">
            For security, verification OTPs expire after 10 minutes.
          </p>

        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;