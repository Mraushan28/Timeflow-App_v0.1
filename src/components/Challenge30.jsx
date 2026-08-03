import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
    FiTarget, FiCheckCircle, FiXCircle, FiStar, FiZap,
    FiCalendar, FiFlag, FiAward, FiRotateCcw, FiClock,
    FiPlus, FiTrash2, FiFolder, FiMessageSquare, FiX,
} from 'react-icons/fi';
import { getDateKey, formatDateKey } from '../utils/helpers';
import Confetti from './Confetti';
import ConfirmModal from './ConfirmModal';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

const TOTAL_DAYS = 30;

/**
 * Build the 30-day grid starting from the challenge start date.
 * Returns an array of { dateKey, dayNumber, status, isToday } entries.
 */
function buildDayGrid(challenge) {
    const grid = [];
    const start = challenge && challenge.startedAt ? new Date(challenge.startedAt) : new Date();
    const todayKey = getDateKey();

    for (let i = 0; i < TOTAL_DAYS; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const dateKey = getDateKey(d);
        const entry = (challenge && challenge.days ? challenge.days[dateKey] : null);
        grid.push({
            dateKey,
            dayNumber: i + 1,
            status: entry ? entry.status : null,
            isToday: dateKey === todayKey,
            completedAt: entry?.completedAt || null,
            missedAt: entry?.missedAt || null,
        });
    }

    return grid;
}

/**
 * Build weekly-ish binned data for the monthly completion analysis chart.
 * Groups the 30-day grid into 5 buckets of 6 days each so the chart stays readable.
 */
function buildMonthlyChartData(challenge) {
    const grid = buildDayGrid(challenge);
    const buckets = [];
    const bucketSize = 6;
    for (let i = 0; i < grid.length; i += bucketSize) {
        const slice = grid.slice(i, i + bucketSize);
        const completed = slice.filter(d => d.status === 'completed').length;
        const missed = slice.filter(d => d.status === 'missed').length;
        const dayRange = slice.length > 0
            ? `Day ${slice[0].dayNumber}${slice[slice.length - 1].dayNumber !== slice[0].dayNumber ? `-${slice[slice.length - 1].dayNumber}` : ''}`
            : '';
        buckets.push({
            range: dayRange,
            completed,
            missed,
        });
    }
    return buckets;
}

const ChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass rounded-xl px-4 py-3 shadow-xl border border-slate-200 dark:border-slate-700 text-sm">
                <p className="font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    {label}
                </p>
                <p className="text-green-500 font-semibold">✅ {payload.find(p => p.dataKey === 'completed')?.value || 0} completed</p>
                <p className="text-red-500 font-semibold">❌ {payload.find(p => p.dataKey === 'missed')?.value || 0} missed</p>
            </div>
        );
    }
    return null;
};

export default function Challenge30() {
    const {
        state, addChallenge, deleteChallenge, startChallenge,
        completeChallengeDay, missChallengeDay, resetChallenge,
    } = useApp();

    const challenges = state.challenges || [];

    const [activeChallengeId, setActiveChallengeId] = useState(challenges[0]?.id || null);

    // Create-challenge modal state (robust `isCreating` boolean guard)
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newHours, setNewHours] = useState('');
    const [newTasks, setNewTasks] = useState('');
    const [newDescription, setNewDescription] = useState('');

    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [resetTargetId, setResetTargetId] = useState(null);
    const [celebratingId, setCelebratingId] = useState(null);
    const [penaltyId, setPenaltyId] = useState(null);
    const [justCompletedIds, setJustCompletedIds] = useState([]);
    const [newBadgesByChallenge, setNewBadgesByChallenge] = useState({});
    const [celebrationKeys, setCelebrationKeys] = useState({});
    const lastStreaksRef = useRef({});

    // Keep the active selection valid when challenges change
    useEffect(() => {
        if (!challenges.some(c => c.id === activeChallengeId)) {
            setActiveChallengeId(challenges[0]?.id || null);
        }
    }, [challenges, activeChallengeId]);

    const challenge = challenges.find(c => c.id === activeChallengeId) || null;
    const todayKey = getDateKey();
    const todayEntry = challenge ? (challenge.days || {})[todayKey] : null;
    const isCompletedToday = todayEntry?.status === 'completed';
    const isMissedToday = todayEntry?.status === 'missed';

    const grid = useMemo(() => challenge ? buildDayGrid(challenge) : [], [challenge]);
    const completedCount = (grid || []).filter(d => d.status === 'completed').length;
    const missedCount = (grid || []).filter(d => d.status === 'missed').length;
    const progressPct = challenge ? Math.round((completedCount / TOTAL_DAYS) * 100) : 0;
    const chartData = useMemo(() => challenge ? buildMonthlyChartData(challenge) : [], [challenge]);

    // Detect streak increase -> celebrate; streak reset -> penalty (per active challenge)
    useEffect(() => {
        if (!challenge) return;
        const cid = challenge.id;
        const prev = lastStreaksRef.current[cid] ?? challenge.streak;
        const curr = challenge.streak || 0;

        if (curr > prev) {
            setJustCompletedIds(prevIds => prevIds.includes(cid) ? prevIds : [...prevIds, cid]);
            setCelebratingId(cid);
            setCelebrationKeys(keys => ({ ...keys, [cid]: (keys[cid] || 0) + 1 }));
            setNewBadgesByChallenge(currBadges => ({ ...currBadges, [cid]: challenge.badges || [] }));
            const t = setTimeout(() => setCelebratingId(null), 2600);
            lastStreaksRef.current[cid] = curr;
            return () => clearTimeout(t);
        }
        if (curr < prev) {
            setPenaltyId(cid);
            const t = setTimeout(() => setPenaltyId(null), 5000);
            lastStreaksRef.current[cid] = curr;
            return () => clearTimeout(t);
        }
        lastStreaksRef.current[cid] = curr;
    }, [challenge]);

    // Clear the "just completed" celebration banner after 5s
    useEffect(() => {
        if (!challenge || !justCompletedIds.includes(challenge.id)) return;
        const t = setTimeout(() => {
            setJustCompletedIds(ids => ids.filter(id => id !== challenge.id));
        }, 5000);
        return () => clearTimeout(t);
    }, [challenge, justCompletedIds]);

    const openCreateModal = () => {
        setNewName('');
        setNewHours('');
        setNewTasks('');
        setNewDescription('');
        setIsCreating(true);
    };

    const closeCreateModal = () => {
        setIsCreating(false);
    };

    const handleSaveChallenge = (e) => {
        e.preventDefault();
        const name = newName.trim() || 'My 30-Day Challenge';
        const id = 'challenge-' + Date.now();
        addChallenge(name, newHours.trim(), newTasks.trim(), id, newDescription.trim());
        setIsCreating(false);
        setNewName('');
        setNewHours('');
        setNewTasks('');
        setNewDescription('');
        setActiveChallengeId(id);
    };

    const handleComplete = () => {
        if (!challenge) return;
        completeChallengeDay(challenge.id);
    };

    const handleMiss = () => {
        if (!challenge) return;
        missChallengeDay(challenge.id);
    };

    const handleReset = () => {
        if (!resetTargetId) return;
        resetChallenge(resetTargetId);
        setResetTargetId(null);
    };

    const handleDelete = () => {
        if (!deleteTargetId) return;
        deleteChallenge(deleteTargetId);
        setDeleteTargetId(null);
    };

    const renderChallengeHeader = () => (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                    30-Day Challenge
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Run multiple parallel 30-day streaks with independent grids, rewards & penalties
                </p>
            </div>
            {challenges.length > 0 && (
                <button
                    onClick={openCreateModal}
                    className="btn-primary flex items-center gap-2"
                >
                    <FiPlus className="w-4 h-4" />
                    Add New Challenge
                </button>
            )}
        </div>
    );

    const renderChallengeSelector = () => {
        if (!challenges || challenges.length === 0) return null;
        return (
            <div className="flex flex-wrap items-center gap-2">
                {challenges.map(c => (
                    <button
                        key={c.id}
                        onClick={() => setActiveChallengeId(c.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${c.id === activeChallengeId
                                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                            }`}
                    >
                        <FiFolder className="w-4 h-4" />
                        <span className="max-w-[140px] truncate">{c.name || 'Untitled'}</span>
                        {c.id === activeChallengeId && c.startedAt && (
                            <span className="flex items-center gap-0.5 text-xs opacity-80">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-300" />
                                {c.streak || 0}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        );
    };

    const renderCreateModal = () => {
        if (!isCreating) return null;
        return (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeCreateModal} />
                <div
                    className="relative w-full max-w-md rounded-2xl shadow-2xl animate-fade-in overflow-hidden"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                >
                    <div className="flex items-center justify-between px-6 pt-6 pb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                                <FiFlag className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                                {challenges.length === 0 ? 'Create Your First Challenge' : 'Add New Challenge'}
                            </h3>
                        </div>
                        <button
                            onClick={closeCreateModal}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            style={{ color: 'var(--color-text-secondary)' }}
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSaveChallenge} className="px-6 py-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                                Challenge Title
                            </label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="e.g., DBMS 30-Day Sprint"
                                className="input-field"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                                Daily Hours / Target Goal
                            </label>
                            <input
                                type="text"
                                value={newHours}
                                onChange={(e) => setNewHours(e.target.value)}
                                placeholder="e.g., 3 hours"
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                                Target Description / Note
                            </label>
                            <textarea
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder="e.g., Complete 1 topic per day"
                                className="input-field"
                                rows={2}
                            />
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button type="button" onClick={closeCreateModal} className="btn-secondary px-5 py-2.5 text-sm">
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
                                <FiTarget className="w-4 h-4" />
                                Save Challenge
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    const renderEmptyState = () => (
        <div className="card">
            <div className="text-center py-6">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                    Start Your 30-Day Challenge
                </h3>
                <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
                    Define your daily target, complete it each day to grow your streak, and earn badges.
                    Miss a day and your streak resets to zero! You can run multiple challenges in parallel.
                </p>
                <button
                    onClick={openCreateModal}
                    className="btn-primary flex items-center gap-2 mx-auto"
                >
                    <FiFlag className="w-4 h-4" />
                    Create Your First Challenge
                </button>
            </div>
        </div>
    );

    const renderChallengeView = () => {
        if (!challenge) return null;

        return (
            <>
                {/* Streak & Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Streak */}
                    <div className="card flex flex-col items-center justify-center text-center">
                        <div className="text-5xl mb-2 animate-flame">🔥</div>
                        <p className="text-4xl font-bold" style={{ color: 'var(--color-text)' }}>
                            {challenge.streak || 0}
                        </p>
                        <p className="text-sm font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                            Current Streak
                        </p>
                    </div>

                    {/* Best Streak */}
                    <div className="card flex flex-col items-center justify-center text-center">
                        <FiStar className="w-9 h-9 text-amber-500 mb-2" />
                        <p className="text-4xl font-bold" style={{ color: 'var(--color-text)' }}>
                            {challenge.bestStreak || 0}
                        </p>
                        <p className="text-sm font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                            Best Streak
                        </p>
                    </div>

                    {/* Days Completed */}
                    <div className="card flex flex-col items-center justify-center text-center">
                        <FiCheckCircle className="w-9 h-9 text-green-500 mb-2" />
                        <p className="text-4xl font-bold" style={{ color: 'var(--color-text)' }}>
                            {completedCount}<span className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>/{TOTAL_DAYS}</span>
                        </p>
                        <p className="text-sm font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                            Days Completed
                        </p>
                    </div>

                    {/* Missed */}
                    <div className="card flex flex-col items-center justify-center text-center">
                        <FiXCircle className="w-9 h-9 text-red-500 mb-2" />
                        <p className="text-4xl font-bold" style={{ color: 'var(--color-text)' }}>
                            {missedCount}
                        </p>
                        <p className="text-sm font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                            Days Missed
                        </p>
                    </div>
                </div>

                {/* Daily Target Card */}
                <div className="card">
                    <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                <FiTarget className="w-5 h-5 text-primary-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                                    {challenge.name || 'Daily Target'}
                                </h3>
                                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                    Day {challenge.day || 1} of 30
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm">
                            {challenge.targetHours && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium">
                                    <FiClock className="w-4 h-4" />
                                    {challenge.targetHours}
                                </span>
                            )}
                            {challenge.targetTasks && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">
                                    <FiZap className="w-4 h-4" />
                                    {challenge.targetTasks}
                                </span>
                            )}
                            <button
                                onClick={() => setResetTargetId(challenge.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-500 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                            >
                                <FiRotateCcw className="w-3.5 h-3.5" />
                                Reset
                            </button>
                            <button
                                onClick={() => setDeleteTargetId(challenge.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-500 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                            >
                                <FiTrash2 className="w-3.5 h-3.5" />
                                Delete
                            </button>
                        </div>
                    </div>

                    {/* Description / note */}
                    {challenge.description && (
                        <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                            <FiMessageSquare className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                {challenge.description}
                            </p>
                        </div>
                    )}

                    {/* Progress bar */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span style={{ color: 'var(--color-text-secondary)' }}>{completedCount} of {TOTAL_DAYS} days</span>
                            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{progressPct}%</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-purple-500 transition-all duration-700"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                    </div>

                    {/* Action buttons */}
                    {!isCompletedToday && !isMissedToday && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                onClick={handleComplete}
                                className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all duration-200 active:scale-[0.98] hover:shadow-lg hover:shadow-green-500/40 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 animate-glow-pulse"
                            >
                                <FiCheckCircle className="w-5 h-5" />
                                Complete Day Target
                            </button>
                            <button
                                onClick={handleMiss}
                                className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all duration-200 active:scale-[0.98] hover:shadow-lg hover:shadow-red-500/40 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
                            >
                                <FiXCircle className="w-5 h-5" />
                                Miss Day (Penalty)
                            </button>
                        </div>
                    )}

                    {/* Today status */}
                    {isCompletedToday && (
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 animate-pop-in">
                            <FiCheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                                    Today's target completed! 🎉
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-400">
                                    Streak: {challenge.streak} · Come back tomorrow to keep it going.
                                </p>
                            </div>
                        </div>
                    )}
                    {isMissedToday && (
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 animate-shake">
                            <FiXCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                                    Target failed — streak reset to 0.
                                </p>
                                <p className="text-xs text-red-600 dark:text-red-400">
                                    Regain focus tomorrow! Consistency is key.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Badges */}
                {(challenge.badges || []).length > 0 && (
                    <div className="card">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <FiAward className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                                    Reward Badges
                                </h3>
                                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                    Earned as your streak grows
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {(challenge.badges || []).map((badge, i) => (
                                <div key={badge} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 animate-pop-in" style={{ animationDelay: `${i * 0.12}s` }}>
                                    <span className="text-2xl">🏅</span>
                                    <div>
                                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                                            {badge}
                                        </p>
                                        <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                                            Streak milestone
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Celebration success card */}
                {justCompletedIds.includes(challenge.id) && (
                    <div className="card animate-pop-in border-2 border-green-500/50">
                        <div className="flex items-center gap-4">
                            <div className="text-5xl animate-flame">🎉</div>
                            <div>
                                <h3 className="text-xl font-bold text-green-500">
                                    Day Completed! Streak +1 🔥
                                </h3>
                                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                    Current streak: <span className="font-bold text-green-500">{challenge.streak}</span> · Best: <span className="font-bold text-amber-500">{challenge.bestStreak}</span>
                                </p>
                                {(newBadgesByChallenge[challenge.id] || []).length > 0 && (
                                    <p className="text-sm mt-1 font-medium text-amber-500">
                                        🏅 New badge{(newBadgesByChallenge[challenge.id] || []).length > 1 ? 's' : ''}: {(newBadgesByChallenge[challenge.id] || []).slice(-2).join(', ')}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 30-Day Visual Grid */}
                <div className="card">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <FiCalendar className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                                30-Day Visual Grid
                            </h3>
                            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                Started {challenge.startedAt ? formatDateKey(getDateKey(challenge.startedAt)) : '—'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2.5">
                        {(grid || []).map(d => {
                            const isCompleted = d.status === 'completed';
                            const isMissed = d.status === 'missed';
                            return (
                                <div
                                    key={d.dateKey}
                                    title={`${formatDateKey(d.dateKey)}${isCompleted ? ' — Completed' : isMissed ? ' — Missed' : d.isToday ? ' — Today' : ' — Not started'}`}
                                    className={`relative flex flex-col items-center justify-center aspect-square rounded-xl border transition-all duration-200 ${isCompleted
                                        ? 'bg-green-500 text-white border-green-600 shadow-md shadow-green-500/30'
                                        : isMissed
                                            ? 'bg-red-600 text-white border-red-700 shadow-md shadow-red-500/30'
                                            : d.isToday
                                                ? 'bg-primary-500 text-white border-primary-600 shadow-md shadow-primary-500/30'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-transparent'
                                        }`}
                                >
                                    <span className="text-xs font-semibold">{d.dayNumber}</span>
                                    <span className="text-sm leading-none mt-0.5">
                                        {isCompleted ? '✅' : isMissed ? '❌' : d.isToday ? '🎯' : ''}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-4 mt-5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-green-500 inline-block" /> Completed
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-red-600 inline-block" /> Missed
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-primary-500 inline-block" /> Today
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-slate-200 dark:bg-slate-700 inline-block" /> Not started
                        </span>
                    </div>
                </div>

                {/* Monthly Completion Analysis Chart */}
                <div className="card">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <FiCalendar className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                                Monthly Completion Analysis
                            </h3>
                            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                Approved vs failed days across your 30-day grid
                            </p>
                        </div>
                    </div>

                    {completedCount + missedCount > 0 ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                                    <XAxis
                                        dataKey="range"
                                        tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                                        axisLine={{ stroke: 'var(--color-border)' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-border)', opacity: 0.15 }} />
                                    <Bar dataKey="completed" name="Completed" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} maxBarSize={42} />
                                    <Bar dataKey="missed" name="Missed" stackId="a" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={42} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
                            <p className="text-4xl mb-3">📈</p>
                            <p className="text-sm">
                                Complete or miss days to see your monthly completion analysis.
                            </p>
                        </div>
                    )}

                    {/* Summary strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
                        <div className="p-3 rounded-xl text-center" style={{ background: 'var(--color-bg)' }}>
                            <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                                {completedCount}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                                Approved Days
                            </p>
                        </div>
                        <div className="p-3 rounded-xl text-center" style={{ background: 'var(--color-bg)' }}>
                            <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                                {missedCount}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                                Failed Days
                            </p>
                        </div>
                        <div className="p-3 rounded-xl text-center" style={{ background: 'var(--color-bg)' }}>
                            <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                                {progressPct}%
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                                Completion Rate
                            </p>
                        </div>
                    </div>
                </div>
            </>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            {renderChallengeHeader()}

            {/* Confetti / Celebration overlay */}
            {celebratingId && <Confetti count={70} triggerKey={celebrationKeys[celebratingId] || 0} />}

            {/* Penalty Screen */}
            {penaltyId && (
                <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
                    <div className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-shake border-2 border-red-500/60" style={{ background: 'var(--color-surface)' }}>
                        <div className="h-2 w-full bg-gradient-to-r from-red-600 via-red-500 to-red-600" />
                        <div className="p-8 text-center">
                            <div className="text-6xl mb-4">💔</div>
                            <h3 className="text-2xl font-bold text-red-500 mb-2">Target Failed!</h3>
                            <p className="text-sm font-semibold text-red-400 mb-1">
                                You lost your streak. Regain focus tomorrow!
                            </p>
                            <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                                Your current streak has been reset to 0. Consistency is key — get back on track! 💪
                            </p>
                            <button
                                onClick={() => setPenaltyId(null)}
                                className="mt-6 px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-all"
                            >
                                I'll Do Better 💪
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Challenge Selector / Tabbed view */}
            {challenges.length > 0 && renderChallengeSelector()}

            {/* No challenges yet */}
            {challenges.length === 0 && renderEmptyState()}

            {/* Active challenge detail view */}
            {challenges.length > 0 && challenge && (
                <div className="space-y-6">
                    {renderChallengeView()}
                </div>
            )}

            {/* Create Challenge Modal */}
            {renderCreateModal()}

            {/* Confirm modals */}
            <ConfirmModal
                isOpen={!!resetTargetId}
                title="Reset Challenge"
                message="This will restart the challenge from day 0, clearing its grid, streak and badges. The challenge itself is kept so you can start fresh."
                confirmLabel="Yes, Reset"
                onConfirm={handleReset}
                onCancel={() => setResetTargetId(null)}
                isDanger={true}
            />
            <ConfirmModal
                isOpen={!!deleteTargetId}
                title="Delete Challenge"
                message="This will permanently delete this challenge and all of its history, grid and badges. This cannot be undone."
                confirmLabel="Yes, Delete"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTargetId(null)}
                isDanger={true}
            />
        </div>
    );
}
