import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FiSun, FiMoon, FiBarChart2, FiPower, FiTrash2 } from 'react-icons/fi';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';

export default function Navbar() {
  const { state, toggleTheme, toggleAppActive, resetAllData } = useApp();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success', isVisible: false });

  const handleResetAllData = () => {
    resetAllData();
    setShowResetConfirm(false);
    setToast({ message: 'All data has been reset successfully.', type: 'success', isVisible: true });
  };

  return (
    <>
      <nav className="sticky top-0 z-50" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
                <FiBarChart2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                  TimeFlow
                </h1>
                <p className="text-[10px] sm:text-xs font-medium hidden sm:block" style={{ color: 'var(--color-text-secondary)' }}>
                  Time Management & Audit
                </p>
              </div>

              {/* Right side controls */}
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Reset All Data Button */}
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 hover:bg-red-50 dark:hover:bg-red-900/20"
                  style={{ background: 'var(--color-bg)' }}
                  aria-label="Reset all data"
                  title="Reset All Data"
                >
                  <FiTrash2 className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 hover:text-red-500" />
                </button>

                {/* Master Active Toggle */}
                <div className="flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl" style={{ background: 'var(--color-bg)' }}>
                  <FiPower className={'w-3.5 h-3.5 sm:w-4 sm:h-4 ' + (state.appActive ? 'text-green-500' : 'text-slate-400')} />
                  <span className="text-[10px] sm:text-xs font-medium hidden sm:inline" style={{ color: 'var(--color-text-secondary)' }}>
                    Active
                  </span>
                  <button
                    onClick={toggleAppActive}
                    className={'relative w-9 h-5 sm:w-11 sm:h-6 rounded-full transition-all duration-300 flex-shrink-0 ' + (state.appActive ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600')}
                    aria-label="Toggle app active state"
                  >
                    <span
                      className={'absolute top-0.5 left-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white shadow-md transition-all duration-300 ' + (state.appActive ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0')}
                    />
                  </button>
                </div>

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
                  style={{ background: 'var(--color-bg)' }}
                  aria-label="Toggle theme"
                >
                  {state.theme === 'dark' ? (
                    <FiSun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                  ) : (
                    <FiMoon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="Reset All Data"
        message="This will permanently delete all tasks, timer history, and analytics data. This action cannot be undone. Are you sure you want to proceed?"
        confirmLabel="Yes, Reset Everything"
        onConfirm={handleResetAllData}
        onCancel={() => setShowResetConfirm(false)}
        isDanger={true}
      />

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </>
  );
}
