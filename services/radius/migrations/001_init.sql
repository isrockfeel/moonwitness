CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    framed_ip TEXT,
    vlan_id INTEGER,
    session_timeout INTEGER,
    mac_address TEXT
);

CREATE TABLE IF NOT EXISTS radius_logs (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    nas_ip TEXT,
    nas_port TEXT,
    event TEXT NOT NULL,
    result TEXT NOT NULL,
    framed_ip TEXT,
    vlan_id INTEGER,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_radius_logs_username ON radius_logs(username);
CREATE INDEX IF NOT EXISTS idx_radius_logs_created_at ON radius_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);