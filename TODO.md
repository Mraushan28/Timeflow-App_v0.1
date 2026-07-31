# TODO — Reset All Data + Absolute Zero State

## Steps

- [x] 1. Analyze repo & read all relevant files
- [x] 2. Create & confirm edit plan

## Implementation

- [x] 3. `src/context/AppContext.jsx`
  - Add `containsMockData()` detection
  - Auto-clear legacy sample/mock data in `loadState()`
  - Change `RESET_ALL_DATA` to use `localStorage.clear()`
- [x] 4. `src/utils/helpers.js`
  - `formatTimeShort(0)` → `'0h 0m'`
- [x] 5. `src/components/Dashboard.jsx`
  - Empty state text → "No activity logged today. Start a timer to track your time!"
- [x] 6. `src/components/Navbar.jsx`
  - Prominent labeled Reset button
  - Updated confirmation modal message
  - Updated success toast message
- [x] 7. `src/components/Toast.jsx`
  - Fix JSX syntax error (unclosed outer div)

## Verification

- [x] 8. Run `npm run build` to confirm no errors
- [ ] 9. Manual test: reset flow, zero-state metrics, timer tracking

