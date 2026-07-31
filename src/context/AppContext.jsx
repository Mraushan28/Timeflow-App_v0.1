import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';

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
  };
}

const initialState = createFreshState();

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // First ever visit — start with empty state (zero state)
      return createFreshState();
    }
    const parsed = JSON.parse(stored);

    // Normalize every field with explicit fallbacks
    const loadedState = {
      tasks: parsed.tasks || [],
      activeTimers: syncActiveTimersOnLoad(parsed.activeTimers || {}),
      history: parsed.history || {},
      theme: parsed.theme || 'light',
      appActive: parsed.appActive === true,
      selectedWorker: parsed.selectedWorker || 'All Workers',
    };

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
        localStorage.removeItem(STORAGE_KEY);
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

  const workers = ['All Workers', ...new Set(state.tasks.map(t => t.worker).filter(Boolean))];

  const value = {
    state, workers,
    toggleTheme, toggleAppActive, setSelectedWorker,
    addTask, renameTask, deleteTask,
    startTimer, pauseTimer, resumeTimer, stopTimer,
    dismissAlarm, setAlarmActive,
    resetAllData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { getTodayKey };
