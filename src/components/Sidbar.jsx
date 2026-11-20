import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  User as UserIcon,
  Warehouse,
  Receipt,
  HandCoins,
  Wallet,
  PackageSearch,
  Truck,
  Bell,
  CreditCard,
  User


} from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import Toast from './Toast';


// ============ API ============
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const api = axios.create({ baseURL: API_BASE_URL, headers: { Accept: 'application/json' } });
api.interceptors.request.use((c) => {
  const t = sessionStorage.getItem('auth_token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

export default function Sidbar({ isOpen, toggleSidebar }) {
  const [admin, setAdmin] = useState(null);
  const [showLogoutToast, setShowLogoutToast] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const adminInfo = sessionStorage.getItem('admin_info');
    if (adminInfo) {
      try {
        setAdmin(JSON.parse(adminInfo));
      } catch (e) {
        console.error("Failed to parse admin info");
      }
    }
  }, []);

  // ========== LIVE UNSEEN NOTIFICATION COUNT ==========
  const fetchUnseenCount = async () => {
    try {
      const { data } = await api.get('/notifications', { params: { limit: 1 } });
      setUnseenCount(data?.unseen_count || 0);
    } catch (e) {
      // silent — don't break the sidebar
    }
  };

  useEffect(() => {
    // Run scan so fresh triggers become notifications, then fetch count
    (async () => {
      try {
        await api.post('/notifications/scan');
      } catch { /* silent */ }
      fetchUnseenCount();
    })();

    // Poll every 60s so the badge stays fresh
    const interval = setInterval(fetchUnseenCount, 60 * 1000);

    // Re-fetch when user navigates (e.g. after leaving notifications page)
    return () => clearInterval(interval);
  }, []);

  // Re-fetch count when route changes (user might have marked seen elsewhere)
  useEffect(() => {
    fetchUnseenCount();
  }, [location.pathname]);

  const handleLogoutClick = () => {
    setShowLogoutToast(true);

    setTimeout(() => {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('admin_info');
      navigate('/login', { replace: true });
    }, 2000);
  };

  const menuItems = [
    { title: 'داشبورد', path: '/', icon: <LayoutDashboard size={22} /> },
    { title: 'مدیریت تامین‌کنندگان', path: '/suppliers', icon: <Truck size={22} /> },
    { title: 'مدیریت محصولات و موجودی', path: '/products', icon: <PackageSearch size={22} /> },
    { title: 'مشتریان', path: '/customer', icon: <Users size={22} /> },
    { title: 'فروش', path: '/sales', icon: <ShoppingCart size={22} /> },
    { title: 'فاکتور فروش', path: '/sales-invoices', icon: <Receipt size={22} /> },
    { title: 'مدیریت قرضه‌ها', path: '/loans', icon: <HandCoins size={22} /> },
    { title: 'مدیریت سرمایه و دخل', path: '/capital', icon: <Wallet size={22} /> },
    { title: 'مدیریت ثبت مصارف', path: '/expenses', icon: <CreditCard size={22} /> },
    { title: 'عواید', path: '/incomes-report', icon: <HandCoins size={22} /> },
    {
      title: 'اعلان‌ها',
      path: '/notification',
      icon: <Bell size={22} />,
      badge: unseenCount,       // 👈 LIVE BADGE
    },
    { title: ' برگشتی فروشات', path: '/back-return', icon: <Wallet size={22} /> },
    
    { title: ' مدیریت ادمین‌ها', path: '/admins', icon: <User size={22} /> },


  ];

  return (
    <>
      {showLogoutToast && (
        <Toast
          message="در حال خروج از سیستم... به امید دیدار!"
          onClose={() => setShowLogoutToast(false)}
          duration={2000}
          type="warning"
        />
      )}

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`fixed top-0 right-0 z-50 h-screen w-72 bg-gradient-to-b from-orange-600 to-amber-500 border-l border-white/20 shadow-lg shadow-orange-950/20 transition-transform duration-300 ease-in-out flex flex-col
          ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
        dir="rtl"
      >
        {/* Admin Profile Section */}
        <div className="h-32 flex flex-col items-center justify-center border-b border-white/20 p-4 bg-black/5">
          <div className="relative">
            {admin?.photo_url ? (
              <img
                src={admin.photo_url}
                alt={admin.name || "Profile"}
                className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xl border-4 border-white/80 shadow-lg">
                {admin?.name?.charAt(0).toUpperCase() || <UserIcon size={24} />}
              </div>
            )}

            <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></span>
          </div>

          <div className="mt-3 text-center">
            <h3 className="text-sm font-bold text-white">
              {admin?.name || 'کاربر مهمان'}
            </h3>
            <p className="text-[11px] text-white/75 font-medium" dir="ltr">
              @{admin?.username || 'guest'}
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 hide-scrollbar [scrollbar-width:none] [-ms-overflow-style:none]">
          <p className="px-4 text-xs font-bold text-white/70 mb-4 tracking-wider">منوی اصلی</p>
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const hasBadge = item.badge && item.badge > 0;

            return (
              <Link
                key={index}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) toggleSidebar();
                }}
                className={`relative flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 font-medium
                  ${isActive
                    ? 'bg-white text-orange-700 shadow-md'
                    : 'text-white/90 hover:bg-white/15 hover:text-white'
                  }
                `}
              >
                {/* ICON + tiny dot */}
                <span className="relative shrink-0">
                  {item.icon}
                  {hasBadge && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 ring-2 ring-orange-600 animate-pulse" />
                  )}
                </span>

                <span className="flex-1 truncate">{item.title}</span>

                {/* BADGE */}
                {hasBadge && (
                  <span className={`shrink-0 min-w-[24px] h-6 px-1.5 rounded-full text-[11px] font-black flex items-center justify-center shadow-sm ${
                    isActive
                      ? 'bg-rose-500 text-white'
                      : 'bg-white text-rose-600 ring-2 ring-rose-200'
                  }`}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}

                {isActive && !hasBadge && (
                  <span className="mr-auto w-1.5 h-6 bg-orange-500 rounded-full"></span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button Section */}
        <div className="p-4 border-t border-white/20">
          <button
            onClick={handleLogoutClick}
            className="w-full group relative overflow-hidden bg-white hover:bg-orange-50 text-orange-700 font-bold py-3.5 rounded-xl shadow-lg shadow-orange-900/10 transition-all duration-300 flex items-center justify-center gap-3"
          >
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-orange-100/60 to-transparent"></span>

            <LogOut size={20} className="group-hover:rotate-12 transition-transform duration-300" />
            <span>خروج از حساب</span>
          </button>

          <p className="text-center text-[10px] text-white/70 mt-3">
            نسخه ۱.۰.۰ | © ۲۰۲۴
          </p>
        </div>
      </aside>
    </>
  );
}