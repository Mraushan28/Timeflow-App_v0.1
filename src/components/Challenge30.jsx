import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
    FiTarget, FiCheckCircle, FiXCircle, FiStar, FiZap,
    FiCalendar, FiFlag, FiAward, FiRotateCcw, FiClock,
} from 'react-icons/fi';
import { getDateKey, formatDateKey } from '../utils/helpers';
import Confetti from './Confetti';

const TOTAL_DAYS = 30;

/**
 * Build the 30-day grid starting from the challenge start date.
 * Returns an array of { dateKey, dayNumber, status, isToday } entries.
 */
function buildDayGrid(challenge) {
    const grid = [];
    const start = challenge.startedAt ? new Date(challenge.startedAt) : new Date();
    const todayKey = getDateKey();

    for (let i = 0; i < TOTAL_DAYS; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const dateKey = getDateKey(d);
        const entry = (challenge.days || {})[dateKey];
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

export default function Challenge30() {
    const {
        state, startChallenge, completeChallengeDay,
        missChallengeDay, resetChallenge,
    } = useApp();

    const challenge = state.challenge || {};

    const [showSetup, setShowSetup] = useState(false);
    const [targetHours, setTargetHours] = useState('');
    const [targetTasks, setTargetTasks] = useState('');
    const [celebrating, setCelebrating] = useState(false);
    const [penaltyVisible, setPenaltyVisible] = useState(false);
    const [justCompleted, setJustCompleted] = useState(false);
    const [newBadges, setNewBadges] = useState([]);
    const [celebrationKey, setCelebrationKey] = useState(0);
    const lastStreakRef = useRef(challenge.streak || 0);

    const todayKey = getDateKey();
    const todayEntry = (challenge.days || {})[todayKey];
    const isCompletedToday = todayEntry?.status === 'completed';
    const isMissedToday = todayEntry?.status === 'missed';

    const grid = useMemo(() => buildDayGrid(challenge), [challenge]);
    const completedCount = grid.filter(d => d.status === 'completed').length;
    const missedCount = grid.filter(d => d.status === 'missed').length;
    const progressPct = Math.round((completedCount / TOTAL_DAYS) * 100);

    // Detect streak increase -> celebrate; streak reset -> penalty
    useEffect(() => {
        const prev = lastStreakRef.current;
        const curr = challenge.streak || 0;

        if (curr > prev) {
            setJustCompleted(true);
            setCelebrating(true);
            setCelebrationKey(k => k + 1);
            setNewBadges(challenge.badges || []);
            const t = setTimeout(() => setCelebrating(false), 2600);
            const t2 = setTimeout(() => setJustCompleted(false), 5000);
            lastStreakRef.current = curr;
            return () => { clearTimeout(t); clearTimeout(t2); };
        }
        if (curr < prev) {
            // streak reset
            setPenaltyVisible(true);
            const t = setTimeout(() => setPenaltyVisible(false), 5000);
            lastStreakRef.current = curr;
            return () => clearTimeout(t);
        }
        lastStreakRef.current = curr;
    }, [challenge.streak, challenge.badges]);

    const handleStart = (e) => {
        e.preventDefault();
        startChallenge({
            targetHours: targetHours.trim(),
            targetTasks: targetTasks.trim(),
        });
        setShowSetup(false);
    };

    const handleComplete = () => {
        completeChallengeDay();
    };

    const handleMiss = () => {
        missChallengeDay();
    };

    const handleReset = () => {
        resetChallenge();
        lastStreakRef.current = 0;
        setJustCompleted(false);
        setCelebrating(false);
        setPenaltyVisible(false);
    };

    const isActive = !!challenge.startedAt;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                        30-Day Challenge
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        Build a daily student routine with streaks, badges & penalties
                    </p>
                </div>
                {isActive && (
                    <button
                        onClick={handleReset}
                        className="btn-secondary flex items-center gap-2 text-red-500 border-red-200 dark:border-red-900/50"
                    >
                        <FiRotateCcw className="w-4 h-4" />
                        Reset Challenge
                    </button>
                )}
            </div>

            {/* Confetti / Celebration overlay */}
            {celebrating && <Confetti count={70} triggerKey={celebrationKey} />}

            {/* Penalty Screen */}
            {penaltyVisible && (
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
                                onClick={() => setPenaltyVisible(false)}
                                className="mt-6 px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-all"
                            >
                                I'll Do Better 💪
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Setup / Not started */}
            {!isActive ? (
                <div className="card">
                    <div className="text-center py-6">
                        <div className="text-6xl mb-4">🎯</div>
                        <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                            Start Your 30-Day Challenge
                        </h3>
                        <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
                            Define your daily target, complete it each day to grow your streak, and earn badges. Miss a day and your streak resets to zero!
                        </p>

                        {!showSetup ? (
                            <button
                                onClick={() => setShowSetup(true)}
                                className="btn-primary flex items-center gap-2 mx-auto"
                            >
                                <FiFlag className="w-4 h-4" />
                                Define Daily Target
                            </button>
                        ) : (
                            <form onSubmit={handleStart} className="max-w-md mx-auto space-y-4 text-left">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                                        Daily Target Hours (e.g., 4h)
                                    </label>
                                    <input
                                        type="text"
                                        value={targetHours}
                                        onChange={(e) => setTargetHours(e.target.value)}
                                        placeholder="e.g., 4h"
                                        className="input-field"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                                        Daily Target Tasks (e.g., DSA + DBMS)
                                    </label>
                                    <input
                                        type="text"
                                        value={targetTasks}
                                        onChange={(e) => setTargetTasks(e.target.value)}
                                        placeholder="e.g., DSA + DBMS"
                                        className="input-field"
                                    />
                                </div>
                                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                                    <FiTarget className="w-4 h-4" />
                                    Begin Challenge
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            ) : (
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
                                        Daily Target
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
                            </div>
                        </div>

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
                    {justCompleted && (
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
                                    {newBadges.length > 0 && (
                                        <p className="text-sm mt-1 font-medium text-amber-500">
                                            🏅 New badge{newBadges.length > 1 ? 's' : ''}: {newBadges.slice(-2).join(', ')}
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
                            {grid.map(d => {
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
                </>
            )}
        </div>
    );
}

