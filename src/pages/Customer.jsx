import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Pencil, Trash2, X, AlertCircle,
  User as UserIcon, Mail, Phone, MapPin,
  Loader2, Image as ImageIcon, Upload, Users,
  MessageCircle, Briefcase
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export default function Customer() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    lastname: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const getAuthHeaders = () => ({
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem('auth_token')}`,
    }
  });

  /* ================= FETCH ================= */
  const fetchCustomers = async (search = '') => {
    setLoading(true);
    try {
      const url = search
        ? `${API_BASE_URL}/customers?search=${encodeURIComponent(search)}`
        : `${API_BASE_URL}/customers`;

      const { data } = await axios.get(url, getAuthHeaders());
      setCustomers(data);
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: 'خطا در دریافت لیست مشتریان', type: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);
  useEffect(() => {
    const timer = setTimeout(() => fetchCustomers(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  /* ================= FORM HELPERS ================= */
  const resetForm = () => {
    setFormData({
      name: '', lastname: '', email: '',
      phone: '', whatsapp: '', address: '',
    });
    setPhoto(null);
    setPhotoPreview(null);
    setError('');
  };

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name:     customer.name     || '',
      lastname: customer.lastname || '',
      email:    customer.email    || '',
      phone:    customer.phone    || '',
      whatsapp: customer.whatsapp || '',
      address:  customer.address  || '',
    });
    setPhoto(null);
    setPhotoPreview(customer.profile_photo_url || null);
    setError('');
    setIsModalOpen(true);
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('حجم تصویر باید کمتر از ۲ مگابایت باشد');
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError('');
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('نام مشتری الزامی است');
      return;
    }

    setIsSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', formData.name);
      if (formData.lastname) fd.append('lastname', formData.lastname);
      if (formData.email)    fd.append('email', formData.email);
      if (formData.phone)    fd.append('phone', formData.phone);
      if (formData.whatsapp) fd.append('whatsapp', formData.whatsapp);
      if (formData.address)  fd.append('address', formData.address);
      if (photo)             fd.append('profile_photo', photo);

      let res;
      if (editingCustomer) {
        fd.append('_method', 'PUT');
        res = await axios.post(
          `${API_BASE_URL}/customers/${editingCustomer.id}`,
          fd,
          {
            headers: {
              ...getAuthHeaders().headers,
              'Content-Type': 'multipart/form-data',
            }
          }
        );
        setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? res.data : c));
        setToast({ show: true, message: 'مشتری با موفقیت ویرایش شد', type: 'success' });
      } else {
        res = await axios.post(`${API_BASE_URL}/customers`, fd, {
          headers: {
            ...getAuthHeaders().headers,
            'Content-Type': 'multipart/form-data',
          }
        });
        setCustomers(prev => [res.data, ...prev]);
        setToast({ show: true, message: 'مشتری جدید با موفقیت اضافه شد', type: 'success' });
      }

      setIsModalOpen(false);
      resetForm();
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

  /* ================= DELETE ================= */
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await axios.delete(`${API_BASE_URL}/customers/${deleteConfirm}`, getAuthHeaders());
      setCustomers(prev => prev.filter(c => c.id !== deleteConfirm));
      setToast({ show: true, message: 'مشتری با موفقیت حذف شد', type: 'warning' });
      setDeleteConfirm(null);
    } catch (err) {
      setToast({ show: true, message: 'خطا در حذف مشتری', type: 'warning' });
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

        {/* ============ HEADER ============ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <Users size={22} />
              </div>
              مدیریت مشتریان
            </h1>
            <p className="text-sm text-gray-500 mt-2 mr-1">
              لیست تمام مشتریان ثبت شده در سیستم
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="bg-gradient-to-r from-indigo-600 to-purple-500 hover:from-indigo-700 hover:to-purple-600 text-white px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            افزودن مشتری
          </button>
        </div>

        {/* ============ SEARCH ============ */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-transparent focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all max-w-md">
            <Search size={20} className="text-gray-400 ml-2 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجو بر اساس نام، فامیل، ایمیل یا تلفن..."
              className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400"
            />
          </div>
        </div>

        {/* ============ CONTENT ============ */}
        {loading ? (
          <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-gray-500 mt-4 text-sm">در حال بارگذاری...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-indigo-50 flex items-center justify-center mb-4">
              <Users size={36} className="text-indigo-400" />
            </div>
            <p className="text-gray-700 font-bold text-lg mb-1">هیچ مشتری‌ای یافت نشد</p>
            <p className="text-sm text-gray-400 mb-6">اولین مشتری خود را اضافه کنید</p>
            <button
              onClick={handleOpenCreate}
              className="bg-gradient-to-r from-indigo-600 to-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/30 inline-flex items-center gap-2"
            >
              <Plus size={18} />
              افزودن مشتری
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead>
                  <tr className="bg-gradient-to-l from-indigo-50/70 to-purple-50/50 border-b-2 border-indigo-100">
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600 tracking-wider w-16">#</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600 tracking-wider">مشتری</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600 tracking-wider">ایمیل</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600 tracking-wider">تلفن</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600 tracking-wider">واتساپ</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600 tracking-wider">آدرس</th>
                    <th className="text-right px-4 py-4 text-xs font-bold text-gray-600 tracking-wider">تاریخ ثبت</th>
                    <th className="text-center px-4 py-4 text-xs font-bold text-gray-600 tracking-wider w-32">عملیات</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {customers.map((c, index) => {
                    const fullName = `${c.name || ''} ${c.lastname || ''}`.trim();
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-indigo-50/40 transition-colors group"
                      >
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold">
                            {index + 1}
                          </span>
                        </td>

                        {/* Customer (avatar + name) */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {c.profile_photo_url ? (
                              <img
                                src={c.profile_photo_url}
                                alt={fullName}
                                className="w-11 h-11 rounded-xl object-cover shrink-0 ring-2 ring-indigo-100"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-400 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md shadow-indigo-500/20">
                                {c.name?.charAt(0).toUpperCase() || <UserIcon size={16} />}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-gray-800 group-hover:text-indigo-700 transition-colors truncate">
                                {fullName || '—'}
                              </p>
                              <p className="text-[11px] text-gray-400">ID: {c.id}</p>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-4">
                          {c.email ? (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Mail size={15} className="text-indigo-500 shrink-0" />
                              <span dir="ltr" className="truncate max-w-[200px]">{c.email}</span>
                            </div>
                          ) : <span className="text-sm text-gray-300">—</span>}
                        </td>

                        {/* Phone */}
                        <td className="px-4 py-4">
                          {c.phone ? (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Phone size={15} className="text-indigo-500 shrink-0" />
                              <span dir="ltr">{c.phone}</span>
                            </div>
                          ) : <span className="text-sm text-gray-300">—</span>}
                        </td>

                        {/* WhatsApp */}
                        <td className="px-4 py-4">
                          {c.whatsapp ? (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <MessageCircle size={15} className="text-emerald-500 shrink-0" />
                              <span dir="ltr">{c.whatsapp}</span>
                            </div>
                          ) : <span className="text-sm text-gray-300">—</span>}
                        </td>

                        {/* Address */}
                        <td className="px-4 py-4">
                          {c.address ? (
                            <div className="flex items-start gap-2 text-sm text-gray-700 max-w-[220px]">
                              <MapPin size={15} className="text-indigo-500 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{c.address}</span>
                            </div>
                          ) : <span className="text-sm text-gray-300">—</span>}
                        </td>

                        {/* Created */}
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-600 whitespace-nowrap">
                            {toAfghanDate(c.created_at)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(c)}
                              className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-110 transition-all"
                              title="ویرایش"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(c.id)}
                              className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:scale-110 transition-all"
                              title="حذف"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                نمایش <span className="font-bold text-gray-700">{customers.length}</span> مشتری
              </span>
              <span className="text-xs text-gray-400">
                آخرین به‌روزرسانی: {toAfghanDate(new Date().toISOString())}
              </span>
            </div>
          </div>
        )}

        {/* ============ CREATE / EDIT MODAL ============ */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">

              <div className="bg-gradient-to-l from-indigo-600 to-purple-500 p-6 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users size={22} />
                  {editingCustomer ? 'ویرایش مشتری' : 'افزودن مشتری جدید'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-rose-600">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}

                {/* Photo upload */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50/50 border border-indigo-100">
                  <div className="relative shrink-0">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="preview"
                        className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-indigo-300 flex items-center justify-center text-indigo-400">
                        <ImageIcon size={26} />
                      </div>
                    )}
                    {photoPreview && (
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="font-bold text-gray-800 mb-1 text-sm">عکس پروفایل</p>
                    <p className="text-[11px] text-gray-500 mb-2">JPG, PNG یا WEBP — حداکثر ۲ مگابایت</p>
                    <label className="inline-flex items-center gap-2 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all shadow-sm text-xs">
                      <Upload size={14} />
                      {photoPreview ? 'تغییر' : 'انتخاب'}
                      <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Name + Lastname */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="نام" required>
                    <InputWithIcon
                      icon={<UserIcon size={16} />}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="نام"
                      required
                    />
                  </FormField>
                  <FormField label="فامیل">
                    <InputWithIcon
                      icon={<UserIcon size={16} />}
                      value={formData.lastname}
                      onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                      placeholder="فامیل"
                    />
                  </FormField>
                </div>

                {/* Email */}
                <FormField label="ایمیل">
                  <InputWithIcon
                    icon={<Mail size={16} />}
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="example@email.com"
                    dir="ltr"
                  />
                </FormField>

                {/* Phone + WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="تلفن">
                    <InputWithIcon
                      icon={<Phone size={16} />}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="07XXXXXXXX"
                      dir="ltr"
                    />
                  </FormField>
                  <FormField label="واتساپ">
                    <InputWithIcon
                      icon={<MessageCircle size={16} />}
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      placeholder="07XXXXXXXX"
                      dir="ltr"
                    />
                  </FormField>
                </div>

                {/* Address */}
                <FormField label="آدرس">
                  <div className="relative group">
                    <div className="absolute top-3 right-3 text-gray-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                      <MapPin size={16} />
                    </div>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows="2"
                      placeholder="آدرس کامل..."
                      className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl py-3 pr-11 pl-4 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-gray-400 resize-none"
                    />
                  </div>
                </FormField>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-500 hover:from-indigo-700 hover:to-purple-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isSaving ? (
                      <><Loader2 size={18} className="animate-spin" /> در حال ذخیره...</>
                    ) : (
                      editingCustomer ? 'ذخیره تغییرات' : 'افزودن'
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

        {/* ============ DELETE CONFIRM ============ */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 flex items-center justify-center mb-4">
                  <Trash2 size={28} className="text-rose-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">حذف مشتری</h3>
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
   Small helpers
   ============================================================ */
function FormField({ label, required, children }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-gray-700">
        {label}
        {required && <span className="text-rose-500 mr-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function InputWithIcon({ icon, ...props }) {
  return (
    <div className="relative group">
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
        {icon}
      </div>
      <input
        {...props}
        className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl py-3 pr-10 pl-4 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-gray-400 text-sm"
      />
    </div>
  );
}