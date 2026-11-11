
import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, TrendingUp, DollarSign, Package, ShoppingCart,
  Activity, Loader2, Wallet, HandCoins, Boxes,
  ArrowDownToLine
} from 'lucide-react';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: 'application/json' }
});

api.interceptors.request.use((c) => {
  const t = sessionStorage.getItem('auth_token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

// نمایش عدد اصلی با جداکننده هزارگان، بدون K و M
const formatCurrency = (val) =>
  Number(val || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: true
  });

// برای تمام قسمت‌های داشبورد از همین تابع استفاده می‌شود
const formatShortCurrency = (val) => formatCurrency(val);

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [capitalData, setCapitalData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salesRes, capitalRes] = await Promise.all([
          api.get('/sales').catch(() => ({ data: [] })),
          api.get('/products/capital').catch(() => null)
        ]);

        const rawSales = salesRes.data?.data || salesRes.data;
        setSales(Array.isArray(rawSales) ? rawSales : []);

        if (capitalRes?.data) {
          const rawCapital = capitalRes.data?.data || capitalRes.data;
          setCapitalData(rawCapital);
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalRemaining = 0;
    let calculatedProfit = 0;

    sales.forEach(s => {
      totalRevenue += Number(s.total_price_afn) || 0;
      totalRemaining += Number(s.remaining_amount_afn) || 0;
      calculatedProfit += Number(s.profit) || 0;
    });

    const finalCapitalAfn =
      Number(capitalData?.freezed_capital_afn) || 0;

    const finalCapitalUsd =
      Number(capitalData?.freezed_capital_usd) || 0;

    const finalReleasedAfn =
      Number(capitalData?.released_capital_afn) || 0;

    const finalReleasedUsd =
      Number(capitalData?.released_capital_usd) || 0;

    const finalProfitAfn =
      capitalData?.total_profit_afn !== undefined
        ? Number(capitalData.total_profit_afn)
        : calculatedProfit;

    const finalProfitUsd =
      capitalData?.total_profit_usd !== undefined
        ? Number(capitalData.total_profit_usd)
        : 0;

    return {
      totalRevenue,
      totalRemaining,
      totalCapitalAfn: finalCapitalAfn,
      totalCapitalUsd: finalCapitalUsd,
      releasedCapitalAfn: finalReleasedAfn,
      releasedCapitalUsd: finalReleasedUsd,
      totalProfitAfn: finalProfitAfn,
      totalProfitUsd: finalProfitUsd
    };
  }, [sales, capitalData]);

  const chartData = useMemo(() => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const revenueByMonth = Array(6).fill(0);
    const profitByMonth = Array(6).fill(0);
    const labels = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      labels.push(months[d.getMonth()]);
    }

    sales.forEach(s => {
      const dateStr = s.created_at || s.sale_date;
      if (!dateStr) return;

      const d = new Date(dateStr);

      const monthDiff =
        (currentYear - d.getFullYear()) * 12 +
        (currentMonth - d.getMonth());

      if (monthDiff >= 0 && monthDiff < 6) {
        const idx = 5 - monthDiff;
        revenueByMonth[idx] += Number(s.total_price_afn) || 0;
        profitByMonth[idx] += Number(s.profit) || 0;
      }
    });

    const maxVal = Math.max(
      ...revenueByMonth,
      ...profitByMonth,
      1000
    );

    return {
      labels,
      revenue: revenueByMonth,
      profit: profitByMonth,
      maxVal
    };
  }, [sales]);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              نمای کلی داشبورد
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              خلاصه وضعیت فروش، سود و موجودی گدام
            </p>
          </div>

          <button className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center gap-2">
            <Plus size={18} />
            گزارش جدید
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Loader2 size={40} className="animate-spin text-orange-500 mb-4" />
            <p className="text-gray-500 font-bold">
              در حال بارگذاری اطلاعات داشبورد...
            </p>
          </div>
        ) : (
          <>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

              {/* TOTAL REVENUE */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 text-xs font-bold mb-1">
                      کل فروش (دخل)
                    </p>
                    <h3 className="text-2xl font-black text-gray-800">
                      {formatCurrency(metrics.totalRevenue)}
                      <span className="text-xs text-gray-500 font-normal mr-1">AFN</span>
                    </h3>
                    <div className="flex items-center gap-1 mt-2 text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-1 rounded w-fit">
                      <TrendingUp size={12} /> مجموع فروشات
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-white">
                    <DollarSign size={22} />
                  </div>
                </div>
              </div>

              {/* TOTAL PROFIT */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 text-xs font-bold mb-1">
                      سود خالص ثبت‌شده
                    </p>
                    <h3 className="text-2xl font-black text-gray-800">
                      {formatCurrency(metrics.totalProfitAfn)}
                      <span className="text-xs text-gray-500 font-normal mr-1">AFN</span>
                    </h3>
                    <p className="text-[10px] text-gray-500 font-bold mt-1">
                      $ {formatCurrency(metrics.totalProfitUsd)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                    <TrendingUp size={22} />
                  </div>
                </div>
              </div>

              {/* CURRENT CAPITAL */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-200 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 text-xs font-bold mb-1">
                      سرمایه موجود در گدام
                    </p>
                    <h3 className="text-2xl font-black text-gray-800">
                      {formatCurrency(metrics.totalCapitalAfn)}
                      <span className="text-xs text-gray-500 font-normal mr-1">AFN</span>
                    </h3>
                    <p className="text-[10px] text-gray-500 font-bold mt-1">
                      $ {formatCurrency(metrics.totalCapitalUsd)}
                    </p>
                    <div className="mt-2 text-[10px] text-orange-600 bg-orange-50 px-2 py-1 rounded w-fit font-bold">
                      بهای خرید موجودی فعلی
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white">
                    <Boxes size={22} />
                  </div>
                </div>
              </div>

              {/* RELEASED CAPITAL */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-200 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 text-xs font-bold mb-1">
                      سرمایه آزادشده از فروش
                    </p>
                    <h3 className="text-2xl font-black text-gray-800">
                      {formatCurrency(metrics.releasedCapitalAfn)}
                      <span className="text-xs text-gray-500 font-normal mr-1">AFN</span>
                    </h3>
                    <p className="text-[10px] text-gray-500 font-bold mt-1">
                      $ {formatCurrency(metrics.releasedCapitalUsd)}
                    </p>
                    <div className="mt-2 text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit font-bold">
                      بهای خرید اجناس فروخته‌شده
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-sky-500 flex items-center justify-center text-white">
                    <ArrowDownToLine size={22} />
                  </div>
                </div>
              </div>

              {/* CUSTOMER DEBT */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 text-xs font-bold mb-1">
                      بدهی مشتریان (قرض)
                    </p>
                    <h3 className="text-2xl font-black text-gray-800">
                      {formatCurrency(metrics.totalRemaining)}
                      <span className="text-xs text-gray-500 font-normal mr-1">AFN</span>
                    </h3>
                    <div className="flex items-center gap-1 mt-2 text-rose-600 text-[10px] font-bold bg-rose-50 px-2 py-1 rounded w-fit">
                      <HandCoins size={12} /> نیاز به پیگیری
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-rose-500 flex items-center justify-center text-white">
                    <Wallet size={22} />
                  </div>
                </div>
              </div>

            </div>

            {/* CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* BAR CHART */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <Activity size={18} className="text-orange-500" />
                      نمودار فروش و سود
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      عملکرد ۶ ماه اخیر
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                      فروش
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                      سود
                    </div>
                  </div>
                </div>

                <div className="h-64 flex items-end justify-between gap-2 md:gap-4 pt-4 border-b border-gray-200 pb-2">
                  {chartData.labels.map((label, idx) => {
                    const revHeight = chartData.maxVal > 0
                      ? (chartData.revenue[idx] / chartData.maxVal) * 100
                      : 0;

                    const profHeight = chartData.maxVal > 0
                      ? (chartData.profit[idx] / chartData.maxVal) * 100
                      : 0;

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group">
                        <div className="relative w-full flex justify-center items-end h-full gap-1">
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                            فروش: {formatCurrency(chartData.revenue[idx])}
                            <br />
                            سود: {formatCurrency(chartData.profit[idx])}
                          </div>

                          <div
                            className="w-full max-w-[20px] bg-orange-500 rounded-t-sm transition-all duration-500 hover:bg-orange-600"
                            style={{ height: `${Math.max(revHeight, 2)}%` }}
                          />

                          <div
                            className="w-full max-w-[20px] bg-emerald-500 rounded-t-sm transition-all duration-500 hover:bg-emerald-600"
                            style={{ height: `${Math.max(profHeight, 2)}%` }}
                          />
                        </div>

                        <span className="text-[10px] md:text-xs font-bold text-gray-500">
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STOCK LINE CHART */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Package size={18} className="text-blue-500" />
                    شاخص سرمایه موجود
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    سرمایه فعلی موجود در گدام
                  </p>
                </div>

                <div className="h-64 relative flex flex-col items-center justify-center">
                  <Boxes size={35} className="text-blue-500 mb-3" />
                  <p className="text-3xl font-black text-gray-800">
                    {formatCurrency(metrics.totalCapitalAfn)}
                  </p>
                  <span className="text-xs text-gray-400 mt-1">AFN</span>
                  <p className="text-xs text-gray-400 mt-3">
                    ارزش خرید موجودی فعلی
                  </p>
                </div>
              </div>

            </div>

            {/* RECENT SALES */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <ShoppingCart size={18} className="text-orange-500" />
                  آخرین فروشات
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-gray-50 text-xs font-bold text-gray-500">
                    <tr>
                      <th className="px-5 py-3">شماره فاکتور</th>
                      <th className="px-5 py-3">مشتری</th>
                      <th className="px-5 py-3">محصول</th>
                      <th className="px-5 py-3">مبلغ</th>
                      <th className="px-5 py-3">وضعیت</th>
                      <th className="px-5 py-3">تاریخ</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 text-sm">
                    {sales.slice(0, 5).map((sale, idx) => (
                      <tr key={sale.id || idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs font-bold text-gray-700">
                          {sale.invoice_number}
                        </td>

                        <td className="px-5 py-3 font-bold text-gray-800">
                          {sale.customer_name || 'مشتری نقدی'}
                        </td>

                        <td className="px-5 py-3 text-gray-600">
                          {sale.product_name}
                        </td>

                        <td className="px-5 py-3 font-bold text-gray-800">
                          {formatCurrency(sale.total_price_afn)}
                          <span className="text-[10px] mr-1">AFN</span>
                        </td>

                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold ${
                            sale.payment_type === 'cash'
                              ? 'bg-emerald-50 text-emerald-700'
                              : sale.payment_type === 'loan_full'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {sale.payment_type === 'cash'
                              ? 'نقد'
                              : sale.payment_type === 'loan_full'
                              ? 'قرض کامل'
                              : 'قرض جزئی'}
                          </span>
                        </td>

                        <td className="px-5 py-3 text-xs text-gray-500">
                          {sale.sale_date || '—'}
                        </td>
                      </tr>
                    ))}

                    {sales.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-5 py-8 text-center text-gray-400 font-bold">
                          هیچ فروشی ثبت نشده است
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </>
        )}
      </div>
    </DashboardLayout>
  );
}
