import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Package, Boxes, Layers, X, RefreshCw,
  TrendingUp, AlertCircle, Tag, Warehouse,
  Grid3x3, List, Info, DollarSign
} from 'lucide-react';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import Toast from '../components/Toast';

// ============ API ============
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const api = axios.create({ baseURL: API_BASE_URL, headers: { Accept: 'application/json' } });
api.interceptors.request.use((c) => {
  const t = sessionStorage.getItem('auth_token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

// ============ PRICE MODE COLORS ============
const PRICE_MODE_COLORS = {
  module:         'bg-blue-100 text-blue-700',
  sub_module:     'bg-cyan-100 text-cyan-700',
  sub_sub_module: 'bg-emerald-100 text-emerald-700',
};

// ============ CALCULATION LOGIC (FIXED FOR YOUR REQUEST) ============
function calculateStock(product) {
  const subStock = Number(product.sub_module?.stock || 0); // عدد 285
  
  let ratio = 10; 
  if (product.packaging_description) {
    const normalized = String(product.packaging_description).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
    const match = normalized.match(/(\d+)\s*[^\d=]+=\s*(\d+)/);
    if (match && parseInt(match[1]) > 0) {
      ratio = Math.round(parseInt(match[2]) / parseInt(match[1])); 
    }
  }

  // 285 / 10 = 28.5
  const cartonsDecimal = subStock / ratio; 
  
  return {
    cartonsDecimal: cartonsDecimal, // نمایش 28.5 در کارتن
    bottles: subStock, // نمایش 285 در بوتل (همون دیتای خام)
    ratio
  };
}

export default function Stock() {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const fetchStock = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/products-stock');
      setStock(data);
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: 'خطا در دریافت موجودی', type: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStock(); }, []);

  /* -------- unique lists for filters -------- */
  const suppliers = useMemo(() => {
    const set = new Set();
    stock.forEach(s => { if (s.supplier) set.add(s.supplier); });
    return [...set].sort();
  }, [stock]);

  const categories = useMemo(() => {
    const set = new Set();
    stock.forEach(s => { if (s.category) set.add(s.category); });
    return [...set].sort();
  }, [stock]);

  const productNames = useMemo(() => {
    const set = new Set();
    stock.forEach(s => { if (s.name) set.add(s.name); });
    return [...set].sort();
  }, [stock]);

  /* -------- filtering -------- */
  const filtered = useMemo(() => {
    let list = stock;

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter(p =>
        p.name?.toLowerCase().includes(s) ||
        p.supplier?.toLowerCase().includes(s) ||
        p.barcode?.toLowerCase().includes(s)
      );
    }
    if (supplierFilter) list = list.filter(p => p.supplier === supplierFilter);
    if (categoryFilter) list = list.filter(p => p.category === categoryFilter);
    if (nameFilter)     list = list.filter(p => p.name === nameFilter);

    return list;
  }, [stock, search, supplierFilter, categoryFilter, nameFilter]);

  /* -------- totals -------- */
  const totals = useMemo(() => filtered.reduce((acc, p) => {
    const calc = calculateStock(p);
    acc.modules  += calc.cartonsDecimal;
    acc.subs     += calc.bottles;
    acc.subSubs  += Number(p.sub_sub_module?.stock || 0);
    acc.products += 1;
    return acc;
  }, { modules: 0, subs: 0, subSubs: 0, products: 0 }), [filtered]);

  const resetFilters = () => {
    setSearch('');
    setSupplierFilter('');
    setCategoryFilter('');
    setNameFilter('');
  };

  const hasFilter = search || supplierFilter || categoryFilter || nameFilter;

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

        {/* ============ HEADER ============ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Warehouse size={22} />
              </div>
              موجودی محصولات
            </h1>
            <p className="text-sm text-gray-500 mt-2 mr-1">
              عکس، موجودی، توضیح بسته‌بندی و نحوه‌ی قیمت‌گذاری
            </p>
          </div>

          <button
            onClick={fetchStock}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} /> بازخوانی
          </button>
        </div>

        {/* ============ KPI ============ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={<Package size={18} />} label="تعداد محصولات" value={totals.products} color="blue" />

        </div>

        {/* ============ FILTERS ============ */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-transparent focus-within:border-emerald-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all flex-1 min-w-[220px]">
              <Search size={20} className="text-gray-400 ml-2 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو در نام، بارکد یا تامین‌کننده..."
                className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400"
              />
            </div>

            <select
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-emerald-300 cursor-pointer max-w-[200px]"
            >
              <option value="">همه محصولات</option>
              {productNames.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>

            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-emerald-300 cursor-pointer"
            >
              <option value="">همه تامین‌کننده‌ها</option>
              {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-emerald-300 cursor-pointer"
            >
              <option value="">همه دسته‌ها</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
                title="نمایش کارتی"
              >
                <Grid3x3 size={16} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'table' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
                title="نمایش جدولی"
              >
                <List size={16} />
              </button>
            </div>

            {hasFilter && (
              <button
                onClick={resetFilters}
                className="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors flex items-center gap-2 justify-center"
              >
                <X size={14} /> پاک کردن
              </button>
            )}
          </div>
        </div>

        {/* ============ CONTENT ============ */}
        {loading ? (
          <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
            <p className="text-gray-500 mt-4 text-sm">در حال بارگذاری...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <Warehouse size={36} className="text-emerald-400" />
            </div>
            <p className="text-gray-700 font-bold text-lg mb-1">هیچ محصولی یافت نشد</p>
            <p className="text-sm text-gray-400">
              {hasFilter ? 'فیلترها را تغییر بده' : 'هنوز محصولی اضافه نشده'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <StockCard key={p.id} product={p} onOpen={() => setSelected(p)} />
            ))}
          </div>
        ) : (
          <TableView products={filtered} onOpen={setSelected} />
        )}

        {/* ============ MODAL ============ */}
        {selected && (
          <StockDetailsModal product={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </DashboardLayout>
  );
}

/* ============================================================
   KPI CARD
   ============================================================ */
function KpiCard({ icon, label, value, color }) {
  const colors = {
    blue:    'bg-blue-50 text-blue-600',
    cyan:    'bg-cyan-50 text-cyan-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };
  const textColors = {
    blue:    'text-blue-700',
    cyan:    'text-cyan-700',
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
      <p className={`text-2xl font-black ${textColors[color]}`}>
        {Number.isInteger(value) ? Number(value).toLocaleString() : Number(value).toFixed(1)}
      </p>
    </div>
  );
}

/* ============================================================
   STOCK CARD
   ============================================================ */
function StockCard({ product, onOpen }) {
  const calc = calculateStock(product);
  const isOutOfStock = calc.bottles === 0;

  return (
    <div
      onClick={onOpen}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer group"
    >
      {/* Photo header */}
      <div className="relative h-44 bg-gradient-to-br from-emerald-50 to-teal-50 overflow-hidden">
        {product.photo_url ? (
          <img
            src={product.photo_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center font-bold text-3xl shadow-lg shadow-emerald-500/20">
              {product.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        {product.category && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-lg text-[10px] font-bold text-emerald-700 flex items-center gap-1 shadow-sm">
            <Tag size={10} /> {product.category}
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute top-3 left-3 bg-rose-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-lg">
            <AlertCircle size={10} /> ناموجود
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">

        <div>
          <p className="font-bold text-gray-800 truncate group-hover:text-emerald-700 transition-colors">
            {product.name}
          </p>
          {product.supplier && (
            <p className="text-[11px] text-gray-500 mt-0.5 truncate">
              {product.supplier}
            </p>
          )}
        </div>

        {/* Packaging description */}
        <div className="bg-gradient-to-br from-gray-50 to-emerald-50/40 border border-gray-100 rounded-xl p-3">
          <p className="text-[10px] text-gray-500 font-bold mb-1 flex items-center gap-1">
            <Info size={10} /> بسته‌بندی
          </p>
          <p className="text-[11px] text-gray-700 font-bold leading-relaxed">
            {product.packaging_description || '—'}
          </p>
        </div>

        {/* Units summary */}
        <div className="grid grid-cols-3 gap-2">
          <MiniUnit
            icon={<Boxes size={12} />}
            label={product.module?.name}
            value={calc.cartonsDecimal} // نمایش 28.5
            color="blue"
            isDecimal={true}
          />
          {product.sub_module ? (
            <MiniUnit
              icon={<Layers size={12} />}
              label={product.sub_module.name}
              value={calc.bottles} // نمایش 285
              color="cyan"
            />
          ) : <div />}
          {product.sub_sub_module ? (
            <MiniUnit
              icon={<Package size={12} />}
              label={product.sub_sub_module.name}
              value={product.sub_sub_module.stock}
              color="emerald"
            />
          ) : <div />}
        </div>

        {/* Price + Price mode */}
        {product.price != null && (
          <div className="pt-2 border-t border-gray-100 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500 font-bold">قیمت</span>
              <span className="text-sm font-black text-emerald-700">
                {Number(product.price).toLocaleString()}{' '}
                <span className="text-[10px]">{product.currency}</span>
              </span>
            </div>

            {product.price_mode_text && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-bold flex items-center gap-1">
                  <DollarSign size={10} /> بر اساس
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  PRICE_MODE_COLORS[product.price_mode] || 'bg-gray-100 text-gray-700'
                }`}>
                  {product.price_unit_name}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   MINI UNIT
   ============================================================ */
function MiniUnit({ icon, label, value, color, isDecimal }) {
  const colors = {
    blue:    'bg-blue-50 text-blue-700 border-blue-100',
    cyan:    'bg-cyan-50 text-cyan-700 border-cyan-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  };
  const c = colors[color] || colors.blue;

  return (
    <div className={`${c} rounded-lg p-2 border text-center`}>
      <div className="flex items-center justify-center gap-1 text-[9px] font-bold mb-0.5">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="text-sm font-black">
        {isDecimal && value % 1 !== 0 ? value.toFixed(1) : Number(value || 0).toLocaleString()}
      </div>
    </div>
  );
}

/* ============================================================
   TABLE VIEW
   ============================================================ */
function TableView({ products, onOpen }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px]">
          <thead>
            <tr className="bg-gradient-to-l from-emerald-50/70 to-teal-50/50 border-b-2 border-emerald-100">
              <th className="text-right px-4 py-4 text-xs font-bold text-gray-600 w-14">#</th>
              <th className="text-right px-4 py-4 text-xs font-bold text-gray-600">محصول</th>
              <th className="text-right px-4 py-4 text-xs font-bold text-gray-600">دسته</th>
              <th className="text-right px-4 py-4 text-xs font-bold text-gray-600">تامین‌کننده</th>
              <th className="text-right px-4 py-4 text-xs font-bold text-gray-600">بسته‌بندی</th>
              <th className="text-right px-4 py-4 text-xs font-bold text-gray-600">قیمت</th>
              <th className="text-right px-4 py-4 text-xs font-bold text-gray-600">بر اساس</th>
              <th className="text-right px-4 py-4 text-xs font-bold text-gray-600">واحد اصلی</th>
              <th className="text-right px-4 py-4 text-xs font-bold text-gray-600">زیر واحد</th>
              <th className="text-right px-4 py-4 text-xs font-bold text-gray-600">زیر واحد دوم</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((p, i) => {
              const calc = calculateStock(p);
              return (
                <tr
                  key={p.id}
                  onClick={() => onOpen(p)}
                  className="hover:bg-emerald-50/40 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold">
                      {i + 1}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {p.photo_url ? (
                        <img
                          src={p.photo_url}
                          alt={p.name}
                          className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-100 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {p.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-gray-800 truncate">{p.name}</p>
                        <p className="text-[11px] text-gray-400 font-mono" dir="ltr">{p.barcode || '—'}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    {p.category ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-bold">
                        <Tag size={12} /> {p.category}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>

                  <td className="px-4 py-4 text-sm text-gray-700">
                    {p.supplier || '—'}
                  </td>

                  <td className="px-4 py-4">
                    <p className="text-xs font-bold text-gray-600 max-w-[200px]">
                      {p.packaging_description || '—'}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <div className="text-xs font-bold text-gray-800">
                      {Number(p.price).toLocaleString()} {p.currency}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    {p.price_unit_name ? (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold ${
                        PRICE_MODE_COLORS[p.price_mode] || 'bg-gray-100 text-gray-700'
                      }`}>
                        هر {p.price_unit_name}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>

                  <td className="px-4 py-4">
                    <UnitBadge name={p.module?.name} stock={calc.cartonsDecimal} color="blue" isDecimal={true} />
                  </td>

                  <td className="px-4 py-4">
                    {p.sub_module ? (
                      <UnitBadge name={p.sub_module.name} stock={calc.bottles} color="cyan" />
                    ) : <span className="text-gray-300">—</span>}
                  </td>

                  <td className="px-4 py-4">
                    {p.sub_sub_module ? (
                      <UnitBadge name={p.sub_sub_module.name} stock={p.sub_sub_module.stock} color="emerald" />
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          نمایش <span className="font-bold text-gray-700">{products.length}</span> محصول
        </span>
      </div>
    </div>
  );
}

function UnitBadge({ name, stock, color, isDecimal }) {
  const colors = {
    blue:    'bg-blue-50 text-blue-700 border-blue-200',
    cyan:    'bg-cyan-50 text-cyan-700 border-cyan-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colors[color] || colors.blue}`}>
      <span className="text-xs font-bold">{name}</span>
      <span className="text-sm font-black">
        {isDecimal && stock % 1 !== 0 ? stock.toFixed(1) : Number(stock || 0).toLocaleString()}
      </span>
    </div>
  );
}

/* ============================================================
   DETAILS MODAL
   ============================================================ */
function StockDetailsModal({ product, onClose }) {
  const calc = calculateStock(product);
  const isOutOfStock = calc.bottles === 0;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8">

        {/* Header */}
        <div className="relative h-56 bg-gradient-to-br from-emerald-500 to-teal-500">
          {product.photo_url ? (
            <img
              src={product.photo_url}
              alt={product.name}
              className="w-full h-full object-cover opacity-90"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-black text-4xl">
                {product.name?.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur text-white transition-colors"
          >
            <X size={18} />
          </button>

          {isOutOfStock && (
            <div className="absolute top-4 right-4 bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg">
              <AlertCircle size={12} /> ناموجود
            </div>
          )}

          <div className="absolute bottom-0 right-0 left-0 p-5 text-white">
            <h2 className="text-2xl font-black">{product.name}</h2>
            <div className="flex items-center gap-3 mt-1.5 text-xs">
              {product.supplier && (
                <span className="bg-white/20 backdrop-blur px-2 py-0.5 rounded">{product.supplier}</span>
              )}
              {product.category && (
                <span className="bg-white/20 backdrop-blur px-2 py-0.5 rounded flex items-center gap-1">
                  <Tag size={10} /> {product.category}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">

          {product.barcode && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-xs font-bold text-gray-500">بارکد</span>
              <span className="text-sm font-mono font-bold text-gray-800" dir="ltr">
                {product.barcode}
              </span>
            </div>
          )}

          {/* Packaging */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-100 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2">
              <Info size={16} /> توضیح بسته‌بندی
            </h3>
            <p className="text-base font-bold text-emerald-900 leading-relaxed text-center py-2">
              {product.packaging_description || '—'}
            </p>
          </div>

          {/* Units */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Boxes size={16} className="text-emerald-500" /> موجودی در هر واحد
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center">
                    <Boxes size={14} />
                  </div>
                  <span className="text-xs font-bold text-blue-700">واحد اصلی</span>
                </div>
                <p className="text-xs text-blue-600 mb-1">{product.module?.name}</p>
                <p className="text-2xl font-black text-blue-800">
                  {calc.cartonsDecimal % 1 !== 0 ? calc.cartonsDecimal.toFixed(1) : calc.cartonsDecimal}
                </p>
              </div>

              {product.sub_module ? (
                <div className="bg-cyan-50 border border-cyan-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500 text-white flex items-center justify-center">
                      <Layers size={14} />
                    </div>
                    <span className="text-xs font-bold text-cyan-700">زیر واحد</span>
                  </div>
                  <p className="text-xs text-cyan-600 mb-1">{product.sub_module.name}</p>
                  <p className="text-2xl font-black text-cyan-800">
                    {Number(calc.bottles || 0).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-center">
                  <p className="text-xs text-gray-400 italic">بدون زیر واحد</p>
                </div>
              )}

              {product.sub_sub_module ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                      <Package size={14} />
                    </div>
                    <span className="text-xs font-bold text-emerald-700">زیر واحد دوم</span>
                  </div>
                  <p className="text-xs text-emerald-600 mb-1">{product.sub_sub_module.name}</p>
                  <p className="text-2xl font-black text-emerald-800">
                    {Number(product.sub_sub_module.stock || 0).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-center">
                  <p className="text-xs text-gray-400 italic">بدون زیر واحد دوم</p>
                </div>
              )}
            </div>
          </div>

          {/* Price */}
          {product.price != null && (
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-800">قیمت</span>
                </div>
                <span className="text-lg font-black text-emerald-900">
                  {Number(product.price).toLocaleString()}
                  <span className="text-xs mr-1">{product.currency}</span>
                </span>
              </div>

              {product.price_mode_text && (
                <div className="pt-3 border-t border-emerald-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <Tag size={12} /> قیمت بر اساس
                  </span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    PRICE_MODE_COLORS[product.price_mode] || 'bg-gray-100 text-gray-700'
                  }`}>
                    هر {product.price_unit_name}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/30 transition-all"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}