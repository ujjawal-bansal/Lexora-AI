-- Essay Mistake -> Practice Question Generator: initial schema
-- See SPEC.md section 2 for the full data model rationale.

create extension if not exists pgcrypto;

-- A single essay submission
create table submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,              -- anonymous client identifier, not auth
  essay_text text not null,
  overall_feedback text,                 -- holistic AI feedback, NOT a grade
  status text not null default 'pending', -- pending | graded | failed
  error_message text,                    -- populated if status = 'failed'
  created_at timestamptz not null default now()
);

create index submissions_session_id_idx on submissions (session_id);

-- A single flagged mistake within an essay
create table mistakes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  category text not null check (category in (
    'subject_verb_agreement',
    'comma_splice',
    'run_on_sentence',
    'tense_consistency',
    'thesis_clarity',
    'weak_evidence',
    'paragraph_structure',
    'logical_flow'
  )),
  quote text not null,        -- the exact excerpt from the essay
  explanation text not null,  -- why this is a mistake
  created_at timestamptz not null default now()
);

create index mistakes_submission_id_idx on mistakes (submission_id);

-- A practice question generated for a mistake *category* within a submission
-- (grouped -- not one row per mistake instance)
create table practice_questions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  category text not null,
  question_type text not null check (question_type in ('multiple_choice', 'short_response')),
  prompt text not null,
  -- for multiple_choice:
  choices jsonb,              -- array of strings, null for short_response
  correct_choice_index int,   -- null for short_response
  -- for short_response:
  model_answer_notes text,    -- what a correct answer should contain; used by grading pass; null for multiple_choice
  created_at timestamptz not null default now()
);

create index practice_questions_submission_id_idx on practice_questions (submission_id);

-- A student's attempt at a practice question
create table practice_answers (
  id uuid primary key default gen_random_uuid(),
  practice_question_id uuid not null references practice_questions(id) on delete cascade,
  session_id uuid not null,
  answer_text text not null,       -- selected choice text OR free-form response
  is_correct boolean,              -- null until graded
  feedback text,                   -- short explanation, populated after grading
  created_at timestamptz not null default now()
);

create index practice_answers_question_id_idx on practice_answers (practice_question_id);
create index practice_answers_session_id_idx on practice_answers (session_id);
