import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownToLine, Banknote, Boxes, CalendarDays, CircleDollarSign,
  HandCoins, Package, RefreshCw, ShoppingCart, TrendingUp, Users, Wallet,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const AFGHAN_MONTHS = [
  'حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله',
  'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت',
];

const persianFormatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'Asia/Kabul',
});

const formatCurrency = (value) => Number(value || 0).toLocaleString('en-US', {
  maximumFractionDigits: 2,
});

const displayValue = (value) => value == null ? '—' : formatCurrency(value);

const countInvoices = (sales) => new Set(
  sales.map((sale, index) => sale.invoice_number || `sale-${sale.id ?? index}`)
).size;

const mapWithConcurrency = async (items, limit, mapper) => {
  const results = Array(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      try {
        results[index] = { status: 'fulfilled', value: await mapper(items[index]) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};

const getPersianDate = (date) => {
  const parts = persianFormatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  return {
    key: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    label: `${day} ${AFGHAN_MONTHS[month - 1]}`,
    full: `${day} ${AFGHAN_MONTHS[month - 1]} ${year}`,
  };
};

const getPersianDateKey = (value) => {
  if (!value) return '';
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? '' : getPersianDate(date).key;
};

function MetricCard({ title, icon: Icon, tone, children, note, index = 0 }) {
  const tones = {
    orange: 'bg-orange-50 text-orange-600 ring-orange-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    blue: 'bg-blue-50 text-blue-600 ring-blue-100',
    rose: 'bg-rose-50 text-rose-600 ring-rose-100',
    violet: 'bg-violet-50 text-violet-600 ring-violet-100',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  };

  return (
    <article
      className="home-dashboard-card rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5"
      style={{ animationDelay: `${Math.min(index, 12) * 55}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-500">{title}</p>
          <div className="mt-3 space-y-1.5">{children}</div>
          {note && <p className="mt-3 text-[11px] leading-5 text-slate-400">{note}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${tones[tone]}`}>
          <Icon size={19} />
        </div>
      </div>
    </article>
  );
}

function CurrencyValues({ afn, usd, prominent = false }) {
  return (
    <>
      <p className={`${prominent ? 'text-xl sm:text-2xl' : 'text-base'} font-black leading-tight text-slate-800`}>
        {displayValue(afn)} <span className="text-[10px] font-bold text-slate-400">AFN</span>
      </p>
      <p className="text-xs font-bold text-slate-500">
        {displayValue(usd)} <span className="text-[10px] font-medium text-slate-400">USD</span>
      </p>
    </>
  );
}

function ChartCard({ title, description, icon: Icon, color, stroke, data, dataKey, emptyLabel, formatValue, unavailable }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
          <Icon size={17} />
        </div>
        <div>
          <h2 className="font-extrabold text-slate-800">{title}</h2>
          <p className="mt-1 text-[11px] text-slate-400">{description}</p>
        </div>
      </div>
      {unavailable ? (
        <div className="flex h-56 items-center justify-center rounded-xl bg-slate-50 text-sm font-medium text-slate-400">
          اطلاعات این نمودار دریافت نشد
        </div>
      ) : data.every((point) => point[dataKey] === 0) ? (
        <div className="flex h-56 items-center justify-center rounded-xl bg-slate-50 text-sm font-medium text-slate-400">
          {emptyLabel}
        </div>
      ) : (
        <div className="h-56 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={stroke} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#eef2f7" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={58}
                tickFormatter={formatValue}
              />
              <Tooltip
                contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }}
                formatter={(value) => [formatValue(value), title]}
                labelStyle={{ color: '#475569', fontWeight: 700 }}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={stroke}
                strokeWidth={2.5}
                fill={`url(#fill-${dataKey})`}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dashboard, setDashboard] = useState({
    sales: null,
    products: null,
    customers: null,
    stockEntries: null,
    capital: null,
    cash: null,
    loans: null,
  });
  const [failedSources, setFailedSources] = useState([]);

  useEffect(() => {
    let active = true;
    const fetchDashboard = async () => {
      setLoading(true);
      const endpoints = [
        ['sales', 'فروش‌ها', () => api.get('/sales')],
        ['products', 'محصولات', () => api.get('/products')],
        ['customers', 'مشتریان', () => api.get('/customers')],
        ['capital', 'سرمایه اجناس', () => api.get('/products/capital')],
        ['cash', 'سرمایه نقدی', () => api.get('/cash-capitals')],
        ['loans', 'قرض‌ها', () => api.get('/loans/summary')],
      ];
      const results = await Promise.allSettled(endpoints.map(([, , request]) => request()));
      if (!active) return;

      const next = {
        sales: null,
        products: null,
        customers: null,
        stockEntries: null,
        capital: null,
        cash: null,
        loans: null,
      };
      const failures = [];

      results.forEach((result, index) => {
        const [name, label] = endpoints[index];
        if (result.status === 'rejected') {
          failures.push(label);
          console.error(
            `Dashboard request failed (${label}, status ${result.reason?.response?.status || 'unknown'}):`,
            result.reason?.message
          );
          return;
        }

        const responseData = result.value.data?.data ?? result.value.data;
        if (name === 'sales' || name === 'products' || name === 'customers') {
          const list = Array.isArray(responseData)
            ? responseData
            : Array.isArray(responseData?.data) ? responseData.data : null;
          if (!list) {
            failures.push(label);
            console.error(`Dashboard returned an unexpected ${label} response shape.`);
            return;
          }
          next[name] = list;
        } else {
          next[name] = responseData;
        }
      });

      if (next.products) {
        const stockProducts = next.products.filter((product) => product.id);
        const productEntries = stockProducts.map((product) => ({
            date: product.stock_entry_date || product.created_at,
          }));
        const restockResults = await mapWithConcurrency(stockProducts, 6, (product) =>
          api.get(`/products/${product.id}/restocks`)
        );
        const restockEntries = [];
        let failedRestockRequests = 0;

        restockResults.forEach((result, index) => {
          if (result.status === 'rejected') {
            failedRestockRequests += 1;
            console.error(
              `Dashboard restock history request failed for product ${stockProducts[index].id}:`,
              result.reason?.response?.status || result.reason?.message
            );
            return;
          }

          const responseData = result.value.data?.data ?? result.value.data;
          if (!Array.isArray(responseData?.records)) {
            failedRestockRequests += 1;
            console.error(`Dashboard received an unexpected restock history response for product ${stockProducts[index].id}.`);
            return;
          }
          responseData.records.forEach((record) => {
            restockEntries.push({ date: record.stock_entry_date || record.created_at });
          });
        });

        if (failedRestockRequests > 0) {
          failures.push(`سوابق افزایش موجودی (${failedRestockRequests} محصول)`);
        } else {
          next.stockEntries = [...productEntries, ...restockEntries];
        }
      }

      setDashboard(next);
      setFailedSources(failures);
      setLoading(false);
    };

    fetchDashboard();
    return () => { active = false; };
  }, [refreshKey]);

  const today = getPersianDate(new Date());
  const chartData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - index));
      const persianDate = getPersianDate(date);
      return { ...persianDate, salesAfn: 0, salesUsd: 0, stockEntries: 0 };
    });
    const byDate = new Map(days.map((day) => [day.key, day]));

    (dashboard.sales || []).forEach((sale) => {
      const day = byDate.get(sale.sale_date);
      if (!day) return;
      day.salesAfn += Number(sale.total_price_afn) || 0;
      day.salesUsd += Number(sale.total_price_usd) || 0;
    });

    (dashboard.stockEntries || []).forEach((entry) => {
      const key = getPersianDateKey(entry.date);
      const day = byDate.get(key);
      if (day) day.stockEntries += 1;
    });

    return days;
  }, [dashboard.sales, dashboard.stockEntries]);

  const metrics = useMemo(() => {
    const salesToday = dashboard.sales
      ? dashboard.sales.filter((sale) => sale.sale_date === today.key)
      : null;
    const cashToday = salesToday?.reduce((sum, sale) => ({
      afn: sum.afn + (Number(sale.paid_amount_afn) || 0),
      usd: sum.usd + (Number(sale.paid_amount_usd) || 0),
    }), { afn: 0, usd: 0 }) || null;
    const grossSalesToday = salesToday?.reduce((sum, sale) => ({
      afn: sum.afn + (Number(sale.total_price_afn) || 0),
      usd: sum.usd + (Number(sale.total_price_usd) || 0),
    }), { afn: 0, usd: 0 }) || null;
    const loanSalesToday = salesToday?.reduce((sum, sale) => ({
      afn: sum.afn + (Number(sale.remaining_amount_afn) || 0),
      usd: sum.usd + (Number(sale.remaining_amount_usd) || 0),
    }), { afn: 0, usd: 0 }) || null;

    const stockAfn = dashboard.capital?.freezed_capital_afn == null
      ? null : Number(dashboard.capital.freezed_capital_afn);
    const stockUsd = dashboard.capital?.freezed_capital_usd == null
      ? null : Number(dashboard.capital.freezed_capital_usd);
    const cashAfn = dashboard.cash?.totals?.afn == null
      ? null : Number(dashboard.cash.totals.afn);
    const cashUsd = dashboard.cash?.totals?.usd == null
      ? null : Number(dashboard.cash.totals.usd);
    const customerLoans = dashboard.loans?.customers || {};
    const supplierLoans = dashboard.loans?.suppliers || {};
    const sumIfAvailable = (left, right) => left == null || right == null ? null : left + right;

    return {
      salesToday,
      salesTodayCount: salesToday ? countInvoices(salesToday) : null,
      cashToday,
      grossSalesToday,
      loanSalesToday,
      stockAfn,
      stockUsd,
      cashAfn,
      cashUsd,
      totalCapitalAfn: sumIfAvailable(stockAfn, cashAfn),
      totalCapitalUsd: sumIfAvailable(stockUsd, cashUsd),
      customerDebtAfn: customerLoans.total_debt_afn == null ? null : Number(customerLoans.total_debt_afn),
      customerDebtUsd: customerLoans.total_debt_usd == null ? null : Number(customerLoans.total_debt_usd),
      supplierDebtAfn: supplierLoans.total_debt_afn == null ? null : Number(supplierLoans.total_debt_afn),
      supplierDebtUsd: supplierLoans.total_debt_usd == null ? null : Number(supplierLoans.total_debt_usd),
    };
  }, [dashboard, today.key]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-5 pb-8" dir="rtl">
        <style>{`
          @keyframes home-card-enter {
            from { opacity: 0; translate: 0 8px; }
            to { opacity: 1; translate: 0 0; }
          }
          .home-dashboard-card {
            animation: home-card-enter 420ms ease-out both;
            transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
          }
          .home-dashboard-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 26px -16px rgba(15, 23, 42, 0.35);
            border-color: #fed7aa;
          }
          @media (prefers-reduced-motion: reduce) {
            .home-dashboard-card { animation: none; transition: none; }
          }
        `}</style>

        {failedSources.length > 0 && (
          <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium leading-5 text-amber-800">
            دریافت اطلاعات این بخش‌ها ناموفق بود: {failedSources.join('، ')}. مقادیر نامشخص با خط تیره نشان داده شده‌اند؛ برای تلاش دوباره «بروزرسانی» را بزنید.
          </div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-100 bg-white text-sm font-bold text-slate-500 shadow-sm">
            <RefreshCw size={19} className="ml-2 animate-spin text-orange-500" />
            در حال دریافت آمار تجارت...
          </div>
        ) : (
          <>
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-black text-slate-800">آمار امروز</h2>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
                    <CalendarDays size={14} className="text-orange-500" />
                    {today.full}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRefreshKey((key) => key + 1)}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    بروزرسانی
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="مجموع فروش امروز" icon={ShoppingCart} tone="orange" note={`${displayValue(metrics.salesTodayCount)} فاکتور؛ شامل فروش نقدی و قرض`} index={0}>
                  <CurrencyValues afn={metrics.grossSalesToday?.afn} usd={metrics.grossSalesToday?.usd} prominent />
                </MetricCard>
                <MetricCard title="پول دریافت‌شده امروز" icon={Banknote} tone="emerald" note="فقط پرداخت‌های ثبت‌شده؛ قرض باقی‌مانده جدا است" index={1}>
                  <CurrencyValues afn={metrics.cashToday?.afn} usd={metrics.cashToday?.usd} prominent />
                </MetricCard>
                <MetricCard title="قرض فروش‌های امروز" icon={HandCoins} tone="rose" note="ماندهٔ پرداخت‌نشده از فروش‌های همین روز" index={2}>
                  <CurrencyValues afn={metrics.loanSalesToday?.afn} usd={metrics.loanSalesToday?.usd} prominent />
                </MetricCard>
                <MetricCard title="فاکتورهای امروز" icon={CalendarDays} tone="blue" note="تعداد فاکتورهای یکتای ثبت‌شده امروز" index={3}>
                  <p className="text-2xl font-black text-slate-800">{displayValue(metrics.salesTodayCount)}</p>
                </MetricCard>
              </div>
            </section>

            <section>
              <div className="mb-3">
                <h2 className="font-black text-slate-800">وضعیت تجارت</h2>
                <p className="mt-1 text-[11px] text-slate-400">موجودی، سرمایه، مشتریان و قرض‌ها</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="تعداد محصولات" icon={Package} tone="orange" note="محصولات ثبت‌شده در گدام" index={4}>
                  <p className="text-2xl font-black text-slate-800">{displayValue(dashboard.products?.length)}</p>
                </MetricCard>
                <MetricCard title="تعداد فاکتورهای فروش" icon={ShoppingCart} tone="emerald" note={`${displayValue(metrics.salesTodayCount)} فاکتور امروز`} index={5}>
                  <p className="text-2xl font-black text-slate-800">{displayValue(dashboard.sales ? countInvoices(dashboard.sales) : null)}</p>
                </MetricCard>
                <MetricCard title="مشتریان" icon={Users} tone="violet" note="تعداد مشتریان ثبت‌شده" index={6}>
                  <p className="text-2xl font-black text-slate-800">{displayValue(dashboard.customers?.length)}</p>
                </MetricCard>
                <MetricCard title="سرمایه نقدی فعلی" icon={Banknote} tone="blue" note="موجودی حساب نقدی ثبت‌شده" index={7}>
                  <CurrencyValues afn={metrics.cashAfn} usd={metrics.cashUsd} prominent />
                </MetricCard>
                <MetricCard title="ارزش اجناس موجود" icon={Package} tone="orange" note="بهای خرید موجودی فعلی" index={8}>
                  <CurrencyValues afn={metrics.stockAfn} usd={metrics.stockUsd} />
                </MetricCard>
                <MetricCard title="سرمایه نقدی + موجودی" icon={Boxes} tone="emerald" note="AFN و USD جداگانه، بدون تبدیل ارز" index={9}>
                  <CurrencyValues afn={metrics.totalCapitalAfn} usd={metrics.totalCapitalUsd} />
                </MetricCard>
                <MetricCard title="قرض مشتریان" icon={HandCoins} tone="rose" note="طلب باقی‌مانده از مشتریان" index={10}>
                  <CurrencyValues afn={metrics.customerDebtAfn} usd={metrics.customerDebtUsd} />
                </MetricCard>
                <MetricCard title="قرض تأمین‌کنندگان" icon={Wallet} tone="slate" note="بدهی باقی‌مانده به تأمین‌کنندگان" index={11}>
                  <CurrencyValues afn={metrics.supplierDebtAfn} usd={metrics.supplierDebtUsd} />
                </MetricCard>
                <MetricCard title="سرمایه آزادشده از فروش" icon={ArrowDownToLine} tone="emerald" note="بهای خرید اجناس فروخته‌شده" index={12}>
                  <CurrencyValues afn={dashboard.capital?.released_capital_afn} usd={dashboard.capital?.released_capital_usd} />
                </MetricCard>
                <MetricCard title="سود ثبت‌شده" icon={TrendingUp} tone="orange" note="بر اساس گزارش سرمایه تجارت" index={13}>
                  <CurrencyValues afn={dashboard.capital?.total_profit_afn} usd={dashboard.capital?.total_profit_usd} />
                </MetricCard>
              </div>
            </section>
          </>
        )}

        {!loading && (
          <>
            <section>
              <div className="mb-3">
                <h2 className="font-black text-slate-800">روند ۱۴ روز اخیر</h2>
                <p className="mt-1 text-[11px] text-slate-400">تاریخ‌ها بر اساس تقویم شمسی افغانستان</p>
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <ChartCard
                  title="فروش‌های روزانه (AFN)"
                  description="مبلغ کل فروش روزانه؛ شامل فروش نقدی و قرض"
                  icon={CircleDollarSign}
                  color="bg-orange-50 text-orange-600"
                  stroke="#f97316"
                  data={chartData}
                  dataKey="salesAfn"
                  emptyLabel="در این بازه فروش AFN ثبت نشده است"
                  unavailable={!dashboard.sales}
                  formatValue={(value) => `${formatCurrency(value)} AFN`}
                />
                <ChartCard
                  title="فروش‌های روزانه (USD)"
                  description="مبلغ کل فروش به دالر بر اساس تاریخ فروش"
                  icon={CircleDollarSign}
                  color="bg-emerald-50 text-emerald-600"
                  stroke="#10b981"
                  data={chartData}
                  dataKey="salesUsd"
                  emptyLabel="در این بازه فروش USD ثبت نشده است"
                  unavailable={!dashboard.sales}
                  formatValue={(value) => `${formatCurrency(value)} USD`}
                />
                <ChartCard
                  title="ورود موجودی به گدام"
                  description="تعداد ثبت اولیهٔ محصول و دفعات افزایش موجودی؛ هر رویداد یک شمارش دارد"
                  icon={Boxes}
                  color="bg-sky-50 text-sky-600"
                  stroke="#0ea5e9"
                  data={chartData}
                  dataKey="stockEntries"
                  emptyLabel="در این بازه ورود یا افزایش موجودی ثبت نشده است"
                  unavailable={!dashboard.stockEntries}
                  formatValue={formatCurrency}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-black text-slate-800">دسترسی سریع</h2>
                  <p className="mt-1 text-[11px] text-slate-400">به بخش‌های پرکاربرد گدام بروید</p>
                </div>
                <Activity size={18} className="text-orange-500" />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { to: '/sales', label: 'ثبت فروش', icon: ShoppingCart, tone: 'text-orange-600 bg-orange-50 hover:bg-orange-100' },
                  { to: '/products', label: 'افزودن محصول', icon: Package, tone: 'text-sky-600 bg-sky-50 hover:bg-sky-100' },
                  { to: '/capital', label: 'مدیریت سرمایه', icon: Wallet, tone: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
                  { to: '/loans', label: 'پیگیری قرض‌ها', icon: HandCoins, tone: 'text-rose-600 bg-rose-50 hover:bg-rose-100' },
                ].map(({ to, label, icon: Icon, tone }) => (
                  <Link key={to} to={to} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-extrabold transition ${tone}`}>
                    <Icon size={16} /> {label}
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
