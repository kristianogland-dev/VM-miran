-- VM 2026 Tippekonkurranse – Supabase schema
-- Run this in the Supabase SQL Editor before deploying

create table if not exists players (
  id bigint generated always as identity primary key,
  name text not null unique,
  age integer not null,
  favorite_team text default '',
  is_child boolean not null default false,
  paid_entry boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists matches (
  id bigint generated always as identity primary key,
  home_team text not null,
  away_team text not null,
  group_label text,
  round text not null default 'group',
  kickoff_utc timestamptz not null,
  home_score integer,
  away_score integer,
  status text not null default 'scheduled',
  locked boolean not null default false,
  api_match_id text,
  match_order integer not null default 0
);

create table if not exists predictions (
  id bigint generated always as identity primary key,
  player_id bigint not null references players(id) on delete cascade,
  match_id bigint not null references matches(id) on delete cascade,
  predicted_home integer not null,
  predicted_away integer not null,
  submitted_at timestamptz default now(),
  unique(player_id, match_id)
);

create table if not exists final_predictions (
  id bigint generated always as identity primary key,
  player_id bigint not null references players(id) on delete cascade unique,
  first_goalscorer text default '',
  corners integer,
  throw_ins integer,
  yellow_cards integer,
  red_cards integer,
  offsides integer,
  free_kicks integer,
  submitted_at timestamptz default now()
);

create table if not exists meta_predictions (
  id bigint generated always as identity primary key,
  player_id bigint not null references players(id) on delete cascade unique,
  tournament_winner text default '',
  top_scorer text default '',
  best_player text default '',
  submitted_at timestamptz default now()
);

create table if not exists scores (
  id bigint generated always as identity primary key,
  player_id bigint not null references players(id) on delete cascade,
  match_id bigint not null references matches(id) on delete cascade,
  points_earned integer not null default 0,
  breakdown text not null default '{}',
  unique(player_id, match_id)
);

-- Disable Row Level Security so the service key has full access
alter table players disable row level security;
alter table matches disable row level security;
alter table predictions disable row level security;
alter table final_predictions disable row level security;
alter table meta_predictions disable row level security;
alter table scores disable row level security;
