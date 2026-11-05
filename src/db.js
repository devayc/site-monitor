const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DATABASE_PATH || './monitor.db';
let db = null;
let SQL = null;

async function initDB() {
  if (db) return db;

  SQL = await initSqlJs();

  let fileBuffer = null;
  if (fs.existsSync(dbPath)) {
    fileBuffer = fs.readFileSync(dbPath);
  }

  db = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();

  // Создаём таблицу если её нет
  db.run(`
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

  saveDB();
  return db;
}

function saveDB() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// Обёртка для удобства (синхронный интерфейс после инициализации)
function prepare(sql) {
  return {
    all(...params) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    },
    get(...params) {
      const rows = this.all(...params);
      return rows[0] || null;
    },
    run(...params) {
      db.run(sql, params);
      saveDB();
      return { changes: db.getRowsModified(), lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] };
    }
  };
}

module.exports = { initDB, prepare, saveDB };
