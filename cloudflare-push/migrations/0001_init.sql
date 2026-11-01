-- Private Web Push subscriptions. No SQL tables are exposed to site clients.
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'ru',
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS devices_uid ON devices(uid);
CREATE INDEX IF NOT EXISTS devices_email ON devices(email);

-- At-most-once delivery reservation for each event + device.
CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS deliveries_created ON deliveries(created_at);
