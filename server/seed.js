require('dotenv').config();
const supabase = require('./db');

async function seed() {
  const { count } = await supabase.from('matches').select('*', { count: 'exact', head: true });
  if (count > 0) {
    console.log(`Database already has ${count} matches. Skipping seed.`);
    return;
  }

  const GROUP_MATCHES = [
    // Gruppe A
    { home_team: 'Mexico', away_team: 'Sør-Afrika', group_label: 'A', round: 'group', kickoff_utc: '2026-06-11T21:00:00Z', match_order: 1 },
    { home_team: 'Sør-Korea', away_team: 'Tsjekkia', group_label: 'A', round: 'group', kickoff_utc: '2026-06-12T00:00:00Z', match_order: 2 },
    { home_team: 'Tsjekkia', away_team: 'Sør-Afrika', group_label: 'A', round: 'group', kickoff_utc: '2026-06-18T21:00:00Z', match_order: 3 },
    { home_team: 'Mexico', away_team: 'Sør-Korea', group_label: 'A', round: 'group', kickoff_utc: '2026-06-19T00:00:00Z', match_order: 4 },
    { home_team: 'Tsjekkia', away_team: 'Mexico', group_label: 'A', round: 'group', kickoff_utc: '2026-06-26T21:00:00Z', match_order: 5 },
    { home_team: 'Sør-Afrika', away_team: 'Sør-Korea', group_label: 'A', round: 'group', kickoff_utc: '2026-06-26T21:00:00Z', match_order: 6 },
    // Gruppe B
    { home_team: 'Canada', away_team: 'Bosnia-Hercegovina', group_label: 'B', round: 'group', kickoff_utc: '2026-06-12T18:00:00Z', match_order: 7 },
    { home_team: 'Qatar', away_team: 'Sveits', group_label: 'B', round: 'group', kickoff_utc: '2026-06-12T21:00:00Z', match_order: 8 },
    { home_team: 'Sveits', away_team: 'Bosnia-Hercegovina', group_label: 'B', round: 'group', kickoff_utc: '2026-06-19T18:00:00Z', match_order: 9 },
    { home_team: 'Canada', away_team: 'Qatar', group_label: 'B', round: 'group', kickoff_utc: '2026-06-19T21:00:00Z', match_order: 10 },
    { home_team: 'Sveits', away_team: 'Canada', group_label: 'B', round: 'group', kickoff_utc: '2026-06-27T00:00:00Z', match_order: 11 },
    { home_team: 'Bosnia-Hercegovina', away_team: 'Qatar', group_label: 'B', round: 'group', kickoff_utc: '2026-06-27T00:00:00Z', match_order: 12 },
    // Gruppe C
    { home_team: 'Haiti', away_team: 'Skottland', group_label: 'C', round: 'group', kickoff_utc: '2026-06-13T18:00:00Z', match_order: 13 },
    { home_team: 'Brasil', away_team: 'Marokko', group_label: 'C', round: 'group', kickoff_utc: '2026-06-13T21:00:00Z', match_order: 14 },
    { home_team: 'Brasil', away_team: 'Haiti', group_label: 'C', round: 'group', kickoff_utc: '2026-06-20T18:00:00Z', match_order: 15 },
    { home_team: 'Skottland', away_team: 'Marokko', group_label: 'C', round: 'group', kickoff_utc: '2026-06-20T21:00:00Z', match_order: 16 },
    { home_team: 'Skottland', away_team: 'Brasil', group_label: 'C', round: 'group', kickoff_utc: '2026-06-27T21:00:00Z', match_order: 17 },
    { home_team: 'Marokko', away_team: 'Haiti', group_label: 'C', round: 'group', kickoff_utc: '2026-06-27T21:00:00Z', match_order: 18 },
    // Gruppe D
    { home_team: 'USA', away_team: 'Paraguay', group_label: 'D', round: 'group', kickoff_utc: '2026-06-14T00:00:00Z', match_order: 19 },
    { home_team: 'Australia', away_team: 'Tyrkia', group_label: 'D', round: 'group', kickoff_utc: '2026-06-14T18:00:00Z', match_order: 20 },
    { home_team: 'Tyrkia', away_team: 'Paraguay', group_label: 'D', round: 'group', kickoff_utc: '2026-06-21T00:00:00Z', match_order: 21 },
    { home_team: 'USA', away_team: 'Australia', group_label: 'D', round: 'group', kickoff_utc: '2026-06-21T18:00:00Z', match_order: 22 },
    { home_team: 'Tyrkia', away_team: 'USA', group_label: 'D', round: 'group', kickoff_utc: '2026-06-28T21:00:00Z', match_order: 23 },
    { home_team: 'Paraguay', away_team: 'Australia', group_label: 'D', round: 'group', kickoff_utc: '2026-06-28T21:00:00Z', match_order: 24 },
    // Gruppe E
    { home_team: 'Elfenbenskysten', away_team: 'Ecuador', group_label: 'E', round: 'group', kickoff_utc: '2026-06-14T21:00:00Z', match_order: 25 },
    { home_team: 'Tyskland', away_team: 'Curaçao', group_label: 'E', round: 'group', kickoff_utc: '2026-06-15T00:00:00Z', match_order: 26 },
    { home_team: 'Tyskland', away_team: 'Elfenbenskysten', group_label: 'E', round: 'group', kickoff_utc: '2026-06-21T21:00:00Z', match_order: 27 },
    { home_team: 'Ecuador', away_team: 'Curaçao', group_label: 'E', round: 'group', kickoff_utc: '2026-06-22T00:00:00Z', match_order: 28 },
    { home_team: 'Curaçao', away_team: 'Elfenbenskysten', group_label: 'E', round: 'group', kickoff_utc: '2026-06-29T00:00:00Z', match_order: 29 },
    { home_team: 'Ecuador', away_team: 'Tyskland', group_label: 'E', round: 'group', kickoff_utc: '2026-06-29T00:00:00Z', match_order: 30 },
    // Gruppe F
    { home_team: 'Nederland', away_team: 'Japan', group_label: 'F', round: 'group', kickoff_utc: '2026-06-15T18:00:00Z', match_order: 31 },
    { home_team: 'Sverige', away_team: 'Tunisia', group_label: 'F', round: 'group', kickoff_utc: '2026-06-15T21:00:00Z', match_order: 32 },
    { home_team: 'Nederland', away_team: 'Sverige', group_label: 'F', round: 'group', kickoff_utc: '2026-06-22T18:00:00Z', match_order: 33 },
    { home_team: 'Tunisia', away_team: 'Japan', group_label: 'F', round: 'group', kickoff_utc: '2026-06-22T21:00:00Z', match_order: 34 },
    { home_team: 'Japan', away_team: 'Sverige', group_label: 'F', round: 'group', kickoff_utc: '2026-06-29T21:00:00Z', match_order: 35 },
    { home_team: 'Tunisia', away_team: 'Nederland', group_label: 'F', round: 'group', kickoff_utc: '2026-06-29T21:00:00Z', match_order: 36 },
    // Gruppe G
    { home_team: 'Iran', away_team: 'New Zealand', group_label: 'G', round: 'group', kickoff_utc: '2026-06-16T00:00:00Z', match_order: 37 },
    { home_team: 'Belgia', away_team: 'Egypt', group_label: 'G', round: 'group', kickoff_utc: '2026-06-16T18:00:00Z', match_order: 38 },
    { home_team: 'Belgia', away_team: 'Iran', group_label: 'G', round: 'group', kickoff_utc: '2026-06-23T00:00:00Z', match_order: 39 },
    { home_team: 'New Zealand', away_team: 'Egypt', group_label: 'G', round: 'group', kickoff_utc: '2026-06-23T18:00:00Z', match_order: 40 },
    { home_team: 'Egypt', away_team: 'Iran', group_label: 'G', round: 'group', kickoff_utc: '2026-06-30T00:00:00Z', match_order: 41 },
    { home_team: 'New Zealand', away_team: 'Belgia', group_label: 'G', round: 'group', kickoff_utc: '2026-06-30T00:00:00Z', match_order: 42 },
    // Gruppe H
    { home_team: 'Saudi-Arabia', away_team: 'Uruguay', group_label: 'H', round: 'group', kickoff_utc: '2026-06-16T21:00:00Z', match_order: 43 },
    { home_team: 'Spania', away_team: 'Kapp Verde', group_label: 'H', round: 'group', kickoff_utc: '2026-06-17T00:00:00Z', match_order: 44 },
    { home_team: 'Uruguay', away_team: 'Kapp Verde', group_label: 'H', round: 'group', kickoff_utc: '2026-06-23T21:00:00Z', match_order: 45 },
    { home_team: 'Spania', away_team: 'Saudi-Arabia', group_label: 'H', round: 'group', kickoff_utc: '2026-06-24T00:00:00Z', match_order: 46 },
    { home_team: 'Kapp Verde', away_team: 'Saudi-Arabia', group_label: 'H', round: 'group', kickoff_utc: '2026-06-30T21:00:00Z', match_order: 47 },
    { home_team: 'Uruguay', away_team: 'Spania', group_label: 'H', round: 'group', kickoff_utc: '2026-06-30T21:00:00Z', match_order: 48 },
    // Gruppe I
    { home_team: 'Frankrike', away_team: 'Senegal', group_label: 'I', round: 'group', kickoff_utc: '2026-06-17T18:00:00Z', match_order: 49 },
    { home_team: 'Irak', away_team: 'Norge', group_label: 'I', round: 'group', kickoff_utc: '2026-06-17T21:00:00Z', match_order: 50 },
    { home_team: 'Norge', away_team: 'Senegal', group_label: 'I', round: 'group', kickoff_utc: '2026-06-24T18:00:00Z', match_order: 51 },
    { home_team: 'Frankrike', away_team: 'Irak', group_label: 'I', round: 'group', kickoff_utc: '2026-06-24T21:00:00Z', match_order: 52 },
    { home_team: 'Norge', away_team: 'Frankrike', group_label: 'I', round: 'group', kickoff_utc: '2026-07-01T00:00:00Z', match_order: 53 },
    { home_team: 'Senegal', away_team: 'Irak', group_label: 'I', round: 'group', kickoff_utc: '2026-07-01T00:00:00Z', match_order: 54 },
    // Gruppe J
    { home_team: 'Argentina', away_team: 'Algerie', group_label: 'J', round: 'group', kickoff_utc: '2026-06-18T00:00:00Z', match_order: 55 },
    { home_team: 'Østerrike', away_team: 'Jordan', group_label: 'J', round: 'group', kickoff_utc: '2026-06-18T18:00:00Z', match_order: 56 },
    { home_team: 'Argentina', away_team: 'Østerrike', group_label: 'J', round: 'group', kickoff_utc: '2026-06-25T00:00:00Z', match_order: 57 },
    { home_team: 'Jordan', away_team: 'Algerie', group_label: 'J', round: 'group', kickoff_utc: '2026-06-25T18:00:00Z', match_order: 58 },
    { home_team: 'Algerie', away_team: 'Østerrike', group_label: 'J', round: 'group', kickoff_utc: '2026-07-01T21:00:00Z', match_order: 59 },
    { home_team: 'Jordan', away_team: 'Argentina', group_label: 'J', round: 'group', kickoff_utc: '2026-07-01T21:00:00Z', match_order: 60 },
    // Gruppe K
    { home_team: 'Portugal', away_team: 'DR Kongo', group_label: 'K', round: 'group', kickoff_utc: '2026-06-18T21:00:00Z', match_order: 61 },
    { home_team: 'Usbekistan', away_team: 'Colombia', group_label: 'K', round: 'group', kickoff_utc: '2026-06-19T18:00:00Z', match_order: 62 },
    { home_team: 'Portugal', away_team: 'Usbekistan', group_label: 'K', round: 'group', kickoff_utc: '2026-06-25T21:00:00Z', match_order: 63 },
    { home_team: 'Colombia', away_team: 'DR Kongo', group_label: 'K', round: 'group', kickoff_utc: '2026-06-26T00:00:00Z', match_order: 64 },
    { home_team: 'Colombia', away_team: 'Portugal', group_label: 'K', round: 'group', kickoff_utc: '2026-07-02T00:00:00Z', match_order: 65 },
    { home_team: 'DR Kongo', away_team: 'Usbekistan', group_label: 'K', round: 'group', kickoff_utc: '2026-07-02T00:00:00Z', match_order: 66 },
    // Gruppe L
    { home_team: 'Ghana', away_team: 'Panama', group_label: 'L', round: 'group', kickoff_utc: '2026-06-19T21:00:00Z', match_order: 67 },
    { home_team: 'England', away_team: 'Kroatia', group_label: 'L', round: 'group', kickoff_utc: '2026-06-20T00:00:00Z', match_order: 68 },
    { home_team: 'England', away_team: 'Ghana', group_label: 'L', round: 'group', kickoff_utc: '2026-06-26T18:00:00Z', match_order: 69 },
    { home_team: 'Panama', away_team: 'Kroatia', group_label: 'L', round: 'group', kickoff_utc: '2026-06-26T21:00:00Z', match_order: 70 },
    { home_team: 'Panama', away_team: 'England', group_label: 'L', round: 'group', kickoff_utc: '2026-07-02T21:00:00Z', match_order: 71 },
    { home_team: 'Kroatia', away_team: 'Ghana', group_label: 'L', round: 'group', kickoff_utc: '2026-07-02T21:00:00Z', match_order: 72 },
  ];

  const KNOCKOUT_MATCHES = [
    { home_team: 'Toer gruppe A', away_team: 'Toer gruppe B', round: 'r32', kickoff_utc: '2026-07-04T18:00:00Z', match_order: 73 },
    { home_team: 'Vinner gruppe E', away_team: '3. plass A/B/C/D/F', round: 'r32', kickoff_utc: '2026-07-04T21:00:00Z', match_order: 74 },
    { home_team: 'Vinner gruppe F', away_team: 'Toer gruppe C', round: 'r32', kickoff_utc: '2026-07-05T18:00:00Z', match_order: 75 },
    { home_team: 'Vinner gruppe C', away_team: 'Toer gruppe F', round: 'r32', kickoff_utc: '2026-07-05T21:00:00Z', match_order: 76 },
    { home_team: 'Vinner gruppe I', away_team: '3. plass C/D/F/G/H', round: 'r32', kickoff_utc: '2026-07-05T21:00:00Z', match_order: 77 },
    { home_team: 'Toer gruppe E', away_team: 'Toer gruppe I', round: 'r32', kickoff_utc: '2026-07-06T00:00:00Z', match_order: 78 },
    { home_team: 'Vinner gruppe A', away_team: '3. plass C/E/F/H/I', round: 'r32', kickoff_utc: '2026-07-06T18:00:00Z', match_order: 79 },
    { home_team: 'Vinner gruppe L', away_team: '3. plass E/H/I/J/K', round: 'r32', kickoff_utc: '2026-07-06T21:00:00Z', match_order: 80 },
    { home_team: 'Vinner gruppe D', away_team: '3. plass B/E/F/I/J', round: 'r32', kickoff_utc: '2026-07-07T00:00:00Z', match_order: 81 },
    { home_team: 'Vinner gruppe G', away_team: '3. plass A/E/H/I/J', round: 'r32', kickoff_utc: '2026-07-07T18:00:00Z', match_order: 82 },
    { home_team: 'Toer gruppe K', away_team: 'Toer gruppe L', round: 'r32', kickoff_utc: '2026-07-07T21:00:00Z', match_order: 83 },
    { home_team: 'Vinner gruppe H', away_team: 'Toer gruppe J', round: 'r32', kickoff_utc: '2026-07-08T00:00:00Z', match_order: 84 },
    { home_team: 'Vinner gruppe B', away_team: '3. plass E/F/G/I/J', round: 'r32', kickoff_utc: '2026-07-08T18:00:00Z', match_order: 85 },
    { home_team: 'Vinner gruppe J', away_team: 'Toer gruppe H', round: 'r32', kickoff_utc: '2026-07-08T21:00:00Z', match_order: 86 },
    { home_team: 'Vinner gruppe K', away_team: '3. plass D/E/I/J/L', round: 'r32', kickoff_utc: '2026-07-09T00:00:00Z', match_order: 87 },
    { home_team: 'Toer gruppe D', away_team: 'Toer gruppe G', round: 'r32', kickoff_utc: '2026-07-09T18:00:00Z', match_order: 88 },
    { home_team: 'Vinner kamp 73', away_team: 'Vinner kamp 74', round: 'r16', kickoff_utc: '2026-07-09T21:00:00Z', match_order: 89 },
    { home_team: 'Vinner kamp 75', away_team: 'Vinner kamp 76', round: 'r16', kickoff_utc: '2026-07-10T00:00:00Z', match_order: 90 },
    { home_team: 'Vinner kamp 77', away_team: 'Vinner kamp 78', round: 'r16', kickoff_utc: '2026-07-10T18:00:00Z', match_order: 91 },
    { home_team: 'Vinner kamp 79', away_team: 'Vinner kamp 80', round: 'r16', kickoff_utc: '2026-07-10T21:00:00Z', match_order: 92 },
    { home_team: 'Vinner kamp 81', away_team: 'Vinner kamp 82', round: 'r16', kickoff_utc: '2026-07-11T00:00:00Z', match_order: 93 },
    { home_team: 'Vinner kamp 83', away_team: 'Vinner kamp 84', round: 'r16', kickoff_utc: '2026-07-11T18:00:00Z', match_order: 94 },
    { home_team: 'Vinner kamp 85', away_team: 'Vinner kamp 86', round: 'r16', kickoff_utc: '2026-07-12T00:00:00Z', match_order: 95 },
    { home_team: 'Vinner kamp 87', away_team: 'Vinner kamp 88', round: 'r16', kickoff_utc: '2026-07-12T18:00:00Z', match_order: 96 },
    { home_team: 'Vinner kamp 89', away_team: 'Vinner kamp 90', round: 'qf', kickoff_utc: '2026-07-15T18:00:00Z', match_order: 97 },
    { home_team: 'Vinner kamp 91', away_team: 'Vinner kamp 92', round: 'qf', kickoff_utc: '2026-07-15T21:00:00Z', match_order: 98 },
    { home_team: 'Vinner kamp 93', away_team: 'Vinner kamp 94', round: 'qf', kickoff_utc: '2026-07-18T18:00:00Z', match_order: 99 },
    { home_team: 'Vinner kamp 95', away_team: 'Vinner kamp 96', round: 'qf', kickoff_utc: '2026-07-18T21:00:00Z', match_order: 100 },
    { home_team: 'Vinner kamp 97', away_team: 'Vinner kamp 98', round: 'sf', kickoff_utc: '2026-07-22T21:00:00Z', match_order: 101 },
    { home_team: 'Vinner kamp 99', away_team: 'Vinner kamp 100', round: 'sf', kickoff_utc: '2026-07-23T21:00:00Z', match_order: 102 },
    { home_team: 'Taper kamp 101', away_team: 'Taper kamp 102', round: 'bronze', kickoff_utc: '2026-07-26T18:00:00Z', match_order: 103 },
    { home_team: 'Vinner kamp 101', away_team: 'Vinner kamp 102', round: 'final', kickoff_utc: '2026-07-27T21:00:00Z', match_order: 104 },
  ];

  const allMatches = [
    ...GROUP_MATCHES,
    ...KNOCKOUT_MATCHES.map((m) => ({ ...m, group_label: null })),
  ].map((m) => ({ ...m, status: 'scheduled', locked: false }));

  const { error } = await supabase.from('matches').insert(allMatches);
  if (error) {
    console.error('Seed failed:', error.message);
  } else {
    console.log(`Seeded ${allMatches.length} matches.`);
  }
}

seed().catch(console.error);
