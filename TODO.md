# TODO — Multiple Parallel 30-Day Challenges

## Goal
Refactor the 30-Day Challenge module to support multiple simultaneous challenges
(e.g., "DSA Coding Practice", "DBMS Subject Revision", "Daily Exercise"), each with
its own independent 30-day grid, streak/rewards, daily completion status, and
monthly analysis chart — without breaking timers, scheduled alarms, or dashboard.

## Steps
- [x] 1. Refactor `src/context/AppContext.jsx`:
      - Replace single `state.challenge` with `state.challenges[]`
      - Add `id` + `name` to each challenge
      - New reducer actions: `ADD_CHALLENGE`, `DELETE_CHALLENGE`
      - Per-challenge actions by `challengeId`: `COMPLETE_CHALLENGE_DAY`, `MISS_CHALLENGE_DAY`, `RESET_CHALLENGE` (reset keeps id/name)
      - Legacy migration: single `challenge` object -> `challenges[]`
      - Update context callbacks: `addChallenge`, `deleteChallenge`, etc.
- [x] 2. Rewrite `src/components/Challenge30.jsx`:
      - Challenge selector tabs for switching between active challenges
      - "Add New Challenge" form (name + targets) + cancel when challenges exist
      - Delete/archive a challenge via confirm modal
      - Per-challenge streak/stats cards, daily target, badges, 30-day grid
      - Per-challenge celebration/penalty overlays (keyed by challenge id)
      - Per-challenge "Monthly Completion Analysis" chart (recharts)
- [x] 3. Verify nothing else references single-challenge state (Dashboard, Analytics, alarms intact)
- [x] 4. Test: production build passes (`npm run build`)
- [x] 5. CRITICAL BUG FIX (blank screen on "Create Challenge"):
      - Replaced brittle inline form toggle with a robust `isCreating` boolean state
      - Created a dedicated modal popup for challenge creation (title, hours, description, Save/Cancel)
      - Added safe array fallbacks `(challenges || [])` and `challenge?` guards everywhere
      - Modal always renders a valid overlay; header/empty-state always render correctly
      - Added `description` field support to challenge data model + reducer + callback
      - On save: appends to `challenges[]`, persists to localStorage, closes modal, switches to new challenge

