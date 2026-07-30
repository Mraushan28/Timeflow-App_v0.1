import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { formatTime, formatTimeShort } from '../utils/helpers';
import { startLoopingAlarm } from '../utils/audio';
import {
  FiPlay, FiPause, FiSquare, FiClock, FiEdit2, FiTrash2, FiCheck, FiX,
  FiTarget, FiActivity, FiAlertTriangle, FiUser, FiVolumeX,
} from 'react-icons/fi';

export default function TimerCard({ task, isEditing, editName, onStartEditing, onEditNameChange, onSaveRename, onCancelEditing, onDelete, isTimerRunning }) {
  const { state, startTimer, pauseTimer, resumeTimer, stopTimer, dismissAlarm } = useApp();
  const timer = state.activeTimers[task.id];

  const [countdownInput, setCountdownInput] = useState({ h: 0, m: 0 });
  const [mode, setMode] = useState('stopwatch');
  const [countdownReached, setCountdownReached] = useState(false);
  const [displayTime, setDisplayTime] = useState('00:00:00');
  const [alarmDismissed, setAlarmDismissed] = useState(false);
  const alarmPlayedRef = useRef(false);
  const audioUnlocked = useRef(false);
  const stopAlarmRef = useRef(null);

  // Compute display time from timer state
  // LOG_ELAPSED in AppContext already updates elapsed via delta every second.
  // We just read timer.elapsed directly — no re-computation needed here.
  useEffect(() => {
    if (!timer) {
      setDisplayTime('00:00:00');
      setCountdownReached(false);
      alarmPlayedRef.current = false;
      setAlarmDismissed(false);
      return;
    }

    const totalElapsed = timer.elapsed || 0;

    if (timer.mode === 'countdown') {
      const remaining = Math.max(0, timer.targetSeconds - totalElapsed);
      setDisplayTime(formatTime(remaining));

      if (remaining === 0 && !alarmPlayedRef.current && !alarmDismissed) {
        setCountdownReached(true);
        alarmPlayedRef.current = true;
        try {
          stopAlarmRef.current = startLoopingAlarm();
        } catch (e) {
          console.warn('Looping alarm failed:', e);
        }
      }
    } else {
      setDisplayTime(formatTime(totalElapsed));
    }
  }, [timer, alarmDismissed]);

  // Cleanup alarm on unmount
  useEffect(() => {
    return () => {
      if (stopAlarmRef.current) {
        stopAlarmRef.current();
        stopAlarmRef.current = null;
      }
    };
  }, []);

  const unlockAudio = useCallback(() => {
    if (!audioUnlocked.current) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume();
      audioUnlocked.current = true;
    }
  }, []);

  const handleStartCountdown = () => {
    unlockAudio();
    const totalSec = (countdownInput.h || 0) * 3600 + (countdownInput.m || 0) * 60;
    if (totalSec <= 0) return;
    setCountdownReached(false);
    alarmPlayedRef.current = false;
    setAlarmDismissed(false);
    startTimer(task.id, 'countdown', totalSec);
  };

  const handleStartStopwatch = () => {
    unlockAudio();
    startTimer(task.id, 'stopwatch', 0);
  };

  const handlePause = () => {
    // Stop alarm if playing
    if (stopAlarmRef.current) {
      stopAlarmRef.current();
      stopAlarmRef.current = null;
    }
    // Use timer.elapsed directly — already up-to-date from LOG_ELAPSED delta ticks
    pauseTimer(task.id, timer.elapsed || 0);
    setCountdownReached(false);
    alarmPlayedRef.current = false;
  };

  const handleResume = () => {
    resumeTimer(task.id);
    if (timer.mode === 'countdown') {
      alarmPlayedRef.current = false;
      setCountdownReached(false);
      setAlarmDismissed(false);
    }
  };

  const handleStop = () => {
    // Stop alarm if playing
    if (stopAlarmRef.current) {
      stopAlarmRef.current();
      stopAlarmRef.current = null;
    }
    // Use timer.elapsed directly — already up-to-date from LOG_ELAPSED delta ticks
    stopTimer(task.id, timer.elapsed || 0);
    setCountdownReached(false);
    alarmPlayedRef.current = false;
    setAlarmDismissed(false);
  };

  const handleDismissAlarm = () => {
    if (stopAlarmRef.current) {
      stopAlarmRef.current();
      stopAlarmRef.current = null;
    }
    setAlarmDismissed(true);
    dismissAlarm(task.id);
  };

  const isRunning = timer && !timer.paused;
  const isPaused = timer && timer.paused;
  const isAlarmRinging = timer && timer.mode === 'countdown' && countdownReached && !alarmDismissed;

  return (
    <div
      className={`card relative overflow-hidden group transition-all duration-300 ${
        isRunning && !isAlarmRinging ? 'ring-2 ring-primary-500/40 shadow-lg shadow-primary-500/10' : ''
      } ${isAlarmRinging ? 'ring-2 ring-red-500/60 shadow-lg shadow-red-500/20 animate-pulse-slow' : ''}`}
    >
      {isRunning && !isAlarmRinging && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent pointer-events-none" />
      )}
      {isAlarmRinging && (
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm"
            style={{ background: `${task.color}20` }}
          >
            {task.icon}
          </div>
          <div>
            {isEditing ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => onEditNameChange(e.target.value)}
                  className="input-field text-sm py-1 px-2 w-28"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSaveRename();
                    if (e.key === 'Escape') onCancelEditing();
                  }}
                />
                <button onClick={onSaveRename} className="p-1 text-green-500 hover:text-green-600">
                  <FiCheck className="w-3.5 h-3.5" />
                </button>
                <button onClick={onCancelEditing} className="p-1 text-slate-400 hover:text-slate-600">
                  <FiX className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  {task.name}
                </h3>
                {task.worker && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <FiUser className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                      {task.worker}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {!isEditing && !isRunning && !isPaused && !isAlarmRinging && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onStartEditing}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              title="Rename"
            >
              <FiEdit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500"
              title="Delete"
            >
              <FiTrash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Timer Display */}
      <div className="text-center py-4">
        <div
          className={`text-4xl font-bold tracking-wider tabular-nums ${
            isAlarmRinging ? 'text-red-500' : ''
          }`}
          style={{ color: isRunning && !isAlarmRinging ? task.color : 'var(--color-text)' }}
        >
          {displayTime}
        </div>

        <div className="mt-2 flex items-center justify-center gap-2">
          {isAlarmRinging && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse">
              <FiAlertTriangle className="w-3 h-3" />
              TIME'S UP!
            </span>
          )}
          {isRunning && !isAlarmRinging && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {timer.mode === 'countdown' ? 'Counting Down' : 'Tracking'}
            </span>
          )}
          {isPaused && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <FiClock className="w-3 h-3" />
              Paused
            </span>
          )}
          {!timer && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
              Idle
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-3">
        {!timer ? (
          <>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('stopwatch')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${
                  mode === 'stopwatch'
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <FiActivity className="w-4 h-4" />
                Stopwatch
              </button>
              <button
                onClick={() => setMode('countdown')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${
                  mode === 'countdown'
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <FiTarget className="w-4 h-4" />
                Countdown
              </button>
            </div>

            {mode === 'countdown' && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={countdownInput.h}
                    onChange={(e) => setCountdownInput({ ...countdownInput, h: parseInt(e.target.value) || 0 })}
                    className="input-field text-center py-2"
                    placeholder="0"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Minutes
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={countdownInput.m}
                    onChange={(e) => setCountdownInput({ ...countdownInput, m: parseInt(e.target.value) || 0 })}
                    className="input-field text-center py-2"
                    placeholder="30"
                  />
                </div>
              </div>
            )}

            <button
              onClick={mode === 'countdown' ? handleStartCountdown : handleStartStopwatch}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              <FiPlay className="w-4 h-4" />
              {mode === 'countdown' ? 'Start Countdown' : 'Start Tracking'}
            </button>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              {isAlarmRinging ? (
                <>
                  <button
                    onClick={handleDismissAlarm}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2 py-2.5 text-red-600 border-red-300 dark:border-red-700"
                  >
                    <FiVolumeX className="w-4 h-4" />
                    Dismiss Alarm
                  </button>
                  <button
                    onClick={handleStop}
                    className="btn-danger flex items-center justify-center gap-2 py-2.5 px-4"
                  >
                    <FiSquare className="w-4 h-4" />
                    Stop
                  </button>
                </>
              ) : (
                <>
                  {isRunning ? (
                    <button
                      onClick={handlePause}
                      className="btn-secondary flex-1 flex items-center justify-center gap-2 py-2.5"
                    >
                      <FiPause className="w-4 h-4" />
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={handleResume}
                      className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5"
                    >
                      <FiPlay className="w-4 h-4" />
                      Resume
                    </button>
                  )}
                  <button
                    onClick={handleStop}
                    className="btn-danger flex items-center justify-center gap-2 py-2.5 px-4"
                  >
                    <FiSquare className="w-4 h-4" />
                    Stop
                  </button>
                </>
              )}
            </div>

            {timer.mode === 'stopwatch' && timer.elapsed > 0 && (
              <p className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
                Logged: {formatTimeShort(timer.elapsed)}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

