-- Class mode: a teacher batch-submits 3-10 essays and gets an aggregated
-- analytics dashboard with a natural-language query box over the results.
-- See SPEC.md-derived feature discussion; this is a v1.1 addition, not in the original spec.

create table classes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,        -- same anonymous-session model as submissions
  name text,                       -- optional label, e.g. "Period 3 essays"
  created_at timestamptz not null default now()
);

create index classes_session_id_idx on classes (session_id);

-- Nullable: existing single-essay submissions are unaffected (class_id stays null).
alter table submissions
  add column class_id uuid references classes(id) on delete cascade;

create index submissions_class_id_idx on submissions (class_id);
