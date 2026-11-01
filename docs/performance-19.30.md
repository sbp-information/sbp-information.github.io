# Incremental interface translations (19.30)

The translation observer previously traversed the entire body after any text,
child or translated-attribute mutation. Explicit partial renders also expanded
to the whole body. The new pass drains pending observer records, collects changed
roots and removes descendants of already queued roots. Language changes still
translate the whole page. Personal-data exclusions and source-text restoration
are preserved.

## Validation, 2026-11-01

- Node regression test: `node tests/translation-updates.test.cjs` (also in CI).
  Covers RU/KZ, pending changes in another section, attributes, inserted text,
  batching and full-page language changes.
- Edge headless, actual index DOM: 30 individual text updates caused 30 full-body
  walks before the change and zero after, in both languages. Median processing
  time before: RU 2.9 ms, KZ 4.6 ms; after: below timer resolution. These are
  isolated translation measurements, not total page-load improvements.
- Local complete app: home, schedule, roster, college and journal opened without
  uncaught JavaScript exceptions at 390px and 1440px widths in both languages.
  Switching plus two animation frames took 10.6–79.7 ms on this desktop.
- CSS generation consistency passes; stylesheet content and layout unchanged.
- Full Node suite: 56/57 pass with bundled canvas dependency. The existing
  notification-center test fails on its old open-site-only expectation and
  incomplete service-worker mock. Neither its source nor test was changed.
- Screenshots inspected. Existing Russian labels on the Kazakh home timeline
  remain a separate localization issue for task 3.

Physical-phone performance and installed-PWA update behavior have not been
measured by these desktop checks. Do not infer a percentage improvement in total
startup time from this change.
