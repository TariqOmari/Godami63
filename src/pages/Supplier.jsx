import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Pencil, Trash2, X, AlertCircle,
  Warehouse, Mail, Phone, MapPin, Loader2,
  User as UserIcon, Eye, FileText, Package,
  CheckCircle2, HandCoins, Clock, TrendingUp,
  Calendar, DollarSign, Building2, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import Toast from '../components/Toast';

// ============ AFGHAN DATE HELPERS ============
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

export default function Supplier() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    supplier_name: '',
    address: '',
    email: '',
    phone: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // 👇 جدید: state برای مودال جزئیات
  const [detailsSupplier, setDetailsSupplier] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  const getAuthHeaders = () => ({
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem('auth_token')}`
    }
  });

  const fetchSuppliers = async (search = '') => {
    setLoading(true);
    try {
      const url = search
        ? `${API_BASE_URL}/suppliers?search=${encodeURIComponent(search)}`
        : `${API_BASE_URL}/suppliers`;
      const response = await axios.get(url, getAuthHeaders());
      setSuppliers(response.data);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
      setToast({ show: true, message: 'خطا در دریافت لیست تامین‌کنندگان', type: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => { fetchSuppliers(searchTerm); }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setFormData({ supplier_name: '', address: '', email: '', phone: '' });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      supplier_name: supplier.supplier_name || '',
      address: supplier.address || '',
      email: supplier.email || '',
      phone: supplier.phone || ''
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      if (editingSupplier) {
        const response = await axios.put(
          `${API_BASE_URL}/suppliers/${editingSupplier.id}`,
          formData,
          getAuthHeaders()
        );
        setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? response.data : s));
        setToast({ show: true, message: 'تامین‌کننده با موفقیت ویرایش شد', type: 'success' });
      } else {
        const response = await axios.post(
          `${API_BASE_URL}/suppliers`,
          formData,
          getAuthHeaders()
        );
        setSuppliers(prev => [response.data, ...prev]);
        setToast({ show: true, message: 'تامین‌کننده جدید با موفقیت اضافه شد', type: 'success' });
      }
      setIsModalOpen(false);
    } catch (err) {
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        setError(Object.values(errors)[0][0]);
      } else {
        setError(err.response?.data?.message || 'خطا در ذخیره اطلاعات');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await axios.delete(`${API_BASE_URL}/suppliers/${deleteConfirm}`, getAuthHeaders());
      setSuppliers(prev => prev.filter(s => s.id !== deleteConfirm));
      setToast({ show: true, message: 'تامین‌کننده با موفقیت حذف شد', type: 'warning' });
      setDeleteConfirm(null);
    } catch (err) {
      setToast({ show: true, message: 'خطا در حذف تامین‌کننده', type: 'warning' });
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

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Warehouse size={22} />
              </div>
              مدیریت تامین‌کنندگان
            </h1>
            <p className="text-sm text-gray-500 mt-2 mr-1">
              لیست تمام تامین‌کنندگان ثبت شده در سیستم
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            افزودن تامین‌کننده
          </button>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-transparent focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 transition-all max-w-md">
            <Search size={20} className="text-gray-400 ml-2 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجو بر اساس نام، ایمیل یا تلفن..."
              className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-gray-500 mt-4 text-sm">در حال بارگذاری...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <Warehouse size={36} className="text-blue-400" />
            </div>
            <p className="text-gray-700 font-bold text-lg mb-1">هیچ تامین‌کننده‌ای یافت نشد</p>
            <p className="text-sm text-gray-400 mb-6">اولین تامین‌کننده خود را اضافه کنید</p>
            <button
              onClick={handleOpenCreate}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 inline-flex items-center gap-2"
            >
              <Plus size={18} />
              افزودن تامین‌کننده
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="bg-gradient-to-l from-blue-50/70 to-cyan-50/50 border-b-2 border-blue-100">
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600 tracking-wider w-16">#</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600 tracking-wider">نام تامین‌کننده</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600 tracking-wider">ایمیل</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600 tracking-wider">شماره تماس</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600 tracking-wider">آدرس</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600 tracking-wider">تاریخ ثبت</th>
                    <th className="text-center px-4 py-4 text-xs font-bold text-gray-600 tracking-wider w-40">عملیات</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {suppliers.map((supplier, index) => (
                    <tr
                      key={supplier.id}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold">
                          {index + 1}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-400 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md shadow-blue-500/20">
                            {supplier.supplier_name?.charAt(0).toUpperCase() || <UserIcon size={16} />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-800 group-hover:text-blue-700 transition-colors truncate">
                              {supplier.supplier_name}
                            </p>
                            <p className="text-[11px] text-gray-400">ID: {supplier.id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {supplier.email ? (
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Mail size={15} className="text-blue-500 shrink-0" />
                            <span dir="ltr" className="truncate max-w-[200px]">{supplier.email}</span>
                          </div>
                        ) : <span className="text-sm text-gray-300">—</span>}
                      </td>

                      <td className="px-4 py-4">
                        {supplier.phone ? (
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Phone size={15} className="text-blue-500 shrink-0" />
                            <span dir="ltr">{supplier.phone}</span>
                          </div>
                        ) : <span className="text-sm text-gray-300">—</span>}
                      </td>

                      <td className="px-4 py-4">
                        {supplier.address ? (
                          <div className="flex items-start gap-2 text-sm text-gray-700 max-w-[220px]">
                            <MapPin size={15} className="text-blue-500 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{supplier.address}</span>
                          </div>
                        ) : <span className="text-sm text-gray-300">—</span>}
                      </td>

                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-600 whitespace-nowrap">
                          {toAfghanDate(supplier.created_at)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">

                          {/* 👇 دکمه‌ی جدید جزئیات */}
                          <button
                            onClick={() => setDetailsSupplier(supplier)}
                            className="p-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 hover:scale-110 transition-all"
                            title="جزئیات و تاریخچه"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(supplier)}
                            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-110 transition-all"
                            title="ویرایش"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(supplier.id)}
                            className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:scale-110 transition-all"
                            title="حذف"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                نمایش <span className="font-bold text-gray-700">{suppliers.length}</span> تامین‌کننده
              </span>
              <span className="text-xs text-gray-400">
                آخرین به‌روزرسانی: {toAfghanDate(new Date().toISOString())}
              </span>
            </div>
          </div>
        )}

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-gradient-to-l from-blue-600 to-cyan-500 p-6 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Warehouse size={22} />
                  {editingSupplier ? 'ویرایش تامین‌کننده' : 'افزودن تامین‌کننده جدید'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-600">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">نام تامین‌کننده <span className="text-rose-500">*</span></label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                      <UserIcon size={18} />
                    </div>
                    <input
                      type="text"
                      value={formData.supplier_name}
                      onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                      required
                      placeholder="نام شرکت یا شخص"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl py-3 pr-11 pl-4 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">ایمیل</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="example@email.com"
                      dir="ltr"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl py-3 pr-11 pl-4 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-gray-400 text-left"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">شماره تلفن</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                      <Phone size={18} />
                    </div>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+93 xxx xxx xxx"
                      dir="ltr"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl py-3 pr-11 pl-4 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-gray-400 text-left"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">آدرس</label>
                  <div className="relative group">
                    <div className="absolute top-3 right-0 pr-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                      <MapPin size={18} />
                    </div>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows="3"
                      placeholder="آدرس کامل..."
                      className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl py-3 pr-11 pl-4 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-gray-400 resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        در حال ذخیره...
                      </>
                    ) : (
                      editingSupplier ? 'ذخیره تغییرات' : 'افزودن'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 👇 مودال جزئیات + تاریخچه */}
        {detailsSupplier && (
          <SupplierDetailsModal
            supplier={detailsSupplier}
            apiBase={API_BASE_URL}
            getAuthHeaders={getAuthHeaders}
            onClose={() => setDetailsSupplier(null)}
            onToast={(msg, type = 'success') =>
              setToast({ show: true, message: msg, type })
            }
          />
        )}

        {/* Delete Confirm */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 flex items-center justify-center mb-4">
                  <Trash2 size={28} className="text-rose-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">حذف تامین‌کننده</h3>
                <p className="text-sm text-gray-500 mb-6">آیا از حذف مطمئن هستید؟</p>
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
   SUPPLIER DETAILS MODAL — همه چیز در یک مودال
   GET /api/suppliers/{id}/full
   ============================================================ */
function SupplierDetailsModal({ supplier, apiBase, getAuthHeaders, onClose, onToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('bills'); // bills | loans

  const fetchFull = async () => {
    setLoading(true);
    try {
      const { data: res } = await axios.get(
        `${apiBase}/suppliers/${supplier.id}/full`,
        getAuthHeaders()
      );
      setData(res);
    } catch (e) {
      console.error(e);
      onToast('خطا در دریافت اطلاعات تامین‌کننده', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFull(); /* eslint-disable-next-line */ }, [supplier.id]);

  const totals = data?.totals || {
    bills_count: 0,
    final_afn: 0, final_usd: 0,
    paid_afn: 0, paid_usd: 0,
    remaining_afn: 0, remaining_usd: 0,
  };
  const byStatus   = data?.by_status   || { cash: 0, loan_full: 0, loan_partial: 0 };
  const byCurrency = data?.by_currency || { AFN: 0, USD: 0 };
  const loans      = data?.loans || [];
  const bills      = data?.bills || [];

  const listToShow = tab === 'loans' ? loans : bills;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden my-8">

        {/* Header */}
        <div className="bg-gradient-to-l from-blue-600 to-cyan-500 p-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-xl">
              {supplier.supplier_name?.charAt(0).toUpperCase() || <UserIcon size={22} />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{supplier.supplier_name}</h3>
              <p className="text-xs text-blue-100 mt-1">
                {supplier.phone || '—'} • {supplier.email || '—'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[75vh] overflow-y-auto">

          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-gray-500 mt-4 text-sm">در حال بارگذاری...</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">

              {/* Info Card */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50/50 border border-blue-100 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <InfoRow icon={<Phone size={14} />} label="تلفن" value={supplier.phone || '—'} mono />
                <InfoRow icon={<Mail size={14} />} label="ایمیل" value={supplier.email || '—'} mono />
                <InfoRow icon={<MapPin size={14} />} label="آدرس" value={supplier.address || '—'} />
                <InfoRow icon={<Calendar size={14} />} label="تاریخ ثبت" value={toAfghanDate(supplier.created_at)} />
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPI
                  icon={<FileText size={16} />}
                  color="purple"
                  label="تعداد فاکتور"
                  value={totals.bills_count}
                />
                <KPI
                  icon={<TrendingUp size={16} />}
                  color="blue"
                  label="ارزش کل خرید"
                  valueAfn={totals.final_afn}
                  valueUsd={totals.final_usd}
                />
                <KPI
                  icon={<CheckCircle2 size={16} />}
                  color="emerald"
                  label="پرداخت‌شده"
                  valueAfn={totals.paid_afn}
                  valueUsd={totals.paid_usd}
                />
                <KPI
                  icon={<HandCoins size={16} />}
                  color="rose"
                  label="بدهی"
                  valueAfn={totals.remaining_afn}
                  valueUsd={totals.remaining_usd}
                />
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">وضعیت پرداخت</h4>
                  <div className="space-y-2">
                    <StatusBar label="نقد"          value={byStatus.cash}         total={totals.bills_count} color="emerald" />
                    <StatusBar label="قرض کامل"     value={byStatus.loan_full}    total={totals.bills_count} color="rose" />
                    <StatusBar label="قرض جزئی"     value={byStatus.loan_partial} total={totals.bills_count} color="amber" />
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">ارز معاملات</h4>
                  <div className="space-y-2">
                    <StatusBar label="افغانی (AFN)" value={byCurrency.AFN} total={totals.bills_count} color="blue" />
                    <StatusBar label="دالر (USD)"   value={byCurrency.USD} total={totals.bills_count} color="emerald" />
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div>
                <div className="flex items-center gap-2 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
                  <button
                    onClick={() => setTab('bills')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      tab === 'bills'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    همه صورتحساب‌ها ({bills.length})
                  </button>
                  <button
                    onClick={() => setTab('loans')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      tab === 'loans'
                        ? 'bg-white text-rose-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    قرض‌های باز ({loans.length})
                  </button>
                </div>

                {listToShow.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl">
                    <Package size={32} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      {tab === 'bills' ? 'هیچ صورتحسابی ثبت نشده' : 'همه قرض‌ها تسویه شده‌اند ✓'}
                    </p>
                  </div>
                ) : (
                  <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="text-right px-3 py-3 text-xs font-bold text-gray-600">شماره فاکتور</th>
                            <th className="text-right px-3 py-3 text-xs font-bold text-gray-600">تاریخ</th>
                            <th className="text-right px-3 py-3 text-xs font-bold text-gray-600">محصول</th>
                            <th className="text-right px-3 py-3 text-xs font-bold text-gray-600">قیمت نهایی</th>
                            <th className="text-right px-3 py-3 text-xs font-bold text-gray-600">وضعیت</th>
                            <th className="text-right px-3 py-3 text-xs font-bold text-gray-600">پرداخت‌شده</th>
                            <th className="text-right px-3 py-3 text-xs font-bold text-gray-600">باقی‌مانده</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {listToShow.map(b => {
                            const meta = PAYMENT_META[b.payment_type] || PAYMENT_META.cash;
                            const Icon = meta.icon;
                            return (
                              <tr key={b.id} className="hover:bg-blue-50/40">
                                <td className="px-3 py-3">
                                  <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                    {b.bill_number}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                                  {toAfghanDate(b.created_at)}
                                </td>
                                <td className="px-3 py-3">
                                  <p className="text-sm font-bold text-gray-800 truncate max-w-[150px]">
                                    {b.product_name}
                                  </p>
                                  <p className="text-[10px] text-gray-400">{b.category || '—'}</p>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="text-sm font-bold text-gray-800">
                                    {Number(b.final_price_afn).toLocaleString()}
                                  </div>
                                  <div className="text-[10px] text-gray-500">
                                    $ {Number(b.final_price_usd).toLocaleString()}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${meta.bg} ${meta.textColor} ${meta.border}`}>
                                    <Icon size={10} /> {meta.text}
                                  </span>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="text-sm font-bold text-emerald-700">
                                    {Number(b.paid_amount_afn).toLocaleString()}
                                  </div>
                                  <div className="text-[10px] text-emerald-600">
                                    $ {Number(b.paid_amount_usd).toLocaleString()}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <div className={`text-sm font-bold ${Number(b.remaining_amount) > 0 ? 'text-rose-700' : 'text-gray-400'}`}>
                                    {Number(b.remaining_amount_afn).toLocaleString()}
                                  </div>
                                  <div className={`text-[10px] ${Number(b.remaining_amount) > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                                    $ {Number(b.remaining_amount_usd).toLocaleString()}
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
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button
            onClick={fetchFull}
            className="flex-1 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} /> بازخوانی
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Small components
   ============================================================ */
function InfoRow({ icon, label, value, mono }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-blue-500 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500 font-bold">{label}</p>
        <p className={`text-sm text-gray-800 font-bold truncate ${mono ? 'font-mono' : ''}`}
           dir={mono ? 'ltr' : 'rtl'}>
          {value}
        </p>
      </div>
    </div>
  );
}

function KPI({ icon, color, label, value, valueAfn, valueUsd }) {
  const colorMap = {
    purple:  { bg: 'bg-purple-50',  text: 'text-purple-600'  },
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-600'    },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    rose:    { bg: 'bg-rose-50',    text: 'text-rose-600'    },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center ${c.text}`}>
          {icon}
        </div>
        <span className="text-xs text-gray-500 font-bold">{label}</span>
      </div>

      {value !== undefined ? (
        <p className="text-xl font-black text-gray-800">{value}</p>
      ) : (
        <>
          <p className="text-sm font-black text-gray-800">
            {Number(valueAfn || 0).toLocaleString()} <span className="text-[10px]">AFN</span>
          </p>
          <p className="text-[11px] font-bold text-gray-500 mt-0.5">
            $ {Number(valueUsd || 0).toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
}

function StatusBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const colorMap = {
    emerald: 'bg-emerald-500',
    rose:    'bg-rose-500',
    amber:   'bg-amber-500',
    blue:    'bg-blue-500',
  };
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-bold text-gray-700">{label}</span>
        <span className="text-gray-500">{value} ({pct}%)</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorMap[color] || 'bg-gray-400'} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}