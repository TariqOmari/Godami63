import React, { useState } from 'react';
import Sidbar from './Sidbar';
import Navbar from './Navbar';

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div
      className="min-h-screen bg-orange-50/30 flex"
      dir="rtl"
      style={{ fontFamily: "'Vazirmatn', sans-serif" }}
    >
      <Sidbar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex flex-col min-w-0 lg:mr-72 transition-all duration-300">
        <Navbar toggleSidebar={toggleSidebar} />

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}