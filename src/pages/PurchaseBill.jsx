import React, { useState, useEffect } from 'react';
import {
  Search, FileText, Eye, Trash2, X, Calendar,
  Package, Building2, CheckCircle2, HandCoins, Clock,
  RefreshCw, Download, Printer
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
// =============================================

// ============ API ============
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const api = axios.create({ baseURL: API_BASE_URL, headers: { Accept: 'application/json' } });
api.interceptors.request.use((c) => {
  const t = sessionStorage.getItem('auth_token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

export default function PurchaseBill() {
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [selectedBill, setSelectedBill] = useState(null);
  const [openingBillId, setOpeningBillId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const fetchBills = async (searchTerm = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/purchase-bills', {
        params: { search: searchTerm || undefined }
      });
      setBills(Array.isArray(data) ? data : (data.data || []));
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: 'خطا در دریافت فاکتورها', type: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBills(); }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchBills(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleViewBill = async (bill) => {
    setOpeningBillId(bill.id);
    try {
      const { data } = await api.get(`/purchase-bills/${bill.id}`);
      const details = data?.data?.bill ?? data?.data ?? data?.bill ?? data;
      const products = Array.isArray(details?.products)
        ? details.products
        : Array.isArray(details?.products?.data)
          ? details.products.data
          : Array.isArray(details?.items)
            ? details.items
            : [];
      const productIds = details?.product_ids || bill.product_ids || [];

      if (products.length === 0 && productIds.length > 0) {
        throw new Error('Bill details did not include its products');
      }

      setSelectedBill({ ...bill, ...details, products });
    } catch (e) {
      console.error('Failed to load purchase bill details', e);
      setToast({
        show: true,
        message: 'خطا در دریافت جزئیات فاکتور و محصولات آن',
        type: 'warning',
      });
    } finally {
      setOpeningBillId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/purchase-bills/${deleteConfirm}`);
      setBills(prev => prev.filter(b => b.id !== deleteConfirm));
      setToast({ show: true, message: 'فاکتور حذف شد', type: 'warning' });
      setDeleteConfirm(null);
    } catch (e) {
      setToast({ show: true, message: e.response?.data?.message || 'خطا در حذف', type: 'warning' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        {toast.show && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                <FileText size={22} />
              </div>
              فاکتورهای خرید
            </h1>
            <p className="text-sm text-gray-500 mt-2 mr-1">
              سابقه‌ی خریدها از تامین‌کنندگان
            </p>
          </div>

          <button
            onClick={() => fetchBills(search)}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} /> بازخوانی
          </button>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-transparent focus-within:border-purple-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-purple-500/10 transition-all flex-1">
              <Search size={20} className="text-gray-400 ml-2 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو در شماره فاکتور..."
                className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
            <p className="text-gray-500 mt-4 text-sm">در حال بارگذاری...</p>
          </div>
        ) : bills.length === 0 ? (
          <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-purple-50 flex items-center justify-center mb-4">
              <FileText size={36} className="text-purple-400" />
            </div>
            <p className="text-gray-700 font-bold text-lg mb-1">هیچ فاکتوری یافت نشد</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="bg-gradient-to-l from-purple-50/70 to-pink-50/50 border-b-2 border-purple-100">
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600 w-14">#</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600">شماره فاکتور</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600">تاریخ</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600">تامین‌کننده</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600">محصولات</th>
                    <th className="text-center px-4 py-4 text-xs font-bold text-gray-600 w-28">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bills.map((b, i) => {
                    const productCount = b.products?.length || b.product_ids?.length || 0;
                    return (
                      <tr key={b.id} className="hover:bg-purple-50/40 transition-colors group">
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold">
                            {i + 1}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-md">
                            {b.bill_number}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                          {toAfghanDate(b.created_at)}
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-bold text-gray-700">
                            {b.supplier_name || b.supplier?.supplier_name || '—'}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-bold text-xs">
                            <Package size={14} /> {productCount} محصول
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewBill(b)}
                              disabled={openingBillId !== null}
                              className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-105 transition-all text-xs font-bold flex items-center gap-1"
                            >
                              {openingBillId === b.id
                                ? <RefreshCw size={14} className="animate-spin" />
                                : <Eye size={14} />}
                              {openingBillId === b.id ? 'در حال بارگذاری' : 'مشاهده'}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(b.id)}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:scale-105 transition-all"
                            >
                              <Trash2 size={14} />
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

        {selectedBill && (
          <BillDetailsModal bill={selectedBill} onClose={() => setSelectedBill(null)} />
        )}

        {deleteConfirm && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 flex items-center justify-center mb-4">
                  <Trash2 size={28} className="text-rose-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">حذف فاکتور</h3>
                <p className="text-sm text-gray-500 mb-6">آیا از حذف این فاکتور مطمئن هستید؟</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDelete}
                    className="flex-1 bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-rose-500/30 transition-all"
                  >
                    بله، حذف کن
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors"
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
   BILL DETAILS MODAL (PAPER STYLE)
   ============================================================ */
function BillDetailsModal({ bill, onClose }) {
  const products = Array.isArray(bill?.products) ? bill.products : [];
  const pdfRef = React.useRef(null);
  const [generating, setGenerating] = React.useState(false);

  // Calculate totals dynamically from the products array
  const totalAfn = products.reduce((s, p) => s + Number(p.final_price_afn || 0), 0);
  const totalUsd = products.reduce((s, p) => s + Number(p.final_price_usd || 0), 0);
  const paidAfn  = products.reduce((s, p) => s + Number(p.paid_amount_afn || 0), 0);
  const paidUsd  = products.reduce((s, p) => s + Number(p.paid_amount_usd || 0), 0);
  const remAfn   = products.reduce((s, p) => s + Number(p.remaining_amount_afn || 0), 0);
  const remUsd   = products.reduce((s, p) => s + Number(p.remaining_amount_usd || 0), 0);

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      await new Promise(r => setTimeout(r, 200));
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
        windowWidth: pdfRef.current.scrollWidth,
        windowHeight: pdfRef.current.scrollHeight,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const imgWidth = pageWidth - margin * 2;
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
      pdf.save(`invoice-${bill.bill_number}.pdf`);
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
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
              {generating ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />} دانلود PDF
            </button>
            <button onClick={() => window.print()} className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
              <Printer size={16} /> چاپ
            </button>
            <button onClick={onClose} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-bold text-sm">بستن</button>
          </div>
        </div>

        {/* THE PAPER INVOICE DESIGN */}
        <div className="p-8 bg-gray-100 max-h-[80vh] overflow-y-auto">
          <div ref={pdfRef} className="bg-white p-10 mx-auto shadow-sm" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Tahoma, Arial, sans-serif', direction: 'rtl', color: '#000' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #1e293b', paddingBottom: '20px', marginBottom: '30px' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#7c3aed', margin: 0 }}>مدیریت خرید</p>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '5px 0 0' }}>
                  خلاصه‌ی ثبت‌شده‌ی خرید از تامین‌کننده
                </p>
              </div>
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 5px 0' }}>فاکتور خرید</h2>
                <p style={{ fontSize: '13px', margin: '2px 0' }}>شماره: <b>{bill.bill_number}</b></p>
                <p style={{ fontSize: '13px', margin: '2px 0' }}>تاریخ: <b>{toAfghanDate(bill.created_at)}</b></p>
              </div>
            </div>

            {/* Customer / Supplier Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
              <div style={{ width: '45%' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 5px 0', color: '#1e293b' }}>اطلاعات تامین‌کننده:</p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>نام: <b>{bill.supplier_name || bill.supplier?.supplier_name || bill.supplier?.name || '—'}</b></p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>تلفن: {bill.supplier_phone || bill.supplier?.phone || '—'}</p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>آدرس: {bill.supplier_address || bill.supplier?.address || '—'}</p>
              </div>
              <div style={{ width: '45%' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 5px 0', color: '#1e293b' }}>اطلاعات محصولات:</p>
                <p style={{ fontSize: '12px', margin: '2px 0' }}>تعداد کل اقلام: <b>{products.length} محصول</b></p>
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
                {products.map((p, idx) => (
                  <tr key={p.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', borderRight: '1px solid #e2e8f0' }}>{idx + 1}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', borderRight: '1px solid #e2e8f0' }}>
                      <b>{p.name}</b><br/>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>{p.category || ''}</span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', borderRight: '1px solid #e2e8f0' }}>{p.final_qty} {p.module_name}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', borderRight: '1px solid #e2e8f0' }}>{Number(p.price).toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold' }}>{Number(p.final_price_afn).toLocaleString()}</td>
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