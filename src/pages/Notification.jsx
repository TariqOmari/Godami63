import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Bell, BellOff, Check, CheckCheck, Trash2, Loader2, X,
  AlertTriangle, Calendar, Package, HandCoins, Truck,
  Filter, Search, RefreshCw, Inbox, ChevronDown, ChevronUp,
  Eye, EyeOff, Sparkles,
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

// ============ TYPE META ============
const TYPE_META = {
  expiry: {
    icon: Calendar,
    bg: 'bg-rose-100',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    label: 'انقضا',
  },
  stock_low: {
    icon: AlertTriangle,
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    label: 'کمبود موجودی',
  },
  stock_high: {
    icon: Package,
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    label: 'موجودی زیاد',
  },
  loan_customer: {
    icon: HandCoins,
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    label: 'قرض مشتری',
  },
  loan_supplier: {
    icon: Truck,
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    label: 'قرض تأمین‌کننده',
  },
};

// ============ DATE FORMATTING ============
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

const relativeTime = (iso) => {
  if (!iso) return '—';
  try {
    const now = new Date();
    const then = new Date(iso);
    const diffMs = now - then;
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return 'الان';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} دقیقه پیش`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} ساعت پیش`;
    const days = Math.floor(hr / 24);
    if (days === 1) return 'دیروز';
    if (days < 7) return `${days} روز پیش`;
    return toAfghanDate(iso);
  } catch { return '—'; }
};

const dayBucket = (iso) => {
  if (!iso) return 'other';
  const now = new Date();
  const then = new Date(iso);
  const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d1 = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const diff = Math.floor((d0 - d1) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 7) return 'this_week';
  return 'older';
};

const BUCKET_LABEL = {
  today: 'امروز',
  yesterday: 'دیروز',
  this_week: 'این هفته',
  older: 'قدیمی‌تر',
};

/* ============================================================
   PAGE
   ============================================================ */
export default function Notification() {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [scanning, setScanning]   = useState(false);
  const [toast, setToast]         = useState({ show: false, message: '', type: 'success' });

  // filters
  const [filterType, setFilterType]     = useState('');      // '' | expiry | stock_low | ...
  const [filterStatus, setFilterStatus] = useState('');      // '' | unseen | seen
  const [searchTerm, setSearchTerm]     = useState('');

  // bulk select
  const [selected, setSelected]         = useState(new Set());
  const [bulkOpen, setBulkOpen]         = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications', {
        params: {
          limit: 200,
          type: filterType || undefined,
          status: filterStatus || undefined,
        },
      });
      setItems(data.items || []);
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: 'خطا در دریافت اعلان‌ها', type: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  const runScan = async (silent = false) => {
    setScanning(true);
    try {
      const { data } = await api.post('/notifications/scan');
      if (!silent && data.created > 0) {
        setToast({ show: true, message: `${data.created} اعلان جدید ایجاد شد`, type: 'success' });
      }
      await fetchNotifications();
    } catch (e) {
      console.error(e);
      if (!silent) setToast({ show: true, message: 'خطا در بررسی', type: 'warning' });
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, [filterType, filterStatus]);
  useEffect(() => {
    // auto-scan once when page loads
    runScan(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear selection when filters change
  useEffect(() => { setSelected(new Set()); }, [filterType, filterStatus, searchTerm]);

  /* ---------- ACTIONS ---------- */
  const markSeen = async (id) => {
    try {
      await api.patch(`/notifications/${id}/seen`);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, status: 'seen' } : n)));
      setToast({ show: true, message: 'علامت‌گذاری شد', type: 'success' });
    } catch (e) {
      setToast({ show: true, message: 'خطا', type: 'warning' });
    }
  };

  const markUnseen = async (id) => {
    // There's no explicit endpoint for unseen; but we can call scan which will
    // re-create if condition met. For a manual "mark unseen" just do it via backend.
    // Fallback: update local state and hit a generic patch — user can extend later.
    setToast({ show: true, message: 'این گزینه به backend اضافه نشده', type: 'warning' });
  };

  const remove = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setItems((prev) => prev.filter((n) => n.id !== id));
      setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
      setToast({ show: true, message: 'حذف شد', type: 'success' });
    } catch (e) {
      setToast({ show: true, message: 'خطا در حذف', type: 'warning' });
    }
  };

  const markAllSeen = async () => {
    try {
      await api.patch('/notifications/mark-all-seen');
      setItems((prev) => prev.map((n) => ({ ...n, status: 'seen' })));
      setToast({ show: true, message: 'همه دیده شد', type: 'success' });
    } catch (e) {
      setToast({ show: true, message: 'خطا', type: 'warning' });
    }
  };

  const clearAll = async () => {
    if (!confirm('همه اعلان‌ها حذف شوند؟ این کار قابل بازگشت نیست.')) return;
    try {
      await api.delete('/notifications/clear-all');
      setItems([]);
      setSelected(new Set());
      setToast({ show: true, message: 'همه پاک شد', type: 'success' });
    } catch (e) {
      setToast({ show: true, message: 'خطا', type: 'warning' });
    }
  };

  /* ---------- BULK ---------- */
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };
  const selectAll = () => {
    const allIds = filtered.map((n) => n.id);
    setSelected(new Set(allIds));
  };
  const clearSelection = () => setSelected(new Set());

  const bulkMarkSeen = async () => {
    const ids = [...selected].filter((id) => {
      const n = items.find((x) => x.id === id);
      return n && n.status === 'unseen';
    });
    for (const id of ids) {
      try { await api.patch(`/notifications/${id}/seen`); } catch {}
    }
    setItems((prev) => prev.map((n) => (selected.has(n.id) ? { ...n, status: 'seen' } : n)));
    setSelected(new Set());
    setBulkOpen(false);
    setToast({ show: true, message: `${ids.length} اعلان علامت‌گذاری شد`, type: 'success' });
  };

  const bulkDelete = async () => {
    if (!confirm(`${selected.size} اعلان حذف شوند؟`)) return;
    for (const id of selected) {
      try { await api.delete(`/notifications/${id}`); } catch {}
    }
    setItems((prev) => prev.filter((n) => !selected.has(n.id)));
    setSelected(new Set());
    setBulkOpen(false);
    setToast({ show: true, message: 'حذف شد', type: 'success' });
  };

  /* ---------- FILTERED ---------- */
  const filtered = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    if (!s) return items;
    return items.filter((n) =>
      (n.title || '').toLowerCase().includes(s) ||
      (n.message || '').toLowerCase().includes(s)
    );
  }, [items, searchTerm]);

  const grouped = useMemo(() => {
    const groups = { today: [], yesterday: [], this_week: [], older: [] };
    for (const n of filtered) {
      const bucket = dayBucket(n.created_at);
      (groups[bucket] || groups.older).push(n);
    }
    return groups;
  }, [filtered]);

  const stats = useMemo(() => {
    const total = items.length;
    const unseen = items.filter((n) => n.status === 'unseen').length;
    const byType = items.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {});
    return { total, unseen, byType };
  }, [items]);

  const activeFiltersCount =
    (filterType ? 1 : 0) + (filterStatus ? 1 : 0) + (searchTerm ? 1 : 0);

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <DashboardLayout>
      <div className="space-y-6 pb-32" dir="rtl">
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
                <Bell size={22} />
              </div>
              اعلان‌ها
            </h1>
            <p className="text-sm text-gray-500 mt-2 mr-1">
              همه رویدادهای مهم سیستم — انقضا، موجودی و قرض‌ها
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => runScan(false)}
              disabled={scanning}
              className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              {scanning ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              بررسی مجدد
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<Inbox size={18} />}
            label="کل اعلان‌ها"
            value={stats.total}
            color="blue"
          />
          <StatCard
            icon={<Sparkles size={18} />}
            label="دیده‌نشده"
            value={stats.unseen}
            color="orange"
          />
          <StatCard
            icon={<Calendar size={18} />}
            label="انقضا"
            value={stats.byType.expiry || 0}
            color="rose"
          />
          <StatCard
            icon={<AlertTriangle size={18} />}
            label="کمبود موجودی"
            value={(stats.byType.stock_low || 0) + (stats.byType.stock_high || 0)}
            color="amber"
          />
        </div>

        {/* TOOLBAR */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          {/* SEARCH */}
          <div className="flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-transparent focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
            <Search size={18} className="text-gray-400 ml-2 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجو در اعلان‌ها..."
              className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            )}
          </div>

          {/* FILTERS */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterPill
              active={filterStatus === 'unseen'}
              onClick={() => setFilterStatus(filterStatus === 'unseen' ? '' : 'unseen')}
              icon={<Sparkles size={13} />}
              label="دیده‌نشده"
              color="orange"
              count={stats.unseen}
            />
            <FilterPill
              active={filterStatus === 'seen'}
              onClick={() => setFilterStatus(filterStatus === 'seen' ? '' : 'seen')}
              icon={<Eye size={13} />}
              label="دیده‌شده"
              color="gray"
            />

            <span className="w-px h-6 bg-gray-200 mx-1" />

            {Object.entries(TYPE_META).map(([key, meta]) => {
              const Icon = meta.icon;
              const active = filterType === key;
              const count = stats.byType[key] || 0;
              return (
                <button
                  key={key}
                  onClick={() => setFilterType(active ? '' : key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    active
                      ? `${meta.bg} ${meta.text} ring-2 ring-offset-1 ring-blue-400`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon size={13} />
                  {meta.label}
                  {count > 0 && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      active ? 'bg-white/50' : 'bg-gray-200'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}

            {activeFiltersCount > 0 && (
              <button
                onClick={() => { setFilterType(''); setFilterStatus(''); setSearchTerm(''); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all mr-auto"
              >
                <X size={12} /> پاک کردن فیلترها ({activeFiltersCount})
              </button>
            )}
          </div>

          {/* BULK BAR */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              {filtered.length > 0 && (
                <button
                  onClick={selected.size === filtered.length ? clearSelection : selectAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                >
                  <Check size={13} />
                  {selected.size === filtered.length ? 'لغو انتخاب همه' : 'انتخاب همه'}
                </button>
              )}
              {selected.size > 0 && (
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
                  {selected.size} انتخاب شده
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllSeen}
                disabled={stats.unseen === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 transition-all"
              >
                <CheckCheck size={13} /> همه را دیدم
              </button>
              <button
                onClick={clearAll}
                disabled={stats.total === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-40 transition-all"
              >
                <Trash2 size={13} /> حذف همه
              </button>
            </div>
          </div>
        </div>

        {/* LIST */}
        {loading ? (
          <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <Loader2 size={40} className="animate-spin text-blue-500" />
            <p className="text-gray-500 mt-4 text-sm">در حال بارگذاری اعلان‌ها...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <BellOff size={44} className="text-blue-400" />
            </div>
            <p className="text-gray-700 font-bold text-lg mb-1">
              {activeFiltersCount > 0 ? 'هیچ اعلانی با این فیلترها یافت نشد' : 'هیچ اعلانی وجود ندارد'}
            </p>
            <p className="text-sm text-gray-400 mb-6">
              {activeFiltersCount > 0
                ? 'فیلترها را تغییر دهید یا پاک کنید'
                : 'وقتی مشکلی پیش بیاید اینجا نمایش داده می‌شود'}
            </p>
            {activeFiltersCount > 0 ? (
              <button
                onClick={() => { setFilterType(''); setFilterStatus(''); setSearchTerm(''); }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2"
              >
                <X size={16} /> پاک کردن فیلترها
              </button>
            ) : (
              <button
                onClick={() => runScan(false)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2"
              >
                <RefreshCw size={16} /> بررسی مجدد
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {['today', 'yesterday', 'this_week', 'older'].map((bucket) => {
              const bucketItems = grouped[bucket];
              if (!bucketItems || bucketItems.length === 0) return null;
              return (
                <div key={bucket}>
                  <div className="px-5 py-2 bg-gray-50 border-y border-gray-100 sticky top-0 z-10 backdrop-blur">
                    <span className="text-xs font-black text-gray-600 uppercase tracking-wide">
                      {BUCKET_LABEL[bucket]}
                      <span className="text-gray-400 font-bold mr-2">({bucketItems.length})</span>
                    </span>
                  </div>
                  {bucketItems.map((n) => (
                    <NotificationRow
                      key={n.id}
                      notification={n}
                      selected={selected.has(n.id)}
                      onToggleSelect={() => toggleSelect(n.id)}
                      onMarkSeen={() => markSeen(n.id)}
                      onDelete={() => remove(n.id)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* BULK ACTION FLOATING BAR */}
        {selected.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200]">
            <div className="bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 border border-slate-700">
              <span className="text-sm font-bold pl-2">
                {selected.size} انتخاب شده
              </span>
              <span className="w-px h-6 bg-slate-700" />
              <button
                onClick={bulkMarkSeen}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 transition-colors"
              >
                <CheckCheck size={14} /> دیدم
              </button>
              <button
                onClick={bulkDelete}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 transition-colors"
              >
                <Trash2 size={14} /> حذف
              </button>
              <button
                onClick={clearSelection}
                className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ============================================================
   STAT CARD
   ============================================================ */
function StatCard({ icon, label, value, color }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: 'text-blue-600' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-600' },
    rose:   { bg: 'bg-rose-50',   text: 'text-rose-700',   icon: 'text-rose-600' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  icon: 'text-amber-600' },
  }[color] || { bg: 'bg-gray-50', text: 'text-gray-700', icon: 'text-gray-600' };

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-gray-500 font-bold">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${colors.bg} ${colors.icon} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-black ${colors.text}`}>{Number(value || 0).toLocaleString()}</p>
    </div>
  );
}

/* ============================================================
   FILTER PILL
   ============================================================ */
function FilterPill({ active, onClick, icon, label, color = 'gray', count }) {
  const colors = {
    orange: active ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-400' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
    gray:   active ? 'bg-gray-200 text-gray-800 ring-2 ring-gray-400'     : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${colors[color]}`}
    >
      {icon}
      {label}
      {count > 0 && (
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${active ? 'bg-white/50' : 'bg-gray-200'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ============================================================
   NOTIFICATION ROW
   ============================================================ */
function NotificationRow({ notification, selected, onToggleSelect, onMarkSeen, onDelete }) {
  const meta = TYPE_META[notification.type] || TYPE_META.stock_low;
  const Icon = meta.icon;
  const isUnseen = notification.status === 'unseen';
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`group relative flex items-start gap-3 px-4 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        isUnseen ? 'bg-blue-50/30' : ''
      } ${selected ? 'ring-2 ring-inset ring-blue-400 bg-blue-50/50' : ''}`}
    >
      {/* SELECT CHECKBOX */}
      <button
        onClick={onToggleSelect}
        className={`mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
          selected
            ? 'bg-blue-500 border-blue-500 text-white'
            : 'border-gray-300 hover:border-blue-400 bg-white'
        }`}
      >
        {selected && <Check size={12} />}
      </button>

      {/* ICON */}
      <div className={`w-11 h-11 rounded-xl ${meta.bg} ${meta.text} flex items-center justify-center shrink-0 relative`}>
        <Icon size={20} />
        {isUnseen && (
          <span className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full ${meta.dot} ring-2 ring-white`} />
        )}
      </div>

      {/* CONTENT */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className={`text-sm leading-tight ${isUnseen ? 'font-black text-gray-900' : 'font-bold text-gray-700'}`}>
              {notification.title}
            </p>
            <p className={`text-xs text-gray-600 mt-1 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
              {notification.message}
            </p>
            {notification.message && notification.message.length > 100 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 mt-1"
              >
                {expanded ? 'نمایش کمتر' : 'نمایش بیشتر'}
              </button>
            )}

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${meta.bg} ${meta.text} ${meta.border}`}>
                {meta.label}
              </span>
              {notification.due_date && (
                <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                  <Calendar size={10} /> {notification.due_date}
                </span>
              )}
              {notification.product?.name && (
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Package size={10} /> {notification.product.name}
                </span>
              )}
              {notification.sale?.invoice_number && (
                <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                  <Sparkles size={10} /> {notification.sale.invoice_number}
                </span>
              )}
              <span className="text-[10px] text-gray-400">
                {relativeTime(notification.created_at)}
              </span>
            </div>
          </div>

          {/* QUICK ACTIONS — hidden until hover */}
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {isUnseen && (
              <button
                onClick={onMarkSeen}
                className="p-1.5 rounded-lg bg-white border border-gray-200 text-emerald-600 hover:bg-emerald-50 transition-colors"
                title="دیدم"
              >
                <Eye size={14} />
              </button>
            )}
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg bg-white border border-gray-200 text-rose-600 hover:bg-rose-50 transition-colors"
              title="حذف"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}