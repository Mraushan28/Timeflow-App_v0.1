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

---

# TODO — Navbar Spacing Fix + 30-Day Challenge Gamification

## Implementation

- [x] 11. `src/components/Navbar.jsx`
  - Fix top navbar layout with `justify-between`: logo far left, action controls far right
- [x] 12. `src/utils/helpers.js`
  - Add `getDateKey`, `formatDateKey`
- [x] 13. `src/index.css`
  - Add `pop-in`, `shake`, `flame-flicker`, `glow-pulse`, `confetti-burst` animations
- [x] 14. `src/context/AppContext.jsx`
  - Add `challenge` state (days, streak, bestStreak, badges, targetHours, targetTasks, startedAt)
  - Add reducer cases: `START_CHALLENGE`, `COMPLETE_CHALLENGE_DAY`, `MISS_CHALLENGE_DAY`, `RESET_CHALLENGE`
  - Auto-fill missed days on load via `fillMissedGaps`
  - Expose `startChallenge`, `completeChallengeDay`, `missChallengeDay`, `resetChallenge`
- [x] 15. `src/components/Confetti.jsx`
  - Lightweight CSS confetti celebration component
- [x] 16. `src/components/Challenge30.jsx`
  - Daily target creation form
  - Complete Day Target / Miss Day buttons
  - Streak counter (🔥), best streak, badges, celebration & penalty screens
  - 30-day visual grid (green ✅ / red ❌ / today 🎯)
  - LocalStorage persistence via AppContext

## Verification

- [x] 17. Run `npm run build` to confirm no errors

