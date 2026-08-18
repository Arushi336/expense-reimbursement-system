import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiMail, FiSend, FiCheckCircle } from 'react-icons/fi';
import api from '../../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage('');
    setError('');

    if (!email) {
      setError('Please enter your registered email address.');
      return;
    }

    try {
      setLoading(true);

      const response = await api.post('/auth/forgot-password', {
        email
      });

      setMessage(
        response.data?.message ||
        'If an account exists with this email, a password reset link has been sent.'
      );

      setEmail('');
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
              <FiMail className="text-corporate-600" size={23} />
            </div>

            <h1 className="text-2xl font-bold text-slate-950">
              Forgot Password?
            </h1>

            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Enter your registered corporate email address and we'll send
              you a link to reset your password.
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
                    setMessage('');
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
              className="w-full py-3 bg-corporate-600 hover:bg-corporate-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-md transition-all flex justify-center items-center gap-2"
            >
              {loading ? (
                'Sending...'
              ) : (
                <>
                  Send Reset Link
                  <FiSend size={16} />
                </>
              )}
            </button>

          </form>

          <p className="text-xs text-slate-400 text-center mt-7">
            For security, password reset links expire after a limited time.
          </p>

        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;