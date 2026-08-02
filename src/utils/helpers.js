/**
 * Format seconds into HH:MM:SS display
 */
export function formatTime(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined || totalSeconds < 0) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Format seconds into a human-readable short string (e.g., "2h 30m")
 * A zero/empty value renders as "0h 0m" (absolute zero state).
 */
export function formatTimeShort(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined || totalSeconds < 0) return '0h 0m';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h === 0 && m === 0) return '0h 0m';
  if (h > 0) return `${h}h ${m}m`;
  return `0h ${m}m`;
}

/**
 * Format seconds to decimal hours (e.g., 2.5)
 */
export function toHours(totalSeconds) {
  if (!totalSeconds) return 0;
  return Math.round((totalSeconds / 3600) * 100) / 100;
}

/**
 * Get date keys for the last N days
 */
export function getLastNDays(n) {
  const days = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push(key);
  }
  return days;
}

/**
 * Generate a random pastel color
 */
export function randomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 60%)`;
}

/**
 * Get total seconds tracked for a given day
 */
export function getDayTotal(history, dateKey) {
  const day = history[dateKey];
  if (!day) return 0;
  return Object.values(day).reduce((sum, sec) => sum + sec, 0);
}

/**
 * Get task totals for a given day, optionally filtered by worker.
 */
export function getDayTaskTotals(history, dateKey, tasks, worker = null) {
  const day = history[dateKey] || {};
  let filteredTasks = tasks;
  if (worker && worker !== 'All Workers') {
    filteredTasks = tasks.filter(t => t.worker === worker);
  }
  return filteredTasks
    .map(task => ({
      ...task,
      seconds: day[task.id] || 0,
      hours: toHours(day[task.id] || 0),
    }))
    .filter(t => t.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);
}

/**
 * Get total seconds for a day, filtered by worker.
 */
export function getDayTotalForWorker(history, dateKey, tasks, worker) {
  const day = history[dateKey] || {};
  let filteredTasks = tasks;
  if (worker && worker !== 'All Workers') {
    filteredTasks = tasks.filter(t => t.worker === worker);
  }
  return filteredTasks.reduce((sum, task) => sum + (day[task.id] || 0), 0);
}

/**
 * Get a month of daily summaries, optionally filtered by worker.
 */
export function getMonthSummary(history, tasks, worker = null) {
  const summary = [];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const total = getDayTotalForWorker(history, key, tasks, worker);
    const taskTotals = getDayTaskTotals(history, key, tasks, worker);
    summary.push({ date: key, total, tasks: taskTotals });
  }

  return summary;
}

/**
 * Format an ISO datetime string into a readable "MMM d, yyyy, h:mm AM/PM".
 */
export function formatDateTime(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format an ISO datetime string into time only "h:mm AM/PM".
 */
export function formatTimeOnly(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Human readable countdown until a scheduled time.
 * e.g. "Due now", "Due in 45m", "Due in 2h 30m", "Due in 3d".
 */
export function formatCountdown(isoString) {
  if (!isoString) return '—';
  const target = new Date(isoString).getTime();
  if (isNaN(target)) return '—';
  const diff = target - Date.now();
  if (diff <= 0) return 'Due now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Due in ${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) return remMins > 0 ? `Due in ${hours}h ${remMins}m` : `Due in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Due in ${days}d`;
}

/**
 * Get the "YYYY-MM" month key for a Date, ISO string, or the current month.
 */
export function getMonthKey(input) {
  const d = input ? new Date(input) : new Date();
  if (isNaN(d.getTime())) return getMonthKey();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Format a "YYYY-MM" month key into a human label e.g. "January 2026".
 */
export function getMonthLabel(monthKey) {
  if (!monthKey) return '';
  const parts = monthKey.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!y || !m) return monthKey;
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

/**
 * Get all distinct month keys present in reminder history, newest first.
 */
export function getReminderMonths(history) {
  if (!Array.isArray(history)) return [];
  const keys = new Set(
    history
      .filter(h => h)
      .map(h => getMonthKey(h.resolvedAt || h.scheduledAt))
  );
  return [...keys].sort().reverse();
}

