import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, ArrowLeft, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import Toast from '../components/Toast';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('لطفا نام کاربری و رمز عبور را وارد کنید.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        username: username,
        password: password
      });

      // YOUR API RESPONSE: { message, token, admin }
      const { token, admin } = response.data;
      
      if (token) {
        // Save token
        sessionStorage.setItem('auth_token', token);
        
        // Save admin info
        if (admin) {
          sessionStorage.setItem('admin_info', JSON.stringify(admin));
        }
        
        // Show success toast
        setShowToast(true);
        
        // Wait for toast, then redirect
        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess();
          } else {
            navigate('/', { replace: true });
          }
        }, 1500);
        
      } else {
        setError('پاسخ سرور نامعتبر است. لطفا دوباره تلاش کنید.');
        setIsLoading(false);
      }
    } catch (err) {
      if (err.response) {
        setError(err.response.data.message || 'نام کاربری یا رمز عبور اشتباه است.');
      } else if (err.request) {
        setError('خطا در ارتباط با سرور. لطفا اتصال اینترنت خود را بررسی کنید.');
      } else {
        setError('خطای غیرمنتظره‌ای رخ داد. لطفا دوباره تلاش کنید.');
      }
      setIsLoading(false);
    }
  };

  return (
    <>
      {isLoading && <Loader text="در حال ورود به سیستم..." />}
      
      {showToast && (
        <Toast 
          message="با موفقیت وارد سیستم شدید. خوش آمدید!" 
          onClose={() => setShowToast(false)}
          duration={4000}
        />
      )}

      <div 
        className="min-h-screen flex bg-[#f8fafc]" 
        dir="rtl" 
        style={{ fontFamily: "'Vazirmatn', sans-serif" }}
      >
        {/* Right Side - Branding / Gradient */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-600 to-amber-500 relative items-center justify-center overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-amber-300/25 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 text-center px-12 text-white">
            <h1 className="text-5xl font-black mb-6 tracking-tight">ایاز محمدی</h1>
            <p className="text-xl text-orange-50 font-medium leading-relaxed">
              سیستم مدیریت یکپارچه شرکت نرم‌افزاری
            </p>
            <div className="mt-12 flex justify-center gap-4">
              <div className="w-2 h-2 rounded-full bg-white/50"></div>
              <div className="w-8 h-2 rounded-full bg-white"></div>
              <div className="w-2 h-2 rounded-full bg-white/50"></div>
            </div>
          </div>
        </div>

        {/* Left Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md">
            
            <div className="text-center mb-10 lg:hidden">
              <h1 className="text-3xl font-black text-orange-700 mb-2">ایاز محمدی</h1>
              <p className="text-sm text-gray-500">سیستم مدیریت شرکت نرم‌افزاری</p>
            </div>

            <div className="mb-10 text-center lg:text-right">
              <h2 className="text-3xl font-bold text-gray-800 mb-3">خوش آمدید 👋</h2>
              <p className="text-gray-500">لطفا برای ورود به حساب کاربری خود اطلاعات را وارد کنید.</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle size={20} className="mt-0.5 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 mr-1">نام کاربری</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-orange-600 transition-colors">
                    <User size={20} />
                  </div>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="نام کاربری خود را وارد کنید" 
                    disabled={isLoading}
                    className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl py-3.5 pr-12 pl-4 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all placeholder:text-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 mr-1">رمز عبور</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-orange-600 transition-colors">
                    <Lock size={20} />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    disabled={isLoading}
                    className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl py-3.5 pr-12 pl-12 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all placeholder:text-gray-400 text-left disabled:opacity-60 disabled:cursor-not-allowed"
                    dir="ltr"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    disabled={isLoading}
                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">مرا به خاطر بسپار</span>
                </label>
                <a href="#" className="text-sm font-bold text-orange-700 hover:text-orange-800 transition-colors">
                  فراموشی رمز عبور؟
                </a>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all duration-300 flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    در حال پردازش...
                  </span>
                ) : (
                  <>
                    <span>ورود به سیستم</span>
                    <ArrowLeft size={20} />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-400 mt-10">
              © ۲۰۲۴ ایاز محمدی. تمامی حقوق محفوظ است.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}