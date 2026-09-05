/**
 * TimeFlow Cloud Synchronization & Authentication Service
 * Manages Supabase Auth, local-to-cloud migration, debounced synchronization,
 * and online/offline event handling.
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { mergeBackupState } from './backupIO';

// Sync Status constants
export const SYNC_STATUS = {
  LOCAL_ONLY: 'local_only',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  OFFLINE: 'offline',
  ERROR: 'error',
};

let currentSyncStatus = isSupabaseConfigured ? SYNC_STATUS.LOCAL_ONLY : SYNC_STATUS.LOCAL_ONLY;
let lastSyncedAt = null;
const statusListeners = new Set();

export function getSyncStatus() {
  return currentSyncStatus;
}

export function getLastSyncedAt() {
  return lastSyncedAt;
}

function setSyncStatus(status) {
  currentSyncStatus = status;
  statusListeners.forEach(listener => {
    try {
      listener(currentSyncStatus, lastSyncedAt);
    } catch (e) {
      console.warn('[TimeFlow Sync] Listener error:', e);
    }
  });
}

export function subscribeSyncStatus(listener) {
  statusListeners.add(listener);
  // Fire initial
  listener(currentSyncStatus, lastSyncedAt);
  return () => statusListeners.delete(listener);
}

// ----------------------------------------------------------------------
// 1. Authentication Handlers
// ----------------------------------------------------------------------

export async function getCurrentUser() {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch (err) {
    console.warn('[TimeFlow Sync] getUser error:', err);
    return null;
  }
}

export async function getSession() {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) return null;
    return session;
  } catch (err) {
    return null;
  }
}

export function onAuthStateChange(callback) {
  if (!isSupabaseConfigured) {
    return { unsubscribe: () => { } };
  }
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return subscription;
}

export async function signInWithEmail(email, password) {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Cloud sync is not configured yet. Please check .env settings.') };
  }
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email, password) {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Cloud sync is not configured yet. Please check .env settings.') };
  }
  return await supabase.auth.signUp({ email, password });
}

export async function signOutUser() {
  if (!isSupabaseConfigured) return { error: null };
  const res = await supabase.auth.signOut();
  setSyncStatus(SYNC_STATUS.LOCAL_ONLY);
  return res;
}

export async function resetUserPassword(email) {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Cloud sync is not configured yet.') };
  }
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
}

// ----------------------------------------------------------------------
// 2. Cloud Database Operations
// ----------------------------------------------------------------------

/**
 * Pull all data from Supabase for the specified user.
 */
export async function pullCloudData(userId) {
  if (!isSupabaseConfigured || !userId) {
    return { success: false, error: 'Unconfigured or unauthenticated', data: null, isEmpty: true };
  }

  try {
    const [tasksRes, historyRes, remindersRes, reminderHistRes, challengesRes, settingsRes] = await Promise.all([
      supabase.from('timeflow_tasks').select('*').eq('user_id', userId),
      supabase.from('timeflow_history').select('*').eq('user_id', userId),
      supabase.from('timeflow_scheduled_reminders').select('*').eq('user_id', userId),
      supabase.from('timeflow_reminder_history').select('*').eq('user_id', userId),
      supabase.from('timeflow_challenges').select('*').eq('user_id', userId),
      supabase.from('timeflow_settings').select('*').eq('user_id', userId).single(),
    ]);

    const tasks = (tasksRes.data || []).map(t => ({
      id: t.id,
      name: t.name,
      worker: t.worker || 'Unknown',
      color: t.color || '#3b82f6',
      icon: t.icon || '📌',
    }));

    const history = {};
    (historyRes.data || []).forEach(row => {
      if (!history[row.date_key]) history[row.date_key] = {};
      history[row.date_key][row.task_id] = row.seconds;
    });

    const scheduledReminders = (remindersRes.data || []).map(r => ({
      id: r.id,
      taskId: r.task_id,
      name: r.name,
      description: r.description || '',
      scheduledAt: r.scheduled_at,
      advanceNotice: r.advance_notice || 0,
      worker: r.worker || '',
      status: r.status || 'PENDING',
      isEnabled: r.is_enabled !== false,
      advanceNotified: Boolean(r.advance_notified),
      exactNotified: Boolean(r.exact_notified),
      triggeredAt: r.triggered_at,
      createdAt: r.created_at,
    }));

    const reminderHistory = (reminderHistRes.data || []).map(r => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      scheduledAt: r.scheduled_at,
      worker: r.worker || '',
      status: r.status,
      resolvedAt: r.resolved_at,
      createdAt: r.created_at,
    }));

    const challenges = (challengesRes.data || []).map(c => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      startedAt: c.started_at,
      targetHours: c.target_hours || '',
      targetTasks: c.target_tasks || '',
      days: c.days || {},
      streak: c.streak || 0,
      bestStreak: c.best_streak || 0,
      badges: c.badges || [],
      day: c.day || 0,
    }));

    const settings = settingsRes.data || {};

    const isEmpty =
      tasks.length === 0 &&
      Object.keys(history).length === 0 &&
      scheduledReminders.length === 0 &&
      challenges.length === 0;

    return {
      success: true,
      isEmpty,
      data: {
        tasks,
        history,
        scheduledReminders,
        reminderHistory,
        challenges,
        theme: settings.theme || 'light',
        appActive: settings.app_active ?? false,
        selectedWorker: settings.selected_worker || 'All Workers',
        notificationSettings: settings.notification_settings || {
          enabled: false,
          soundEnabled: true,
          timerNotifications: true,
          breakNotifications: true,
          scheduleNotifications: true,
          defaultAdvanceMinutes: 5,
        },
      },
    };
  } catch (err) {
    console.error('[TimeFlow Sync] pullCloudData failed:', err);
    return { success: false, error: err.message, data: null, isEmpty: true };
  }
}

/**
 * Push full local state to Supabase for the specified user.
 */
export async function pushCloudData(userId, state) {
  if (!isSupabaseConfigured || !userId) {
    return { success: false, error: 'Unconfigured or unauthenticated' };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setSyncStatus(SYNC_STATUS.OFFLINE);
    return { success: false, error: 'Device is offline' };
  }

  setSyncStatus(SYNC_STATUS.SYNCING);

  try {
    const nowIso = new Date().toISOString();

    // 1. Sync Tasks (Upsert current + Delete removed)
    const currentTaskIds = (state.tasks || []).map(t => t.id);
    if (state.tasks && state.tasks.length > 0) {
      const taskRows = state.tasks.map(t => ({
        user_id: userId,
        id: t.id,
        name: t.name,
        worker: t.worker || 'Unknown',
        color: t.color || '#3b82f6',
        icon: t.icon || '📌',
        updated_at: nowIso,
      }));
      await supabase.from('timeflow_tasks').upsert(taskRows, { onConflict: 'user_id,id' });
    }
    // Delete any tasks on cloud that user deleted locally
    if (currentTaskIds.length > 0) {
      await supabase
        .from('timeflow_tasks')
        .delete()
        .eq('user_id', userId)
        .not('id', 'in', `(${currentTaskIds.map(id => `"${id}"`).join(',')})`);
    } else {
      await supabase.from('timeflow_tasks').delete().eq('user_id', userId);
    }

    // 2. Sync History
    const historyRows = [];
    for (const [dateKey, taskMap] of Object.entries(state.history || {})) {
      for (const [taskId, seconds] of Object.entries(taskMap)) {
        historyRows.push({
          user_id: userId,
          date_key: dateKey,
          task_id: taskId,
          seconds: Number(seconds) || 0,
          updated_at: nowIso,
        });
      }
    }
    if (historyRows.length > 0) {
      await supabase.from('timeflow_history').upsert(historyRows, { onConflict: 'user_id,date_key,task_id' });
    }

    // 3. Sync Scheduled Reminders
    const currentReminderIds = (state.scheduledReminders || []).map(r => r.id);
    if (state.scheduledReminders && state.scheduledReminders.length > 0) {
      const reminderRows = state.scheduledReminders.map(r => ({
        user_id: userId,
        id: r.id,
        task_id: r.taskId || null,
        name: r.name,
        description: r.description || '',
        scheduled_at: r.scheduledAt,
        advance_notice: Number(r.advanceNotice) || 0,
        worker: r.worker || '',
        status: r.status || 'PENDING',
        is_enabled: r.isEnabled !== false,
        advance_notified: Boolean(r.advanceNotified),
        exact_notified: Boolean(r.exactNotified),
        triggered_at: r.triggeredAt || null,
        updated_at: nowIso,
      }));
      await supabase.from('timeflow_scheduled_reminders').upsert(reminderRows, { onConflict: 'user_id,id' });
    }
    if (currentReminderIds.length > 0) {
      await supabase
        .from('timeflow_scheduled_reminders')
        .delete()
        .eq('user_id', userId)
        .not('id', 'in', `(${currentReminderIds.map(id => `"${id}"`).join(',')})`);
    } else {
      await supabase.from('timeflow_scheduled_reminders').delete().eq('user_id', userId);
    }

    // 4. Sync Reminder History
    if (state.reminderHistory && state.reminderHistory.length > 0) {
      const historyReminderRows = state.reminderHistory.map(r => ({
        user_id: userId,
        id: r.id,
        name: r.name,
        description: r.description || '',
        scheduled_at: r.scheduledAt || null,
        worker: r.worker || '',
        status: r.status,
        resolved_at: r.resolvedAt || nowIso,
      }));
      await supabase.from('timeflow_reminder_history').upsert(historyReminderRows, { onConflict: 'user_id,id' });
    }

    // 5. Sync Challenges
    const currentChallengeIds = (state.challenges || []).map(c => c.id);
    if (state.challenges && state.challenges.length > 0) {
      const challengeRows = state.challenges.map(c => ({
        user_id: userId,
        id: c.id,
        name: c.name,
        description: c.description || '',
        started_at: c.startedAt || null,
        target_hours: c.targetHours || '',
        target_tasks: c.targetTasks || '',
        days: c.days || {},
        streak: Number(c.streak) || 0,
        best_streak: Number(c.bestStreak) || 0,
        badges: c.badges || [],
        day: Number(c.day) || 0,
        updated_at: nowIso,
      }));
      await supabase.from('timeflow_challenges').upsert(challengeRows, { onConflict: 'user_id,id' });
    }
    if (currentChallengeIds.length > 0) {
      await supabase
        .from('timeflow_challenges')
        .delete()
        .eq('user_id', userId)
        .not('id', 'in', `(${currentChallengeIds.map(id => `"${id}"`).join(',')})`);
    } else {
      await supabase.from('timeflow_challenges').delete().eq('user_id', userId);
    }

    // 6. Sync Settings
    await supabase.from('timeflow_settings').upsert({
      user_id: userId,
      theme: state.theme || 'light',
      app_active: state.appActive ?? false,
      selected_worker: state.selectedWorker || 'All Workers',
      notification_settings: state.notificationSettings || {},
      updated_at: nowIso,
    }, { onConflict: 'user_id' });

    lastSyncedAt = new Date();
    setSyncStatus(SYNC_STATUS.SYNCED);
    return { success: true };
  } catch (err) {
    console.error('[TimeFlow Sync] pushCloudData failed:', err);
    setSyncStatus(SYNC_STATUS.ERROR);
    return { success: false, error: err.message };
  }
}

/**
 * Handle initial login synchronization & smart migration.
 */
export async function performInitialSync(user, localState) {
  if (!user || !user.id) return { action: 'none', state: localState };

  setSyncStatus(SYNC_STATUS.SYNCING);
  const cloudRes = await pullCloudData(user.id);

  const localHasData =
    (localState.tasks && localState.tasks.length > 0) ||
    (localState.challenges && localState.challenges.length > 0) ||
    Object.keys(localState.history || {}).length > 0;

  // Case A: Cloud is empty, but local has data -> Initial backup push
  if (cloudRes.isEmpty && localHasData) {
    await pushCloudData(user.id, localState);
    return { action: 'pushed_local', state: localState };
  }

  // Case B: Cloud has data, but local is empty (e.g. fresh PWA install or new device)
  if (!cloudRes.isEmpty && !localHasData) {
    lastSyncedAt = new Date();
    setSyncStatus(SYNC_STATUS.SYNCED);
    return { action: 'pulled_remote', state: cloudRes.data };
  }

  // Case C: Both cloud and local have data -> Non-destructive smart merge
  if (!cloudRes.isEmpty && localHasData) {
    const merged = mergeBackupState(localState, cloudRes.data);
    await pushCloudData(user.id, merged);
    return { action: 'merged', state: merged };
  }

  // Case D: Both are empty
  setSyncStatus(SYNC_STATUS.SYNCED);
  lastSyncedAt = new Date();
  return { action: 'none', state: localState };
}

/**
 * Delete all remote data for the authenticated user (called on Reset Local & Cloud).
 */
export async function deleteCloudData(userId) {
  if (!isSupabaseConfigured || !userId) return { success: false };
  try {
    await Promise.all([
      supabase.from('timeflow_tasks').delete().eq('user_id', userId),
      supabase.from('timeflow_history').delete().eq('user_id', userId),
      supabase.from('timeflow_scheduled_reminders').delete().eq('user_id', userId),
      supabase.from('timeflow_reminder_history').delete().eq('user_id', userId),
      supabase.from('timeflow_challenges').delete().eq('user_id', userId),
      supabase.from('timeflow_settings').delete().eq('user_id', userId),
    ]);
    return { success: true };
  } catch (err) {
    console.error('[TimeFlow Sync] deleteCloudData failed:', err);
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------------------------
// 3. Debounced Auto-Sync Engine
// ----------------------------------------------------------------------
let debounceTimer = null;

export function triggerDebouncedSync(userId, state, delayMs = 3000) {
  if (!isSupabaseConfigured || !userId) return;

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setSyncStatus(SYNC_STATUS.OFFLINE);
    return;
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(async () => {
    await pushCloudData(userId, state);
  }, delayMs);
}

// Network online/offline event bindings
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (currentSyncStatus === SYNC_STATUS.OFFLINE) {
      setSyncStatus(SYNC_STATUS.SYNCED);
    }
  });

  window.addEventListener('offline', () => {
    setSyncStatus(SYNC_STATUS.OFFLINE);
  });
}

