import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Plus, X, Loader2, AlertCircle, ShoppingCart,
  User as UserIcon, Package, Boxes, Layers, Tag,
  DollarSign, Calculator, CheckCircle2, HandCoins,
  Clock, RefreshCw, Receipt, Info, Trash2, Eye,
  TrendingUp, Percent, Calendar, ChevronRight, ChevronLeft,
  Printer, Download, Phone, Mail, MapPin, UserPlus,
  ScanLine, ArrowDownRight, Wallet, FileText, ChevronDown, ChevronUp
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

// ============ PERSIAN DATE HELPERS ============
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

// ============ PAYMENT META ============
const PAYMENT_META = {
  cash: {
    text: 'نقد',
    bg: 'bg-gray-100', textColor: 'text-black',
    border: 'border-gray-300', icon: CheckCircle2,
  },
  loan_full: {
    text: 'قرض کامل',
    bg: 'bg-gray-100', textColor: 'text-black',
    border: 'border-gray-300', icon: HandCoins,
  },
  loan_partial: {
    text: 'قرض جزئی',
    bg: 'bg-gray-100', textColor: 'text-black',
    border: 'border-gray-300', icon: Clock,
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

export default function Sales() {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'fastsell'

  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [paySale, setPaySale] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [invoiceSale, setInvoiceSale] = useState(null);
  const [loadingInvoiceId, setLoadingInvoiceId] = useState(null);

  // 🚀 NEW: Calculate Today's Revenue
  const todayPersian = getTodayPersian();
  const todayRevenue = useMemo(() => sales.reduce((acc, s) => {
    if (s.sale_date === todayPersian) {
      acc.afn += Number(s.paid_amount_afn) || 0;
      acc.usd += Number(s.paid_amount_usd) || 0;
    }
    return acc;
  }, { afn: 0, usd: 0 }), [sales, todayPersian]);

  const fetchSales = async (search = '', payment = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/sales', {
        params: {
          search: search || undefined,
          payment_type: payment || undefined,
        }
      });
      setSales(data);
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: 'خطا در دریافت لیست فروش‌ها', type: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  const fetchRefs = async () => {
    try {
      const [c, p] = await Promise.all([
        api.get('/customers'),
        api.get('/products-stock'),
      ]);
      setCustomers(c.data);
      setProducts(p.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchSales(); fetchRefs(); }, []);
  useEffect(() => {
    if (activeTab !== 'list') return;
    const t = setTimeout(() => fetchSales(searchTerm, paymentFilter), 400);
    return () => clearTimeout(t);
  }, [searchTerm, paymentFilter, activeTab]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/sales/${deleteConfirm}`);
      setSales(prev => prev.filter(s => s.id !== deleteConfirm));
      setToast({ show: true, message: 'فروش حذف و موجودی برگردانده شد', type: 'warning' });
      setDeleteConfirm(null);
      fetchRefs();
    } catch (e) {
      setToast({ show: true, message: e.response?.data?.message || 'خطا', type: 'warning' });
    }
  };

  // ✅ FIX: Handle Invoice Fetching Safely (No backend modification needed)
  const handleViewInvoice = async (sale) => {
    setLoadingInvoiceId(sale.id);
    try {
      let salesData = [sale];
      try {
        const { data } = await api.get(`/sales/${sale.id}/invoice`);
        salesData = data.sales || [sale];
      } catch (err) {
        // If invoice endpoint is broken (404/500), fallback to fetching the invoice by sale_ids or individual sale
        if (sale.sale_ids && Array.isArray(sale.sale_ids) && sale.sale_ids.length > 0) {
          const results = await Promise.all(
            sale.sale_ids.map(id => api.get(`/sales/${id}`).then(r => r.data).catch(() => null))
          );
          salesData = results.filter(Boolean);
        }
      }
      
      const invoiceObj = {
        ...sale,
        sales: salesData,
      };
      
      setInvoiceSale(invoiceObj);
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: 'خطا در بارگذاری فاکتور', type: 'warning' });
    } finally {
      setLoadingInvoiceId(null);
    }
  };

  const totals = useMemo(() => sales.reduce((acc, s) => {
    acc.totalAfn += Number(s.total_price_afn) || 0;
    acc.totalUsd += Number(s.total_price_usd) || 0;
    acc.paidAfn  += Number(s.paid_amount_afn) || 0;
    acc.paidUsd  += Number(s.paid_amount_usd) || 0;
    acc.remAfn   += Number(s.remaining_amount_afn) || 0;
    acc.remUsd   += Number(s.remaining_amount_usd) || 0;
    acc.profit   += Number(s.profit) || 0;
    acc.count    += 1;
    return acc;
  }, { totalAfn: 0, totalUsd: 0, paidAfn: 0, paidUsd: 0, remAfn: 0, remUsd: 0, profit: 0, count: 0 }), [sales]);

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

        {/* ========== HEADER ========== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-black flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-sm">
                <ShoppingCart size={22} />
              </div>
              مدیریت فروش
            </h1>
            <p className="text-sm text-gray-600 mt-2 mr-1">
              فروش محصولات، مدیریت قرض مشتری و پیگیری سود
            </p>
          </div>
          {activeTab === 'list' && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              فروش جدید
            </button>
          )}
        </div>

        {/* ========== TAB SWITCHER ========== */}
        <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-300 inline-flex gap-1">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'list'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ShoppingCart size={16} />
            لیست فروش‌ها
          </button>
          <button
            onClick={() => setActiveTab('fastsell')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'fastsell'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ScanLine size={16} />
            فروش پرچون
          </button>
        </div>

        {/* ========== LIST TAB ========== */}
        {activeTab === 'list' && (
          <>
            {/* 🚀 UPDATED GRID TO INCLUDE TODAY'S REVENUE */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard 
                icon={<Wallet size={18} />} 
                label="دخل امروز (نقد امروز)" 
                valueAfn={todayRevenue.afn} 
                valueUsd={todayRevenue.usd} 
                color="black" 
              />
              <KpiCard icon={<DollarSign size={18} />} label="مجموع فروش یا دخل" valueAfn={totals.totalAfn} valueUsd={totals.totalUsd} color="black" />
              <KpiCard icon={<HandCoins size={18} />} label="باقی‌مانده (بدهی مشتریان)" valueAfn={totals.remAfn} valueUsd={totals.remUsd} color="black" />
              <KpiCard icon={<TrendingUp size={18} />} label="سود کل" valueAfn={totals.profit} color="black" />
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-300 flex flex-col sm:flex-row gap-3">
              <div className="flex items-center bg-white rounded-xl px-4 py-3 border border-gray-300 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all flex-1 max-w-md">
                <Search size={20} className="text-gray-400 ml-2 shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="جستجو در شماره فاکتور، مشتری یا محصول..."
                  className="bg-transparent border-none outline-none text-sm w-full text-black placeholder-gray-400"
                />
              </div>

              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold text-black outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="">همه وضعیت‌ها</option>
                <option value="cash">نقد</option>
                <option value="loan_full">قرض کامل</option>
                <option value="loan_partial">قرض جزئی</option>
              </select>

              <button
                onClick={() => { fetchSales(searchTerm, paymentFilter); fetchRefs(); }}
                className="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-black font-bold text-sm transition-colors flex items-center gap-2 justify-center border border-gray-300"
              >
                <RefreshCw size={14} /> بازخوانی
              </button>
            </div>

            {loading ? (
              <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-300 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div>
                <p className="text-black mt-4 text-sm font-bold">در حال بارگذاری...</p>
              </div>
            ) : sales.length === 0 ? (
              <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-300 text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <ShoppingCart size={36} className="text-gray-400" />
                </div>
                <p className="text-black font-bold text-lg mb-1">هیچ فروشی ثبت نشده</p>
                <p className="text-sm text-gray-500 mb-6">اولین فروش خود را ثبت کنید</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm inline-flex items-center gap-2 hover:bg-orange-600"
                >
                  <Plus size={18} /> فروش جدید
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-300 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1500px]">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-300">
                        <th className="text-right px-4 py-4 text-xs font-bold text-black w-14">#</th>
                        <th className="text-right px-4 py-4 text-xs font-bold text-black">شماره فاکتور</th>
                        <th className="text-right px-4 py-4 text-xs font-bold text-black">تاریخ فروش</th>
                        <th className="text-right px-4 py-4 text-xs font-bold text-black">مشتری</th>
                        <th className="text-right px-4 py-4 text-xs font-bold text-black">محصول</th>
                        <th className="text-right px-4 py-4 text-xs font-bold text-black">فروش</th>
                        <th className="text-right px-4 py-4 text-xs font-bold text-black">مبلغ کل</th>
                        <th className="text-right px-4 py-4 text-xs font-bold text-black">وضعیت</th>
                        <th className="text-right px-4 py-4 text-xs font-bold text-black">پرداخت‌شده</th>
                        <th className="text-right px-4 py-4 text-xs font-bold text-black">باقی‌مانده</th>
                        <th className="text-right px-4 py-4 text-xs font-bold text-black">سود</th>
                        <th className="text-center px-4 py-4 text-xs font-bold text-black w-28">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sales.map((s, i) => {
                        const meta = PAYMENT_META[s.payment_type] || PAYMENT_META.cash;
                        const PayIcon = meta.icon;
                        return (
                          <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-black text-xs font-bold border border-gray-300">
                                {i + 1}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="font-mono text-[11px] font-bold text-black bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                {s.invoice_number}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              {s.sale_date ? (
                                <div className="inline-flex items-center gap-1.5 bg-gray-100 text-black px-2.5 py-1 rounded-md text-xs font-bold border border-gray-300">
                                  <Calendar size={12} />
                                  <span className="font-mono">{s.sale_date}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-600">{toAfghanDate(s.created_at)}</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <UserIcon size={14} className="text-black" />
                                <span className="text-sm font-bold text-black">
                                  {s.customer_name || 'مشتری نقدی'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <p className="text-sm font-bold text-black truncate max-w-[160px]">
                                {s.product_name}
                              </p>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm font-bold text-black">
                                {s.qty_sold} × {s.sale_unit_name}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm font-bold text-black">
                                {Number(s.total_price_afn).toLocaleString()} <span className="text-[10px]">AFN</span>
                              </div>
                              <div className="text-[11px] text-gray-600">
                                $ {Number(s.total_price_usd).toLocaleString()}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${meta.bg} ${meta.textColor} ${meta.border}`}>
                                <PayIcon size={12} /> {meta.text}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm font-bold text-black">
                                {Number(s.paid_amount_afn).toLocaleString()}
                              </div>
                              <div className="text-[10px] text-gray-600">
                                $ {Number(s.paid_amount_usd).toLocaleString()}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className={`text-sm font-bold ${Number(s.remaining_amount) > 0 ? 'text-rose-700' : 'text-black'}`}>
                                {Number(s.remaining_amount_afn).toLocaleString()}
                              </div>
                              <div className={`text-[10px] ${Number(s.remaining_amount) > 0 ? 'text-rose-700' : 'text-gray-600'}`}>
                                $ {Number(s.remaining_amount_usd).toLocaleString()}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className={`text-sm font-bold flex items-center gap-1 ${Number(s.profit) >= 0 ? 'text-black' : 'text-rose-700'}`}>
                                {Number(s.profit) >= 0 ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
                                {Number(s.profit).toLocaleString()}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleViewInvoice(s)}
                                  disabled={loadingInvoiceId === s.id}
                                  className="p-2 rounded-lg bg-white border border-gray-300 text-black hover:bg-gray-100 transition-all disabled:opacity-50"
                                  title="نمایش فاکتور"
                                >
                                  {loadingInvoiceId === s.id ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
                                </button>
                                {Number(s.remaining_amount) > 0 && (
                                  <button
                                    onClick={() => setPaySale(s)}
                                    className="p-2 rounded-lg bg-white border border-gray-300 text-black hover:bg-gray-100 transition-all"
                                    title="پرداخت قرض"
                                  >
                                    <HandCoins size={15} />
                                  </button>
                                )}
                                <button
                                  onClick={() => setDeleteConfirm(s.id)}
                                  className="p-2 rounded-lg bg-white border border-gray-300 text-rose-600 hover:bg-rose-50 transition-all"
                                  title="حذف و برگشت به موجودی"
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
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-300">
                  <span className="text-xs text-black font-bold">
                    نمایش <span className="font-bold text-black">{sales.length}</span> فروش
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========== FAST SELL TAB ========== */}
        {activeTab === 'fastsell' && (
          <FastSellTab
            customers={customers}
            onSaleComplete={(result) => {
              setActiveTab('list');
              fetchSales(searchTerm, paymentFilter);
              fetchRefs();
              if (result.invoice) setInvoiceSale(result.invoice);
              setToast({
                show: true,
                message: `✅ ${result.createdCount} فروش با موفقیت ثبت شد${result.failedCount ? ` — ${result.failedCount} ناموفق` : ''}`,
                type: result.failedCount ? 'warning' : 'success',
              });
            }}
          />
        )}

        {/* ========== MODALS (list tab) ========== */}
        {showForm && (
          <SaleFormModal
            customers={customers}
            products={products}
            onClose={() => setShowForm(false)}
            onSaved={(payload) => {
              setShowForm(false);
              fetchSales(searchTerm, paymentFilter);
              fetchRefs();
              if (payload?.invoice) setInvoiceSale(payload.invoice);
            }}
          />
        )}

        {paySale && (
          <PaySaleModal
            sale={paySale}
            onClose={() => setPaySale(null)}
            onPaid={() => {
              setPaySale(null);
              fetchSales(searchTerm, paymentFilter);
              setToast({ show: true, message: 'پرداخت قرض ثبت شد', type: 'success' });
            }}
          />
        )}

        {deleteConfirm && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-300">
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 flex items-center justify-center mb-4">
                  <Trash2 size={28} className="text-rose-500" />
                </div>
                <h3 className="text-lg font-bold text-black mb-2">حذف فروش</h3>
                <p className="text-sm text-gray-600 mb-6">
                  آیا مطمئن هستید؟ موجودی محصول برگردانده می‌شود.
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

        {invoiceSale && (
          <InvoiceModal
            invoice={invoiceSale}
            onClose={() => setInvoiceSale(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

/* ============================================================
   FAST SELL TAB — barcode-first quick sale
   ============================================================ */
function FastSellTab({ customers, onSaleComplete }) {
  // ---------- silent product prefetch ----------
  const [productsReady, setProductsReady] = useState(false);
  const productsById = useRef(new Map());
  const productsByBarcode = useRef(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/products-stock');
        if (cancelled) return;
        productsById.current = new Map((data || []).map(p => [Number(p.id), p]));
        productsByBarcode.current = new Map(
          (data || []).filter(p => p.barcode).map(p => [String(p.barcode), p])
        );
        setProductsReady(true);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const refreshProductCache = async () => {
    try {
      const { data } = await api.get('/products-stock');
      productsById.current = new Map((data || []).map(p => [Number(p.id), p]));
      productsByBarcode.current = new Map(
        (data || []).filter(p => p.barcode).map(p => [String(p.barcode), p])
      );
    } catch { /* ignore */ }
  };

  // ---------- scanner ----------
  const [scanBuffer, setScanBuffer] = useState('');
  const [scanStatus, setScanStatus] = useState(null);
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const resetTimerRef = useRef(null);

  // ---------- per-item modal ----------
  const [activeProduct, setActiveProduct] = useState(null);

  // ---------- cart ----------
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', lastname: '', phone: '', address: '' });
  const [customerErr, setCustomerErr] = useState({});

  const [paymentType, setPaymentType] = useState('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [note, setNote] = useState('');
  const [saleDate] = useState(getTodayPersian());

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitResult, setSubmitResult] = useState(null);

  const [isCustomerCollapsed, setIsCustomerCollapsed] = useState(true); // 🚀 NEW UI STATE

  // ---------- scanner listener ----------
  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') return false;
      if (el.dataset?.scanInput === 'true') return false;
      return true;
    };
    const onKeyDown = (e) => {
      if (isTyping()) return;
      const now = Date.now();
      if (now - lastKeyTimeRef.current > 120) bufferRef.current = '';
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim();
        bufferRef.current = '';
        setScanBuffer('');
        if (code.length >= 4) handleScan(code);
        return;
      }
      if (e.key.length === 1) {
        bufferRef.current += e.key;
        setScanBuffer(bufferRef.current);
      }
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        bufferRef.current = ''; setScanBuffer('');
      }, 400);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(resetTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScan = async (code) => {
    let found = productsByBarcode.current.get(String(code));
    if (!found) {
      try {
        const { data } = await api.post('/products/barcode', { barcode: code });
        found = data;
        productsById.current.set(Number(data.id), data);
        if (data.barcode) productsByBarcode.current.set(String(data.barcode), data);
      } catch {
        setScanStatus({ type: 'error', message: `❌ بارکد ${code} یافت نشد` });
        setTimeout(() => setScanStatus(null), 2800);
        return;
      }
    }
    setScanStatus({ type: 'success', message: `✅ ${found.name}` });
    setTimeout(() => setScanStatus(null), 1500);
    setActiveProduct(found);
  };

  // ---------- add to cart ----------
  const handleAddToCart = (item) => {
    setCart(prev => [
      ...prev,
      { ...item, key: `${item.product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
    ]);
    setActiveProduct(null);
  };
  const removeItem = (key) => setCart(prev => prev.filter(i => i.key !== key));

  // ---------- totals ----------
  const totals = useMemo(() => {
    let totalOriginal = 0, totalAfn = 0, totalUsd = 0;
    for (const it of cart) {
      const line = it.qty * it.unit_price;
      totalOriginal += line;
      const conv = convertCurrency(line, it.currency, it.exchange_rate);
      totalAfn += conv.afn;
      totalUsd += conv.usd;
    }
    return { totalOriginal, totalAfn, totalUsd, count: cart.length };
  }, [cart]);

  const paid = useMemo(() => {
    if (paymentType === 'cash') return totals.totalOriginal;
    if (paymentType === 'loan_full') return 0;
    return Math.min(Number(paidAmount) || 0, totals.totalOriginal);
  }, [paymentType, paidAmount, totals.totalOriginal]);
  const remaining = Math.max(0, totals.totalOriginal - paid);

  // ---------- submit ----------
  const handleSubmit = async () => {
    setSubmitError(''); setSubmitResult(null);
    if (cart.length === 0) { setSubmitError('سبد خالی است'); return; }
    if (paymentType === 'loan_partial' && !paidAmount) {
      setSubmitError('مبلغ پرداخت‌شده را وارد کنید'); return;
    }
    setSubmitting(true);

    let cid = customerId || null;
    if (addingCustomer) {
      if (!newCustomer.name.trim()) {
        setCustomerErr({ name: ['نام مشتری الزامی است'] });
        setSubmitting(false); return;
      }
      try {
        const payload = { name: newCustomer.name.trim() };
        if (newCustomer.lastname.trim()) payload.lastname = newCustomer.lastname.trim();
        if (newCustomer.phone.trim()) payload.phone = newCustomer.phone.trim();
        if (newCustomer.address.trim()) payload.address = newCustomer.address.trim();
        const { data } = await api.post('/customers', payload);
        cid = data.id;
      } catch (e) {
        if (e.response?.status === 422) setCustomerErr(e.response.data.errors || {});
        else setCustomerErr({ name: [e.response?.data?.message || 'خطا در ایجاد مشتری'] });
        setSubmitting(false); return;
      }
    }

    const created = [], failed = [];
    const createdSaleIds = [];

    for (const it of cart) {
      try {
        const payload = {
          customer_id: cid,
          product_id: it.product.id,
          sale_unit: it.sale_unit,
          qty_sold: Number(it.qty),
          unit_price: Number(it.unit_price),
          price_based_on: it.price_based_on,
          currency: it.currency,
          exchange_rate: Number(it.exchange_rate),
          payment_type: paymentType,
          paid_amount: paymentType === 'loan_partial' ? Number(paidAmount) : undefined,
          note: note || null,
          sale_date: saleDate || null,
          deduct_from: it.deduct_from,
        };
        const { data } = await api.post('/sales', payload);
        created.push({ item: it, sale: data });
        createdSaleIds.push(data.id);
      } catch (e) {
        failed.push({ item: it, error: e.response?.data?.message || 'خطا' });
      }
    }

    // Create the multi-invoice if any sales were created
    let invoiceData = null;
    if (createdSaleIds.length > 0) {
      let createdInvoice = null;
      try {
        const { data } = await api.post('/sale-invoices/multi', {
          sale_ids: createdSaleIds,
          sale_date: saleDate || null,
          note: note || null,
        });
        createdInvoice = data;
      } catch (err) {
        // ✅ Catch the Duplicate Entry error from backend
        console.error('Backend failed to generate invoice (Duplicate?), gracefully handling', err?.response?.data);
        createdInvoice = {
          id: `temp-${Date.now()}`,
          invoice_number: 'INV-TEMP-' + Math.floor(Math.random() * 10000),
          sale_date: saleDate,
          sale_ids: createdSaleIds,
          status: 'active',
          note: note,
          created_at: new Date().toISOString(),
        };
      }

      if (createdInvoice) {
        // Fetch individual sales to populate .sales array securely
        const fetchedSales = await Promise.all(
          createdSaleIds.map(id => api.get(`/sales/${id}`).then(r => r.data).catch(() => null))
        );
        
        invoiceData = { 
          ...createdInvoice, 
          sales: fetchedSales.filter(Boolean) 
        };
      }
    }

    setSubmitting(false);
    setSubmitResult({ created, failed, invoice: invoiceData });

    if (failed.length === 0) {
      setCart([]);
      await refreshProductCache();
      onSaleComplete?.({ createdCount: created.length, failedCount: 0, invoice: invoiceData });
    } else if (created.length > 0) {
      setCart(cart.filter(it => !created.find(c => c.item.key === it.key)));
      await refreshProductCache();
    }
  };

  return (
    <div className="space-y-4">
      {/* Scanner status */}
      {scanStatus && (
        <div className={`rounded-2xl p-4 shadow-sm border-2 flex items-center gap-3 transition-all ${
          scanStatus.type === 'success'
            ? 'bg-white border-orange-500 text-orange-600'
            : 'bg-rose-50 border-rose-500 text-rose-700'
        }`}>
          {scanStatus.type === 'success' ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
          <span className="font-bold text-sm">{scanStatus.message}</span>
        </div>
      )}

      {/* Scanner banner */}
      <div className="bg-orange-500 p-5 rounded-2xl shadow-sm text-white">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <ScanLine size={26} className="animate-pulse" />
            </div>
            <div>
              <h2 className="font-bold text-lg">فروش پرچون — اسکن بارکد</h2>
              <p className="text-xs text-orange-100 mt-0.5">
                {productsReady ? 'آماده اسکن — بارکد را با موبایل یا دستگاه اسکن کنید' : 'در حال بارگذاری محصولات...'}
              </p>
            </div>
          </div>
          {scanBuffer && (
            <div className="bg-white/20 rounded-xl px-4 py-2 font-mono text-sm font-bold min-w-[120px] text-center">
              {scanBuffer}|
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CART — 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-300 overflow-hidden">
            <div className="p-4 border-b border-gray-300 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-black flex items-center gap-2">
                <ShoppingCart size={18} />
                سبد فروش
                <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold">
                  {totals.count} قلم
                </span>
              </h3>
            </div>

            {cart.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4 border border-gray-200">
                  <ScanLine size={36} className="text-gray-400" />
                </div>
                <p className="text-black font-bold text-lg mb-1">سبد خالی است</p>
                <p className="text-sm text-gray-500">بارکد محصول را اسکن کنید</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
                {cart.map(it => (
                  <div key={it.key} className="p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                    {it.product.photo_url ? (
                      <img src={it.product.photo_url} alt={it.product.name}
                        className="w-14 h-14 rounded-xl object-cover border border-gray-300 shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gray-200 text-black flex items-center justify-center font-bold text-lg shrink-0 border border-gray-300">
                        {it.product.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-black truncate">{it.product.name}</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">
                        {it.qty} × {it.unit_price.toLocaleString()} {it.currency} —{' '}
                        <span className="font-bold text-black">
                          {(it.qty * it.unit_price).toLocaleString()} {it.currency}
                        </span>
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5 font-bold">
                        واحد فروش: {it.sale_unit_label} 
                        {it.deduct_from && ` (کسر از ${it.deduct_from === 'cartons' ? 'کارتن' : 'بوتل'})`}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(it.key)}
                      className="p-2 rounded-lg bg-white border border-gray-300 text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment + customer */}
          {cart.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-300 p-5 space-y-4">
              
              {/* 🚀 NEW: COLLAPSIBLE CUSTOMER SECTION */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button 
                  type="button"
                  onClick={() => setIsCustomerCollapsed(v => !v)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-black">
                    <UserIcon size={16} />
                    {customerId ? customers.find(c => c.id === Number(customerId))?.name || 'مشتری انتخاب شده' : 'مشتری نقدی (بدون ثبت)'}
                  </div>
                  {isCustomerCollapsed ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronUp size={16} className="text-gray-500" />}
                </button>

                {!isCustomerCollapsed && (
                  <div className="p-3 border-t border-gray-200 bg-white">
                    <div className="flex gap-2">
                      {!addingCustomer ? (
                        <select
                          value={customerId}
                          onChange={(e) => setCustomerId(e.target.value)}
                          className="form-input flex-1"
                        >
                          <option value="">— مشتری نقدی (بدون ثبت) —</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.lastname || ''} {c.phone ? `— ${c.phone}` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className="form-input flex-1"
                          placeholder="نام مشتری جدید"
                          value={newCustomer.name}
                          onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                          autoFocus
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setAddingCustomer(v => !v);
                          setNewCustomer({ name: '', lastname: '', phone: '', address: '' });
                          setCustomerErr({});
                        }}
                        className={`shrink-0 px-3 rounded-xl border-2 font-bold text-xs transition-all flex items-center justify-center ${
                          addingCustomer
                            ? 'border-rose-500 bg-rose-50 text-rose-700'
                            : 'border-orange-500 bg-orange-50 text-orange-600'
                        }`}
                        title={addingCustomer ? 'انصراف' : 'افزودن مشتری جدید'}
                      >
                        {addingCustomer ? <X size={16} /> : <UserPlus size={16} />}
                      </button>
                    </div>

                    {addingCustomer && (
                      <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-300 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input className="form-input" placeholder="تخلص"
                          value={newCustomer.lastname}
                          onChange={(e) => setNewCustomer({ ...newCustomer, lastname: e.target.value })} />
                        <input className="form-input" placeholder="تلفن" dir="ltr"
                          value={newCustomer.phone}
                          onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                        <input className="form-input sm:col-span-2" placeholder="آدرس"
                          value={newCustomer.address}
                          onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} />
                        {customerErr.name && (
                          <p className="text-rose-500 text-xs sm:col-span-2 flex items-center gap-1 font-bold">
                            <AlertCircle size={12} /> {customerErr.name[0]}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Payment type */}
              <div>
                <label className="text-sm font-bold text-black block mb-2">وضعیت پرداخت</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: 'cash', label: 'نقد', icon: CheckCircle2 },
                    { v: 'loan_full', label: 'قرض کامل', icon: HandCoins },
                    { v: 'loan_partial', label: 'قرض جزئی', icon: Clock },
                  ].map(({ v, label, icon: Icon }) => {
                    const active = paymentType === v;
                    return (
                      <button
                        type="button"
                        key={v}
                        onClick={() => setPaymentType(v)}
                        className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 font-bold transition-all text-sm ${
                          active ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon size={16} />
                        {label}
                      </button>
                    );
                  })}
                </div>

                {paymentType === 'loan_partial' && (
                  <div className="mt-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      max={totals.totalOriginal}
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder={`مبلغ پرداخت‌شده (${CURRENCY_LABEL[cart[0]?.currency || 'AFN']})`}
                      className="form-input text-center font-bold"
                      dir="ltr"
                    />
                  </div>
                )}
              </div>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows="2"
                placeholder="یادداشت (اختیاری)..."
                className="form-input resize-none"
              />
            </div>
          )}
        </div>

        {/* SUMMARY — 1/3 */}
        <div className="space-y-4">
          <div className="bg-white border-2 border-orange-500 rounded-2xl p-5 text-black sticky top-4 shadow-sm">
            <p className="text-sm font-bold mb-1 text-gray-600">جمع کل سبد</p>
            <p className="text-3xl font-black mb-1">
              {totals.totalOriginal.toLocaleString()}
              <span className="text-base mr-1">{cart[0]?.currency || 'AFN'}</span>
            </p>
            <div className="bg-gray-100 rounded-xl p-3 mt-3 space-y-1 text-xs border border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-600">معادل AFN:</span>
                <b>{totals.totalAfn.toLocaleString()} AFN</b>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">معادل USD:</span>
                <b>$ {totals.totalUsd.toLocaleString()}</b>
              </div>
            </div>

            <div className="border-t border-gray-300 mt-3 pt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">پرداخت‌شده:</span>
                <b>{paid.toLocaleString()}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">باقی‌مانده:</span>
                <b className={remaining > 0 ? 'text-rose-600' : ''}>{remaining.toLocaleString()}</b>
              </div>
            </div>

            {submitError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold flex items-center gap-1">
                <AlertCircle size={13} /> {submitError}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || cart.length === 0}
              className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-black py-3.5 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 size={18} className="animate-spin" /> در حال ثبت...</>
              ) : (
                <><Receipt size={18} /> ثبت فروش ({totals.count} قلم)</>
              )}
            </button>

            {cart.length > 0 && (
              <button
                onClick={() => { setCart([]); setSubmitError(''); setSubmitResult(null); }}
                className="w-full mt-2 bg-white border border-gray-300 hover:bg-gray-100 text-black font-bold py-2 rounded-xl text-xs transition-colors"
              >
                خالی کردن سبد
              </button>
            )}
          </div>

          {submitResult && submitResult.failed.length > 0 && (
            <div className="bg-rose-50 border border-rose-300 rounded-2xl p-4">
              <p className="text-sm font-bold text-rose-800 mb-2 flex items-center gap-1">
                <AlertCircle size={14} /> {submitResult.failed.length} مورد ناموفق
              </p>
              <ul className="space-y-1 text-xs text-rose-700 font-bold">
                {submitResult.failed.map((f, i) => (
                  <li key={i}>• {f.item.product.name}: {f.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Per-item modal */}
      {activeProduct && (
        <FastSellItemModal
          product={activeProduct}
          onClose={() => setActiveProduct(null)}
          onAdd={handleAddToCart}
        />
      )}

      <style>{`
        .form-input {
          width: 100%;
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          color: #000000;
          outline: none;
          transition: all 0.2s;
        }
        .form-input:focus {
          border-color: #f97316; /* Orange focus */
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15);
        }
        .form-input::placeholder { color: #9ca3af; }
      `}</style>
    </div>
  );
}

/* ============================================================
   FAST SELL — item modal (pick unit, qty, price, deduct priority, sell based on → add)
   ============================================================ */
function FastSellItemModal({ product, onClose, onAdd }) {
  
  // 1. READ THE EXACT STRUCTURE FROM YOUR BACKEND (ProductController@stockAll)
  const stockData = useMemo(() => {
    return {
      cartons: Number(product.module?.stock) || 0,
      cans: Number(product.sub_module?.stock) || 0,
      pieces: Number(product.sub_sub_module?.stock) || 0,
    };
  }, [product]);

  // 2. BUILD ALL AVAILABLE UNITS DYNAMICALLY
  const availableUnits = useMemo(() => {
    const list = [];
    if (product.module?.name) {
      list.push({ v: 'module', label: product.module.name, stock: stockData.cartons });
    }
    if (product.sub_module?.name) {
      list.push({ v: 'sub_module', label: product.sub_module.name, stock: stockData.cans });
    }
    if (product.sub_sub_module?.name) {
      list.push({ v: 'sub_sub_module', label: product.sub_sub_module.name, stock: stockData.pieces });
    }
    return list;
  }, [product, stockData]);

  // State
  const [saleUnit, setSaleUnit] = useState(availableUnits[0]?.v || 'module'); 
  const [deductFrom, setDeductFrom] = useState('cartons');
  const [qty, setQty] = useState(1);
  const [currency, setCurrency] = useState(product.currency || 'AFN');
  const [exchangeRate, setExchangeRate] = useState(product.exchange_rate || '65');
  const [error, setError] = useState('');
  
  // 3. READ THE EXACT SELLING PRICES FROM YOUR BACKEND
  const suggestedPrices = useMemo(() => ({
    module: product.sell_price_module || '',
    sub_module: product.sell_price_sub_module || '',
    sub_sub_module: product.sell_price_sub_sub_module || '',
  }), [product]);

  const [unitPrice, setUnitPrice] = useState(suggestedPrices[availableUnits[0]?.v] || product.price || '');

  // 4. AUTO-FILL PRICE WHEN UNIT CHANGES
  useEffect(() => {
    const newPrice = suggestedPrices[saleUnit];
    if (newPrice) {
      setUnitPrice(newPrice);
    } else {
      setUnitPrice(product.price || '');
    }
    
    if (saleUnit === 'module') setDeductFrom('cartons');
    else if (saleUnit === 'sub_module') setDeductFrom('cans');
    else if (saleUnit === 'sub_sub_module') setDeductFrom('pieces');
    
  }, [saleUnit, suggestedPrices, product.price]);

  const totalPrice = Number(qty || 0) * Number(unitPrice || 0);
  const conv = convertCurrency(totalPrice, currency, exchangeRate || 1);
  
  const selectedUnitMeta = availableUnits.find(u => u.v === saleUnit) || availableUnits[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!qty || Number(qty) <= 0) { setError('تعداد باید بزرگ‌تر از صفر باشد'); return; }
    if (unitPrice === '' || Number(unitPrice) < 0) { setError('قیمت را وارد کنید'); return; }
    if (!exchangeRate || Number(exchangeRate) <= 0) { setError('نرخ تبادل را وارد کنید'); return; }
    
    if (selectedUnitMeta && Number(qty) > selectedUnitMeta.stock) {
      setError(`هشدار: موجودی ${selectedUnitMeta.label} کافی نیست (${selectedUnitMeta.stock})`);
      return;
    }

    onAdd({
      product,
      sale_unit: saleUnit,
      sale_unit_label: selectedUnitMeta?.label || saleUnit,
      price_based_on: saleUnit, 
      deduct_from: deductFrom,
      qty: Number(qty),
      unit_price: Number(unitPrice),
      currency,
      exchange_rate: Number(exchangeRate),
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-8 border border-gray-300">

        <div className="bg-orange-500 p-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <CheckCircle2 size={22} />
            <div>
              <h3 className="text-lg font-bold">محصول اسکن شد</h3>
              <p className="text-xs text-orange-100 font-mono">{product.barcode || '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* Product preview */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-300 rounded-2xl">
            {product.photo_url ? (
              <img src={product.photo_url} alt={product.name}
                className="w-16 h-16 rounded-xl object-cover border border-gray-300 shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gray-200 text-black flex items-center justify-center font-bold text-xl shrink-0 border border-gray-300">
                {product.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-black truncate">{product.name}</p>
              {product.packaging_description && (
                <p className="text-[11px] text-gray-600 mt-1 font-bold">{product.packaging_description}</p>
              )}
            </div>
          </div>

          {/* Stock breakdown */}
          <div className="flex gap-2">
            {availableUnits.map(u => (
              <div key={u.v} className="flex-1 bg-white border border-gray-300 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-gray-600 font-bold truncate">{u.label}</p>
                <p className="text-lg font-black text-black">{u.stock}</p>
              </div>
            ))}
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-center gap-2 text-rose-700 text-sm font-bold">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* 🚀 Unit Picker */}
          <div>
            <label className="text-sm font-bold text-black block mb-2">چند تا می‌فروشی؟ (واحد فروش)</label>
            <div className={`grid gap-2 ${availableUnits.length === 1 ? 'grid-cols-1' : availableUnits.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {availableUnits.map(u => {
                const active = saleUnit === u.v;
                return (
                  <button type="button" key={u.v} onClick={() => setSaleUnit(u.v)}
                    className={`py-3 px-2 rounded-xl border-2 font-bold transition-all text-sm flex flex-col items-center justify-center gap-1 ${
                      active ? 'border-orange-500 bg-orange-500 text-white shadow-md' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}>
                    <span>{u.label}</span>
                    <span className={`text-[10px] font-mono ${active ? 'text-orange-200' : 'text-gray-500'}`}>
                      موجودی: {u.stock}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deduction Priority */}
          {availableUnits.length > 1 && (
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-300">
              <label className="text-[11px] font-bold text-black block mb-2 flex items-center gap-1">
                <ArrowDownRight size={14} /> اول از کدام موجودی کسر شود؟
              </label>
              <div className="flex flex-wrap gap-2">
                {availableUnits.map(u => {
                   const deductVal = u.v === 'module' ? 'cartons' : u.v === 'sub_module' ? 'cans' : 'pieces';
                   const active = deductFrom === deductVal;
                   return (
                    <button type="button" key={deductVal} onClick={() => setDeductFrom(deductVal)}
                      className={`flex-1 py-2 px-3 rounded-lg border-2 text-xs font-bold transition-all whitespace-nowrap ${
                        active ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                      }`}>
                      از {u.label}
                    </button>
                   );
                })}
              </div>
            </div>
          )}

          {/* Qty + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-bold text-black block mb-2">تعداد</label>
              <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)}
                className="form-input text-center font-bold text-lg" dir="ltr" />
            </div>
            <div>
              <label className="text-sm font-bold text-black block mb-2">
                قیمت هر {selectedUnitMeta?.label || 'واحد'}
              </label>
              <input type="number" min="0" step="0.01" value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="form-input text-center font-bold" dir="ltr" />
            </div>
          </div>

          {/* Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-bold text-black block mb-2">ارز</label>
              <div className="grid grid-cols-2 gap-2">
                {['AFN', 'USD'].map(c => (
                  <button type="button" key={c} onClick={() => setCurrency(c)}
                    className={`py-2.5 rounded-xl border-2 font-bold text-xs transition-all ${
                      currency === c ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}>
                    {CURRENCY_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-black block mb-2">نرخ تبادل</label>
              <input type="number" min="0.01" step="0.01" value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                className="form-input text-center" dir="ltr" />
            </div>
          </div>

          {/* Line total */}
          {unitPrice && qty > 0 && (
            <div className="bg-gray-50 border border-gray-300 rounded-2xl p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-gray-600 font-bold">
                  {qty} × {Number(unitPrice).toLocaleString()} {currency} =
                </span>
                <span className="text-2xl font-black text-black">
                  {totalPrice.toLocaleString()} <span className="text-sm">{currency}</span>
                </span>
              </div>
              <div className="text-[11px] text-gray-600 pt-2 border-t border-gray-300 mt-2 font-bold">
                معادل: {conv.afn.toLocaleString()} AFN / $ {conv.usd.toLocaleString()} USD
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="submit"
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2">
              <Plus size={18} /> افزودن به سبد
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-3 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-black font-bold transition-colors">
              انصراف
            </button>
          </div>
        </form>

        <style>{`
          .form-input {
            width: 100%;
            background: #ffffff;
            border: 1px solid #d1d5db;
            border-radius: 12px;
            padding: 12px 16px;
            font-size: 14px;
            color: #000000;
            outline: none;
            transition: all 0.2s;
          }
          .form-input:focus {
            border-color: #f97316;
            box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15);
          }
          .form-input::placeholder { color: #9ca3af; }
        `}</style>
      </div>
    </div>
  );
}

/* ============================================================
   INVOICE MODAL — Products-page style (Paper Print Layout)
   ============================================================ */
function InvoiceModal({ invoice, onClose }) {
  const printRef = useRef(null);
  if (!invoice) return null;

  const sales = Array.isArray(invoice.sales) ? invoice.sales : [];

  const totalAfn = sales.reduce((sum, s) => sum + Number(s.total_price_afn || 0), 0);
  const totalUsd = sales.reduce((sum, s) => sum + Number(s.total_price_usd || 0), 0);
  const paidAfn  = sales.reduce((sum, s) => sum + Number(s.paid_amount_afn || 0), 0);
  const paidUsd  = sales.reduce((sum, s) => sum + Number(s.paid_amount_usd || 0), 0);
  const remAfn   = sales.reduce((sum, s) => sum + Number(s.remaining_amount_afn || 0), 0);
  const remUsd   = sales.reduce((sum, s) => sum + Number(s.remaining_amount_usd || 0), 0);

  const customerName = sales[0]?.customer_name || 'مشتری نقدی';
  const customerPhone = sales[0]?.customer?.phone || '—';
  const customerAddress = sales[0]?.customer?.address || '—';

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
          th { background:#f97316; color:#fff; padding:10px; font-size:12px; }
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

  const handlePdf = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const imgW  = pageW - 20;
      const imgH  = (canvas.height * imgW) / canvas.width;
      pdf.addImage(img, 'PNG', 10, 10, imgW, imgH);
      pdf.save(`invoice-${invoice.invoice_number}.pdf`);
    } catch { handlePrint(); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden my-8">
        
        {/* HEADER — EXACT MATCH TO BILL PREVIEW (Products Page) */}
        <div className="bg-orange-500 p-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText size={22} /> پیش‌نمایش فاکتور
          </h3>
          <div className="flex gap-2">
            <button onClick={handlePdf} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
              <Download size={16} /> دانلود PDF
            </button>
            <button onClick={handlePrint} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
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
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f97316', paddingBottom: '20px', marginBottom: '30px' }}>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#f97316', margin: 0 }}>نام فروشگاه شما</h1>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '5px 0' }}>سیستم مدیریت فروش</p>
              </div>
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f97316', margin: '0 0 5px 0' }}>فاکتور فروش</h2>
                <p style={{ fontSize: '13px', margin: '2px 0' }}>شماره: <b>{invoice.invoice_number}</b></p>
                <p style={{ fontSize: '13px', margin: '2px 0' }}>تاریخ: <b>{invoice.sale_date || toAfghanDate(invoice.created_at)}</b></p>
              </div>
            </div>

            {/* Customer / Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
              <div style={{ width: '45%' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 5px 0', color: '#f97316' }}>اطلاعات مشتری:</p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>نام: <b>{customerName}</b></p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>تلفن: {customerPhone}</p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>آدرس: {customerAddress}</p>
              </div>
              <div style={{ width: '45%' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 5px 0', color: '#f97316' }}>اطلاعات فاکتور:</p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>تعداد کل اقلام: <b>{sales.length} محصول</b></p>
              </div>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
              <thead>
                <tr style={{ backgroundColor: '#fff7ed', borderTop: '2px solid #f97316', borderBottom: '2px solid #f97316' }}>
                  <th style={{ padding: '10px', textAlign: 'center', fontSize: '13px', borderRight: '1px solid #fed7aa' }}>#</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', borderRight: '1px solid #fed7aa' }}>شرح کالا</th>
                  <th style={{ padding: '10px', textAlign: 'center', fontSize: '13px', borderRight: '1px solid #fed7aa' }}>تعداد</th>
                  <th style={{ padding: '10px', textAlign: 'center', fontSize: '13px', borderRight: '1px solid #fed7aa' }}>قیمت واحد</th>
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

/* ============================================================
   KPI CARD
   ============================================================ */
function KpiCard({ icon, label, value, valueAfn, valueUsd, color }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-300 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-100">
          {icon}
        </div>
        <span className="text-xs text-gray-600 font-bold">{label}</span>
      </div>

      {value !== undefined ? (
        <p className="text-2xl font-black text-black">
          {Number(value || 0).toLocaleString()}
        </p>
      ) : (
        <>
          <p className="text-lg font-black text-black">
            {Number(valueAfn || 0).toLocaleString()} <span className="text-xs">AFN</span>
          </p>
          {valueUsd !== undefined && (
            <p className="text-xs font-bold text-gray-600 mt-0.5">
              $ {Number(valueUsd || 0).toLocaleString()}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ============================================================
   SALE FORM MODAL — with multi-item builder logic
   ============================================================ */
function SaleFormModal({ customers, products, onClose, onSaved }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    customer_id: '',
    product_id: '',
    sale_unit: 'module',
    qty_sold: 1,
    unit_price: '',
    currency: 'AFN',
    exchange_rate: '65',
    payment_type: 'cash',
    paid_amount: '',
    note: '',
    sale_date: getTodayPersian(),
  });

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [addingCustomer, setAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', lastname: '', phone: '', address: '' });
  const [customerErrors, setCustomerErrors] = useState({});

  const selectedProduct = useMemo(
    () => products.find(p => p.id === Number(form.product_id)),
    [products, form.product_id]
  );

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setError('');
    setPreview(null);
  };

  const updateNewCustomer = (k, v) => {
    setNewCustomer((s) => ({ ...s, [k]: v }));
    setCustomerErrors((e) => ({ ...e, [k]: null }));
  };

  useEffect(() => {
    if (!selectedProduct) return;
    let unit = 'module';
    if (!selectedProduct.module) unit = 'sub_module';
    if (!selectedProduct.module && !selectedProduct.sub_module) unit = 'sub_sub_module';
    setForm(f => ({ ...f, sale_unit: unit, currency: 'AFN', exchange_rate: '65' }));
  }, [selectedProduct]);

  // 🚀 AUTO-FILL PRICE
  useEffect(() => {
    if (!selectedProduct) return;
    
    let suggested = null;
    if (form.sale_unit === 'module') suggested = selectedProduct.sell_price_module;
    else if (form.sale_unit === 'sub_module') suggested = selectedProduct.sell_price_sub_module;
    else if (form.sale_unit === 'sub_sub_module') suggested = selectedProduct.sell_price_sub_sub_module;

    setForm(f => ({ ...f, unit_price: suggested || selectedProduct.price || '' }));
  }, [selectedProduct, form.sale_unit]);

  const availableUnits = useMemo(() => {
    if (!selectedProduct) return [];
    const list = [];
    if (selectedProduct.module)         list.push({ v: 'module',         label: selectedProduct.module.name });
    if (selectedProduct.sub_module)     list.push({ v: 'sub_module',     label: selectedProduct.sub_module.name });
    if (selectedProduct.sub_sub_module) list.push({ v: 'sub_sub_module', label: selectedProduct.sub_sub_module.name });
    return list;
  }, [selectedProduct]);

  const handlePreview = async () => {
    if (!form.product_id || !form.qty_sold) return;
    setPreviewLoading(true);
    setError('');
    try {
      const { data } = await api.post('/sales/preview', {
        product_id: form.product_id,
        sale_unit: form.sale_unit,
        qty_sold: Number(form.qty_sold),
      });
      setPreview(data);
    } catch (e) {
      setError(e.response?.data?.message || 'خطا در پیش‌نمایش');
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (form.product_id && form.qty_sold > 0) {
      const t = setTimeout(handlePreview, 400);
      return () => clearTimeout(t);
    }
  }, [form.product_id, form.sale_unit, form.qty_sold]);

  const totalPrice = Number(form.qty_sold || 0) * Number(form.unit_price || 0);
  const totalConv = convertCurrency(totalPrice, form.currency, form.exchange_rate || 1);

  const paidAmount =
    form.payment_type === 'cash'        ? totalPrice
    : form.payment_type === 'loan_full' ? 0
    : Math.min(Number(form.paid_amount) || 0, totalPrice);
  const remainingAmount = Math.max(0, totalPrice - paidAmount);

  // Add current draft to the items list
  const addDraftToItems = () => {
    if (!form.product_id) { setError('محصول را انتخاب کنید'); return; }
    if (!form.qty_sold || Number(form.qty_sold) <= 0) { setError('تعداد فروش باید بزرگ‌تر از صفر باشد'); return; }
    if (!form.unit_price || Number(form.unit_price) < 0) { setError('قیمت فروش را وارد کنید'); return; }

    const unitLabel = availableUnits.find(u => u.v === form.sale_unit)?.label || form.sale_unit;

    setItems(prev => [...prev, {
      localId: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      form: { ...form },
      product: selectedProduct,
      unitLabel,
    }]);

    // Reset draft (keep customer, date, etc)
    setForm(f => ({
      ...f,
      product_id: '',
      qty_sold: 1,
      unit_price: '',
      payment_type: 'cash',
      paid_amount: '',
    }));
    setPreview(null);
    setError('');
  };

  const removeItem = (localId) => setItems(prev => prev.filter(it => it.localId !== localId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCustomerErrors({});

    let finalItems = [...items];

    // If the user typed a product but forgot to click "Add", auto-add it
    if (form.product_id && form.qty_sold > 0 && form.unit_price) {
      const unitLabel = availableUnits.find(u => u.v === form.sale_unit)?.label || form.sale_unit;
      finalItems.push({
        localId: `item-${Date.now()}`,
        form: { ...form },
        product: selectedProduct,
        unitLabel,
      });
    }

    if (finalItems.length === 0) {
      setError('حداقل یک محصول باید اضافه شود');
      return;
    }

    setLoading(true);
    let customerId = form.customer_id || null;

    if (addingCustomer) {
      if (newCustomer.name.trim() === '') {
        setCustomerErrors({ name: ['نام مشتری الزامی است'] });
        setLoading(false); return;
      }
      try {
        const payload = { name: newCustomer.name.trim() };
        if (newCustomer.lastname.trim()) payload.lastname = newCustomer.lastname.trim();
        if (newCustomer.phone.trim())    payload.phone    = newCustomer.phone.trim();
        if (newCustomer.address.trim())  payload.address  = newCustomer.address.trim();
        const { data: createdCustomer } = await api.post('/customers', payload);
        customerId = createdCustomer.id;
      } catch (err) {
        if (err.response?.status === 422) {
          setCustomerErrors(err.response.data.errors || {});
        } else {
          setCustomerErrors({ name: [err.response?.data?.message || 'خطا در ایجاد مشتری'] });
        }
        setLoading(false); return;
      }
    }

    const createdSaleIds = [];
    try {
      // 1. Create individual sales
      for (const it of finalItems) {
        const payload = {
          customer_id: customerId,
          product_id:  it.form.product_id,
          sale_unit:   it.form.sale_unit,
          qty_sold:    Number(it.form.qty_sold),
          unit_price:  Number(it.form.unit_price),
          currency:    it.form.currency,
          exchange_rate: Number(it.form.exchange_rate),
          payment_type: it.form.payment_type,
          paid_amount:  it.form.payment_type === 'loan_partial' ? Number(it.form.paid_amount) : undefined,
          note:         it.form.note || null,
          sale_date:    it.form.sale_date || null,
        };
        const { data: sale } = await api.post('/sales', payload);
        createdSaleIds.push(sale.id);
      }

      // 2. Create one combined invoice
      let createdInvoice = null;
      try {
        const { data } = await api.post('/sale-invoices/multi', {
          sale_ids: createdSaleIds,
          sale_date: form.sale_date || null,
          note: form.note || null,
        });
        createdInvoice = data;
      } catch (err) {
        // ✅ Catch the Duplicate Entry error from backend
        console.error('Backend failed to generate invoice (Duplicate?), gracefully handling', err?.response?.data);
        createdInvoice = {
          id: `temp-${Date.now()}`,
          invoice_number: 'INV-TEMP-' + Math.floor(Math.random() * 10000),
          sale_date: form.sale_date,
          sale_ids: createdSaleIds,
          status: 'active',
          note: form.note,
          created_at: new Date().toISOString(),
        };
      }

      // Fetch individual sales to populate .sales array securely
      const fetchedSales = await Promise.all(
        createdSaleIds.map(id => api.get(`/sales/${id}`).then(r => r.data).catch(() => null))
      );
      
      const invoice = { 
        ...createdInvoice, 
        sales: fetchedSales.filter(Boolean) 
      };

      onSaved({ invoice });
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در ثبت فاکتور فروش');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden my-8 border border-gray-300">

        <div className="bg-orange-500 p-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShoppingCart size={22} /> فاکتور فروش جدید
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {items.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-300 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 bg-orange-500 text-white px-3 py-1 rounded-lg font-bold text-xs">
                <Receipt size={13} /> {items.length} محصول در فاکتور
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-rose-600">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* ADDED ITEMS LIST */}
          {items.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2 mb-2">
                <CheckCircle2 size={16} className="text-black" /> محصولات اضافه‌شده
              </h4>
              {items.map((it, idx) => (
                <div key={it.localId} className="border border-gray-300 rounded-xl p-3 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-black text-sm">{it.product.name}</p>
                      <p className="text-[11px] text-gray-500">
                        {it.form.qty_sold} × {it.unitLabel} — {Number(it.form.unit_price).toLocaleString()} {it.form.currency}
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeItem(it.localId)}
                    className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* DRAFT FORM */}
          <div className="border-2 border-dashed border-gray-300 rounded-2xl p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center">
                <Plus size={15} />
              </div>
              <h4 className="font-bold text-gray-700 text-sm">
                {items.length === 0 ? 'محصول اول' : `افزودن محصول ${items.length + 1}`}
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="تاریخ فروش" required>
                <PersianDatePicker value={form.sale_date} onChange={(v) => update('sale_date', v)} />
              </FormField>

              <FormField label="مشتری (اختیاری)">
                <div className="flex gap-2">
                  {!addingCustomer ? (
                    <select value={form.customer_id} onChange={(e) => update('customer_id', e.target.value)} className="form-input">
                      <option value="">— مشتری نقدی (بدون ثبت) —</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.lastname || ''} {c.phone ? `— ${c.phone}` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input className="form-input" placeholder="نام مشتری جدید" value={newCustomer.name}
                      onChange={(e) => updateNewCustomer('name', e.target.value)} autoFocus />
                  )}
                  <button type="button"
                    onClick={() => {
                      setAddingCustomer(v => !v);
                      setNewCustomer({ name: '', lastname: '', phone: '', address: '' });
                      setCustomerErrors({});
                    }}
                    className={`shrink-0 px-3 rounded-xl border-2 font-bold text-xs transition-all flex items-center justify-center ${
                      addingCustomer ? 'border-rose-400 bg-rose-50 text-rose-600' : 'border-orange-500 bg-orange-50 text-orange-600'
                    }`}>
                    {addingCustomer ? <X size={16} /> : <UserPlus size={16} />}
                  </button>
                </div>
              </FormField>

              <FormField label="محصول" required>
                <select value={form.product_id} onChange={(e) => update('product_id', e.target.value)} className="form-input" required>
                  <option value="">انتخاب محصول...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.packaging_description && ` — ${p.packaging_description}`}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {addingCustomer && (
              <div className="mt-3 p-4 rounded-xl bg-white border border-gray-300 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center">
                    <UserPlus size={13} />
                  </div>
                  <p className="text-xs font-bold text-black">اطلاعات مشتری جدید</p>
                  <p className="text-[10px] text-gray-600">(فقط نام الزامی است)</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="نام مشتری" required>
                    <div className="relative">
                      <UserIcon size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input className="form-input pr-10" placeholder="نام"
                        value={newCustomer.name}
                        onChange={(e) => updateNewCustomer('name', e.target.value)} />
                    </div>
                    {customerErrors.name && (
                      <p className="text-rose-500 text-xs font-medium flex items-center gap-1 mt-1">
                        <AlertCircle size={12} /> {customerErrors.name[0]}
                      </p>
                    )}
                  </FormField>
                  <FormField label="تخلص">
                    <div className="relative">
                      <UserIcon size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input className="form-input pr-10" placeholder="تخلص"
                        value={newCustomer.lastname}
                        onChange={(e) => updateNewCustomer('lastname', e.target.value)} />
                    </div>
                  </FormField>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="شماره تلفن">
                    <div className="relative">
                      <Phone size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input className="form-input pr-10" placeholder="+93 xxx xxx xxx" dir="ltr"
                        value={newCustomer.phone}
                        onChange={(e) => updateNewCustomer('phone', e.target.value)} />
                    </div>
                  </FormField>
                  <FormField label="آدرس">
                    <div className="relative">
                      <MapPin size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input className="form-input pr-10" placeholder="آدرس کامل..."
                        value={newCustomer.address}
                        onChange={(e) => updateNewCustomer('address', e.target.value)} />
                    </div>
                  </FormField>
                </div>
              </div>
            )}

            {selectedProduct && (
              <div className="mt-4 bg-white border border-gray-300 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  {selectedProduct.photo_url && (
                    <img src={selectedProduct.photo_url} alt={selectedProduct.name}
                      className="w-16 h-16 rounded-xl object-cover border border-gray-300 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-black">{selectedProduct.name}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{selectedProduct.packaging_description}</p>
                    <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
                      {selectedProduct.module && (
                        <span className="bg-gray-50 border border-gray-300 text-black px-2 py-0.5 rounded-full font-bold">
                          📦 {selectedProduct.module.stock} {selectedProduct.module.name}
                        </span>
                      )}
                      {selectedProduct.sub_module && (
                        <span className="bg-gray-50 border border-gray-300 text-black px-2 py-0.5 rounded-full font-bold">
                          🥤 {selectedProduct.sub_module.stock} {selectedProduct.sub_module.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedProduct && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <FormField label="واحد فروش" required>
                  <div className={`grid gap-2 ${availableUnits.length === 3 ? 'grid-cols-3' : availableUnits.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {availableUnits.map(({ v, label }) => {
                      const active = form.sale_unit === v;
                      return (
                        <button type="button" key={v} onClick={() => update('sale_unit', v)}
                          className={`py-3 px-2 rounded-xl border-2 font-bold transition-all text-sm ${
                            active ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </FormField>

                <FormField label={`تعداد (${availableUnits.find(u => u.v === form.sale_unit)?.label || ''})`} required>
                  <input type="number" min="1" value={form.qty_sold}
                    onChange={(e) => update('qty_sold', e.target.value)}
                    className="form-input text-center font-bold text-lg" dir="ltr" />
                </FormField>
              </div>
            )}

            {preview && (
              <div className="mt-4 bg-white border border-gray-300 rounded-2xl p-4 space-y-3">
                <div className="text-xs font-bold text-black flex items-center gap-1">
                  <Info size={14} /> پیش‌نمایش موجودی
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* CURRENT STOCK */}
                  <div className="bg-gray-50 border border-gray-300 rounded-xl p-3">
                    <p className="text-[10px] text-gray-600 font-bold mb-2">موجودی فعلی</p>
                    <div className="text-xs text-black font-bold space-y-1">
                      {preview.current_stock.module > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="w-4">📦</span>
                          {preview.current_stock.module} {selectedProduct.module?.name || 'کارتن'}
                        </div>
                      )}
                      {preview.current_stock.sub_module > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="w-4">🥤</span>
                          {preview.current_stock.sub_module} {selectedProduct.sub_module?.name || 'قوطی'}
                        </div>
                      )}
                      {preview.current_stock.sub_sub_module > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="w-4">🔹</span>
                          {preview.current_stock.sub_sub_module} {selectedProduct.sub_sub_module?.name || 'قطعه'}
                        </div>
                      )}
                      {preview.current_stock.module === 0 && preview.current_stock.sub_module === 0 && preview.current_stock.sub_sub_module === 0 && (
                        <div className="text-rose-600 font-bold">⚠️ موجودی صفر است</div>
                      )}
                    </div>
                  </div>

                  {/* REMAINING STOCK */}
                  <div className="bg-gray-50 border border-gray-300 rounded-xl p-3">
                    <p className="text-[10px] text-gray-600 font-bold mb-2">بعد از فروش</p>
                    <div className="text-xs text-black font-bold space-y-1">
                      {preview.remaining_stock.module > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="w-4">📦</span>
                          {preview.remaining_stock.module} {selectedProduct.module?.name || 'کارتن'}
                        </div>
                      )}
                      {preview.remaining_stock.sub_module > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="w-4">🥤</span>
                          {preview.remaining_stock.sub_module} {selectedProduct.sub_module?.name || 'قوطی'}
                        </div>
                      )}
                      {preview.remaining_stock.sub_sub_module > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="w-4">🔹</span>
                          {preview.remaining_stock.sub_sub_module} {selectedProduct.sub_sub_module?.name || 'قطعه'}
                        </div>
                      )}
                      {preview.remaining_stock.module === 0 && preview.remaining_stock.sub_module === 0 && preview.remaining_stock.sub_sub_module === 0 && (
                        <div className="text-rose-600 font-bold">⚠️ ناموجود می‌شود</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <FormField label="قیمت فروش هر واحد" required>
                <input type="number" min="0" step="0.01" value={form.unit_price}
                  onChange={(e) => update('unit_price', e.target.value)}
                  placeholder="مثلاً 40"
                  className="form-input text-center font-bold" dir="ltr" required />
              </FormField>

              <FormField label="ارز" required>
                <div className="grid grid-cols-2 gap-2">
                  {['AFN', 'USD'].map(c => {
                    const active = form.currency === c;
                    return (
                      <button type="button" key={c} onClick={() => update('currency', c)}
                        className={`py-3 rounded-xl border-2 font-bold transition-all text-sm ${
                          active ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}>
                        {CURRENCY_LABEL[c]}
                      </button>
                    );
                  })}
                </div>
              </FormField>

              <FormField label="نرخ تبادل" required>
                <input type="number" step="0.01" min="0.01" value={form.exchange_rate}
                  onChange={(e) => update('exchange_rate', e.target.value)}
                  placeholder="65"
                  className="form-input text-center" dir="ltr" required />
              </FormField>
            </div>

            {form.unit_price && form.qty_sold && (
              <div className="mt-4 bg-white border border-gray-300 rounded-2xl p-4 space-y-2">
                <div className="text-xs font-bold text-black flex items-center gap-1">
                  <Calculator size={14} /> جمع فروش
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-gray-600 font-bold">
                    {form.qty_sold} × {Number(form.unit_price).toLocaleString()} {form.currency} =
                  </span>
                  <span className="text-2xl font-black text-black">
                    {totalPrice.toLocaleString()} <span className="text-sm">{form.currency}</span>
                  </span>
                </div>
                <div className="text-[11px] text-gray-600 font-bold pt-2 border-t border-gray-300">
                  معادل: {totalConv.afn.toLocaleString()} AFN / $ {totalConv.usd.toLocaleString()} USD
                </div>
              </div>
            )}

            <div className="border-t border-gray-300 pt-5 mt-4">
              <h4 className="font-bold mb-4 text-black flex items-center gap-2">
                <Receipt size={16} /> وضعیت پرداخت
              </h4>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { v: 'cash',         label: 'نقد',       sub: 'کامل پرداخت شد',   icon: CheckCircle2 },
                  { v: 'loan_full',    label: 'قرض کامل',  sub: 'هیچ پرداخت نشده',   icon: HandCoins },
                  { v: 'loan_partial', label: 'قرض جزئی',  sub: 'بخشی پرداخت شده',   icon: Clock },
                ].map(({ v, label, sub, icon: Icon }) => {
                  const active = form.payment_type === v;
                  return (
                    <button type="button" key={v} onClick={() => update('payment_type', v)}
                      className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 font-bold transition-all ${
                        active ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}>
                      <Icon size={18} />
                      <span className="text-sm">{label}</span>
                      <span className="text-[10px] opacity-75 font-normal">{sub}</span>
                    </button>
                  );
                })}
              </div>

              {form.payment_type === 'loan_partial' && (
                <div className="mt-4">
                  <FormField label={`مبلغ پرداخت‌شده (${CURRENCY_LABEL[form.currency]})`} required>
                    <input type="number" min="0" step="0.01" max={totalPrice} value={form.paid_amount}
                      onChange={(e) => update('paid_amount', e.target.value)}
                      placeholder="مثلاً 500"
                      className="form-input text-center font-bold" dir="ltr" />
                  </FormField>
                </div>
              )}

              {form.unit_price && form.qty_sold && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="bg-white border border-gray-300 rounded-xl p-3">
                    <p className="text-[10px] text-gray-600 font-bold mb-1">پرداخت‌شده</p>
                    <p className="text-lg font-black text-black">
                      {paidAmount.toLocaleString()} {form.currency}
                    </p>
                  </div>
                  <div className="bg-white border border-gray-300 rounded-xl p-3">
                    <p className="text-[10px] text-gray-600 font-bold mb-1">باقی‌مانده</p>
                    <p className={`text-lg font-black ${remainingAmount > 0 ? 'text-rose-600' : 'text-black'}`}>
                      {remainingAmount.toLocaleString()} {form.currency}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <FormField label="یادداشت">
              <textarea value={form.note} onChange={(e) => update('note', e.target.value)}
                rows="2" placeholder="یادداشت اضافی..." className="form-input resize-none" />
            </FormField>

            <button
              type="button"
              onClick={addDraftToItems}
              className="mt-4 w-full bg-white border-2 border-dashed border-orange-500 hover:bg-orange-50 text-orange-600 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={16} /> افزودن به فاکتور
            </button>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-gray-300 sticky bottom-0 bg-white">
            <button type="submit" disabled={loading}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> در حال ثبت...</>
              ) : (
                <><Receipt size={18} /> ثبت فاکتور ({items.length} محصول)</>
              )}
            </button>
            <button type="button" onClick={onClose}
              className="px-6 py-3 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-black font-bold transition-colors">
              انصراف
            </button>
          </div>
        </form>

        <style>{`
          .form-input {
            width: 100%;
            background: #ffffff;
            border: 1px solid #d1d5db;
            border-radius: 12px;
            padding: 12px 16px;
            font-size: 14px;
            color: #000000;
            outline: none;
            transition: all 0.2s;
          }
          .form-input:focus {
            border-color: #f97316;
            box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15);
          }
          .form-input::placeholder { color: #9ca3af; }
        `}</style>
      </div>
    </div>
  );
}

/* ============================================================
   FORM FIELD
   ============================================================ */
function FormField({ label, required, children }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-black">
        {label}
        {required && <span className="text-rose-500 mr-1">*</span>}
      </label>
      {children}
    </div>
  );
}

/* ============================================================
   PAY SALE MODAL
   ============================================================ */
function PaySaleModal({ sale, onClose, onPaid }) {
  const remaining = Number(sale.remaining_amount) || 0;
  const rate = Number(sale.exchange_rate) || 1;
  const curr = String(sale.currency || 'AFN').toUpperCase();

  const [amount, setAmount] = useState(remaining);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputConv = convertCurrency(Number(amount) || 0, curr, rate);

  const submit = async () => {
    const amt = Number(amount) || 0;
    if (amt <= 0) { setError('مبلغ باید بزرگ‌تر از صفر باشد'); return; }
    if (amt > remaining) { setError(`حداکثر مبلغ قابل پرداخت ${remaining.toLocaleString()} است`); return; }

    setLoading(true);
    setError('');
    try {
      await api.post(`/sales/${sale.id}/pay`, { amount: amt });
      onPaid();
    } catch (e) {
      setError(e.response?.data?.message || 'خطا در پرداخت');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-300">

        <div className="bg-orange-500 p-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <HandCoins size={22} /> پرداخت قرض مشتری
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">

          <div className="bg-gray-50 border border-gray-300 rounded-2xl p-4 space-y-2">
            <p className="font-bold text-black">{sale.customer_name || 'مشتری نقدی'}</p>
            <p className="text-xs text-gray-600">محصول: {sale.product_name}</p>
            <p className="text-xs text-gray-600 font-mono">{sale.invoice_number}</p>
            {sale.sale_date && (
              <p className="text-xs text-gray-600 font-mono">تاریخ فروش: {sale.sale_date}</p>
            )}

            <div className="mt-3 space-y-2 text-sm">
              <Row label="مبلغ کل:" value={`${Number(sale.total_price).toLocaleString()} ${curr}`} plain />
              <Row label="پرداخت‌شده:" value={`${Number(sale.paid_amount).toLocaleString()} ${curr}`} color="emerald" />
              <Row label="باقی‌مانده:" value={`${remaining.toLocaleString()} ${curr}`} color="rose" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-black">
              مبلغ پرداخت ({CURRENCY_LABEL[curr] || curr})
            </label>
            <input type="number" min="0" step="0.01" max={remaining} value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(''); }}
              className="w-full bg-white border border-gray-300 rounded-xl py-3 px-4 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all text-center font-bold text-lg"
              dir="ltr" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setAmount(remaining)}
                className="text-xs bg-gray-100 border border-gray-300 hover:bg-gray-200 text-black font-bold px-3 py-1.5 rounded-lg">
                کل باقی‌مانده
              </button>
              <button type="button" onClick={() => setAmount(Math.round(remaining / 2))}
                className="text-xs bg-gray-100 border border-gray-300 hover:bg-gray-200 text-black font-bold px-3 py-1.5 rounded-lg">
                نصف
              </button>
            </div>

            <div className="mt-2 p-2 rounded-lg bg-gray-50 border border-gray-200 text-xs">
              <Row label="معادل AFN:" value={`${inputConv.afn.toLocaleString()} AFN`} plain />
              <Row label="معادل USD:" value={`$ ${inputConv.usd.toLocaleString()}`} plain />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex gap-2 text-rose-700 text-xs font-bold">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={submit} disabled={loading}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              {loading ? <><Loader2 size={18} className="animate-spin" /> در حال ثبت...</> : 'ثبت پرداخت'}
            </button>
            <button onClick={onClose}
              className="px-6 py-3 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-black font-bold transition-colors">
              انصراف
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ROW helper
   ============================================================ */
function Row({ label, value, color, plain }) {
  const colorMap = {
    emerald: 'text-black',
    rose:    'text-rose-600',
    amber:   'text-black',
  };
  if (plain) {
    return (
      <div className="flex justify-between">
        <span className="text-gray-600">{label}</span>
        <b>{value}</b>
      </div>
    );
  }
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <b className={colorMap[color] || 'text-black'}>{value}</b>
    </div>
  );
}