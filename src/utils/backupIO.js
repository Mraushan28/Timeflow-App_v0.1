/**
 * TimeFlow Backup & JSON Export/Import Engine
 * Provides offline-compatible JSON export and schema-validated JSON import.
 */

const BACKUP_VERSION = '1.0';

/**
 * Trigger browser download of full TimeFlow state as a formatted JSON file.
 * @param {object} state Current AppContext state
 */
export function exportTimeFlowBackup(state) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const filename = `timeflow-backup-${today}.json`;

    const backupPayload = {
      app: 'TimeFlow',
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        tasks: state.tasks || [],
        history: state.history || {},
        scheduledReminders: state.scheduledReminders || [],
        reminderHistory: state.reminderHistory || [],
        challenges: state.challenges || [],
        notificationSettings: state.notificationSettings || {},
        theme: state.theme || 'light',
        appActive: state.appActive ?? false,
        selectedWorker: state.selectedWorker || 'All Workers',
      },
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true, filename };
  } catch (err) {
    console.error('[TimeFlow Backup] Export failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Validate and sanitize an uploaded JSON string.
 * @param {string} jsonString
 * @returns {{ isValid: boolean, error?: string, data?: object }}
 */
export function parseAndValidateBackup(jsonString) {
  try {
    if (!jsonString || typeof jsonString !== 'string') {
      return { isValid: false, error: 'Empty file content.' };
    }

    const parsed = JSON.parse(jsonString);

    // Support both wrapped format { app: 'TimeFlow', data: { ... } } and direct state object
    const data = parsed.data || parsed;

    if (typeof data !== 'object' || data === null) {
      return { isValid: false, error: 'Invalid JSON format. Expected an object.' };
    }

    // Validate tasks
    if (data.tasks && !Array.isArray(data.tasks)) {
      return { isValid: false, error: 'Invalid format: "tasks" must be an array.' };
    }

    // Validate history
    if (data.history && (typeof data.history !== 'object' || Array.isArray(data.history))) {
      return { isValid: false, error: 'Invalid format: "history" must be a date map.' };
    }

    // Validate scheduledReminders
    if (data.scheduledReminders && !Array.isArray(data.scheduledReminders)) {
      return { isValid: false, error: 'Invalid format: "scheduledReminders" must be an array.' };
    }

    // Validate challenges
    if (data.challenges && !Array.isArray(data.challenges)) {
      return { isValid: false, error: 'Invalid format: "challenges" must be an array.' };
    }

    // Sanitize and normalize items
    const sanitizedTasks = (data.tasks || []).map((t, idx) => ({
      id: typeof t.id === 'string' ? t.id : `task-${Date.now()}-${idx}`,
      name: typeof t.name === 'string' ? t.name.trim() : 'Untitled Task',
      worker: typeof t.worker === 'string' ? t.worker.trim() : 'Unknown',
      color: typeof t.color === 'string' ? t.color : '#3b82f6',
      icon: typeof t.icon === 'string' ? t.icon : '📌',
    }));

    const sanitizedHistory = {};
    if (data.history && typeof data.history === 'object') {
      for (const [dateKey, taskMap] of Object.entries(data.history)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey) && typeof taskMap === 'object' && taskMap !== null) {
          sanitizedHistory[dateKey] = {};
          for (const [taskId, sec] of Object.entries(taskMap)) {
            const numericSec = Number(sec);
            if (!isNaN(numericSec) && numericSec >= 0) {
              sanitizedHistory[dateKey][taskId] = Math.round(numericSec);
            }
          }
        }
      }
    }

    const sanitizedReminders = (data.scheduledReminders || []).map((r, idx) => ({
      id: typeof r.id === 'string' ? r.id : `reminder-${Date.now()}-${idx}`,
      taskId: typeof r.taskId === 'string' ? r.taskId : null,
      name: typeof r.name === 'string' ? r.name.trim() : 'Scheduled Reminder',
      description: typeof r.description === 'string' ? r.description : '',
      scheduledAt: r.scheduledAt || new Date().toISOString(),
      advanceNotice: Number(r.advanceNotice) || 0,
      worker: typeof r.worker === 'string' ? r.worker : '',
      status: r.status === 'TRIGGERED' ? 'TRIGGERED' : 'PENDING',
      isEnabled: r.isEnabled !== false,
      advanceNotified: Boolean(r.advanceNotified),
      exactNotified: Boolean(r.exactNotified),
      triggeredAt: r.triggeredAt || null,
      createdAt: r.createdAt || new Date().toISOString(),
    }));

    const sanitizedReminderHistory = (data.reminderHistory || []).map((r, idx) => ({
      id: typeof r.id === 'string' ? r.id : `reminder-hist-${Date.now()}-${idx}`,
      name: typeof r.name === 'string' ? r.name : 'Completed Reminder',
      description: typeof r.description === 'string' ? r.description : '',
      scheduledAt: r.scheduledAt || null,
      worker: typeof r.worker === 'string' ? r.worker : '',
      status: r.status === 'REJECTED' ? 'REJECTED' : 'APPROVED',
      resolvedAt: r.resolvedAt || new Date().toISOString(),
      createdAt: r.createdAt || new Date().toISOString(),
    }));

    const sanitizedChallenges = (data.challenges || []).map((c, idx) => ({
      id: typeof c.id === 'string' ? c.id : `challenge-${Date.now()}-${idx}`,
      name: typeof c.name === 'string' ? c.name : '30-Day Challenge',
      description: typeof c.description === 'string' ? c.description : '',
      startedAt: c.startedAt || null,
      targetHours: c.targetHours || '',
      targetTasks: c.targetTasks || '',
      days: typeof c.days === 'object' && c.days !== null ? c.days : {},
      streak: Number(c.streak) || 0,
      bestStreak: Number(c.bestStreak) || 0,
      badges: Array.isArray(c.badges) ? c.badges : [],
      day: Number(c.day) || 0,
    }));

    return {
      isValid: true,
      data: {
        tasks: sanitizedTasks,
        history: sanitizedHistory,
        scheduledReminders: sanitizedReminders,
        reminderHistory: sanitizedReminderHistory,
        challenges: sanitizedChallenges,
        notificationSettings: data.notificationSettings || {
          enabled: false,
          soundEnabled: true,
          timerNotifications: true,
          breakNotifications: true,
          scheduleNotifications: true,
          defaultAdvanceMinutes: 5,
        },
        theme: data.theme === 'dark' ? 'dark' : 'light',
        appActive: Boolean(data.appActive),
        selectedWorker: typeof data.selectedWorker === 'string' ? data.selectedWorker : 'All Workers',
      },
    };
  } catch (err) {
    return { isValid: false, error: 'JSON parse error: ' + err.message };
  }
}

/**
 * Merge imported data with the current state non-destructively.
 */
export function mergeBackupState(currentState, importedData) {
  // 1. Merge Tasks (Union by ID)
  const taskMap = new Map();
  (currentState.tasks || []).forEach(t => taskMap.set(t.id, { ...t }));
  (importedData.tasks || []).forEach(t => {
    if (taskMap.has(t.id)) {
      taskMap.set(t.id, { ...taskMap.get(t.id), ...t });
    } else {
      taskMap.set(t.id, t);
    }
  });
  const mergedTasks = Array.from(taskMap.values());

  // 2. Merge History (Take max seconds for existing task on same day)
  const mergedHistory = { ...(currentState.history || {}) };
  for (const [dateKey, dayTasks] of Object.entries(importedData.history || {})) {
    if (!mergedHistory[dateKey]) {
      mergedHistory[dateKey] = { ...dayTasks };
    } else {
      mergedHistory[dateKey] = { ...mergedHistory[dateKey] };
      for (const [taskId, sec] of Object.entries(dayTasks)) {
        mergedHistory[dateKey][taskId] = Math.max(
          mergedHistory[dateKey][taskId] || 0,
          sec || 0
        );
      }
    }
  }

  // 3. Merge Scheduled Reminders (Union by ID)
  const reminderMap = new Map();
  (currentState.scheduledReminders || []).forEach(r => reminderMap.set(r.id, r));
  (importedData.scheduledReminders || []).forEach(r => {
    if (!reminderMap.has(r.id)) {
      reminderMap.set(r.id, r);
    }
  });
  const mergedReminders = Array.from(reminderMap.values());

  // 4. Merge Reminder History (Union by ID)
  const reminderHistoryMap = new Map();
  (currentState.reminderHistory || []).forEach(r => reminderHistoryMap.set(r.id, r));
  (importedData.reminderHistory || []).forEach(r => {
    if (!reminderHistoryMap.has(r.id)) {
      reminderHistoryMap.set(r.id, r);
    }
  });
  const mergedReminderHistory = Array.from(reminderHistoryMap.values());

  // 5. Merge Challenges (Union by ID)
  const challengeMap = new Map();
  (currentState.challenges || []).forEach(c => challengeMap.set(c.id, { ...c }));
  (importedData.challenges || []).forEach(c => {
    if (!challengeMap.has(c.id)) {
      challengeMap.set(c.id, c);
    } else {
      const existing = challengeMap.get(c.id);
      const mergedDays = { ...(existing.days || {}), ...(c.days || {}) };
      const mergedBadges = Array.from(new Set([...(existing.badges || []), ...(c.badges || [])]));
      challengeMap.set(c.id, {
        ...existing,
        name: c.name || existing.name,
        description: c.description || existing.description,
        days: mergedDays,
        streak: Math.max(existing.streak || 0, c.streak || 0),
        bestStreak: Math.max(existing.bestStreak || 0, c.bestStreak || 0),
        badges: mergedBadges,
        day: Math.max(existing.day || 0, c.day || 0),
      });
    }
  });
  const mergedChallenges = Array.from(challengeMap.values());

  return {
    ...currentState,
    tasks: mergedTasks,
    history: mergedHistory,
    scheduledReminders: mergedReminders,
    reminderHistory: mergedReminderHistory,
    challenges: mergedChallenges,
  };
}

