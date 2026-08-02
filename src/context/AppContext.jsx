import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { getDateKey } from '../utils/helpers';

const AppContext = createContext();

const STORAGE_KEY = 'timeflow_state';

// Zero-state: no default tasks — app starts completely empty
const defaultTasks = [];

/**
 * On page reload, any active (non-paused) timers have a stale `startTime`.
 * Re-sync them: compute elapsed = stored_elapsed + (now - stored_startTime),
 * then reset startTime to now so subsequent delta calculations are correct.
 */
function syncActiveTimersOnLoad(activeTimers) {
  const synced = {};
  const now = Date.now();
  for (const [taskId, timer] of Object.entries(activeTimers)) {
    if (timer && !timer.paused) {
      // Compute elapsed time since the stored startTime
      const additionalElapsed = Math.floor((now - timer.startTime) / 1000);
      synced[taskId] = {
        ...timer,
        elapsed: (timer.elapsed || 0) + Math.max(0, additionalElapsed),
        startTime: now, // Reset so future ticks don't double-count
      };
    } else if (timer) {
      // Paused timers keep their stored elapsed as-is
      synced[taskId] = { ...timer };
    }
  }
  return synced;
}

function createFreshState() {
  return {
    tasks: [],
    activeTimers: {},
    history: {},
    theme: 'light',
    appActive: false,
    selectedWorker: 'All Workers',
    scheduledReminders: [],
    reminderHistory: [],
    challenge: createFreshChallenge(),
  };
}

/**
 * Fresh 30-Day Challenge state.
 */
function createFreshChallenge() {
  return {
    startedAt: null,
    targetHours: '',
    targetTasks: '',
    days: {},
    streak: 0,
    bestStreak: 0,
    badges: [],
    day: 0,
  };
}

/**
 * Award badge names based on the current streak length.
 */
function badgesForStreak(streak) {
  const badges = [];
  if (streak >= 1) badges.push('Day 1 Streak Master');
  if (streak >= 3) badges.push('3-Day Beginner');
  if (streak >= 7) badges.push('7-Day Warrior');
  if (streak >= 14) badges.push('14-Day Champion');
  if (streak >= 21) badges.push('21-Day Hero');
  if (streak >= 30) badges.push('30-Day Legend');
  return badges;
}

/**
 * Auto-fill missed days for any gap between the last recorded challenge
 * day and yesterday. Returns { challenge, hadGap } where hadGap is true
 * if at least one missed day was auto-filled (streak must reset).
 */
function fillMissedGaps(challenge, todayKey) {
  if (!challenge || !challenge.startedAt) return { challenge, hadGap: false };

  const days = { ...(challenge.days || {}) };
  const recordedKeys = Object.keys(days).sort();
  let hadGap = false;

  if (recordedKeys.length > 0) {
    const cursor = new Date(recordedKeys[recordedKeys.length - 1] + 'T00:00:00');
    cursor.setDate(cursor.getDate() + 1);
    const today = new Date(todayKey + 'T00:00:00');
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    while (cursor.getTime() <= yesterday.getTime()) {
      const key = getDateKey(cursor);
      if (!days[key]) {
        days[key] = { status: 'missed', missedAt: new Date().toISOString() };
        hadGap = true;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return { challenge: { ...challenge, days }, hadGap };
}

const initialState = createFreshState();

/**
 * Detect legacy hardcoded/mock sample data.
 * Real user-created tasks use IDs generated as `task-<timestamp>`.
 * Anything else (task-1, task-2, sample-*, mock-*, demo-*, seed-*, etc.)
 * is considered pre-populated sample data and should be cleared so
 * existing users automatically transition to the fresh clean zero state.
 */
function containsMockData(tasks) {
  if (!Array.isArray(tasks)) return false;
  if (tasks.length === 0) return false;
  return tasks.some((t) => {
    if (!t || typeof t.id !== 'string') return true;
    // Legacy generator IDs like task-1, task-2
    if (/^task-\d{1,4}$/.test(t.id)) return true;
    // Explicit sample/mock/demo/seed prefixes
    if (/^(sample|mock|demo|seed)-/i.test(t.id)) return true;
    // Any ID that does not match the real generator pattern
    if (!/^task-\d{13,}$/.test(t.id)) return true;
    return false;
  });
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // First ever visit — start with empty state (zero state)
      return createFreshState();
    }
    const parsed = JSON.parse(stored);

    // AUTO-CLEAR legacy mock/sample data so existing users land on the
    // fresh clean zero state instead of old pre-populated sample history.
    if (containsMockData(parsed.tasks)) {
      try {
        localStorage.clear();
      } catch (e) {
        console.warn('Failed to clear mock data from localStorage:', e);
      }
      return createFreshState();
    }

    // Normalize every field with explicit fallbacks
    const loadedState = {
      tasks: parsed.tasks || [],
      activeTimers: syncActiveTimersOnLoad(parsed.activeTimers || {}),
      history: parsed.history || {},
      theme: parsed.theme || 'light',
      appActive: parsed.appActive === true,
      selectedWorker: parsed.selectedWorker || 'All Workers',
      scheduledReminders: Array.isArray(parsed.scheduledReminders) ? parsed.scheduledReminders : [],
      reminderHistory: Array.isArray(parsed.reminderHistory) ? parsed.reminderHistory : [],
      challenge: parsed.challenge || createFreshChallenge(),
    };

    // Auto-fill missed challenge days (if any gap) and reset streak accordingly
    if (loadedState.challenge && loadedState.challenge.startedAt) {
      const { challenge, hadGap } = fillMissedGaps(loadedState.challenge, getTodayKey());
      loadedState.challenge = hadGap ? { ...challenge, streak: 0 } : challenge;
    }

    // Immediately persist the synced state so startTime is fresh
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedState));
    } catch (e) {
      // Silently fail on save
    }

    return loadedState;
  } catch (e) {
    console.warn('Failed to load state, using defaults:', e);
    return createFreshState();
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      tasks: state.tasks,
      history: state.history,
      theme: state.theme,
      activeTimers: state.activeTimers,
      appActive: state.appActive,
      selectedWorker: state.selectedWorker,
      scheduledReminders: state.scheduledReminders,
      reminderHistory: state.reminderHistory,
      challenge: state.challenge,
    }));
  } catch (e) {
    console.warn('Failed to save state:', e);
  }
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function appReducer(state, action) {
  switch (action.type) {
    case 'RESET_ALL_DATA': {
      // Clear localStorage completely and return fresh zero state
      try {
        localStorage.clear();
      } catch (e) {
        console.warn('Failed to clear localStorage:', e);
      }
      return createFreshState();
    }
    case 'TOGGLE_THEME': {
      return { ...state, theme: state.theme === 'light' ? 'dark' : 'light' };
    }
    case 'TOGGLE_APP_ACTIVE': {
      return { ...state, appActive: !state.appActive };
    }
    case 'SET_SELECTED_WORKER': {
      return { ...state, selectedWorker: action.payload };
    }
    case 'ADD_TASK': {
      const newTask = {
        id: 'task-' + Date.now(),
        name: action.payload.name,
        worker: action.payload.worker || 'Unknown',
        color: action.payload.color || '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
        icon: action.payload.icon || '📌',
      };
      return { ...state, tasks: [...state.tasks, newTask] };
    }
    case 'RENAME_TASK': {
      const { taskId, name } = action.payload;
      return { ...state, tasks: state.tasks.map(t => t.id === taskId ? { ...t, name } : t) };
    }
    case 'DELETE_TASK': {
      const { taskId } = action.payload;
      const newActiveTimers = { ...state.activeTimers };
      delete newActiveTimers[taskId];
      return {
        ...state,
        tasks: state.tasks.filter(t => t.id !== taskId),
        activeTimers: newActiveTimers,
      };
    }
    case 'START_TIMER': {
      const { taskId, mode, targetSeconds } = action.payload;
      const existing = state.activeTimers[taskId];
      if (existing && !existing.paused) return state;
      return {
        ...state,
        activeTimers: {
          ...state.activeTimers,
          [taskId]: {
            mode,
            startTime: Date.now(),
            targetSeconds: mode === 'countdown' ? targetSeconds : 0,
            elapsed: existing && existing.paused ? (existing.elapsed || 0) : 0,
            paused: false,
            alarmActive: false,
          },
        },
      };
    }
    case 'PAUSE_TIMER': {
      const existing = state.activeTimers[action.payload.taskId];
      if (!existing) return state;
      return {
        ...state,
        activeTimers: {
          ...state.activeTimers,
          [action.payload.taskId]: { ...existing, paused: true, elapsed: action.payload.elapsed, alarmActive: false },
        },
      };
    }
    case 'RESUME_TIMER': {
      const existing = state.activeTimers[action.payload.taskId];
      if (!existing) return state;
      return {
        ...state,
        activeTimers: {
          ...state.activeTimers,
          [action.payload.taskId]: { ...existing, paused: false, startTime: Date.now(), alarmActive: false },
        },
      };
    }
    case 'STOP_TIMER': {
      const { taskId, elapsed } = action.payload;
      const newActiveTimers = { ...state.activeTimers };
      delete newActiveTimers[taskId];
      const todayKey = getTodayKey();
      const newHistory = { ...state.history };
      if (!newHistory[todayKey]) newHistory[todayKey] = {};
      newHistory[todayKey][taskId] = (newHistory[todayKey][taskId] || 0) + elapsed;
      return { ...state, activeTimers: newActiveTimers, history: newHistory };
    }
    case 'DISMISS_ALARM': {
      const existing = state.activeTimers[action.payload.taskId];
      if (!existing) return state;
      return { ...state, activeTimers: { ...state.activeTimers, [action.payload.taskId]: { ...existing, alarmActive: false } } };
    }
    case 'SET_ALARM_ACTIVE': {
      const existing = state.activeTimers[action.payload.taskId];
      if (!existing) return state;
      return { ...state, activeTimers: { ...state.activeTimers, [action.payload.taskId]: { ...existing, alarmActive: true } } };
    }
    case 'LOG_ELAPSED': {
      const existing = state.activeTimers[action.payload.taskId];
      if (!existing || existing.paused) return state;
      const now = Date.now();
      const delta = Math.max(0, Math.floor((now - existing.startTime) / 1000));
      if (delta === 0) return state;
      return {
        ...state,
        activeTimers: {
          ...state.activeTimers,
          [action.payload.taskId]: {
            ...existing,
            elapsed: (existing.elapsed || 0) + delta,
            startTime: now,
          },
        },
      };
    }
    case 'ADD_SCHEDULED_REMINDER': {
      const newReminder = {
        id: 'reminder-' + Date.now(),
        name: action.payload.name,
        description: action.payload.description || '',
        scheduledAt: action.payload.scheduledAt,
        worker: action.payload.worker || '',
        status: 'PENDING',
        triggeredAt: null,
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        scheduledReminders: [...state.scheduledReminders, newReminder],
      };
    }
    case 'DELETE_SCHEDULED_REMINDER': {
      return {
        ...state,
        scheduledReminders: state.scheduledReminders.filter(r => r.id !== action.payload.reminderId),
      };
    }
    case 'TRIGGER_SCHEDULED_REMINDER': {
      const nowIso = new Date().toISOString();
      return {
        ...state,
        scheduledReminders: state.scheduledReminders.map(r =>
          r.id === action.payload.reminderId
            ? { ...r, status: 'TRIGGERED', triggeredAt: nowIso }
            : r
        ),
      };
    }
    case 'RESOLVE_SCHEDULED_REMINDER': {
      const { reminderId, approved } = action.payload;
      const reminder = state.scheduledReminders.find(r => r.id === reminderId);
      if (!reminder) return state;

      const resolved = {
        id: reminder.id,
        name: reminder.name,
        description: reminder.description || '',
        scheduledAt: reminder.scheduledAt,
        worker: reminder.worker || '',
        status: approved ? 'APPROVED' : 'REJECTED',
        resolvedAt: new Date().toISOString(),
        createdAt: reminder.createdAt,
      };

      return {
        ...state,
        scheduledReminders: state.scheduledReminders.filter(r => r.id !== reminderId),
        reminderHistory: [...state.reminderHistory, resolved],
      };
    }
    // ---- 30-Day Challenge ----
    case 'START_CHALLENGE': {
      const todayKey = getTodayKey();
      const { challenge, hadGap } = fillMissedGaps(state.challenge, todayKey);
      if (hadGap) {
        // Streak was lost due to gap while inactive
        return {
          ...state,
          challenge: { ...challenge, streak: 0 },
        };
      }
      return {
        ...state,
        challenge: {
          ...challenge,
          startedAt: challenge.startedAt || new Date().toISOString(),
          targetHours: action.payload.targetHours || challenge.targetHours || '',
          targetTasks: action.payload.targetTasks || challenge.targetTasks || '',
          day: 1,
        },
      };
    }
    case 'COMPLETE_CHALLENGE_DAY': {
      const todayKey = getTodayKey();
      const ch = state.challenge || createFreshChallenge();

      // If no challenge is active, start one with defaults
      if (!ch.startedAt) {
        return {
          ...state,
          challenge: {
            ...ch,
            startedAt: new Date().toISOString(),
            targetHours: '',
            targetTasks: '',
            day: 1,
            days: { [todayKey]: { status: 'completed', completedAt: new Date().toISOString() } },
            streak: 1,
            bestStreak: Math.max(ch.bestStreak || 0, 1),
            badges: badgesForStreak(1),
          },
        };
      }

      // Auto-fill any missed gap days (streak reset)
      const { challenge, hadGap } = fillMissedGaps(ch, todayKey);
      let base = challenge;
      if (hadGap) {
        base = { ...base, streak: 0 };
      }

      const dayEntry = base.days[todayKey];
      if (dayEntry && dayEntry.status === 'completed') {
        // Already completed today — no double reward
        return state;
      }

      // Count completed days including this one
      const completedKeys = [...Object.keys(base.days).filter(k => base.days[k].status === 'completed'), todayKey];
      const newDayNumber = completedKeys.length;

      const newStreak = (base.streak || 0) + 1;
      const newBestStreak = Math.max(base.bestStreak || 0, newStreak);
      const newBadges = badgesForStreak(newStreak);

      return {
        ...state,
        challenge: {
          ...base,
          day: newDayNumber,
          days: {
            ...base.days,
            [todayKey]: { status: 'completed', completedAt: new Date().toISOString() },
          },
          streak: newStreak,
          bestStreak: newBestStreak,
          badges: newBadges,
        },
      };
    }
    case 'MISS_CHALLENGE_DAY': {
      const todayKey = getTodayKey();
      const ch = state.challenge || createFreshChallenge();
      const dayEntry = (ch.days || {})[todayKey];
      // Cannot miss a day that is already completed
      if (dayEntry && dayEntry.status === 'completed') return state;

      return {
        ...state,
        challenge: {
          ...ch,
          days: {
            ...(ch.days || {}),
            [todayKey]: { status: 'missed', missedAt: new Date().toISOString() },
          },
          streak: 0,
        },
      };
    }
    case 'RESET_CHALLENGE': {
      return {
        ...state,
        challenge: createFreshChallenge(),
      };
    }
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, null, loadState);
  const intervalRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Persist to localStorage on every state change
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Apply theme class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
  }, [state.theme]);

  // Periodic timer tick — every 1 second
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const currentState = stateRef.current;
      const activeEntries = Object.entries(currentState.activeTimers).filter(
        ([, t]) => !t.paused
      );
      if (activeEntries.length === 0) return;
      activeEntries.forEach(([taskId]) => {
        dispatch({ type: 'LOG_ELAPSED', payload: { taskId } });
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const toggleTheme = useCallback(() => dispatch({ type: 'TOGGLE_THEME' }), []);
  const toggleAppActive = useCallback(() => dispatch({ type: 'TOGGLE_APP_ACTIVE' }), []);
  const setSelectedWorker = useCallback((w) => dispatch({ type: 'SET_SELECTED_WORKER', payload: w }), []);
  const addTask = useCallback((t) => dispatch({ type: 'ADD_TASK', payload: t }), []);
  const renameTask = useCallback((id, name) => dispatch({ type: 'RENAME_TASK', payload: { taskId: id, name } }), []);
  const deleteTask = useCallback((id) => dispatch({ type: 'DELETE_TASK', payload: { taskId: id } }), []);
  const startTimer = useCallback((id, mode, sec) => dispatch({ type: 'START_TIMER', payload: { taskId: id, mode, targetSeconds: sec } }), []);
  const pauseTimer = useCallback((id, elapsed) => dispatch({ type: 'PAUSE_TIMER', payload: { taskId: id, elapsed } }), []);
  const resumeTimer = useCallback((id) => dispatch({ type: 'RESUME_TIMER', payload: { taskId: id } }), []);
  const stopTimer = useCallback((id, elapsed) => dispatch({ type: 'STOP_TIMER', payload: { taskId: id, elapsed } }), []);
  const dismissAlarm = useCallback((id) => dispatch({ type: 'DISMISS_ALARM', payload: { taskId: id } }), []);
  const setAlarmActive = useCallback((id) => dispatch({ type: 'SET_ALARM_ACTIVE', payload: { taskId: id } }), []);
  const resetAllData = useCallback(() => dispatch({ type: 'RESET_ALL_DATA' }), []);

  // Scheduled reminders
  const addScheduledReminder = useCallback((r) => dispatch({ type: 'ADD_SCHEDULED_REMINDER', payload: r }), []);
  const deleteScheduledReminder = useCallback((id) => dispatch({ type: 'DELETE_SCHEDULED_REMINDER', payload: { reminderId: id } }), []);
  const triggerScheduledReminder = useCallback((id) => dispatch({ type: 'TRIGGER_SCHEDULED_REMINDER', payload: { reminderId: id } }), []);
  const resolveScheduledReminder = useCallback((id, approved) => dispatch({ type: 'RESOLVE_SCHEDULED_REMINDER', payload: { reminderId: id, approved } }), []);

  // 30-Day Challenge
  const startChallenge = useCallback((targets) => dispatch({ type: 'START_CHALLENGE', payload: targets }), []);
  const completeChallengeDay = useCallback(() => dispatch({ type: 'COMPLETE_CHALLENGE_DAY' }), []);
  const missChallengeDay = useCallback(() => dispatch({ type: 'MISS_CHALLENGE_DAY' }), []);
  const resetChallenge = useCallback(() => dispatch({ type: 'RESET_CHALLENGE' }), []);

  const workers = ['All Workers', ...new Set(state.tasks.map(t => t.worker).filter(Boolean))];

  const value = {
    state, workers,
    toggleTheme, toggleAppActive, setSelectedWorker,
    addTask, renameTask, deleteTask,
    startTimer, pauseTimer, resumeTimer, stopTimer,
    dismissAlarm, setAlarmActive,
    resetAllData,
    addScheduledReminder, deleteScheduledReminder,
    triggerScheduledReminder, resolveScheduledReminder,
    startChallenge, completeChallengeDay, missChallengeDay, resetChallenge,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { getTodayKey };
