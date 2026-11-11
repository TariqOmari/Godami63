import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Barcode, Camera, X, Loader2, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import axios from 'axios';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export default function Scanner() {
  const scannerRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState('');
  const [loading, setLoading] = useState(false);

  /* ---------- start scanning ---------- */
  const start = async () => {
    setError('');
    setProduct(null);
    setNotFound('');

    try {
      const scanner = new Html5Qrcode('reader');
      scannerRef.current = scanner;
      setRunning(true);

      await scanner.start(
        { facingMode: 'environment' },     // دوربین عقب
        { fps: 10, qrbox: 250 },
        async (decodedText) => {
          await scanner.stop();
          setRunning(false);
          lookup(decodedText);
        },
        () => {}   // خطای فریم‌ها را نادیده بگیر
      );
    } catch (e) {
      console.error(e);
      setError('دوربین باز نشد. اجازه دسترسی بده.');
      setRunning(false);
    }
  };

  const stop = async () => {
    try { await scannerRef.current?.stop(); } catch {}
    setRunning(false);
  };

  /* ---------- lookup product ---------- */
  const lookup = async (code) => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const { data } = await axios.get(`${API}/products`, {
        params: { barcode: code },
        headers: { Accept: 'application/json', Authorization: token ? `Bearer ${token}` : '' },
      });

      const list = Array.isArray(data) ? data : (data.data || []);
      if (list.length === 0) setNotFound(code);
      else setProduct(list[0]);
    } catch (e) {
      console.error(e);
      setError('خطا در جستجو');
    } finally {
      setLoading(false);
    }
  };

  /* ---------- manual input ---------- */
  const [manual, setManual] = useState('');
  const submitManual = (e) => {
    e.preventDefault();
    if (manual.trim()) { lookup(manual.trim()); setManual(''); }
  };

  useEffect(() => () => { scannerRef.current?.stop().catch(() => {}); }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 flex items-start justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">

        {/* Header */}
        <div className="bg-blue-600 p-4 flex items-center gap-3 text-white">
          <Barcode size={22} />
          <h1 className="font-bold">اسکن بارکد</h1>
        </div>

        <div className="p-4 space-y-4">

          {/* Camera */}
          <div className="relative aspect-square bg-black rounded-xl overflow-hidden">
            <div id="reader" className="w-full h-full"></div>
            {!running && !product && !notFound && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70">
                <Camera size={42} />
                <p className="text-xs mt-2">دوربین خاموش است</p>
              </div>
            )}
          </div>

          {/* Buttons */}
          {!running ? (
            <button
              onClick={start}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <Camera size={18} /> شروع اسکن
            </button>
          ) : (
            <button
              onClick={stop}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <X size={18} /> توقف
            </button>
          )}

          {/* Manual input */}
          <form onSubmit={submitManual} className="flex gap-2">
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="یا بارکد را دستی وارد کن..."
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-blue-500"
              dir="ltr"
            />
            <button
              type="submit"
              disabled={loading || !manual.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl font-bold disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'برو'}
            </button>
          </form>

          {/* Error */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex gap-2 text-rose-700 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {/* Not found */}
          {notFound && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <p className="font-bold text-amber-800 text-sm">محصولی با این بارکد پیدا نشد</p>
              <p className="text-xs font-mono text-amber-700" dir="ltr">{notFound}</p>
              <button
                onClick={start}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} /> اسکن مجدد
              </button>
            </div>
          )}

          {/* Product result */}
          {product && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                <CheckCircle2 size={18} /> محصول پیدا شد
              </div>

              <div className="flex items-center gap-3">
                {product.photo_url ? (
                  <img src={product.photo_url} alt={product.name} className="w-16 h-16 rounded-xl object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold text-xl">
                    {product.name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.category || '—'}</p>
                  <p className="text-[11px] font-mono text-gray-400" dir="ltr">{product.barcode}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-2">
                <Line label="تامین‌کننده" value={product.supplier?.supplier_name || '—'} />
                <Line label="قیمت واحد" value={`${Number(product.price).toLocaleString()} ${product.currency}`} />
                <Line label="نرخ تبادل" value={`1 USD = ${Number(product.exchange_rate).toLocaleString()} AFN`} />
                <Line label="ساختار" value={
                  `1 ${product.module_name}` +
                  (product.sub_module_name ? ` = ${product.sub_module_qty} ${product.sub_module_name}` : '') +
                  (product.sub_sub_module_name ? ` = ${product.sub_sub_module_qty} ${product.sub_sub_module_name}` : '')
                } />
                <Line label="وضعیت پرداخت" value={{
                  cash: 'نقد', loan_full: 'قرض کامل', loan_partial: 'قرض جزئی'
                }[product.payment_type] || '—'} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Box title="قیمت نهایی" color="blue"
                  afn={product.final_price_afn} usd={product.final_price_usd} />
                <Box title="پرداخت‌شده" color="emerald"
                  afn={product.paid_amount_afn} usd={product.paid_amount_usd} />
              </div>

              {Number(product.remaining_amount) > 0 && (
                <Box title="باقی‌مانده" color="rose" full
                  afn={product.remaining_amount_afn} usd={product.remaining_amount_usd} />
              )}

              <button
                onClick={start}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} /> اسکن بعدی
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Line({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500 text-xs">{label}</span>
      <b className="text-gray-800 text-xs text-left">{value}</b>
    </div>
  );
}

function Box({ title, color, afn, usd, full }) {
  const colors = {
    blue:    'bg-blue-50 border-blue-200 text-blue-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    rose:    'bg-rose-50 border-rose-200 text-rose-700',
  };
  return (
    <div className={`rounded-xl p-3 border ${colors[color]} ${full ? 'col-span-2' : ''}`}>
      <p className="text-[10px] font-bold mb-1">{title}</p>
      <p className="text-sm font-black">{Number(afn || 0).toLocaleString()}</p>
      <p className="text-[10px] opacity-75">AFN</p>
      <p className="text-xs font-bold mt-1">$ {Number(usd || 0).toLocaleString()}</p>
    </div>
  );
}