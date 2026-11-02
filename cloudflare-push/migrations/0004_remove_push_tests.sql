-- Retire isolated diagnostic Push queue; registered devices and delivery receipts stay untouched.
DROP TABLE IF EXISTS push_tests;
