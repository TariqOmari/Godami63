import React, { useEffect, useState, useMemo } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import Loader from '../components/Loader'

import {
  Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, ComposedChart
} from 'recharts'

import {
  Wallet, Package, TrendingUp, ArrowDownToLine,
  RefreshCw, Banknote, ChartNoAxesCombined,
  Building2, Plus, Pencil, Trash2, Save, X
} from 'lucide-react'

const API = import.meta.env.VITE_API_BASE_URL || '/api'

/* ---------- formatters ---------- */
const fmtAFN = (n) =>
  Number(n || 0).toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })

const fmtUSD = (n) =>
  Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

/* ---------- Jalali today helper ---------- */
function todayJalali() {
  const now = new Date()
  const gy = now.getFullYear()
  const gm = now.getMonth() + 1
  const gd = now.getDate()

  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  const gy2 = gm > 2 ? gy + 1 : gy

  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1]

  let jy = -1595 + 33 * Math.floor(days / 12053)
  days %= 12053
  jy += 4 * Math.floor(days / 1461)
  days %= 1461
  if (days > 365) {
    jy += Math.floor((days - 1) / 365)
    days = (days - 1) % 365
  }
  let jm, jd
  if (days < 186) {
    jm = 1 + Math.floor(days / 31)
    jd = 1 + (days % 31)
  } else {
    jm = 7 + Math.floor((days - 186) / 30)
    jd = 1 + ((days - 186) % 30)
  }
  return `${jy}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')}`
}

/* ---------- UI atoms ---------- */
const Card = ({ children, className = '' }) => (
  <div className={`bg-white border border-orange-200 rounded-2xl
    shadow-[0_5px_20px_rgba(194,110,35,0.07)]
    hover:shadow-[0_10px_28px_rgba(194,110,35,0.13)]
    transition-all duration-300 ${className}`}>
    {children}
  </div>
)

const StatCard = ({ title, subtitle, afn, usd, icon: Icon, color = 'orange' }) => (
  <Card className="p-6">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
        <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
      </div>

      <div className={`w-12 h-12 rounded-xl flex items-center justify-center
        ${color === 'green' ? 'bg-emerald-50 text-emerald-600' : 
          color === 'blue' ? 'bg-blue-50 text-blue-600' : 
          'bg-orange-50 text-orange-600'}`}>
        <Icon size={23} />
      </div>
    </div>

    <div>
      <p className="text-xs text-slate-400 mb-1">موجودی به افغانی</p>
      <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
        {fmtAFN(afn)}
        <span className="text-sm font-semibold text-slate-400 mr-2">AFN</span>
      </h2>
    </div>

    <div className="border-t border-dashed border-orange-200 mt-5 pt-4 flex justify-between items-center">
      <span className="text-sm text-slate-400">معادل دالر</span>
      <span className="font-bold text-slate-700">${fmtUSD(usd)}</span>
    </div>
  </Card>
)

const SmallCard = ({ title, value, icon: Icon, color = 'orange', description }) => (
  <Card className="p-5">
    <div className="flex justify-between items-center">
      <span className="text-sm text-slate-500">{title}</span>
      <Icon size={19} className={
        color === 'green' ? 'text-emerald-500' : 
        color === 'blue' ? 'text-blue-500' : 
        'text-orange-500'
      } />
    </div>
    <h3 className="text-2xl font-extrabold text-slate-800 mt-4">
      {fmtAFN(value)}<span className="text-xs text-slate-400 mr-2">AFN</span>
    </h3>
    <p className="text-xs text-slate-400 mt-3">{description}</p>
  </Card>
)

/* =========================================================
   FIXED CAPITAL BLOCK
   ========================================================= */
const emptyFixedForm = () => ({
  title: '',
  amount: '',
  currency: 'AFN',
  exchange_rate: 1,
  entry_date: todayJalali(),
  note: '',
})

function FixedCapitalBlock() {
  const [items, setItems] = useState([])
  const [totals, setTotals] = useState({ afn: 0, usd: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [form, setForm] = useState(emptyFixedForm())
  const [showForm, setShowForm] = useState(false)

  const fetchFixed = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`${API}/fixed-capitals`, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      const json = await res.json()
      setItems(json.items || [])
      setTotals(json.totals || { afn: 0, usd: 0 })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFixed() }, [])

  const resetForm = () => {
    setForm(emptyFixedForm())
    setEditing(null)
    setShowForm(false)
  }

  const startEdit = (item) => {
    setEditing(item.id)
    setForm({
      title: item.title || '',
      amount: item.amount ?? '',
      currency: item.currency || 'AFN',
      exchange_rate: item.exchange_rate ?? 1,
      entry_date: item.entry_date || todayJalali(),
      note: item.note || '',
    })
    setShowForm(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const method = editing ? 'PUT' : 'POST'
      const url = editing ? `${API}/fixed-capitals/${editing}` : `${API}/fixed-capitals`

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        let msg = `Error ${res.status}`
        try {
          const j = await res.json()
          if (j?.message) msg = j.message
          else if (j?.errors) msg = Object.values(j.errors).flat().join(' | ')
        } catch (_) {
          const t = await res.text()
          if (t) msg = t
        }
        throw new Error(msg)
      }

      await fetchFixed()
      resetForm()
    } catch (err) {
      alert('خطا: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('این ردیف سرمایه ثابت حذف شود؟')) return
    setDeletingId(id)
    try {
      const res = await fetch(`${API}/fixed-capitals/${id}`, { method: 'DELETE', headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      await fetchFixed()
      if (editing === id) resetForm()
    } catch (err) {
      alert('خطا در حذف: ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <StatCard title="مجموع سرمایه ثابت" subtitle="جمع تمام ردیف‌ها به افغانی" afn={totals.afn} usd={totals.usd} icon={Building2} color="blue" />
        <StatCard title="مجموع سرمایه ثابت" subtitle="معادل مجموع به دالر" afn={totals.afn} usd={totals.usd} icon={Wallet} color="green" />
      </div>

      <div className="flex items-center justify-between gap-4 mb-4 mt-8">
        <div className="flex items-center gap-2">
          <Building2 className="text-orange-500" size={20} />
          <h2 className="font-bold text-slate-700">مدیریت ردیف‌های سرمایه ثابت</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <button type="button" onClick={fetchFixed} className="text-xs text-orange-600 hover:text-orange-800 flex items-center gap-1">
            <RefreshCw size={13} /> بروزرسانی
          </button>
          
          {!showForm && (
            <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition text-sm shadow-sm">
              <Plus size={16} /> افزودن ردیف سرمایه ثابت
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <Card className="p-5 sm:p-6 mb-6 border-orange-300">
          <div className="flex items-center gap-2 mb-5">
            {editing ? <Pencil className="text-orange-500" size={18} /> : <Plus className="text-orange-500" size={18} />}
            <h3 className="font-bold text-slate-700">{editing ? 'ویرایش ردیف سرمایه ثابت' : 'افزودن ردیف سرمایه ثابت جدید'}</h3>
            <button type="button" onClick={resetForm} className="mr-auto text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg">
              <X size={14} /> انصراف
            </button>
          </div>

          {error && <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">خطا: {error}</div>}

          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">عنوان *</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثلاً: کمپیوتر، قفسه" className="w-full px-3 py-2.5 rounded-xl border border-orange-200 focus:border-orange-400 outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">مبلغ *</label>
              <input required type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-orange-200 focus:border-orange-400 outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">واحد پول *</label>
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-orange-200 focus:border-orange-400 outline-none text-sm">
                <option value="AFN">AFN — افغانی</option>
                <option value="USD">USD — دالر</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">نرخ تبادله *</label>
              <input required type="number" step="0.0001" min="0.0001" value={form.exchange_rate} onChange={(e) => setForm({ ...form, exchange_rate: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-orange-200 focus:border-orange-400 outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">تاریخ ثبت (شمسی) *</label>
              <input required value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} placeholder="1403-08-20" dir="ltr" className="w-full px-3 py-2.5 rounded-xl border border-orange-200 focus:border-orange-400 outline-none text-sm" />
            </div>
            <div className="md:col-span-5">
              <label className="text-xs text-slate-500 mb-1 block">یادداشت</label>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="توضیح اختیاری" className="w-full px-3 py-2.5 rounded-xl border border-orange-200 focus:border-orange-400 outline-none text-sm" />
            </div>
            <div className="md:col-span-1 flex items-end">
              <button disabled={saving} type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition disabled:opacity-50 text-sm">
                <Save size={16} /> {saving ? '...' : editing ? 'ذخیره' : 'افزودن'}
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-orange-50 text-slate-700">
              <tr>
                <th className="text-right px-4 py-3 font-bold">عنوان</th>
                <th className="text-right px-4 py-3 font-bold">مبلغ</th>
                <th className="text-right px-4 py-3 font-bold">واحد</th>
                <th className="text-right px-4 py-3 font-bold">نرخ</th>
                <th className="text-right px-4 py-3 font-bold">تاریخ (شمسی)</th>
                <th className="text-right px-4 py-3 font-bold">معادل AFN</th>
                <th className="text-right px-4 py-3 font-bold">معادل USD</th>
                <th className="text-right px-4 py-3 font-bold">یادداشت</th>
                <th className="text-center px-4 py-3 font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="text-center text-slate-400 py-10">در حال بارگذاری...</td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan={9} className="text-center text-slate-400 py-10">هنوز ردیف سرمایه ثابت ثبت نشده است</td></tr>}
              {!loading && items.map((it) => {
                  const rate = Number(it.exchange_rate) || 1
                  const amount = Number(it.amount) || 0
                  const afn = it.currency === 'USD' ? amount * rate : amount
                  const usd = it.currency === 'USD' ? amount : rate > 0 ? amount / rate : 0
                  return (
                    <tr key={it.id} className={`border-t border-orange-100 hover:bg-orange-50/40 ${editing === it.id ? 'bg-orange-50/60' : ''}`}>
                      <td className="px-4 py-3 font-bold text-slate-800">{it.title}</td>
                      <td className="px-4 py-3">{fmtAFN(amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${it.currency === 'USD' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>{it.currency}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{rate}</td>
                      <td className="px-4 py-3 text-slate-600" dir="ltr">{it.entry_date || '—'}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{fmtAFN(afn)} AFN</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">${fmtUSD(usd)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-[220px] truncate">{it.note || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => startEdit(it)} title="ویرایش" className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"><Pencil size={15} /></button>
                          <button onClick={() => remove(it.id)} disabled={deletingId === it.id} title="حذف" className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

/* =========================================================
   CASH CAPITAL BLOCK (NOW WITH AFN & USD)
   ========================================================= */
const emptyCashForm = () => ({
  amount: '',
  currency: 'AFN',
  exchange_rate: 1,
  entry_date: todayJalali(),
  note: '',
})

function CashCapitalBlock() {
  const [items, setItems] = useState([])
  const [totals, setTotals] = useState({ afn: 0, usd: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [form, setForm] = useState(emptyCashForm())
  const [showForm, setShowForm] = useState(false)

  const fetchCash = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`${API}/cash-capitals`, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      const json = await res.json()
      setItems(json.items || [])
      setTotals(json.totals || { afn: 0, usd: 0 })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCash() }, [])

  const resetForm = () => {
    setForm(emptyCashForm())
    setEditing(null)
    setShowForm(false)
  }

  const startEdit = (item) => {
    setEditing(item.id)
    setForm({
      amount: item.amount ?? '',
      currency: item.currency || 'AFN',
      exchange_rate: item.exchange_rate ?? 1,
      entry_date: item.entry_date || todayJalali(),
      note: item.note || '',
    })
    setShowForm(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const method = editing ? 'PUT' : 'POST'
      const url = editing ? `${API}/cash-capitals/${editing}` : `${API}/cash-capitals`

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) throw new Error(`Error ${res.status}`)

      await fetchCash()
      resetForm()
    } catch (err) {
      alert('خطا: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('این تراکنش نقدی حذف شود؟')) return
    setDeletingId(id)
    try {
      const res = await fetch(`${API}/cash-capitals/${id}`, { method: 'DELETE', headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      await fetchCash()
      if (editing === id) resetForm()
    } catch (err) {
      alert('خطا در حذف: ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      {/* SUMMARY TOTALS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <StatCard 
          title="مجموع سرمایه نقدی" 
          subtitle="جمع کل تراکنش‌های نقدی به افغانی" 
          afn={totals.afn} 
          usd={totals.usd} 
          icon={Wallet} 
          color="green" 
        />
        <StatCard 
          title="مجموع سرمایه نقدی" 
          subtitle="معادل مجموع به دالر" 
          afn={totals.afn} 
          usd={totals.usd} 
          icon={Banknote} 
          color="orange" 
        />
      </div>

      <div className="flex items-center justify-between gap-4 mb-4 mt-8">
        <div className="flex items-center gap-2">
          <Wallet className="text-orange-500" size={20} />
          <h2 className="font-bold text-slate-700">مدیریت تراکنش‌های سرمایه نقدی</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <button type="button" onClick={fetchCash} className="text-xs text-orange-600 hover:text-orange-800 flex items-center gap-1">
            <RefreshCw size={13} /> بروزرسانی
          </button>
          
          {!showForm && (
            <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition text-sm shadow-sm">
              <Plus size={16} /> افزودن تراکنش نقدی
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <Card className="p-5 sm:p-6 mb-6 border-orange-300">
          <div className="flex items-center gap-2 mb-5">
            {editing ? <Pencil className="text-orange-500" size={18} /> : <Plus className="text-orange-500" size={18} />}
            <h3 className="font-bold text-slate-700">{editing ? 'ویرایش تراکنش نقدی' : 'افزودن تراکنش نقدی جدید'}</h3>
            <button type="button" onClick={resetForm} className="mr-auto text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg">
              <X size={14} /> انصراف
            </button>
          </div>

          {error && <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">خطا: {error}</div>}

          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">مبلغ *</label>
              <input required type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-orange-200 focus:border-orange-400 outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">واحد پول *</label>
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-orange-200 focus:border-orange-400 outline-none text-sm">
                <option value="AFN">AFN — افغانی</option>
                <option value="USD">USD — دالر</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">نرخ تبادله *</label>
              <input required type="number" step="0.0001" min="0.0001" value={form.exchange_rate} onChange={(e) => setForm({ ...form, exchange_rate: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-orange-200 focus:border-orange-400 outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">تاریخ ثبت (شمسی) *</label>
              <input required value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} placeholder="1403-08-20" dir="ltr" className="w-full px-3 py-2.5 rounded-xl border border-orange-200 focus:border-orange-400 outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">یادداشت</label>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="توضیح اختیاری" className="w-full px-3 py-2.5 rounded-xl border border-orange-200 focus:border-orange-400 outline-none text-sm" />
            </div>
            
            <div className="md:col-span-5 flex justify-end mt-2">
              <button disabled={saving} type="submit" className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition disabled:opacity-50 text-sm">
                <Save size={16} /> {saving ? '...' : editing ? 'ذخیره' : 'افزودن'}
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-orange-50 text-slate-700">
              <tr>
                <th className="text-right px-4 py-3 font-bold">مبلغ</th>
                <th className="text-right px-4 py-3 font-bold">واحد</th>
                <th className="text-right px-4 py-3 font-bold">نرخ</th>
                <th className="text-right px-4 py-3 font-bold">تاریخ (شمسی)</th>
                <th className="text-right px-4 py-3 font-bold">معادل AFN</th>
                <th className="text-right px-4 py-3 font-bold">معادل USD</th>
                <th className="text-right px-4 py-3 font-bold">یادداشت</th>
                <th className="text-center px-4 py-3 font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-center text-slate-400 py-10">در حال بارگذاری...</td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan={8} className="text-center text-slate-400 py-10">هنوز تراکنش نقدی ثبت نشده است</td></tr>}
              {!loading && items.map((it) => {
                const rate = Number(it.exchange_rate) || 1
                const amount = Number(it.amount) || 0
                const afn = it.currency === 'USD' ? amount * rate : amount
                const usd = it.currency === 'USD' ? amount : rate > 0 ? amount / rate : 0

                return (
                  <tr key={it.id} className={`border-t border-orange-100 hover:bg-orange-50/40 ${editing === it.id ? 'bg-orange-50/60' : ''}`}>
                    <td className="px-4 py-3 font-bold text-slate-800">{fmtAFN(amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${it.currency === 'USD' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>{it.currency}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{rate}</td>
                    <td className="px-4 py-3 text-slate-600" dir="ltr">{it.entry_date || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{fmtAFN(afn)} AFN</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">${fmtUSD(usd)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[220px] truncate">{it.note || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => startEdit(it)} title="ویرایش" className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"><Pencil size={15} /></button>
                        <button onClick={() => remove(it.id)} disabled={deletingId === it.id} title="حذف" className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

/* =========================================================
   MAIN PAGE
   ========================================================= */
export default function Capital() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('business')

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`${API}/products/capital`, { headers: { Accept: 'application/json' } })
      const responseText = await res.text()
      if (!res.ok || responseText.trim().startsWith('<')) throw new Error(`Server returned ${res.status}`)
      setData(JSON.parse(responseText))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const chartData = useMemo(() => {
    const raw = Array.isArray(data?.chart_data) ? data.chart_data : []
    const seen = new Map()
    const result = []
    raw.forEach(point => {
      if (!point?.date) return
      const key = String(point.date)
      const value = Number(point.profit) || 0
      if (seen.has(key)) result[seen.get(key)].profit = value
      else {
        seen.set(key, result.length)
        result.push({ date: key, profit: value })
      }
    })
    return result
  }, [data])

  if (loading) return <DashboardLayout><Loader /></DashboardLayout>
  if (error) return <DashboardLayout><div className="p-6 text-red-600">خطا: {error}<button onClick={fetchData} className="mr-3 underline">تلاش دوباره</button></div></DashboardLayout>

  return (
    <DashboardLayout>
      <div dir="rtl" className="min-h-screen bg-[#fafafa] p-4 sm:p-6 lg:p-8">
        
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-7 bg-orange-500 rounded-full" />
              <h1 className="text-2xl font-extrabold text-slate-800">مدیریت سرمایه و سود</h1>
            </div>
            <p className="text-sm text-slate-400">نظارت بر سرمایه، دارایی‌ها و عملکرد مالی تجارت</p>
          </div>

          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-orange-200 bg-white text-orange-600 hover:bg-orange-50 transition shadow-sm text-sm font-bold">
            <RefreshCw size={16} /> بروزرسانی
          </button>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-3 mb-7 border-b border-orange-100 pb-3">
          <button onClick={() => setActiveTab('business')} className={`px-5 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'business' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-600 border border-orange-100 hover:bg-orange-50'}`}>
            <span className="flex items-center gap-2"><Package size={17} /> سرمایه تجارت و سود</span>
          </button>
          <button onClick={() => setActiveTab('other')} className={`px-5 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'other' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-600 border border-orange-100 hover:bg-orange-50'}`}>
            <span className="flex items-center gap-2"><Building2 size={17} /> سرمایه ثابت </span>
          </button>
        </div>

        {/* TAB 1: BUSINESS CAPITAL */}
        {activeTab === 'business' && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Package className="text-orange-500" size={20} />
              <h2 className="font-bold text-slate-700">وضعیت سرمایه تجارت</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
              <StatCard title="سرمایه بند در اجناس" subtitle="ارزش خرید موجودی فعلی انبار" afn={data?.freezed_capital_afn} usd={data?.freezed_capital_usd} icon={Package} color="orange" />
              <StatCard title="سود کل فروشات" subtitle="مجموع سود ثبت‌شده از فروش" afn={data?.total_profit_afn} usd={data?.total_profit_usd} icon={TrendingUp} color="green" />
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Wallet className="text-orange-500" size={20} />
              <h2 className="font-bold text-slate-700">گردش سرمایه</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <SmallCard title="سرمایه بند در انبار" value={data?.freezed_capital_afn} icon={Package} color="orange" description="ارزش خرید موجودی فعلی" />
              <SmallCard title="سرمایه آزادشده از فروش" value={data?.released_capital_afn} icon={ArrowDownToLine} color="blue" description="اصل بهای خرید اجناس فروخته‌شده" />
              <SmallCard title="سود حاصل از فروش" value={data?.total_profit_afn} icon={TrendingUp} color="green" description="مجموع سود فروشات ثبت‌شده" />
            </div>

            <Card className="p-5 sm:p-7 mb-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center">
                    <ChartNoAxesCombined className="text-orange-500" size={23} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800 text-lg">روند رشد سود</h2>
                    <p className="text-xs text-slate-400 mt-1">بررسی تغییرات سود انباشته در طول زمان</p>
                  </div>
                </div>
                <span className="text-xs px-3 py-2 rounded-lg bg-orange-50 text-orange-600 font-bold">نمودار تجمعی</span>
              </div>

              {chartData.length <= 1 ? (
                <div className="h-72 flex flex-col items-center justify-center text-slate-400">
                  <ChartNoAxesCombined size={42} className="mb-3 opacity-40" />
                  <p className="text-sm">هنوز اطلاعات کافی برای نمودار وجود ندارد</p>
                </div>
              ) : (
                <div className="h-80 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" stopOpacity={0.17} />
                          <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 5" vertical={false} stroke="#f1e5db" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={v => Number(v).toLocaleString()} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #fed7aa', boxShadow: '0 5px 20px rgba(0,0,0,0.07)', direction: 'rtl' }} formatter={v => [`${fmtAFN(v)} AFN`, 'سود انباشته']} />
                      <Area type="monotone" dataKey="profit" stroke="none" fill="url(#profitFill)" />
                      <Line type="monotone" dataKey="profit" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: '#fff', stroke: '#f97316', strokeWidth: 2 }} activeDot={{ r: 7, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }} animationDuration={1200} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <div className="flex items-start gap-3 p-4 bg-orange-50/70 border border-orange-100 rounded-xl">
              <Banknote className="text-orange-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-bold text-slate-700 text-sm">معلومات حسابداری</h3>
                <p className="text-xs text-slate-500 mt-1 leading-6">
                  سرمایه بند در انبار بر اساس ارزش خرید موجودی محاسبه می‌شود.
                  سرمایه آزادشده باید از بهای تمام‌شده اجناس فروخته‌شده
                  محاسبه گردد. سود فروش نیز جداگانه نمایش داده می‌شود.
                </p>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: FIXED AND CASH CAPITAL */}
        {activeTab === 'other' && (
          <>
            <div className="flex items-center gap-2 mb-5">
              <Building2 className="text-orange-500" size={22} />
              <div>
                <h2 className="font-bold text-slate-800 text-lg">سرمایه ثابت و نقدی</h2>
                <p className="text-xs text-slate-400 mt-1">مدیریت دارایی‌های ثابت و پول نقد تجارت</p>
              </div>
            </div>

            {/* FIXED CAPITAL */}
            <FixedCapitalBlock />

            {/* CASH CAPITAL */}
            <div className="mt-12">
              <CashCapitalBlock />
            </div>

            <Card className="p-5 mt-8">
              <div className="flex items-start gap-3">
                <Banknote className="text-orange-500 mt-1" size={22} />
                <div>
                  <h3 className="font-bold text-slate-700">معلومات سرمایه</h3>
                  <p className="text-sm text-slate-500 leading-7 mt-2">
                    سرمایه ثابت شامل دارایی‌هایی مانند تجهیزات،
                    کمپیوتر، قفسه‌ها و وسایل تجارت است.
                    سرمایه نقدی شامل پول موجود در صندوق و حساب‌های بانکی است.
                    این ارقام باید از سیستم ثبت دارایی‌ها و گردش حساب‌ها
                    دریافت شوند.
                  </p>
                </div>
              </div>
            </Card>
          </>
        )}

      </div>
    </DashboardLayout>
  )
}