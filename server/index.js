require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const { calcMatchPoints, calcFinalBonus } = require('./scoring');

// Seed on first start
try {
  const count = db.prepare('SELECT COUNT(*) as c FROM matches').get();
  if (count.c === 0) {
    console.log('Seeding database...');
    require('./seed');
  }
} catch (e) {
  console.error('Seed error:', e.message);
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'vm2026admin';

// ─── Auth middleware ─────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const pw = req.headers['x-admin-password'];
  if (pw !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Uautorisert' });
  next();
}

// ─── Players ─────────────────────────────────────────────────────────────────
app.get('/api/players', (req, res) => {
  const players = db.prepare(`
    SELECT p.*,
      COALESCE(SUM(s.points_earned), 0) as total_points
    FROM players p
    LEFT JOIN scores s ON s.player_id = p.id
    GROUP BY p.id
    ORDER BY total_points DESC, p.name
  `).all();
  res.json(players);
});

app.post('/api/players', (req, res) => {
  const { name, age, favorite_team, is_child, paid_entry } = req.body;
  if (!name || age == null) return res.status(400).json({ error: 'Navn og alder er påkrevd' });
  try {
    const result = db.prepare(`
      INSERT INTO players (name, age, favorite_team, is_child, paid_entry)
      VALUES (?, ?, ?, ?, ?)
    `).run(name.trim(), age, favorite_team || '', is_child ? 1 : 0, paid_entry ? 1 : 0);
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid);
    res.json(player);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Navn allerede i bruk' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/players/:id', requireAdmin, (req, res) => {
  const { name, age, favorite_team, is_child, paid_entry } = req.body;
  db.prepare(`
    UPDATE players SET name=?, age=?, favorite_team=?, is_child=?, paid_entry=? WHERE id=?
  `).run(name, age, favorite_team, is_child ? 1 : 0, paid_entry ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/players/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── Matches ──────────────────────────────────────────────────────────────────
app.get('/api/matches', (req, res) => {
  const matches = db.prepare('SELECT * FROM matches ORDER BY match_order').all();
  res.json(matches);
});

app.get('/api/matches/:id', (req, res) => {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Kamp ikke funnet' });
  res.json(match);
});

app.put('/api/matches/:id/result', requireAdmin, (req, res) => {
  const { home_score, away_score, status, home_team, away_team } = req.body;
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Kamp ikke funnet' });

  const updates = [];
  const vals = [];

  if (home_score != null) { updates.push('home_score=?'); vals.push(home_score); }
  if (away_score != null) { updates.push('away_score=?'); vals.push(away_score); }
  if (status) { updates.push('status=?'); vals.push(status); }
  if (home_team) { updates.push('home_team=?'); vals.push(home_team); }
  if (away_team) { updates.push('away_team=?'); vals.push(away_team); }
  if (status === 'finished') { updates.push('locked=1'); }
  if (status === 'live') { updates.push('locked=1'); }

  if (updates.length === 0) return res.status(400).json({ error: 'Ingen data' });

  vals.push(req.params.id);
  db.prepare(`UPDATE matches SET ${updates.join(', ')} WHERE id=?`).run(...vals);

  // Auto-calculate scores when match is finished
  if (status === 'finished' && home_score != null && away_score != null) {
    recalculateMatchScores(req.params.id);
  }

  res.json({ ok: true });
});

// ─── Lock matches past kickoff ────────────────────────────────────────────────
function lockPastMatches() {
  const now = new Date().toISOString();
  db.prepare(`UPDATE matches SET locked=1 WHERE kickoff_utc <= ? AND locked=0`).run(now);
}

// ─── Predictions ──────────────────────────────────────────────────────────────
app.get('/api/predictions/:playerId', (req, res) => {
  const preds = db.prepare(`
    SELECT p.*, m.home_team, m.away_team, m.round, m.group_label, m.kickoff_utc, m.status, m.locked
    FROM predictions p
    JOIN matches m ON m.id = p.match_id
    WHERE p.player_id = ?
    ORDER BY m.match_order
  `).all(req.params.playerId);
  res.json(preds);
});

app.get('/api/predictions/match/:matchId', (req, res) => {
  const { matchId } = req.params;
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  // Only reveal predictions after kickoff
  if (!match || !match.locked) {
    return res.json([]);
  }
  const preds = db.prepare(`
    SELECT pr.*, pl.name as player_name
    FROM predictions pr
    JOIN players pl ON pl.id = pr.player_id
    WHERE pr.match_id = ?
  `).all(matchId);
  res.json(preds);
});

app.post('/api/predictions', (req, res) => {
  lockPastMatches();
  const { player_id, match_id, predicted_home, predicted_away } = req.body;
  if (!player_id || !match_id || predicted_home == null || predicted_away == null) {
    return res.status(400).json({ error: 'Manglende data' });
  }

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(match_id);
  if (!match) return res.status(404).json({ error: 'Kamp ikke funnet' });
  if (match.locked) return res.status(400).json({ error: 'Kampen er låst – tips ikke tillatt' });

  try {
    db.prepare(`
      INSERT INTO predictions (player_id, match_id, predicted_home, predicted_away)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(player_id, match_id) DO UPDATE SET
        predicted_home=excluded.predicted_home,
        predicted_away=excluded.predicted_away,
        submitted_at=datetime('now')
    `).run(player_id, match_id, predicted_home, predicted_away);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Bulk predictions
app.post('/api/predictions/bulk', (req, res) => {
  lockPastMatches();
  const { player_id, predictions } = req.body;
  if (!player_id || !Array.isArray(predictions)) {
    return res.status(400).json({ error: 'Manglende data' });
  }

  const errors = [];
  const upsert = db.prepare(`
    INSERT INTO predictions (player_id, match_id, predicted_home, predicted_away)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(player_id, match_id) DO UPDATE SET
      predicted_home=excluded.predicted_home,
      predicted_away=excluded.predicted_away,
      submitted_at=datetime('now')
  `);

  const insert = db.transaction(() => {
    for (const p of predictions) {
      const match = db.prepare('SELECT locked FROM matches WHERE id = ?').get(p.match_id);
      if (!match || match.locked) {
        errors.push(`Kamp ${p.match_id} er låst`);
        continue;
      }
      upsert.run(player_id, p.match_id, p.predicted_home, p.predicted_away);
    }
  });
  insert();

  res.json({ ok: true, errors });
});

// ─── Final predictions ────────────────────────────────────────────────────────
app.get('/api/final-predictions/:playerId', (req, res) => {
  const fp = db.prepare('SELECT * FROM final_predictions WHERE player_id = ?').get(req.params.playerId);
  res.json(fp || null);
});

app.post('/api/final-predictions', (req, res) => {
  const { player_id, first_goalscorer, corners, throw_ins, yellow_cards, red_cards, offsides, free_kicks } = req.body;
  db.prepare(`
    INSERT INTO final_predictions (player_id, first_goalscorer, corners, throw_ins, yellow_cards, red_cards, offsides, free_kicks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(player_id) DO UPDATE SET
      first_goalscorer=excluded.first_goalscorer,
      corners=excluded.corners,
      throw_ins=excluded.throw_ins,
      yellow_cards=excluded.yellow_cards,
      red_cards=excluded.red_cards,
      offsides=excluded.offsides,
      free_kicks=excluded.free_kicks,
      submitted_at=datetime('now')
  `).run(player_id, first_goalscorer, corners, throw_ins, yellow_cards, red_cards, offsides, free_kicks);
  res.json({ ok: true });
});

// ─── Meta predictions ─────────────────────────────────────────────────────────
app.get('/api/meta-predictions/:playerId', (req, res) => {
  const mp = db.prepare('SELECT * FROM meta_predictions WHERE player_id = ?').get(req.params.playerId);
  res.json(mp || null);
});

app.post('/api/meta-predictions', (req, res) => {
  const { player_id, tournament_winner, top_scorer, best_player } = req.body;
  db.prepare(`
    INSERT INTO meta_predictions (player_id, tournament_winner, top_scorer, best_player)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(player_id) DO UPDATE SET
      tournament_winner=excluded.tournament_winner,
      top_scorer=excluded.top_scorer,
      best_player=excluded.best_player,
      submitted_at=datetime('now')
  `).run(player_id, tournament_winner, top_scorer, best_player);
  res.json({ ok: true });
});

// ─── Scores / Leaderboard ─────────────────────────────────────────────────────
app.get('/api/scores', (req, res) => {
  const leaderboard = db.prepare(`
    SELECT p.id, p.name, p.favorite_team, p.is_child,
      COALESCE(SUM(s.points_earned), 0) as total_points,
      COUNT(s.id) as scored_matches
    FROM players p
    LEFT JOIN scores s ON s.player_id = p.id
    GROUP BY p.id
    ORDER BY total_points DESC, p.name
  `).all();
  res.json(leaderboard);
});

app.get('/api/scores/player/:playerId', (req, res) => {
  const scores = db.prepare(`
    SELECT s.*, m.home_team, m.away_team, m.round, m.home_score, m.away_score
    FROM scores s
    JOIN matches m ON m.id = s.match_id
    WHERE s.player_id = ?
    ORDER BY m.match_order
  `).all(req.params.playerId);
  res.json(scores);
});

// ─── Score recalculation ──────────────────────────────────────────────────────
function recalculateMatchScores(matchId) {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match || match.home_score == null || match.away_score == null) return;

  const predictions = db.prepare('SELECT * FROM predictions WHERE match_id = ?').all(matchId);

  const upsert = db.prepare(`
    INSERT INTO scores (player_id, match_id, points_earned, breakdown)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(player_id, match_id) DO UPDATE SET
      points_earned=excluded.points_earned,
      breakdown=excluded.breakdown
  `);

  const recalc = db.transaction(() => {
    for (const pred of predictions) {
      const actual = { home: match.home_score, away: match.away_score };
      const predicted = { home: pred.predicted_home, away: pred.predicted_away };
      const { points, breakdown } = calcMatchPoints(match.round, actual, predicted);

      let extraPoints = 0;
      let extraBreakdown = {};

      // Final bonuses
      if (match.round === 'final') {
        const fp = db.prepare('SELECT * FROM final_predictions WHERE player_id = ?').get(pred.player_id);
        const finalStats = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
        if (fp && finalStats) {
          const { points: ep, breakdown: eb } = calcFinalBonus(finalStats, fp);
          extraPoints = ep;
          extraBreakdown = eb;
        }
      }

      upsert.run(
        pred.player_id,
        matchId,
        points + extraPoints,
        JSON.stringify({ ...breakdown, ...extraBreakdown })
      );
    }
  });
  recalc();
}

app.post('/api/admin/recalculate', requireAdmin, (req, res) => {
  const finished = db.prepare(`SELECT * FROM matches WHERE status = 'finished' AND home_score IS NOT NULL`).all();
  for (const m of finished) {
    recalculateMatchScores(m.id);
  }
  res.json({ ok: true, recalculated: finished.length });
});

// ─── Admin: get all predictions for a match ───────────────────────────────────
app.get('/api/admin/match/:matchId/predictions', requireAdmin, (req, res) => {
  const preds = db.prepare(`
    SELECT pr.*, pl.name as player_name
    FROM predictions pr
    JOIN players pl ON pl.id = pr.player_id
    WHERE pr.match_id = ?
    ORDER BY pl.name
  `).all(req.params.matchId);
  res.json(preds);
});

// ─── Lock check endpoint ──────────────────────────────────────────────────────
app.post('/api/lock-check', (req, res) => {
  lockPastMatches();
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`VM 2026 API running on http://localhost:${PORT}`);
});
