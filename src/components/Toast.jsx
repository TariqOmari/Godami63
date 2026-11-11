import React, { useEffect } from 'react';
import { CheckCircle, X, AlertTriangle } from 'lucide-react';

export default function Toast({ message, onClose, duration = 4000, type = 'success' }) {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const config = {
    success: {
      icon: <CheckCircle size={22} />,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      border: 'border-emerald-100',
      shadow: 'shadow-emerald-500/10',
      bar: 'from-emerald-500 to-teal-400',
      title: 'موفقیت‌آمیز بود'
    },
    warning: {
      icon: <AlertTriangle size={22} />,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      border: 'border-amber-100',
      shadow: 'shadow-amber-500/10',
      bar: 'from-amber-500 to-orange-400',
      title: 'توجه'
    }
  };

  const c = config[type] || config.success;

  return (
    <div 
      className="fixed top-6 right-6 z-[200] animate-in slide-in-from-top-5 fade-in duration-300"
      dir="rtl"
    >
      <div className={`bg-white border ${c.border} rounded-2xl shadow-2xl ${c.shadow} overflow-hidden w-80 relative`}>
        <div 
          className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${c.bar}`}
          style={{ 
            animation: `shrink ${duration}ms linear forwards`,
            width: '100%'
          }}
        />
        
        <div className="flex items-start gap-4 p-5">
          <div className={`shrink-0 w-10 h-10 rounded-full ${c.iconBg} flex items-center justify-center ${c.iconColor}`}>
            {c.icon}
          </div>
          
          <div className="flex-1 pt-1">
            <h4 className="text-sm font-bold text-gray-800 mb-1">{c.title}</h4>
            <p className="text-xs text-gray-500 leading-relaxed">{message}</p>
          </div>

          <button 
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}