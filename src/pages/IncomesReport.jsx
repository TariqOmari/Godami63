import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Wallet,
  Calendar, Download, Printer, Filter, RefreshCw,
  Loader2, AlertCircle, FileText, CheckCircle2,
  ChevronDown, ChevronLeft, ChevronRight, HandCoins
} from 'lucide-react';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import Toast from '../components/Toast';

// ============ AFGHAN DATE HELPERS ============
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

const getTodayPersian = () => {
  const p = gregorianToPersian(new Date());
  return { year: p.year, month: p.month, day: p.day };
};
// =============================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const api = axios.create({ baseURL: API_BASE_URL, headers: { Accept: 'application/json' } });
api.interceptors.request.use((c) => {
  const t = sessionStorage.getItem('auth_token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

export default function IncomesReport() {
  const today = getTodayPersian();
  
  // فیلترها
  const [filterMode, setFilterMode] = useState('month'); // 'month', 'week', 'year'
  const [selYear, setSelYear] = useState(today.year);
  const [selMonth, setSelMonth] = useState(today.month);
  const [selWeek, setSelWeek] = useState(1);

  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const printRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  // دریافت داده‌ها
  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, expensesRes] = await Promise.all([
        api.get('/sales'),
        api.get('/expenses')
      ]);
      setSales(salesRes.data || []);
      setExpenses(expensesRes.data || []);
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: 'خطا در دریافت اطلاعات', type: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // فیلتر کردن داده‌ها بر اساس تاریخ
  const filteredData = useMemo(() => {
    const checkDate = (dateStr) => {
      if (!dateStr) return false;
      const parts = dateStr.split('-');
      if (parts.length !== 3) return false;
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);

      if (filterMode === 'year') {
        return y === selYear;
      }
      if (filterMode === 'month') {
        return y === selYear && m === selMonth;
      }
      if (filterMode === 'week') {
        const startDay = (selWeek - 1) * 7 + 1;
        const endDay = selWeek * 7;
        return y === selYear && m === selMonth && d >= startDay && d <= endDay;
      }
      return false;
    };

    const filteredSales = sales.filter(s => checkDate(s.sale_date));
    const filteredExpenses = expenses.filter(e => checkDate(e.expense_date));

    return { filteredSales, filteredExpenses };
  }, [sales, expenses, filterMode, selYear, selMonth, selWeek]);

  // محاسبات
  const stats = useMemo(() => {
    let totalRevenueAfn = 0;
    let totalRevenueUsd = 0;
    
    let totalExpensesAfn = 0;
    let totalExpensesUsd = 0;

    let profitAfn = 0;
    let profitUsd = 0;

    // ۱. محاسبه دخل و سود (دقیقا مثل منطق صفحه فروش)
    for (const s of filteredData.filteredSales) {
      const totalAfn = Number(s.total_price_afn) || 0;
      const totalUsd = Number(s.total_price_usd) || 0;
      
      const remainingAfn = Number(s.remaining_amount_afn) || 0;
      const remainingUsd = Number(s.remaining_amount_usd) || 0;
      
      const profitTotal = Number(s.profit) || 0;
      const costPrice = Number(s.cost_price) || 0;

      // پول نقدی که دست ما آمده (دخل)
      const saleCashAfn = Math.max(0, totalAfn - remainingAfn);
      const saleCashUsd = Math.max(0, totalUsd - remainingUsd);

      totalRevenueAfn += saleCashAfn;
      totalRevenueUsd += saleCashUsd;

      // سود واقعی (دقیقا مثل کارت سود صفحه فروش)
      let saleProfitCash = 0;
      if (saleCashAfn > costPrice) {
        saleProfitCash = Math.min(saleCashAfn - costPrice, profitTotal);
      }
      
      const rate = Number(s.exchange_rate) || 1;
      let saleProfitUsd = 0;
      if (String(s.currency).toUpperCase() === 'USD') {
        saleProfitUsd = saleProfitCash / rate;
      } else {
        saleProfitUsd = saleProfitCash / rate;
      }

      profitAfn += saleProfitCash;
      profitUsd += saleProfitUsd;
    }

    // ۲. محاسبه مصارف
    for (const e of filteredData.filteredExpenses) {
      const amt = Number(e.amount) || 0;
      const rate = Number(e.exchange_rate) || 1;
      
      if (String(e.currency).toUpperCase() === 'USD') {
        totalExpensesAfn += amt * rate;
        totalExpensesUsd += amt;
      } else {
        totalExpensesAfn += amt;
        totalExpensesUsd += amt / rate;
      }
    }

    // ۳. کسر مصارف از سود (درآمد خالص)
    const pureIncomeAfn = profitAfn - totalExpensesAfn;
    const pureIncomeUsd = profitUsd - totalExpensesUsd;

    return {
      totalRevenueAfn, totalRevenueUsd,
      totalExpensesAfn, totalExpensesUsd,
      profitAfn, profitUsd,
      pureIncomeAfn, pureIncomeUsd,
      salesCount: filteredData.filteredSales.length,
      expensesCount: filteredData.filteredExpenses.length
    };
  }, [filteredData]);

  // چاپ و PDF
  const handlePrint = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`
      <html dir="rtl">
      <head>
        <title>گزارش خالص درآمد</title>
        <style>
          * { font-family: Tahoma, Arial, sans-serif; box-sizing: border-box; margin:0; padding:0; }
          body { padding: 30px; background:#fff; color:#111; }
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
      if (!printRef.current) return;
      setGenerating(true);
      
      const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const imgW  = pageW - 20;
      const imgH  = (canvas.height * imgW) / canvas.width;
      
      pdf.addImage(img, 'PNG', 10, 10, imgW, imgH);
      pdf.save(`income-report-${selYear}-${selMonth}.pdf`);
    } catch (e) {
      console.error(e);
      alert('خطا در ساخت PDF');
    } finally {
      setGenerating(false);
    }
  };

  // عنوان بازه زمانی
  const periodLabel = useMemo(() => {
    if (filterMode === 'year') return `سال ${selYear}`;
    if (filterMode === 'month') return `${AFGHAN_MONTHS[selMonth - 1]} ${selYear}`;
    if (filterMode === 'week') return `هفته ${selWeek} ماه ${AFGHAN_MONTHS[selMonth - 1]} ${selYear}`;
    return '';
  }, [filterMode, selYear, selMonth, selWeek]);

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        
        {toast.show && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />
        )}

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-black flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-sm">
                <TrendingUp size={22} />
              </div>
              گزارش درآمد خالص
            </h1>
            <p className="text-sm text-gray-600 mt-2 mr-1">
              سود خالص فروش (منهای قرض) منهای کل مصارف
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="bg-gray-100 hover:bg-gray-200 text-black px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2">
              <RefreshCw size={16} /> بازخوانی
            </button>
            <button onClick={handlePdf} disabled={generating} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2">
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} PDF
            </button>
            <button onClick={handlePrint} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2">
              <Printer size={16} /> چاپ
            </button>
          </div>
        </div>

        {/* FILTERS */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-300 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
            <button onClick={() => setFilterMode('week')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterMode === 'week' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-black'}`}>هفتگی</button>
            <button onClick={() => setFilterMode('month')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterMode === 'month' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-black'}`}>ماهانه</button>
            <button onClick={() => setFilterMode('year')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterMode === 'year' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-black'}`}>سالانه</button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select value={selYear} onChange={(e) => setSelYear(Number(e.target.value))} className="bg-white border border-gray-300 rounded-xl px-4 py-2 text-sm font-bold text-black outline-none focus:border-orange-500 cursor-pointer">
              {Array.from({ length: 5 }, (_, i) => today.year - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            {filterMode !== 'year' && (
              <select value={selMonth} onChange={(e) => setSelMonth(Number(e.target.value))} className="bg-white border border-gray-300 rounded-xl px-4 py-2 text-sm font-bold text-black outline-none focus:border-orange-500 cursor-pointer">
                {AFGHAN_MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            )}

            {filterMode === 'week' && (
              <select value={selWeek} onChange={(e) => setSelWeek(Number(e.target.value))} className="bg-white border border-gray-300 rounded-xl px-4 py-2 text-sm font-bold text-black outline-none focus:border-orange-500 cursor-pointer">
                {[1, 2, 3, 4, 5].map(w => <option key={w} value={w}>هفته {w}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* CONTENT / LOADER */}
        {loading ? (
          <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-300 flex flex-col items-center justify-center h-64">
            <Loader2 size={40} className="animate-spin text-orange-500" />
            <p className="text-gray-600 mt-4 text-sm font-bold">در حال محاسبه گزارش...</p>
          </div>
        ) : (
          <>
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* ۱. دخل کل */}
              <div className="bg-white p-5 rounded-2xl border border-gray-300 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <Wallet size={18} />
                  </div>
                  <span className="text-xs text-gray-600 font-bold">دخل کل (نقد)</span>
                </div>
                <p className="text-2xl font-black text-emerald-700">{stats.totalRevenueAfn.toLocaleString()} <span className="text-xs">AFN</span></p>
                <p className="text-xs font-bold text-gray-500 mt-1">$ {stats.totalRevenueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>

              {/* ۲. سود کل */}
              <div className="bg-white p-5 rounded-2xl border border-gray-300 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <TrendingUp size={18} />
                  </div>
                  <span className="text-xs text-gray-600 font-bold">سود کل</span>
                </div>
                <p className="text-2xl font-black text-blue-700">{stats.profitAfn.toLocaleString()} <span className="text-xs">AFN</span></p>
                <p className="text-xs font-bold text-gray-500 mt-1">$ {stats.profitUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>

              {/* ۳. مصارف */}
              <div className="bg-white p-5 rounded-2xl border border-gray-300 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                    <TrendingDown size={18} />
                  </div>
                  <span className="text-xs text-gray-600 font-bold">کل مصارف</span>
                </div>
                <p className="text-2xl font-black text-rose-600">{stats.totalExpensesAfn.toLocaleString()} <span className="text-xs">AFN</span></p>
                <p className="text-xs font-bold text-gray-500 mt-1">$ {stats.totalExpensesUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>

              {/* ۴. درآمد خالص */}
              <div className="bg-gradient-to-tr from-orange-500 to-orange-600 p-5 rounded-2xl border border-orange-400 shadow-lg text-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <DollarSign size={18} />
                  </div>
                  <span className="text-xs font-bold text-orange-50">درآمد خالص</span>
                </div>
                <p className="text-2xl font-black">{stats.pureIncomeAfn.toLocaleString()} <span className="text-xs">AFN</span></p>
                <p className="text-xs font-bold text-orange-100 mt-1">$ {stats.pureIncomeUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>
            </div>

            {/* FORMULA HINT */}
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-200">
              <span className="text-blue-700">سود کل</span>
              <span>-</span>
              <span className="text-rose-700">کل مصارف</span>
              <span>=</span>
              <span className="text-orange-600 text-sm">درآمد خالص</span>
            </div>

            {/* ================= A4 PRINTABLE REPORT ================= */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-300 overflow-hidden p-4">
              <div ref={printRef} className="bg-white p-10 mx-auto shadow-sm" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Tahoma, Arial, sans-serif', direction: 'rtl', color: '#000' }}>
                
                {/* Report Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f97316', paddingBottom: '20px', marginBottom: '30px' }}>
                  <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#f97316', margin: 0 }}>نام فروشگاه شما</h1>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '5px 0' }}>گزارش خالص درآمد و مصارف</p>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#111', margin: '0 0 5px 0' }}>صورت حساب درآمد</h2>
                    <p style={{ fontSize: '13px', margin: '2px 0' }}>دوره: <b>{periodLabel}</b></p>
                    <p style={{ fontSize: '13px', margin: '2px 0' }}>تاریخ چاپ: <b>{today.year}-{String(today.month).padStart(2, '0')}-{String(today.day).padStart(2, '0')}</b></p>
                  </div>
                </div>

                {/* Summary Table */}
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: '#f97316' }}>خلاصه وضعیت مالی</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#fff7ed', borderTop: '1px solid #f97316', borderBottom: '1px solid #f97316' }}>
                      <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>عنوان</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px' }}>مبلغ (AFN)</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px' }}>مبلغ (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontSize: '13px' }}>۱. دخل کل (نقد جمع‌آوری شده)</td>
                      <td style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 'bold' }}>{stats.totalRevenueAfn.toLocaleString()} AFN</td>
                      <td style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 'bold' }}>$ {stats.totalRevenueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#2563eb' }}>۲. سود کل</td>
                      <td style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: '#2563eb', fontWeight: 'bold' }}>{stats.profitAfn.toLocaleString()} AFN</td>
                      <td style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: '#2563eb', fontWeight: 'bold' }}>$ {stats.profitUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#dc2626' }}>۳. کل مصارف (هزینه‌ها)</td>
                      <td style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: '#dc2626', fontWeight: 'bold' }}>{stats.totalExpensesAfn.toLocaleString()} AFN</td>
                      <td style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: '#dc2626', fontWeight: 'bold' }}>$ {stats.totalExpensesUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr style={{ backgroundColor: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: 'bold', color: '#166534' }}>درآمد خالص (۲ - ۳)</td>
                      <td style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#166534' }}>{stats.pureIncomeAfn.toLocaleString()} AFN</td>
                      <td style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#166534' }}>$ {stats.pureIncomeUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>

                {/* List of Expenses in this period */}
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: '#f97316' }}>ریز مصارف این دوره ({stats.expensesCount} مورد)</h3>
                {stats.expensesCount === 0 ? (
                  <p style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', marginBottom: '30px' }}>هیچ مصرفی در این دوره ثبت نشده است.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>#</th>
                        <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>تاریخ</th>
                        <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>نام مصرف</th>
                        <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>دسته</th>
                        <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px' }}>مبلغ اصلی</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.filteredExpenses.map((e, idx) => (
                        <tr key={e.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px', fontSize: '12px', textAlign: 'right' }}>{idx + 1}</td>
                          <td style={{ padding: '8px', fontSize: '12px', textAlign: 'right', fontFamily: 'monospace' }}>{e.expense_date}</td>
                          <td style={{ padding: '8px', fontSize: '12px', textAlign: 'right' }}>{e.expense_name}</td>
                          <td style={{ padding: '8px', fontSize: '12px', textAlign: 'right' }}>{e.category || '—'}</td>
                          <td style={{ padding: '8px', fontSize: '12px', textAlign: 'left', fontWeight: 'bold' }}>
                            {Number(e.amount).toLocaleString()} <span style={{ fontSize: '10px', color: '#64748b' }}>{e.currency}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Footer */}
                <div style={{ marginTop: '50px', textAlign: 'center', borderTop: '1px dashed #cbd5e1', paddingTop: '20px' }}>
                  <p style={{ fontSize: '11px', color: '#94a3b8' }}>این گزارش به صورت خودکار توسط سیستم مدیریت فروش تولید شده است.</p>
                  <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>توجه: سود فروش‌های قرضی تا زمان تسویه کامل، در این گزارش محاسبه نمی‌شود.</p>
                </div>

              </div>
            </div>
          </>
        )}

      </div>
    </DashboardLayout>
  );
}