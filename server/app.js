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

// ─── Admin: seed matches ───────────────────────────────────────────────────────
app.post('/api/admin/seed', requireAdmin, async (req, res) => {
  const { count } = await supabase.from('matches').select('*', { count: 'exact', head: true });
  if (count > 0) return res.json({ ok: true, skipped: true, count });

  const GROUP_MATCHES = [
    { home_team: 'Mexico', away_team: 'Sør-Afrika', group_label: 'A', round: 'group', kickoff_utc: '2026-06-11T21:00:00Z', match_order: 1 },
    { home_team: 'Sør-Korea', away_team: 'Tsjekkia', group_label: 'A', round: 'group', kickoff_utc: '2026-06-12T00:00:00Z', match_order: 2 },
    { home_team: 'Tsjekkia', away_team: 'Sør-Afrika', group_label: 'A', round: 'group', kickoff_utc: '2026-06-18T21:00:00Z', match_order: 3 },
    { home_team: 'Mexico', away_team: 'Sør-Korea', group_label: 'A', round: 'group', kickoff_utc: '2026-06-19T00:00:00Z', match_order: 4 },
    { home_team: 'Tsjekkia', away_team: 'Mexico', group_label: 'A', round: 'group', kickoff_utc: '2026-06-26T21:00:00Z', match_order: 5 },
    { home_team: 'Sør-Afrika', away_team: 'Sør-Korea', group_label: 'A', round: 'group', kickoff_utc: '2026-06-26T21:00:00Z', match_order: 6 },
    { home_team: 'Canada', away_team: 'Bosnia-Hercegovina', group_label: 'B', round: 'group', kickoff_utc: '2026-06-12T18:00:00Z', match_order: 7 },
    { home_team: 'Qatar', away_team: 'Sveits', group_label: 'B', round: 'group', kickoff_utc: '2026-06-12T21:00:00Z', match_order: 8 },
    { home_team: 'Sveits', away_team: 'Bosnia-Hercegovina', group_label: 'B', round: 'group', kickoff_utc: '2026-06-19T18:00:00Z', match_order: 9 },
    { home_team: 'Canada', away_team: 'Qatar', group_label: 'B', round: 'group', kickoff_utc: '2026-06-19T21:00:00Z', match_order: 10 },
    { home_team: 'Sveits', away_team: 'Canada', group_label: 'B', round: 'group', kickoff_utc: '2026-06-27T00:00:00Z', match_order: 11 },
    { home_team: 'Bosnia-Hercegovina', away_team: 'Qatar', group_label: 'B', round: 'group', kickoff_utc: '2026-06-27T00:00:00Z', match_order: 12 },
    { home_team: 'Haiti', away_team: 'Skottland', group_label: 'C', round: 'group', kickoff_utc: '2026-06-13T18:00:00Z', match_order: 13 },
    { home_team: 'Brasil', away_team: 'Marokko', group_label: 'C', round: 'group', kickoff_utc: '2026-06-13T21:00:00Z', match_order: 14 },
    { home_team: 'Brasil', away_team: 'Haiti', group_label: 'C', round: 'group', kickoff_utc: '2026-06-20T18:00:00Z', match_order: 15 },
    { home_team: 'Skottland', away_team: 'Marokko', group_label: 'C', round: 'group', kickoff_utc: '2026-06-20T21:00:00Z', match_order: 16 },
    { home_team: 'Skottland', away_team: 'Brasil', group_label: 'C', round: 'group', kickoff_utc: '2026-06-27T21:00:00Z', match_order: 17 },
    { home_team: 'Marokko', away_team: 'Haiti', group_label: 'C', round: 'group', kickoff_utc: '2026-06-27T21:00:00Z', match_order: 18 },
    { home_team: 'USA', away_team: 'Paraguay', group_label: 'D', round: 'group', kickoff_utc: '2026-06-14T00:00:00Z', match_order: 19 },
    { home_team: 'Australia', away_team: 'Tyrkia', group_label: 'D', round: 'group', kickoff_utc: '2026-06-14T18:00:00Z', match_order: 20 },
    { home_team: 'Tyrkia', away_team: 'Paraguay', group_label: 'D', round: 'group', kickoff_utc: '2026-06-21T00:00:00Z', match_order: 21 },
    { home_team: 'USA', away_team: 'Australia', group_label: 'D', round: 'group', kickoff_utc: '2026-06-21T18:00:00Z', match_order: 22 },
    { home_team: 'Tyrkia', away_team: 'USA', group_label: 'D', round: 'group', kickoff_utc: '2026-06-28T21:00:00Z', match_order: 23 },
    { home_team: 'Paraguay', away_team: 'Australia', group_label: 'D', round: 'group', kickoff_utc: '2026-06-28T21:00:00Z', match_order: 24 },
    { home_team: 'Elfenbenskysten', away_team: 'Ecuador', group_label: 'E', round: 'group', kickoff_utc: '2026-06-14T21:00:00Z', match_order: 25 },
    { home_team: 'Tyskland', away_team: 'Curaçao', group_label: 'E', round: 'group', kickoff_utc: '2026-06-15T00:00:00Z', match_order: 26 },
    { home_team: 'Tyskland', away_team: 'Elfenbenskysten', group_label: 'E', round: 'group', kickoff_utc: '2026-06-21T21:00:00Z', match_order: 27 },
    { home_team: 'Ecuador', away_team: 'Curaçao', group_label: 'E', round: 'group', kickoff_utc: '2026-06-22T00:00:00Z', match_order: 28 },
    { home_team: 'Curaçao', away_team: 'Elfenbenskysten', group_label: 'E', round: 'group', kickoff_utc: '2026-06-29T00:00:00Z', match_order: 29 },
    { home_team: 'Ecuador', away_team: 'Tyskland', group_label: 'E', round: 'group', kickoff_utc: '2026-06-29T00:00:00Z', match_order: 30 },
    { home_team: 'Nederland', away_team: 'Japan', group_label: 'F', round: 'group', kickoff_utc: '2026-06-15T18:00:00Z', match_order: 31 },
    { home_team: 'Sverige', away_team: 'Tunisia', group_label: 'F', round: 'group', kickoff_utc: '2026-06-15T21:00:00Z', match_order: 32 },
    { home_team: 'Nederland', away_team: 'Sverige', group_label: 'F', round: 'group', kickoff_utc: '2026-06-22T18:00:00Z', match_order: 33 },
    { home_team: 'Tunisia', away_team: 'Japan', group_label: 'F', round: 'group', kickoff_utc: '2026-06-22T21:00:00Z', match_order: 34 },
    { home_team: 'Japan', away_team: 'Sverige', group_label: 'F', round: 'group', kickoff_utc: '2026-06-29T21:00:00Z', match_order: 35 },
    { home_team: 'Tunisia', away_team: 'Nederland', group_label: 'F', round: 'group', kickoff_utc: '2026-06-29T21:00:00Z', match_order: 36 },
    { home_team: 'Iran', away_team: 'New Zealand', group_label: 'G', round: 'group', kickoff_utc: '2026-06-16T00:00:00Z', match_order: 37 },
    { home_team: 'Belgia', away_team: 'Egypt', group_label: 'G', round: 'group', kickoff_utc: '2026-06-16T18:00:00Z', match_order: 38 },
    { home_team: 'Belgia', away_team: 'Iran', group_label: 'G', round: 'group', kickoff_utc: '2026-06-23T00:00:00Z', match_order: 39 },
    { home_team: 'New Zealand', away_team: 'Egypt', group_label: 'G', round: 'group', kickoff_utc: '2026-06-23T18:00:00Z', match_order: 40 },
    { home_team: 'Egypt', away_team: 'Iran', group_label: 'G', round: 'group', kickoff_utc: '2026-06-30T00:00:00Z', match_order: 41 },
    { home_team: 'New Zealand', away_team: 'Belgia', group_label: 'G', round: 'group', kickoff_utc: '2026-06-30T00:00:00Z', match_order: 42 },
    { home_team: 'Saudi-Arabia', away_team: 'Uruguay', group_label: 'H', round: 'group', kickoff_utc: '2026-06-16T21:00:00Z', match_order: 43 },
    { home_team: 'Spania', away_team: 'Kapp Verde', group_label: 'H', round: 'group', kickoff_utc: '2026-06-17T00:00:00Z', match_order: 44 },
    { home_team: 'Uruguay', away_team: 'Kapp Verde', group_label: 'H', round: 'group', kickoff_utc: '2026-06-23T21:00:00Z', match_order: 45 },
    { home_team: 'Spania', away_team: 'Saudi-Arabia', group_label: 'H', round: 'group', kickoff_utc: '2026-06-24T00:00:00Z', match_order: 46 },
    { home_team: 'Kapp Verde', away_team: 'Saudi-Arabia', group_label: 'H', round: 'group', kickoff_utc: '2026-06-30T21:00:00Z', match_order: 47 },
    { home_team: 'Uruguay', away_team: 'Spania', group_label: 'H', round: 'group', kickoff_utc: '2026-06-30T21:00:00Z', match_order: 48 },
    { home_team: 'Frankrike', away_team: 'Senegal', group_label: 'I', round: 'group', kickoff_utc: '2026-06-17T18:00:00Z', match_order: 49 },
    { home_team: 'Irak', away_team: 'Norge', group_label: 'I', round: 'group', kickoff_utc: '2026-06-17T21:00:00Z', match_order: 50 },
    { home_team: 'Norge', away_team: 'Senegal', group_label: 'I', round: 'group', kickoff_utc: '2026-06-24T18:00:00Z', match_order: 51 },
    { home_team: 'Frankrike', away_team: 'Irak', group_label: 'I', round: 'group', kickoff_utc: '2026-06-24T21:00:00Z', match_order: 52 },
    { home_team: 'Norge', away_team: 'Frankrike', group_label: 'I', round: 'group', kickoff_utc: '2026-07-01T00:00:00Z', match_order: 53 },
    { home_team: 'Senegal', away_team: 'Irak', group_label: 'I', round: 'group', kickoff_utc: '2026-07-01T00:00:00Z', match_order: 54 },
    { home_team: 'Argentina', away_team: 'Algerie', group_label: 'J', round: 'group', kickoff_utc: '2026-06-18T00:00:00Z', match_order: 55 },
    { home_team: 'Østerrike', away_team: 'Jordan', group_label: 'J', round: 'group', kickoff_utc: '2026-06-18T18:00:00Z', match_order: 56 },
    { home_team: 'Argentina', away_team: 'Østerrike', group_label: 'J', round: 'group', kickoff_utc: '2026-06-25T00:00:00Z', match_order: 57 },
    { home_team: 'Jordan', away_team: 'Algerie', group_label: 'J', round: 'group', kickoff_utc: '2026-06-25T18:00:00Z', match_order: 58 },
    { home_team: 'Algerie', away_team: 'Østerrike', group_label: 'J', round: 'group', kickoff_utc: '2026-07-01T21:00:00Z', match_order: 59 },
    { home_team: 'Jordan', away_team: 'Argentina', group_label: 'J', round: 'group', kickoff_utc: '2026-07-01T21:00:00Z', match_order: 60 },
    { home_team: 'Portugal', away_team: 'DR Kongo', group_label: 'K', round: 'group', kickoff_utc: '2026-06-18T21:00:00Z', match_order: 61 },
    { home_team: 'Usbekistan', away_team: 'Colombia', group_label: 'K', round: 'group', kickoff_utc: '2026-06-19T18:00:00Z', match_order: 62 },
    { home_team: 'Portugal', away_team: 'Usbekistan', group_label: 'K', round: 'group', kickoff_utc: '2026-06-25T21:00:00Z', match_order: 63 },
    { home_team: 'Colombia', away_team: 'DR Kongo', group_label: 'K', round: 'group', kickoff_utc: '2026-06-26T00:00:00Z', match_order: 64 },
    { home_team: 'Colombia', away_team: 'Portugal', group_label: 'K', round: 'group', kickoff_utc: '2026-07-02T00:00:00Z', match_order: 65 },
    { home_team: 'DR Kongo', away_team: 'Usbekistan', group_label: 'K', round: 'group', kickoff_utc: '2026-07-02T00:00:00Z', match_order: 66 },
    { home_team: 'Ghana', away_team: 'Panama', group_label: 'L', round: 'group', kickoff_utc: '2026-06-19T21:00:00Z', match_order: 67 },
    { home_team: 'England', away_team: 'Kroatia', group_label: 'L', round: 'group', kickoff_utc: '2026-06-20T00:00:00Z', match_order: 68 },
    { home_team: 'England', away_team: 'Ghana', group_label: 'L', round: 'group', kickoff_utc: '2026-06-26T18:00:00Z', match_order: 69 },
    { home_team: 'Panama', away_team: 'Kroatia', group_label: 'L', round: 'group', kickoff_utc: '2026-06-26T21:00:00Z', match_order: 70 },
    { home_team: 'Panama', away_team: 'England', group_label: 'L', round: 'group', kickoff_utc: '2026-07-02T21:00:00Z', match_order: 71 },
    { home_team: 'Kroatia', away_team: 'Ghana', group_label: 'L', round: 'group', kickoff_utc: '2026-07-02T21:00:00Z', match_order: 72 },
    { home_team: 'Toer gruppe A', away_team: 'Toer gruppe B', group_label: null, round: 'r32', kickoff_utc: '2026-07-04T18:00:00Z', match_order: 73 },
    { home_team: 'Vinner gruppe E', away_team: '3. plass A/B/C/D/F', group_label: null, round: 'r32', kickoff_utc: '2026-07-04T21:00:00Z', match_order: 74 },
    { home_team: 'Vinner gruppe F', away_team: 'Toer gruppe C', group_label: null, round: 'r32', kickoff_utc: '2026-07-05T18:00:00Z', match_order: 75 },
    { home_team: 'Vinner gruppe C', away_team: 'Toer gruppe F', group_label: null, round: 'r32', kickoff_utc: '2026-07-05T21:00:00Z', match_order: 76 },
    { home_team: 'Vinner gruppe I', away_team: '3. plass C/D/F/G/H', group_label: null, round: 'r32', kickoff_utc: '2026-07-05T21:00:00Z', match_order: 77 },
    { home_team: 'Toer gruppe E', away_team: 'Toer gruppe I', group_label: null, round: 'r32', kickoff_utc: '2026-07-06T00:00:00Z', match_order: 78 },
    { home_team: 'Vinner gruppe A', away_team: '3. plass C/E/F/H/I', group_label: null, round: 'r32', kickoff_utc: '2026-07-06T18:00:00Z', match_order: 79 },
    { home_team: 'Vinner gruppe L', away_team: '3. plass E/H/I/J/K', group_label: null, round: 'r32', kickoff_utc: '2026-07-06T21:00:00Z', match_order: 80 },
    { home_team: 'Vinner gruppe D', away_team: '3. plass B/E/F/I/J', group_label: null, round: 'r32', kickoff_utc: '2026-07-07T00:00:00Z', match_order: 81 },
    { home_team: 'Vinner gruppe G', away_team: '3. plass A/E/H/I/J', group_label: null, round: 'r32', kickoff_utc: '2026-07-07T18:00:00Z', match_order: 82 },
    { home_team: 'Toer gruppe K', away_team: 'Toer gruppe L', group_label: null, round: 'r32', kickoff_utc: '2026-07-07T21:00:00Z', match_order: 83 },
    { home_team: 'Vinner gruppe H', away_team: 'Toer gruppe J', group_label: null, round: 'r32', kickoff_utc: '2026-07-08T00:00:00Z', match_order: 84 },
    { home_team: 'Vinner gruppe B', away_team: '3. plass E/F/G/I/J', group_label: null, round: 'r32', kickoff_utc: '2026-07-08T18:00:00Z', match_order: 85 },
    { home_team: 'Vinner gruppe J', away_team: 'Toer gruppe H', group_label: null, round: 'r32', kickoff_utc: '2026-07-08T21:00:00Z', match_order: 86 },
    { home_team: 'Vinner gruppe K', away_team: '3. plass D/E/I/J/L', group_label: null, round: 'r32', kickoff_utc: '2026-07-09T00:00:00Z', match_order: 87 },
    { home_team: 'Toer gruppe D', away_team: 'Toer gruppe G', group_label: null, round: 'r32', kickoff_utc: '2026-07-09T18:00:00Z', match_order: 88 },
    { home_team: 'Vinner kamp 73', away_team: 'Vinner kamp 74', group_label: null, round: 'r16', kickoff_utc: '2026-07-09T21:00:00Z', match_order: 89 },
    { home_team: 'Vinner kamp 75', away_team: 'Vinner kamp 76', group_label: null, round: 'r16', kickoff_utc: '2026-07-10T00:00:00Z', match_order: 90 },
    { home_team: 'Vinner kamp 77', away_team: 'Vinner kamp 78', group_label: null, round: 'r16', kickoff_utc: '2026-07-10T18:00:00Z', match_order: 91 },
    { home_team: 'Vinner kamp 79', away_team: 'Vinner kamp 80', group_label: null, round: 'r16', kickoff_utc: '2026-07-10T21:00:00Z', match_order: 92 },
    { home_team: 'Vinner kamp 81', away_team: 'Vinner kamp 82', group_label: null, round: 'r16', kickoff_utc: '2026-07-11T00:00:00Z', match_order: 93 },
    { home_team: 'Vinner kamp 83', away_team: 'Vinner kamp 84', group_label: null, round: 'r16', kickoff_utc: '2026-07-11T18:00:00Z', match_order: 94 },
    { home_team: 'Vinner kamp 85', away_team: 'Vinner kamp 86', group_label: null, round: 'r16', kickoff_utc: '2026-07-12T00:00:00Z', match_order: 95 },
    { home_team: 'Vinner kamp 87', away_team: 'Vinner kamp 88', group_label: null, round: 'r16', kickoff_utc: '2026-07-12T18:00:00Z', match_order: 96 },
    { home_team: 'Vinner kamp 89', away_team: 'Vinner kamp 90', group_label: null, round: 'qf', kickoff_utc: '2026-07-15T18:00:00Z', match_order: 97 },
    { home_team: 'Vinner kamp 91', away_team: 'Vinner kamp 92', group_label: null, round: 'qf', kickoff_utc: '2026-07-15T21:00:00Z', match_order: 98 },
    { home_team: 'Vinner kamp 93', away_team: 'Vinner kamp 94', group_label: null, round: 'qf', kickoff_utc: '2026-07-18T18:00:00Z', match_order: 99 },
    { home_team: 'Vinner kamp 95', away_team: 'Vinner kamp 96', group_label: null, round: 'qf', kickoff_utc: '2026-07-18T21:00:00Z', match_order: 100 },
    { home_team: 'Vinner kamp 97', away_team: 'Vinner kamp 98', group_label: null, round: 'sf', kickoff_utc: '2026-07-22T21:00:00Z', match_order: 101 },
    { home_team: 'Vinner kamp 99', away_team: 'Vinner kamp 100', group_label: null, round: 'sf', kickoff_utc: '2026-07-23T21:00:00Z', match_order: 102 },
    { home_team: 'Taper kamp 101', away_team: 'Taper kamp 102', group_label: null, round: 'bronze', kickoff_utc: '2026-07-26T18:00:00Z', match_order: 103 },
    { home_team: 'Vinner kamp 101', away_team: 'Vinner kamp 102', group_label: null, round: 'final', kickoff_utc: '2026-07-27T21:00:00Z', match_order: 104 },
  ];

  const rows = GROUP_MATCHES.map((m) => ({ ...m, status: 'scheduled', locked: false }));
  const { error } = await supabase.from('matches').insert(rows);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, seeded: rows.length });
});

module.exports = app;
