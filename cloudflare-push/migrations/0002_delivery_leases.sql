-- Existing reservations stay treated as delivered to avoid replaying old alerts.
ALTER TABLE deliveries ADD COLUMN state TEXT NOT NULL DEFAULT 'sent';
ALTER TABLE deliveries ADD COLUMN lease_token TEXT;
