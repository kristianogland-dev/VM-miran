const db = require('./db');

// Check if already seeded
const existing = db.prepare('SELECT COUNT(*) as count FROM matches').get();
if (existing.count > 0) {
  console.log('Database already seeded, skipping.');
  process.exit(0);
}

// World Cup 2026 group stage match schedule (approximate UTC kickoff times)
// Tournament starts June 11, 2026. 12 groups, 3 matchdays.
// Matchday 1: June 11–17 | Matchday 2: June 18–24 | Matchday 3: June 25 – July 2

const GROUP_MATCHES = [
  // Gruppe A
  { home: 'Mexico', away: 'Sør-Afrika', group: 'A', kickoff: '2026-06-11T21:00:00Z', order: 1 },
  { home: 'Sør-Korea', away: 'Tsjekkia', group: 'A', kickoff: '2026-06-12T00:00:00Z', order: 2 },
  { home: 'Tsjekkia', away: 'Sør-Afrika', group: 'A', kickoff: '2026-06-18T21:00:00Z', order: 3 },
  { home: 'Mexico', away: 'Sør-Korea', group: 'A', kickoff: '2026-06-19T00:00:00Z', order: 4 },
  { home: 'Tsjekkia', away: 'Mexico', group: 'A', kickoff: '2026-06-26T21:00:00Z', order: 5 },
  { home: 'Sør-Afrika', away: 'Sør-Korea', group: 'A', kickoff: '2026-06-26T21:00:00Z', order: 6 },

  // Gruppe B
  { home: 'Canada', away: 'Bosnia-Hercegovina', group: 'B', kickoff: '2026-06-12T18:00:00Z', order: 7 },
  { home: 'Qatar', away: 'Sveits', group: 'B', kickoff: '2026-06-12T21:00:00Z', order: 8 },
  { home: 'Sveits', away: 'Bosnia-Hercegovina', group: 'B', kickoff: '2026-06-19T18:00:00Z', order: 9 },
  { home: 'Canada', away: 'Qatar', group: 'B', kickoff: '2026-06-19T21:00:00Z', order: 10 },
  { home: 'Sveits', away: 'Canada', group: 'B', kickoff: '2026-06-27T00:00:00Z', order: 11 },
  { home: 'Bosnia-Hercegovina', away: 'Qatar', group: 'B', kickoff: '2026-06-27T00:00:00Z', order: 12 },

  // Gruppe C
  { home: 'Haiti', away: 'Skottland', group: 'C', kickoff: '2026-06-13T18:00:00Z', order: 13 },
  { home: 'Brasil', away: 'Marokko', group: 'C', kickoff: '2026-06-13T21:00:00Z', order: 14 },
  { home: 'Brasil', away: 'Haiti', group: 'C', kickoff: '2026-06-20T18:00:00Z', order: 15 },
  { home: 'Skottland', away: 'Marokko', group: 'C', kickoff: '2026-06-20T21:00:00Z', order: 16 },
  { home: 'Skottland', away: 'Brasil', group: 'C', kickoff: '2026-06-27T21:00:00Z', order: 17 },
  { home: 'Marokko', away: 'Haiti', group: 'C', kickoff: '2026-06-27T21:00:00Z', order: 18 },

  // Gruppe D
  { home: 'USA', away: 'Paraguay', group: 'D', kickoff: '2026-06-14T00:00:00Z', order: 19 },
  { home: 'Australia', away: 'Tyrkia', group: 'D', kickoff: '2026-06-14T18:00:00Z', order: 20 },
  { home: 'Tyrkia', away: 'Paraguay', group: 'D', kickoff: '2026-06-21T00:00:00Z', order: 21 },
  { home: 'USA', away: 'Australia', group: 'D', kickoff: '2026-06-21T18:00:00Z', order: 22 },
  { home: 'Tyrkia', away: 'USA', group: 'D', kickoff: '2026-06-28T21:00:00Z', order: 23 },
  { home: 'Paraguay', away: 'Australia', group: 'D', kickoff: '2026-06-28T21:00:00Z', order: 24 },

  // Gruppe E
  { home: 'Elfenbenskysten', away: 'Ecuador', group: 'E', kickoff: '2026-06-14T21:00:00Z', order: 25 },
  { home: 'Tyskland', away: 'Curaçao', group: 'E', kickoff: '2026-06-15T00:00:00Z', order: 26 },
  { home: 'Tyskland', away: 'Elfenbenskysten', group: 'E', kickoff: '2026-06-21T21:00:00Z', order: 27 },
  { home: 'Ecuador', away: 'Curaçao', group: 'E', kickoff: '2026-06-22T00:00:00Z', order: 28 },
  { home: 'Curaçao', away: 'Elfenbenskysten', group: 'E', kickoff: '2026-06-29T00:00:00Z', order: 29 },
  { home: 'Ecuador', away: 'Tyskland', group: 'E', kickoff: '2026-06-29T00:00:00Z', order: 30 },

  // Gruppe F
  { home: 'Nederland', away: 'Japan', group: 'F', kickoff: '2026-06-15T18:00:00Z', order: 31 },
  { home: 'Sverige', away: 'Tunisia', group: 'F', kickoff: '2026-06-15T21:00:00Z', order: 32 },
  { home: 'Nederland', away: 'Sverige', group: 'F', kickoff: '2026-06-22T18:00:00Z', order: 33 },
  { home: 'Tunisia', away: 'Japan', group: 'F', kickoff: '2026-06-22T21:00:00Z', order: 34 },
  { home: 'Japan', away: 'Sverige', group: 'F', kickoff: '2026-06-29T21:00:00Z', order: 35 },
  { home: 'Tunisia', away: 'Nederland', group: 'F', kickoff: '2026-06-29T21:00:00Z', order: 36 },

  // Gruppe G
  { home: 'Iran', away: 'New Zealand', group: 'G', kickoff: '2026-06-16T00:00:00Z', order: 37 },
  { home: 'Belgia', away: 'Egypt', group: 'G', kickoff: '2026-06-16T18:00:00Z', order: 38 },
  { home: 'Belgia', away: 'Iran', group: 'G', kickoff: '2026-06-23T00:00:00Z', order: 39 },
  { home: 'New Zealand', away: 'Egypt', group: 'G', kickoff: '2026-06-23T18:00:00Z', order: 40 },
  { home: 'Egypt', away: 'Iran', group: 'G', kickoff: '2026-06-30T00:00:00Z', order: 41 },
  { home: 'New Zealand', away: 'Belgia', group: 'G', kickoff: '2026-06-30T00:00:00Z', order: 42 },

  // Gruppe H
  { home: 'Saudi-Arabia', away: 'Uruguay', group: 'H', kickoff: '2026-06-16T21:00:00Z', order: 43 },
  { home: 'Spania', away: 'Kapp Verde', group: 'H', kickoff: '2026-06-17T00:00:00Z', order: 44 },
  { home: 'Uruguay', away: 'Kapp Verde', group: 'H', kickoff: '2026-06-23T21:00:00Z', order: 45 },
  { home: 'Spania', away: 'Saudi-Arabia', group: 'H', kickoff: '2026-06-24T00:00:00Z', order: 46 },
  { home: 'Kapp Verde', away: 'Saudi-Arabia', group: 'H', kickoff: '2026-06-30T21:00:00Z', order: 47 },
  { home: 'Uruguay', away: 'Spania', group: 'H', kickoff: '2026-06-30T21:00:00Z', order: 48 },

  // Gruppe I
  { home: 'Frankrike', away: 'Senegal', group: 'I', kickoff: '2026-06-17T18:00:00Z', order: 49 },
  { home: 'Irak', away: 'Norge', group: 'I', kickoff: '2026-06-17T21:00:00Z', order: 50 },
  { home: 'Norge', away: 'Senegal', group: 'I', kickoff: '2026-06-24T18:00:00Z', order: 51 },
  { home: 'Frankrike', away: 'Irak', group: 'I', kickoff: '2026-06-24T21:00:00Z', order: 52 },
  { home: 'Norge', away: 'Frankrike', group: 'I', kickoff: '2026-07-01T00:00:00Z', order: 53 },
  { home: 'Senegal', away: 'Irak', group: 'I', kickoff: '2026-07-01T00:00:00Z', order: 54 },

  // Gruppe J
  { home: 'Argentina', away: 'Algerie', group: 'J', kickoff: '2026-06-18T00:00:00Z', order: 55 },
  { home: 'Østerrike', away: 'Jordan', group: 'J', kickoff: '2026-06-18T18:00:00Z', order: 56 },
  { home: 'Argentina', away: 'Østerrike', group: 'J', kickoff: '2026-06-25T00:00:00Z', order: 57 },
  { home: 'Jordan', away: 'Algerie', group: 'J', kickoff: '2026-06-25T18:00:00Z', order: 58 },
  { home: 'Algerie', away: 'Østerrike', group: 'J', kickoff: '2026-07-01T21:00:00Z', order: 59 },
  { home: 'Jordan', away: 'Argentina', group: 'J', kickoff: '2026-07-01T21:00:00Z', order: 60 },

  // Gruppe K
  { home: 'Portugal', away: 'DR Kongo', group: 'K', kickoff: '2026-06-18T21:00:00Z', order: 61 },
  { home: 'Usbekistan', away: 'Colombia', group: 'K', kickoff: '2026-06-19T18:00:00Z', order: 62 },
  { home: 'Portugal', away: 'Usbekistan', group: 'K', kickoff: '2026-06-25T21:00:00Z', order: 63 },
  { home: 'Colombia', away: 'DR Kongo', group: 'K', kickoff: '2026-06-26T00:00:00Z', order: 64 },
  { home: 'Colombia', away: 'Portugal', group: 'K', kickoff: '2026-07-02T00:00:00Z', order: 65 },
  { home: 'DR Kongo', away: 'Usbekistan', group: 'K', kickoff: '2026-07-02T00:00:00Z', order: 66 },

  // Gruppe L
  { home: 'Ghana', away: 'Panama', group: 'L', kickoff: '2026-06-19T21:00:00Z', order: 67 },
  { home: 'England', away: 'Kroatia', group: 'L', kickoff: '2026-06-20T00:00:00Z', order: 68 },
  { home: 'England', away: 'Ghana', group: 'L', kickoff: '2026-06-26T18:00:00Z', order: 69 },
  { home: 'Panama', away: 'Kroatia', group: 'L', kickoff: '2026-06-26T21:00:00Z', order: 70 },
  { home: 'Panama', away: 'England', group: 'L', kickoff: '2026-07-02T21:00:00Z', order: 71 },
  { home: 'Kroatia', away: 'Ghana', group: 'L', kickoff: '2026-07-02T21:00:00Z', order: 72 },
];

// Knockout placeholders (teams TBD after group stage)
const KNOCKOUT_MATCHES = [
  // 16-delsfinale (Round of 32) - order 73-88
  { home: 'Toer gruppe A', away: 'Toer gruppe B', round: 'r32', kickoff: '2026-07-04T18:00:00Z', order: 73 },
  { home: 'Vinner gruppe E', away: '3. plass A/B/C/D/F', round: 'r32', kickoff: '2026-07-04T21:00:00Z', order: 74 },
  { home: 'Vinner gruppe F', away: 'Toer gruppe C', round: 'r32', kickoff: '2026-07-05T18:00:00Z', order: 75 },
  { home: 'Vinner gruppe C', away: 'Toer gruppe F', round: 'r32', kickoff: '2026-07-05T21:00:00Z', order: 76 },
  { home: 'Vinner gruppe I', away: '3. plass C/D/F/G/H', round: 'r32', kickoff: '2026-07-05T21:00:00Z', order: 77 },
  { home: 'Toer gruppe E', away: 'Toer gruppe I', round: 'r32', kickoff: '2026-07-06T00:00:00Z', order: 78 },
  { home: 'Vinner gruppe A', away: '3. plass C/E/F/H/I', round: 'r32', kickoff: '2026-07-06T18:00:00Z', order: 79 },
  { home: 'Vinner gruppe L', away: '3. plass E/H/I/J/K', round: 'r32', kickoff: '2026-07-06T21:00:00Z', order: 80 },
  { home: 'Vinner gruppe D', away: '3. plass B/E/F/I/J', round: 'r32', kickoff: '2026-07-07T00:00:00Z', order: 81 },
  { home: 'Vinner gruppe G', away: '3. plass A/E/H/I/J', round: 'r32', kickoff: '2026-07-07T18:00:00Z', order: 82 },
  { home: 'Toer gruppe K', away: 'Toer gruppe L', round: 'r32', kickoff: '2026-07-07T21:00:00Z', order: 83 },
  { home: 'Vinner gruppe H', away: 'Toer gruppe J', round: 'r32', kickoff: '2026-07-08T00:00:00Z', order: 84 },
  { home: 'Vinner gruppe B', away: '3. plass E/F/G/I/J', round: 'r32', kickoff: '2026-07-08T18:00:00Z', order: 85 },
  { home: 'Vinner gruppe J', away: 'Toer gruppe H', round: 'r32', kickoff: '2026-07-08T21:00:00Z', order: 86 },
  { home: 'Vinner gruppe K', away: '3. plass D/E/I/J/L', round: 'r32', kickoff: '2026-07-09T00:00:00Z', order: 87 },
  { home: 'Toer gruppe D', away: 'Toer gruppe G', round: 'r32', kickoff: '2026-07-09T18:00:00Z', order: 88 },

  // 8-delsfinale (Round of 16) - order 89-96
  { home: 'Vinner kamp 73', away: 'Vinner kamp 74', round: 'r16', kickoff: '2026-07-09T21:00:00Z', order: 89 },
  { home: 'Vinner kamp 75', away: 'Vinner kamp 76', round: 'r16', kickoff: '2026-07-10T00:00:00Z', order: 90 },
  { home: 'Vinner kamp 77', away: 'Vinner kamp 78', round: 'r16', kickoff: '2026-07-10T18:00:00Z', order: 91 },
  { home: 'Vinner kamp 79', away: 'Vinner kamp 80', round: 'r16', kickoff: '2026-07-10T21:00:00Z', order: 92 },
  { home: 'Vinner kamp 81', away: 'Vinner kamp 82', round: 'r16', kickoff: '2026-07-11T00:00:00Z', order: 93 },
  { home: 'Vinner kamp 83', away: 'Vinner kamp 84', round: 'r16', kickoff: '2026-07-11T18:00:00Z', order: 94 },
  { home: 'Vinner kamp 85', away: 'Vinner kamp 86', round: 'r16', kickoff: '2026-07-12T00:00:00Z', order: 95 },
  { home: 'Vinner kamp 87', away: 'Vinner kamp 88', round: 'r16', kickoff: '2026-07-12T18:00:00Z', order: 96 },

  // Kvartfinale - order 97-100
  { home: 'Vinner kamp 89', away: 'Vinner kamp 90', round: 'qf', kickoff: '2026-07-15T18:00:00Z', order: 97 },
  { home: 'Vinner kamp 91', away: 'Vinner kamp 92', round: 'qf', kickoff: '2026-07-15T21:00:00Z', order: 98 },
  { home: 'Vinner kamp 93', away: 'Vinner kamp 94', round: 'qf', kickoff: '2026-07-18T18:00:00Z', order: 99 },
  { home: 'Vinner kamp 95', away: 'Vinner kamp 96', round: 'qf', kickoff: '2026-07-18T21:00:00Z', order: 100 },

  // Semifinale - order 101-102
  { home: 'Vinner kamp 97', away: 'Vinner kamp 98', round: 'sf', kickoff: '2026-07-22T21:00:00Z', order: 101 },
  { home: 'Vinner kamp 99', away: 'Vinner kamp 100', round: 'sf', kickoff: '2026-07-23T21:00:00Z', order: 102 },

  // Bronsefinale - order 103
  { home: 'Taper kamp 101', away: 'Taper kamp 102', round: 'bronze', kickoff: '2026-07-26T18:00:00Z', order: 103 },

  // Finale - order 104
  { home: 'Vinner kamp 101', away: 'Vinner kamp 102', round: 'final', kickoff: '2026-07-27T21:00:00Z', order: 104 },
];

const insertMatch = db.prepare(`
  INSERT INTO matches (home_team, away_team, group_label, round, kickoff_utc, status, locked, match_order)
  VALUES (@home, @away, @group, @round, @kickoff, 'scheduled', 0, @order)
`);

const insertAll = db.transaction(() => {
  for (const m of GROUP_MATCHES) {
    insertMatch.run({ home: m.home, away: m.away, group: m.group, round: 'group', kickoff: m.kickoff, order: m.order });
  }
  for (const m of KNOCKOUT_MATCHES) {
    insertMatch.run({ home: m.home, away: m.away, group: null, round: m.round, kickoff: m.kickoff, order: m.order });
  }
});

insertAll();
console.log(`Seeded ${GROUP_MATCHES.length + KNOCKOUT_MATCHES.length} matches.`);
