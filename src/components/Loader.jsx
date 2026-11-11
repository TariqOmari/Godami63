import React from 'react';

export default function Loader({ text = "در حال بارگذاری..." }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm transition-opacity" dir="rtl">
      <div className="relative flex items-center justify-center">
        {/* Outer Ring */}
        <div className="w-20 h-20 rounded-full border-4 border-gray-100"></div>
        
        {/* Animated Gradient Ring */}
        <div className="absolute top-0 left-0 w-20 h-20 rounded-full border-4 border-transparent border-t-blue-600 border-r-cyan-500 animate-spin"></div>
        
        {/* Inner Glowing Dot */}
        <div className="absolute w-3 h-3 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-full animate-pulse"></div>
      </div>
      
      {/* Loading Text */}
      <p className="mt-6 text-gray-600 font-medium animate-pulse" style={{ fontFamily: "'Vazirmatn', sans-serif" }}>
        {text}
      </p>
    </div>
  );
}