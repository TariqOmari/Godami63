import React, { useState, useEffect, useRef } from 'react';
import { Menu, Bell, Clock, AlertTriangle, TrendingUp, X, Package } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const api = axios.create({ baseURL: API_BASE_URL, headers: { Accept: 'application/json' } });

export default function Navbar({ toggleSidebar }) {
  const [admin, setAdmin] = useState(null);
  const [time, setTime] = useState(new Date());
  
  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const adminInfo = sessionStorage.getItem('admin_info');
    if (adminInfo) {
      try {
        setAdmin(JSON.parse(adminInfo));
      } catch (e) {
        console.error("Failed to parse admin info");
      }
    }

    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    // Fetch token for API
    const token = sessionStorage.getItem('auth_token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    return () => clearInterval(timer);
  }, []);

  // Fetch products to check warnings
  const fetchWarnings = async () => {
    try {
      const { data } = await api.get('/products');
      const activeWarnings = [];
      
      data.forEach(p => {
        const cartons = Number(p.final_qty) || 0;
        const cans = Number(p.sub_module_final_qty) || 0;
        const pieces = Number(p.sub_sub_module_final_qty) || 0;
        
        // Calculate total pieces in stock for comparison
        const totalStock = pieces > 0 ? pieces : (cans > 0 ? cans : cartons);
        
        const lowLimit = Number(p.low_stock_warning) || 0;
        const highLimit = Number(p.high_stock_warning) || 0;

        if (lowLimit > 0 && totalStock <= lowLimit) {
          activeWarnings.push({
            id: p.id,
            name: p.name,
            type: 'low',
            current: totalStock,
            limit: lowLimit,
            unit: p.sub_sub_module_name || p.sub_module_name || p.module_name,
            batchNumber: p.batch_number || p.bill_number || `ID: ${p.id}`
          });
        } else if (highLimit > 0 && totalStock >= highLimit) {
          activeWarnings.push({
            id: p.id,
            name: p.name,
            type: 'high',
            current: totalStock,
            limit: highLimit,
            unit: p.sub_sub_module_name || p.sub_module_name || p.module_name,
            batchNumber: p.batch_number || p.bill_number || `ID: ${p.id}`
          });
        }
      });
      
      // Sort so low stock warnings appear first
      activeWarnings.sort((a, b) => a.type === 'low' ? -1 : 1);
      
      setWarnings(activeWarnings);
    } catch (e) {
      console.error("Failed to fetch warnings", e);
    }
  };

  useEffect(() => {
    fetchWarnings();
    // Optional: Set an interval to refresh warnings every 5 minutes
    const warningInterval = setInterval(fetchWarnings, 5 * 60 * 1000);
    return () => clearInterval(warningInterval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format Time (12-hour format with AM/PM)
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // 100% Reliable Afghan Solar Hijri Date Converter
  const getAfghanDate = (date) => {
    const afghanMonths = [
      "حمل", "ثور", "جوزا", "سرطان", "اسد", "سنبله", 
      "میزان", "عقرب", "قوس", "جدی", "دلو", "حوت"
    ];
    
    const weekdays = [
      "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"
    ];

    let gy = date.getFullYear();
    let gm = date.getMonth() + 1;
    let gd = date.getDate();

    let jy, jm, jd;

    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
    
    jy = -1595 + (33 * Math.floor(days / 12053));
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    
    if (days > 365) {
      jy += Math.floor((days - 1) / 365);
      days = (days - 1) % 365;
    }
    
    if (days < 186) {
      jm = 1 + Math.floor(days / 31);
      jd = 1 + (days % 31);
    } else {
      jm = 7 + Math.floor((days - 186) / 30);
      jd = 1 + ((days - 186) % 30);
    }

    const weekdayName = weekdays[date.getDay()];
    const monthName = afghanMonths[jm - 1];

    const toPersianNum = (num) => Number(num).toLocaleString('fa-IR', { useGrouping: false });
    
    return `${weekdayName}، ${toPersianNum(jd)} ${monthName} ${toPersianNum(jy)}`;
  };

  const formatEnglishDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <header 
      className="bg-gradient-to-r from-orange-600 to-amber-500 border-b border-white/20 h-20 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30 shadow-md shadow-orange-900/10"
      dir="rtl"
    >
      {/* Right Side (Mobile Menu, Greeting, Date/Time) */}
      <div className="flex items-center gap-2 sm:gap-6">
        {/* Mobile Menu Button */}
        <button 
          onClick={toggleSidebar}
          className="p-1.5 sm:p-2 rounded-lg bg-white/15 text-white hover:bg-white/25 lg:hidden transition-colors shrink-0"
        >
          <Menu size={20} className="sm:w-6 sm:h-6" />
        </button>
        
        {/* Welcome Message */}
        <div>
          <h2 className="text-xs sm:text-lg font-bold text-white flex items-center gap-1 sm:gap-2 whitespace-nowrap">
            سلام {admin?.username || 'کاربر'} خوش آمدید! <span className="hidden sm:inline text-xl">👋</span>
          </h2>
        </div>

        {/* Date and Time Section */}
        <div className="flex items-center gap-2 sm:gap-6 border-r border-white/20 pr-2 sm:pr-6 mr-1 sm:mr-2">
          
          {/* Clock */}
          <div className="flex items-center gap-1 sm:gap-2 text-white/90">
            <Clock size={12} className="sm:w-[18px] sm:h-[18px] text-white shrink-0" />
            <span className="font-mono text-[10px] sm:text-sm tracking-wider font-semibold whitespace-nowrap" dir="ltr">
              {formatTime(time)}
            </span>
          </div>

          {/* Dates */}
          <div className="flex flex-col text-[9px] sm:text-xs text-white/80 whitespace-nowrap">
            <span className="font-medium">{getAfghanDate(time)}</span>
            <span className="hidden md:block text-[10px] text-white/60 font-light" dir="ltr">
              {formatEnglishDate(time)}
            </span>
          </div>

        </div>
      </div>

      {/* Left Side (Notifications) */}
      <div className="flex items-center shrink-0 relative" ref={dropdownRef}>
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-1.5 sm:p-2.5 rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
        >
          <Bell size={18} className="sm:w-5 sm:h-5" />
          
          {/* Numeric Badge */}
          {warnings.length > 0 && (
            <span className="absolute -top-1 -right-1 sm:top-0 sm:right-0 flex items-center justify-center min-w-[16px] h-4 sm:min-w-[20px] sm:h-5 px-1 bg-red-500 text-white text-[9px] sm:text-[10px] font-bold rounded-full border-2 border-white shadow-sm">
              {warnings.length > 9 ? '9+' : warnings.length}
            </span>
          )}
        </button>

        {/* Notification Dropdown */}
        {showNotifications && (
          <div className="absolute top-full left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
            <div className="bg-slate-50 p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Bell size={16} /> هشدارهای موجودی ({warnings.length})
              </h3>
              <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto p-2">
              {warnings.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm flex flex-col items-center gap-2">
                  <Package size={24} className="text-gray-300" />
                  هیچ هشداری وجود ندارد
                </div>
              ) : (
                <div className="space-y-2">
                  {warnings.map((w, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                      w.type === 'low' ? 'bg-amber-50 border-amber-100' : 'bg-rose-50 border-rose-100'
                    }`}>
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                          w.type === 'low' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                        }`}>
                          {w.type === 'low' ? <AlertTriangle size={16} /> : <TrendingUp size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate">{w.name}</p>
                          <p className={`text-xs mt-0.5 font-medium ${
                            w.type === 'low' ? 'text-amber-700' : 'text-rose-700'
                          }`}>
                            {w.type === 'low' 
                              ? `موجودی کم: ${w.current} ${w.unit} (کمتر از ${w.limit})` 
                              : `موجودی زیاد: ${w.current} ${w.unit} (بیشتر از ${w.limit})`}
                          </p>
                        </div>
                      </div>
                      
                      {/* Batch Number Badge */}
                      <div className="shrink-0 flex items-center justify-center bg-white border border-gray-200 px-2 py-1 rounded-md shadow-sm">
                        <span className="text-[10px] font-mono font-bold text-gray-500" dir="ltr">
                          {w.batchNumber}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {warnings.length > 0 && (
              <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
                <button 
                  onClick={() => { setShowNotifications(false); window.location.href='/products'; }}
                  className="text-xs font-bold text-slate-800 hover:text-slate-600"
                >
                  مشاهده محصولات
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}