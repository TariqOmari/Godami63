import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Loader2, AlertCircle, HandCoins, Users, Truck,
  RefreshCw, Phone, Package, FileText, Calendar, DollarSign,
  TrendingUp, ChevronDown, ChevronUp, X, Wallet, Percent,
  Building2, User as UserIcon, Receipt, Eye
} from 'lucide-react';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import Toast from '../components/Toast';

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

// ============ API ============
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const api = axios.create({ baseURL: API_BASE_URL, headers: { Accept: 'application/json' } });
api.interceptors.request.use((c) => {
  const t = sessionStorage.getItem('auth_token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

/* ============================================================
   MAIN PAGE
   ============================================================ */
export default function Loans() {
  const [tab, setTab] = useState('customers'); // customers | suppliers

  const [customerLoans, setCustomerLoans] = useState(null);
  const [supplierLoans, setSupplierLoans] = useState(null);
  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [payCustomer, setPayCustomer] = useState(null); // { customer, invoice }
  const [paySupplier, setPaySupplier] = useState(null); // { supplier, product }
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  /* ========== FETCH ========== */
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [c, s, sum] = await Promise.all([
        api.get('/loans/customers'),
        api.get('/loans/suppliers'),
        api.get('/loans/summary'),
      ]);
      setCustomerLoans(c.data);
      setSupplierLoans(s.data);
      setSummary(sum.data);
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: 'خطا در دریافت قرض‌ها', type: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  /* ========== FILTERED ========== */
  const filteredCustomers = useMemo(() => {
    if (!customerLoans?.customers) return [];
    const s = searchTerm.trim().toLowerCase();
    if (!s) return customerLoans.customers;
    return customerLoans.customers.filter(c =>
      (c.customer_name || '').toLowerCase().includes(s) ||
      (c.customer_phone || '').toLowerCase().includes(s)
    );
  }, [customerLoans, searchTerm]);

  const filteredSuppliers = useMemo(() => {
    if (!supplierLoans?.suppliers) return [];
    const s = searchTerm.trim().toLowerCase();
    if (!s) return supplierLoans.suppliers;
    return supplierLoans.suppliers.filter(sp =>
      (sp.supplier_name || '').toLowerCase().includes(s) ||
      (sp.supplier_phone || '').toLowerCase().includes(s) ||
      (sp.supplier_company || '').toLowerCase().includes(s)
    );
  }, [supplierLoans, searchTerm]);

  /* ========== PAY CUSTOMER ========== */
  const handlePayCustomer = async (amount) => {
    if (!payCustomer) return;
    try {
      await api.post(`/sales/${payCustomer.invoice.id}/pay`, { amount });
      setToast({ show: true, message: 'پرداخت ثبت شد', type: 'success' });
      setPayCustomer(null);
      fetchAll();
    } catch (e) {
      setToast({ show: true, message: e.response?.data?.message || 'خطا', type: 'warning' });
    }
  };

  /* ========== PAY SUPPLIER ========== */
  const handlePaySupplier = async (amount) => {
    if (!paySupplier) return;
    try {
      await api.post(`/products/${paySupplier.product.id}/pay`, { amount });
      setToast({ show: true, message: 'پرداخت ثبت شد', type: 'success' });
      setPaySupplier(null);
      fetchAll();
    } catch (e) {
      setToast({ show: true, message: e.response?.data?.message || 'خطا', type: 'warning' });
    }
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

        {/* ========== HEADER ========== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                <HandCoins size={22} />
              </div>
              مدیریت قرض‌ها
            </h1>
            <p className="text-sm text-gray-500 mt-2 mr-1">
              پیگیری بدهی مشتریان و قرض‌های تأمین‌کنندگان
            </p>
          </div>
          <button
            onClick={fetchAll}
            className="px-5 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors flex items-center gap-2 justify-center"
          >
            <RefreshCw size={16} /> بازخوانی
          </button>
        </div>

        {/* ========== SUMMARY ========== */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard
              icon={<Users size={18} />}
              label="مشتریان بدهکار"
              value={summary.customers.total_customers}
              color="rose"
            />
            <SummaryCard
              icon={<HandCoins size={18} />}
              label="بدهی مشتریان"
              valueAfn={summary.customers.total_debt_afn}
              valueUsd={summary.customers.total_debt_usd}
              color="rose"
            />
            <SummaryCard
              icon={<Truck size={18} />}
              label="تأمین‌کنندگان طلبکار"
              value={summary.suppliers.total_suppliers}
              color="blue"
            />
            <SummaryCard
              icon={<Wallet size={18} />}
              label="قرض ما به تأمین‌کننده"
              valueAfn={summary.suppliers.total_debt_afn}
              valueUsd={summary.suppliers.total_debt_usd}
              color="blue"
            />
          </div>
        )}

        {/* ========== TABS ========== */}
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex gap-2">
          <TabButton
            active={tab === 'customers'}
            onClick={() => setTab('customers')}
            icon={<Users size={16} />}
            label="قرض مشتریان"
            count={customerLoans?.summary?.total_customers || 0}
            color="rose"
          />
          <TabButton
            active={tab === 'suppliers'}
            onClick={() => setTab('suppliers')}
            icon={<Truck size={16} />}
            label="قرض تأمین‌کنندگان"
            count={supplierLoans?.summary?.total_suppliers || 0}
            color="blue"
          />
        </div>

        {/* ========== SEARCH ========== */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-transparent focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-500/10 transition-all">
            <Search size={20} className="text-gray-400 ml-2 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={tab === 'customers'
                ? 'جستجو در نام یا شماره مشتری...'
                : 'جستجو در نام، شرکت یا شماره تأمین‌کننده...'}
              className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* ========== CONTENT ========== */}
        {loading ? (
          <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <Loader2 size={40} className="animate-spin text-orange-500" />
            <p className="text-gray-500 mt-4 text-sm">در حال بارگذاری...</p>
          </div>
        ) : tab === 'customers' ? (
          <CustomerLoansTab
            customers={filteredCustomers}
            onPay={(customer, invoice) => setPayCustomer({ customer, invoice })}
          />
        ) : (
          <SupplierLoansTab
            suppliers={filteredSuppliers}
            onPay={(supplier, product) => setPaySupplier({ supplier, product })}
          />
        )}

        {/* ========== PAY CUSTOMER MODAL ============ */}
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

        {/* ========== PAY SUPPLIER MODAL ========== */}
        {paySupplier && (
          <PayModal
            title="پرداخت به تأمین‌کننده"
            subtitle={paySupplier.supplier.supplier_name}
            meta={paySupplier.product.name}
            extra={paySupplier.product.barcode}
            total={Number(paySupplier.product.final_price)}
            paid={Number(paySupplier.product.paid_amount)}
            remaining={Number(paySupplier.product.remaining_amount)}
            currency={paySupplier.product.currency}
            exchangeRate={Number(paySupplier.product.exchange_rate) || 1}
            color="blue"
            onClose={() => setPaySupplier(null)}
            onSubmit={handlePaySupplier}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

/* ============================================================
   SUMMARY CARD
   ============================================================ */
function SummaryCard({ icon, label, value, valueAfn, valueUsd, color }) {
  const colors = {
    rose:   'bg-rose-50 text-rose-600',
    blue:   'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    emerald:'bg-emerald-50 text-emerald-600',
  };
  const textColors = {
    rose:   'text-rose-700',
    blue:   'text-blue-700',
    orange: 'text-orange-700',
    emerald:'text-emerald-700',
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
   TAB BUTTON
   ============================================================ */
function TabButton({ active, onClick, icon, label, count, color }) {
  const activeMap = {
    rose: 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/30',
    blue: 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30',
  };
  const badgeMap = {
    rose: active ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-700',
    blue: active ? 'bg-white/25 text-white' : 'bg-blue-100 text-blue-700',
  };

  return (
    <button
      onClick={onClick}
      className={`flex-1 px-5 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
        active ? activeMap[color] : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
      }`}
    >
      {icon}
      <span>{label}</span>
      <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${badgeMap[color]}`}>
        {count}
      </span>
    </button>
  );
}

/* ============================================================
   CUSTOMER LOANS TAB
   ============================================================ */
function CustomerLoansTab({ customers, onPay }) {
  if (!customers || customers.length === 0) {
    return (
      <EmptyState
        icon={<Users size={36} className="text-rose-400" />}
        bgColor="bg-rose-50"
        title="هیچ قرض مشتری یافت نشد"
        subtitle="همه مشتریان تسویه هستند"
      />
    );
  }

  return (
    <div className="space-y-3">
      {customers.map((c) => (
        <CustomerCard key={c.customer_id} customer={c} onPay={onPay} />
      ))}
    </div>
  );
}

function CustomerCard({ customer, onPay }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

      {/* HEADER */}
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div className="flex items-center gap-4 flex-1 min-w-0">
            {customer.customer_photo ? (
              <img
                src={customer.customer_photo}
                alt={customer.customer_name}
                className="w-14 h-14 rounded-xl object-cover ring-2 ring-rose-100 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-rose-500 to-orange-500 flex items-center justify-center text-white font-black text-xl shrink-0">
                {(customer.customer_name || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-800 truncate text-base">
                {customer.customer_name || 'مشتری نقدی'}
              </p>
              {customer.customer_phone && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 font-mono">
                  <Phone size={11} /> {customer.customer_phone}
                </p>
              )}
              <p className="text-[11px] text-gray-400 mt-1">
                {customer.invoices_count} فاکتور قرضی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-left">
              <p className="text-[10px] text-gray-400 font-bold mb-0.5">بدهی</p>
              <p className="text-xl font-black text-rose-700">
                {Number(customer.total_debt_afn).toLocaleString()}
                <span className="text-xs ml-1">AFN</span>
              </p>
              <p className="text-[11px] font-bold text-gray-500">
                $ {Number(customer.total_debt_usd).toLocaleString()}
              </p>
            </div>

            <button
              onClick={() => setOpen(!open)}
              className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors shrink-0"
            >
              {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
          <MiniStat label="جمع خرید قرضی" value={customer.total_loans} currency="AFN" color="gray" />
          <MiniStat label="پرداخت‌شده" value={customer.total_paid} currency="AFN" color="emerald" />
          <MiniStat label="باقی‌مانده" value={customer.total_debt} currency="AFN" color="rose" />
        </div>
      </div>

      {/* EXPANDED: INVOICES */}
      {open && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-2">
          {customer.invoices.map((inv) => (
            <InvoiceRow
              key={inv.id}
              invoice={inv}
              onPay={() => onPay(customer, inv)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InvoiceRow({ invoice, onPay }) {
  const isPaid = Number(invoice.remaining_amount) <= 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">

      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
          <FileText size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[11px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded">
              {invoice.invoice_number}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${PAYMENT_COLOR[invoice.payment_type]}`}>
              {PAYMENT_LABEL[invoice.payment_type]}
            </span>
            {invoice.sale_date && (
              <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                <Calendar size={10} /> {invoice.sale_date}
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-gray-800 mt-1 truncate">{invoice.product_name}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {invoice.qty_sold} × {invoice.sale_unit_name}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="text-left">
          <p className="text-[10px] text-gray-400 font-bold">باقی‌مانده</p>
          <p className={`font-black ${isPaid ? 'text-gray-400' : 'text-rose-700'}`}>
            {Number(invoice.remaining_amount).toLocaleString()}
            <span className="text-[10px] ml-1">{invoice.currency}</span>
          </p>
        </div>

        {!isPaid && (
          <button
            onClick={onPay}
            className="px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
          >
            <HandCoins size={13} /> پرداخت
          </button>
        )}

        {isPaid && (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
            تسویه شده
          </span>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   SUPPLIER LOANS TAB
   ============================================================ */
function SupplierLoansTab({ suppliers, onPay }) {
  if (!suppliers || suppliers.length === 0) {
    return (
      <EmptyState
        icon={<Truck size={36} className="text-blue-400" />}
        bgColor="bg-blue-50"
        title="هیچ قرض تأمین‌کننده یافت نشد"
        subtitle="همه تأمین‌کنندگان تسویه هستند"
      />
    );
  }

  return (
    <div className="space-y-3">
      {suppliers.map((s) => (
        <SupplierCard key={s.supplier_id} supplier={s} onPay={onPay} />
      ))}
    </div>
  );
}

function SupplierCard({ supplier, onPay }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

      {/* HEADER */}
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shrink-0">
              <Building2 size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-800 truncate text-base">
                {supplier.supplier_name || 'تأمین‌کننده'}
              </p>
              {supplier.supplier_company && (
                <p className="text-xs text-gray-600 mt-0.5">
                  {supplier.supplier_company}
                </p>
              )}
              {supplier.supplier_phone && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 font-mono">
                  <Phone size={11} /> {supplier.supplier_phone}
                </p>
              )}
              <p className="text-[11px] text-gray-400 mt-1">
                {supplier.products_count} محصول قرضی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-left">
              <p className="text-[10px] text-gray-400 font-bold mb-0.5">بدهی ما</p>
              <p className="text-xl font-black text-blue-700">
                {Number(supplier.total_debt_afn).toLocaleString()}
                <span className="text-xs ml-1">AFN</span>
              </p>
              <p className="text-[11px] font-bold text-gray-500">
                $ {Number(supplier.total_debt_usd).toLocaleString()}
              </p>
            </div>

            <button
              onClick={() => setOpen(!open)}
              className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors shrink-0"
            >
              {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
          <MiniStat label="جمع خرید" value={supplier.total_purchases} currency="AFN" color="gray" />
          <MiniStat label="پرداخت‌شده" value={supplier.total_paid} currency="AFN" color="emerald" />
          <MiniStat label="باقی‌مانده" value={supplier.total_debt} currency="AFN" color="blue" />
        </div>
      </div>

      {/* EXPANDED: PRODUCTS */}
      {open && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-2">
          {supplier.products.map((p) => (
            <ProductRow
              key={p.id}
              product={p}
              onPay={() => onPay(supplier, p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductRow({ product, onPay }) {
  const isPaid = Number(product.remaining_amount) <= 0;
  const curr = CURRENCY_LABEL[product.currency] || product.currency;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">

      <div className="flex items-center gap-3 min-w-0 flex-1">
        {product.photo_url ? (
          <img
            src={product.photo_url}
            alt={product.name}
            className="w-12 h-12 rounded-lg object-cover ring-1 ring-gray-200 shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Package size={20} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-800 truncate">{product.name}</p>
          {product.barcode && (
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">{product.barcode}</p>
          )}
          <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
            <span className="flex items-center gap-1">
              <Package size={10} /> {product.final_qty} {product.module_name}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="text-left">
          <p className="text-[10px] text-gray-400 font-bold">باقی‌مانده</p>
          <p className={`font-black ${isPaid ? 'text-gray-400' : 'text-blue-700'}`}>
            {Number(product.remaining_amount).toLocaleString()}
            <span className="text-[10px] ml-1">{curr}</span>
          </p>
        </div>

        {!isPaid && (
          <button
            onClick={onPay}
            className="px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all"
          >
            <HandCoins size={13} /> پرداخت
          </button>
        )}

        {isPaid && (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
            تسویه شده
          </span>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   MINI STAT
   ============================================================ */
function MiniStat({ label, value, currency, color }) {
  const colors = {
    gray:    'text-gray-700',
    emerald: 'text-emerald-700',
    rose:    'text-rose-700',
    blue:    'text-blue-700',
  };

  return (
    <div className="bg-gray-50 rounded-lg p-2.5 text-center">
      <p className="text-[10px] text-gray-400 font-bold mb-0.5">{label}</p>
      <p className={`text-sm font-black ${colors[color]}`}>
        {Number(value || 0).toLocaleString()}
        {currency && <span className="text-[9px] ml-1 opacity-75">{currency}</span>}
      </p>
    </div>
  );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */
function EmptyState({ icon, bgColor, title, subtitle }) {
  return (
    <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 text-center">
      <div className={`w-20 h-20 mx-auto rounded-full ${bgColor} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-gray-700 font-bold text-lg mb-1">{title}</p>
      <p className="text-sm text-gray-400">{subtitle}</p>
    </div>
  );
}

/* ============================================================
   PAY MODAL (used for both customer and supplier)
   ============================================================ */
function PayModal({
  title, subtitle, meta, extra,
  total, paid, remaining, currency, exchangeRate,
  color, onClose, onSubmit
}) {
  const [amount, setAmount] = useState(remaining);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const rate = Math.max(0.0001, Number(exchangeRate) || 1);
  const curr = String(currency || 'AFN').toUpperCase();

  const convertCurrency = (amt) => {
    if (curr === 'USD') {
      return {
        afn: Math.round(amt * rate * 100) / 100,
        usd: Math.round(amt * 100) / 100,
      };
    }
    return {
      afn: Math.round(amt * 100) / 100,
      usd: Math.round((amt / rate) * 100) / 100,
    };
  };

  const inputConv = convertCurrency(Number(amount) || 0);

  const submit = async () => {
    const amt = Number(amount) || 0;
    if (amt <= 0) { setError('مبلغ باید بزرگ‌تر از صفر باشد'); return; }
    if (amt > remaining) { setError(`حداکثر مبلغ قابل پرداخت ${remaining.toLocaleString()} است`); return; }

    setLoading(true);
    setError('');
    try {
      await onSubmit(amt);
    } catch (e) {
      setError(e.response?.data?.message || 'خطا');
    } finally {
      setLoading(false);
    }
  };

  const theme = {
    amber: {
      gradient: 'from-amber-500 to-orange-500',
      gradientHover: 'hover:from-amber-600 hover:to-orange-600',
      shadow: 'shadow-amber-500/30',
      bg50: 'bg-amber-50',
      border200: 'border-amber-200',
      text700: 'text-amber-700',
      text900: 'text-amber-900',
      focus: 'focus:border-amber-500 focus:ring-amber-500/10',
      btn100: 'bg-amber-100 hover:bg-amber-200',
    },
    blue: {
      gradient: 'from-blue-600 to-cyan-500',
      gradientHover: 'hover:from-blue-700 hover:to-cyan-600',
      shadow: 'shadow-blue-500/30',
      bg50: 'bg-blue-50',
      border200: 'border-blue-200',
      text700: 'text-blue-700',
      text900: 'text-blue-900',
      focus: 'focus:border-blue-500 focus:ring-blue-500/10',
      btn100: 'bg-blue-100 hover:bg-blue-200',
    },
  }[color];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* HEADER */}
        <div className={`bg-gradient-to-l ${theme.gradient} p-6 flex items-center justify-between`}>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <HandCoins size={22} /> {title}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">

          {/* INFO CARD */}
          <div className={`${theme.bg50} border ${theme.border200} rounded-2xl p-4 space-y-2`}>
            <p className={`font-bold ${theme.text900}`}>{subtitle}</p>
            {meta && (
              <p className={`text-xs ${theme.text700} font-mono`}>{meta}</p>
            )}
            {extra && (
              <p className={`text-xs ${theme.text700}`}>{extra}</p>
            )}

            <div className="mt-3 space-y-2 text-sm">
              <Row label="مبلغ کل:" value={`${Number(total).toLocaleString()} ${curr}`} />
              <Row label="پرداخت‌شده:" value={`${Number(paid).toLocaleString()} ${curr}`} color="emerald" />
              <Row label="باقی‌مانده:" value={`${remaining.toLocaleString()} ${curr}`} color="rose" />
            </div>
          </div>

          {/* AMOUNT */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">
              مبلغ پرداخت ({CURRENCY_LABEL[curr] || curr})
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              max={remaining}
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(''); }}
              className={`w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:bg-white focus:ring-4 transition-all text-center font-bold text-lg ${theme.focus}`}
              dir="ltr"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAmount(remaining)}
                className={`text-xs ${theme.btn100} ${theme.text700} font-bold px-3 py-1.5 rounded-lg`}
              >
                کل باقی‌مانده
              </button>
              <button
                type="button"
                onClick={() => setAmount(Math.round(remaining / 2))}
                className={`text-xs ${theme.btn100} ${theme.text700} font-bold px-3 py-1.5 rounded-lg`}
              >
                نصف
              </button>
            </div>

            <div className="mt-2 p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs">
              <Row label="معادل AFN:" value={`${inputConv.afn.toLocaleString()} AFN`} />
              <Row label="معادل USD:" value={`$ ${inputConv.usd.toLocaleString()}`} />
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex gap-2 text-rose-700 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ACTIONS */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={submit}
              disabled={loading}
              className={`flex-1 bg-gradient-to-r ${theme.gradient} ${theme.gradientHover} text-white font-bold py-3 rounded-xl shadow-lg ${theme.shadow} transition-all flex items-center justify-center gap-2 disabled:opacity-70`}
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> در حال ثبت...</>
              ) : 'ثبت پرداخت'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors"
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
   ROW helper
   ============================================================ */
function Row({ label, value, color, plain }) {
  const colorMap = {
    emerald: 'text-emerald-700',
    rose:    'text-rose-700',
    amber:   'text-amber-700',
    blue:    'text-blue-700',
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
      <b className={colorMap[color] || 'text-gray-800'}>{value}</b>
    </div>
  );
}