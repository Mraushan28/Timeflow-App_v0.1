import React, { useMemo } from 'react';
import { useApp, getTodayKey } from '../context/AppContext';
import { formatTimeShort, toHours, getDayTotal, getDayTaskTotals, getDayTotalForWorker } from '../utils/helpers';
import { FiClock, FiTarget, FiTrendingUp, FiCalendar } from 'react-icons/fi';

export default function Dashboard() {
  const { state } = useApp();
  const todayKey = getTodayKey();
  const selectedWorker = state.selectedWorker;

  const stats = useMemo(() => {
    const todayTotal = getDayTotalForWorker(state.history, todayKey, state.tasks, selectedWorker);
    const todayTasks = getDayTaskTotals(state.history, todayKey, state.tasks, selectedWorker);
    const activeCount = Object.keys(state.activeTimers).length;
    const activePaused = Object.values(state.activeTimers).filter(t => t.paused).length;
    const runningCount = activeCount - activePaused;

    // Calculate this week total for selected worker
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      weekDays.push(getDayTotalForWorker(state.history, key, state.tasks, selectedWorker));
    }
    const weekTotal = weekDays.reduce((a, b) => a + b, 0);

    return { todayTotal, todayTasks, runningCount, weekTotal, todayKey };
  }, [state.history, state.activeTimers, state.tasks, todayKey, selectedWorker]);

  const getTaskById = (id) => state.tasks.find(t => t.id === id);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}! 👋
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {selectedWorker === 'All Workers'
            ? "Here's the team's productivity overview for today."
            : `Here's ${selectedWorker}'s productivity overview for today.`}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <FiClock className="w-5 h-5 text-primary-500" />
            </div>
          </div>
          <p className="stat-value">{formatTimeShort(stats.todayTotal)}</p>
          <p className="stat-label">Tracked Today</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <FiTrendingUp className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <p className="stat-value">{stats.runningCount}</p>
          <p className="stat-label">Active Timers</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <FiTarget className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <p className="stat-value">{stats.todayTasks.length}</p>
          <p className="stat-label">Tasks Today</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <FiCalendar className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <p className="stat-value">{formatTimeShort(stats.weekTotal)}</p>
          <p className="stat-label">This Week</p>
        </div>
      </div>

      {/* Today's Tasks Breakdown */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
            {selectedWorker === 'All Workers' ? "Today's Breakdown" : `${selectedWorker}'s Today`}
          </h3>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
            {stats.todayTasks.length} tasks
          </span>
        </div>

        {stats.todayTasks.length > 0 ? (
          <div className="space-y-3">
            {stats.todayTasks.map(task => {
              const taskDef = getTaskById(task.id);
              const percentage = stats.todayTotal > 0
                ? Math.round((task.seconds / stats.todayTotal) * 100)
                : 0;
              return (
                <div key={task.id} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{taskDef?.icon || '📌'}</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                        {taskDef?.name || task.id}
                      </span>
                      {taskDef?.worker && selectedWorker === 'All Workers' && (
                        <span className="text-xs px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                          {taskDef.worker}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                      {formatTimeShort(task.seconds)}
                      <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-text-secondary)' }}>
                        ({percentage}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        background: taskDef?.color || '#6366f1',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
            <p className="text-4xl mb-3">📊</p>
            <p className="text-sm">
              No activity logged today. Start a timer to track your time!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

