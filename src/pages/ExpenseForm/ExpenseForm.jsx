import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses } from '../../hooks/useExpenses';
import api from '../../services/api';
import { 
  FiFileText, FiUploadCloud, FiAlertTriangle, FiCheckCircle, 
  FiArrowLeft, FiInfo, FiTag, FiCalendar, FiPlus, FiTrash2, FiPaperclip
} from 'react-icons/fi';

const ExpenseForm = () => {
  const { user } = useAuth();
  const { addExpense } = useExpenses();
  const navigate = useNavigate();

  // Form states
  const [claimTitle, setClaimTitle] = useState('');
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([
    {
      id: Date.now(),
      title: '',
      categoryId: '',
      merchant: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      receiptFile: null,
      receiptName: ''
    }
  ]);

  const [overallReceiptFile, setOverallReceiptFile] = useState(null);
  const [overallReceiptName, setOverallReceiptName] = useState('');
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
          // Set default category for first line item
          setItems(prev => prev.map(item => item.categoryId ? item : { ...item, categoryId: res.data.data[0]._id }));
        }
      } catch (err) {
        console.error('Error fetching categories:', err.message);
      }
    };
    fetchCategories();
  }, []);

  // Compute live total claim amount
  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  // Live Policy Checker across all items
  useEffect(() => {
    const warnings = [];

    items.forEach((item, index) => {
      const amt = Number(item.amount);
      const selectedCat = categories.find(c => c._id === item.categoryId);

      if (!item.amount || isNaN(amt) || amt <= 0 || !selectedCat) return;

      if (amt > selectedCat.maxLimit) {
        warnings.push(`Item #${index + 1} (${item.title || 'Expense'}): ${selectedCat.name} limit cap is ₹${selectedCat.maxLimit.toLocaleString()}. Approvals will trigger audit exceptions.`);
      }
      if (selectedCat.receiptRequired && amt > 500 && !item.receiptName && !overallReceiptName) {
        warnings.push(`Item #${index + 1} (${item.title || 'Expense'}): Receipt attachment is mandatory for ${selectedCat.name} transactions above ₹500.`);
      }
    });

    setPolicyWarnings(warnings);
  }, [items, overallReceiptName, categories]);

  const handleAddItem = () => {
    const defaultCatId = categories.length > 0 ? categories[0]._id : '';
    setItems([
      ...items,
      {
        id: Date.now() + Math.random(),
        title: '',
        categoryId: defaultCatId,
        merchant: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        receiptFile: null,
        receiptName: ''
      }
    ]);
  };

  const handleRemoveItem = (id) => {
    if (items.length <= 1) return;
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    setErrors(prev => ({ ...prev, [id]: undefined }));
  };

  const handleItemFileChange = (id, file) => {
    if (file) {
      setItems(items.map(item => item.id === id ? { ...item, receiptFile: file, receiptName: file.name } : item));
    }
  };

  const handleOverallFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setOverallReceiptFile(e.target.files[0]);
      setOverallReceiptName(e.target.files[0].name);
    }
  };

  const handleFormSubmit = async (e, isDraft = false) => {
    e.preventDefault();
    const newErrors = {};

    if (!claimTitle.trim()) newErrors.claimTitle = 'Claim title is required';

    items.forEach((item) => {
      const itemErrors = {};
      if (!item.title.trim()) itemErrors.title = 'Item title is required';
      if (!item.amount || isNaN(Number(item.amount)) || Number(item.amount) <= 0) {
        itemErrors.amount = 'Valid amount > 0 is required';
      }
      if (!item.date) itemErrors.date = 'Date is required';

      const selectedCat = categories.find(c => c._id === item.categoryId);
      if (!isDraft && selectedCat?.receiptRequired && Number(item.amount) > 500 && !item.receiptFile && !overallReceiptFile) {
        itemErrors.receipt = `Receipt file is required for ${selectedCat.name} > ₹500`;
      }

      if (Object.keys(itemErrors).length > 0) {
        newErrors[item.id] = itemErrors;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    const primaryItem = items[0];
    const claimData = {
      title: claimTitle,
      categoryId: primaryItem.categoryId,
      merchant: primaryItem.merchant || 'Multiple Merchants',
      amount: totalAmount,
      date: primaryItem.date,
      description: `Reimbursement claim containing ${items.length} line items.`,
      items: items.map(it => ({
        title: it.title,
        categoryId: it.categoryId,
        merchant: it.merchant,
        amount: Number(it.amount),
        date: it.date,
        description: it.description,
        receiptFile: it.receiptFile
      })),
      isDraft
    };

    try {
      const claim = await addExpense(claimData, overallReceiptFile);
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

        <div className="p-4 bg-slate-50 rounded-xl text-left text-xs space-y-2.5 border border-slate-200/50">
          <div className="flex justify-between">
            <span className="text-slate-400">Claim Title:</span>
            <span className="font-semibold text-slate-800">{submittedClaim.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Total Line Items:</span>
            <span className="font-semibold text-slate-800">{submittedClaim.items?.length || 1} items</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Total Calculated Amount:</span>
            <span className="font-bold text-slate-900 text-sm">₹{submittedClaim.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
    <div className="max-w-4xl mx-auto space-y-6">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
      >
        <FiArrowLeft size={14} /> Back to Dashboard
      </button>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-display">File Reimbursement Claim</h1>
        <p className="text-sm text-slate-500 mt-1">Add multiple expense items with their individual receipts for a single business trip or event.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form panel */}
        <div className="lg:col-span-2 space-y-5">
          <form onSubmit={(e) => handleFormSubmit(e, false)} className="space-y-5">
            {/* Overall Claim Title */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 uppercase tracking-wider">Overall Claim / Event Title</label>
                <div className="relative">
                  <FiFileText className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Pune Client Visit & Business Development Trip"
                    value={claimTitle}
                    onChange={(e) => { setClaimTitle(e.target.value); setErrors(p => ({ ...p, claimTitle: '' })); }}
                    className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-corporate-500 font-semibold ${errors.claimTitle ? 'border-rose-500' : 'border-slate-200'}`}
                  />
                </div>
                {errors.claimTitle && <span className="text-[10px] text-rose-600 font-semibold block mt-1">{errors.claimTitle}</span>}
              </div>

              {/* Total Summary Banner */}
              <div className="bg-slate-900 text-white rounded-xl p-4 flex justify-between items-center shadow-inner">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total Claim Amount ({items.length} Expense Items)</span>
                  <span className="text-xl font-extrabold font-mono text-corporate-300">₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1.5 px-3 py-2 bg-corporate-600 hover:bg-corporate-500 text-white font-bold rounded-lg text-xs transition shadow"
                >
                  <FiPlus size={14} /> Add Another Expense Item
                </button>
              </div>
            </div>

            {/* Dynamic Line Items Cards */}
            <div className="space-y-4">
              {items.map((item, index) => {
                const itemErr = errors[item.id] || {};
                return (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 relative transition hover:border-slate-300">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <span className="text-xs font-bold text-corporate-700 bg-corporate-50 px-2.5 py-1 rounded-full border border-corporate-100">
                        Expense Item #{index + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition"
                          title="Remove expense line item"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      )}
                    </div>

                    {/* Title / Category */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Item Title / Expense Description</label>
                        <input
                          type="text"
                          placeholder="e.g. Flight Ticket, Food Allowance, Taxi Fare"
                          value={item.title}
                          onChange={(e) => handleItemChange(item.id, 'title', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-corporate-500 ${itemErr.title ? 'border-rose-500' : 'border-slate-200'}`}
                        />
                        {itemErr.title && <span className="text-[10px] text-rose-600 font-semibold block mt-1">{itemErr.title}</span>}
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Category</label>
                        <select
                          value={item.categoryId}
                          onChange={(e) => handleItemChange(item.id, 'categoryId', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-corporate-500"
                        >
                          {categories.map((c) => (
                            <option key={c._id} value={c._id}>{c.name} (Cap: ₹{c.maxLimit})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Merchant / Amount / Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Merchant / Vendor</label>
                        <input
                          type="text"
                          placeholder="e.g. IndiGo, Uber, Marriott"
                          value={item.merchant}
                          onChange={(e) => handleItemChange(item.id, 'merchant', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-corporate-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Amount (₹)</label>
                        <div className="relative">
                          <div className="absolute left-3 top-2 text-slate-400 font-bold">₹</div>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={item.amount}
                            onChange={(e) => handleItemChange(item.id, 'amount', e.target.value)}
                            className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-corporate-500 ${itemErr.amount ? 'border-rose-500' : 'border-slate-200'}`}
                          />
                        </div>
                        {itemErr.amount && <span className="text-[10px] text-rose-600 font-semibold block mt-1">{itemErr.amount}</span>}
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Date</label>
                        <input
                          type="date"
                          value={item.date}
                          onChange={(e) => handleItemChange(item.id, 'date', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-corporate-500 ${itemErr.date ? 'border-rose-500' : 'border-slate-200'}`}
                        />
                      </div>
                    </div>

                    {/* Individual Receipt File Upload Box per Line Item */}
                    <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <FiPaperclip className="text-corporate-600" /> Individual Receipt for Item #{index + 1}
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="cursor-pointer px-3 py-1.5 bg-white border border-slate-200 hover:border-corporate-400 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5 shrink-0">
                          <FiUploadCloud size={14} className="text-corporate-600" />
                          <span>{item.receiptName ? 'Change Receipt' : 'Attach Receipt'}</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleItemFileChange(item.id, e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                        <span className="text-xs text-slate-500 truncate font-mono">
                          {item.receiptName ? item.receiptName : 'No individual file attached'}
                        </span>
                      </div>
                      {itemErr.receipt && <span className="text-[10px] text-rose-600 font-semibold block mt-1">{itemErr.receipt}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Optional Shared Receipt Upload Component */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Shared / Overall Claim Receipt Document (Optional)</label>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center hover:bg-slate-50/50 transition cursor-pointer relative bg-slate-50">
                <input
                  type="file"
                  onChange={handleOverallFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <FiUploadCloud size={28} className="mx-auto text-slate-400 mb-1.5" />
                <span className="text-xs font-semibold text-slate-700 block">
                  {overallReceiptName ? overallReceiptName : 'Upload combined/shared receipt document (PDF, PNG, JPG)'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Attach if you have a combined invoice for all expenses</span>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={(e) => handleFormSubmit(e, true)}
                disabled={loading}
                className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition"
              >
                Save Draft
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-corporate-600 hover:bg-corporate-700 text-white rounded-xl font-bold shadow-md shadow-corporate-100 transition duration-150"
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
                <span>Fully compliant. No policy violations flagged for the entered expense items.</span>
              </div>
            )}

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category Policy Limits</span>
              <ul className="text-xs text-slate-600 space-y-1.5 pl-4 list-disc font-medium">
                {categories.map((c) => (
                  <li key={c._id}>{c.name}: Cap is ₹{c.maxLimit.toLocaleString()}. {c.receiptRequired ? 'Receipt required.' : 'No receipt required.'}</li>
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
