# TODO — Scheduled Alarm Instant Trigger Bug Fix

## Root Cause
The 1-second scheduler interval in `ReminderAlarmManager.jsx` re-creates the interval
whenever `scheduledReminders` changes (because the effect depends on it), combined with
timezone-unclear date/time parsing in `ScheduledReminders.jsx`. This can cause the alarm
and modal to appear instantly on task creation instead of waiting for the scheduled time.

## Steps
- [x] 1. Analyze current scheduler/modal/creation logic (read files)
- [x] 2. Refactor `ReminderAlarmManager.jsx`:
      - Create interval checker ONCE via a latest-state ref (no re-run on array change)
      - Compare `Date.now()` vs `new Date(r.scheduledAt).getTime()` each tick
      - Only promote `status === 'PENDING'` -> `TRIGGERED` when `current >= scheduled`
- [x] 3. Make `ScheduledReminders.jsx` `handleSubmit` timezone-safe
      - Build `scheduledAt` from local date+time components explicitly
      - Confirm it does NOT call the trigger directly
- [x] 4. Verify no other trigger paths exist (App.jsx mounts manager only)
- [x] 5. Test: production build passes (npm run build) — scheduler code compiles cleanly
