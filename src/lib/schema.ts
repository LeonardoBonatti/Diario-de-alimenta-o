/**
 * App de um único usuário: todos os registros pertencem a este id.
 * A coluna user_id foi mantida para não exigir migração e permitir multiusuário no futuro.
 */
export const OWNER_ID = 'owner';

/**
 * Schema do banco. Aplicado automaticamente (e de forma idempotente) na
 * primeira consulta de cada instância — ver ensureSchema() em db.ts.
 * Um comando por item; todos vão numa única transação (uma ida ao banco).
 */
export const SCHEMA_STATEMENTS = [
  `create table if not exists users (
     id              text primary key,
     email           text not null,
     name            text,
     notify_by_email boolean not null default true,
     created_at      timestamptz not null default now(),
     last_login_at   timestamptz not null default now()
   )`,

  `create table if not exists entries (
     id          uuid primary key default gen_random_uuid(),
     user_id     text not null references users(id) on delete cascade,
     meal_type   text check (meal_type in (
                   'cafe_da_manha', 'lanche_manha', 'almoco',
                   'lanche_tarde', 'jantar', 'ceia', 'outro')),  -- null = só sintomas
     foods       text[] not null default '{}',
     symptoms    jsonb  not null default '[]',                 -- [{"name":"azia","intensity":3}]
     notes       text check (char_length(notes) <= 1000),
     occurred_at timestamptz not null,
     created_at  timestamptz not null default now(),
     updated_at  timestamptz not null default now(),
     constraint entries_not_empty check (cardinality(foods) > 0 or jsonb_array_length(symptoms) > 0),
     constraint entries_limits    check (cardinality(foods) <= 50 and jsonb_array_length(symptoms) <= 20)
   )`,

  // Colunas adicionadas depois da primeira versão (idempotente em bancos existentes).
  // meal_label: nome livre quando meal_type = 'outro'.
  `alter table entries add column if not exists meal_label text check (char_length(meal_label) <= 60)`,
  // Hábitos ligados ao refluxo: null = não informado.
  `alter table entries add column if not exists lay_down_soon boolean`,
  `alter table entries add column if not exists large_meal boolean`,

  // Toda consulta é "registros do usuário X entre A e B".
  `create index if not exists entries_user_time_idx on entries (user_id, occurred_at)`,

  // Buscas do tipo symptoms @> '[{"name":"azia"}]'.
  `create index if not exists entries_symptoms_gin on entries using gin (symptoms jsonb_path_ops)`,

  `create table if not exists weekly_reports (
     user_id      text not null references users(id) on delete cascade,
     week_start   date not null,                    -- domingo
     week_end     date not null,                    -- sábado
     entry_count  integer not null,
     top_triggers jsonb not null,
     report       jsonb not null,
     generated_at timestamptz not null default now(),
     emailed_at   timestamptz,
     primary key (user_id, week_start)
   )`,

  // Reflux Symptom Index (Belafsky): 9 itens de 0 a 5, total 0–45.
  `create table if not exists rsi_assessments (
     id          uuid primary key default gen_random_uuid(),
     user_id     text not null references users(id) on delete cascade,
     answered_at timestamptz not null default now(),
     answers     smallint[] not null check (cardinality(answers) = 9),
     total       smallint not null check (total between 0 and 45),
     notes       text check (char_length(notes) <= 1000)
   )`,
  `create index if not exists rsi_user_time_idx on rsi_assessments (user_id, answered_at)`,

  // Dono único do diário (referenciado por entries e weekly_reports).
  `insert into users (id, email) values ('${OWNER_ID}', '') on conflict (id) do nothing`,
];
