PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player','admin')),
  points INTEGER NOT NULL DEFAULT 10000 CHECK (points >= 0 AND points <= 1000000000),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  daily_limit INTEGER NOT NULL DEFAULT 10000 CHECK (daily_limit BETWEEN 1 AND 1000000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  digest TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires ON sessions(expires);

CREATE TABLE IF NOT EXISTS plays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  day TEXT NOT NULL,
  market TEXT NOT NULL CHECK (market IN ('2D','3D','4D')),
  number TEXT NOT NULL,
  stake INTEGER NOT NULL CHECK (stake BETWEEN 1 AND 100000),
  multiplier INTEGER NOT NULL,
  reward INTEGER NOT NULL DEFAULT 0,
  charged INTEGER NOT NULL DEFAULT 0 CHECK (charged IN (0,1)),
  request_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, request_key)
);
CREATE INDEX IF NOT EXISTS plays_user_day ON plays(user_id, day);
CREATE INDEX IF NOT EXISTS plays_day_market_number ON plays(day, market, number);

CREATE TABLE IF NOT EXISTS point_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  delta INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  kind TEXT NOT NULL,
  ref TEXT NOT NULL UNIQUE,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS point_ledger_user_id ON point_ledger(user_id, id DESC);

CREATE TABLE IF NOT EXISTS scheduled_results (
  day TEXT NOT NULL,
  market TEXT NOT NULL CHECK (market IN ('2D','3D','4D')),
  result TEXT NOT NULL,
  publish_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(day, market)
);

CREATE TABLE IF NOT EXISTS results (
  day TEXT NOT NULL,
  market TEXT NOT NULL CHECK (market IN ('2D','3D','4D')),
  result TEXT NOT NULL,
  published_at TEXT NOT NULL,
  PRIMARY KEY(day, market)
);
CREATE INDEX IF NOT EXISTS results_published_at ON results(published_at DESC);

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS login_rate (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  started INTEGER NOT NULL
);

INSERT OR IGNORE INTO app_config(key,value) VALUES
 ('announcement','Free-play demo points only. ငွေမဟုတ်ပါ၊ ငွေပြန်လဲ၍ မရပါ။'),
 ('maintenance','0'),
 ('min_app_version','1'),
 ('result_retention_days','30');
