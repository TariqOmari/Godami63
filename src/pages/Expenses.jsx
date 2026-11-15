import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Plus, X, Loader2, AlertCircle, DollarSign,
  Wallet, Calendar, ChevronRight, ChevronLeft,
  Trash2, Edit, FileText, ArrowLeftRight, TrendingDown,
  RefreshCw, Receipt
} from 'lucide-react';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import Toast from '../components/Toast';

// ============ AFGHAN DATE ============
const AFGHAN_MONTHS = [
  'حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله',
  'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'
];

const gregorianToPersian = (date) => {
  const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'Asia/Kabul'
  });
  const parts = formatter.formatToParts(date);
  return {
    year:  parseInt(parts.find(p => p.type === 'year')?.value, 10),
    month: parseInt(parts.find(p => p.type === 'month')?.value, 10),
    day:   parseInt(parts.find(p => p.type === 'day')?.value, 10),
  };
};

const getPersianMonthDays = (year, month) => {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  const isLeap = ((year + 12) % 33) % 4 === 1;
  return isLeap ? 30 : 29;
};

const persianToGregorian = (py, pm, pd) => {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = py - 979, jm = pm - 1, jd = pd - 1;
  let j_day_no = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4);
  for (let i = 0; i < jm; ++i) j_day_no += (i < 6) ? 31 : 30;
  j_day_no += jd;
  let g_day_no = j_day_no + 79;
  let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
  g_day_no = g_day_no % 146097;
  let leap = true;
  if (g_day_no >= 36525) {
    g_day_no--; gy += 100 * Math.floor(g_day_no / 36524);
    g_day_no = g_day_no % 36524;
    if (g_day_no >= 365) g_day_no++; else leap = false;
  }
  gy += 4 * Math.floor(g_day_no / 1461);
  g_day_no %= 1461;
  if (g_day_no >= 366) {
    leap = false; g_day_no--;
    gy += Math.floor(g_day_no / 365);
    g_day_no = g_day_no % 365;
  }
  let i;
  for (i = 0; g_day_no >= g_d_m[i] + (i > 1 && leap ? 1 : 0); i++);
  const gd = g_day_no - g_d_m[i - 1] - (i > 1 && leap ? 1 : 0) + 1;
  const gm = i;
  return { year: gy, month: gm, day: gd };
};

const formatPersianDate = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const parsePersianDate = (str) => {
  if (!str) return null;
  const parts = String(str).split('-');
  if (parts.length !== 3) return null;
  return {
    year: parseInt(parts[0], 10), month: parseInt(parts[1], 10), day: parseInt(parts[2], 10),
  };
};

const getTodayPersian = () => {
  const p = gregorianToPersian(new Date());
  return formatPersianDate(p.year, p.month, p.day);
};
// =============================================

// ============ CURRENCY ============
const CURRENCY_LABEL = { AFN: 'افغانی', USD: 'دالر' };

const convertCurrency = (amount, fromCurrency, rate) => {
  const r = Math.max(0.0001, Number(rate) || 1);
  const amt = Number(amount) || 0;
  if (String(fromCurrency).toUpperCase() === 'USD') {
    return { afn: Math.round(amt * r * 100) / 100, usd: Math.round(amt * 100) / 100 };
  }
  return { afn: Math.round(amt * 100) / 100, usd: Math.round((amt / r) * 100) / 100 };
};
// =============================================

// ============ API ============
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const api = axios.create({ baseURL: API_BASE_URL, headers: { Accept: 'application/json' } });
api.interceptors.request.use((c) => {
  const t = sessionStorage.getItem('auth_token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

/* ============================================================
   PERSIAN DATE PICKER
   ============================================================ */
function PersianDatePicker({ value, onChange, placeholder = '1405-05-05' }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const parsed = useMemo(() => parsePersianDate(value), [value]);
  const today  = useMemo(() => gregorianToPersian(new Date()), []);

  const [viewYear, setViewYear]   = useState(parsed?.year  || today.year);
  const [viewMonth, setViewMonth] = useState(parsed?.month || today.month);

  useEffect(() => {
    if (parsed) { setViewYear(parsed.year); setViewMonth(parsed.month); }
  }, [parsed]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const daysInMonth = getPersianMonthDays(viewYear, viewMonth);

  const getFirstDayOfWeek = () => {
    const g = persianToGregorian(viewYear, viewMonth, 1);
    const jsDate = new Date(g.year, g.month - 1, g.day);
    return (jsDate.getDay() + 1) % 7;
  };
  const firstDay = getFirstDayOfWeek();

  const handleSelectDay = (day) => {
    onChange(formatPersianDate(viewYear, viewMonth, day));
    setOpen(false);
  };
  const handleToday = () => { onChange(getTodayPersian()); setOpen(false); };
  const handleClear = () => { onChange(''); setOpen(false); };
  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const WEEKDAYS = ['شن', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'جمعه'];
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const selectedDay = parsed && parsed.year === viewYear && parsed.month === viewMonth ? parsed.day : null;
  const isToday = (d) => today.year === viewYear && today.month === viewMonth && today.day === d;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between bg-white border rounded-xl px-4 py-3 text-sm transition-all ${
          open ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <span className={`font-mono ${value ? 'text-black font-bold' : 'text-gray-400'}`} dir="ltr">
          {value || placeholder}
        </span>
        <Calendar size={16} className={open ? 'text-orange-500' : 'text-gray-400'} />
      </button>

      {open && (
        <div
          className="absolute z-[300] mt-2 left-0 right-0 bg-white rounded-2xl shadow-xl border border-gray-200 p-4"
          style={{ minWidth: '290px' }}
        >
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={nextMonth}
              className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-black transition-colors">
              <ChevronRight size={18} />
            </button>
            <div className="flex items-center gap-1">
              <select value={viewMonth} onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="bg-transparent font-bold text-black outline-none cursor-pointer text-sm hover:bg-gray-100 rounded-md px-2 py-1">
                {AFGHAN_MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
              <select value={viewYear} onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="bg-transparent font-bold text-black outline-none cursor-pointer text-sm hover:bg-gray-100 rounded-md px-2 py-1 font-mono" dir="ltr">
                {Array.from({ length: 41 }, (_, i) => today.year - 20 + i).map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button type="button" onClick={prevMonth}
              className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-black transition-colors">
              <ChevronLeft size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[11px] font-bold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((d, idx) => {
              if (d === null) return <div key={`empty-${idx}`} />;
              const selected = d === selectedDay;
              const todayDay = isToday(d);
              return (
                <button key={d} type="button" onClick={() => handleSelectDay(d)}
                  className={`aspect-square rounded-lg text-sm font-bold transition-all flex items-center justify-center ${
                    selected
                      ? 'bg-orange-500 text-white'
                      : todayDay
                        ? 'bg-orange-50 text-orange-600 border border-orange-500'
                        : 'text-black hover:bg-gray-100'
                  }`}>
                  {d}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
            <button type="button" onClick={handleToday}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-lg text-xs transition-all">
              امروز
            </button>
            <button type="button" onClick={handleClear}
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-black font-bold text-xs transition-colors">
              پاک کردن
            </button>
          </div>

          {value && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-center">
              <p className="text-[10px] text-gray-500 font-bold">انتخاب‌شده</p>
              <p className="text-sm font-black text-black font-mono mt-1">{value}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const fetchExpenses = async (search = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/expenses', {
        params: { search: search || undefined }
      });
      setExpenses(data);
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: 'خطا در دریافت لیست مصارف', type: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExpenses(); }, []);
  
  useEffect(() => {
    const t = setTimeout(() => fetchExpenses(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/expenses/${deleteConfirm}`);
      setExpenses(prev => prev.filter(e => e.id !== deleteConfirm));
      setToast({ show: true, message: 'مصرف با موفقیت حذف شد', type: 'success' });
      setDeleteConfirm(null);
    } catch (e) {
      setToast({ show: true, message: e.response?.data?.message || 'خطا در حذف', type: 'warning' });
    }
  };

  // جمع کل خرج‌ها به افغانی و دالر (از روی همان مبلغ و ارز و نرخ محاسبه میشود)
  const totals = useMemo(() => {
    let afn = 0, usd = 0;
    for (const e of expenses) {
      const amt = Number(e.amount) || 0;
      const rate = Number(e.exchange_rate) || 1;
      
      if (String(e.currency).toUpperCase() === 'USD') {
        afn += amt * rate;
        usd += amt;
      } else {
        afn += amt;
        usd += amt / rate;
      }
    }
    return { afn, usd };
  }, [expenses]);

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">

        {toast.show && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ ...toast, show: false })}
          />
        )}

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-black flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-sm">
                <TrendingDown size={22} />
              </div>
              مدیریت مصارف
            </h1>
            <p className="text-sm text-gray-600 mt-2 mr-1">
              ثبت و پیگیری هزینه‌های روزانه، کرایه و سایر مصارف
            </p>
          </div>
          <button
            onClick={() => {
              setEditingExpense(null);
              setShowForm(true);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            ثبت مصرف جدید
          </button>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-300 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-100">
                <Wallet size={18} />
              </div>
              <span className="text-xs text-gray-600 font-bold">مجموع کل مصارف</span>
            </div>
            <p className="text-2xl font-black text-rose-600">
              {totals.afn.toLocaleString()} <span className="text-xs text-gray-500">AFN</span>
            </p>
            <p className="text-xs font-bold text-gray-500 mt-1">
              $ {totals.usd.toLocaleString()}
            </p>
          </div>
        </div>

        {/* SEARCH */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-300 flex flex-col sm:flex-row gap-3">
          <div className="flex items-center bg-white rounded-xl px-4 py-3 border border-gray-300 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all flex-1 max-w-md">
            <Search size={20} className="text-gray-400 ml-2 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجو در نام مصرف، دسته یا توضیحات..."
              className="bg-transparent border-none outline-none text-sm w-full text-black placeholder-gray-400"
            />
          </div>
          <button
            onClick={() => fetchExpenses(searchTerm)}
            className="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-black font-bold text-sm transition-colors flex items-center gap-2 justify-center border border-gray-300"
          >
            <RefreshCw size={14} /> بازخوانی
          </button>
        </div>

        {/* LIST */}
        {loading ? (
          <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-300 flex flex-col items-center justify-center">
            <Loader2 size={36} className="animate-spin text-orange-500" />
            <p className="text-black mt-4 text-sm font-bold">در حال بارگذاری...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-300 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <TrendingDown size={36} className="text-gray-400" />
            </div>
            <p className="text-black font-bold text-lg mb-1">هیچ مصرفی ثبت نشده</p>
            <p className="text-sm text-gray-500 mb-6">اولین هزینه خود را ثبت کنید</p>
            <button
              onClick={() => { setEditingExpense(null); setShowForm(true); }}
              className="bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm inline-flex items-center gap-2 hover:bg-orange-600"
            >
              <Plus size={18} /> ثبت مصرف
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-300 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="text-right px-4 py-4 text-xs font-bold text-black w-14">#</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-black">تاریخ</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-black">نام مصرف</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-black">دسته‌بندی</th>
                    <th className="text-left px-4 py-4 text-xs font-bold text-black">مبلغ</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-black">توضیحات</th>
                    <th className="text-center px-4 py-4 text-xs font-bold text-black w-32">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {expenses.map((e, i) => (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-black text-xs font-bold border border-gray-300">
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 bg-gray-100 text-black px-2.5 py-1 rounded-md text-xs font-bold border border-gray-300">
                          <Calendar size={12} />
                          <span className="font-mono">{e.expense_date}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-bold text-black">{e.expense_name}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-xs text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">
                          {e.category || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-left whitespace-nowrap">
                        <div className="text-sm font-black text-rose-600">
                          {Number(e.amount).toLocaleString()} <span className="text-[11px] font-bold">{e.currency}</span>
                        </div>
                        {e.currency === 'USD' && (
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5" dir="ltr">
                            1$ = {Number(e.exchange_rate).toLocaleString()} AFN
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs text-gray-600 truncate max-w-[200px]" title={e.description}>
                          {e.description || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingExpense(e);
                              setShowForm(true);
                            }}
                            className="p-2 rounded-lg bg-white border border-gray-300 text-black hover:bg-gray-100 transition-all"
                            title="ویرایش"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(e.id)}
                            className="p-2 rounded-lg bg-white border border-gray-300 text-rose-600 hover:bg-rose-50 transition-all"
                            title="حذف"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-300">
              <span className="text-xs text-black font-bold">
                نمایش <span className="font-bold text-black">{expenses.length}</span> مصرف
              </span>
            </div>
          </div>
        )}

        {/* FORM MODAL */}
        {showForm && (
          <ExpenseFormModal
            expense={editingExpense}
            onClose={() => setShowForm(false)}
            onSaved={() => {
              setShowForm(false);
              fetchExpenses(searchTerm);
              setToast({ show: true, message: 'مصرف با موفقیت ذخیره شد', type: 'success' });
            }}
          />
        )}

        {/* DELETE CONFIRM */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-300">
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 flex items-center justify-center mb-4">
                  <Trash2 size={28} className="text-rose-500" />
                </div>
                <h3 className="text-lg font-bold text-black mb-2">حذف مصرف</h3>
                <p className="text-sm text-gray-600 mb-6">
                  آیا مطمئن هستید که می‌خواهید این مصرف را حذف کنید؟
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDelete}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl shadow-sm transition-all"
                  >
                    بله، حذف کن
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 bg-white border border-gray-300 hover:bg-gray-100 text-black font-bold py-3 rounded-xl transition-colors"
                  >
                    انصراف
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

/* ============================================================
   EXPENSE FORM MODAL
   ============================================================ */
function ExpenseFormModal({ expense, onClose, onSaved }) {
  const isEdit = !!expense;

  const [form, setForm] = useState({
    expense_name: expense?.expense_name || '',
    category: expense?.category || '',
    amount: expense?.amount || '',
    currency: expense?.currency || 'AFN',
    exchange_rate: expense?.exchange_rate || '65',
    expense_date: expense?.expense_date || getTodayPersian(),
    description: expense?.description || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.expense_name.trim()) { setError('نام مصرف الزامی است'); return; }
    if (!form.amount || Number(form.amount) <= 0) { setError('مبلغ باید بزرگ‌تر از صفر باشد'); return; }
    if (!form.expense_date) { setError('تاریخ مصرف الزامی است'); return; }
    if (form.currency === 'USD' && (!form.exchange_rate || Number(form.exchange_rate) <= 0)) {
      setError('نرخ تبادل برای دالر الزامی است'); return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        exchange_rate: Number(form.exchange_rate),
      };

      if (isEdit) {
        await api.put(`/expenses/${expense.id}`, payload);
      } else {
        await api.post('/expenses', payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در ذخیره‌سازی');
    } finally {
      setLoading(false);
    }
  };

  // For live preview
  const conv = convertCurrency(Number(form.amount) || 0, form.currency, form.exchange_rate || 1);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-8 border border-gray-300">

        <div className="bg-orange-500 p-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingDown size={22} /> {isEdit ? 'ویرایش مصرف' : 'ثبت مصرف جدید'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-rose-600">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-bold text-black">نام مصرف <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={form.expense_name}
                onChange={(e) => update('expense_name', e.target.value)}
                placeholder="مثلاً: کرایه موتر، برق، معاش کارگر..."
                className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-black">دسته‌بندی</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                placeholder="مثلاً: حمل و نقل"
                className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-black">تاریخ مصرف <span className="text-rose-500">*</span></label>
              <PersianDatePicker value={form.expense_date} onChange={(v) => update('expense_date', v)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-200 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-black">مبلغ <span className="text-rose-500">*</span></label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => update('amount', e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all text-center font-bold text-lg"
                dir="ltr"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-black">ارز <span className="text-rose-500">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                {['AFN', 'USD'].map(c => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => update('currency', c)}
                    className={`py-3 rounded-xl border-2 font-bold transition-all text-sm ${
                      form.currency === c
                        ? 'border-orange-500 bg-orange-500 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {CURRENCY_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-black">نرخ تبادل <span className="text-rose-500">*</span></label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.exchange_rate}
                onChange={(e) => update('exchange_rate', e.target.value)}
                disabled={form.currency === 'AFN'}
                className={`w-full border border-gray-300 rounded-xl py-3 px-4 outline-none transition-all text-center font-bold ${
                  form.currency === 'AFN' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20'
                }`}
                dir="ltr"
              />
            </div>
          </div>

          {form.amount && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs font-bold text-orange-800">معادل محاسبه‌شده:</span>
              <div className="text-left">
                <p className="text-sm font-black text-orange-900">{conv.afn.toLocaleString()} AFN</p>
                <p className="text-xs font-bold text-orange-700">$ {conv.usd.toLocaleString()}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-black">توضیحات (اختیاری)</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows="3"
              placeholder="جزئیات بیشتر..."
              className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all text-sm resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? <><Loader2 size={18} className="animate-spin" /> در حال ذخیره...</> : 'ذخیره مصرف'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-black font-bold transition-colors"
            >
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}