import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  ADVANCE_NOTICE_OPTIONS,
  formatAdvanceNotice,
} from '../utils/notifications';
import { formatDateTime, formatCountdown } from '../utils/helpers';
import TaskReminderModal from './TaskReminderModal';
import {
  FiBell, FiX, FiCheckCircle, FiAlertCircle, FiClock,
  FiEdit2, FiTrash2, FiSend, FiVolume2, FiVolumeX,
  FiZap, FiCalendar, FiUser, FiInfo, FiPlus,
} from 'react-icons/fi';

export default function NotificationCenterModal({ isOpen, onClose }) {
  const {
    state,
    updateNotificationSettings,
    toggleScheduledReminder,
    deleteScheduledReminder,
  } = useApp();

  const [permission, setPermission] = useState(getNotificationPermission());
  const [testSent, setTestSent] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [now, setNow] = useState(Date.now());

  const settings = state.notificationSettings || {
    enabled: false,
    soundEnabled: true,
    timerNotifications: true,
    breakNotifications: true,
    scheduleNotifications: true,
    defaultAdvanceMinutes: 5,
  };

  // Sync permission state when opened
  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
    }
  }, [isOpen]);

  // Live countdown ticker
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !editingReminder && !showCreateModal) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, editingReminder, showCreateModal, onClose]);

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      updateNotificationSettings({ enabled: true });
    }
  };

  const handleTestAlert = async () => {
    const success = await sendTestNotification();
    if (success) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3500);
    }
  };

  const activeReminders = state.scheduledReminders
    .filter(r => r.status === 'PENDING')
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        {/* Modal Container */}
        <div
          className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl animate-fade-in overflow-hidden border border-slate-200 dark:border-slate-800"
          style={{ background: 'var(--color-surface)' }}
        >
          {/* Top decorative accent */}
          <div className="h-1.5 w-full bg-gradient-to-r from-primary-500 via-indigo-500 to-primary-600 flex-shrink-0" />

          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white shadow-md shadow-primary-500/20">
                <FiBell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold leading-tight" style={{ color: 'var(--color-text)' }}>
                  Notification Center & Settings
                </h2>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  Manage system alerts, timing rules, and active reminders
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              aria-label="Close"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 1. Permission Status Banner */}
            <div className="rounded-2xl p-4.5 border transition-all" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
              {permission === 'granted' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 flex-shrink-0 mt-0.5">
                      <FiCheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                          System Notifications Active
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 uppercase">
                          Enabled
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        TimeFlow will send native alerts for scheduled tasks, advance reminders, and focus timer finishes.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleTestAlert}
                    className="btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5 flex-shrink-0 self-start sm:self-center"
                  >
                    <FiSend className="w-3.5 h-3.5" />
                    {testSent ? 'Sent! Check device' : 'Send Test Alert'}
                  </button>
                </div>
              )}

              {permission === 'default' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 flex-shrink-0 mt-0.5">
                      <FiBell className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                        Enable Native Notifications
                      </h4>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        Receive background alerts when your tasks are due or when focus timers complete, even when TimeFlow is minimized.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRequestPermission}
                    className="btn-primary text-xs py-2 px-4 flex items-center justify-center gap-1.5 flex-shrink-0 self-start sm:self-center whitespace-nowrap"
                  >
                    <FiBell className="w-3.5 h-3.5" />
                    Enable Notifications
                  </button>
                </div>
              )}

              {permission === 'denied' && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 flex-shrink-0 mt-0.5">
                    <FiAlertCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-red-600 dark:text-red-400">
                        Notifications Blocked in Browser
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 uppercase">
                        Blocked
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      Browser permissions were previously denied. To receive native task reminders, click the padlock / site settings icon in your browser's URL address bar and allow Notifications for this site.
                    </p>
                  </div>
                </div>
              )}

              {permission === 'unsupported' && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0 mt-0.5">
                    <FiInfo className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                      System Notifications Not Supported
                    </h4>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      Your browser does not support native background notifications. In-app audio chimes and on-screen modals will continue to notify you while the app is open.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Notification Preferences */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                Notification Preferences
              </h3>

              <div className="space-y-2">
                {/* Timer Finished Notifications */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-500">
                      <FiClock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Focus Timer Alerts</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Notify when countdown sessions reach 00:00:00</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateNotificationSettings({ timerNotifications: !settings.timerNotifications })}
                    className={`relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
                      settings.timerNotifications ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                      settings.timerNotifications ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Break Finished Notifications */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-500">
                      <FiZap className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Break Completion Alerts</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Notify when relaxation break periods finish</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateNotificationSettings({ breakNotifications: !settings.breakNotifications })}
                    className={`relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
                      settings.breakNotifications ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                      settings.breakNotifications ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Scheduled Schedule Alerts */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-500">
                      <FiCalendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Scheduled Task Reminders</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Notify at exact scheduled time and early warnings</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateNotificationSettings({ scheduleNotifications: !settings.scheduleNotifications })}
                    className={`relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
                      settings.scheduleNotifications ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                      settings.scheduleNotifications ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Sound & Audio Chimes */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-500">
                      {settings.soundEnabled ? <FiVolume2 className="w-4 h-4" /> : <FiVolumeX className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Audio Alarm Chime</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Play looping melody when alarms or timers fire</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateNotificationSettings({ soundEnabled: !settings.soundEnabled })}
                    className={`relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
                      settings.soundEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                      settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Default Early Warning Interval */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-500">
                      <FiBell className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Default Advance Notice</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Default early warning lead time for new reminders</p>
                    </div>
                  </div>
                  <select
                    value={settings.defaultAdvanceMinutes ?? 5}
                    onChange={(e) => updateNotificationSettings({ defaultAdvanceMinutes: Number(e.target.value) })}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none cursor-pointer"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {ADVANCE_NOTICE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Active Reminders Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                    Active Scheduled Reminders
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-bold">
                    {activeReminders.length}
                  </span>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <FiPlus className="w-3.5 h-3.5" />
                  New Reminder
                </button>
              </div>

              {activeReminders.length > 0 ? (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {activeReminders.map(reminder => {
                    const dueCountdown = formatCountdown(reminder.scheduledAt);
                    const isDueSoon = new Date(reminder.scheduledAt).getTime() - now <= 5 * 60 * 1000;
                    const isMuted = reminder.isEnabled === false;

                    return (
                      <div
                        key={reminder.id}
                        className={`p-3.5 rounded-2xl transition-all border ${
                          isMuted ? 'opacity-60 bg-slate-50 dark:bg-slate-800/30' : ''
                        }`}
                        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className={`text-sm font-semibold truncate ${isMuted ? 'line-through' : ''}`} style={{ color: 'var(--color-text)' }}>
                                {reminder.name}
                              </h4>
                              {isMuted && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500">
                                  Disabled
                                </span>
                              )}
                            </div>

                            {reminder.description && (
                              <p className="text-xs mt-1 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                                {reminder.description}
                              </p>
                            )}

                            <div className="flex items-center flex-wrap gap-2 mt-2">
                              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                <FiCalendar className="w-3 h-3" />
                                {formatDateTime(reminder.scheduledAt)}
                              </span>

                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                isDueSoon
                                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                  : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                              }`}>
                                <FiClock className="w-3 h-3" />
                                {dueCountdown}
                              </span>

                              {reminder.advanceNotice > 0 && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center gap-1">
                                  <FiBell className="w-3 h-3" />
                                  {formatAdvanceNotice(reminder.advanceNotice)}
                                </span>
                              )}

                              {reminder.worker && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center gap-1">
                                  <FiUser className="w-3 h-3" />
                                  {reminder.worker}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {/* Enable/Disable Toggle */}
                            <button
                              onClick={() => toggleScheduledReminder(reminder.id)}
                              className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                                isMuted
                                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                                  : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200'
                              }`}
                              title={isMuted ? 'Enable Reminder' : 'Disable Reminder'}
                            >
                              {isMuted ? 'Muted' : 'Active'}
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => setEditingReminder(reminder)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                              title="Edit Reminder"
                            >
                              <FiEdit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => deleteScheduledReminder(reminder.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                              title="Delete Reminder"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 rounded-2xl" style={{ background: 'var(--color-bg)', border: '1px dashed var(--color-border)' }}>
                  <p className="text-3xl mb-2">🔔</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    No Active Reminders
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Schedule task reminders to receive exact time alerts and early warnings.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary text-xs mt-4 py-2 px-4 inline-flex items-center gap-1.5"
                  >
                    <FiPlus className="w-3.5 h-3.5" />
                    Schedule a Reminder
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Reminder Modal */}
      {editingReminder && (
        <TaskReminderModal
          isOpen={Boolean(editingReminder)}
          onClose={() => setEditingReminder(null)}
          initialData={editingReminder}
        />
      )}

      {/* Create New Reminder Modal */}
      {showCreateModal && (
        <TaskReminderModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </>
  );
}
