import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, X, Loader2, AlertCircle, RotateCcw, Eye, Trash2,
  Package, User as UserIcon, Calendar, RefreshCw, Receipt,
  HandCoins, Wallet, TrendingDown, Boxes, Layers, ArrowLeftRight,
  CheckCircle2, Info, ChevronDown, ChevronUp, FileText
} from 'lucide-react';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import Toast from '../components/Toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const api = axios.create({ baseURL: API_BASE_URL, headers: { Accept: 'application/json' } });
api.interceptors.request.use((c) => {
  const t = sessionStorage.getItem('auth_token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

const CURRENCY_LABEL = { AFN: 'افغانی', USD: 'دالر' };

const REFUND_TYPES = {
  cash:        { text: 'برگشت نقدی',     icon: Wallet,        color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
  reduce_debt: { text: 'کاهش قرض مشتری', icon: HandCoins,     color: 'text-orange-700 bg-orange-50 border-orange-300' },
  exchange:    { text: 'تبدیل به محصول', icon: ArrowLeftRight, color: 'text-blue-700 bg-blue-50 border-blue-300' },
};

export default function SoldBackReturned() {
  const [returns, setReturns] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [detailReturn, setDetailReturn] = useState(null);

  const fetchReturns = async (search = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/sale-returns', { params: { search: search || undefined } });
      setReturns(data);
    } catch {
      setToast({ show: true, message: 'خطا در دریافت لیست', type: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSales = async () => {
    try {
      const { data } = await api.get('/sales');
      setSales(data);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchReturns(); fetchSales(); }, []);
  useEffect(() => {
    const t = setTimeout(() => fetchReturns(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/sale-returns/${deleteConfirm}`);
      setToast({ show: true, message: 'برگشت حذف و موجودی اصلاح شد', type: 'warning' });
      setDeleteConfirm(null);
      fetchReturns(searchTerm);
    } catch (e) {
      setToast({ show: true, message: e.response?.data?.message || 'خطا', type: 'warning' });
    }
  };

  const totals = useMemo(() => returns.reduce((a, r) => {
    a.count += 1;
    a.refundAfn += Number(r.refund_amount_afn) || 0;
    a.refundUsd += Number(r.refund_amount_usd) || 0;
    a.capitalAfn += Number(r.cost_price_afn) || 0;
    a.profitAfn += Number(r.profit_reversed) || 0;
    return a;
  }, { count: 0, refundAfn: 0, refundUsd: 0, capitalAfn: 0, profitAfn: 0 }), [returns]);

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        {toast.show && (
          <Toast message={toast.message} type={toast.type}
            onClose={() => setToast({ ...toast, show: false })} />
        )}

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-black flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-sm">
                <RotateCcw size={22} />
              </div>
              برگشت فروش (مرجوعی)
            </h1>
            <p className="text-sm text-gray-600 mt-2 mr-1">
              محصولات فروخته‌شده برگردانده می‌شوند، سرمایه به موجودی باز می‌گردد و سود برگشت می‌خورد
            </p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-2">
            <RotateCcw size={18} /> برگشت جدید
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={<RotateCcw size={18} />} label="تعداد برگشت‌ها" value={totals.count} />
          <KpiCard icon={<Wallet size={18} />} label="مبلغ برگشت‌داده‌شده" valueAfn={totals.refundAfn} valueUsd={totals.refundUsd} />
          <KpiCard icon={<Boxes size={18} />} label="سرمایه بازگشته به موجودی" valueAfn={totals.capitalAfn} />
          <KpiCard icon={<TrendingDown size={18} />} label="سود برگشت‌خورده" valueAfn={totals.profitAfn} />
        </div>

        {/* SEARCH */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-300 flex flex-col sm:flex-row gap-3">
          <div className="flex items-center bg-white rounded-xl px-4 py-3 border border-gray-300 focus-within:border-orange-500 flex-1 max-w-md">
            <Search size={20} className="text-gray-400 ml-2" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجو در شماره برگشت، فاکتور، مشتری یا محصول..."
              className="bg-transparent border-none outline-none text-sm w-full text-black placeholder-gray-400" />
          </div>
          <button onClick={() => fetchReturns(searchTerm)}
            className="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-black font-bold text-sm border border-gray-300 flex items-center gap-2">
            <RefreshCw size={14} /> بازخوانی
          </button>
        </div>

        {/* TABLE */}
        {loading ? (
          <div className="bg-white p-16 rounded-2xl border border-gray-300 flex flex-col items-center">
            <Loader2 size={32} className="animate-spin text-orange-500" />
            <p className="text-black mt-4 text-sm font-bold">در حال بارگذاری...</p>
          </div>
        ) : returns.length === 0 ? (
          <div className="bg-white p-16 rounded-2xl border border-gray-300 text-center">
            <RotateCcw size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-black font-bold text-lg mb-1">هیچ برگشتی ثبت نشده</p>
            <p className="text-sm text-gray-500 mb-6">اولین برگشت را ثبت کنید</p>
            <button onClick={() => setShowForm(true)}
              className="bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 hover:bg-orange-600">
              <RotateCcw size={18} /> برگشت جدید
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-300 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="text-right px-4 py-4 text-xs font-bold text-black">#</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-black">شماره برگشت</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-black">فاکتور اصلی</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-black">محصول</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-black">برگشت</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-black">مبلغ برگشت</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-black">سرمایه بازگشتی</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-black">نوع برگشت</th>
                    <th className="text-center px-4 py-4 text-xs font-bold text-black w-28">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {returns.map((r, i) => {
                    const meta = REFUND_TYPES[r.refund_type] || REFUND_TYPES.cash;
                    const RefundIcon = meta.icon;
                    return (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-black text-xs font-bold border border-gray-300">
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-mono text-[11px] font-bold text-black bg-gray-100 px-2 py-1 rounded border border-gray-200">
                            {r.return_number}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-mono text-[11px] text-gray-700">{r.invoice_number}</span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-bold text-black">{r.product_name}</p>
                          <p className="text-[10px] text-gray-500">{r.customer_name}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-bold text-black">
                            {r.qty_returned} × {r.return_unit_name}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {r.cartons_returned > 0 && `${r.cartons_returned} کارتن `}
                            {r.sub_units_returned > 0 && `${r.sub_units_returned} دونە `}
                            ({r.pieces_returned} دانه)
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-bold text-black">
                            {Number(r.refund_amount_afn).toLocaleString()} AFN
                          </p>
                          <p className="text-[10px] text-gray-600">
                            از {Number(r.total_price_afn).toLocaleString()}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-bold text-emerald-700">
                            {Number(r.cost_price_afn).toLocaleString()} AFN
                          </p>
                          <p className="text-[10px] text-gray-600">
                            سود برگشتی: {Number(r.profit_reversed).toLocaleString()}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${meta.color}`}>
                            <RefundIcon size={12} /> {meta.text}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setDetailReturn(r)}
                              className="p-2 rounded-lg bg-white border border-gray-300 text-black hover:bg-gray-100"
                              title="جزئیات">
                              <Eye size={15} />
                            </button>
                            <button onClick={() => setDeleteConfirm(r.id)}
                              className="p-2 rounded-lg bg-white border border-gray-300 text-rose-600 hover:bg-rose-50"
                              title="حذف">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODALS */}
        {showForm && (
          <CreateReturnModal
            sales={sales}
            onClose={() => setShowForm(false)}
            onSaved={(r) => {
              setShowForm(false);
              fetchReturns(searchTerm);
              setToast({ show: true, message: 'برگشت با موفقیت ثبت شد', type: 'success' });
              setDetailReturn(r);
            }}
          />
        )}

        {deleteConfirm && (
          <ConfirmModal
            title="حذف برگشت"
            message="آیا مطمئن هستید؟ موجودی و بدهی مشتری اصلاح می‌شود."
            onConfirm={handleDelete}
            onCancel={() => setDeleteConfirm(null)}
          />
        )}

        {detailReturn && (
          <ReturnDetailModal saleReturn={detailReturn} onClose={() => setDetailReturn(null)} />
        )}
      </div>
    </DashboardLayout>
  );
}

/* ============================================================
   KPI CARD
   ============================================================ */
function KpiCard({ icon, label, value, valueAfn, valueUsd }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-300 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-100">
          {icon}
        </div>
        <span className="text-xs text-gray-600 font-bold">{label}</span>
      </div>
      {value !== undefined ? (
        <p className="text-2xl font-black text-black">{Number(value || 0).toLocaleString()}</p>
      ) : (
        <>
          <p className="text-lg font-black text-black">
            {Number(valueAfn || 0).toLocaleString()} <span className="text-xs">AFN</span>
          </p>
          {valueUsd !== undefined && (
            <p className="text-xs font-bold text-gray-600 mt-0.5">$ {Number(valueUsd || 0).toLocaleString()}</p>
          )}
        </>
      )}
    </div>
  );
}

/* ============================================================
   CREATE RETURN MODAL
   ============================================================ */
function CreateReturnModal({ sales, onClose, onSaved }) {
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [returnUnit, setReturnUnit] = useState('module');
  const [qty, setQty] = useState(1);
  const [refundType, setRefundType] = useState('reduce_debt');
  const [refundAmount, setRefundAmount] = useState('');
  const [note, setNote] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedSale = useMemo(
    () => sales.find(s => s.id === Number(selectedSaleId)),
    [sales, selectedSaleId]
  );

  // available units based on the product
  const availableUnits = useMemo(() => {
    if (!selectedSale?.product) return [];
    const p = selectedSale.product;
    const list = [];
    if (p.module_name)         list.push({ v: 'module',         label: p.module_name });
    if (p.sub_module_name)     list.push({ v: 'sub_module',     label: p.sub_module_name });
    if (p.sub_sub_module_name) list.push({ v: 'sub_sub_module', label: p.sub_sub_module_name });
    return list;
  }, [selectedSale]);

  // auto-select first unit
  useEffect(() => {
    if (availableUnits.length > 0) setReturnUnit(availableUnits[0].v);
    setPreview(null);
  }, [selectedSaleId, availableUnits.length]);

  // load preview whenever inputs change
  useEffect(() => {
    if (!selectedSaleId || !returnUnit || !qty || qty < 1) { setPreview(null); return; }
    const t = setTimeout(async () => {
      setPreviewLoading(true);
      setError('');
      try {
        const { data } = await api.post(`/sales/${selectedSaleId}/return/preview`, {
          return_unit: returnUnit,
          qty_returned: Number(qty),
        });
        setPreview(data);
      } catch (e) {
        setPreview(null);
        setError(e.response?.data?.message || 'خطا در پیش‌نمایش');
      } finally {
        setPreviewLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [selectedSaleId, returnUnit, qty]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedSaleId) { setError('فاکتور را انتخاب کنید'); return; }
    if (!qty || qty < 1) { setError('تعداد باید بزرگ‌تر از صفر باشد'); return; }
    if (!preview)        { setError('پیش‌نمایش آماده نیست'); return; }

    setSubmitting(true);
    try {
      const { data } = await api.post(`/sales/${selectedSaleId}/return`, {
        return_unit: returnUnit,
        qty_returned: Number(qty),
        refund_type: refundType,
        refund_amount: refundType === 'cash' ? Number(refundAmount || preview.money.refund_total) : undefined,
        return_date: saleDate || null,
        note: note || null,
      });
      onSaved(data);
    } catch (e) {
      setError(e.response?.data?.message || 'خطا در ثبت برگشت');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 border border-gray-300">
        <div className="bg-orange-500 p-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <RotateCcw size={22} /> ثبت برگشت محصول
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-700 text-sm font-bold flex gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {/* SELECT SALE */}
          <div>
            <label className="text-sm font-bold text-black block mb-2">فاکتور فروش *</label>
            <select value={selectedSaleId} onChange={(e) => setSelectedSaleId(e.target.value)}
              className="form-input" required>
              <option value="">— انتخاب فاکتور —</option>
              {sales.map(s => (
                <option key={s.id} value={s.id}>
                  {s.invoice_number} — {s.product_name} ({s.qty_sold} {s.sale_unit_name}) — {s.customer_name}
                </option>
              ))}
            </select>
          </div>

          {/* SALE INFO */}
          {selectedSale && (
            <div className="bg-gray-50 border border-gray-300 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">محصول:</span>
                <b className="text-black">{selectedSale.product_name}</b>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">فروش اصلی:</span>
                <b className="text-black">{selectedSale.qty_sold} × {selectedSale.sale_unit_name}</b>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">قیمت فروش واحد:</span>
                <b className="text-black">{Number(selectedSale.unit_price).toLocaleString()} {selectedSale.currency}</b>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">مشتری:</span>
                <b className="text-black">{selectedSale.customer_name}</b>
              </div>
              {selectedSale.remaining_amount > 0 && (
                <div className="flex justify-between text-xs bg-orange-50 rounded-lg p-2 mt-2 border border-orange-200">
                  <span className="text-orange-700">بدهی باقی‌مانده مشتری:</span>
                  <b className="text-orange-800">
                    {Number(selectedSale.remaining_amount).toLocaleString()} {selectedSale.currency}
                  </b>
                </div>
              )}
            </div>
          )}

          {/* RETURN UNIT + QTY */}
          {selectedSale && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-black block mb-2">واحد برگشت *</label>
                <div className={`grid gap-2 ${availableUnits.length === 3 ? 'grid-cols-3' : availableUnits.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {availableUnits.map(u => {
                    const active = returnUnit === u.v;
                    return (
                      <button type="button" key={u.v} onClick={() => setReturnUnit(u.v)}
                        className={`py-3 px-2 rounded-xl border-2 font-bold text-sm transition-all ${
                          active ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}>
                        {u.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-black block mb-2">تعداد برگشتی *</label>
                <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)}
                  className="form-input text-center font-bold text-lg" dir="ltr" required />
              </div>
            </div>
          )}

          {/* PREVIEW */}
          {previewLoading && (
            <div className="text-center py-4">
              <Loader2 size={22} className="animate-spin inline-block text-orange-500" />
              <span className="text-xs text-gray-600 mr-2">در حال محاسبه...</span>
            </div>
          )}

          {preview && !previewLoading && (
            <div className="space-y-3">
              {/* STOCK PREVIEW */}
              <div className="bg-white border border-gray-300 rounded-2xl p-4">
                <p className="text-xs font-bold text-black mb-3 flex items-center gap-1">
                  <Boxes size={14} /> تغییر موجودی
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <p className="text-[10px] text-gray-600 font-bold mb-2">فعلی</p>
                    <div className="text-xs text-black font-bold space-y-1">
                      <div>📦 {preview.current_stock.module} کارتن</div>
                      <div>🥤 {preview.current_stock.sub_module} دونە</div>
                      <div>🔹 {preview.current_stock.sub_sub_module} دانه</div>
                    </div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3">
                    <p className="text-[10px] text-emerald-700 font-bold mb-2">پس از برگشت</p>
                    <div className="text-xs text-emerald-800 font-bold space-y-1">
                      <div>📦 {preview.remaining_stock.module} کارتن</div>
                      <div>🥤 {preview.remaining_stock.sub_module} دونە</div>
                      <div>🔹 {preview.remaining_stock.sub_sub_module} دانه</div>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-center text-[10px] text-gray-600 font-bold">
                  افزودن: {preview.return.cartons} کارتن + {preview.return.cans} دونە + {preview.return.pieces} دانه ({preview.return.pieces} پیس)
                </div>
              </div>

              {/* MONEY PREVIEW */}
              <div className="bg-white border border-gray-300 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-bold text-black mb-3 flex items-center gap-1">
                  <Wallet size={14} /> محاسبات مالی
                </p>
                <div className="flex justify-between text-sm border-b border-gray-200 pb-2">
                  <span className="text-gray-600">مبلغ برگشتی به مشتری:</span>
                  <b className="text-black text-lg">
                    {Number(preview.money.refund_total).toLocaleString()} {selectedSale.currency}
                  </b>
                </div>
                <div className="flex justify-between text-sm border-b border-gray-200 pb-2">
                  <span className="text-gray-600">سرمایه بازگشته به موجودی:</span>
                  <b className="text-emerald-700">
                    {Number(preview.money.capital_back).toLocaleString()} {selectedSale.currency}
                  </b>
                </div>
                <div className="flex justify-between text-sm pb-2">
                  <span className="text-gray-600">سود برگشت‌خورده:</span>
                  <b className="text-rose-700">
                    -{Number(preview.money.profit_lost).toLocaleString()} {selectedSale.currency}
                  </b>
                </div>
              </div>
            </div>
          )}

          {/* REFUND TYPE */}
          {preview && !previewLoading && (
            <div>
              <label className="text-sm font-bold text-black block mb-2">نحوه برگشت پول</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: 'cash', label: 'نقدی', icon: Wallet },
                  { v: 'reduce_debt', label: 'کاهش قرض', icon: HandCoins },
                  { v: 'exchange', label: 'تبدیل', icon: ArrowLeftRight },
                ].map(({ v, label, icon: Icon }) => {
                  const active = refundType === v;
                  return (
                    <button type="button" key={v} onClick={() => setRefundType(v)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 font-bold transition-all text-sm ${
                        active ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}>
                      <Icon size={16} /> {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-bold text-black block mb-2">تاریخ برگشت</label>
              <input type="text" value={saleDate} onChange={(e) => setSaleDate(e.target.value)}
                placeholder="1405-08-21" className="form-input" dir="ltr" />
            </div>
            <div>
              <label className="text-sm font-bold text-black block mb-2">یادداشت</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="دلیل برگشت..." className="form-input" />
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-gray-300">
            <button type="submit" disabled={submitting || !preview}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {submitting ? <><Loader2 size={18} className="animate-spin" /> در حال ثبت...</>
                          : <><RotateCcw size={18} /> ثبت برگشت</>}
            </button>
            <button type="button" onClick={onClose}
              className="px-6 py-3 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-black font-bold">
              انصراف
            </button>
          </div>
        </form>

        <style>{`
          .form-input {
            width: 100%; background: #fff; border: 1px solid #d1d5db;
            border-radius: 12px; padding: 12px 16px; font-size: 14px;
            color: #000; outline: none; transition: all 0.2s;
          }
          .form-input:focus {
            border-color: #f97316;
            box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15);
          }
        `}</style>
      </div>
    </div>
  );
}

/* ============================================================
   CONFIRM MODAL
   ============================================================ */
function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-300 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 flex items-center justify-center mb-4">
          <Trash2 size={28} className="text-rose-500" />
        </div>
        <h3 className="text-lg font-bold text-black mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onConfirm}
            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl">
            بله، حذف کن
          </button>
          <button onClick={onCancel}
            className="flex-1 bg-white border border-gray-300 hover:bg-gray-100 text-black font-bold py-3 rounded-xl">
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   RETURN DETAIL MODAL
   ============================================================ */
function ReturnDetailModal({ saleReturn: r, onClose }) {
  const meta = REFUND_TYPES[r.refund_type] || REFUND_TYPES.cash;
  const Icon = meta.icon;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 border border-gray-300">
        <div className="bg-orange-500 p-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText size={20} /> جزئیات برگشت
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-3 text-sm">
          <Row label="شماره برگشت:" value={<b className="font-mono">{r.return_number}</b>} />
          <Row label="فاکتور اصلی:" value={<b className="font-mono">{r.invoice_number}</b>} />
          <Row label="محصول:" value={<b>{r.product_name}</b>} />
          <Row label="مشتری:" value={<b>{r.customer_name}</b>} />
          <hr />
          <Row label="واحد برگشت:" value={<b>{r.qty_returned} × {r.return_unit_name}</b>} />
          <Row label="کارتن برگشتی:" value={r.cartons_returned} />
          <Row label="دونە برگشتی:" value={r.sub_units_returned} />
          <Row label="دانه کل:" value={<b>{r.pieces_returned}</b>} />
          <hr />
          <Row label="مبلغ فروش برگشتی:" value={`${Number(r.total_price).toLocaleString()} ${r.currency}`} />
          <Row label="سرمایه بازگشتی (قیمت خرید):" value={<b className="text-emerald-700">{Number(r.cost_price).toLocaleString()} {r.currency}</b>} />
          <Row label="سود برگشت‌خورده:" value={<b className="text-rose-700">-{Number(r.profit_reversed).toLocaleString()} {r.currency}</b>} />
          <hr />
          <Row label="نوع برگشت:" value={
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold border ${meta.color}`}>
              <Icon size={12} /> {meta.text}
            </span>
          } />
          <Row label="بازپرداخت نقدی:" value={`${Number(r.refund_amount).toLocaleString()} ${r.currency}`} />
          <Row label="کاهش بدهی مشتری:" value={`${Number(r.debt_reduced).toLocaleString()} ${r.currency}`} />
          {r.note && <Row label="یادداشت:" value={r.note} />}
          <Row label="تاریخ:" value={r.return_date || '—'} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-gray-100 pb-2">
      <span className="text-gray-600">{label}</span>
      <span className="text-black">{value}</span>
    </div>
  );
}