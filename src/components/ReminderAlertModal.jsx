import React, { useEffect, useCallback } from 'react';
import { FiBell, FiCheck, FiX, FiUser, FiClock } from 'react-icons/fi';
import { formatDateTime } from '../utils/helpers';

/**
 * Prominent alert modal shown when a scheduled reminder time is reached.
 * Displays the task details and offers two actions:
 *   - APPROVED (green) — the scheduled task was performed
 *   - REJECTED (red) — the scheduled task was missed
 */
export default function ReminderAlertModal({ reminder, onApprove, onReject }) {
    const handleKeyDown = useCallback((e) => {
        // Keyboard shortcuts: A = approve, R = reject
        if (e.key === 'a' || e.key === 'A') onApprove();
        if (e.key === 'r' || e.key === 'R') onReject();
    }, [onApprove, onReject]);

    useEffect(() => {
        if (reminder) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [reminder, handleKeyDown]);

    if (!reminder) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

            {/* Alert Card */}
            <div className="relative w-full max-w-md rounded-3xl shadow-2xl animate-alert-glow overflow-hidden border-2 border-red-500/60"
                style={{ background: 'var(--color-surface)' }}
            >
                {/* Top gradient accent */}
                <div className="h-2 w-full bg-gradient-to-r from-red-500 via-amber-500 to-red-500" />

                {/* Header */}
                <div className="flex items-center gap-4 px-6 pt-6 pb-4">
                    <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center animate-ring flex-shrink-0">
                        <FiBell className="w-7 h-7 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold leading-tight" style={{ color: 'var(--color-text)' }}>
                            Scheduled Reminder!
                        </h3>
                        <p className="text-xs font-semibold mt-0.5 flex items-center gap-1.5 text-red-500 uppercase tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            Time Reached
                        </p>
                    </div>
                    <span className="text-3xl">⏰</span>
                </div>

                {/* Task Details */}
                <div className="px-6 pb-4 space-y-3">
                    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                                Task Name
                            </p>
                            <p className="text-base font-bold mt-0.5 break-words" style={{ color: 'var(--color-text)' }}>
                                {reminder.name}
                            </p>
                        </div>

                        {reminder.description && (
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                                    Description
                                </p>
                                <p className="text-sm mt-0.5 break-words" style={{ color: 'var(--color-text-secondary)' }}>
                                    {reminder.description}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-2 pt-1">
                            <div className="flex items-center gap-2 text-sm">
                                <FiClock className="w-4 h-4 text-primary-500 flex-shrink-0" />
                                <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                                    {formatDateTime(reminder.scheduledAt)}
                                </span>
                            </div>
                            {reminder.worker && (
                                <div className="flex items-center gap-2 text-sm">
                                    <FiUser className="w-4 h-4 text-green-500 flex-shrink-0" />
                                    <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                                        {reminder.worker}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 pb-6 space-y-2.5">
                    <button
                        onClick={onApprove}
                        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-bold text-base text-white transition-all duration-200 active:scale-[0.98] hover:shadow-lg hover:shadow-green-500/40 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    >
                        <FiCheck className="w-5 h-5" />
                        APPROVED
                    </button>
                    <button
                        onClick={onReject}
                        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-bold text-base text-white transition-all duration-200 active:scale-[0.98] hover:shadow-lg hover:shadow-red-500/40 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
                    >
                        <FiX className="w-5 h-5" />
                        REJECTED
                    </button>

                    <p className="text-center text-[11px] pt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        Keyboard shortcuts: <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs">A</kbd> Approve · <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs">R</kbd> Reject
                    </p>
                </div>
            </div>
        </div>
    );
}

