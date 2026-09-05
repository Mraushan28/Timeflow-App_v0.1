import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FiSun, FiMoon, FiBarChart2, FiPower, FiTrash2, FiBell, FiCloud, FiAlertTriangle, FiX } from 'react-icons/fi';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';
import NotificationCenterModal from './NotificationCenterModal';
import BackupSyncModal from './BackupSyncModal';
import { SYNC_STATUS } from '../utils/syncService';

export default function Navbar() {
  const { state, authUser, syncStatus, toggleTheme, toggleAppActive, resetAllData, resetAllDataWithCloud } = useApp();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showBackupSync, setShowBackupSync] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success', isVisible: false });

  const activeRemindersCount = (state.scheduledReminders || []).filter(r => r.status === 'PENDING' && r.isEnabled !== false).length;

  const handleResetAnonymous = () => {
    resetAllData();
    setShowResetConfirm(false);
    setToast({ message: 'Application data reset successfully!', type: 'success', isVisible: true });
  };

  const handleResetLocalOnly = () => {
    resetAllDataWithCloud(false);
    setShowResetConfirm(false);
    setToast({ message: 'Local data reset. Cloud backup preserved.', type: 'success', isVisible: true });
  };

  const handleResetLocalAndCloud = async () => {
    await resetAllDataWithCloud(true);
    setShowResetConfirm(false);
    setToast({ message: 'All local and cloud data permanently deleted.', type: 'success', isVisible: true });
  };

  return (
    <>
      <nav className="sticky top-0 z-50" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          {/* justify-between: logo far left, action controls far right */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 h-14 sm:h-16">
            {/* Left: App Logo & Name */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25 flex-shrink-0">
                <FiBarChart2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold leading-tight truncate" style={{ color: 'var(--color-text)' }}>
                  TimeFlow
                </h1>
                <p className="text-[10px] sm:text-xs font-medium hidden sm:block truncate" style={{ color: 'var(--color-text-secondary)' }}>
                  Time Management & Audit
                </p>
              </div>
            </div>

            {/* Right: Action Controls (Reset · Active Toggle · Cloud · Notification · Theme) */}
            <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 flex-shrink-0">
              {/* Reset All Data Button */}
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 font-semibold text-xs sm:text-sm transition-all duration-200 hover:scale-105 hover:bg-red-100 dark:hover:bg-red-900/40 hover:shadow-md hover:shadow-red-500/20"
                aria-label="Reset all data"
                title="Reset All Data"
              >
                <FiTrash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Reset Data</span>
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

              {/* Cloud Backup & Sync Button */}
              <button
                onClick={() => setShowBackupSync(true)}
                className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 flex-shrink-0"
                style={{ background: 'var(--color-bg)' }}
                aria-label="Cloud backup and data sync"
                title={authUser ? `Cloud Backup (${authUser.email}): ${syncStatus}` : 'Cloud Backup & Sync (Optional)'}
              >
                <FiCloud className={`w-4 h-4 sm:w-5 sm:h-5 ${authUser ? 'text-primary-500' : 'text-slate-600 dark:text-slate-300'}`} />
                {authUser && (
                  <span
                    className={`absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${syncStatus === SYNC_STATUS.SYNCED
                        ? 'bg-green-500'
                        : syncStatus === SYNC_STATUS.SYNCING
                          ? 'bg-blue-500 animate-pulse'
                          : syncStatus === SYNC_STATUS.OFFLINE
                            ? 'bg-amber-500'
                            : syncStatus === SYNC_STATUS.ERROR
                              ? 'bg-red-500'
                              : 'bg-slate-400'
                      }`}
                  />
                )}
              </button>

              {/* Notification Center Button */}
              <button
                onClick={() => setShowNotificationCenter(true)}
                className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 flex-shrink-0"
                style={{ background: 'var(--color-bg)' }}
                aria-label="Notifications and reminder settings"
                title="Notifications & Reminders"
              >
                <FiBell className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-300" />
                {activeRemindersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary-500 text-white text-[10px] sm:text-xs font-bold flex items-center justify-center shadow-md animate-pulse">
                    {activeRemindersCount > 9 ? '9+' : activeRemindersCount}
                  </span>
                )}
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 flex-shrink-0"
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
      </nav>

      {/* Cloud Backup & Sync Modal */}
      <BackupSyncModal
        isOpen={showBackupSync}
        onClose={() => setShowBackupSync(false)}
      />

      {/* Notification Center Modal */}
      <NotificationCenterModal
        isOpen={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
      />

      {/* Reset Confirmation Modal */}
      {authUser ? (
        /* Authenticated Reset Dialog with Cloud Option */
        showResetConfirm && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)} />
            <div
              className="relative w-full max-w-md rounded-3xl shadow-2xl animate-fade-in overflow-hidden border border-red-200 dark:border-red-900/50"
              style={{ background: 'var(--color-surface)' }}
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center">
                      <FiAlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                        Reset Application Data
                      </h3>
                      <p className="text-xs text-slate-400">Signed in as {authUser.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  You are currently signed in to cloud backup. Please select how you want to reset:
                </p>

                <div className="space-y-2.5 pt-1">
                  <button
                    onClick={handleResetLocalAndCloud}
                    className="w-full p-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold text-left transition-all shadow-md shadow-red-500/25 flex flex-col gap-0.5"
                  >
                    <span>💥 Reset Local & Delete Cloud Backup</span>
                    <span className="text-[10px] font-normal opacity-85">Permanently deletes all tasks, logs, and challenge data from cloud and this device.</span>
                  </button>

                  <button
                    onClick={handleResetLocalOnly}
                    className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-left transition-all flex flex-col gap-0.5"
                    style={{ color: 'var(--color-text)' }}
                  >
                    <span>📱 Reset Local Device Only</span>
                    <span className="text-[10px] font-normal text-slate-400">Clears this browser only. Cloud backup remains intact for other devices.</span>
                  </button>

                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="w-full btn-secondary text-xs py-2 mt-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        /* Anonymous Reset Dialog */
        <ConfirmModal
          isOpen={showResetConfirm}
          title="Reset All Data"
          message="Are you sure you want to reset all tracked data and history? All saved logs will be permanently deleted from this browser."
          confirmLabel="Yes, Reset Everything"
          onConfirm={handleResetAnonymous}
          onCancel={() => setShowResetConfirm(false)}
          isDanger={true}
        />
      )}

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
