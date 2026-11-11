import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, X, Loader2, AlertCircle, FileText, Receipt,
  User as UserIcon, Package, Calendar, DollarSign, TrendingUp,
  RefreshCw, Trash2, Eye, Printer, Download, Ban, CheckCircle2,
  HandCoins, Clock, Filter, Percent, Info
} from 'lucide-react';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import Toast from '../components/Toast';

// ============ AFGHAN DATE ============
const AFGHAN_MONTHS = [
  'حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله',
  'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'
];

const toAfghanDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
      year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'Asia/Kabul'
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parseInt(parts.find(p => p.type === 'month')?.value, 10);
    const day = parts.find(p => p.type === 'day')?.value;
    return `${day} ${AFGHAN_MONTHS[month - 1]} ${year}`;
  } catch { return dateString; }
};

// ============ PERSIAN DATE PICKER ============
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
  let jy = py - 979;
  let jm = pm - 1;
  let jd = pd - 1;

  let j_day_no = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4);
  for (let i = 0; i < jm; ++i) j_day_no += (i < 6) ? 31 : 30;
  j_day_no += jd;

  let g_day_no = j_day_no + 79;

  let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
  g_day_no = g_day_no % 146097;

  let leap = true;
  if (g_day_no >= 36525) {
    g_day_no--;
    gy += 100 * Math.floor(g_day_no / 36524);
    g_day_no = g_day_no % 36524;
    if (g_day_no >= 365) g_day_no++;
    else leap = false;
  }

  gy += 4 * Math.floor(g_day_no / 1461);
  g_day_no %= 1461;

  if (g_day_no >= 366) {
    leap = false;
    g_day_no--;
    gy += Math.floor(g_day_no / 365);
    g_day_no = g_day_no % 365;
  }

  let i;
  for (i = 0; g_day_no >= g_d_m[i] + (i > 1 && leap ? 1 : 0); i++);
  const gd = g_day_no - g_d_m[i - 1] - (i > 1 && leap ? 1 : 0) + 1;
  const gm = i;

  return { year: gy, month: gm, day: gd };
};

const formatPersianDate = (y, m, d) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const parsePersianDate = (str) => {
  if (!str) return null;
  const parts = String(str).split('-');
  if (parts.length !== 3) return null;
  return {
    year:  parseInt(parts[0], 10),
    month: parseInt(parts[1], 10),
    day:   parseInt(parts[2], 10),
  };
};

const getTodayPersian = () => {
  const p = gregorianToPersian(new Date());
  return formatPersianDate(p.year, p.month, p.day);
};

// ============ CURRENCY ============
const CURRENCY_LABEL = { AFN: 'افغانی', USD: 'دالر' };

// ============ PAYMENT META ============
const PAYMENT_META = {
  cash: {
    text: 'نقد',
    bg: 'bg-emerald-50', textColor: 'text-emerald-700',
    border: 'border-emerald-200', icon: CheckCircle2,
  },
  loan_full: {
    text: 'قرض کامل',
    bg: 'bg-rose-50', textColor: 'text-rose-700',
    border: 'border-rose-200', icon: HandCoins,
  },
  loan_partial: {
    text: 'قرض جزئی',
    bg: 'bg-amber-50', textColor: 'text-amber-700',
    border: 'border-amber-200', icon: Clock,
  },
};

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
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [parsed]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const daysInMonth = getPersianMonthDays(viewYear, viewMonth);

  const getFirstDayOfWeek = () => {
    const g = persianToGregorian(viewYear, viewMonth, 1);
    const jsDate = new Date(g.year, g.month - 1, g.day);
    const day = jsDate.getDay();
    return (day + 1) % 7;
  };

  const firstDay = getFirstDayOfWeek();

  const handleSelectDay = (day) => {
    const str = formatPersianDate(viewYear, viewMonth, day);
    onChange(str);
    setOpen(false);
  };

  const handleToday = () => {
    onChange(getTodayPersian());
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const WEEKDAYS = ['شن', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'جمعه'];

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const selectedDay = parsed && parsed.year === viewYear && parsed.month === viewMonth
    ? parsed.day : null;

  const isToday = (d) =>
    today.year === viewYear && today.month === viewMonth && today.day === d;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between bg-gray-50 border rounded-xl px-4 py-3 text-sm transition-all ${
          open ? 'border-orange-500 bg-white ring-4 ring-orange-500/10' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <span className={`font-mono ${value ? 'text-gray-800 font-bold' : 'text-gray-400'}`} dir="ltr">
          {value || placeholder}
        </span>
        <Calendar size={16} className={open ? 'text-orange-500' : 'text-gray-400'} />
      </button>

      {open && (
        <div
          className="absolute z-[300] mt-2 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4"
          style={{ minWidth: '290px' }}
        >
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={prevMonth} className="w-9 h-9 rounded-lg hover:bg-orange-50 flex items-center justify-center text-gray-600">
              ›
            </button>

            <div className="flex items-center gap-1">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="bg-transparent font-bold text-gray-800 outline-none cursor-pointer text-sm"
              >
                {AFGHAN_MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="bg-transparent font-bold text-gray-800 outline-none cursor-pointer text-sm font-mono"
                dir="ltr"
              >
                {Array.from({ length: 41 }, (_, i) => today.year - 20 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button type="button" onClick={nextMonth} className="w-9 h-9 rounded-lg hover:bg-orange-50 flex items-center justify-center text-gray-600">
              ‹
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
                <button
                  key={d}
                  type="button"
                  onClick={() => handleSelectDay(d)}
                  className={`aspect-square rounded-lg text-sm font-bold transition-all ${
                    selected
                      ? 'bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-lg'
                      : todayDay
                        ? 'bg-orange-50 text-orange-700 ring-2 ring-orange-300'
                        : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={handleToday}
              className="flex-1 bg-gradient-to-r from-orange-600 to-amber-500 text-white font-bold py-2 rounded-lg text-xs"
            >
              امروز
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs"
            >
              پاک کردن
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
export default function SalesInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [onlyLoans, setOnlyLoans] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [viewInvoice, setViewInvoice] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  /* ========== FETCH LIST ========== */
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = {
        search: searchTerm || undefined,
        payment_type: paymentFilter || undefined,
        currency: currencyFilter || undefined,
        status: statusFilter || undefined,
        only_loans: onlyLoans ? 1 : undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      };
      const { data } = await api.get('/sale-invoices', { params });
      setInvoices(data);
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: 'خطا در دریافت فاکتورها', type: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = {
        from: fromDate || undefined,
        to: toDate || undefined,
      };
      const { data } = await api.get('/sale-invoices/stats', { params });
      setStats(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchInvoices();
    fetchStats();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchInvoices();
      fetchStats();
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm, paymentFilter, currencyFilter, statusFilter, onlyLoans, fromDate, toDate]);

  /* ========== CANCEL ========== */
  const handleCancel = async () => {
    if (!cancelConfirm) return;
    try {
      await api.post(`/sale-invoices/${cancelConfirm}/cancel`);
      setToast({ show: true, message: 'فاکتور لغو شد', type: 'warning' });
      setCancelConfirm(null);
      fetchInvoices();
      fetchStats();
    } catch (e) {
      setToast({ show: true, message: e.response?.data?.message || 'خطا', type: 'warning' });
    }
  };

  /* ========== DELETE ========== */
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/sale-invoices/${deleteConfirm}`);
      setInvoices(prev => prev.filter(i => i.id !== deleteConfirm));
      setToast({ show: true, message: 'فاکتور حذف شد', type: 'warning' });
      setDeleteConfirm(null);
      fetchStats();
    } catch (e) {
      setToast({ show: true, message: e.response?.data?.message || 'خطا', type: 'warning' });
    }
  };

  /* ========== SHOW ========== */
  const handleShow = async (id) => {
    try {
      const { data } = await api.get(`/sale-invoices/${id}`);
      setViewInvoice(data);
    } catch (e) {
      setToast({ show: true, message: 'فاکتور یافت نشد', type: 'warning' });
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setPaymentFilter('');
    setCurrencyFilter('');
    setStatusFilter('');
    setOnlyLoans(false);
    setFromDate('');
    setToDate('');
  };

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
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <FileText size={22} />
              </div>
              فاکتورهای فروش
            </h1>
            <p className="text-sm text-gray-500 mt-2 mr-1">
              مشاهده، جستجو، لغو و چاپ فاکتورها
            </p>
          </div>
          <button
            onClick={() => { fetchInvoices(); fetchStats(); }}
            className="px-5 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors flex items-center gap-2 justify-center"
          >
            <RefreshCw size={16} /> بازخوانی
          </button>
        </div>

        {/* KPI CARDS */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<FileText size={18} />}
              label="تعداد فاکتورها"
              value={stats.total_invoices}
              color="blue"
            />
            <StatCard
              icon={<DollarSign size={18} />}
              label="مجموع فروش"
              valueAfn={stats.total_sales_afn}
              valueUsd={stats.total_sales_usd}
              color="orange"
            />
            <StatCard
              icon={<HandCoins size={18} />}
              label="مجموع بدهی"
              valueAfn={stats.total_debt_afn}
              valueUsd={stats.total_debt_usd}
              color="rose"
            />
            <StatCard
              icon={<TrendingUp size={18} />}
              label="مجموع سود"
              valueAfn={stats.total_profit_afn}
              color="emerald"
            />
          </div>
        )}

        {/* SEARCH + FILTER BAR */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-transparent focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-500/10 transition-all flex-1">
              <Search size={20} className="text-gray-400 ml-2 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="جستجو در شماره فاکتور، مشتری، محصول، بارکد..."
                className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 justify-center ${
                showFilters ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <Filter size={14} /> فیلترهای بیشتر
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-gray-100">

              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">وضعیت پرداخت</label>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-700 outline-none focus:border-orange-300 cursor-pointer"
                >
                  <option value="">همه</option>
                  <option value="cash">نقد</option>
                  <option value="loan_full">قرض کامل</option>
                  <option value="loan_partial">قرض جزئی</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">ارز</label>
                <select
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-700 outline-none focus:border-orange-300 cursor-pointer"
                >
                  <option value="">همه</option>
                  <option value="AFN">افغانی</option>
                  <option value="USD">دالر</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">وضعیت فاکتور</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-700 outline-none focus:border-orange-300 cursor-pointer"
                >
                  <option value="">همه</option>
                  <option value="active">فعال</option>
                  <option value="cancelled">لغو شده</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyLoans}
                    onChange={(e) => setOnlyLoans(e.target.checked)}
                    className="w-4 h-4 rounded accent-orange-600"
                  />
                  <span className="text-sm font-bold text-gray-700">فقط قرضی‌ها</span>
                </label>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">از تاریخ</label>
                <PersianDatePicker value={fromDate} onChange={setFromDate} />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">تا تاریخ</label>
                <PersianDatePicker value={toDate} onChange={setToDate} />
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  onClick={resetFilters}
                  className="w-full px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-sm transition-colors"
                >
                  پاک کردن فیلترها
                </button>
              </div>
            </div>
          )}
        </div>

        {/* TABLE */}
        {loading ? (
          <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-gray-500 mt-4 text-sm">در حال بارگذاری...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <FileText size={36} className="text-blue-400" />
            </div>
            <p className="text-gray-700 font-bold text-lg mb-1">هیچ فاکتوری یافت نشد</p>
            <p className="text-sm text-gray-400">فیلترها را تغییر دهید یا بعداً دوباره امتحان کنید</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px]">
                <thead>
                  <tr className="bg-gradient-to-l from-blue-50/70 to-cyan-50/50 border-b-2 border-blue-100">
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600 w-14">#</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600">شماره فاکتور</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600">تاریخ</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600">مشتری</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600">محصول</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600">تعداد</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600">مبلغ کل</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600">پرداخت‌شده</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600">باقی‌مانده</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600">وضعیت</th>
                    <th className="text-center px-4 py-4 text-xs font-bold text-gray-600 w-40">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((inv, i) => {
                    const meta = PAYMENT_META[inv.payment_type] || PAYMENT_META.cash;
                    const PayIcon = meta.icon;
                    const isCancelled = inv.status === 'cancelled';

                    return (
                      <tr
                        key={inv.id}
                        className={`hover:bg-blue-50/40 transition-colors ${isCancelled ? 'opacity-50' : ''}`}
                      >
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold">
                            {i + 1}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                            {inv.invoice_number}
                          </span>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          {inv.sale_date ? (
                            <div className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 px-2.5 py-1 rounded-md text-xs font-bold">
                              <Calendar size={12} />
                              <span className="font-mono">{inv.sale_date}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">{toAfghanDate(inv.created_at)}</span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <UserIcon size={14} className="text-blue-500" />
                            <span className="text-sm font-bold text-gray-800">
                              {inv.customer_name || 'مشتری نقدی'} {inv.customer_lastname || ''}
                            </span>
                          </div>
                          {inv.customer_phone && (
                            <div className="text-[10px] text-gray-500 mt-0.5 font-mono">{inv.customer_phone}</div>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-sm font-bold text-gray-800 truncate max-w-[180px]">
                            {inv.product_name}
                          </p>
                          {inv.product_barcode && (
                            <div className="text-[10px] text-gray-500 mt-0.5 font-mono">{inv.product_barcode}</div>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="text-sm font-bold text-gray-800">
                            {inv.qty_sold} × {inv.sale_unit_name}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="text-sm font-bold text-gray-800">
                            {Number(inv.total_price_afn).toLocaleString()} <span className="text-[10px]">AFN</span>
                          </div>
                          <div className="text-[10px] text-gray-500">
                            $ {Number(inv.total_price_usd).toLocaleString()}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="text-sm font-bold text-emerald-700">
                            {Number(inv.paid_amount_afn).toLocaleString()}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className={`text-sm font-bold ${Number(inv.remaining_amount) > 0 ? 'text-rose-700' : 'text-gray-400'}`}>
                            {Number(inv.remaining_amount_afn).toLocaleString()}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${meta.bg} ${meta.textColor} ${meta.border}`}>
                              <PayIcon size={12} /> {meta.text}
                            </span>
                            {isCancelled && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                <Ban size={10} /> لغو شده
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            {/* VIEW */}
                            <button
                              onClick={() => handleShow(inv.id)}
                              className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-110 transition-all"
                              title="نمایش فاکتور"
                            >
                              <Eye size={15} />
                            </button>

                            {/* PRINT */}
                            <button
                              onClick={() => handleShow(inv.id)}
                              className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:scale-110 transition-all"
                              title="چاپ"
                            >
                              <Printer size={15} />
                            </button>

                            {/* CANCEL */}
                            {!isCancelled && (
                              <button
                                onClick={() => setCancelConfirm(inv.id)}
                                className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 hover:scale-110 transition-all"
                                title="لغو فاکتور"
                              >
                                <Ban size={15} />
                              </button>
                            )}

                            {/* DELETE */}
                            <button
                              onClick={() => setDeleteConfirm(inv.id)}
                              className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:scale-110 transition-all"
                              title="حذف فاکتور"
                            >
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

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                نمایش <span className="font-bold text-gray-700">{invoices.length}</span> فاکتور
              </span>
            </div>
          </div>
        )}

        {/* VIEW INVOICE MODAL */}
        {viewInvoice && (
          <InvoiceViewModal
            invoice={viewInvoice}
            onClose={() => setViewInvoice(null)}
          />
        )}

        {/* CANCEL CONFIRM */}
        {cancelConfirm && (
          <ConfirmModal
            icon={<Ban size={28} className="text-amber-500" />}
            iconBg="bg-amber-50"
            title="لغو فاکتور"
            description="آیا مطمئن هستید؟ فاکتور لغو می‌شود اما حذف نمی‌شود."
            confirmText="بله، لغو کن"
            confirmClass="from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/30"
            onConfirm={handleCancel}
            onCancel={() => setCancelConfirm(null)}
          />
        )}

        {/* DELETE CONFIRM */}
        {deleteConfirm && (
          <ConfirmModal
            icon={<Trash2 size={28} className="text-rose-500" />}
            iconBg="bg-rose-50"
            title="حذف فاکتور"
            description="آیا مطمئن هستید؟ این عمل قابل بازگشت نیست."
            confirmText="بله، حذف کن"
            confirmClass="from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 shadow-rose-500/30"
            onConfirm={handleDelete}
            onCancel={() => setDeleteConfirm(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

/* ============================================================
   STAT CARD
   ============================================================ */
function StatCard({ icon, label, value, valueAfn, valueUsd, color }) {
  const colors = {
    blue:    'bg-blue-50 text-blue-600',
    orange:  'bg-orange-50 text-orange-600',
    rose:    'bg-rose-50 text-rose-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };
  const textColors = {
    blue:    'text-blue-700',
    orange:  'text-orange-700',
    rose:    'text-rose-700',
    emerald: 'text-emerald-700',
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-xl ${colors[color]} flex items-center justify-center`}>
          {icon}
        </div>
        <span className="text-xs text-gray-500 font-bold">{label}</span>
      </div>

      {value !== undefined ? (
        <p className={`text-2xl font-black ${textColors[color]}`}>
          {Number(value || 0).toLocaleString()}
        </p>
      ) : (
        <>
          <p className={`text-lg font-black ${textColors[color]}`}>
            {Number(valueAfn || 0).toLocaleString()} <span className="text-xs">AFN</span>
          </p>
          {valueUsd !== undefined && (
            <p className="text-xs font-bold text-gray-500 mt-0.5">
              $ {Number(valueUsd || 0).toLocaleString()}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ============================================================
   CONFIRM MODAL
   ============================================================ */
function ConfirmModal({ icon, iconBg, title, description, confirmText, confirmClass, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6 text-center">
          <div className={`w-16 h-16 mx-auto rounded-full ${iconBg} flex items-center justify-center mb-4`}>
            {icon}
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
          <p className="text-sm text-gray-500 mb-6">{description}</p>
          <div className="flex items-center gap-3">
            <button
              onClick={onConfirm}
              className={`flex-1 bg-gradient-to-r ${confirmClass} text-white font-bold py-3 rounded-xl shadow-lg transition-all`}
            >
              {confirmText}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors"
            >
              انصراف
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   INVOICE VIEW MODAL — Products-page style (Paper Print Layout)
   ============================================================ */
function InvoiceViewModal({ invoice, onClose }) {
  const printRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  if (!invoice) return null;

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`
      <html dir="rtl">
      <head>
        <title>فاکتور ${invoice.invoice_number}</title>
        <style>
          * { font-family: Tahoma, Arial, sans-serif; box-sizing: border-box; margin:0; padding:0; }
          body { padding: 30px; background:#fff; color:#111; }
          .inv-header { display:flex; justify-content:space-between; align-items:center; border-bottom:3px double #000; padding-bottom:16px; margin-bottom:20px; }
          .brand { font-size:22px; font-weight:900; color:#000; }
          .brand small { display:block; font-size:11px; color:#6b7280; font-weight:400; margin-top:4px; }
          .inv-num { text-align:left; }
          .inv-num .num { font-family:monospace; font-size:16px; font-weight:900; }
          .inv-num .date { font-size:12px; color:#6b7280; font-family:monospace; margin-top:4px; }
          .inv-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:18px; }
          .inv-card { background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:14px; }
          .inv-card h4 { margin:0 0 8px; color:#000; font-size:12px; border-bottom:1px solid #e5e7eb; padding-bottom:6px; }
          .inv-card p { margin:4px 0; font-size:13px; }
          table { width:100%; border-collapse:collapse; }
          th { background:#000; color:#fff; padding:10px; font-size:12px; }
          td { padding:10px; font-size:13px; border-bottom:1px solid #f3f4f6; text-align:center; }
          .totals { margin-top:18px; margin-right:auto; width:320px; }
          .totals .row { display:flex; justify-content:space-between; padding:8px 12px; border-bottom:1px solid #f3f4f6; font-size:13px; }
          .totals .big { background:#f3f4f6; font-weight:900; font-size:15px; border:none; border-radius:6px; margin-top:6px; padding:10px 12px; }
          .footer { margin-top:50px; text-align:center; font-size:11px; color:#9ca3af; border-top:1px dashed #e5e7eb; padding-top:12px; }
        </style>
      </head>
      <body>${printContents}</body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); }, 300);
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(printRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth  = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const imgWidth  = pageWidth  - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let y = margin;
      if (imgHeight <= pageHeight - margin * 2) {
        pdf.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight);
      } else {
        let heightLeft = imgHeight;
        let position = 0;
        const pageContentHeight = pageHeight - margin * 2;
        while (heightLeft > 0) {
          pdf.addImage(imgData, 'PNG', margin, y - position, imgWidth, imgHeight);
          heightLeft -= pageContentHeight;
          position += pageContentHeight;
          if (heightLeft > 0) pdf.addPage();
        }
      }
      pdf.save(`invoice-${invoice.invoice_number}.pdf`);
    } catch (e) {
      console.error(e);
      handlePrint();
    } finally {
      setGenerating(false);
    }
  };

  // ✅ FIX: Ensure `invoice.sales` works. If `invoice` has a single product, wrap it.
  const sales = Array.isArray(invoice.sales) ? invoice.sales : [invoice];

  const totalAfn = sales.reduce((sum, s) => sum + Number(s.total_price_afn || 0), 0);
  const totalUsd = sales.reduce((sum, s) => sum + Number(s.total_price_usd || 0), 0);
  const paidAfn  = sales.reduce((sum, s) => sum + Number(s.paid_amount_afn || 0), 0);
  const paidUsd  = sales.reduce((sum, s) => sum + Number(s.paid_amount_usd || 0), 0);
  const remAfn   = sales.reduce((sum, s) => sum + Number(s.remaining_amount_afn || 0), 0);
  const remUsd   = sales.reduce((sum, s) => sum + Number(s.remaining_amount_usd || 0), 0);

  const customerName = sales[0]?.customer_name || invoice.customer_name || 'مشتری نقدی';
  const customerPhone = sales[0]?.customer?.phone || invoice.customer_phone || '—';
  const customerAddress = sales[0]?.customer?.address || invoice.customer_address || '—';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden my-8">
        
        {/* HEADER — EXACT MATCH TO BILL PREVIEW (Products Page) */}
        <div className="bg-[#1e293b] p-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText size={22} /> پیش‌نمایش فاکتور
          </h3>
          <div className="flex gap-2">
            <button onClick={handleDownloadPdf} disabled={generating}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} دانلود PDF
            </button>
            <button onClick={handlePrint} className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
              <Printer size={16} /> چاپ
            </button>
            <button onClick={onClose} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-bold text-sm">
              بستن
            </button>
          </div>
        </div>

        {/* PAPER STYLE CONTENT */}
        <div className="p-8 bg-gray-100 max-h-[80vh] overflow-y-auto">
          <div ref={printRef} className="bg-white p-10 mx-auto shadow-sm" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Tahoma, Arial, sans-serif', direction: 'rtl', color: '#000' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #1e293b', paddingBottom: '20px', marginBottom: '30px' }}>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>نام فروشگاه شما</h1>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '5px 0' }}>سیستم مدیریت فروش</p>
              </div>
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 5px 0' }}>فاکتور فروش</h2>
                <p style={{ fontSize: '13px', margin: '2px 0' }}>شماره: <b>{invoice.invoice_number}</b></p>
                <p style={{ fontSize: '13px', margin: '2px 0' }}>تاریخ: <b>{invoice.sale_date || toAfghanDate(invoice.created_at)}</b></p>
              </div>
            </div>

            {/* Customer / Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
              <div style={{ width: '45%' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 5px 0', color: '#1e293b' }}>اطلاعات مشتری:</p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>نام: <b>{customerName}</b></p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>تلفن: {customerPhone}</p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>آدرس: {customerAddress}</p>
              </div>
              <div style={{ width: '45%' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 5px 0', color: '#1e293b' }}>اطلاعات فاکتور:</p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>تعداد کل اقلام: <b>{sales.length} محصول</b></p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>وضعیت: <b>{invoice.status === 'cancelled' ? 'لغو شده' : 'فعال'}</b></p>
              </div>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #cbd5e1', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '10px', textAlign: 'center', fontSize: '13px', borderRight: '1px solid #e2e8f0' }}>#</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', borderRight: '1px solid #e2e8f0' }}>شرح کالا</th>
                  <th style={{ padding: '10px', textAlign: 'center', fontSize: '13px', borderRight: '1px solid #e2e8f0' }}>تعداد</th>
                  <th style={{ padding: '10px', textAlign: 'center', fontSize: '13px', borderRight: '1px solid #e2e8f0' }}>قیمت واحد</th>
                  <th style={{ padding: '10px', textAlign: 'center', fontSize: '13px' }}>مبلغ کل (AFN)</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s, idx) => (
                  <tr key={s.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', borderRight: '1px solid #e2e8f0' }}>{idx + 1}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', borderRight: '1px solid #e2e8f0' }}>
                      <b>{s.product_name}</b><br/>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>{s.sale_unit_name}</span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', borderRight: '1px solid #e2e8f0' }}>{s.qty_sold} {s.sale_unit_name}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', borderRight: '1px solid #e2e8f0' }}>{Number(s.unit_price).toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold' }}>{Number(s.total_price_afn).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
              <div style={{ width: '50%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px', fontSize: '13px', borderBottom: '1px solid #e2e8f0' }}>جمع کل (AFN):</td>
                      <td style={{ padding: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>{totalAfn.toLocaleString()} AFN</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px', fontSize: '13px', borderBottom: '1px solid #e2e8f0' }}>جمع کل (USD):</td>
                      <td style={{ padding: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>$ {totalUsd.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px', fontSize: '13px', borderBottom: '1px solid #e2e8f0', color: '#059669' }}>پرداخت شده:</td>
                      <td style={{ padding: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#059669' }}>{paidAfn.toLocaleString()} AFN</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px', fontSize: '13px', borderBottom: '1px solid #e2e8f0', color: remAfn > 0 ? '#dc2626' : '#64748b' }}>باقی‌مانده:</td>
                      <td style={{ padding: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: remAfn > 0 ? '#dc2626' : '#64748b' }}>{remAfn.toLocaleString()} AFN</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '50px', paddingTop: '20px' }}>
              <div style={{ textAlign: 'center', width: '40%' }}>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '30px' }}>امضای فروشنده</p>
                <div style={{ borderTop: '1px solid #cbd5e1' }}></div>
              </div>
              <div style={{ textAlign: 'center', width: '40%' }}>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '30px' }}>امضای خریدار</p>
                <div style={{ borderTop: '1px solid #cbd5e1' }}></div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '10px', color: '#94a3b8' }}>
              این فاکتور به صورت خودکار توسط سیستم تولید شده است.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}