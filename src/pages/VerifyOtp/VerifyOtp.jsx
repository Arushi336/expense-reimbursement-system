import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiShield, FiRefreshCw, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';
import api from '../../services/api';

const OTP_LENGTH = 6;
const INITIAL_COOLDOWN_SECONDS = 60;
const INITIAL_EXPIRATION_SECONDS = 600; // 10 minutes

const VerifyOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve email from route state
  const emailFromState = location.state?.email || '';
  const [email, setEmail] = useState(emailFromState);

  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Timers
  const [resendCooldown, setResendCooldown] = useState(INITIAL_COOLDOWN_SECONDS);
  const [expirationSeconds, setExpirationSeconds] = useState(INITIAL_EXPIRATION_SECONDS);

  const inputRefs = useRef([]);

  // Auto-focus first input on load
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Cooldown countdown timer for Resend OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Expiration countdown timer (10 minutes)
  useEffect(() => {
    if (expirationSeconds <= 0) return;
    const interval = setInterval(() => {
      setExpirationSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [expirationSeconds]);

  // Mask email for display: e.g. "ud*****@mmcoe.edu.in"
  const maskEmail = (str) => {
    if (!str) return 'your registered email';
    const parts = str.split('@');
    if (parts.length !== 2) return str;
    const [user, domain] = parts;
    const maskedUser = user.length <= 2 
      ? user + '***' 
      : user.slice(0, 2) + '*'.repeat(Math.max(3, user.length - 2));
    return `${maskedUser}@${domain}`;
  };

  // Format seconds to mm:ss
  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle single digit input
  const handleDigitChange = (index, value) => {
    setError('');
    setSuccessMessage('');

    // Allow only numeric digits
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const nextDigits = [...otpDigits];
      nextDigits[index] = '';
      setOtpDigits(nextDigits);
      return;
    }

    const nextDigits = [...otpDigits];
    nextDigits[index] = cleaned[cleaned.length - 1]; // take the latest digit
    setOtpDigits(nextDigits);

    // Auto-advance to next input if available
    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Backspace and arrow navigation
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const nextDigits = [...otpDigits];
        nextDigits[index - 1] = '';
        setOtpDigits(nextDigits);
      } else {
        const nextDigits = [...otpDigits];
        nextDigits[index] = '';
        setOtpDigits(nextDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste full 6-digit OTP
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (!pastedData) return;

    const nextDigits = [...otpDigits];
    for (let i = 0; i < OTP_LENGTH; i++) {
      if (i < pastedData.length) {
        nextDigits[i] = pastedData[i];
      }
    }
    setOtpDigits(nextDigits);

    // Focus last filled or next empty box
    const nextFocusIndex = Math.min(pastedData.length, OTP_LENGTH - 1);
    inputRefs.current[nextFocusIndex]?.focus();
  };

  // Submit OTP Verification
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const otp = otpDigits.join('');

    if (!email) {
      setError('Email address is missing. Please return to the Forgot Password page.');
      return;
    }

    if (otp.length !== OTP_LENGTH || !/^\d{6}$/.test(otp)) {
      setError('Please enter all 6 numeric digits of the OTP.');
      return;
    }

    if (expirationSeconds <= 0) {
      setError('This OTP has expired. Please click "Resend OTP" to request a new one.');
      return;
    }

    try {
      setLoading(true);

      const response = await api.post('/auth/verify-reset-otp', {
        email,
        otp
      });

      setSuccessMessage(response.data?.message || 'OTP verified successfully.');

      // Brief transition before redirect
      setTimeout(() => {
        navigate('/reset-password', {
          state: { email }
        });
      }, 800);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Failed to verify OTP. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setError('');
    setSuccessMessage('');

    if (!email) {
      setError('Please specify your registered corporate email.');
      return;
    }

    try {
      setResending(true);

      const response = await api.post('/auth/forgot-password', {
        email
      });

      setSuccessMessage(response.data?.message || 'A new 6-digit OTP has been dispatched to your email.');
      
      // Clear current input and reset timers
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setResendCooldown(INITIAL_COOLDOWN_SECONDS);
      setExpirationSeconds(INITIAL_EXPIRATION_SECONDS);

      // Focus first input
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Failed to resend OTP. Please try again.'
      );
    } finally {
      setResending(false);
    }
  };

  const isOtpComplete = otpDigits.every((digit) => digit !== '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-corporate-950 flex items-center justify-center p-4">
      {/* Background radial glows */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(14,144,233,0.12),transparent_40%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 lg:p-10">
          
          <div className="mb-8 flex items-center justify-between">
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-corporate-600 transition-colors"
            >
              <FiArrowLeft size={16} />
              Change Email
            </Link>

            {/* Expiration badge */}
            <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
              expirationSeconds > 60 
                ? 'bg-corporate-50 text-corporate-700 border border-corporate-150' 
                : 'bg-rose-50 text-rose-600 border border-rose-200 animate-pulse'
            }`}>
              <FiClock size={12} />
              <span>{formatTime(expirationSeconds)}</span>
            </div>
          </div>

          <div className="mb-8">
            <div className="w-12 h-12 rounded-2xl bg-corporate-50 flex items-center justify-center mb-5 border border-corporate-100">
              <FiShield className="text-corporate-600" size={23} />
            </div>

            <h1 className="text-2xl font-bold text-slate-950 font-display">
              Verify OTP
            </h1>

            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              OTP sent to:
            </p>
            <p className="text-sm font-bold text-corporate-700 tracking-wide mt-0.5 font-mono bg-corporate-50/70 inline-block px-2.5 py-1 rounded-lg border border-corporate-100">
              {maskEmail(email)}
            </p>
          </div>

          {/* Missing email fallback */}
          {!email && (
            <div className="mb-5 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <FiAlertCircle size={15} />
                <span>Email address not detected</span>
              </div>
              <p>Please enter your corporate email to verify your OTP:</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium flex gap-3 items-start animate-fadeIn">
              <FiCheckCircle className="mt-0.5 shrink-0" size={18} />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="mb-5 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-6">
            
            {/* 6-Digit segmented input boxes */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3 text-center">
                Enter 6-Digit Code
              </label>

              <div className="flex justify-between items-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl border transition-all text-slate-900 bg-white ${
                      digit 
                        ? 'border-corporate-600 ring-2 ring-corporate-100 shadow-sm' 
                        : 'border-slate-200 hover:border-slate-300'
                    } focus:outline-none focus:border-corporate-500 focus:ring-2 focus:ring-corporate-500`}
                  />
                ))}
              </div>
            </div>

            {/* Verify OTP Button */}
            <button
              type="submit"
              disabled={loading || !isOtpComplete || expirationSeconds <= 0}
              className="w-full py-3 bg-corporate-600 hover:bg-corporate-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-md shadow-corporate-100 hover:shadow-lg transition-all flex justify-center items-center gap-2 text-sm"
            >
              {loading ? (
                'Verifying Code...'
              ) : (
                'Verify OTP'
              )}
            </button>

          </form>

          {/* Resend OTP Section */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-2">
            <span className="text-xs text-slate-400">
              Didn't receive the verification email?
            </span>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || resending}
              className="inline-flex items-center gap-2 text-xs font-bold text-corporate-600 hover:text-corporate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
            >
              <FiRefreshCw size={13} className={resending ? 'animate-spin' : ''} />
              {resendCooldown > 0
                ? `Resend OTP in ${resendCooldown}s`
                : resending
                ? 'Sending New OTP...'
                : 'Resend OTP'}
            </button>
          </div>

          <p className="text-xs text-slate-400 text-center mt-6">
            For security, please do not share your OTP with anyone.
          </p>

        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
