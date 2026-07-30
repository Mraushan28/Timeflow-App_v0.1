import React, { useMemo } from 'react';
import { useApp, getTodayKey } from '../context/AppContext';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
} from 'recharts';
import {
  formatTimeShort, toHours, getDayTotal,
  getDayTaskTotals, getDayTotalForWorker, getLastNDays,
} from '../utils/helpers';
import { FiTrendingUp, FiCalendar, FiBarChart2, FiFilter } from 'react-icons/fi';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl px-4 py-3 shadow-xl border border-slate-200 dark:border-slate-700">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          {payload[0].name || label}
        </p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-semibold mt-1" style={{ color: entry.color }}>
            {entry.payload?.value !== undefined ? `${entry.value}%` : formatTimeShort(entry.payload?.seconds || 0)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const { state, workers, setSelectedWorker } = useApp();
  const todayKey = getTodayKey();
  const selectedWorker = state.selectedWorker;

  // Today's data for donut chart
  const todayData = useMemo(() => {
    const tasks = getDayTaskTotals(state.history, todayKey, state.tasks, selectedWorker);
    const total = tasks.reduce((sum, t) => sum + t.seconds, 0);
    return tasks.map(t => ({
      name: t.name,
      value: total > 0 ? Math.round((t.seconds / total) * 100) : 0,
      seconds: t.seconds,
      color: t.color,
      icon: t.icon,
      worker: t.worker,
    }));
  }, [state.history, todayKey, state.tasks, selectedWorker]);

  // Last 3 days data
  const last3Days = useMemo(() => {
    const days = getLastNDays(3).reverse();
    return days.map(dateKey => {
      const total = getDayTotalForWorker(state.history, dateKey, state.tasks, selectedWorker);
      const tasks = getDayTaskTotals(state.history, dateKey, state.tasks, selectedWorker);
      return {
        date: dateKey.slice(5),
        total: toHours(total),
        label: formatTimeShort(total),
        tasks,
      };
    });
  }, [state.history, state.tasks, selectedWorker]);

  // Monthly summary (last 30 days)
  const monthlySummary = useMemo(() => {
    const days = getLastNDays(30).reverse();
    const dailyTotals = days.map(dateKey => {
      const total = getDayTotalForWorker(state.history, dateKey, state.tasks, selectedWorker);
      return {
        date: dateKey.slice(5),
        hours: toHours(total),
      };
    });

    // Task aggregates for the month
    const taskAgg = {};
    days.forEach(dateKey => {
      const day = state.history[dateKey];
      if (day) {
        let relevantTasks = state.tasks;
        if (selectedWorker !== 'All Workers') {
          relevantTasks = state.tasks.filter(t => t.worker === selectedWorker);
        }
        relevantTasks.forEach(task => {
          if (day[task.id]) {
            if (!taskAgg[task.id]) taskAgg[task.id] = 0;
            taskAgg[task.id] += day[task.id];
          }
        });
      }
    });

    const totalMonthSeconds = Object.values(taskAgg).reduce((a, b) => a + b, 0);
    const taskBreakdown = Object.entries(taskAgg)
      .map(([taskId, seconds]) => {
        const taskDef = state.tasks.find(t => t.id === taskId);
        return {
          name: taskDef?.name || taskId,
          value: totalMonthSeconds > 0 ? Math.round((seconds / totalMonthSeconds) * 100) : 0,
          seconds,
          color: taskDef?.color || '#6366f1',
          icon: taskDef?.icon || '📌',
          worker: taskDef?.worker || '',
        };
      })
      .sort((a, b) => b.seconds - a.seconds);

    return { dailyTotals, taskBreakdown, totalMonthSeconds };
  }, [state.history, state.tasks, selectedWorker]);

  return (
    <div className="space-y-6">
      {/* Header with Worker Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            Analytics & Insights
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Visualize time usage patterns{selectedWorker !== 'All Workers' ? ` for ${selectedWorker}` : ''}
          </p>
        </div>
        {workers.length > 1 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--color-bg)' }}>
            <FiFilter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedWorker}
              onChange={(e) => setSelectedWorker(e.target.value)}
              className="text-sm font-medium bg-transparent outline-none cursor-pointer"
              style={{ color: 'var(--color-text)' }}
            >
              {workers.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Today's Distribution */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <FiTrendingUp className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              {selectedWorker === 'All Workers' ? "Today's Distribution" : `${selectedWorker}'s Today`}
            </h3>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {todayData.length} tasks tracked
            </p>
          </div>
        </div>

        {todayData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut Chart */}
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={todayData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {todayData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry) => (
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed List */}
            <div className="space-y-3">
              {todayData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--color-bg)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                    <div>
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                        {item.icon} {item.name}
                      </span>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {formatTimeShort(item.seconds)}
                        {selectedWorker === 'All Workers' && item.worker && ` • ${item.worker}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold" style={{ color: item.color }}>
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
            <p className="text-4xl mb-3">📊</p>
            <p className="text-sm">
              {selectedWorker === 'All Workers'
                ? 'No data for today yet.'
                : `No data for ${selectedWorker} today.`}
            </p>
            <p className="text-xs mt-1">Start tracking tasks to see daily distribution.</p>
          </div>
        )}
      </div>

      {/* Last 3 Days Comparison */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <FiCalendar className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              Last 3 Days Overview
            </h3>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {selectedWorker === 'All Workers' ? 'Daily total hours comparison' : `${selectedWorker}'s daily hours`}
            </p>
          </div>
        </div>

        {last3Days.some(d => d.total > 0) ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last3Days} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: 'var(--color-text-secondary)' } }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" radius={[8, 8, 0, 0]} fill="#6366f1" maxBarSize={50}>
                  {last3Days.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.total > 0 ? '#6366f1' : '#cbd5e1'}
                      opacity={entry.total > 0 ? 1 : 0.4}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
            <p className="text-4xl mb-3">📅</p>
            <p className="text-sm">No data for the past 3 days.</p>
          </div>
        )}

        {/* Day Details */}
        {last3Days.some(d => d.total > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {last3Days.map((day, idx) => (
              <div key={idx} className="p-3 rounded-xl" style={{ background: 'var(--color-bg)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {day.date}
                </p>
                {day.tasks.length > 0 ? (
                  <div className="space-y-1.5">
                    {day.tasks.slice(0, 3).map((task, tIdx) => (
                      <div key={tIdx} className="flex items-center justify-between text-xs">
                        <span style={{ color: 'var(--color-text)' }}>
                          {task.icon} {task.name}
                        </span>
                        <span className="font-medium" style={{ color: task.color }}>
                          {formatTimeShort(task.seconds)}
                        </span>
                      </div>
                    ))}
                    {day.tasks.length > 3 && (
                      <p className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
                        +{day.tasks.length - 3} more
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    No activity
                  </p>
                )}
                <p className="text-xs font-semibold mt-2" style={{ color: 'var(--color-text)' }}>
                  Total: {day.label}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly Audit - 30 Days */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <FiBarChart2 className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              30-Day Monthly Audit
            </h3>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {selectedWorker === 'All Workers'
                ? 'Daily time trend and task percentage breakdown'
                : `${selectedWorker}'s daily trend and breakdown`}
            </p>
          </div>
        </div>

        {monthlySummary.dailyTotals.some(d => d.hours > 0) ? (
          <div className="space-y-6">
            {/* Daily Trend Line */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlySummary.dailyTotals} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickLine={false}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: 'var(--color-text-secondary)' } }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="hours"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ fill: '#6366f1', stroke: '#6366f1', strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5, fill: '#6366f1' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly Task Distribution */}
            <div>
              <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
                {selectedWorker === 'All Workers' ? 'Monthly Task Distribution' : `${selectedWorker}'s Task Distribution`}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {monthlySummary.taskBreakdown.map((task, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-bg)' }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ background: `${task.color}20` }}>
                      {task.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                          {task.name}
                        </span>
                        <span className="text-sm font-bold" style={{ color: task.color }}>
                          {task.value}%
                        </span>
                      </div>
                      <div className="mt-1.5 w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${task.value}%`, background: task.color }}
                        />
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {formatTimeShort(task.seconds)} total
                        {selectedWorker === 'All Workers' && task.worker && ` • ${task.worker}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
            <p className="text-4xl mb-3">📈</p>
            <p className="text-sm">
              {selectedWorker === 'All Workers'
                ? 'No data for this month yet.'
                : `No data for ${selectedWorker} this month.`}
            </p>
            <p className="text-xs mt-1">Track your activities daily to see monthly insights.</p>
          </div>
        )}
      </div>
    </div>
  );
}

