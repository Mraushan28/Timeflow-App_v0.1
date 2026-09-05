/**
 * TimeFlow Notification System Utility
 * Handles browser notification permissions, Service Worker registration integration,
 * native system notifications, and device vibration/fallbacks.
 */

export const ADVANCE_NOTICE_OPTIONS = [
  { value: 0, label: 'At exact time' },
  { value: 5, label: '5 minutes before' },
  { value: 10, label: '10 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
];

/**
 * Check if the current browser environment supports the Web Notification API.
 */
export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get the current notification permission state:
 * 'granted' | 'denied' | 'default' | 'unsupported'
 */
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission from the user.
 * Must only be called in response to a user action (e.g. clicking a button).
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (err) {
    console.warn('[TimeFlow] Error requesting notification permission:', err);
    return getNotificationPermission();
  }
}

/**
 * Send a native notification via ServiceWorker registration with fallback to window.Notification.
 * @param {string} title
 * @param {NotificationOptions} options
 */
export async function sendNotification(title, options = {}) {
  if (getNotificationPermission() !== 'granted') {
    return false;
  }

  const notificationOptions = {
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    requireInteraction: false,
    ...options,
    data: {
      url: '/',
      timestamp: Date.now(),
      ...(options.data || {}),
    },
  };

  // Try Service Worker registration first (standard for PWAs and mobile Chrome/Safari)
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(title, notificationOptions);
        return true;
      }
    } catch (err) {
      console.warn('[TimeFlow] Service worker showNotification failed, using fallback:', err);
    }
  }

  // Fallback to standard window Notification
  try {
    const n = new Notification(title, notificationOptions);
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return true;
  } catch (err) {
    console.warn('[TimeFlow] Window Notification failed:', err);
    return false;
  }
}

/**
 * Trigger a test notification to verify device/browser delivery.
 */
export async function sendTestNotification() {
  return sendNotification('TimeFlow Notification Active 🔔', {
    body: 'Task reminders and timer notifications are configured and ready!',
    tag: 'timeflow-test-alert',
    data: { type: 'test' },
  });
}

/**
 * Helper to display human-readable advance notice label
 */
export function formatAdvanceNotice(minutes) {
  const match = ADVANCE_NOTICE_OPTIONS.find(opt => opt.value === Number(minutes));
  return match ? match.label : `${minutes} min before`;
}
