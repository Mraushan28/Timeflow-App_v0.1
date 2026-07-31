import React, { useEffect, useCallback } from 'react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

export default function ConfirmModal({ isOpen, title, message, confirmLabel, onConfirm, onCancel, isDanger }) {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && onCancel) onCancel();
  }, [onCancel]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl animate-fade-in overflow-hidden"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (isDanger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30')}>
              <FiAlertTriangle className={'w-5 h-5 ' + (isDanger ? 'text-red-500' : 'text-amber-500')} />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              {title || 'Confirm Action'}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {message || 'Are you sure you want to proceed? This action cannot be undone.'}
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
          <button onClick={onCancel} className="btn-secondary px-5 py-2.5 text-sm">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={'px-5 py-2.5 text-sm font-medium rounded-xl text-white transition-all duration-200 active:scale-95 ' + (isDanger
              ? 'bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/25'
              : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary-500/25')}
          >
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
