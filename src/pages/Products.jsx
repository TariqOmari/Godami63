import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus, Search, Pencil, Trash2, X, AlertCircle, Package, Barcode, Tag,
  Calculator, Boxes, Loader2, DollarSign, Calendar, Image as ImageIcon,
  Upload, Wallet, HandCoins, CheckCircle2, Clock, FileText, Download,
  Printer, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Layers, Info,
  Warehouse, Receipt, ShoppingCart, PackagePlus,
} from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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

const persianToEnglishDate = (persianStr) => {
  if (!persianStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(persianStr)) return persianStr;
  const p = parsePersianDate(persianStr);
  if (!p) return '';
  const g = persianToGregorian(p.year, p.month, p.day);
  return `${g.year}-${String(g.month).padStart(2, '0')}-${String(g.day).padStart(2, '0')}`;
};

const englishToPersianDate = (englishStr) => {
  if (!englishStr) return '';
  const parts = String(englishStr).split('-');
  if (parts.length !== 3) return '';
  const gy = parseInt(parts[0], 10);
  const gm = parseInt(parts[1], 10);
  const gd = parseInt(parts[2], 10);
  if (!gy || !gm || !gd) return '';
  const p = gregorianToPersian(new Date(gy, gm - 1, gd));
  return formatPersianDate(p.year, p.month, p.day);
};

// ============ FINAL PRICE ============
const computeFinalPrice = (product, cartonQty) => {
  const qty = Math.max(1, parseInt(cartonQty, 10) || 1);
  const cansPerCarton = Math.max(1, parseInt(product.sub_module_qty, 10) || 1);
  const piecesPerCan  = Math.max(1, parseInt(product.sub_sub_module_qty, 10) || 1);

  const totalCartons = qty;
  const totalCans    = qty * cansPerCarton;
  const totalPieces  = totalCans * piecesPerCan;

  let billableUnits, unitLabel;
  switch (product.price_mode) {
    case 'sub_sub_module':
      billableUnits = totalPieces;
      unitLabel = product.sub_sub_module_name || 'واحد سوم';
      break;
    case 'sub_module':
      billableUnits = totalCans;
      unitLabel = product.sub_module_name || 'واحد دوم';
      break;
    default:
      billableUnits = totalCartons;
      unitLabel = product.module_name || 'واحد اصلی';
  }

  const price = parseFloat(product.price) || 0;
  const finalPrice = Math.round(billableUnits * price * 100) / 100;

  return {
    cartonQty: qty, cansPerCarton, piecesPerCan,
    totalCartons, totalCans, totalPieces,
    billableUnits, unitLabel, price, finalPrice,
  };
};

const computePurchaseTotal = (product, cartonQty) => {
  const calc = computeFinalPrice(product, cartonQty);
  const expenses = Number(product.expenses) || 0;

  return {
    ...calc,
    expenses,
    finalPrice: Math.round((calc.finalPrice + expenses) * 100) / 100,
  };
};

// ============ SMART STOCK CALCULATOR ============
const getStock = (product) => {
  let totalCartons = 0;
  let totalCans = 0;
  let totalPieces = 0;

  if (product.current_stock) {
    totalCartons = Number(product.current_stock.module_stock) || 0;
    totalCans = Number(product.current_stock.sub_module_stock) || 0;
    totalPieces = Number(product.current_stock.sub_sub_module_stock) || 0;
  }

  const cansPerCarton = Math.max(1, parseInt(product.sub_module_qty, 10) || 1);
  const piecesPerCan = Math.max(1, parseInt(product.sub_sub_module_qty, 10) || 1);

  const fullCartonsFromCans = Math.floor(totalCans / cansPerCarton);
  const looseCans = totalCans % cansPerCarton;

  const fullCansFromPieces = Math.floor(totalPieces / piecesPerCan);
  const loosePieces = totalPieces % piecesPerCan;

  return {
    cartons: { total: totalCartons, full: totalCartons, loose: 0 },
    cans: { total: totalCans, full: fullCartonsFromCans, loose: looseCans },
    pieces: { total: totalPieces, full: fullCansFromPieces, loose: loosePieces },
    isOutOfStock: totalCartons === 0 && totalCans === 0 && totalPieces === 0
  };
};

// ============ CURRENCY ============
const CURRENCY_LABEL = { AFN: 'افغانی', USD: 'دالر' };

const convertCurrency = (amount, fromCurrency, rate) => {
  const r = Math.max(0.0001, Number(rate) || 1);
  const amt = Number(amount) || 0;
  if (String(fromCurrency).toUpperCase() === 'USD') {
    return {
      afn: Math.round(amt * r * 100) / 100,
      usd: Math.round(amt * 100) / 100,
    };
  }
  return {
    afn: Math.round(amt * 100) / 100,
    usd: Math.round((amt / r) * 100) / 100,
  };
};

const getBothCurrencies = (product, amountField) => {
  const rate = Number(product.exchange_rate) || 1;
  const curr = String(product.currency || 'AFN').toUpperCase();
  const amt  = Number(product[amountField]) || 0;
  return convertCurrency(amt, curr, rate);
};

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
        className={`w-full flex items-center justify-between bg-gray-50 border rounded-lg px-3 py-2 text-sm transition-all ${
          open ? 'border-slate-400 bg-white ring-2 ring-slate-400/10' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <span className={`font-mono ${value ? 'text-gray-800 font-bold' : 'text-gray-400'}`} dir="ltr">
          {value || placeholder}
        </span>
        <Calendar size={14} className={open ? 'text-slate-600' : 'text-gray-400'} />
      </button>

      {open && (
        <div
          className="absolute z-[300] mt-2 left-0 right-0 bg-white rounded-xl shadow-2xl border border-gray-100 p-3"
          style={{ minWidth: '260px' }}
        >
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={nextMonth} className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-gray-600 hover:text-slate-800">
              <ChevronRight size={16} />
            </button>
            <div className="flex items-center gap-1">
              <select value={viewMonth} onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="bg-transparent font-bold text-gray-800 outline-none cursor-pointer text-xs hover:bg-gray-50 rounded-md px-1 py-1">
                {AFGHAN_MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
              <select value={viewYear} onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="bg-transparent font-bold text-gray-800 outline-none cursor-pointer text-xs hover:bg-gray-50 rounded-md px-1 py-1 font-mono" dir="ltr">
                {Array.from({ length: 41 }, (_, i) => today.year - 20 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-gray-600 hover:text-slate-800">
              <ChevronLeft size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
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
                  className={`aspect-square rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                    selected
                      ? 'bg-slate-800 text-white shadow'
                      : todayDay
                        ? 'bg-slate-100 text-slate-800 ring-2 ring-slate-300'
                        : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={handleToday}
              className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-1.5 rounded-lg text-[11px] transition-all">
              امروز
            </button>
            <button type="button" onClick={handleClear}
              className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-[11px] transition-colors">
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
export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [calcProduct, setCalcProduct] = useState(null);
  const [payProduct, setPayProduct] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [billProduct, setBillProduct] = useState(null);
  const [bills, setBills] = useState([]);
  const [showBills, setShowBills] = useState(false);
  const [viewBill, setViewBill] = useState(null);
  const [openingBillId, setOpeningBillId] = useState(null);
  const [detailsProduct, setDetailsProduct] = useState(null);
  const [restockProduct, setRestockProduct] = useState(null);

  const [scannedProduct, setScannedProduct] = useState(null);
  const [gunStatus, setGunStatus] = useState(null);
  const gunTimerRef = useRef(null);

  const fetchProducts = async (search = '', payment = '', currency = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/products', {
        params: {
          search,
          payment_type: payment || undefined,
          currency: currency || undefined,
        }
      });
      setProducts(data);
    } catch (e) {
      setToast({ show: true, message: 'خطا در دریافت لیست محصولات', type: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data } = await api.get('/suppliers');
      setSuppliers(data);
    } catch (e) { console.error(e); }
  };

  const fetchBills = async () => {
    try {
      const { data } = await api.get('/purchase-bills');
      const list = data?.data?.data ?? data?.data ?? data;
      setBills(Array.isArray(list) ? list : []);
    } catch (e) { console.error(e); }
  };

  const handleViewBill = async (bill) => {
    setOpeningBillId(bill.id);
    try {
      const { data } = await api.get(`/purchase-bills/${bill.id}`);
      const details = normalizeBillDetails(data, bill);
      const productIds = details.product_ids || bill.product_ids || [];

      if (details.products.length === 0 && productIds.length > 0) {
        throw new Error('Bill details did not include its products');
      }

      setShowBills(false);
      setViewBill(details);
    } catch (err) {
      console.error('Failed to load purchase bill details', err);
      setToast({ show: true, message: 'خطا در دریافت جزئیات فاکتور', type: 'warning' });
    } finally {
      setOpeningBillId(null);
    }
  };

  useEffect(() => { fetchProducts(); }, []);
  useEffect(() => {
    const t = setTimeout(() => fetchProducts(searchTerm, paymentFilter, currencyFilter), 400);
    return () => clearTimeout(t);
  }, [searchTerm, paymentFilter, currencyFilter]);
  useEffect(() => { fetchSuppliers(); }, []);

  // Barcode scanner
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = 0;
    let resetTimer = null;

    const isTypingInField = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') return false;
      if (el.dataset && el.dataset.scanInput === 'true') return false;
      return true;
    };

    const handleKeyDown = (e) => {
      if (isTypingInField()) return;
      const now = Date.now();
      if (now - lastKeyTime > 120) buffer = '';
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.length >= 4) {
          const code = buffer.trim();
          buffer = '';
          handleGunScan(code);
        } else buffer = '';
        return;
      }
      if (e.key.length === 1) buffer += e.key;
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => { buffer = ''; }, 300);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(resetTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGunScan = async (code) => {
    setGunStatus({ type: 'loading', message: `در حال جستجوی بارکد ${code}...` });
    clearTimeout(gunTimerRef.current);
    try {
      const { data } = await api.post('/products/barcode', { barcode: code });
      setGunStatus({ type: 'success', message: `✅ ${data.name} پیدا شد` });
      setScannedProduct(data);
      gunTimerRef.current = setTimeout(() => setGunStatus(null), 2500);
    } catch (e) {
      if (e.response?.status === 404) {
        setGunStatus({ type: 'error', message: `❌ محصولی با بارکد ${code} یافت نشد` });
      } else {
        setGunStatus({ type: 'error', message: `خطا در جستجوی بارکد` });
      }
      gunTimerRef.current = setTimeout(() => setGunStatus(null), 3500);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/products/${deleteConfirm}`);
      setProducts(prev => prev.filter(p => p.id !== deleteConfirm));
      setToast({ show: true, message: 'محصول با موفقیت حذف شد', type: 'warning' });
      setDeleteConfirm(null);
    } catch (e) {
      setToast({ show: true, message: e.response?.data?.message || 'خطا', type: 'warning' });
    }
  };

  const totals = products.reduce((acc, p) => {
    const fin = getBothCurrencies(p, 'final_price');
    const paid = getBothCurrencies(p, 'paid_amount');
    const rem  = getBothCurrencies(p, 'remaining_amount');
    acc.finalAfn += fin.afn;
    acc.finalUsd += fin.usd;
    acc.paidAfn  += paid.afn;
    acc.paidUsd  += paid.usd;
    acc.remAfn   += rem.afn;
    acc.remUsd   += rem.usd;
    return acc;
  }, { finalAfn: 0, finalUsd: 0, paidAfn: 0, paidUsd: 0, remAfn: 0, remUsd: 0 });

  return (
    <DashboardLayout>
      <div className="space-y-4" dir="rtl">

        {toast.show && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />
        )}

        {gunStatus && (
          <div className={`rounded-xl p-3 shadow-sm border flex items-center gap-3 ${
            gunStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            gunStatus.type === 'error'   ? 'bg-rose-50 border-rose-200 text-rose-800' :
                                            'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            {gunStatus.type === 'loading' && <Loader2 size={18} className="animate-spin" />}
            {gunStatus.type === 'success' && <CheckCircle2 size={18} />}
            {gunStatus.type === 'error'   && <AlertCircle size={18} />}
            <span className="font-bold text-xs">{gunStatus.message}</span>
          </div>
        )}

        {/* ============ COMPACT HEADER & FILTERS ============ */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-white shadow-sm">
                <Warehouse size={18} />
              </div>
              گدام و محصولات
            </h1>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-white rounded-lg px-3 py-2 border border-gray-200 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-400/10 transition-all w-48 sm:w-64">
                <Search size={16} className="text-gray-400 ml-2 shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="جستجو..."
                  className="bg-transparent border-none outline-none text-xs w-full text-gray-700 placeholder-gray-400"
                />
              </div>

              <select value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 outline-none cursor-pointer">
                <option value="">همه ارزها</option>
                <option value="AFN">افغانی</option>
                <option value="USD">دالر</option>
              </select>

              <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 outline-none cursor-pointer">
                <option value="">همه وضعیت‌ها</option>
                <option value="cash">نقد</option>
                <option value="loan_full">قرض کامل</option>
                <option value="loan_partial">قرض جزئی</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <Plus size={16} /> فاکتور خرید جدید
            </button>
          </div>
        </div>

        {/* ============ COMPACT KPI CARDS ============ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                <Wallet size={14} className="text-slate-600" />
              </div>
              <span className="text-xs text-gray-500 font-bold">ارزش کل</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-gray-800">{totals.finalAfn.toLocaleString()} <span className="text-[10px]">AFN</span></p>
              <p className="text-[10px] font-bold text-gray-400">$ {totals.finalUsd.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 size={14} className="text-emerald-600" />
              </div>
              <span className="text-xs text-gray-500 font-bold">پرداخت‌شده</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-emerald-700">{totals.paidAfn.toLocaleString()} <span className="text-[10px]">AFN</span></p>
              <p className="text-[10px] font-bold text-emerald-600">$ {totals.paidUsd.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                <HandCoins size={14} className="text-rose-600" />
              </div>
              <span className="text-xs text-gray-500 font-bold">قرضه</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-rose-700">{totals.remAfn.toLocaleString()} <span className="text-[10px]">AFN</span></p>
              <p className="text-[10px] font-bold text-rose-600">$ {totals.remUsd.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* ============ CONTENT ============ */}
        {loading ? (
          <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-slate-100 border-t-slate-600 rounded-full animate-spin"></div>
            <p className="text-gray-500 mt-3 text-xs">در حال بارگذاری...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <Package size={28} className="text-slate-400" />
            </div>
            <p className="text-gray-700 font-bold text-sm mb-1">هیچ محصولی یافت نشد</p>
            <p className="text-xs text-gray-400 mb-4">اولین فاکتور خرید خود را ایجاد کنید</p>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus size={16} /> فاکتور خرید جدید
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onDetails={() => setDetailsProduct(p)}
                onPay={() => setPayProduct(p)}
                onCalc={() => setCalcProduct(p)}
                onBill={() => setBillProduct(p)}
                onRestock={() => setRestockProduct(p)}
                onEdit={() => { setEditing(p); setShowForm(true); }}
                onDelete={() => setDeleteConfirm(p.id)}
              />
            ))}
          </div>
        )}

        {/* ============ MODALS ============ */}
        {detailsProduct && (
          <ProductDetailsModal
            product={detailsProduct}
            onClose={() => setDetailsProduct(null)}
            onPay={() => { setPayProduct(detailsProduct); setDetailsProduct(null); }}
            onCalc={() => { setCalcProduct(detailsProduct); setDetailsProduct(null); }}
            onBill={() => { setBillProduct(detailsProduct); setDetailsProduct(null); }}
            onRestock={() => { setRestockProduct(detailsProduct); setDetailsProduct(null); }}
            onEdit={() => { setEditing(detailsProduct); setShowForm(true); setDetailsProduct(null); }}
          />
        )}

        {showForm && (
          <BillForm
            editProduct={editing}
            suppliers={suppliers}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSaved={() => {
              setShowForm(false);
              setEditing(null);
              fetchProducts(searchTerm, paymentFilter, currencyFilter);
              fetchSuppliers();
              setToast({ show: true, message: editing ? 'محصول ویرایش شد' : 'محصولات با موفقیت ثبت شدند', type: 'success' });
            }}
          />
        )}

        {calcProduct && <CalculatorModal product={calcProduct} onClose={() => setCalcProduct(null)} />}

        {payProduct && (
          <PayModal 
            product={payProduct} 
            onClose={() => setPayProduct(null)}
            onPaid={async (updatedProduct) => {
              // 1. Close pay modal
              setPayProduct(null);
              
              // 2. Refresh products list in background
              await fetchProducts(searchTerm, paymentFilter, currencyFilter);
              
              // 3. ✅ Re-open Details Modal with the UPDATED product to show the receipt immediately
              if (updatedProduct) {
                setDetailsProduct(updatedProduct);
              }
              
              setToast({ show: true, message: 'پرداخت ثبت شد و رسید صادر گردید', type: 'success' });
            }} 
          />
        )}

        {restockProduct && (
          <RestockModal
            product={restockProduct}
            onClose={() => setRestockProduct(null)}
            onSaved={() => {
              setRestockProduct(null);
              fetchProducts(searchTerm, paymentFilter, currencyFilter);
              setToast({ show: true, message: 'افزایش موجودی ثبت شد', type: 'success' });
            }}
          />
        )}

        {billProduct && <BillModal product={billProduct} onClose={() => setBillProduct(null)} />}

        {viewBill && <BillViewModal bill={viewBill} onClose={() => setViewBill(null)} />}

        {scannedProduct && (
          <ScannedProductModal
            product={scannedProduct}
            onClose={() => setScannedProduct(null)}
            onPay={(p) => { setScannedProduct(null); setPayProduct(p); }}
            onCalc={(p) => { setScannedProduct(null); setCalcProduct(p); }}
            onBill={(p) => { setScannedProduct(null); setBillProduct(p); }}
            onRestock={(p) => { setScannedProduct(null); setRestockProduct(p); }}
          />
        )}

        {showBills && (
          <BillsListModal
            bills={bills}
            onClose={() => setShowBills(false)}
            onView={handleViewBill}
            openingBillId={openingBillId}
          />
        )}

        {deleteConfirm && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
              <div className="p-5 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 flex items-center justify-center mb-3">
                  <Trash2 size={24} className="text-rose-500" />
                </div>
                <h3 className="text-sm font-bold text-gray-800 mb-1">حذف محصول</h3>
                <p className="text-xs text-gray-500 mb-5">آیا از حذف مطمئن هستید؟</p>
                <div className="flex items-center gap-2">
                  <button onClick={handleDelete}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-lg text-xs transition-all">
                    بله، حذف کن
                  </button>
                  <button onClick={() => setDeleteConfirm(null)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-lg text-xs transition-colors">
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
   PRODUCT CARD
   ============================================================ */
function ProductCard({ product, onDetails, onPay, onCalc, onBill, onRestock, onEdit, onDelete }) {
  const stock = getStock(product);
  const remConv   = getBothCurrencies(product, 'remaining_amount');
  const meta = PAYMENT_META[product.payment_type] || PAYMENT_META.cash;
  const PayIcon = meta.icon;
  const isOutOfStock = stock.isOutOfStock;

  const totalPriceAfn = useMemo(() => {
    let sum = Number(product.final_price_afn) || 0;
    if (product.restock_records) {
      product.restock_records.forEach(r => {
        sum += Number(r.total_price_afn) || 0;
      });
    }
    return sum;
  }, [product.final_price_afn, product.restock_records]);

  const totalPriceUsd = useMemo(() => {
    return convertCurrency(totalPriceAfn, 'AFN', product.exchange_rate || 1).usd;
  }, [totalPriceAfn, product.exchange_rate]);

  const getPriceUnitName = () => {
    if (product.price_mode === 'sub_module') return product.sub_module_name;
    if (product.price_mode === 'sub_sub_module') return product.sub_sub_module_name;
    return product.module_name;
  };

  const unitLabel = getPriceUnitName();
  const unitPrice = Number(product.price) || 0;

  const hasDifferentPrices = useMemo(() => {
    if (!product.restock_records || product.restock_records.length === 0) return false;
    
    return product.restock_records.some(
      r => Number(r.price) !== Number(product.price)
    );
  }, [product.restock_records, product.price]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow transition-all flex flex-col relative">

      <div className="relative h-32 bg-gray-50 overflow-hidden">
        {product.photo_url ? (
          <img src={product.photo_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xl">
              {product.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        {product.category && (
          <div className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-700 flex items-center gap-1 shadow-sm">
            <Tag size={8} /> {product.category}
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute top-1.5 left-1.5 bg-rose-500 text-white px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 shadow">
            <AlertCircle size={8} /> ناموجود
          </div>
        )}
      </div>

      <div className="p-3 space-y-2 flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 truncate">
          <p className="font-bold text-gray-800 text-sm truncate">{product.name}</p>
          {product.supplier?.supplier_name && (
            <p className="text-[10px] text-black truncate shrink-0">
              (تامین کننده: {product.supplier.supplier_name})
            </p>
          )}
        </div>

        {(product.module_name || product.sub_module_name) && (
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-[9px] text-gray-500 font-bold mb-0.5 flex items-center gap-1">
              <Info size={8} /> بسته‌بندی
            </p>
            <p className="text-[10px] text-gray-700 font-bold leading-tight">
              1 {product.module_name}
              {product.sub_module_name && ` = ${product.sub_module_qty || 1} ${product.sub_module_name}`}
              {product.sub_sub_module_name && ` = ${product.sub_sub_module_qty || 1} ${product.sub_sub_module_name}`}
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-1">
          <div className="bg-blue-50 border border-blue-100 rounded-md p-1.5 text-center">
            <div className="flex items-center justify-center gap-0.5 text-[8px] font-bold text-blue-700 mb-0.5">
              <Boxes size={8} /> <span className="truncate">{product.module_name}</span>
            </div>
            <div className="text-xs font-black text-blue-800">
              <span className="text-[8px] text-blue-500 mr-0.5">موجودی:</span>
              {Number(stock.cartons.total).toLocaleString()}
            </div>
          </div>

          {product.sub_module_name ? (
            <div className="bg-cyan-50 border border-cyan-100 rounded-md p-1.5 text-center">
              <div className="flex items-center justify-center gap-0.5 text-[8px] font-bold text-cyan-700 mb-0.5">
                <Layers size={8} /> <span className="truncate">{product.sub_module_name}</span>
              </div>
              <div className="text-xs font-black text-cyan-800">
                <span className="text-[8px] text-cyan-500 mr-0.5">موجودی:</span>
                {Number(stock.cans.total).toLocaleString()}
              </div>
              {stock.cans.loose > 0 && (
                <div className="text-[9px] text-cyan-600 font-bold mt-0.5">
                  {stock.cans.loose} {product.sub_module_name} لخت از یک {product.module_name}
                </div>
              )}
            </div>
          ) : <div className="bg-gray-50 rounded-md p-1 text-center text-[9px] text-gray-400 italic flex items-center justify-center">—</div>}

          {product.sub_sub_module_name ? (
            <div className="bg-emerald-50 border border-emerald-100 rounded-md p-1.5 text-center">
              <div className="flex items-center justify-center gap-0.5 text-[8px] font-bold text-emerald-700 mb-0.5">
                <Package size={8} /> <span className="truncate">{product.sub_sub_module_name}</span>
              </div>
              <div className="text-xs font-black text-emerald-800">
                <span className="text-[8px] text-emerald-500 mr-0.5">موجودی:</span>
                {Number(stock.pieces.total).toLocaleString()}
              </div>
              {stock.pieces.loose > 0 && (
                <div className="text-[9px] text-emerald-600 font-bold mt-0.5">
                  {stock.pieces.loose} {product.sub_sub_module_name} لخت از یک {product.sub_module_name}
                </div>
              )}
            </div>
          ) : <div className="bg-gray-50 rounded-md p-1 text-center text-[9px] text-gray-400 italic flex items-center justify-center">—</div>}
        </div>

        <div className="pt-1.5 border-t border-gray-100 flex items-start justify-between">
          <span className="text-[9px] text-gray-500 font-bold mt-0.5">قیمت کل: </span>
          <div className="text-left flex flex-col items-end">
            <p className="font-black text-gray-800 text-xs">
              {totalPriceAfn.toLocaleString()} <span className="text-[9px]">AFN</span>
            </p>
            
            {hasDifferentPrices ? (
              <p className="text-[9px] text-rose-600 font-bold mt-0.5 flex items-center gap-1">
                <AlertCircle size={9} /> قیمت‌ها متفاوت است
              </p>
            ) : (
              unitLabel && (
                <p className="text-[9px] text-gray-500 font-medium mt-0.5">
                  فی {unitLabel}: {unitPrice.toLocaleString()} AFN
                </p>
              )
            )}
            
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto pt-1.5">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${meta.bg} ${meta.textColor} ${meta.border}`}>
            <PayIcon size={8} /> {meta.text}
          </span>
          {Number(product.remaining_amount) > 0 && (
            <span className="text-[9px] font-bold text-rose-600">
              بدهی: {remConv.afn.toLocaleString()}
            </span>
          )}
        </div>

        {product.assigned_loan_return_date && Number(product.remaining_amount) > 0 && (
          <div className="text-[9px] font-bold text-amber-600 flex items-center gap-1">
            <Calendar size={9} /> برگشت قرض: {product.assigned_loan_return_date}
          </div>
        )}

        <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-gray-100">
          <button onClick={onDetails}
            className="p-1 rounded bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all flex-1 flex justify-center" title="جزئیات">
            <Info size={13} />
          </button>
          <button onClick={onRestock}
            className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all flex-1 flex justify-center" title="افزایش موجودی">
            <PackagePlus size={13} />
          </button>
          <button onClick={onBill}
            className="p-1 rounded bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all flex-1 flex justify-center" title="صورتحساب">
            <FileText size={13} />
          </button>
          {Number(product.remaining_amount) > 0 && (
            <button onClick={onPay}
              className="p-1 rounded bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all flex-1 flex justify-center" title="پرداخت">
              <HandCoins size={13} />
            </button>
          )}
          <button onClick={onCalc}
            className="p-1 rounded bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all flex-1 flex justify-center" title="محاسبه">
            <Calculator size={13} />
          </button>
          <button onClick={onEdit}
            className="p-1 rounded bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all flex-1 flex justify-center" title="ویرایش">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete}
            className="p-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all flex-1 flex justify-center" title="حذف">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PRODUCT DETAILS MODAL (Simplified)
   ============================================================ */
function ProductDetailsModal({ product, onClose, onPay, onCalc, onBill, onRestock, onEdit }) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden my-8">

        <div className="bg-slate-800 p-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Package size={20} /> جزئیات محصول
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <RestockHistoryTable product={product} />
          <PaymentHistoryTable product={product} />
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button onClick={onRestock} className="flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs transition-colors">
            <PackagePlus size={14} /> افزایش موجودی
          </button>
          <button onClick={onBill} className="flex items-center justify-center gap-1 bg-white border border-gray-200 hover:bg-slate-50 text-slate-700 font-bold py-2 rounded-lg text-xs transition-colors">
            <FileText size={14} /> صورتحساب
          </button>
          <button onClick={onCalc} className="flex items-center justify-center gap-1 bg-white border border-gray-200 hover:bg-slate-50 text-slate-700 font-bold py-2 rounded-lg text-xs transition-colors">
            <Calculator size={14} /> محاسبه
          </button>
          {Number(product.remaining_amount) > 0 ? (
            <button onClick={onPay} className="flex items-center justify-center gap-1 bg-white border border-gray-200 hover:bg-amber-50 text-amber-700 font-bold py-2 rounded-lg text-xs transition-colors">
              <HandCoins size={14} /> پرداخت
            </button>
          ) : <div className="hidden sm:block" />}
          <button onClick={onEdit} className="flex items-center justify-center gap-1 bg-white border border-gray-200 hover:bg-slate-50 text-slate-700 font-bold py-2 rounded-lg text-xs transition-colors">
            <Pencil size={14} /> ویرایش
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   RESTOCK HISTORY TABLE
   ============================================================ */
function RestockHistoryTable({ product }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.get(`/products/${product.id}/restocks`)
      .then(r => mounted && setData(r.data))
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [product.id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 p-4">
        <Loader2 size={14} className="animate-spin" /> در حال بارگذاری سوابق...
      </div>
    );
  }
  if (!data) return null;

  const records = data.records || [];

  const unitPrice = Number(product.price) || 1;
  const totalAfn = Number(product.final_price_afn) || 0;
  
  const billableUnits = Math.round(totalAfn / unitPrice);
  
  let baseQty = billableUnits;
  if (product.price_mode === 'sub_module') {
    const cansPerCarton = Math.max(1, parseInt(product.sub_module_qty, 10) || 1);
    baseQty = Math.round(billableUnits / cansPerCarton);
  } else if (product.price_mode === 'sub_sub_module') {
    const cansPerCarton = Math.max(1, parseInt(product.sub_module_qty, 10) || 1);
    const piecesPerCan = Math.max(1, parseInt(product.sub_sub_module_qty, 10) || 1);
    baseQty = Math.round(billableUnits / (cansPerCarton * piecesPerCan));
  }

  const baseCalc = computeFinalPrice(product, baseQty);

  const rows = [
    {
      key: 'base',
      badge: 'اولیه',
      date: product.stock_entry_date || product.created_at,
      qtyModule: baseCalc.totalCartons,
      qtySub: baseCalc.totalCans,
      qtySubSub: baseCalc.totalPieces,
      unitPrice: product.price,
      currency: product.currency,
      priceMode: product.price_mode,
      payment: product.payment_type,
      totalAfn: product.final_price_afn,
      paidAfn: product.paid_amount_afn,
      remAfn: product.remaining_amount_afn,
      note: null,
    },
    ...records.map(r => ({
      key: `r-${r.id}`,
      badge: 'افزایش',
      date: r.stock_entry_date || r.created_at,
      qtyModule: r.add_module_qty,
      qtySub: r.add_sub_module_qty,
      qtySubSub: r.add_sub_sub_module_qty,
      unitPrice: r.price,
      currency: r.currency,
      priceMode: r.price_mode,
      payment: r.payment_type,
      totalAfn: r.total_price_afn,
      paidAfn: r.paid_amount_afn,
      remAfn: r.remaining_amount_afn,
      note: r.note,
    })),
  ];

  const unitPrices = rows.map(r => Number(r.unitPrice) || 0);
  const allSame = unitPrices.every(p => p === unitPrices[0]);

  const paymentLabel = t => t === 'cash' ? 'نقد' : t === 'loan_full' ? 'قرض کامل' : 'قرض جزئی';
  const modeLabel = r =>
    r.priceMode === 'module' ? `هر ${product.module_name}`
    : r.priceMode === 'sub_module' ? `هر ${product.sub_module_name}`
    : `هر ${product.sub_sub_module_name}`;

  const formatDate = d => {
    if (!d) return '—';
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    return toAfghanDate(d);
  };

  const sum = arr => arr.reduce((s, r) => s + (Number(r.qtyModule) || 0), 0);
  const sumSub = arr => arr.reduce((s, r) => s + (Number(r.qtySub) || 0), 0);
  const sumSubSub = arr => arr.reduce((s, r) => s + (Number(r.qtySubSub) || 0), 0);
  
  const sumTotalAfn = arr => arr.reduce((s, r) => s + (Number(r.totalAfn) || 0), 0);
  const sumPaidAfn = arr => arr.reduce((s, r) => s + (Number(r.paidAfn) || 0), 0);
  const sumRemAfn = arr => arr.reduce((s, r) => s + (Number(r.remAfn) || 0), 0);

  return (
    <div className="space-y-2">
      {allSame ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs">
          <span className="text-gray-500 font-bold">قیمت واحد همه بسته‌ها: </span>
          <b className="text-slate-800">{Number(unitPrices[0]).toLocaleString()} {rows[0]?.currency}</b>
          <span className="text-gray-400 mr-1">({modeLabel(rows[0])})</span>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 font-bold flex items-center gap-1">
          <Info size={12} /> قیمت‌ها در بسته‌های مختلف متفاوت است — در جدول زیر مشاهده کنید
        </div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full table-auto text-xs text-center min-w-[900px]">
          <thead className="bg-slate-50 border-b border-gray-200">
            <tr>
              <th className="px-2 py-2 font-bold text-gray-600">#</th>
              <th className="px-2 py-2 font-bold text-gray-600">نوع</th>
              <th className="px-2 py-2 font-bold text-gray-600">تاریخ</th>
              <th className="px-2 py-2 font-bold text-gray-600">{product.module_name}</th>
              {product.sub_module_name && <th className="px-2 py-2 font-bold text-gray-600">{product.sub_module_name}</th>}
              {product.sub_sub_module_name && <th className="px-2 py-2 font-bold text-gray-600">{product.sub_sub_module_name}</th>}
              <th className="px-2 py-2 font-bold text-gray-600">قیمت واحد</th>
              <th className="px-2 py-2 font-bold text-gray-600">مبلغ کل</th>
              <th className="px-2 py-2 font-bold text-gray-600">پرداخت</th>
              <th className="px-2 py-2 font-bold text-gray-600">وضعیت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r, idx) => (
              <tr key={r.key} className={r.badge === 'اولیه' ? 'bg-slate-50/40' : ''}>
                <td className="px-2 py-2 font-bold text-gray-700">{idx}</td>
                <td className="px-2 py-2">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    r.badge === 'اولیه' ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>{r.badge}</span>
                </td>
                <td className="px-2 py-2 font-mono text-[10px] text-gray-700" dir="ltr">{formatDate(r.date)}</td>
                <td className="px-2 py-2 font-bold text-blue-800">{Number(r.qtyModule).toLocaleString()}</td>
                {product.sub_module_name && <td className="px-2 py-2 font-bold text-cyan-800">{Number(r.qtySub).toLocaleString()}</td>}
                {product.sub_sub_module_name && <td className="px-2 py-2 font-bold text-emerald-800">{Number(r.qtySubSub).toLocaleString()}</td>}
                <td className="px-2 py-2 font-bold text-gray-800" dir="ltr">
                  {Number(r.unitPrice).toLocaleString()} {r.currency}
                  <div className="text-[9px] text-gray-400 font-normal">{modeLabel(r)}</div>
                </td>
                <td className="px-2 py-2 font-bold text-slate-800" dir="ltr">{Number(r.totalAfn).toLocaleString()} AFN</td>
                <td className="px-2 py-2 font-bold text-emerald-700" dir="ltr">{Number(r.paidAfn).toLocaleString()} AFN</td>
                <td className="px-2 py-2">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    r.payment === 'cash'        ? 'bg-emerald-100 text-emerald-700'
                    : r.payment === 'loan_full' ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-700'
                  }`}>{paymentLabel(r.payment)}</span>
                  {r.remAfn > 0 && (
                    <div className="text-[9px] text-rose-600 font-bold mt-0.5" dir="ltr">
                      {Number(r.remAfn).toLocaleString()} AFN
                    </div>
                  )}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-bold">
              <td className="px-2 py-2" colSpan={3}>جمع کل</td>
              <td className="px-2 py-2 text-blue-800">{sum(rows).toLocaleString()}</td>
              {product.sub_module_name && <td className="px-2 py-2 text-cyan-800">{sumSub(rows).toLocaleString()}</td>}
              {product.sub_sub_module_name && <td className="px-2 py-2 text-emerald-800">{sumSubSub(rows).toLocaleString()}</td>}
              <td className="px-2 py-2"></td>
              <td className="px-2 py-2 text-slate-800" dir="ltr">{sumTotalAfn(rows).toLocaleString()} AFN</td>
              <td className="px-2 py-2 text-emerald-700" dir="ltr">{sumPaidAfn(rows).toLocaleString()} AFN</td>
              <td className="px-2 py-2">
                {sumRemAfn(rows) > 0 && (
                  <div className="text-[9px] text-rose-600 font-bold mt-0.5" dir="ltr">
                    {sumRemAfn(rows).toLocaleString()} AFN
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   PAYMENT HISTORY TABLE (BEAUTIFUL CHECK/RECEIPT)
   ============================================================ */
/* ============================================================
   PAYMENT HISTORY (BEAUTIFUL INDIVIDUAL CHECKS)
   ============================================================ */
function PaymentHistoryTable({ product }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/products/${product.id}/payments`)
      .then(res => setPayments(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [product.id]);

  if (loading) return <div className="text-xs text-gray-500 p-2 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> در حال بارگذاری رسیدها...</div>;
  if (payments.length === 0) return null;

  // Sort oldest to newest to calculate remaining balance correctly per check
  const sortedPayments = [...payments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <HandCoins size={20} className="text-amber-600" />
        <h4 className="font-bold text-gray-800 text-sm">رسیدهای پرداخت قرضه</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedPayments.map((p, idx) => {
          // Calculate remaining after THIS specific payment
          const totalPaidSoFar = sortedPayments.slice(0, idx + 1).reduce((sum, pay) => sum + Number(pay.amount), 0);
          const initialTotal = Number(product.final_price_afn) || 0;
          const remainingAfter = Math.max(0, initialTotal - totalPaidSoFar);

          return (
            <div key={p.id} className="relative bg-white rounded-xl border-2 border-emerald-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              
              {/* Decorative Top Strip (Like a real check) */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 w-full" />
              
              <div className="p-4 space-y-3">
                {/* Header: Checkmark + Amount */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold">مبلغ پرداخت شده</p>
                      <p className="text-lg font-black text-emerald-700" dir="ltr">
                        {Number(p.amount).toLocaleString()} <span className="text-xs">AFN</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="bg-gray-50 rounded-lg p-2.5 space-y-2 text-xs border border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-bold flex items-center gap-1"><Calendar size={12} /> تاریخ:</span>
                    <span className="font-mono font-bold text-gray-800">{p.payment_date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-bold flex items-center gap-1"><Package size={12} /> محصول:</span>
                    <span className="font-bold text-gray-800 truncate max-w-[120px]">{product.name}</span>
                  </div>
                </div>

                {/* Remaining Balance Badge */}
                <div className="pt-2 border-t border-dashed border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 font-bold">باقی‌مانده بعد از این پرداخت:</span>
                    {remainingAfter > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-100">
                        <Clock size={10} /> {remainingAfter.toLocaleString()} AFN
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                        <CheckCircle2 size={10} /> تصفیه شد
                      </span>
                    )}
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
/* ============================================================
   RESTOCK MODAL (AUTO-CALCULATES SUB UNITS)
   ============================================================ */
function RestockModal({ product, onClose, onSaved }) {
  const cansPerCarton = Math.max(1, parseInt(product.sub_module_qty, 10) || 1);
  const piecesPerCan = Math.max(1, parseInt(product.sub_sub_module_qty, 10) || 1);

  const [form, setForm] = useState({
    add_module_qty: 1,
    add_sub_module_qty: product.sub_module_name ? cansPerCarton : 0,
    add_sub_sub_module_qty: product.sub_sub_module_name ? (cansPerCarton * piecesPerCan) : 0,
    price: product.price || '',
    expenses: '',
    price_mode: product.price_mode || 'module',
    currency: product.currency || 'AFN',
    exchange_rate: product.exchange_rate || '',
    payment_type: 'cash',
    paid_amount: '',
    assigned_loan_return_date: '',
    stock_entry_date: getTodayPersian(),
    production_date: '',
    expiry_date: '',
    note: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleModuleChange = (val) => {
    const num = parseInt(val, 10) || 0;
    setForm(f => ({
      ...f,
      add_module_qty: val,
      add_sub_module_qty: product.sub_module_name ? (num * cansPerCarton) : 0,
      add_sub_sub_module_qty: product.sub_sub_module_name ? (num * cansPerCarton * piecesPerCan) : 0
    }));
  };

  const handleSubModuleChange = (val) => {
    const num = parseInt(val, 10) || 0;
    setForm(f => ({
      ...f,
      add_sub_module_qty: val,
      add_sub_sub_module_qty: product.sub_sub_module_name ? (num * piecesPerCan) : 0
    }));
  };

  const previewCalc = computePurchaseTotal(
    {
      price_mode: form.price_mode,
      price: form.price,
      expenses: form.expenses,
      sub_module_qty: product.sub_module_qty,
      sub_sub_module_qty: product.sub_sub_module_qty,
      module_name: product.module_name,
      sub_module_name: product.sub_module_name,
      sub_sub_module_name: product.sub_sub_module_name,
    },
    form.add_module_qty
  );
  const conv = convertCurrency(previewCalc.finalPrice, form.currency, form.exchange_rate || 1);
  const previewPaid =
    form.payment_type === 'cash'        ? previewCalc.finalPrice
    : form.payment_type === 'loan_full' ? 0
    : Math.min(Number(form.paid_amount) || 0, previewCalc.finalPrice);
  const previewRem = Math.max(0, previewCalc.finalPrice - previewPaid);
  const paidConv = convertCurrency(previewPaid, form.currency, form.exchange_rate || 1);
  const remConv  = convertCurrency(previewRem,  form.currency, form.exchange_rate || 1);

  const submit = async () => {
    if ((Number(form.add_module_qty) || 0) + (Number(form.add_sub_module_qty) || 0) + (Number(form.add_sub_sub_module_qty) || 0) === 0) {
      setError('حداقل یک مقدار باید وارد شود');
      return;
    }
    setLoading(true); setError('');
    try {
      const payload = {
        add_module_qty: Number(form.add_module_qty) || 0,
        add_sub_module_qty: Number(form.add_sub_module_qty) || 0,
        add_sub_sub_module_qty: Number(form.add_sub_sub_module_qty) || 0,
        price: form.price,
        expenses: Number(form.expenses) || 0,
        price_mode: form.price_mode,
        currency: form.currency,
        exchange_rate: form.exchange_rate,
        payment_type: form.payment_type,
        stock_entry_date: form.stock_entry_date,
        note: form.note || null,
      };
      if (form.payment_type === 'loan_partial') payload.paid_amount = form.paid_amount || 0;
      if (form.payment_type !== 'cash' && form.assigned_loan_return_date) payload.assigned_loan_return_date = form.assigned_loan_return_date;

      if (form.production_date) payload.production_date = form.production_date;
      if (form.expiry_date)     payload.expiry_date     = form.expiry_date;

      const { data } = await api.post(`/products/${product.id}/restock`, payload);
      onSaved(data);
    } catch (err) {
      if (err.response?.status === 422) {
        const first = Object.values(err.response.data.errors || {})[0]?.[0];
        setError(first || err.response.data.message || 'خطا در ثبت افزایش موجودی');
      } else setError(err.response?.data?.message || 'خطا در ثبت');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-8">
        <div className="bg-emerald-600 p-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <PackagePlus size={20} /> افزایش موجودی
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
            <p className="font-bold text-emerald-900 text-sm">{product.name}</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              موجودی فعلی: {Number(product.current_stock?.module_stock || 0).toLocaleString()} {product.module_name}
              {product.sub_module_name && ` · ${Number(product.current_stock?.sub_module_stock || 0).toLocaleString()} ${product.sub_module_name}`}
            </p>
          </div>

          {/* quantities */}
          <div className={`grid gap-2 ${product.sub_module_name && product.sub_sub_module_name ? 'grid-cols-3' : product.sub_module_name ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <FormField label={product.module_name || 'واحد اصلی'}>
              <input className="form-input" type="number" min="0" value={form.add_module_qty}
                onChange={e => handleModuleChange(e.target.value)} dir="ltr" />
            </FormField>
            {product.sub_module_name && (
              <FormField label={product.sub_module_name}>
                <input className="form-input" type="number" min="0" value={form.add_sub_module_qty}
                  onChange={e => handleSubModuleChange(e.target.value)} dir="ltr" />
              </FormField>
            )}
            {product.sub_sub_module_name && (
              <FormField label={product.sub_sub_module_name}>
                <input className="form-input" type="number" min="0" value={form.add_sub_sub_module_qty}
                  onChange={e => update('add_sub_sub_module_qty', e.target.value)} dir="ltr" />
              </FormField>
            )}
          </div>

          {/* price */}
          <div className="grid grid-cols-2 gap-2">
            <FormField label="قیمت این بسته" required>
              <input className="form-input" type="number" step="0.01" value={form.price}
                onChange={e => update('price', e.target.value)} dir="ltr" />
            </FormField>
            <FormField label="روش قیمت‌گذاری" required>
              <select className="form-input" value={form.price_mode}
                onChange={e => update('price_mode', e.target.value)}>
                <option value="module">هر {product.module_name}</option>
                {product.sub_module_name && <option value="sub_module">هر {product.sub_module_name}</option>}
                {product.sub_sub_module_name && <option value="sub_sub_module">هر {product.sub_sub_module_name}</option>}
              </select>
            </FormField>
          </div>

          <FormField label="مصارف">
            <input className="form-input" type="number" min="0" step="0.01" value={form.expenses}
              onChange={e => update('expenses', e.target.value)} dir="ltr" placeholder="0" />
          </FormField>

          <div className="grid grid-cols-2 gap-2">
            <FormField label="ارز" required>
              <select className="form-input" value={form.currency}
                onChange={e => update('currency', e.target.value)}>
                <option value="AFN">افغانی</option>
                <option value="USD">دالر</option>
              </select>
            </FormField>
            <FormField label="نرخ تبادل" required>
              <input className="form-input" type="number" step="0.01" min="0.01"
                value={form.exchange_rate} onChange={e => update('exchange_rate', e.target.value)} dir="ltr" />
            </FormField>
          </div>

          {/* payment */}
          <FormField label="وضعیت پرداخت" required>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { v: 'cash',        label: 'نقد',       c: 'emerald' },
                { v: 'loan_full',   label: 'قرض کامل',  c: 'rose' },
                { v: 'loan_partial',label: 'قرض جزئی',  c: 'amber' },
              ].map(({ v, label, c }) => {
                const active = form.payment_type === v;
                const map = {
                  emerald: active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-600',
                  rose:    active ? 'border-rose-500 bg-rose-50 text-rose-700'          : 'border-gray-200 bg-white text-gray-600',
                  amber:   active ? 'border-amber-500 bg-amber-50 text-amber-700'       : 'border-gray-200 bg-white text-gray-600',
                };
                return (
                  <button type="button" key={v} onClick={() => update('payment_type', v)}
                    className={`py-2 rounded-lg border-2 font-bold text-[11px] transition-all ${map[c]}`}>
                    {label}
                  </button>
                );
              })}
            </div>
          </FormField>

          {form.payment_type === 'loan_partial' && (
            <FormField label={`مبلغ پرداخت‌شده (${form.currency})`} required>
              <input className="form-input" type="number" min="0" step="0.01"
                value={form.paid_amount} onChange={e => update('paid_amount', e.target.value)} dir="ltr" />
            </FormField>
          )}

          {form.payment_type !== 'cash' && (
            <FormField label="مدت زمان برگشت این قرض (اختیاری)">
              <PersianDatePicker
                value={form.assigned_loan_return_date || ''}
                onChange={v => update('assigned_loan_return_date', v)}
                placeholder="1405-05-05"
              />
            </FormField>
          )}

          {/* dates */}
          <FormField label="تاریخ ورود به گدام (شمسی)">
            <PersianDatePicker value={form.stock_entry_date} onChange={v => update('stock_entry_date', v)} />
          </FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="تاریخ تولید (میلادی)">
              <input type="date" className="form-input" dir="ltr"
                value={form.production_date} onChange={e => update('production_date', e.target.value)} />
            </FormField>
            <FormField label="تاریخ انقضا (میلادی)">
              <input type="date" className="form-input" dir="ltr"
                value={form.expiry_date} onChange={e => update('expiry_date', e.target.value)} />
            </FormField>
          </div>

          <FormField label="یادداشت">
            <input className="form-input" value={form.note}
              onChange={e => update('note', e.target.value)} placeholder="اختیاری" />
          </FormField>

          {/* preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
            <div className="font-bold text-slate-800 mb-1 flex items-center gap-1">
              <Calculator size={12} /> پیش‌نمایش این بسته
            </div>
            <Row label="مبلغ کل:" value={`${conv.afn.toLocaleString()} AFN / $ ${conv.usd.toLocaleString()}`} color="emerald" />
            <Row label="پرداخت‌شده:" value={`${paidConv.afn.toLocaleString()} AFN`} color="emerald" />
            <Row label="باقی‌مانده:" value={`${remConv.afn.toLocaleString()} AFN`} color="rose" />
          </div>

          {error && <ErrorLine>{error}</ErrorLine>}

          <div className="flex gap-2 pt-1">
            <button onClick={submit} disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-sm">
              {loading ? <><Loader2 size={16} className="animate-spin" /> در حال ثبت...</> : 'ثبت افزایش موجودی'}
            </button>
            <button onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm">
              انصراف
            </button>
          </div>
        </div>

        <style>{`
          .form-input {
            width: 100%;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 9px 12px;
            font-size: 13px;
            color: #1f2937;
            outline: none;
            transition: all 0.2s;
          }
          .form-input:focus {
            background: #ffffff;
            border-color: #059669;
            box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
          }
          .form-input::placeholder { color: #9ca3af; }
        `}</style>
      </div>
    </div>
  );
}

/* ============================================================
   BILL FORM — AUTO-CALCULATES SUB UNITS
   ============================================================ */
function BillForm({ editProduct, suppliers, onClose, onSaved }) {
  const isEdit = !!editProduct;

  const emptyForm = () => ({
    supplier_id: '',
    name: '',
    category: '',
    barcode: '',
    module_name: '',
    sub_module_name: '',
    sub_module_qty: '',
    sub_sub_module_name: '',
    sub_sub_module_qty: '',
    price_mode: 'module',
    price: '',
    expenses: '',
    currency: 'AFN',
    exchange_rate: '',
    stock_entry_date: getTodayPersian(),
    production_date: '',
    expiry_date: '',
    payment_type: 'cash',
    paid_amount: '',
    assigned_loan_return_date: '',
    low_stock_warning: '',
    low_stock_warning_mode: 'module',
    high_stock_warning: '',
    high_stock_warning_mode: 'module',
    
    sell_price_module: '',
    sell_price_sub_module: '',
    sell_price_sub_sub_module: '',
  });

  const [items, setItems] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [form, setForm] = useState(
    editProduct
      ? {
          supplier_id: editProduct.supplier_id || '',
          name: editProduct.name || '',
          category: editProduct.category || '',
          barcode: editProduct.barcode || '',
          module_name: editProduct.module_name || '',
          sub_module_name: editProduct.sub_module_name || '',
          sub_module_qty: editProduct.sub_module_qty || '',
          sub_sub_module_name: editProduct.sub_sub_module_name || '',
          sub_sub_module_qty: editProduct.sub_sub_module_qty || '',
          price_mode: editProduct.price_mode || 'module',
          price: editProduct.price || '',
          expenses: editProduct.expenses ?? '',
          currency: editProduct.currency || 'AFN',
          exchange_rate: editProduct.exchange_rate || '',
          stock_entry_date: editProduct.stock_entry_date || getTodayPersian(),
          production_date: persianToEnglishDate(editProduct.production_date) || '',
          expiry_date: persianToEnglishDate(editProduct.expiry_date) || '',
          payment_type: editProduct.payment_type || 'cash',
          paid_amount: editProduct.paid_amount || '',
          assigned_loan_return_date: editProduct.assigned_loan_return_date || '',
          low_stock_warning: editProduct.low_stock_warning || '',
          low_stock_warning_mode: editProduct.low_stock_warning_mode || 'module',
          high_stock_warning: editProduct.high_stock_warning || '',
          high_stock_warning_mode: editProduct.high_stock_warning_mode || 'module',
          
          sell_price_module: editProduct.sell_price_module || '',
          sell_price_sub_module: editProduct.sell_price_sub_module || '',
          sell_price_sub_sub_module: editProduct.sell_price_sub_sub_module || '',
        }
      : emptyForm()
  );
  const [cartonQty, setCartonQty] = useState(isEdit ? Math.max(1, Number(editProduct?.final_qty) || 1) : 1);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(editProduct?.photo_url || null);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [addingSupplier, setAddingSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ supplier_name: '', phone: '', email: '', address: '' });

  const [showSubUnit, setShowSubUnit] = useState(!!editProduct?.sub_module_name);
  const [showSubSubUnit, setShowSubSubUnit] = useState(!!editProduct?.sub_sub_module_name);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const update = (k, v) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === 'sub_module_name' && !v) {
        next.low_stock_warning_mode = 'module';
        next.high_stock_warning_mode = 'module';
      } else if (k === 'sub_sub_module_name' && !v) {
        if (next.low_stock_warning_mode === 'sub_sub_module') {
          next.low_stock_warning_mode = next.sub_module_name ? 'sub_module' : 'module';
        }
        if (next.high_stock_warning_mode === 'sub_sub_module') {
          next.high_stock_warning_mode = next.sub_module_name ? 'sub_module' : 'module';
        }
      }
      return next;
    });
    setErrors((e) => ({ ...e, [k]: null }));
  };
  const updateNewSupplier = (k, v) => { setNewSupplier((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [`supplier_${k}`]: null })); };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrors((err) => ({ ...err, photo: ['حجم تصویر باید کمتر از ۲ مگابایت باشد'] }));
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setErrors((err) => ({ ...err, photo: null }));
  };

  const removePhoto = () => { setPhoto(null); setPhotoPreview(null); };

  const validateDraft = () => {
    const e = {};
    if (!form.name.trim()) e.name = ['نام محصول الزامی است'];
    if (!form.module_name.trim()) e.module_name = ['نام واحد اصلی الزامی است'];
    if (form.price === '' || Number(form.price) < 0) e.price = ['قیمت الزامی است'];
    if (!form.exchange_rate || Number(form.exchange_rate) <= 0) e.exchange_rate = ['نرخ تبادل الزامی است'];
    if (form.payment_type === 'loan_partial' && (form.paid_amount === '' || Number(form.paid_amount) < 0)) {
      e.paid_amount = ['مبلغ پرداخت‌شده الزامی است'];
    }
    return e;
  };

  const addDraftToItems = () => {
    const e = validateDraft();
    if (Object.keys(e).length) { setErrors(e); return false; }

    const localId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newItem = {
      localId,
      form: { ...form },
      cartonQty: Math.max(1, parseInt(cartonQty, 10) || 1),
      photo,
      photoPreview,
    };
    setItems((prev) => [...prev, newItem]);
    setCollapsed((c) => ({ ...c, [localId]: true }));

    setForm((f) => ({
      ...emptyForm(),
      supplier_id: f.supplier_id,
      currency: f.currency,
      exchange_rate: f.exchange_rate,
      stock_entry_date: f.stock_entry_date,
    }));
    setCartonQty(1);
    setPhoto(null);
    setPhotoPreview(null);
    setShowSubUnit(false);
    setShowSubSubUnit(false);
    setErrors({});
    return true;
  };

  const removeItem = (localId) => {
    setItems((prev) => prev.filter((it) => it.localId !== localId));
  };

  const toggleCollapse = (localId) => {
    setCollapsed((c) => ({ ...c, [localId]: !c[localId] }));
  };

  const buildPayload = (sourceForm) => {
    return { ...sourceForm };
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (isEdit) {
      const draftErrors = validateDraft();
      if (Object.keys(draftErrors).length) { setErrors(draftErrors); return; }

      setLoading(true);

      let supplierId = form.supplier_id;
      if (addingSupplier) {
        if (!newSupplier.supplier_name.trim()) {
          setErrors({ supplier_supplier_name: ['نام تامین‌کننده الزامی است'] });
          setLoading(false);
          return;
        }
        try {
          const payload = { supplier_name: newSupplier.supplier_name.trim() };
          if (newSupplier.phone.trim())   payload.phone   = newSupplier.phone.trim();
          if (newSupplier.email.trim())   payload.email   = newSupplier.email.trim();
          if (newSupplier.address.trim()) payload.address = newSupplier.address.trim();
          const { data: createdSupplier } = await api.post('/suppliers', payload);
          supplierId = createdSupplier.id;
        } catch (err) {
          setErrors({ supplier_supplier_name: [err.response?.data?.message || 'خطا در ایجاد تامین‌کننده'] });
          setLoading(false);
          return;
        }
      }

      const persisted = buildPayload(form);
      const fd = new FormData();
      fd.append('_method', 'PUT');
      Object.entries({ ...persisted, supplier_id: supplierId }).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) fd.append(k, v);
      });
      if (!form.sub_module_name) { fd.delete('sub_module_name'); fd.delete('sub_module_qty'); }
      if (!form.sub_sub_module_name) { fd.delete('sub_sub_module_name'); fd.delete('sub_sub_module_qty'); }
      fd.append('qty', Math.max(1, parseInt(cartonQty, 10) || 1));
      if (photo) fd.append('photo', photo);

      try {
        const { data } = await api.post(`/products/${editProduct.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        onSaved(data);
      } catch (err) {
        if (err.response?.status === 422) setErrors(err.response.data.errors || {});
        else alert(err.response?.data?.message || 'خطا');
      } finally { setLoading(false); }
      return;
    }

    let finalItems = [...items];
    const draftValid = Object.keys(validateDraft()).length === 0;
    if (draftValid && form.name && form.module_name && form.price) {
      const localId = `item-${Date.now()}`;
      finalItems.push({
        localId,
        form: { ...form },
        cartonQty: Math.max(1, parseInt(cartonQty, 10) || 1),
        photo,
        photoPreview,
      });
    }

    if (finalItems.length === 0) {
      setErrors({ _global: ['حداقل یک محصول باید اضافه شود'] });
      return;
    }

    setLoading(true);

    let supplierId = finalItems[0]?.form?.supplier_id || form.supplier_id || '';
    if (addingSupplier && newSupplier.supplier_name.trim()) {
      try {
        const payload = { supplier_name: newSupplier.supplier_name.trim() };
        if (newSupplier.phone.trim())   payload.phone   = newSupplier.phone.trim();
        if (newSupplier.email.trim())   payload.email   = newSupplier.email.trim();
        if (newSupplier.address.trim()) payload.address = newSupplier.address.trim();
        const { data: createdSupplier } = await api.post('/suppliers', payload);
        supplierId = createdSupplier.id;
      } catch (err) {
        setErrors({ supplier_supplier_name: [err.response?.data?.message || 'خطا در ایجاد تامین‌کننده'] });
        setLoading(false);
        return;
      }
    }

    try {
      for (const it of finalItems) {
        const persisted = buildPayload(it.form);
        const fd = new FormData();
        Object.entries({ ...persisted, supplier_id: supplierId }).forEach(([k, v]) => {
          if (v !== '' && v !== null && v !== undefined) fd.append(k, v);
        });
        if (!it.form.sub_module_name) { fd.delete('sub_module_name'); fd.delete('sub_module_qty'); }
        if (!it.form.sub_sub_module_name) { fd.delete('sub_sub_module_name'); fd.delete('sub_sub_module_qty'); }
        fd.append('qty', it.cartonQty);
        if (it.photo) fd.append('photo', it.photo);

        await api.post('/products', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      onSaved();
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
      else alert(err.response?.data?.message || 'خطا در ثبت محصول');
    } finally {
      setLoading(false);
    }
  };

  const previewCalc = computePurchaseTotal(
    {
      price_mode: form.price_mode,
      price: form.price,
      expenses: form.expenses,
      sub_module_qty: form.sub_module_qty,
      sub_sub_module_qty: form.sub_sub_module_qty,
      module_name: form.module_name,
      sub_module_name: form.sub_module_name,
      sub_sub_module_name: form.sub_sub_module_name,
    },
    cartonQty
  );
  const previewFinal = previewCalc.finalPrice;
  const previewPaid =
    form.payment_type === 'cash'        ? previewFinal
    : form.payment_type === 'loan_full' ? 0
    : Math.min(Number(form.paid_amount) || 0, previewFinal);
  const previewRemaining = Math.max(0, previewFinal - previewPaid);

  const previewConv  = convertCurrency(previewFinal,     form.currency, form.exchange_rate || 1);
  const previewPaidC = convertCurrency(previewPaid,      form.currency, form.exchange_rate || 1);
  const previewRemC  = convertCurrency(previewRemaining, form.currency, form.exchange_rate || 1);

  const totalItems = items.length;
  const totalAmount = items.reduce((sum, it) => {
    const c = computePurchaseTotal(
      { ...it.form, price_mode: it.form.price_mode },
      it.cartonQty
    );
    return sum + c.finalPrice;
  }, 0);
  const currencyForTotal = items[0]?.form.currency || form.currency || 'AFN';
  const rateForTotal     = items[0]?.form.exchange_rate || form.exchange_rate || 1;
  const totalConv        = convertCurrency(totalAmount, currencyForTotal, rateForTotal);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">

        <div className="bg-slate-800 p-5 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShoppingCart size={22} />
            {isEdit ? 'ویرایش محصول' : 'فاکتور خرید جدید'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {!isEdit && totalItems > 0 && (
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-slate-800 text-white px-2.5 py-1 rounded-lg font-bold text-[11px]">
                <Receipt size={12} /> {totalItems} محصول
              </span>
              <span className="font-bold text-gray-700 text-xs">
                جمع: <span className="text-slate-800">{totalConv.afn.toLocaleString()} AFN</span>
                <span className="text-[10px] text-gray-500 mr-1.5">($ {totalConv.usd.toLocaleString()})</span>
              </span>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="p-5 space-y-4 overflow-y-auto flex-1">

          {!isEdit && items.length > 0 && (
            <div className="space-y-2">
              {items.map((it, idx) => {
                const c = computePurchaseTotal({ ...it.form, price_mode: it.form.price_mode }, it.cartonQty);
                const conv = convertCurrency(c.finalPrice, it.form.currency, it.form.exchange_rate || 1);
                const isCollapsed = collapsed[it.localId] !== false;
                return (
                  <div key={it.localId} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="w-6 h-6 rounded-lg bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        {it.photoPreview ? (
                          <img src={it.photoPreview} alt={it.form.name} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {it.form.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-800 text-xs truncate">{it.form.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">
                            {it.cartonQty} × {it.form.module_name}
                            <span className="text-gray-400 mx-1">·</span>
                            <span className="text-emerald-600 font-bold">{conv.afn.toLocaleString()} AFN</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => toggleCollapse(it.localId)}
                          className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">
                          {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        </button>
                        <button type="button" onClick={() => removeItem(it.localId)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="p-3 border-t border-gray-100 bg-white grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                        <InfoCell label="قیمت واحد" value={`${Number(it.form.price).toLocaleString()} ${it.form.currency}`} />
                        <InfoCell label="روش قیمت" value={
                          it.form.price_mode === 'module' ? `هر ${it.form.module_name}`
                          : it.form.price_mode === 'sub_module' ? `هر ${it.form.sub_module_name}`
                          : `هر ${it.form.sub_sub_module_name}`
                        } />
                        <InfoCell label="نرخ تبادل" value={it.form.exchange_rate} />
                        <InfoCell label="پرداخت" value={
                          it.form.payment_type === 'cash' ? 'نقد'
                          : it.form.payment_type === 'loan_full' ? 'قرض کامل'
                          : 'قرض جزئی'
                        } />
                        <InfoCell label="کل (AFN)" value={`${conv.afn.toLocaleString()} AFN`} highlight />
                        <InfoCell label="کل (USD)" value={`$ ${conv.usd.toLocaleString()}`} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center">
                <Plus size={15} />
              </div>
              <h4 className="font-bold text-gray-800 text-sm">
                {isEdit ? 'ویرایش اطلاعات' : items.length === 0 ? 'محصول' : `محصول ${items.length + 1}`}
              </h4>
            </div>

            {/* PHOTO + BASIC INFO */}
            <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  {photoPreview ? (
                    <img src={photoPreview} alt="preview" className="w-14 h-14 rounded-xl object-cover ring-2 ring-white shadow" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                      <ImageIcon size={20} />
                    </div>
                  )}
                  {photoPreview && (
                    <button type="button" onClick={removePhoto}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow">
                      <X size={10} />
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <label className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all text-xs">
                    <Upload size={12} />
                    {photoPreview ? 'تغییر تصویر' : 'انتخاب تصویر'}
                    <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                  </label>
                  <p className="text-[10px] text-gray-400 mt-1">JPG / PNG — حداکثر ۲ مگابایت</p>
                </div>
              </div>
              {errors.photo && <ErrorLine>{errors.photo[0]}</ErrorLine>}

              <FormField label="نام محصول" required error={errors.name?.[0]}>
                <input className="form-input" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="نام محصول" />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="دسته‌بندی" error={errors.category?.[0]}>
                  <input className="form-input" value={form.category} onChange={(e) => update('category', e.target.value)} placeholder="مواد غذایی" />
                </FormField>
                <FormField label="بارکد" error={errors.barcode?.[0]}>
                  <input className="form-input" value={form.barcode} onChange={(e) => update('barcode', e.target.value)} placeholder="1234567890" dir="ltr" />
                </FormField>
              </div>
            </div>

            {/* SUPPLIER */}
            <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
              <FormField label="تامین‌کننده (اختیاری)" error={errors.supplier_id?.[0]}>
                <div className="flex gap-2">
                  {!addingSupplier ? (
                    <select className="form-input" value={form.supplier_id} onChange={(e) => update('supplier_id', e.target.value)}>
                      <option value="">بدون تامین‌کننده</option>
                      {suppliers.map((s) => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
                    </select>
                  ) : (
                    <input className="form-input" placeholder="نام تامین‌کننده جدید"
                      value={newSupplier.supplier_name}
                      onChange={(e) => updateNewSupplier('supplier_name', e.target.value)} autoFocus />
                  )}
                  <button type="button"
                    onClick={() => {
                      setAddingSupplier(v => !v);
                      setNewSupplier({ supplier_name: '', phone: '', email: '', address: '' });
                    }}
                    className={`shrink-0 w-10 rounded-lg border-2 font-bold text-xs transition-all flex items-center justify-center ${
                      addingSupplier ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-slate-300 bg-slate-50 text-slate-700'
                    }`}>
                    {addingSupplier ? <X size={15} /> : <Plus size={15} />}
                  </button>
                </div>
              </FormField>

              {addingSupplier && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <p className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                    <Warehouse size={11} /> تامین‌کننده جدید
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField label="نام" required error={errors.supplier_supplier_name?.[0]}>
                      <input className="form-input" value={newSupplier.supplier_name}
                        onChange={(e) => updateNewSupplier('supplier_name', e.target.value)} placeholder="نام" />
                    </FormField>
                    <FormField label="تلفن" error={errors.supplier_phone?.[0]}>
                      <input className="form-input" dir="ltr" value={newSupplier.phone}
                        onChange={(e) => updateNewSupplier('phone', e.target.value)} placeholder="+93..." />
                    </FormField>
                  </div>
                </div>
              )}
            </div>

            {/* UNITS — COLLAPSIBLE */}
            <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Layers size={13} className="text-slate-600" /> واحدها
                </h5>
                <span className="text-[10px] text-gray-400">می‌توانید زیر واحدها را اضافه کنید</span>
              </div>

              <FormField label="واحد اصلی" required error={errors.module_name?.[0]}>
                <input className="form-input" placeholder="مثلاً: کارتن" value={form.module_name} onChange={(e) => update('module_name', e.target.value)} />
              </FormField>

              {!showSubUnit ? (
                <button type="button" onClick={() => setShowSubUnit(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300 text-gray-600 text-[11px] font-bold transition-colors">
                  <Plus size={12} /> افزودن زیر واحد
                </button>
              ) : (
                <div className="p-2.5 rounded-lg bg-cyan-50/60 border border-cyan-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-cyan-800 flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-cyan-600 text-white text-[9px] font-bold flex items-center justify-center">2</span>
                      زیر واحد
                    </span>
                    <button type="button" onClick={() => { setShowSubUnit(false); setShowSubSubUnit(false); update('sub_module_name', ''); update('sub_module_qty', ''); update('sub_sub_module_name', ''); update('sub_sub_module_qty', ''); setCartonQty(1); }}
                      className="p-1 rounded text-rose-500 hover:bg-rose-50">
                      <X size={12} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField label="نام">
                      <input className="form-input" placeholder="بوتل" value={form.sub_module_name} onChange={(e) => update('sub_module_name', e.target.value)} />
                    </FormField>
                    <FormField label="تعداد در واحد اصلی">
                      <input className="form-input" type="number" min="1" placeholder="20" value={form.sub_module_qty} onChange={(e) => update('sub_module_qty', e.target.value)} />
                    </FormField>
                  </div>

                  {!showSubSubUnit ? (
                    <button type="button" onClick={() => setShowSubSubUnit(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white hover:bg-gray-50 border border-dashed border-cyan-200 text-cyan-700 text-[10px] font-bold transition-colors">
                      <Plus size={11} /> افزودن زیر واحد دوم
                    </button>
                  ) : (
                    <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center">3</span>
                          زیر واحد دوم
                        </span>
                        <button type="button" onClick={() => { setShowSubSubUnit(false); update('sub_sub_module_name', ''); update('sub_sub_module_qty', ''); }}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50">
                          <X size={11} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField label="نام">
                          <input className="form-input" placeholder="قطعه" value={form.sub_sub_module_name} onChange={(e) => update('sub_sub_module_name', e.target.value)} />
                        </FormField>
                        <FormField label="تعداد">
                          <input className="form-input" type="number" min="1" placeholder="12" value={form.sub_sub_module_qty} onChange={(e) => update('sub_sub_module_qty', e.target.value)} />
                        </FormField>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PRICING */}
            <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
              <h5 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <DollarSign size={13} className="text-emerald-600" /> قیمت‌گذاری
              </h5>

              <FormField label="روش قیمت‌گذاری" error={errors.price_mode?.[0]}>
                <select className="form-input" value={form.price_mode} onChange={(e) => update('price_mode', e.target.value)}>
                  <option value="module">هر {form.module_name || 'واحد اصلی'}</option>
                  {form.sub_module_name && <option value="sub_module">هر {form.sub_module_name}</option>}
                  {form.sub_sub_module_name && <option value="sub_sub_module">هر {form.sub_sub_module_name}</option>}
                </select>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="قیمت" required error={errors.price?.[0]}>
                  <input className="form-input" type="number" step="0.01" value={form.price} onChange={(e) => update('price', e.target.value)} dir="ltr" />
                </FormField>
                <FormField label={`تعداد ${form.module_name || 'واحد'}`} error={errors.qty?.[0]}>
                  <input className="form-input" type="number" min="1" value={cartonQty} onChange={(e) => setCartonQty(e.target.value)} dir="ltr" />
                </FormField>
              </div>

              <FormField label="مصارف" error={errors.expenses?.[0]}>
                <input className="form-input" type="number" min="0" step="0.01" value={form.expenses}
                  onChange={(e) => update('expenses', e.target.value)} dir="ltr" placeholder="0" />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="ارز" required error={errors.currency?.[0]}>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { v: 'AFN', label: 'افغانی' },
                      { v: 'USD', label: 'دالر' },
                    ].map(({ v, label }) => {
                      const active = form.currency === v;
                      return (
                        <button type="button" key={v} onClick={() => update('currency', v)}
                          className={`py-2 rounded-lg border-2 font-bold text-xs transition-all ${
                            active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-600'
                          }`}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </FormField>
                <FormField label="نرخ تبادل (1 USD = ? AFN)" required error={errors.exchange_rate?.[0]}>
                  <input className="form-input" type="number" step="0.01" min="0.01" placeholder="64"
                    value={form.exchange_rate} onChange={(e) => update('exchange_rate', e.target.value)} dir="ltr" />
                </FormField>
              </div>
            </div>

            {/* SELLING PRICES */}
            <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3 mt-4">
              <h5 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Tag size={13} className="text-blue-600" /> قیمت‌های پیشنهادی فروش (اختیاری)
              </h5>
              <p className="text-[10px] text-gray-500">این قیمت‌ها به صورت خودکار در صفحه فروش پر می‌شوند.</p>

              <div className={`grid gap-2 ${form.sub_module_name && form.sub_sub_module_name ? 'grid-cols-3' : form.sub_module_name ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <FormField label={`هر ${form.module_name || 'واحد اصلی'}`}>
                  <input className="form-input" type="number" step="0.01" value={form.sell_price_module} onChange={(e) => update('sell_price_module', e.target.value)} dir="ltr" placeholder="مثلاً 1200" />
                </FormField>
                {form.sub_module_name && (
                  <FormField label={`هر ${form.sub_module_name}`}>
                    <input className="form-input" type="number" step="0.01" value={form.sell_price_sub_module} onChange={(e) => update('sell_price_sub_module', e.target.value)} dir="ltr" placeholder="مثلاً 50" />
                  </FormField>
                )}
                {form.sub_sub_module_name && (
                  <FormField label={`هر ${form.sub_sub_module_name}`}>
                    <input className="form-input" type="number" step="0.01" value={form.sell_price_sub_sub_module} onChange={(e) => update('sell_price_sub_sub_module', e.target.value)} dir="ltr" placeholder="مثلاً 5" />
                  </FormField>
                )}
              </div>
            </div>

            {/* PAYMENT */}
            <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
              <h5 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Wallet size={13} className="text-emerald-600" /> وضعیت پرداخت
              </h5>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { v: 'cash',         label: 'نقد',       icon: CheckCircle2, color: 'emerald' },
                  { v: 'loan_full',    label: 'قرض کامل',  icon: HandCoins,    color: 'rose' },
                  { v: 'loan_partial', label: 'قرض جزئی',  icon: Clock,        color: 'amber' },
                ].map(({ v, label, icon: Icon, color }) => {
                  const active = form.payment_type === v;
                  const map = {
                    emerald: active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-600',
                    rose:    active ? 'border-rose-500 bg-rose-50 text-rose-700'          : 'border-gray-200 bg-white text-gray-600',
                    amber:   active ? 'border-amber-500 bg-amber-50 text-amber-700'       : 'border-gray-200 bg-white text-gray-600',
                  };
                  return (
                    <button type="button" key={v} onClick={() => update('payment_type', v)}
                      className={`flex flex-col items-center gap-0.5 py-2 rounded-lg border-2 font-bold text-[11px] transition-all ${map[color]}`}>
                      <Icon size={13} />
                      {label}
                    </button>
                  );
                })}
              </div>
              {form.payment_type === 'loan_partial' && (
                <FormField label={`مبلغ پرداخت‌شده (${CURRENCY_LABEL[form.currency] || form.currency})`} required error={errors.paid_amount?.[0]}>
                  <input className="form-input" type="number" min="0" step="0.01" value={form.paid_amount}
                    onChange={(e) => update('paid_amount', e.target.value)} dir="ltr" placeholder="3000" />
                </FormField>
              )}
              {form.payment_type !== 'cash' && (
                <FormField label="مدت زمان برگشت این قرض (اختیاری)" error={errors.assigned_loan_return_date?.[0]}>
                  <PersianDatePicker
                    value={form.assigned_loan_return_date || ''}
                    onChange={(v) => update('assigned_loan_return_date', v)}
                    placeholder="1405-05-05"
                  />
                </FormField>
              )}
            </div>

            {/* DATES */}
            <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
              <h5 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-600" /> تاریخ‌ها
              </h5>
              <FormField label="تاریخ ورود به گدام (شمسی)">
                <PersianDatePicker value={form.stock_entry_date} onChange={(v) => update('stock_entry_date', v)} />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="تاریخ تولید (میلادی)">
                  <input
                    type="date"
                    className="form-input"
                    dir="ltr"
                    value={form.production_date}
                    onChange={(e) => update('production_date', e.target.value)}
                  />
                </FormField>
                <FormField label="تاریخ انقضا (میلادی)">
                  <input
                    type="date"
                    className="form-input"
                    dir="ltr"
                    value={form.expiry_date}
                    onChange={(e) => update('expiry_date', e.target.value)}
                  />
                </FormField>
              </div>
            </div>

            {/* ADVANCED — collapsible */}
            <div className="bg-white border border-gray-200 rounded-xl">
              <button type="button" onClick={() => setShowAdvanced(v => !v)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors rounded-xl">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Info size={13} className="text-amber-500" /> تنظیمات پیشرفته
                </span>
                {showAdvanced ? <ChevronUp size={15} className="text-gray-500" /> : <ChevronDown size={15} className="text-gray-500" />}
              </button>
              {showAdvanced && (
                <div className="p-3 pt-0 border-t border-gray-100 grid grid-cols-2 gap-3">
                  <FormField label="هشدار کمبود" error={errors.low_stock_warning?.[0]}>
                    <div className="space-y-1">
                      <input className="form-input" type="number" min="0" step="1" placeholder="مثلاً 50"
                        value={form.low_stock_warning} onChange={(e) => update('low_stock_warning', e.target.value)} dir="ltr" />
                      <select className="form-input" aria-label="واحد هشدار کمبود"
                        value={form.low_stock_warning_mode} onChange={(e) => update('low_stock_warning_mode', e.target.value)}>
                        <option value="module">{form.module_name || 'واحد اصلی'}</option>
                        {form.sub_module_name && <option value="sub_module">{form.sub_module_name}</option>}
                        {form.sub_sub_module_name && <option value="sub_sub_module">{form.sub_sub_module_name}</option>}
                      </select>
                    </div>
                  </FormField>
                  <FormField label="هشدار موجودی زیاد" error={errors.high_stock_warning?.[0]}>
                    <div className="space-y-1">
                      <input className="form-input" type="number" min="0" step="1" placeholder="مثلاً 1000"
                        value={form.high_stock_warning} onChange={(e) => update('high_stock_warning', e.target.value)} dir="ltr" />
                      <select className="form-input" aria-label="واحد هشدار موجودی زیاد"
                        value={form.high_stock_warning_mode} onChange={(e) => update('high_stock_warning_mode', e.target.value)}>
                        <option value="module">{form.module_name || 'واحد اصلی'}</option>
                        {form.sub_module_name && <option value="sub_module">{form.sub_module_name}</option>}
                        {form.sub_sub_module_name && <option value="sub_sub_module">{form.sub_sub_module_name}</option>}
                      </select>
                    </div>
                  </FormField>
                </div>
              )}
            </div>

            {form.price && form.module_name && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                <div className="font-bold text-slate-800 flex items-center gap-1 text-[11px] mb-1">
                  <Calculator size={12} /> پیش‌نمایش
                </div>
                <Row label="قیمت نهایی:" value={`${previewConv.afn.toLocaleString()} AFN / $ ${previewConv.usd.toLocaleString()}`} color="emerald" />
                <Row label="پرداخت‌شده:" value={`${previewPaidC.afn.toLocaleString()} AFN / $ ${previewPaidC.usd.toLocaleString()}`} color="emerald" />
                <Row label="باقی‌مانده:" value={`${previewRemC.afn.toLocaleString()} AFN / $ ${previewRemC.usd.toLocaleString()}`} color="rose" />
              </div>
            )}

            {errors._global && <ErrorLine>{errors._global[0]}</ErrorLine>}

            {!isEdit && (
              <button
                type="button"
                onClick={addDraftToItems}
                className="w-full bg-white border-2 border-dashed border-slate-300 hover:border-slate-500 hover:bg-slate-50 text-slate-700 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
              >
                <Plus size={14} /> افزودن به فاکتور
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-gray-100 sticky bottom-0 bg-white">
            <button type="submit" disabled={loading}
              className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-sm">
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> در حال ذخیره...</>
              ) : isEdit ? 'ذخیره تغییرات' : `ثبت فاکتور (${totalItems} محصول)`}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors text-sm">
              انصراف
            </button>
          </div>
        </form>

        <style>{`
          .form-input {
            width: 100%;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 9px 12px;
            font-size: 13px;
            color: #1f2937;
            outline: none;
            transition: all 0.2s;
          }
          .form-input:focus {
            background: #ffffff;
            border-color: #475569;
            box-shadow: 0 0 0 3px rgba(71, 85, 105, 0.1);
          }
          .form-input::placeholder { color: #9ca3af; }
        `}</style>
      </div>
    </div>
  );
}

/* ============================================================
   BILL VIEW MODAL
   ============================================================ */
function BillViewModal({ bill, onClose }) {
  const products = bill?.products || [];

  const totalAfn = products.reduce((s, p) => s + Number(p.final_price_afn || 0), 0);
  const totalUsd = products.reduce((s, p) => s + Number(p.final_price_usd || 0), 0);
  const paidAfn  = products.reduce((s, p) => s + Number(p.paid_amount_afn || 0), 0);
  const paidUsd  = products.reduce((s, p) => s + Number(p.paid_amount_usd || 0), 0);
  const remAfn   = products.reduce((s, p) => s + Number(p.remaining_amount_afn || 0), 0);
  const remUsd   = products.reduce((s, p) => s + Number(p.remaining_amount_usd || 0), 0);

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden my-8">
        <div className="bg-slate-800 p-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText size={22} /> پیش‌نمایش فاکتور
          </h3>
          <div className="flex gap-2">
            <button onClick={onClose} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-bold text-sm">
              بستن
            </button>
          </div>
        </div>

        <div className="p-8 bg-gray-100 max-h-[85vh] overflow-y-auto">
          <div className="bg-white p-10 mx-auto shadow-sm" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Tahoma, Arial, sans-serif', direction: 'rtl', color: '#000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #1e293b', paddingBottom: '20px', marginBottom: '30px' }}>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>نام شرکت شما</h1>
              </div>
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 5px 0' }}>فاکتور خرید</h2>
                <p style={{ fontSize: '13px', margin: '2px 0' }}>شماره: <b>{bill?.bill_number || '—'}</b></p>
                <p style={{ fontSize: '13px', margin: '2px 0' }}>تاریخ: <b>{bill?.created_at ? toAfghanDate(bill.created_at) : '—'}</b></p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
              <div style={{ width: '45%' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 5px 0', color: '#1e293b' }}>اطلاعات تامین‌کننده:</p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>نام: <b>{products[0]?.supplier?.supplier_name || '—'}</b></p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>تلفن: {products[0]?.supplier?.phone || '—'}</p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>آدرس: {products[0]?.supplier?.address || '—'}</p>
              </div>
              <div style={{ width: '45%' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 5px 0', color: '#1e293b' }}>اطلاعات محصولات:</p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>تعداد کل اقلام: <b>{products.length} محصول</b></p>
              </div>
            </div>

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
                {products.map((p, idx) => (
                  <tr key={p.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', borderRight: '1px solid #e2e8f0' }}>{idx + 1}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', borderRight: '1px solid #e2e8f0' }}>
                      <b>{p.name}</b><br/>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>1 {p.module_name} = {p.sub_module_qty} {p.sub_module_name}</span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', borderRight: '1px solid #e2e8f0' }}>{p.final_qty} {p.module_name}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', borderRight: '1px solid #e2e8f0' }}>{Number(p.price).toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold' }}>{Number(p.final_price_afn).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

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
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   BILLS LIST MODAL
   ============================================================ */
function BillsListModal({ bills, onClose, onView, openingBillId }) {
  const groupedBills = bills.reduce((acc, bill) => {
    const key = (bill.product_ids || []).sort((a,b) => a-b).join(',');
    if (!acc[key]) {
      acc[key] = {
        product_ids: bill.product_ids,
        bill_group: [],
      };
    }
    acc[key].bill_group.push(bill);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-8">
        <div className="bg-slate-800 p-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Receipt size={22} /> همه فاکتورهای خرید
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-3">
          {Object.keys(groupedBills).length === 0 ? (
            <div className="text-center py-12 text-gray-400">فاکتوری یافت نشد</div>
          ) : (
            Object.values(groupedBills).map((group) => {
              const firstBill = group.bill_group[0];
              const count = group.product_ids?.length || 0;

              return (
                <div key={group.product_ids?.join('-')} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors bg-white shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {count} محصول
                        </span>
                        {group.bill_group.length > 1 && (
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {group.bill_group.length} فاکتور
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-gray-800 truncate">
                        {firstBill.supplier_name ? `تامین‌کننده: ${firstBill.supplier_name}` : 'بدون تامین‌کننده'}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        تاریخ ثبت: {toAfghanDate(firstBill.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                      {group.bill_group.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => onView(b)}
                          disabled={openingBillId !== null}
                          className="flex items-center justify-between gap-3 bg-gray-50 hover:bg-slate-50 border border-gray-200 hover:border-slate-200 px-3 py-2 rounded-lg transition-all group"
                        >
                          <span className="font-mono text-xs font-bold text-gray-600 group-hover:text-slate-800">
                            {b.bill_number}
                          </span>
                          <span className="text-[10px] text-slate-600 font-bold flex items-center gap-1 opacity-70 group-hover:opacity-100">
                            {openingBillId === b.id
                              ? <>در حال بارگذاری <Loader2 size={12} className="animate-spin" /></>
                              : <>مشاهده <ChevronLeft size={12} /></>}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors">
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SCANNED PRODUCT MODAL
   ============================================================ */
function ScannedProductModal({ product, onClose, onPay, onCalc, onBill, onRestock }) {
  const meta      = PAYMENT_META[product.payment_type] || PAYMENT_META.cash;
  const stock     = getStock(product);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-8">
        <div className="bg-emerald-600 p-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 size={22} /> محصول یافت شد
            </h3>
            <p className="text-xs text-emerald-100 mt-1 font-mono">بارکد: {product.barcode || '—'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
            {product.photo_url ? (
              <img src={product.photo_url} alt={product.name} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-lg shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold text-2xl shrink-0">
                {product.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-gray-800 text-lg truncate">{product.name}</h4>
              {product.category && (
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-xs font-bold mt-1">
                  <Tag size={11} /> {product.category}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-center">
              <p className="text-[10px] text-blue-600 font-bold mb-1">{product.module_name}</p>
              <p className="text-xl font-black text-blue-800">{stock.cartons.total}</p>
            </div>
            {product.sub_module_name && (
              <div className="bg-cyan-50 rounded-xl p-3 border border-cyan-100 text-center">
                <p className="text-[10px] text-cyan-600 font-bold mb-1">{product.sub_module_name}</p>
                <p className="text-xl font-black text-cyan-800">{stock.cans.total}</p>
              </div>
            )}
            {product.sub_sub_module_name && (
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-center">
                <p className="text-[10px] text-emerald-600 font-bold mb-1">{product.sub_sub_module_name}</p>
                <p className="text-xl font-black text-emerald-800">{stock.pieces.total}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => onRestock(product)}
              className="flex flex-col items-center gap-1 py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors">
              <PackagePlus size={16} /> افزایش
            </button>
            <button onClick={() => onBill(product)}
              className="flex flex-col items-center gap-1 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors">
              <FileText size={16} /> صورتحساب
            </button>
            <button onClick={() => onCalc(product)}
              className="flex flex-col items-center gap-1 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors">
              <Calculator size={16} /> محاسبه
            </button>
            <button onClick={() => onPay(product)} disabled={Number(product.remaining_amount) <= 0}
              className="flex flex-col items-center gap-1 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs transition-colors disabled:opacity-40">
              <HandCoins size={16} /> پرداخت
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="w-full bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold py-3 rounded-xl transition-colors">
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   BILL MODAL (single product bill view)
   ============================================================ */
function BillModal({ product, onClose }) {
  const pdfRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const finalConv = getBothCurrencies(product, 'final_price');
  const paidConv  = getBothCurrencies(product, 'paid_amount');
  const remConv   = getBothCurrencies(product, 'remaining_amount');

  const billNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(product.id).padStart(4, '0')}`;
  const qty = Number(product.final_qty) || 0;

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setGenerating(true);
    try {
      await new Promise(r => setTimeout(r, 200));
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
        windowWidth: pdfRef.current.scrollWidth,
        windowHeight: pdfRef.current.scrollHeight,
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
      pdf.save(`invoice-${billNumber}.pdf`);
    } catch (e) {
      console.error(e);
      alert('خطا در ساخت PDF');
    } finally { setGenerating(false); }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden my-8">
        <div className="bg-slate-800 p-4 flex items-center justify-between print:hidden">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText size={22} /> پیش‌نمایش فاکتور
          </h3>
          <div className="flex gap-2">
            <button onClick={handleDownloadPdf} disabled={generating}
              className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} دانلود PDF
            </button>
            <button onClick={() => window.print()} className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
              <Printer size={16} /> چاپ
            </button>
            <button onClick={onClose} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-bold text-sm">بستن</button>
          </div>
        </div>

        <div className="p-8 bg-gray-100 max-h-[80vh] overflow-y-auto">
          <div ref={pdfRef} className="bg-white p-10 mx-auto shadow-sm" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Tahoma, Arial, sans-serif', direction: 'rtl', color: '#000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #1e293b', paddingBottom: '20px', marginBottom: '30px' }}>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>نام شرکت شما</h1>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '5px 0' }}>شعار شرکت</p>
                <p style={{ fontSize: '11px', color: '#475569', margin: 0 }}>آدرس خط 1، آدرس خط 2</p>
                <p style={{ fontSize: '11px', color: '#475569', margin: 0 }}>شماره تماس: 0700000000</p>
              </div>
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 5px 0' }}>فاکتور خرید</h2>
                <p style={{ fontSize: '13px', margin: '2px 0' }}>شماره: <b>{billNumber}</b></p>
                <p style={{ fontSize: '13px', margin: '2px 0' }}>تاریخ: <b>{toAfghanDate(new Date().toISOString())}</b></p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
              <div style={{ width: '45%' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 5px 0', color: '#1e293b' }}>اطلاعات تامین‌کننده:</p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>نام: <b>{product.supplier?.supplier_name || '—'}</b></p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>تلفن: {product.supplier?.phone || '—'}</p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>آدرس: {product.supplier?.address || '—'}</p>
              </div>
              <div style={{ width: '45%' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 5px 0', color: '#1e293b' }}>اطلاعات محصول:</p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>نام: <b>{product.name}</b></p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>بارکد: {product.barcode || '—'}</p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>دسته: {product.category || '—'}</p>
              </div>
            </div>

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
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', borderRight: '1px solid #e2e8f0' }}>1</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', borderRight: '1px solid #e2e8f0' }}>
                    <b>{product.name}</b><br/>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>1 {product.module_name} = {product.sub_module_qty} {product.sub_module_name}</span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', borderRight: '1px solid #e2e8f0' }}>{qty} {product.module_name}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', borderRight: '1px solid #e2e8f0' }}>{Number(product.price).toLocaleString()}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold' }}>{finalConv.afn.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
              <div style={{ width: '50%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px', fontSize: '13px', borderBottom: '1px solid #e2e8f0' }}>جمع کل (AFN):</td>
                      <td style={{ padding: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>{finalConv.afn.toLocaleString()} AFN</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px', fontSize: '13px', borderBottom: '1px solid #e2e8f0' }}>جمع کل (USD):</td>
                      <td style={{ padding: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>$ {finalConv.usd.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px', fontSize: '13px', borderBottom: '1px solid #e2e8f0', color: '#059669' }}>پرداخت شده:</td>
                      <td style={{ padding: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#059669' }}>{paidConv.afn.toLocaleString()} AFN</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px', fontSize: '13px', borderBottom: '1px solid #e2e8f0', color: remConv.afn > 0 ? '#dc2626' : '#64748b' }}>باقی‌مانده:</td>
                      <td style={{ padding: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: remConv.afn > 0 ? '#dc2626' : '#64748b' }}>{remConv.afn.toLocaleString()} AFN</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

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
   CALCULATOR MODAL
   ============================================================ */
function CalculatorModal({ product, onClose }) {
  const initialQty = Math.max(1, Number(product.final_qty) || 1);
  const [cartonQty, setCartonQty] = useState(initialQty);
  const [result, setResult] = useState(null);

  const calculate = () => setResult(computeFinalPrice(product, cartonQty));
  useEffect(() => { setResult(computeFinalPrice(product, initialQty)); }, [product]);

  const priceLabel =
    product.price_mode === 'module' ? `هر ${product.module_name}` :
    product.price_mode === 'sub_module' ? `هر ${product.sub_module_name}` :
    `هر ${product.sub_sub_module_name}`;

  const rate = Number(product.exchange_rate) || 1;
  const curr = String(product.currency || 'AFN').toUpperCase();
  const conv = result ? convertCurrency(result.finalPrice, curr, rate) : null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-800 p-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><Calculator size={22} /> محاسبه قیمت</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              {product.photo_url && <img src={product.photo_url} alt={product.name} className="w-12 h-12 rounded-xl object-cover ring-2 ring-white shadow" />}
              <p className="font-bold text-slate-800">{product.name}</p>
            </div>
            <div className="text-sm space-y-1 text-slate-700">
              <Row label="روش قیمت:" value={priceLabel} plain />
              <Row label="قیمت واحد:" value={`${Number(product.price).toLocaleString()} ${curr}`} plain />
              <Row label="نرخ تبادل:" value={`1 USD = ${rate} AFN`} plain />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">تعداد ({product.module_name})</label>
            <input type="number" min="1" value={cartonQty} onChange={(e) => setCartonQty(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:border-slate-500 focus:bg-white transition-all text-center font-bold text-lg" />
          </div>

          <button onClick={calculate}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
            <Calculator size={18} /> محاسبه کن
          </button>

          {result && conv && (
            <div className="bg-slate-800 rounded-2xl p-6 text-center text-white shadow-lg">
              <p className="text-sm text-slate-300 mb-1">قیمت نهایی</p>
              <p className="text-3xl font-black">{conv.afn.toLocaleString()} <span className="text-base">AFN</span></p>
              <p className="text-lg font-bold text-slate-300">$ {conv.usd.toLocaleString()} USD</p>
            </div>
          )}

          <button onClick={onClose} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors">بستن</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PAY MODAL (UPDATED WITH PERSIAN DATE)
   ============================================================ */
function PayModal({ product, onClose, onPaid }) {
  const remaining = Number(product.remaining_amount) || 0;
  const rate = Number(product.exchange_rate) || 1;
  const curr = String(product.currency || 'AFN').toUpperCase();
  const [amount, setAmount] = useState(remaining);
  const [paymentDate, setPaymentDate] = useState(getTodayPersian());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputConv = convertCurrency(Number(amount) || 0, curr, rate);

  const submit = async () => {
    const amt = Number(amount) || 0;
    if (amt <= 0) { setError('مبلغ باید بزرگ‌تر از صفر باشد'); return; }
    if (amt > remaining) { setError(`حداکثر ${remaining.toLocaleString()} است`); return; }
    setLoading(true); setError('');
    try {
      // ✅ Get the response from the backend
      const { data } = await api.post(`/products/${product.id}/pay`, { 
        amount: amt,
        payment_date: paymentDate 
      });
      
      // ✅ Pass the updated product to onPaid
      onPaid(data); 
    } catch (e) {
      setError(e.response?.data?.message || 'خطا در پرداخت');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-amber-600 p-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><HandCoins size={22} /> پرداخت به تامین‌کننده</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
            <p className="font-bold text-amber-900">{product.name}</p>
            <div className="text-sm space-y-1">
              <Row label="باقی‌مانده:" value={`${Number(product.remaining_amount_afn || 0).toLocaleString()} AFN`} color="rose" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">مبلغ پرداخت ({CURRENCY_LABEL[curr] || curr})</label>
            <input type="number" min="0" step="0.01" max={remaining} value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(''); }}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:border-amber-500 focus:bg-white transition-all text-center font-bold text-lg" dir="ltr" />
            <div className="mt-2 p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs">
              <Row label="معادل AFN:" value={`${inputConv.afn.toLocaleString()} AFN`} plain />
              <Row label="معادل USD:" value={`$ ${inputConv.usd.toLocaleString()}`} plain />
            </div>
          </div>

          <FormField label="تاریخ پرداخت (شمسی)" required>
            <PersianDatePicker 
              value={paymentDate} 
              onChange={(v) => setPaymentDate(v)} 
            />
          </FormField>

          {error && <ErrorLine>{error}</ErrorLine>}

          <div className="flex gap-3 pt-2">
            <button onClick={submit} disabled={loading}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              {loading ? <><Loader2 size={18} className="animate-spin" /> در حال ثبت...</> : 'ثبت پرداخت'}
            </button>
            <button onClick={onClose} className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors">انصراف</button>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ============================================================
   SMALL HELPERS
   ============================================================ */
function FormField({ label, required, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-gray-700">
        {label}
        {required && <span className="text-rose-500 mr-1">*</span>}
      </label>
      {children}
      {error && <ErrorLine>{error}</ErrorLine>}
    </div>
  );
}

function InfoCell({ label, value, highlight }) {
  return (
    <div className={`rounded-lg p-2 ${highlight ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'}`}>
      <p className="text-[9px] text-gray-500 font-bold mb-0.5">{label}</p>
      <p className={`text-xs font-bold ${highlight ? 'text-emerald-700' : 'text-gray-800'}`}>{value}</p>
    </div>
  );
}

function ErrorLine({ children }) {
  return (
    <p className="text-rose-500 text-xs font-medium flex items-center gap-1">
      <AlertCircle size={12} /> {children}
    </p>
  );
}

function Row({ label, value, color, plain }) {
  const colorMap = { emerald: 'text-emerald-700', rose: 'text-rose-700', amber: 'text-amber-700' };
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
      <b className={colorMap[color] || 'text-gray-800'}>{value}</b>
    </div>
  );
}