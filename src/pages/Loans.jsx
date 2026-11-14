import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Loader2, AlertCircle, HandCoins, Users, Truck,
  RefreshCw, Phone, Package, FileText, Calendar, DollarSign,
  TrendingUp, ChevronDown, ChevronUp, X, Wallet, Percent,
  Building2, User as UserIcon, Receipt, Eye, CheckCircle2, Clock,
  Download, Printer, ChevronLeft, ChevronRight
} from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import DashboardLayout from '../components/DashboardLayout';
import Toast from '../components/Toast';

// ============ AFGHAN DATE UTILS ============
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

// ============ OVERDUE HELPER (shared) ============
const isOverdueDate = (dateStr) => {
  if (!dateStr) return false;
  const today = getTodayPersian();
  const norm = String(dateStr).replace(/\//g, '-').trim();
  const [yy, mm, dd] = norm.split('-');
  if (!yy || !mm || !dd) return false;
  const padded = `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  return padded < today;
};

// ============ CURRENCY ============
const CURRENCY_LABEL = { AFN: 'افغانی', USD: 'دالر' };

// ============ PAYMENT META ============
const PAYMENT_LABEL = {
  cash: 'نقد',
  loan_full: 'قرض کامل',
  loan_partial: 'قرض جزئی',
};

const PAYMENT_COLOR = {
  cash: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  loan_full: 'bg-rose-50 text-rose-700 border-rose-200',
  loan_partial: 'bg-amber-50 text-amber-700 border-amber-200',
};

// ============ API (axios instance) ============
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
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
export default function Loans() {
  const [tab, setTab] = useState('customers');

  const [customerLoans, setCustomerLoans] = useState(null);
  const [supplierLoans, setSupplierLoans] = useState(null);
  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [payCustomer, setPayCustomer] = useState(null);
  const [paySupplier, setPaySupplier] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [receiptData, setReceiptData] = useState(null);

  /* ========== FETCH — axios + Promise.allSettled ========== */
  const fetchAll = async () => {
    setLoading(true);

    const results = await Promise.allSettled([
      api.get('/loans/customers'),
      api.get('/loans/suppliers'),
      api.get('/loans/summary'),
    ]);

    const [cRes, sRes, sumRes] = results;

    if (cRes.status === 'fulfilled') {
      setCustomerLoans(cRes.value.data);
    } else {
      console.error('[/loans/customers] failed:', cRes.reason?.response?.status,
        cRes.reason?.response?.data?.error || cRes.reason?.message);
      setCustomerLoans({
        summary: { total_customers: 0, total_invoices: 0, total_debt: 0, total_debt_afn: 0, total_debt_usd: 0 },
        customers: [],
      });
    }

    if (sRes.status === 'fulfilled') {
      setSupplierLoans(sRes.value.data);
    } else {
      console.error('[/loans/suppliers] failed:', sRes.reason?.response?.status,
        sRes.reason?.response?.data?.error || sRes.reason?.message);
      setSupplierLoans({
        summary: { total_suppliers: 0, total_products: 0, total_debt: 0, total_debt_afn: 0, total_debt_usd: 0 },
        loans: [],
      });
    }

    if (sumRes.status === 'fulfilled') {
      setSummary(sumRes.value.data);
    } else {
      console.error('[/loans/summary] failed:', sumRes.reason?.response?.status,
        sumRes.reason?.response?.data?.error || sumRes.reason?.message);
      const custData = cRes.status === 'fulfilled' ? cRes.value.data?.summary : null;
      const suppData = sRes.status === 'fulfilled' ? sRes.value.data?.summary : null;
      setSummary({
        customers: custData || { total_customers: 0, total_invoices: 0, total_debt: 0, total_debt_afn: 0, total_debt_usd: 0 },
        suppliers: suppData || { total_suppliers: 0, total_products: 0, total_debt: 0, total_debt_afn: 0, total_debt_usd: 0 },
      });
    }

    const activeFailed =
      (tab === 'customers' && cRes.status === 'rejected') ||
      (tab === 'suppliers' && sRes.status === 'rejected');

    if (activeFailed) {
      setToast({ show: true, message: 'خطا در دریافت قرض‌ها', type: 'warning' });
    }

    setLoading(false);
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, []);

  /* ========== FILTERED — CUSTOMERS ========== */
  const filteredCustomers = useMemo(() => {
    const active = customerLoans?.customers || [];
    const s = searchTerm.trim().toLowerCase();
    if (!s) return active;
    return active.filter(c =>
      (c.customer_name || '').toLowerCase().includes(s) ||
      (c.customer_phone || '').toLowerCase().includes(s)
    );
  }, [customerLoans, searchTerm]);

  /* ========== FILTERED — SUPPLIERS (flat) ========== */
  const filteredSupplierLoans = useMemo(() => {
    let rows = [];

    if (Array.isArray(supplierLoans?.loans)) {
      rows = supplierLoans.loans;
    } else if (Array.isArray(supplierLoans?.suppliers)) {
      supplierLoans.suppliers.forEach((sp) => {
        (sp.products || []).forEach((p) => {
          rows.push({
            loan_id: `${sp.supplier_id}-${p.id}`,
            product_id: p.id,
            supplier_id: sp.supplier_id,
            supplier_name: sp.supplier_name,
            supplier_phone: sp.supplier_phone,
            supplier_company: sp.supplier_company,
            product_name: p.name,
            barcode: p.barcode,
            photo_url: p.photo_url,
            module_name: p.module_name,
            sub_module_name: p.sub_module_name,
            sub_sub_module_name: p.sub_sub_module_name,
            price_mode: p.price_mode,
            total_amount: Number(p.final_price || 0),
            paid_amount: Number(p.paid_amount || 0),
            remaining_amount: Number(p.remaining_amount || 0),
            currency: p.currency || 'AFN',
            exchange_rate: Number(p.exchange_rate || 1),
            stock_entry_date: p.stock_entry_date,
            assigned_loan_return_date: p.assigned_loan_return_date,
            payment_type: p.payment_type,
            status: p.status,
          });
        });
      });
    }

    const s = searchTerm.trim().toLowerCase();
    if (!s) return rows;

    return rows.filter(
      (r) =>
        (r.supplier_name || '').toLowerCase().includes(s) ||
        (r.supplier_phone || '').toLowerCase().includes(s) ||
        (r.supplier_company || '').toLowerCase().includes(s) ||
        (r.product_name || '').toLowerCase().includes(s) ||
        (r.barcode || '').toLowerCase().includes(s)
    );
  }, [supplierLoans, searchTerm]);

  /* ========== PAY CUSTOMER — receipt from backend ========== */
  const handlePayCustomer = async (amount, paymentDate) => {
    if (!payCustomer) return;
    try {
      const { data } = await api.post(
        `/sales/${payCustomer.invoice.sale_id || payCustomer.invoice.id}/pay`,
        { amount, payment_date: paymentDate }
      );

      setToast({ show: true, message: 'پرداخت ثبت شد', type: 'success' });

      // backend returns { sale, payment }
      setReceiptData({
        kind: 'customer',
        payment: data.payment,
        sale: data.sale,
        customer: payCustomer.customer,
      });

      setPayCustomer(null);
      fetchAll();
    } catch (e) {
      setToast({
        show: true,
        message: e.response?.data?.message || 'خطا',
        type: 'warning',
      });
    }
  };

  /* ========== PAY SUPPLIER (flat loan) ========== */
  const handlePaySupplier = async (amount, paymentDate) => {
    if (!paySupplier) return;
    try {
      const { data } = await api.post(`/products/${paySupplier.product_id}/pay`, {
        amount,
        payment_date: paymentDate,
      });

      setToast({ show: true, message: 'پرداخت با موفقیت ثبت شد', type: 'success' });

      setReceiptData({
        kind: 'supplier',
        product: data,
        supplier: {
          supplier_name: paySupplier.supplier_name,
          phone: paySupplier.supplier_phone,
        },
        payment: {
          id: Date.now().toString().slice(-6),
          amount,
          payment_date: paymentDate,
        },
      });

      setPaySupplier(null);
      fetchAll();
    } catch (e) {
      setToast({ show: true, message: e.response?.data?.message || 'خطا', type: 'warning' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />}

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                <HandCoins size={22} />
              </div>
              مدیریت قرض‌ها
            </h1>
            <p className="text-sm text-gray-500 mt-2 mr-1">پیگیری بدهی مشتریان و قرض‌های تأمین‌کنندگان</p>
          </div>
          <button onClick={fetchAll} className="px-5 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors flex items-center gap-2 justify-center">
            <RefreshCw size={16} /> بازخوانی
          </button>
        </div>

        {/* SUMMARY */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard icon={<Users size={18} />} label="مشتریان بدهکار" value={summary.customers?.total_customers} color="rose" />
            <SummaryCard icon={<HandCoins size={18} />} label="بدهی مشتریان" valueAfn={summary.customers?.total_debt_afn} valueUsd={summary.customers?.total_debt_usd} color="rose" />
            <SummaryCard icon={<Truck size={18} />} label="تأمین‌کنندگان طلبکار" value={summary.suppliers?.total_suppliers} color="blue" />
            <SummaryCard icon={<Wallet size={18} />} label="قرض ما به تأمین‌کننده" valueAfn={summary.suppliers?.total_debt_afn} valueUsd={summary.suppliers?.total_debt_usd} color="blue" />
          </div>
        )}

        {/* TABS */}
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex gap-2">
          <TabButton active={tab === 'customers'} onClick={() => setTab('customers')} icon={<Users size={16} />} label="قرض مشتریان" count={customerLoans?.customers?.length || 0} color="rose" />
          <TabButton active={tab === 'suppliers'} onClick={() => setTab('suppliers')} icon={<Truck size={16} />} label="قرض تأمین‌کنندگان" count={filteredSupplierLoans.length} color="blue" />
        </div>

        {/* SEARCH */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-transparent focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-500/10 transition-all">
            <Search size={20} className="text-gray-400 ml-2 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={tab === 'customers' ? 'جستجو در نام یا شماره مشتری...' : 'جستجو در نام تأمین‌کننده، محصول یا بارکد...'}
              className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400"
            />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>}
          </div>
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <Loader2 size={40} className="animate-spin text-orange-500" />
            <p className="text-gray-500 mt-4 text-sm">در حال بارگذاری...</p>
          </div>
        ) : tab === 'customers' ? (
          <CustomerLoansTable
            customers={filteredCustomers}
            onPay={(customer, invoice) => setPayCustomer({ customer, invoice })}
          />
        ) : (
          <SupplierLoansTable
            loans={filteredSupplierLoans}
            onPay={(loan) => setPaySupplier(loan)}
          />
        )}

        {/* PAY CUSTOMER MODAL */}
        {payCustomer && (
          <PayModal
            title="پرداخت قرض مشتری"
            subtitle={payCustomer.customer.customer_name}
            meta={payCustomer.invoice.invoice_number}
            extra={payCustomer.invoice.product_name}
            total={Number(payCustomer.invoice.total_price)}
            paid={Number(payCustomer.invoice.paid_amount)}
            remaining={Number(payCustomer.invoice.remaining_amount)}
            currency={payCustomer.invoice.currency}
            exchangeRate={Number(payCustomer.invoice.exchange_rate) || 1}
            color="amber"
            onClose={() => setPayCustomer(null)}
            onSubmit={handlePayCustomer}
          />
        )}

        {/* PAY SUPPLIER MODAL */}
        {paySupplier && (
          <PayModal
            title="پرداخت به تأمین‌کننده"
            subtitle={paySupplier.supplier_name}
            meta={paySupplier.product_name}
            extra={paySupplier.barcode}
            total={Number(paySupplier.total_amount)}
            paid={Number(paySupplier.paid_amount)}
            remaining={Number(paySupplier.remaining_amount)}
            currency={paySupplier.currency}
            exchangeRate={1}
            color="blue"
            onClose={() => setPaySupplier(null)}
            onSubmit={handlePaySupplier}
          />
        )}

        {/* RECEIPTS — routed by kind */}
        {receiptData && receiptData.kind === 'customer' && (
          <CustomerPaymentReceiptModal
            payment={receiptData.payment}
            sale={receiptData.sale}
            customer={receiptData.customer}
            onClose={() => setReceiptData(null)}
          />
        )}

        {receiptData && receiptData.kind === 'supplier' && (
          <PaymentReceiptModal
            product={receiptData.product}
            supplier={receiptData.supplier}
            payment={receiptData.payment}
            onClose={() => setReceiptData(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

/* ============================================================
   CUSTOMER PAYMENT RECEIPT MODAL
   ============================================================ */
function CustomerPaymentReceiptModal({ payment, sale, customer, onClose }) {
  const receiptRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  const handleDownloadPdf = async () => {
    if (!receiptRef.current) return;
    setGenerating(true);
    try {
      await new Promise(r => setTimeout(r, 200));
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth - 10;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 5, 5, imgWidth, imgHeight);
      pdf.save(`customer-receipt-${payment.receipt_number || payment.id}.pdf`);
    } catch (e) {
      console.error(e);
      alert('خطا در ساخت PDF');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const w = window.open('', '', 'height=600,width=800');
    w.document.write('<html><head><title>رسید پرداخت مشتری</title>');
    w.document.write('<style>body { font-family: Tahoma, Arial, sans-serif; direction: rtl; padding: 20px; }</style>');
    w.document.write('</head><body>');
    w.document.write(receiptRef.current.innerHTML);
    w.document.write('</body></html>');
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 500);
  };

  const curr = payment?.currency || 'AFN';
  const remainingAfter = Number(payment?.remaining_after ?? 0);
  const isFullyPaid = remainingAfter <= 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden my-8">
        <div className="bg-emerald-600 p-4 flex items-center justify-between print:hidden">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 size={22} /> رسید پرداخت قرض مشتری
          </h3>
          <div className="flex gap-2">
            <button onClick={handleDownloadPdf} disabled={generating}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF
            </button>
            <button onClick={handlePrint}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
              <Printer size={14} /> چاپ
            </button>
            <button onClick={onClose}
              className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
              بستن
            </button>
          </div>
        </div>

        <div className="p-6 bg-gray-50 max-h-[80vh] overflow-y-auto">
          <div ref={receiptRef} className="bg-white p-6 shadow-sm border border-gray-200" style={{ minHeight: '420px', position: 'relative' }}>
            <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
              <h2 className="text-xl font-black text-gray-800 mb-1">رسید پرداخت قرض مشتری</h2>
              <p className="text-xs text-gray-500">
                شماره رسید: <span className="font-mono font-bold">{payment?.receipt_number || `RC-${payment?.id}`}</span>
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-bold">مشتری:</span>
                <span className="font-bold text-gray-800">{customer?.customer_name || payment?.customer_name || '—'}</span>
              </div>
              {customer?.customer_phone && (
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-gray-500 font-bold">شماره تماس:</span>
                  <span className="font-mono font-bold text-gray-800">{customer.customer_phone}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-bold">شماره فاکتور:</span>
                <span className="font-mono font-bold text-gray-800">{payment?.invoice_number || sale?.invoice_number || '—'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-bold">نام محصول:</span>
                <span className="font-bold text-gray-800">{payment?.product_name || sale?.product_name || '—'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-bold">تاریخ پرداخت:</span>
                <span className="font-mono font-bold text-gray-800">{payment?.payment_date}</span>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 mt-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-bold text-xs">مبلغ کل قرضه:</span>
                <span className="text-sm font-black text-gray-800">{Number(payment?.initial_amount || 0).toLocaleString()} {curr}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-bold text-xs">پرداخت قبلی:</span>
                <span className="text-sm font-bold text-gray-700">{Number(payment?.paid_before || 0).toLocaleString()} {curr}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-amber-200">
                <span className="text-gray-700 font-bold text-xs">مبلغ پرداخت شده:</span>
                <span className="text-lg font-black text-emerald-700">{Number(payment?.amount || 0).toLocaleString()} {curr}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-bold text-xs">باقی‌مانده بعد از پرداخت:</span>
                {isFullyPaid
                  ? <span className="text-sm font-black text-emerald-600 flex items-center gap-1"><CheckCircle2 size={14} /> تصفیه شد</span>
                  : <span className="text-sm font-black text-rose-600">{remainingAfter.toLocaleString()} {curr}</span>}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-dashed border-gray-300 text-center">
              <div className="w-16 h-16 mx-auto border-2 border-emerald-500 rounded-full flex items-center justify-center transform -rotate-12 opacity-80 mb-2">
                <span className="text-emerald-500 font-black text-[10px] text-center leading-tight">تایید<br/>شده</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">این رسید به صورت خودکار توسط سیستم تولید شده است.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CUSTOMER PAYMENT HISTORY MODAL
   ============================================================ */
function CustomerPaymentHistoryModal({ saleId, customerName, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/customer-payments', { params: { sale_id: saleId } });
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [saleId]);

  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-l from-emerald-600 to-teal-500 p-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Receipt size={18} /> تاریخچه پرداخت — {customerName}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white"><X size={16} /></button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={28} className="animate-spin text-emerald-500" /></div>
          ) : rows.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8">هیچ پرداختی ثبت نشده است.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[11px] text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-2 text-right font-bold">#</th>
                  <th className="px-3 py-2 text-center font-bold">تاریخ پرداخت</th>
                  <th className="px-3 py-2 text-left font-bold">مبلغ</th>
                  <th className="px-3 py-2 text-left font-bold">باقی‌مانده بعد</th>
                  <th className="px-3 py-2 text-center font-bold">رسید</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, i) => (
                  <tr key={r.id} className="hover:bg-emerald-50/30">
                    <td className="px-3 py-2 text-xs text-gray-400 font-mono">{i + 1}</td>
                    <td className="px-3 py-2 text-center text-[11px] font-mono text-gray-700">{r.payment_date}</td>
                    <td className="px-3 py-2 text-left text-xs font-black text-emerald-700">
                      {Number(r.amount).toLocaleString()} <span className="text-[10px] text-gray-500">{r.currency}</span>
                    </td>
                    <td className="px-3 py-2 text-left text-xs font-bold text-rose-700">
                      {Number(r.remaining_after).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-center text-[10px] font-mono text-gray-500">{r.receipt_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SUPPLIER PAYMENT RECEIPT MODAL (unchanged)
   ============================================================ */
function PaymentReceiptModal({ payment, product, supplier, onClose }) {
  const receiptRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  const handleDownloadPdf = async () => {
    if (!receiptRef.current) return;
    setGenerating(true);
    try {
      await new Promise(r => setTimeout(r, 200));
      const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth - 10;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 5, 5, imgWidth, imgHeight);
      pdf.save(`receipt-${payment.id}-${product.name}.pdf`);
    } catch (e) { console.error(e); alert('خطا در ساخت PDF'); }
    finally { setGenerating(false); }
  };

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>رسید پرداخت</title>');
    printWindow.document.write('<style>body { font-family: Tahoma, Arial, sans-serif; direction: rtl; padding: 20px; }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(receiptRef.current.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const remainingAfter = Number(product?.remaining_amount_afn ?? product?.remaining_amount ?? 0);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden my-8">
        <div className="bg-emerald-600 p-4 flex items-center justify-between print:hidden">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><CheckCircle2 size={22} /> رسید پرداخت قرضه</h3>
          <div className="flex gap-2">
            <button onClick={handleDownloadPdf} disabled={generating} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">{generating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF</button>
            <button onClick={handlePrint} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Printer size={14} /> چاپ</button>
            <button onClick={onClose} className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">بستن</button>
          </div>
        </div>
        <div className="p-6 bg-gray-50 max-h-[80vh] overflow-y-auto">
          <div ref={receiptRef} className="bg-white p-6 shadow-sm border border-gray-200" style={{ minHeight: '400px', position: 'relative' }}>
            <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
              <h2 className="text-xl font-black text-gray-800 mb-1">رسید پرداخت قرضه</h2>
              <p className="text-xs text-gray-500">شماره رسید: <span className="font-mono font-bold">RC-{payment.id}</span></p>
            </div>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2"><span className="text-gray-500 font-bold">تامین کننده:</span><span className="font-bold text-gray-800">{supplier?.supplier_name || product?.supplier?.supplier_name || '—'}</span></div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-2"><span className="text-gray-500 font-bold">نام محصول:</span><span className="font-bold text-gray-800">{product?.name || '—'}</span></div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-2"><span className="text-gray-500 font-bold">تاریخ پرداخت:</span><span className="font-mono font-bold text-gray-800">{payment.payment_date}</span></div>
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 mt-4">
                <div className="flex justify-between items-center mb-2"><span className="text-gray-600 font-bold text-xs">مبلغ پرداخت شده:</span><span className="text-lg font-black text-emerald-700">{Number(payment.amount).toLocaleString()} AFN</span></div>
                <div className="flex justify-between items-center"><span className="text-gray-600 font-bold text-xs">باقی مانده کل قرضه:</span>{remainingAfter > 0 ? <span className="text-sm font-black text-rose-600">{remainingAfter.toLocaleString()} AFN</span> : <span className="text-sm font-black text-emerald-600 flex items-center gap-1"><CheckCircle2 size={14}/> تصفیه شد</span>}</div>
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-dashed border-gray-300 text-center">
              <div className="w-16 h-16 mx-auto border-2 border-emerald-500 rounded-full flex items-center justify-center transform -rotate-12 opacity-80 mb-2"><span className="text-emerald-500 font-black text-[10px] text-center leading-tight">تایید<br/>شده</span></div>
              <p className="text-[10px] text-gray-400 mt-2">این رسید به صورت خودکار توسط سیستم تولید شده است.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SUMMARY CARD
   ============================================================ */
function SummaryCard({ icon, label, value, valueAfn, valueUsd, color }) {
  const colors = { rose: 'bg-rose-50 text-rose-600', blue: 'bg-blue-50 text-blue-600', orange: 'bg-orange-50 text-orange-600', emerald:'bg-emerald-50 text-emerald-600' };
  const textColors = { rose: 'text-rose-700', blue: 'text-blue-700', orange: 'text-orange-700', emerald:'text-emerald-700' };
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-xl ${colors[color]} flex items-center justify-center`}>{icon}</div>
        <span className="text-xs text-gray-500 font-bold">{label}</span>
      </div>
      {value !== undefined ? (
        <p className={`text-2xl font-black ${textColors[color]}`}>{Number(value || 0).toLocaleString()}</p>
      ) : (
        <>
          <p className={`text-lg font-black ${textColors[color]}`}>{Number(valueAfn || 0).toLocaleString()} <span className="text-xs">AFN</span></p>
          {valueUsd !== undefined && <p className="text-xs font-bold text-gray-500 mt-0.5">$ {Number(valueUsd || 0).toLocaleString()}</p>}
        </>
      )}
    </div>
  );
}

/* ============================================================
   TAB BUTTON
   ============================================================ */
function TabButton({ active, onClick, icon, label, count, color }) {
  const activeMap = { rose: 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/30', blue: 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30' };
  const badgeMap = { rose: active ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-700', blue: active ? 'bg-white/25 text-white' : 'bg-blue-100 text-blue-700' };
  return (
    <button onClick={onClick} className={`flex-1 px-5 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${active ? activeMap[color] : 'bg-gray-50 hover:bg-gray-100 text-gray-600'}`}>
      {icon}<span>{label}</span><span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${badgeMap[color]}`}>{count}</span>
    </button>
  );
}

/* ============================================================
   CUSTOMER LOANS TABLE
   ============================================================ */
function CustomerLoansTable({ customers, onPay }) {
  const [historyFor, setHistoryFor] = useState(null);

  if (!customers || customers.length === 0) {
    return <EmptyState icon={<Users size={36} className="text-rose-400" />} bgColor="bg-rose-50" title="هیچ قرض مشتری یافت نشد" subtitle="همه مشتریان تسویه هستند" />;
  }

  const rows = [];
  customers.forEach((c) => { (c.invoices || []).forEach((inv) => { rows.push({ customer: c, invoice: inv }); }); });
  const totalRemainingAfn = rows.reduce((s, r) => s + Number(r.invoice.remaining_amount_afn || 0), 0);

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-rose-600" />
            <span className="text-sm font-bold text-gray-800">قرض‌های مشتریان</span>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">{rows.length} فاکتور</span>
          </div>
          <div className="text-xs font-bold text-gray-500">جمع بدهی: <span className="text-rose-700">{totalRemainingAfn.toLocaleString()} AFN</span></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-3 text-right font-bold w-8">#</th>
                <th className="px-3 py-3 text-right font-bold">مشتری</th>
                <th className="px-3 py-3 text-right font-bold">فاکتور</th>
                <th className="px-3 py-3 text-right font-bold">محصول</th>
                <th className="px-3 py-3 text-center font-bold">تعداد</th>
                <th className="px-3 py-3 text-left font-bold">مبلغ کل</th>
                <th className="px-3 py-3 text-left font-bold">پرداخت‌شده</th>
                <th className="px-3 py-3 text-left font-bold">باقی‌مانده</th>
                <th className="px-3 py-3 text-center font-bold">تاریخ فروش</th>
                <th className="px-3 py-3 text-center font-bold">تاریخ برگشت قرض</th>
                <th className="px-3 py-3 text-center font-bold">وضعیت</th>
                <th className="px-3 py-3 text-center font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(({ customer, invoice }, idx) => {
                const isPaid = invoice.status === 'paid' || Number(invoice.remaining_amount) <= 0;
                const curr = CURRENCY_LABEL[invoice.currency] || invoice.currency;
                const overdue = !isPaid && isOverdueDate(invoice.assigned_loan_return_date);
                return (
                  <tr key={invoice.id} className={`hover:bg-rose-50/30 transition-colors ${isPaid ? 'bg-emerald-50/20 opacity-80' : ''}`}>
                    <td className="px-3 py-3 text-xs text-gray-400 font-mono">{idx + 1}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {customer.customer_photo ? <img src={customer.customer_photo} alt={customer.customer_name} className="w-8 h-8 rounded-lg object-cover ring-1 ring-rose-100 shrink-0" /> : <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 font-bold text-[11px]">{(customer.customer_name || '?').charAt(0).toUpperCase()}</div>}
                        <div className="min-w-0">
                          <p className="font-bold text-gray-800 text-xs truncate">{customer.customer_name || 'مشتری نقدی'}</p>
                          {customer.customer_phone && <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1"><Phone size={9} /> {customer.customer_phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><span className="font-mono text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded whitespace-nowrap">{invoice.invoice_number}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center shrink-0"><Package size={14} /></div>
                        <div className="min-w-0"><p className="font-bold text-gray-800 text-xs truncate">{invoice.product_name}</p></div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-xs font-bold text-gray-700 whitespace-nowrap">{Number(invoice.qty_sold || 0).toLocaleString()}<span className="text-[10px] text-gray-500 mr-1">{invoice.sale_unit_name}</span></td>
                    <td className="px-3 py-3 text-left text-xs font-bold text-gray-800 whitespace-nowrap">{Number(invoice.total_price).toLocaleString()}<span className="text-[10px] text-gray-500 mr-1">{curr}</span></td>
                    <td className="px-3 py-3 text-left text-xs font-bold text-emerald-700 whitespace-nowrap">{Number(invoice.paid_amount).toLocaleString()}</td>
                    <td className="px-3 py-3 text-left text-xs font-black whitespace-nowrap"><span className={isPaid ? 'text-emerald-600 font-bold' : 'text-rose-700'}>{Number(invoice.remaining_amount).toLocaleString()}<span className="text-[10px] text-gray-500 mr-1">{curr}</span></span></td>
                    <td className="px-3 py-3 text-center text-[10px] text-gray-600 font-mono whitespace-nowrap">{invoice.sale_date || '—'}</td>
                    <td className="px-3 py-3 text-center text-[10px] font-mono whitespace-nowrap">{invoice.assigned_loan_return_date ? <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold ${isPaid ? 'bg-gray-100 text-gray-500' : overdue ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-300' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'}`}><Calendar size={10} />{invoice.assigned_loan_return_date}{!isPaid && overdue && <AlertCircle size={10} />}</span> : <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-3 text-center">{isPaid ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200"><CheckCircle2 size={10} /> تسویه</span> : <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${PAYMENT_COLOR[invoice.payment_type] || PAYMENT_COLOR.loan_partial}`}>{PAYMENT_LABEL[invoice.payment_type] || 'قرض'}</span>}</td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setHistoryFor({ saleId: invoice.sale_id || invoice.id, name: customer.customer_name })}
                          className="px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold flex items-center gap-1 transition-colors"
                          title="تاریخچه پرداخت"
                        >
                          <Receipt size={11} />
                        </button>
                        {!isPaid ? (
                          <button onClick={() => onPay(customer, invoice)} className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-[11px] font-bold shadow-sm shadow-amber-500/20 flex items-center gap-1 transition-all"><HandCoins size={11} /> پرداخت</button>
                        ) : (
                          <span className="text-[10px] text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200"><tr><td colSpan={7} className="px-3 py-3 text-xs font-bold text-gray-700 text-left">جمع کل باقی‌مانده:</td><td className="px-3 py-3 text-left text-sm font-black text-rose-700 whitespace-nowrap">{totalRemainingAfn.toLocaleString()}<span className="text-[10px] text-gray-500 mr-1">AFN</span></td><td colSpan={4}></td></tr></tfoot>
          </table>
        </div>
      </div>

      {historyFor && (
        <CustomerPaymentHistoryModal
          saleId={historyFor.saleId}
          customerName={historyFor.name}
          onClose={() => setHistoryFor(null)}
        />
      )}
    </>
  );
}

/* ============================================================
   SUPPLIER LOANS TABLE (flat)
   ============================================================ */
function SupplierLoansTable({ loans, onPay }) {
  const [details, setDetails] = useState(null);

  if (!loans || loans.length === 0) {
    return (
      <EmptyState
        icon={<Truck size={36} className="text-blue-400" />}
        bgColor="bg-blue-50"
        title="هیچ قرض تأمین‌کننده یافت نشد"
        subtitle="همه تأمین‌کنندگان تسویه هستند"
      />
    );
  }

  const totalRemaining = loans.reduce((s, r) => s + Number(r.remaining_amount || 0), 0);

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-blue-600" />
            <span className="text-sm font-bold text-gray-800">قرض‌های تأمین‌کنندگان</span>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{loans.length} ردیف</span>
          </div>
          <div className="text-xs font-bold text-gray-500">جمع بدهی: <span className="text-rose-700">{totalRemaining.toLocaleString()} AFN</span></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-3 text-right font-bold w-8">#</th>
                <th className="px-3 py-3 text-right font-bold">تأمین‌کننده</th>
                <th className="px-3 py-3 text-right font-bold">محصول</th>
                <th className="px-3 py-3 text-left font-bold">مبلغ کل</th>
                <th className="px-3 py-3 text-left font-bold">پرداخت‌شده</th>
                <th className="px-3 py-3 text-left font-bold">باقی‌مانده</th>
                <th className="px-3 py-3 text-center font-bold">تاریخ خرید</th>
                <th className="px-3 py-3 text-center font-bold">تاریخ برگشت</th>
                <th className="px-3 py-3 text-center font-bold">وضعیت</th>
                <th className="px-3 py-3 text-center font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loans.map((loan, idx) => {
                const isPaid = loan.status === 'paid' || Number(loan.remaining_amount) <= 0;
                const curr = CURRENCY_LABEL[loan.currency] || loan.currency;
                const overdue = !isPaid && isOverdueDate(loan.assigned_loan_return_date);

                return (
                  <tr key={loan.loan_id} className={`hover:bg-blue-50/30 transition-colors ${isPaid ? 'bg-emerald-50/20 opacity-80' : ''}`}>
                    <td className="px-3 py-3 text-xs text-gray-400 font-mono">{idx + 1}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Building2 size={14} /></div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-800 text-xs truncate">{loan.supplier_name || 'تأمین‌کننده'}</p>
                          {loan.supplier_phone && <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1"><Phone size={9} /> {loan.supplier_phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => setDetails(loan)} className="flex items-center gap-2 min-w-0 text-right hover:opacity-80 transition-opacity group" title="مشاهده جزئیات محصول">
                        {loan.photo_url ? (
                          <img src={loan.photo_url} alt={loan.product_name} className="w-8 h-8 rounded-lg object-cover ring-1 ring-gray-200 shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center shrink-0"><Package size={14} /></div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-gray-800 text-xs truncate group-hover:text-blue-700 transition-colors">{loan.product_name}</p>
                          {loan.barcode && <p className="text-[10px] text-gray-400 font-mono truncate">{loan.barcode}</p>}
                        </div>
                      </button>
                    </td>
                    <td className="px-3 py-3 text-left text-xs font-bold text-gray-800 whitespace-nowrap">{Number(loan.total_amount).toLocaleString()}<span className="text-[10px] text-gray-500 mr-1">{curr}</span></td>
                    <td className="px-3 py-3 text-left text-xs font-bold text-emerald-700 whitespace-nowrap">{Number(loan.paid_amount).toLocaleString()}</td>
                    <td className="px-3 py-3 text-left text-xs font-black whitespace-nowrap"><span className={isPaid ? 'text-emerald-600 font-bold' : 'text-rose-700'}>{Number(loan.remaining_amount).toLocaleString()}<span className="text-[10px] text-gray-500 mr-1">{curr}</span></span></td>
                    <td className="px-3 py-3 text-center text-[10px] text-gray-600 font-mono whitespace-nowrap">{loan.stock_entry_date || '—'}</td>
                    <td className="px-3 py-3 text-center text-[10px] font-mono whitespace-nowrap">{loan.assigned_loan_return_date ? <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold ${isPaid ? 'bg-gray-100 text-gray-500' : overdue ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-300' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'}`}><Calendar size={10} />{loan.assigned_loan_return_date}{!isPaid && overdue && <AlertCircle size={10} />}</span> : <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-3 text-center">{isPaid ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200"><CheckCircle2 size={10} /> تسویه</span> : <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${PAYMENT_COLOR[loan.payment_type] || PAYMENT_COLOR.loan_partial}`}>{PAYMENT_LABEL[loan.payment_type] || 'قرض'}</span>}</td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setDetails(loan)} className="px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold flex items-center gap-1 transition-colors" title="جزئیات محصول"><Eye size={11} /></button>
                        {!isPaid ? (
                          <button onClick={() => onPay(loan)} className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-[11px] font-bold shadow-sm shadow-blue-500/20 flex items-center gap-1 transition-all"><HandCoins size={11} /> پرداخت</button>
                        ) : (
                          <span className="text-[10px] text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td colSpan={5} className="px-3 py-3 text-xs font-bold text-gray-700 text-left">جمع کل باقی‌مانده:</td>
                <td className="px-3 py-3 text-left text-sm font-black text-rose-700 whitespace-nowrap">{totalRemaining.toLocaleString()}<span className="text-[10px] text-gray-500 mr-1">AFN</span></td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {details && (
        <SupplierLoanDetailsModal
          loan={details}
          onClose={() => setDetails(null)}
          onPay={() => { onPay(details); setDetails(null); }}
        />
      )}
    </>
  );
}

/* ============================================================
   SUPPLIER LOAN — PRODUCT DETAILS MODAL
   ============================================================ */
function SupplierLoanDetailsModal({ loan, onClose, onPay }) {
  const isPaid = loan.status === 'paid' || Number(loan.remaining_amount) <= 0;
  const curr = CURRENCY_LABEL[loan.currency] || loan.currency || 'AFN';
  const overdue = !isPaid && isOverdueDate(loan.assigned_loan_return_date);

  const total = Number(loan.total_amount || 0);
  const paid = Number(loan.paid_amount || 0);
  const remaining = Number(loan.remaining_amount || 0);
  const paidPercent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  const packaging = [
    loan.module_name ? `1 ${loan.module_name}` : null,
    loan.sub_module_name ? `› ${loan.sub_module_name}` : null,
    loan.sub_sub_module_name ? `› ${loan.sub_sub_module_name}` : null,
  ].filter(Boolean).join(' ');

  const priceModeLabel =
    loan.price_mode === 'module' ? 'بر اساس کارتن'
    : loan.price_mode === 'sub_module' ? 'بر اساس بسته'
    : loan.price_mode === 'sub_sub_module' ? 'بر اساس عدد'
    : null;

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-l from-blue-600 to-cyan-500 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white"><Package size={20} /></div>
            <div>
              <h3 className="text-lg font-bold text-white">جزئیات محصول قرضی</h3>
              <p className="text-[11px] text-white/80 font-mono">کد قرض: #{loan.loan_id} • کد محصول: #{loan.product_id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="flex items-start gap-4">
            {loan.photo_url ? (
              <img src={loan.photo_url} alt={loan.product_name} className="w-24 h-24 rounded-xl object-cover ring-2 ring-blue-100 shrink-0" />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"><Package size={36} /></div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-black text-gray-800 truncate">{loan.product_name}</h4>
              {loan.barcode && <p className="text-xs text-gray-500 font-mono mt-0.5"><span className="text-gray-400">بارکد:</span> {loan.barcode}</p>}
              {packaging && <p className="text-xs text-gray-600 mt-1"><span className="text-gray-400">بسته‌بندی:</span> {packaging}</p>}
              {priceModeLabel && <p className="text-[11px] text-gray-500 mt-0.5"><span className="text-gray-400">حالت قیمت:</span> {priceModeLabel}</p>}
              <div className="mt-2">
                {isPaid ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200"><CheckCircle2 size={11} /> تسویه شده</span>
                ) : overdue ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200"><AlertCircle size={11} /> عقب‌افتاده</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200"><Clock size={11} /> {PAYMENT_LABEL[loan.payment_type] || 'قرض'}</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-xs font-bold text-gray-600">پرداخت شده</span>
              <span className="text-xs font-bold text-gray-600">{paidPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${isPaid ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}`} style={{ width: `${paidPercent}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="text-center">
                <p className="text-[10px] text-gray-500 font-bold mb-1">مبلغ کل</p>
                <p className="text-sm font-black text-gray-800">{total.toLocaleString()}<span className="text-[10px] text-gray-500 mr-0.5">{curr}</span></p>
              </div>
              <div className="text-center border-x border-gray-200">
                <p className="text-[10px] text-gray-500 font-bold mb-1">پرداخت‌شده</p>
                <p className="text-sm font-black text-emerald-700">{paid.toLocaleString()}<span className="text-[10px] text-gray-500 mr-0.5">{curr}</span></p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-500 font-bold mb-1">باقی‌مانده</p>
                <p className={`text-sm font-black ${isPaid ? 'text-emerald-600' : 'text-rose-700'}`}>{remaining.toLocaleString()}<span className="text-[10px] text-gray-500 mr-0.5">{curr}</span></p>
              </div>
            </div>
          </div>

          <div>
            <h5 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1"><Building2 size={12} /> تأمین‌کننده</h5>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">نام</span>
                <span className="text-sm font-bold text-gray-800">{loan.supplier_name || '—'}</span>
              </div>
              {loan.supplier_phone && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">شماره تماس</span>
                  <span className="text-sm font-mono font-bold text-gray-800 flex items-center gap-1"><Phone size={12} /> {loan.supplier_phone}</span>
                </div>
              )}
              {loan.supplier_company && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">آدرس / شرکت</span>
                  <span className="text-sm font-bold text-gray-800">{loan.supplier_company}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h5 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1"><Calendar size={12} /> تاریخ‌ها</h5>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 font-bold mb-1">تاریخ خرید</p>
                <p className="text-sm font-mono font-bold text-gray-800">{loan.stock_entry_date || '—'}</p>
              </div>
              <div className={`border rounded-xl p-3 ${isPaid ? 'bg-gray-50 border-gray-100' : overdue ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
                <p className="text-[10px] font-bold mb-1 flex items-center gap-1 text-gray-600">تاریخ برگشت قرض{!isPaid && overdue && <AlertCircle size={10} className="text-rose-600" />}</p>
                <p className={`text-sm font-mono font-bold ${isPaid ? 'text-gray-800' : overdue ? 'text-rose-700' : 'text-amber-700'}`}>{loan.assigned_loan_return_date || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold text-sm transition-colors">بستن</button>
          {!isPaid && (
            <button onClick={onPay} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold text-sm shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2">
              <HandCoins size={16} /> ثبت پرداخت
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */
function EmptyState({ icon, bgColor, title, subtitle }) {
  return (
    <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 text-center">
      <div className={`w-20 h-20 mx-auto rounded-full ${bgColor} flex items-center justify-center mb-4`}>{icon}</div>
      <p className="text-gray-700 font-bold text-lg mb-1">{title}</p>
      <p className="text-sm text-gray-400">{subtitle}</p>
    </div>
  );
}

/* ============================================================
   PAY MODAL
   ============================================================ */
function PayModal({ title, subtitle, meta, extra, total, paid, remaining, currency, exchangeRate, color, onClose, onSubmit }) {
  const [amount, setAmount] = useState(remaining);
  const [paymentDate, setPaymentDate] = useState(getTodayPersian());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const rate = Math.max(0.0001, Number(exchangeRate) || 1);
  const curr = String(currency || 'AFN').toUpperCase();

  const convertCurrency = (amt) => {
    if (curr === 'USD') return { afn: Math.round(amt * rate * 100) / 100, usd: Math.round(amt * 100) / 100 };
    return { afn: Math.round(amt * 100) / 100, usd: Math.round((amt / rate) * 100) / 100 };
  };

  const inputConv = convertCurrency(Number(amount) || 0);

  const submit = async () => {
    const amt = Number(amount) || 0;
    if (amt <= 0) { setError('مبلغ باید بزرگ‌تر از صفر باشد'); return; }
    if (amt > remaining) { setError(`حداکثر مبلغ قابل پرداخت ${remaining.toLocaleString()} است`); return; }
    setLoading(true); setError('');
    try { await onSubmit(amt, paymentDate); }
    catch (e) { setError(e.response?.data?.message || 'خطا'); }
    finally { setLoading(false); }
  };

  const theme = {
    amber: { gradient: 'from-amber-500 to-orange-500', gradientHover: 'hover:from-amber-600 hover:to-orange-600', shadow: 'shadow-amber-500/30', bg50: 'bg-amber-50', border200: 'border-amber-200', text700: 'text-amber-700', text900: 'text-amber-900', focus: 'focus:border-amber-500 focus:ring-amber-500/10', btn100: 'bg-amber-100 hover:bg-amber-200' },
    blue: { gradient: 'from-blue-600 to-cyan-500', gradientHover: 'hover:from-blue-700 hover:to-cyan-600', shadow: 'shadow-blue-500/30', bg50: 'bg-blue-50', border200: 'border-blue-200', text700: 'text-blue-700', text900: 'text-blue-900', focus: 'focus:border-blue-500 focus:ring-blue-500/10', btn100: 'bg-blue-100 hover:bg-blue-200' },
  }[color];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className={`bg-gradient-to-l ${theme.gradient} p-6 flex items-center justify-between`}>
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><HandCoins size={22} /> {title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className={`${theme.bg50} border ${theme.border200} rounded-2xl p-4 space-y-2`}>
            <p className={`font-bold ${theme.text900}`}>{subtitle}</p>
            {meta && <p className={`text-xs ${theme.text700} font-mono`}>{meta}</p>}
            {extra && <p className={`text-xs ${theme.text700}`}>{extra}</p>}
            <div className="mt-3 space-y-2 text-sm">
              <Row label="مبلغ کل:" value={`${Number(total).toLocaleString()} ${curr}`} />
              <Row label="پرداخت‌شده:" value={`${Number(paid).toLocaleString()} ${curr}`} color="emerald" />
              <Row label="باقی‌مانده:" value={`${remaining.toLocaleString()} ${curr}`} color="rose" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">مبلغ پرداخت ({CURRENCY_LABEL[curr] || curr})</label>
            <input type="number" min="0" step="0.01" max={remaining} value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }} className={`w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:bg-white focus:ring-4 transition-all text-center font-bold text-lg ${theme.focus}`} dir="ltr" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setAmount(remaining)} className={`text-xs ${theme.btn100} ${theme.text700} font-bold px-3 py-1.5 rounded-lg`}>کل باقی‌مانده</button>
              <button type="button" onClick={() => setAmount(Math.round(remaining / 2))} className={`text-xs ${theme.btn100} ${theme.text700} font-bold px-3 py-1.5 rounded-lg`}>نصف</button>
            </div>
            <div className="mt-2 p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs">
              <Row label="معادل AFN:" value={`${inputConv.afn.toLocaleString()} AFN`} />
              <Row label="معادل USD:" value={`$ ${inputConv.usd.toLocaleString()}`} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">تاریخ پرداخت (شمسی) <span className="text-rose-500">*</span></label>
            <PersianDatePicker value={paymentDate} onChange={(v) => setPaymentDate(v)} />
          </div>
          {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex gap-2 text-rose-700 text-xs"><AlertCircle size={16} className="shrink-0 mt-0.5" /><span>{error}</span></div>}
          <div className="flex gap-3 pt-2">
            <button onClick={submit} disabled={loading} className={`flex-1 bg-gradient-to-r ${theme.gradient} ${theme.gradientHover} text-white font-bold py-3 rounded-xl shadow-lg ${theme.shadow} transition-all flex items-center justify-center gap-2 disabled:opacity-70`}>{loading ? <><Loader2 size={18} className="animate-spin" /> در حال ثبت...</> : 'ثبت پرداخت'}</button>
            <button onClick={onClose} className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors">انصراف</button>
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
  const colorMap = { emerald: 'text-emerald-700', rose: 'text-rose-700', amber: 'text-amber-700', blue: 'text-blue-700' };
  if (plain) return <div className="flex justify-between"><span className="text-gray-600">{label}</span><b>{value}</b></div>;
  return <div className="flex justify-between"><span className="text-gray-600">{label}</span><b className={colorMap[color] || 'text-gray-800'}>{value}</b></div>;
}