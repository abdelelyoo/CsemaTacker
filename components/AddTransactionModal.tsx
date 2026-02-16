import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, Hash, DollarSign, Calculator, Zap, AlertTriangle } from 'lucide-react';
import { Holding, Transaction } from '../types';
import { validateTransaction } from '../utils/validation';

interface AddTransactionModalProps {
  onSave: (data: any) => void;
  onClose: () => void;
  holdings?: Holding[];
  currentPrices?: Record<string, number>;
  initialData?: Transaction | null;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ onSave, onClose, holdings, currentPrices = {}, initialData }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    operation: 'Achat',
    ticker: '',
    company: '',
    qty: '',
    price: '',
    fees: '',
    tax: '',
    total: '',
    avgPrice: '' // New helper for Tax Basis
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [autoCalcFees, setAutoCalcFees] = useState(true);

  // Load initial data for editing
  useEffect(() => {
    if (initialData) {
      // Disable auto-calc so we don't overwrite existing fees/tax with calculated defaults immediately
      setAutoCalcFees(false);

      // Convert date to YYYY-MM-DD for input
      const dateStr = initialData.parsedDate.toISOString().split('T')[0];

      setFormData({
        date: dateStr,
        operation: initialData.Operation,
        ticker: initialData.Ticker,
        company: initialData.Company,
        qty: Math.abs(initialData.Qty).toString(),
        price: initialData.Price.toString(),
        fees: (initialData.Fees || 0).toString(),
        tax: (initialData.Tax || 0).toString(),
        total: initialData.Total.toString(),
        avgPrice: ''
      });
    }
  }, [initialData]);

  // Constants for Moroccan Market Fees (HT + VAT)
  const BROKERAGE_RATE_HT = 0.006; // 0.60%
  const BROKERAGE_MIN_HT = 7.50;

  const SETTLEMENT_RATE_HT = 0.002; // 0.20%
  const SETTLEMENT_MIN_HT = 2.50;

  const SBVC_RATE_HT = 0.001; // 0.10% (Stock Exchange Fee)

  const VAT_RATE = 0.10; // 10%
  const TPCVM_RATE = 0.15; // 15% Tax on Capital Gains

  // Update company and avgPrice when ticker changes
  useEffect(() => {
    if (formData.ticker && holdings && !initialData) {
      // Only auto-fill company/avgPrice if NOT editing existing record (or if user changes ticker)
      const holding = holdings.find(h => h.ticker === formData.ticker);
      if (holding) {
        setFormData(prev => ({
          ...prev,
          company: holding.company,
          avgPrice: holding.averagePrice.toFixed(2)
        }));
      }
    }
  }, [formData.ticker, holdings, initialData]);

  // Auto-calculate logic
  useEffect(() => {
    const q = parseFloat(formData.qty) || 0;
    const p = parseFloat(formData.price) || 0;
    const grossAmount = q * p;

    let fees = parseFloat(formData.fees) || 0;
    let tax = parseFloat(formData.tax) || 0;
    const avgPrice = parseFloat(formData.avgPrice) || 0;

    // Auto-calc fees/tax if enabled
    if (autoCalcFees && grossAmount > 0) {
      // 1. Calculate Trading Fees
      if (formData.operation === 'Achat' || formData.operation === 'Vente') {
        const brokerage = Math.max(grossAmount * BROKERAGE_RATE_HT, BROKERAGE_MIN_HT);
        const settlement = Math.max(grossAmount * SETTLEMENT_RATE_HT, SETTLEMENT_MIN_HT);
        const sbvc = grossAmount * SBVC_RATE_HT;

        const totalHT = brokerage + settlement + sbvc;
        fees = totalHT * (1 + VAT_RATE);
      }

      // 2. Calculate TPCVM (Tax) for Sales
      if (formData.operation === 'Vente' && avgPrice > 0) {
        // Tax is on Gross Capital Gain (Price - AvgPrice)
        const gain = (p - avgPrice) * q;
        if (gain > 0) {
          tax = gain * TPCVM_RATE;
        } else {
          tax = 0;
        }
      }

      // Check differences before setting state to avoid infinite loops
      const currentFees = parseFloat(formData.fees) || 0;
      const currentTax = parseFloat(formData.tax) || 0;

      const shouldUpdateFees = Math.abs(fees - currentFees) > 0.01;
      const shouldUpdateTax = formData.operation === 'Vente' && Math.abs(tax - currentTax) > 0.01;

      if (shouldUpdateFees || shouldUpdateTax) {
        setFormData(prev => ({
          ...prev,
          fees: shouldUpdateFees ? fees.toFixed(2) : prev.fees,
          tax: shouldUpdateTax ? tax.toFixed(2) : prev.tax
        }));
      }
    }

    if (q && p) {
      let calculated = 0;

      switch (formData.operation) {
        case 'Achat':
          // Cost = Gross + Fees
          calculated = -(grossAmount + fees);
          break;
        case 'Vente':
          // Net Proceeds = Gross - Fees - Tax
          calculated = grossAmount - fees - tax;
          break;
        case 'Dividende':
          // Net = Gross - Tax
          calculated = grossAmount - tax;
          break;
        case 'Frais':
        case 'Taxe':
        case 'Retrait':
          calculated = -Math.abs(grossAmount > 0 ? grossAmount : parseFloat(formData.total) || 0);
          break;
        case 'Depot':
          calculated = Math.abs(grossAmount > 0 ? grossAmount : parseFloat(formData.total) || 0);
          break;
        default:
          calculated = 0;
      }

      // Only update total if it changed significantly (and if we are auto-calculating OR if the user hasn't manually overridden total)
      const currentTotal = parseFloat(formData.total) || 0;
      // We update total if autoCalcFees is on, OR if the calculated total is different (implies input changed)
      if (Math.abs(calculated - currentTotal) > 0.01) {
        setFormData(prev => ({ ...prev, total: calculated.toFixed(2) }));
      }
    }
  }, [formData.qty, formData.price, formData.operation, formData.avgPrice, autoCalcFees, formData.fees, formData.tax]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // If user manually edits fees or tax, disable auto-calc
    if (name === 'fees' || name === 'tax') {
      setAutoCalcFees(false);
    }

    // If editing ticker, force uppercase
    if (name === 'ticker') {
      setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const useLivePrice = () => {
    if (formData.ticker && currentPrices[formData.ticker]) {
      setFormData(prev => ({ ...prev, price: currentPrices[formData.ticker].toString() }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate before saving
    const result = validateTransaction({
      ...formData,
      Qty: parseFloat(formData.qty),
      Price: parseFloat(formData.price),
      Total: parseFloat(formData.total),
      Date: formData.date,
      Operation: formData.operation,
      Ticker: formData.ticker
    });

    if (!result.valid) {
      setValidationErrors(result.errors);
      // Scroll to top of form to see errors
      const form = e.currentTarget as HTMLFormElement;
      form.parentElement?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (onSave) {
      onSave(formData);
    }
    onClose();
  };

  const livePrice = formData.ticker && currentPrices[formData.ticker];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl sticky top-0 z-10">
          <h2 className="text-lg font-bold text-slate-900">
            {initialData ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {validationErrors.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-1">
                <AlertTriangle size={14} />
                <span>Please fix the following:</span>
              </div>
              <ul className="list-disc list-inside text-xs text-rose-600 space-y-0.5">
                {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          {/* Operation & Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Operation</label>
              <div className="relative">
                <select
                  name="operation"
                  value={formData.operation}
                  onChange={handleChange}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none text-sm"
                >
                  <option value="Achat">Achat (Buy)</option>
                  <option value="Vente">Vente (Sell)</option>
                  <option value="Depot">Depot (Deposit)</option>
                  <option value="Retrait">Retrait (Withdrawal)</option>
                  <option value="Dividende">Dividende</option>
                  <option value="Frais">Frais (Fee)</option>
                  <option value="Taxe">Taxe</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="date"
                  name="date"
                  required
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Ticker & Company */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Ticker</label>
              <input
                type="text"
                name="ticker"
                value={formData.ticker}
                onChange={handleChange}
                placeholder="IAM"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium uppercase"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Company Name</label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Maroc Telecom"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>

          {/* Qty & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Quantity</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="number"
                  name="qty"
                  step="any"
                  value={formData.qty}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-500">Unit Price</label>
                {livePrice && (
                  <button
                    type="button"
                    onClick={useLivePrice}
                    className="text-[10px] flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 hover:bg-emerald-100 transition-colors"
                  >
                    <Zap size={10} className="fill-current" />
                    Live: {livePrice}
                  </button>
                )}
              </div>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="number"
                  name="price"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Fees & Tax Section */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Fees & Taxes</span>
              {['Achat', 'Vente'].includes(formData.operation) && (
                <button
                  type="button"
                  onClick={() => setAutoCalcFees(!autoCalcFees)}
                  className={`text-[10px] px-2 py-1 rounded border transition-colors flex items-center gap-1 ${autoCalcFees ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500 border-slate-200'}`}
                >
                  <Calculator size={10} />
                  Auto Calc
                </button>
              )}
            </div>

            {/* Hidden helper field for Sell logic */}
            {formData.operation === 'Vente' && autoCalcFees && (
              <div className="flex items-center gap-2 mb-2 bg-blue-50 p-2 rounded border border-blue-100">
                <span className="text-[10px] text-blue-700 whitespace-nowrap">Tax Basis (Avg Price):</span>
                <input
                  type="number"
                  name="avgPrice"
                  value={formData.avgPrice}
                  onChange={handleChange}
                  className="w-full bg-white border border-blue-200 text-xs px-1 py-0.5 rounded text-right"
                  placeholder="Avg Px"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Trading Fees (MAD)</label>
                <input
                  type="number"
                  name="fees"
                  step="0.01"
                  value={formData.fees}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Tax / TPCVM (MAD)</label>
                <input
                  type="number"
                  name="tax"
                  step="0.01"
                  value={formData.tax}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Total */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Net Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">MAD</span>
              <input
                type="number"
                name="total"
                required
                step="0.01"
                value={formData.total}
                onChange={handleChange}
                className={`w-full pl-12 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-lg ${parseFloat(formData.total) < 0 ? 'text-rose-600 bg-rose-50 border-rose-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200'
                  }`}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Includes Price * Qty +/- Fees +/- Tax.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg shadow-lg transition-all flex items-center justify-center space-x-2 mt-4"
          >
            <Save size={18} />
            <span>{initialData ? 'Update Transaction' : 'Save Transaction'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};