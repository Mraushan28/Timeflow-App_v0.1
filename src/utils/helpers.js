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
 */
export function formatTimeShort(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined || totalSeconds < 0) return '0m';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
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

