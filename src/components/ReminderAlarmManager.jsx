import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { startLoopingAlarm } from '../utils/audio';
import ReminderAlertModal from './ReminderAlertModal';

/**
 * Global manager that watches scheduled reminders every second.
 * When a reminder's scheduled time is reached:
 *   - Promotes it from PENDING -> TRIGGERED (persisted)
 *   - Starts the continuous looping Web Audio alarm
 *   - Shows the prominent APPROVED / REJECTED modal
 * Works on ANY tab since it is mounted at the App root.
 */
export default function ReminderAlarmManager() {
    const { state, triggerScheduledReminder, resolveScheduledReminder } = useApp();
    const [activeReminder, setActiveReminder] = useState(null);
    const stopAlarmRef = useRef(null);

    // Find the first triggered-but-unresolved reminder (the one ringing now)
    const triggered = state.scheduledReminders.find(r => r.status === 'TRIGGERED');

    // Keep activeReminder in sync with the triggered reminder
    useEffect(() => {
        if (triggered) {
            setActiveReminder(triggered);
        } else {
            setActiveReminder(null);
        }
    }, [triggered]);

    // Start / stop the looping alarm based on whether a reminder is ringing
    useEffect(() => {
        if (triggered) {
            try {
                if (!stopAlarmRef.current) {
                    stopAlarmRef.current = startLoopingAlarm();
                }
            } catch (e) {
                console.warn('Scheduled reminder alarm failed:', e);
            }
        } else {
            if (stopAlarmRef.current) {
                stopAlarmRef.current();
                stopAlarmRef.current = null;
            }
        }

        return () => {
            if (stopAlarmRef.current) {
                stopAlarmRef.current();
                stopAlarmRef.current = null;
            }
        };
    }, [triggered]);

    // 1-second checker: promote any PENDING reminder whose time has arrived
    useEffect(() => {
        const checkInterval = setInterval(() => {
            const now = Date.now();
            state.scheduledReminders.forEach(r => {
                if (r.status === 'PENDING' && new Date(r.scheduledAt).getTime() <= now) {
                    triggerScheduledReminder(r.id);
                }
            });
        }, 1000);

        return () => clearInterval(checkInterval);
    }, [state.scheduledReminders, triggerScheduledReminder]);

    // Resolve handler — stops alarm and records APPROVED/REJECTED in history
    const handleResolve = useCallback((approved) => {
        if (activeReminder) {
            if (stopAlarmRef.current) {
                stopAlarmRef.current();
                stopAlarmRef.current = null;
            }
            resolveScheduledReminder(activeReminder.id, approved);
            setActiveReminder(null);
        }
    }, [activeReminder, resolveScheduledReminder]);

    return (
        <ReminderAlertModal
            reminder={activeReminder}
            onApprove={() => handleResolve(true)}
            onReject={() => handleResolve(false)}
        />
    );
}

