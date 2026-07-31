import React from 'react';
import { FiBarChart2 } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer
      className="mt-12 py-8 border-t"
      style={{
        background: '#0f172a',
        borderTop: '1px solid #1e293b',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-md">
              <FiBarChart2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">TimeFlow</p>
              <p className="text-xs text-slate-400">Time Management & Audit</p>
            </div>
          </div>

          {/* Credits */}
          <div className="text-center md:text-right">
            <p className="text-sm font-medium text-slate-200">
              Developed by <span className="text-primary-400 font-semibold">Rahul Raushan</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              &copy; 2026 Time Management & Daily Activity Audit App. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

