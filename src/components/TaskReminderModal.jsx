import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ADVANCE_NOTICE_OPTIONS } from '../utils/notifications';
import { FiBell, FiX, FiCalendar, FiClock, FiUser, FiSave } from 'react-icons/fi';

export default function TaskReminderModal({ isOpen, onClose, initialData = null, task = null }) {
  const { state, addScheduledReminder, updateScheduledReminder, workers } = useApp();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [advanceNotice, setAdvanceNotice] = useState(5);
  const [worker, setWorker] = useState('');

  const isEditing = Boolean(initialData?.id);

  // Initialize or reset form values
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setWorker(initialData.worker || '');
      setAdvanceNotice(initialData.advanceNotice !== undefined ? initialData.advanceNotice : 5);

      if (initialData.scheduledAt) {
        const d = new Date(initialData.scheduledAt);
        if (!isNaN(d.getTime())) {
          const yr = d.getFullYear();
          const mo = String(d.getMonth() + 1).padStart(2, '0');
          const dy = String(d.getDate()).padStart(2, '0');
          setDate(`${yr}-${mo}-${dy}`);
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          setTime(`${hh}:${mm}`);
        }
      } else if (initialData.date && initialData.time) {
        setDate(initialData.date);
        setTime(initialData.time);
      }
    } else if (task) {
      setName(task.name || '');
      setDescription('');
      setWorker(task.worker || '');
      setAdvanceNotice(state.notificationSettings?.defaultAdvanceMinutes ?? 5);

      // Default to 1 hour from now
      const target = new Date(Date.now() + 60 * 60 * 1000);
      const yr = target.getFullYear();
      const mo = String(target.getMonth() + 1).padStart(2, '0');
      const dy = String(target.getDate()).padStart(2, '0');
      setDate(`${yr}-${mo}-${dy}`);
      const hh = String(target.getHours()).padStart(2, '0');
      const mm = String(target.getMinutes()).padStart(2, '0');
      setTime(`${hh}:${mm}`);
    } else {
      setName('');
      setDescription('');
      setWorker('');
      setAdvanceNotice(state.notificationSettings?.defaultAdvanceMinutes ?? 5);

      const target = new Date(Date.now() + 60 * 60 * 1000);
      const yr = target.getFullYear();
      const mo = String(target.getMonth() + 1).padStart(2, '0');
      const dy = String(target.getDate()).padStart(2, '0');
      setDate(`${yr}-${mo}-${dy}`);
      const hh = String(target.getHours()).padStart(2, '0');
      const mm = String(target.getMinutes()).padStart(2, '0');
      setTime(`${hh}:${mm}`);
    }
  }, [isOpen, initialData, task, state.notificationSettings]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const workerOptions = useMemo(() => {
    return workers.filter(w => w !== 'All Workers');
  }, [workers]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !date || !time) return;

    const [yr, mo, dy] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    const scheduledAtDate = new Date(yr, mo - 1, dy, hh, mm, 0, 0);

    if (isNaN(scheduledAtDate.getTime())) return;

    const payload = {
      name: name.trim(),
      description: description.trim(),
      scheduledAt: scheduledAtDate.toISOString(),
      advanceNotice: Number(advanceNotice),
      worker: worker.trim(),
      taskId: task?.id || initialData?.taskId || null,
      isEnabled: true,
    };

    if (isEditing) {
      updateScheduledReminder(initialData.id, payload);
    } else {
      addScheduledReminder(payload);
    }

    onClose();
  };

  if (!isOpen) return null;

  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div
        className="relative w-full max-w-lg rounded-2xl shadow-2xl animate-fade-in overflow-hidden border border-slate-200 dark:border-slate-800"
        style={{ background: 'var(--color-surface)' }}
      >
        {/* Header Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-primary-500 via-purple-500 to-primary-600" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              <FiBell className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                {isEditing ? 'Edit Reminder' : task ? `Set Reminder for "${task.name}"` : 'Schedule New Reminder'}
              </h3>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Receive exact-time alarm and advance system notifications
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Reminder Title *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Team Sync or Study Sprint"
              className="input-field"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Description / Notes (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add key context, links, or agenda..."
              className="input-field"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                <FiCalendar className="w-3.5 h-3.5" /> Date *
              </label>
              <input
                type="date"
                value={date}
                min={minDate}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                <FiClock className="w-3.5 h-3.5" /> Time *
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                <FiBell className="w-3.5 h-3.5" /> Early Warning Notice
              </label>
              <select
                value={advanceNotice}
                onChange={(e) => setAdvanceNotice(Number(e.target.value))}
                className="input-field cursor-pointer"
              >
                {ADVANCE_NOTICE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                <FiUser className="w-3.5 h-3.5" /> Assigned Worker
              </label>
              <input
                type="text"
                list="worker-list-options"
                value={worker}
                onChange={(e) => setWorker(e.target.value)}
                placeholder="Optional worker/person"
                className="input-field"
              />
              <datalist id="worker-list-options">
                {workerOptions.map(w => (
                  <option key={w} value={w} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-5 py-2.5 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2"
            >
              <FiSave className="w-4 h-4" />
              {isEditing ? 'Update Reminder' : 'Save Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
