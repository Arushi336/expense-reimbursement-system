import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses } from '../../hooks/useExpenses';
import api from '../../services/api';
import { 
  FiFileText, FiUploadCloud, FiAlertTriangle, FiCheckCircle, 
  FiArrowLeft, FiInfo, FiTag, FiCalendar
} from 'react-icons/fi';

const ExpenseForm = () => {
  const { user } = useAuth();
  const { addExpense } = useExpenses();
  const navigate = useNavigate();

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptName, setReceiptName] = useState('');
  const [errors, setErrors] = useState({});
  const [policyWarnings, setPolicyWarnings] = useState([]);
  const [submittedClaim, setSubmittedClaim] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load active categories from backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/admin/categories');
        if (res.data.success && res.data.data.length > 0) {
          setCategories(res.data.data);
          setCategory(res.data.data[0]._id); // default to first category ID
        }
      } catch (err) {
        console.error('Error fetching categories:', err.message);
      }
    };
    fetchCategories();
  }, []);

  // Live Policy Checker
  useEffect(() => {
    const warnings = [];
    const amt = Number(amount);
    const selectedCat = categories.find(c => c._id === category);

    if (!amount || isNaN(amt) || amt <= 0 || !selectedCat) {
      setPolicyWarnings([]);
      return;
    }

    if (amt > selectedCat.maxLimit) {
      warnings.push(`Policy Limit: ${selectedCat.name} limit cap is ₹${selectedCat.maxLimit}. Approvals will trigger audit exceptions.`);
    }
    if (selectedCat.receiptRequired && amt > 500 && !receiptName) {
      warnings.push(`Compliance Alert: Receipt attachment is mandatory for ${selectedCat.name} transactions above ₹500.`);
    }

    setPolicyWarnings(warnings);
  }, [amount, category, receiptName, categories]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
      setReceiptName(e.target.files[0].name);
    }
  };

  const handleFormSubmit = async (e, isDraft = false) => {
    e.preventDefault();
    const newErrors = {};

    if (!title.trim()) newErrors.title = 'Expense title is required';
    if (!merchant.trim()) newErrors.merchant = 'Merchant details are required';
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0';
    }
    if (!date) newErrors.date = 'Date of transaction is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    const claimData = {
      title,
      categoryId: category,
      merchant,
      amount: Number(amount),
      date,
      description,
      isDraft
    };

    try {
      const claim = await addExpense(claimData, receiptFile);
      setSubmittedClaim(claim);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submittedClaim) {
    return (
      <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-lg text-center space-y-6 my-10 animate-fade-in">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
          <FiCheckCircle size={36} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Claim Lodged Successfully</h2>
          <p className="text-sm text-slate-500">Your claim has been assigned tracking ID <strong className="text-slate-900 font-mono">{submittedClaim.id}</strong></p>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl text-left text-xs space-y-2 border border-slate-200/50">
          <div className="flex justify-between">
            <span className="text-slate-400">Title:</span>
            <span className="font-semibold text-slate-800">{submittedClaim.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Amount:</span>
            <span className="font-bold text-slate-900">₹{submittedClaim.amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Current Status:</span>
            <span className="font-semibold text-corporate-600">{submittedClaim.status}</span>
          </div>
          {submittedClaim.policyViolation && (
            <div className="pt-2 border-t text-rose-600">
              <strong>Flagged Exceptions:</strong>
              <p className="mt-0.5">{submittedClaim.policyMessage}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/employee')}
            className="flex-1 py-2.5 bg-corporate-600 hover:bg-corporate-700 text-white rounded-xl font-bold shadow transition"
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate('/expense-history')}
            className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition"
          >
            View History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
      >
        <FiArrowLeft size={14} /> Back to Dashboard
      </button>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-display">File New Reimbursement Claim</h1>
        <p className="text-sm text-slate-500 mt-1">Please provide accurate transaction details and invoice documentation.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form panel */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <form onSubmit={(e) => handleFormSubmit(e, false)} className="space-y-5">
            {/* Title */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Expense Title / Description Summary</label>
              <div className="relative">
                <FiFileText className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Flight ticket to summit, Office hardware purchase"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setErrors(p => ({...p, title: ''})); }}
                  className={`w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-corporate-500 ${errors.title ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200'}`}
                />
              </div>
              {errors.title && <span className="text-[10px] text-rose-600 font-semibold block mt-1">{errors.title}</span>}
            </div>

            {/* Category / Merchant */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Expense Category</label>
                <div className="relative">
                  <FiTag className="absolute left-3 top-3 text-slate-400" />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-corporate-500"
                  >
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Merchant / Vendor</label>
                <input
                  type="text"
                  placeholder="e.g. AWS, Uber, Marriott, Starbucks"
                  value={merchant}
                  onChange={(e) => { setMerchant(e.target.value); setErrors(p => ({...p, merchant: ''})); }}
                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-corporate-500 ${errors.merchant ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200'}`}
                />
                {errors.merchant && <span className="text-[10px] text-rose-600 font-semibold block mt-1">{errors.merchant}</span>}
              </div>
            </div>

            {/* Amount / Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Total Amount (₹)</label>
                <div className="relative">
                  <div className="absolute left-3 top-2 text-slate-400 font-bold">₹</div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setErrors(p => ({...p, amount: ''})); }}
                    className={`w-full pl-8 pr-4 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-corporate-500 ${errors.amount ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200'}`}
                  />
                </div>
                {errors.amount && <span className="text-[10px] text-rose-600 font-semibold block mt-1">{errors.amount}</span>}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Transaction Date</label>
                <div className="relative">
                  <FiCalendar className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => { setDate(e.target.value); setErrors(p => ({...p, date: ''})); }}
                    className={`w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-corporate-500 ${errors.date ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200'}`}
                  />
                </div>
                {errors.date && <span className="text-[10px] text-rose-600 font-semibold block mt-1">{errors.date}</span>}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Business Rationale / Project Code</label>
              <textarea
                placeholder="Describe why this expense was necessary for operations and list project codes if applicable..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-corporate-500"
                rows="4"
              />
            </div>

            {/* Receipt Upload Visual Component */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Invoice Receipt Attachment</label>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50/50 transition cursor-pointer relative bg-slate-50">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <FiUploadCloud size={32} className="mx-auto text-slate-400 mb-2" />
                <span className="text-sm font-semibold text-slate-700 block">
                  {receiptName ? receiptName : 'Upload receipt file (PDF, PNG, JPG)'}
                </span>
                <span className="text-xs text-slate-400 block mt-1">Drag and drop file here, or click to browse</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={(e) => handleFormSubmit(e, true)}
                disabled={loading}
                className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg transition"
              >
                Save Draft
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-corporate-600 hover:bg-corporate-700 text-white rounded-lg font-bold shadow-md shadow-corporate-100 transition duration-150"
              >
                {loading ? 'Submitting...' : 'Submit Claim'}
              </button>
            </div>
          </form>
        </div>

        {/* Right side live validation board */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-fit space-y-6 lg:sticky lg:top-24">
          <div>
            <h2 className="text-md font-bold text-slate-900 flex items-center gap-1.5">
              <FiInfo className="text-corporate-600" /> Compliance Board
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Real-time policy limit analyzer</p>
          </div>

          <div className="space-y-4">
            {policyWarnings.length > 0 ? (
              <div className="space-y-2">
                {policyWarnings.map((warning, idx) => (
                  <div key={idx} className="flex gap-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                    <FiAlertTriangle size={18} className="shrink-0 text-rose-600 mt-0.5" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-2.5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
                <FiCheckCircle size={18} className="shrink-0 text-emerald-600" />
                <span>Fully compliant. No policy violations flagged for this amount and category.</span>
              </div>
            )}

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category Guidelines</span>
              <ul className="text-xs text-slate-600 space-y-1.5 pl-4 list-disc font-medium">
                {categories.map((c) => (
                  <li key={c._id}>{c.code}: Cap is ₹{c.maxLimit}. {c.receiptRequired ? 'Receipt required.' : 'No receipt required.'}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseForm;
