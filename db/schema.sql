-- Execute no SQL Editor do console Neon (ou via psql). Idempotente.

create table if not exists users (
  id              text primary key,               -- "sub" do Google (estável)
  email           text not null,
  name            text,
  notify_by_email boolean not null default true,
  created_at      timestamptz not null default now(),
  last_login_at   timestamptz not null default now()
);

create table if not exists entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references users(id) on delete cascade,
  meal_type   text check (meal_type in (
                'cafe_da_manha', 'lanche_manha', 'almoco',
                'lanche_tarde', 'jantar', 'ceia', 'outro')),     -- null = só sintomas
  foods       text[] not null default '{}',                    -- {"pão","ovos","café"}
  symptoms    jsonb  not null default '[]',                    -- [{"name":"azia","intensity":3}]
  notes       text check (char_length(notes) <= 1000),
  occurred_at timestamptz not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint entries_not_empty check (cardinality(foods) > 0 or jsonb_array_length(symptoms) > 0),
  constraint entries_limits    check (cardinality(foods) <= 50 and jsonb_array_length(symptoms) <= 20)
);

-- Índice principal: toda consulta é "entradas do usuário X entre A e B".
create index if not exists entries_user_time_idx on entries (user_id, occurred_at);

-- Opcional: buscas do tipo "registros com azia" (symptoms @> '[{"name":"azia"}]').
create index if not exists entries_symptoms_gin on entries using gin (symptoms jsonb_path_ops);

create table if not exists weekly_reports (
  user_id      text not null references users(id) on delete cascade,
  week_start   date not null,                    -- domingo
  week_end     date not null,                    -- sábado
  entry_count  integer not null,
  top_triggers jsonb not null,
  report       jsonb not null,
  generated_at timestamptz not null default now(),
  emailed_at   timestamptz,
  primary key (user_id, week_start)
);
