import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
    formatDateTime, formatCountdown,
    getMonthKey, getMonthLabel, getReminderMonths,
} from '../utils/helpers';
import {
    FiPlus, FiX, FiSave, FiBell, FiTrash2, FiCalendar,
    FiUser, FiCheckCircle, FiXCircle, FiBarChart2, FiClock,
} from 'react-icons/fi';

/**
 * Scheduled Task Reminders & Monthly Status Audit.
 *  - Creation form (Task Name, Description, Schedule Date & Time, Worker)
 *  - Upcoming scheduled reminders with live countdown
 *  - Monthly Status Audit: totals, approved/rejected %, donut chart, history list
 */
export default function ScheduledReminders() {
    const {
        state, addScheduledReminder, deleteScheduledReminder,
    } = useApp();

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        name: '',
        description: '',
        date: '',
        time: '',
        worker: '',
    });
    const [now, setNow] = useState(Date.now());
    const [selectedMonth, setSelectedMonth] = useState(getMonthKey());

    // Tick every second so countdowns stay live
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    // Worker options: from existing task workers plus a free-text fallback
    const workerOptions = useMemo(() => {
        const fromTasks = [...new Set(state.tasks.map(t => t.worker).filter(Boolean))];
        if (form.worker && !fromTasks.includes(form.worker)) {
            return [...fromTasks, form.worker];
        }
        return fromTasks;
    }, [state.tasks, form.worker]);

    const upcoming = useMemo(() => {
        return [...state.scheduledReminders]
            .filter(r => r.status === 'PENDING')
            .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    }, [state.scheduledReminders]);

    // ---- Monthly Status Audit ----
    const months = useMemo(() => {
        const set = new Set(getReminderMonths(state.reminderHistory));
        // Always include current month (even with zero entries)
        set.add(getMonthKey());
        return [...set].sort().reverse();
    }, [state.reminderHistory]);

    const audit = useMemo(() => {
        const monthEntries = state.reminderHistory.filter(
            r => getMonthKey(r.resolvedAt || r.scheduledAt) === selectedMonth
        );
        const total = monthEntries.length;
        const approved = monthEntries.filter(r => r.status === 'APPROVED').length;
        const rejected = monthEntries.filter(r => r.status === 'REJECTED').length;
        const approvedPct = total > 0 ? Math.round((approved / total) * 100) : 0;
        const rejectedPct = total > 0 ? Math.round((rejected / total) * 100) : 0;

        const chartData = [
            { name: 'Approved', value: approved, color: '#10b981' },
            { name: 'Rejected', value: rejected, color: '#ef4444' },
        ];

        return { monthEntries, total, approved, rejected, approvedPct, rejectedPct, chartData };
    }, [state.reminderHistory, selectedMonth]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.date || !form.time) return;

        // Build the target timestamp from the user's LOCAL date + time parts.
        // The string form `YYYY-MM-DDTHH:mm` is interpreted as local time, and
        // `.toISOString()` stores it as an unambiguous UTC instant. This avoids
        // timezone offset mismatches when the scheduler compares it with Date.now().
        const [yr, mo, dy] = form.date.split('-').map(Number);
        const [hh, mm] = form.time.split(':').map(Number);
        const scheduledAt = new Date(yr, mo - 1, dy, hh, mm, 0, 0);
        if (isNaN(scheduledAt.getTime())) return;

        // Note: we intentionally do NOT call the trigger here — the reminder is
        // created in PENDING state and only fires via the global interval checker
        // once the scheduled time is reached.
        addScheduledReminder({
            name: form.name.trim(),
            description: form.description.trim(),
            scheduledAt: scheduledAt.toISOString(),
            worker: form.worker.trim(),
        });

        setForm({ name: '', description: '', date: '', time: '', worker: '' });
        setShowForm(false);
    };

    const minDate = new Date().toISOString().slice(0, 10);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                        Scheduled Reminders
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        Schedule tasks and get an exact-time alarm with approval tracking
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="btn-primary flex items-center gap-2"
                >
                    {showForm ? <FiX className="w-4 h-4" /> : <FiPlus className="w-4 h-4" />}
                    {showForm ? 'Cancel' : 'New Reminder'}
                </button>
            </div>

            {/* Creation Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="card animate-fade-in">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
                        Schedule a New Task
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                                    Task Name *
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g., YouTube Live Stream"
                                    className="input-field"
                                    autoFocus
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                                    Description
                                </label>
                                <input
                                    type="text"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="e.g., Live session on AI Development"
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                                    Schedule Date *
                                </label>
                                <input
                                    type="date"
                                    value={form.date}
                                    min={minDate}
                                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                                    className="input-field"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                                    Schedule Time *
                                </label>
                                <input
                                    type="time"
                                    value={form.time}
                                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                                    className="input-field"
                                    required
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                                    Worker Name (optional)
                                </label>
                                <div className="relative">
                                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        list="worker-options"
                                        value={form.worker}
                                        onChange={(e) => setForm({ ...form, worker: e.target.value })}
                                        placeholder="Assign a worker or leave empty"
                                        className="input-field pl-9"
                                    />
                                    <datalist id="worker-options">
                                        {workerOptions.map(w => (
                                            <option key={w} value={w} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                            <FiSave className="w-4 h-4" />
                            Schedule Reminder
                        </button>
                    </div>
                </form>
            )}

            {/* Upcoming Reminders */}
            <div className="card">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <FiBell className="w-5 h-5 text-primary-500" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                            Upcoming Reminders
                        </h3>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            {upcoming.length} scheduled · alarm rings at exact time
                        </p>
                    </div>
                    {upcoming.length > 0 && (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                            {upcoming.length} pending
                        </span>
                    )}
                </div>

                {upcoming.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {upcoming.map(r => {
                            const dueIn = formatCountdown(r.scheduledAt);
                            const isSoon = new Date(r.scheduledAt).getTime() - now <= 5 * 60 * 1000;
                            return (
                                <div key={r.id} className="p-4 rounded-2xl" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ' + (isSoon ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-primary-100 dark:bg-primary-900/30')}>
                                                <FiBell className={'w-5 h-5 ' + (isSoon ? 'text-amber-500' : 'text-primary-500')} />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                                                    {r.name}
                                                </h4>
                                                {r.worker && (
                                                    <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                                                        <FiUser className="w-3 h-3" /> {r.worker}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => deleteScheduledReminder(r.id)}
                                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                                            title="Delete reminder"
                                        >
                                            <FiTrash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {r.description && (
                                        <p className="text-xs mt-2.5 break-words" style={{ color: 'var(--color-text-secondary)' }}>
                                            {r.description}
                                        </p>
                                    )}

                                    <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                            <FiCalendar className="w-3 h-3" />
                                            {formatDateTime(r.scheduledAt)}
                                        </span>
                                        <span className={'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ' + (isSoon
                                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                            : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400')}>
                                            <FiClock className="w-3 h-3" />
                                            {dueIn}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-10" style={{ color: 'var(--color-text-secondary)' }}>
                        <p className="text-5xl mb-3">🔔</p>
                        <p className="text-sm">No upcoming reminders.</p>
                        <p className="text-xs mt-1">Click "New Reminder" to schedule your first exact-time alert.</p>
                    </div>
                )}
            </div>

            {/* Monthly Status Audit */}
            <div className="card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <FiBarChart2 className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                                Monthly Status Audit
                            </h3>
                            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                Approval vs rejection tracking for scheduled reminders
                            </p>
                        </div>
                    </div>

                    {months.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--color-bg)' }}>
                            <FiCalendar className="w-4 h-4 text-slate-400" />
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="text-sm font-medium bg-transparent outline-none cursor-pointer"
                                style={{ color: 'var(--color-text)' }}
                            >
                                {months.map(m => (
                                    <option key={m} value={m}>{getMonthLabel(m)}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 rounded-2xl" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                        <p className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>{audit.total}</p>
                        <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>Total Tasks</p>
                    </div>
                    <div className="p-4 rounded-2xl" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                        <p className="text-3xl font-bold text-green-500">{audit.approved}</p>
                        <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>Approved</p>
                    </div>
                    <div className="p-4 rounded-2xl" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                        <p className="text-3xl font-bold text-red-500">{audit.rejected}</p>
                        <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>Rejected</p>
                    </div>
                    <div className="p-4 rounded-2xl" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                        <p className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>{audit.approvedPct}%</p>
                        <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>Approval Rate</p>
                    </div>
                </div>

                {audit.total > 0 ? (
                    <>
                        {/* Donut Chart + Progress */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={audit.chartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={85}
                                            paddingAngle={4}
                                            dataKey="value"
                                            stroke="transparent"
                                        >
                                            {audit.chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="glass rounded-xl px-4 py-3 shadow-xl border border-slate-200 dark:border-slate-700">
                                                            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                                                                {payload[0].name}
                                                            </p>
                                                            <p className="text-sm font-semibold mt-1" style={{ color: payload[0].payload.color }}>
                                                                {payload[0].value} task{payload[0].value !== 1 ? 's' : ''} ({Math.round((payload[0].value / audit.total) * 100)}%)
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            formatter={(value) => (
                                                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                                    {value}
                                                </span>
                                            )}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Percentages */}
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                                            <FiCheckCircle className="w-4 h-4 text-green-500" />
                                            Approved
                                        </span>
                                        <span className="text-sm font-bold text-green-500">{audit.approvedPct}%</span>
                                    </div>
                                    <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-green-500 to-emerald-500"
                                            style={{ width: `${audit.approvedPct}%` }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                                            <FiXCircle className="w-4 h-4 text-red-500" />
                                            Rejected
                                        </span>
                                        <span className="text-sm font-bold text-red-500">{audit.rejectedPct}%</span>
                                    </div>
                                    <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-red-500 to-rose-500"
                                            style={{ width: `${audit.rejectedPct}%` }} />
                                    </div>
                                </div>

                                {/* Summary */}
                                <div className="p-4 rounded-2xl mt-2" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                        <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{getMonthLabel(selectedMonth)}</span> —{' '}
                                        {audit.total} scheduled task{audit.total !== 1 ? 's' : ''} logged.
                                    </p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                        {audit.approvedPct >= 70
                                            ? 'Excellent approval rate! Keep it up. 🎉'
                                            : audit.approvedPct >= 40
                                                ? 'Moderate performance — aim to improve consistency.'
                                                : 'Low approval rate — focus on completing scheduled tasks.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* History List */}
                        <div>
                            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
                                Past Scheduled Reminders
                            </h4>
                            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                                {audit.monthEntries
                                    .slice()
                                    .sort((a, b) => new Date(b.resolvedAt || b.scheduledAt) - new Date(a.resolvedAt || a.scheduledAt))
                                    .map(r => (
                                        <div key={r.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                                            <div className={'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ' + (r.status === 'APPROVED'
                                                ? 'bg-green-100 dark:bg-green-900/30'
                                                : 'bg-red-100 dark:bg-red-900/30')}>
                                                {r.status === 'APPROVED'
                                                    ? <FiCheckCircle className="w-5 h-5 text-green-500" />
                                                    : <FiXCircle className="w-5 h-5 text-red-500" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                                                        {r.name}
                                                    </span>
                                                    <span className={'text-xs font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 ' + (r.status === 'APPROVED'
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400')}>
                                                        {r.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                                                    <FiClock className="inline w-3 h-3 mr-0.5" />
                                                    Scheduled: {formatDateTime(r.scheduledAt)}
                                                    <span className="mx-1.5">·</span>
                                                    Resolved: {formatDateTime(r.resolvedAt)}
                                                    {r.worker && <span className="mx-1.5">·</span>}
                                                    {r.worker && <FiUser className="inline w-3 h-3 mr-0.5" />}
                                                    {r.worker}
                                                </p>
                                                {r.description && (
                                                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                                                        {r.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-10" style={{ color: 'var(--color-text-secondary)' }}>
                        <p className="text-5xl mb-3">📋</p>
                        <p className="text-sm">
                            No scheduled reminders recorded for {getMonthLabel(selectedMonth)}.
                        </p>
                        <p className="text-xs mt-1">Approve or reject reminders when their alarm rings to build this audit.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

