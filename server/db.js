const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/vm2026.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    age INTEGER NOT NULL,
    favorite_team TEXT DEFAULT '',
    is_child INTEGER NOT NULL DEFAULT 0,
    paid_entry INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    group_label TEXT,
    round TEXT NOT NULL DEFAULT 'group',
    kickoff_utc TEXT NOT NULL,
    home_score INTEGER,
    away_score INTEGER,
    status TEXT NOT NULL DEFAULT 'scheduled',
    locked INTEGER NOT NULL DEFAULT 0,
    api_match_id TEXT,
    match_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id),
    match_id INTEGER NOT NULL REFERENCES matches(id),
    predicted_home INTEGER NOT NULL,
    predicted_away INTEGER NOT NULL,
    submitted_at TEXT DEFAULT (datetime('now')),
    UNIQUE(player_id, match_id)
  );

  CREATE TABLE IF NOT EXISTS final_predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) UNIQUE,
    first_goalscorer TEXT DEFAULT '',
    corners INTEGER,
    throw_ins INTEGER,
    yellow_cards INTEGER,
    red_cards INTEGER,
    offsides INTEGER,
    free_kicks INTEGER,
    submitted_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS meta_predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) UNIQUE,
    tournament_winner TEXT DEFAULT '',
    top_scorer TEXT DEFAULT '',
    best_player TEXT DEFAULT '',
    submitted_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id),
    match_id INTEGER NOT NULL REFERENCES matches(id),
    points_earned INTEGER NOT NULL DEFAULT 0,
    breakdown TEXT NOT NULL DEFAULT '{}',
    UNIQUE(player_id, match_id)
  );
`);

module.exports = db;
