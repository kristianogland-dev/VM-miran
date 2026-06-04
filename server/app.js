require('dotenv').config();
const express = require('express');
const cors = require('cors');
const supabase = require('./db');
const { calcMatchPoints, calcFinalBonus } = require('./scoring');

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'vm2026admin';

function requireAdmin(req, res, next) {
  if (req.headers['x-admin-password'] !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Uautorisert' });
  }
  next();
}

// ─── Players ──────────────────────────────────────────────────────────────────
app.get('/api/players', async (req, res) => {
  const { data: players, error } = await supabase
    .from('players')
    .select('*, scores(points_earned)')
    .order('name');
  if (error) return res.status(500).json({ error: error.message });

  const withPoints = players.map((p) => ({
    ...p,
    total_points: (p.scores || []).reduce((s, r) => s + (r.points_earned || 0), 0),
    scores: undefined,
  }));
  withPoints.sort((a, b) => b.total_points - a.total_points);
  res.json(withPoints);
});

app.post('/api/players', async (req, res) => {
  const { name, age, favorite_team, is_child, paid_entry } = req.body;
  if (!name || age == null) return res.status(400).json({ error: 'Navn og alder er påkrevd' });

  const { data, error } = await supabase
    .from('players')
    .insert({ name: name.trim(), age, favorite_team: favorite_team || '', is_child: !!is_child, paid_entry: !!paid_entry })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Navn allerede i bruk' });
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

app.put('/api/players/:id', requireAdmin, async (req, res) => {
  const { name, age, favorite_team, is_child, paid_entry } = req.body;
  const { error } = await supabase
    .from('players')
    .update({ name, age, favorite_team, is_child: !!is_child, paid_entry: !!paid_entry })
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

app.delete('/api/players/:id', requireAdmin, async (req, res) => {
  const { error } = await supabase.from('players').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ─── Matches ──────────────────────────────────────────────────────────────────
app.get('/api/matches', async (req, res) => {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('match_order');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/matches/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: 'Kamp ikke funnet' });
  res.json(data);
});

app.put('/api/matches/:id/result', requireAdmin, async (req, res) => {
  const { home_score, away_score, status, home_team, away_team } = req.body;

  const updates = {};
  if (home_score != null) updates.home_score = home_score;
  if (away_score != null) updates.away_score = away_score;
  if (status) updates.status = status;
  if (home_team) updates.home_team = home_team;
  if (away_team) updates.away_team = away_team;
  if (status === 'finished' || status === 'live') updates.locked = true;

  const { error } = await supabase.from('matches').update(updates).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });

  if (status === 'finished' && home_score != null && away_score != null) {
    await recalculateMatchScores(req.params.id);
  }
  res.json({ ok: true });
});

// Lock matches past kickoff
async function lockPastMatches() {
  const now = new Date().toISOString();
  await supabase
    .from('matches')
    .update({ locked: true })
    .lte('kickoff_utc', now)
    .eq('locked', false);
}

// ─── Predictions ──────────────────────────────────────────────────────────────
app.get('/api/predictions/:playerId', async (req, res) => {
  const { data, error } = await supabase
    .from('predictions')
    .select('*, matches(home_team, away_team, round, group_label, kickoff_utc, status, locked)')
    .eq('player_id', req.params.playerId)
    .order('match_id');
  if (error) return res.status(500).json({ error: error.message });

  const flat = data.map((p) => ({ ...p, ...p.matches, matches: undefined }));
  res.json(flat);
});

app.get('/api/predictions/match/:matchId', async (req, res) => {
  const { data: match } = await supabase
    .from('matches')
    .select('locked')
    .eq('id', req.params.matchId)
    .single();

  if (!match?.locked) return res.json([]);

  const { data, error } = await supabase
    .from('predictions')
    .select('*, players(name)')
    .eq('match_id', req.params.matchId);
  if (error) return res.status(500).json({ error: error.message });

  res.json(data.map((p) => ({ ...p, player_name: p.players?.name, players: undefined })));
});

app.post('/api/predictions', async (req, res) => {
  await lockPastMatches();
  const { player_id, match_id, predicted_home, predicted_away } = req.body;
  if (!player_id || !match_id || predicted_home == null || predicted_away == null) {
    return res.status(400).json({ error: 'Manglende data' });
  }

  const { data: match } = await supabase
    .from('matches')
    .select('locked')
    .eq('id', match_id)
    .single();

  if (!match) return res.status(404).json({ error: 'Kamp ikke funnet' });
  if (match.locked) return res.status(400).json({ error: 'Kampen er låst – tips ikke tillatt' });

  const { error } = await supabase
    .from('predictions')
    .upsert({ player_id, match_id, predicted_home, predicted_away, submitted_at: new Date().toISOString() },
             { onConflict: 'player_id,match_id' });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

app.post('/api/predictions/bulk', async (req, res) => {
  await lockPastMatches();
  const { player_id, predictions } = req.body;
  if (!player_id || !Array.isArray(predictions)) return res.status(400).json({ error: 'Manglende data' });

  const { data: allMatches } = await supabase.from('matches').select('id, locked');
  const lockedSet = new Set((allMatches || []).filter((m) => m.locked).map((m) => m.id));

  const toInsert = [];
  const errors = [];
  for (const p of predictions) {
    if (lockedSet.has(p.match_id)) { errors.push(`Kamp ${p.match_id} er låst`); continue; }
    toInsert.push({ player_id, match_id: p.match_id, predicted_home: p.predicted_home, predicted_away: p.predicted_away, submitted_at: new Date().toISOString() });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('predictions').upsert(toInsert, { onConflict: 'player_id,match_id' });
    if (error) return res.status(500).json({ error: error.message });
  }
  res.json({ ok: true, errors });
});

// ─── Final predictions ────────────────────────────────────────────────────────
app.get('/api/final-predictions/:playerId', async (req, res) => {
  const { data } = await supabase.from('final_predictions').select('*').eq('player_id', req.params.playerId).single();
  res.json(data || null);
});

app.post('/api/final-predictions', async (req, res) => {
  const { player_id, first_goalscorer, corners, throw_ins, yellow_cards, red_cards, offsides, free_kicks } = req.body;
  const { error } = await supabase.from('final_predictions').upsert(
    { player_id, first_goalscorer, corners, throw_ins, yellow_cards, red_cards, offsides, free_kicks, submitted_at: new Date().toISOString() },
    { onConflict: 'player_id' }
  );
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ─── Meta predictions ─────────────────────────────────────────────────────────
app.get('/api/meta-predictions/:playerId', async (req, res) => {
  const { data } = await supabase.from('meta_predictions').select('*').eq('player_id', req.params.playerId).single();
  res.json(data || null);
});

app.post('/api/meta-predictions', async (req, res) => {
  const { player_id, tournament_winner, top_scorer, best_player } = req.body;
  const { error } = await supabase.from('meta_predictions').upsert(
    { player_id, tournament_winner, top_scorer, best_player, submitted_at: new Date().toISOString() },
    { onConflict: 'player_id' }
  );
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ─── Scores / Leaderboard ─────────────────────────────────────────────────────
app.get('/api/scores', async (req, res) => {
  const { data: players, error } = await supabase
    .from('players')
    .select('id, name, favorite_team, is_child, scores(points_earned)')
    .order('name');
  if (error) return res.status(500).json({ error: error.message });

  const leaderboard = players.map((p) => ({
    id: p.id,
    name: p.name,
    favorite_team: p.favorite_team,
    is_child: p.is_child,
    total_points: (p.scores || []).reduce((s, r) => s + (r.points_earned || 0), 0),
  }));
  leaderboard.sort((a, b) => b.total_points - a.total_points);
  res.json(leaderboard);
});

app.get('/api/scores/player/:playerId', async (req, res) => {
  const { data, error } = await supabase
    .from('scores')
    .select('*, matches(home_team, away_team, round, home_score, away_score)')
    .eq('player_id', req.params.playerId)
    .order('match_id');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── Score recalculation ──────────────────────────────────────────────────────
async function recalculateMatchScores(matchId) {
  const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single();
  if (!match || match.home_score == null || match.away_score == null) return;

  const { data: predictions } = await supabase.from('predictions').select('*').eq('match_id', matchId);
  if (!predictions?.length) return;

  const upserts = [];
  for (const pred of predictions) {
    const actual = { home: match.home_score, away: match.away_score };
    const predicted = { home: pred.predicted_home, away: pred.predicted_away };
    const { points, breakdown } = calcMatchPoints(match.round, actual, predicted);

    let extraPoints = 0, extraBreakdown = {};
    if (match.round === 'final') {
      const { data: fp } = await supabase.from('final_predictions').select('*').eq('player_id', pred.player_id).single();
      if (fp) {
        const { points: ep, breakdown: eb } = calcFinalBonus(match, fp);
        extraPoints = ep; extraBreakdown = eb;
      }
    }

    upserts.push({
      player_id: pred.player_id,
      match_id: matchId,
      points_earned: points + extraPoints,
      breakdown: JSON.stringify({ ...breakdown, ...extraBreakdown }),
    });
  }

  await supabase.from('scores').upsert(upserts, { onConflict: 'player_id,match_id' });
}

app.post('/api/admin/recalculate', requireAdmin, async (req, res) => {
  const { data: finished } = await supabase
    .from('matches')
    .select('id')
    .eq('status', 'finished')
    .not('home_score', 'is', null);

  for (const m of (finished || [])) {
    await recalculateMatchScores(m.id);
  }
  res.json({ ok: true, recalculated: (finished || []).length });
});

app.get('/api/admin/match/:matchId/predictions', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('predictions')
    .select('*, players(name)')
    .eq('match_id', req.params.matchId)
    .order('player_id');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map((p) => ({ ...p, player_name: p.players?.name, players: undefined })));
});

app.post('/api/lock-check', async (req, res) => {
  await lockPastMatches();
  res.json({ ok: true });
});

module.exports = app;
