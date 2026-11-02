-- Monitor free Cloudflare Cron: distinguish an enabled push subscription from a
-- background scheduler that has stopped polling Firestore.
CREATE TABLE IF NOT EXISTS cron_health (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  last_run_at INTEGER,
  last_schedule_ok_at INTEGER,
  last_schedule_error_at INTEGER
);
