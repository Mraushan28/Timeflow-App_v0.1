# TODO — Scheduled Task Reminders & Monthly Status Audit

## Steps

- [x] 1. Analyze repo & read all relevant files
- [x] 2. Create & confirm edit plan

## Implementation

- [x] 3. `src/utils/helpers.js`
  - Add `formatDateTime`, `formatCountdown`, `getMonthKey`, `getMonthLabel`, `getReminderMonths`
- [x] 4. `src/context/AppContext.jsx`
  - Add `scheduledReminders` & `reminderHistory` state fields (fresh state, load normalization, save)
  - Add reducer cases: `ADD_SCHEDULED_REMINDER`, `DELETE_SCHEDULED_REMINDER`, `TRIGGER_SCHEDULED_REMINDER`, `RESOLVE_SCHEDULED_REMINDER`
  - Expose new callbacks in context value
- [x] 5. `src/components/ReminderAlertModal.jsx`
  - Prominent alert modal with task details + green APPROVED / red REJECTED buttons
- [x] 6. `src/components/ReminderAlarmManager.jsx`
  - Global 1s checker that fires due reminders, starts looping alarm, mounts alert modal
- [x] 7. `src/components/ScheduledReminders.jsx`
  - Creation form (Task Name, Description, Date & Time, Worker)
  - Upcoming reminders list with live countdowns
  - Monthly Status Audit (month selector, stat cards, donut chart, progress bars, history list)
- [x] 8. `src/App.jsx`
  - Add "Scheduled" tab + mount `ReminderAlarmManager` globally
- [x] 9. `src/index.css`
  - Add `animate-ring` and `animate-alert-glow` keyframes

## Verification

- [x] 10. Run `npm run build` to confirm no errors

