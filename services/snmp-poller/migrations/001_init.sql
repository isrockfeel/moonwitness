CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL DEFAULT 161,
    version TEXT NOT NULL DEFAULT '2c', -- 1 | 2c
    community TEXT NOT NULL DEFAULT 'public',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS targets (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    name TEXT NOT NULL,           -- e.g. eth1-in, eth1-out
    oid TEXT NOT NULL,            -- numeric dotted OID to poll (counter)
    poll_interval INTEGER,        -- seconds; NULL = use service default
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS samples (
    id TEXT PRIMARY KEY,
    target_id TEXT NOT NULL,
    ts INTEGER NOT NULL,          -- unix seconds
    counter INTEGER NOT NULL,     -- raw counter value
    rate REAL,                    -- computed units/sec (e.g. octets/sec); NULL for first sample
    FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_targets_device ON targets(device_id);
CREATE INDEX IF NOT EXISTS idx_samples_target_ts ON samples(target_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_samples_ts ON samples(ts);