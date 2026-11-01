# RU/KZ interface audit — 19.31

## Changes

- Added missing Kazakh labels for next lessons/breaks, notifications, undo,
  synchronization, offline/error banners, accessibility labels and placeholders.
- Retain original text for transient system/undo/toast messages so switching back
  to Russian can restore it. Refresh dates, open schedule suggestions and support
  timestamps when the selected language changes without resetting draft inputs.
- Exclude actual author names and support message bodies from UI translation.
  User-entered content is not an interface label and stays in its original language.
- Stack time/break fields below 420px to show complete input values.
- Remove the stale `utils.js` import of the old translation module. PWA tests now
  inspect imports in every top-level JavaScript module, not a selected subset.

## Verification (2026-11-01)

`node tests/localization-coverage.test.cjs` checks representative translations,
dynamic synchronization counters, every notification-delivery status override,
all friendly system-error messages, bilingual release notes and user-data markup.
`node tests/translation-updates.test.cjs` covers incremental updates and language
switches. CSS and all PWA dependency/cache consistency checks pass.

Browser check: `node scripts/verify-languages.cjs` with Playwright installed.
An optional `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` selects a browser executable;
`QA_OUTPUT_DIR` saves selected screenshots to an existing directory.
Uses port 4173 locally and closes the server/browser on completion.

Edge passed 13 screens/windows at 320px, 390px and 1440px, each switched
KZ → RU → KZ: home, schedule, roster, college, journal, expanded settings,
help, notifications, menu, lesson editor, bell editor, pause editor and release
history. No known opposite-language dictionary labels, clipped checked text
containers, page-width overflow or uncaught JS errors were found. Teacher and
note drafts remain unchanged. Screenshots of home/settings/help/editor inspected.
Editor access uses a local client fixture; the check never saves or publishes
schedule changes and does not validate server-side permissions.

Full Node test suite: 57/58 pass. The unchanged legacy notification-center test
still has an incomplete service-worker mock and an obsolete status expectation.
The separate legacy `support-alerts.cjs` fixture also lacks MOBILE_FAST_MODE.
Neither failure is a new production regression. Required CI is evaluated separately.

Real push delivery and authenticated end-to-end administrative writes belong to
the notification/access tasks. This audit checks their interface text, not delivery
or authorization. Loanwords shared by both languages, names and authored content
are intentionally not treated as untranslated interface labels.
