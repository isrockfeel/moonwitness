CREATE TABLE IF NOT EXISTS syslog_messages (
    id TEXT PRIMARY KEY,
    received_at INTEGER NOT NULL,
    source_ip TEXT,
    transport TEXT NOT NULL, -- udp | tcp
    facility INTEGER,
    severity INTEGER,
    priority INTEGER,
    timestamp TEXT,
    hostname TEXT,
    app_name TEXT,
    procid TEXT,
    msgid TEXT,
    message TEXT NOT NULL,
    raw TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_syslog_received_at ON syslog_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_syslog_severity ON syslog_messages(severity);
CREATE INDEX IF NOT EXISTS idx_syslog_hostname ON syslog_messages(hostname);
CREATE INDEX IF NOT EXISTS idx_syslog_app_name ON syslog_messages(app_name);