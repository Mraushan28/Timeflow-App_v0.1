# Implementation TODO

## Phase 1: Core Infrastructure Updates
- [x] 1. `src/utils/audio.js` — Added `startLoopingAlarm()` with stop function for continuous alarm
- [x] 2. `src/context/AppContext.jsx` — Added worker field to tasks, appActive toggle, selectedWorker, permanent history (no clear/delete)

## Phase 2: Component Updates
- [x] 3. `src/components/TimerCard.jsx` — Worker badge, looping alarm with Dismiss button, stop alarm on pause/stop
- [x] 4. `src/components/TaskManager.jsx` — Worker input field, worker filter dropdown, appActive gate with restriction toast
- [x] 5. `src/components/Dashboard.jsx` — Worker-filtered breakdown with worker badge on tasks
- [x] 6. `src/components/Analytics.jsx` — Worker selector dropdown + per-worker donut/bar/line charts

## Phase 3: New Components & Layout
- [x] 7. Created `src/components/Footer.jsx` — Dark slate footer with credits
- [x] 8. Updated `src/components/Navbar.jsx` — Master Active toggle switch with green/indicator
- [x] 9. Updated `src/App.jsx` — Added Footer, flex layout
- [x] 10. Build verified — `npm run build` succeeds with zero errors

## Phase 4: PWA & Bug Fixes
- [x] 11. Delta-based LOG_ELAPSED — No double-counting, accurate elapsed across pause/stop
- [x] 12. `loadState()` with robust field fallbacks — All data survives hard page reloads
- [x] 13. `syncActiveTimersOnLoad()` — Active timers recalculate elapsed on refresh, reset startTime
- [x] 14. First-visit demo data — 5 days of sample history generated for new users
- [x] 15. `vite.config.js` — `VitePWA` plugin with full manifest, Workbox caching, offline support
- [x] 16. `public/pwa-192x192.svg` + `pwa-512x512.svg` — PWA icons with maskable purpose
- [x] 17. `index.html` — iOS meta tags (apple-mobile-web-app-capable, touch-icon)
- [x] 18. `src/components/InstallPrompt.jsx` — Install banner detecting beforeinstallprompt event
- [x] 19. `src/App.jsx` — InstallPrompt integrated in layout
- [x] 20. `index.css` — Added `animate-fade-in` for install banner entrance

## All Features Implemented
- ✅ Continuous looping alarm until dismissed/paused/stopped
- ✅ Worker/Person attribution for tasks (name + worker fields)
- ✅ Worker-specific analytics with dropdown selector
- ✅ Master Active toggle (default OFF) with restriction popup
- ✅ Permanent locked history (no delete/reset)
- ✅ Professional footer with credits
- ✅ Dark/Light theme support
- ✅ Multi-tasking (concurrent timers)
- ✅ localStorage persistence (all fields survive hard refresh)
- ✅ Time parsing fix (minutes vs hours)
- ✅ Delta-based elapsed tracking (no double-counting)
- ✅ PWA support (manifest, service worker, offline caching)
- ✅ Install prompt banner (beforeinstallprompt detection)
- ✅ iOS support (meta tags, apple-touch-icon)
- ✅ First-visit demo data (5 days sample history)
