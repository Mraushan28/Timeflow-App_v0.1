import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { startLoopingAlarm } from '../utils/audio';
import { sendNotification } from '../utils/notifications';
import { formatCountdown } from '../utils/helpers';
import ReminderAlertModal from './ReminderAlertModal';

/**
 * Global manager that watches scheduled reminders every second.
 * - Handles advance warnings (5m, 10m, 15m, 30m, 1h) via native notifications
 * - Promotes reminders from PENDING -> TRIGGERED at exact time
 * - Dispatches native notifications & audio alarm according to settings
 * - Deduplicates alerts and handles expired/muted reminders safely
 */
export default function ReminderAlarmManager() {
  const {
    state,
    triggerScheduledReminder,
    resolveScheduledReminder,
    markReminderAdvanceNotified,
    markReminderExactNotified,
  } = useApp();

  const [activeReminder, setActiveReminder] = useState(null);
  const stopAlarmRef = useRef(null);

  const stateRef = useRef(state);
  stateRef.current = state;

  const triggerRef = useRef(triggerScheduledReminder);
  triggerRef.current = triggerScheduledReminder;

  const markAdvanceRef = useRef(markReminderAdvanceNotified);
  markAdvanceRef.current = markReminderAdvanceNotified;

  const markExactRef = useRef(markReminderExactNotified);
  markExactRef.current = markReminderExactNotified;

  const resolveRef = useRef(resolveScheduledReminder);
  resolveRef.current = resolveScheduledReminder;

  // Listen for notification click messages from the service worker
  useEffect(() => {
    const handleServiceWorkerMessage = (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICKED') {
        window.focus();
      }
    };
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }
  }, []);

  // Find the first triggered-but-unresolved reminder (the one ringing now)
  const triggered = state.scheduledReminders.find(
    r => r.status === 'TRIGGERED' && r.isEnabled !== false
  );

  // Keep activeReminder in sync with the triggered reminder
  useEffect(() => {
    if (triggered) {
      setActiveReminder(triggered);
    } else {
      setActiveReminder(null);
    }
  }, [triggered]);

  // Start / stop the looping alarm based on whether a reminder is ringing and sound is enabled
  useEffect(() => {
    const soundEnabled = state.notificationSettings?.soundEnabled !== false;

    if (triggered && soundEnabled) {
      try {
        if (!stopAlarmRef.current) {
          stopAlarmRef.current = startLoopingAlarm();
        }
      } catch (e) {
        console.warn('Scheduled reminder alarm sound failed:', e);
      }
    } else {
      if (stopAlarmRef.current) {
        stopAlarmRef.current();
        stopAlarmRef.current = null;
      }
    }

    return () => {
      if (stopAlarmRef.current) {
        stopAlarmRef.current();
        stopAlarmRef.current = null;
      }
    };
  }, [triggered, state.notificationSettings?.soundEnabled]);

  // 1-second checker for advance notifications, exact alarms, and expired tasks
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const currentTimestamp = Date.now();
      const currentReminders = stateRef.current.scheduledReminders || [];
      const notifSettings = stateRef.current.notificationSettings || {};
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;

      currentReminders.forEach(r => {
        // Skip disabled reminders
        if (r.isEnabled === false) return;

        const scheduledTime = new Date(r.scheduledAt).getTime();
        if (isNaN(scheduledTime)) return;

        // 1. Check for severely expired reminders (> 24 hours overdue without being triggered)
        if (r.status === 'PENDING' && currentTimestamp - scheduledTime > ONE_DAY_MS) {
          // Resolve expired reminders silently into history as rejected to avoid zombie alarms
          resolveRef.current(r.id, false);
          return;
        }

        // 2. Advance Notification Check
        if (
          r.status === 'PENDING' &&
          r.advanceNotice > 0 &&
          !r.advanceNotified &&
          currentTimestamp < scheduledTime
        ) {
          const advanceTime = scheduledTime - (r.advanceNotice * 60 * 1000);
          if (currentTimestamp >= advanceTime) {
            markAdvanceRef.current(r.id);

            if (notifSettings.scheduleNotifications !== false) {
              sendNotification(`Upcoming Task: ${r.name}`, {
                body: `Scheduled in ${formatCountdown(r.scheduledAt)}${r.worker ? ` · ${r.worker}` : ''}${r.description ? `\n${r.description}` : ''}`,
                tag: `timeflow-advance-${r.id}`,
                data: {
                  type: 'scheduled-advance',
                  reminderId: r.id,
                  taskId: r.taskId,
                },
              });
            }
          }
        }

        // 3. Exact Scheduled Time Check
        if (r.status === 'PENDING' && currentTimestamp >= scheduledTime) {
          triggerRef.current(r.id);

          if (!r.exactNotified) {
            markExactRef.current(r.id);

            if (notifSettings.scheduleNotifications !== false) {
              sendNotification(`Task Alarm: ${r.name} ⏰`, {
                body: `${r.description || 'Scheduled time reached!'}${r.worker ? ` · ${r.worker}` : ''}`,
                tag: `timeflow-exact-${r.id}`,
                requireInteraction: true,
                data: {
                  type: 'scheduled-exact',
                  reminderId: r.id,
                  taskId: r.taskId,
                },
              });
            }
          }
        }
      });
    }, 1000);

    return () => clearInterval(checkInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve handler — stops alarm and records APPROVED/REJECTED in history
  const handleResolve = useCallback((approved) => {
    if (activeReminder) {
      if (stopAlarmRef.current) {
        stopAlarmRef.current();
        stopAlarmRef.current = null;
      }
      resolveScheduledReminder(activeReminder.id, approved);
      setActiveReminder(null);
    }
  }, [activeReminder, resolveScheduledReminder]);

  return (
    <ReminderAlertModal
      reminder={activeReminder}
      onApprove={() => handleResolve(true)}
      onReject={() => handleResolve(false)}
    />
  );
}
