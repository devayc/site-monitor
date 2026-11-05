const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DATABASE_PATH || './monitor.db';
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// Создаём таблицу
db.exec(`
  CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    is_active INTEGER DEFAULT 1,
    expected_status INTEGER DEFAULT 200,
    check_interval INTEGER DEFAULT 60,
    last_status INTEGER,
    last_response_time REAL,
    last_checked TEXT,
    last_error TEXT,
    notify_emails TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

module.exports = db;
