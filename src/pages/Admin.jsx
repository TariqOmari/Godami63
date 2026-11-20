import React, { useEffect, useMemo, useRef, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import Loader from '../components/Loader'
import axios from 'axios'

/* ================= API CLIENT ================= */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) localStorage.removeItem('token')
    return Promise.reject(err)
  }
)

/* ================= Helpers ================= */
const emptyForm = { name: '', username: '', password: '', photo: null }

const EyeIcon = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
)

/* ================= Avatar ================= */
function Avatar({ admin }) {
  const [error, setError] = useState(false)

  if (admin.photo_url && !error) {
    return (
      <img
        src={admin.photo_url}
        alt={admin.name}
        onError={() => setError(true)}
        className="h-11 w-11 rounded-full object-cover ring-2 ring-gray-100"
      />
    )
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
      {admin.name?.[0]?.toUpperCase() || '؟'}
    </div>
  )
}

/* ================= Modal ================= */
function AdminModal({ open, onClose, onSubmit, initial, loading, isEdit, serverErrors }) {
  const [form, setForm] = useState(emptyForm)
  const [preview, setPreview] = useState(null)
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors] = useState({})
  const fileRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setForm({ name: initial?.name || '', username: initial?.username || '', password: '', photo: null })
    setPreview(initial?.photo_url || null)
    setErrors({})
    setShowPass(false)
    if (fileRef.current) fileRef.current.value = ''
  }, [open, initial])

  useEffect(() => {
    if (serverErrors && Object.keys(serverErrors).length) {
      const flat = {}
      Object.entries(serverErrors).forEach(([k, v]) => (flat[k] = Array.isArray(v) ? v[0] : v))
      setErrors((prev) => ({ ...prev, ...flat }))
    }
  }, [serverErrors])

  if (!open) return null

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setForm((f) => ({ ...f, photo: file }))
    setPreview(URL.createObjectURL(file))
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'نام الزامی است'
    if (!form.username.trim()) errs.username = 'نام کاربری الزامی است'
    if (!isEdit && !form.password) errs.password = 'رمز عبور الزامی است'
    if (form.password && form.password.length < 6) errs.password = 'رمز عبور باید حداقل ۶ کاراکتر باشد'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    const fd = new FormData()
    fd.append('name', form.name.trim())
    fd.append('username', form.username.trim())
    if (form.password) fd.append('password', form.password)
    if (form.photo) fd.append('photo', form.photo)
    if (isEdit) fd.append('_method', 'PUT')

    onSubmit(fd)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-800">{isEdit ? 'ویرایش مدیر' : 'افزودن مدیر جدید'}</h3>
          <button onClick={onClose} className="text-xl leading-none text-gray-400 hover:text-gray-600">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5 text-right">
          {/* Photo */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-20 w-20 overflow-hidden rounded-full bg-gray-100 ring-2 ring-gray-200">
              {preview ? (
                <img src={preview} alt="پیش‌نمایش" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-gray-400">
                  {form.name?.[0]?.toUpperCase() || '؟'}
                </div>
              )}
            </div>
            <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
              انتخاب عکس
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFile}
                className="hidden"
              />
            </label>
          </div>

          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">نام</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="مثلاً: علی رضایی"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Username */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">نام کاربری</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="مثلاً: alireza"
            />
            {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              رمز عبور {isEdit && <span className="text-gray-400">(در صورت خالی بودن تغییر نمی‌کند)</span>}
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-10 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <EyeIcon open={showPass} />
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? 'در حال ذخیره…' : isEdit ? 'بروزرسانی' : 'ایجاد'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ================= Confirm dialog ================= */
function ConfirmDialog({ open, title, message, onClose, onConfirm, loading }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            انصراف
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? 'در حال حذف…' : 'حذف'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ================= Page ================= */
export default function Admins() {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [serverErrors, setServerErrors] = useState({})

  const [confirm, setConfirm] = useState({ open: false, admin: null })
  const [deleting, setDeleting] = useState(false)

  const [me, setMe] = useState(null)

  /* ---- Loads ---- */
  const loadAdmins = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/admins')
      setAdmins(data)
    } catch (e) {
      setError(e?.response?.data?.message || 'خطا در بارگیری لیست مدیران')
    } finally {
      setLoading(false)
    }
  }

  const loadMe = async () => {
    try {
      const { data } = await api.get('/me')
      setMe(data)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadAdmins()
    loadMe()
  }, [])

  /* ---- Create / Update ---- */
  const handleSubmit = async (fd) => {
    setSaving(true)
    setServerErrors({})
    try {
      if (editing) {
        await api.post(`/admins/${editing.id}`, fd)
      } else {
        await api.post('/admins', fd)
      }
      setModalOpen(false)
      setEditing(null)
      await loadAdmins()
    } catch (e) {
      const data = e?.response?.data
      if (data?.errors) {
        setServerErrors(data.errors)
      } else {
        alert(data?.message || 'خطا در ذخیره‌سازی')
      }
    } finally {
      setSaving(false)
    }
  }

  /* ---- Delete ---- */
  const handleDelete = async () => {
    if (!confirm.admin) return
    setDeleting(true)
    try {
      await api.delete(`/admins/${confirm.admin.id}`)
      setConfirm({ open: false, admin: null })
      await loadAdmins()
    } catch (e) {
      alert(e?.response?.data?.message || 'خطا در حذف')
    } finally {
      setDeleting(false)
    }
  }

  /* ---- Derived ---- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return admins
    return admins.filter(
      (a) => a.name?.toLowerCase().includes(q) || a.username?.toLowerCase().includes(q)
    )
  }, [admins, search])

  const canDelete = (a) => me?.id !== a.id

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl px-4 py-6" dir="rtl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">مدیران</h1>
            <p className="text-sm text-gray-500">مدیریت حساب‌های کاربری مدیران</p>
          </div>
          <button
            onClick={() => {
              setEditing(null)
              setServerErrors({})
              setModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700"
          >
            <span className="text-lg leading-none">+</span> افزودن مدیر
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو بر اساس نام یا نام کاربری…"
            className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Body */}
        {loading ? (
          <Loader />
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center text-sm text-gray-500">
            هیچ مدیری یافت نشد.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* Table Header - RTL Grid */}
            <div className="hidden grid-cols-[auto_1fr_1fr_64px] items-center gap-4 border-b bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid">
              <div className="text-right">عملیات</div>
              <div className="text-right">نام کاربری</div>
              <div className="text-right">نام</div>
              <div className="text-center">عکس</div>
            </div>

            <ul className="divide-y divide-gray-100">
              {filtered.map((a) => (
                <li
                  key={a.id}
                  className="grid grid-cols-1 items-center gap-4 px-5 py-4 md:grid-cols-[auto_1fr_1fr_64px]"
                >
                  {/* Actions */}
                  <div className="flex justify-start gap-2">
                    <button
                      onClick={() => {
                        setEditing(a)
                        setServerErrors({})
                        setModalOpen(true)
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      ویرایش
                    </button>
                    <button
                      disabled={!canDelete(a)}
                      onClick={() => setConfirm({ open: true, admin: a })}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      title={!canDelete(a) ? 'شما نمی‌توانید خودتان را حذف کنید' : ''}
                    >
                      حذف
                    </button>
                  </div>

                  {/* Username */}
                  <div className="text-sm text-gray-600 text-right">
                    {a.username}
                  </div>

                  {/* Name */}
                  <div className="flex items-center gap-2 justify-start">
                    <span className="font-medium text-gray-800">{a.name}</span>
                    {me?.id === a.id && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                        شما
                      </span>
                    )}
                  </div>

                  {/* Photo */}
                  <div className="flex justify-center">
                    <Avatar admin={a} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <AdminModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
          setServerErrors({})
        }}
        onSubmit={handleSubmit}
        initial={editing}
        loading={saving}
        isEdit={!!editing}
        serverErrors={serverErrors}
      />

      <ConfirmDialog
        open={confirm.open}
        title="حذف مدیر"
        message={`آیا از حذف "${confirm.admin?.name}" اطمینان دارید؟ این عمل غیرقابل بازگشت است.`}
        onClose={() => setConfirm({ open: false, admin: null })}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </DashboardLayout>
  )
}