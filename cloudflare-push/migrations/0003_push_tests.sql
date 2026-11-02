CREATE TABLE push_tests (
 id TEXT PRIMARY KEY,
 uid TEXT NOT NULL,
 device_id TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 run_at INTEGER NOT NULL,
 state TEXT NOT NULL DEFAULT 'queued',
 sent_at INTEGER
);
CREATE INDEX push_tests_due ON push_tests(state, run_at);
CREATE INDEX push_tests_device ON push_tests(device_id, created_at);
