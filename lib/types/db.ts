// Mirrors the Postgres schema in supabase/migrations/0001_init.sql.
// Keep the MistakeCategory union in sync with the `mistakes.category` check constraint.
//
// IMPORTANT: Submission/Mistake/PracticeQuestion/PracticeAnswer and Database below must stay
// `type` aliases, not `interface`. supabase-js's generic inference for .from(table).select()
// silently resolves to `never` when these are declared as `interface` instead of `type`,
// even though the shapes are structurally identical — verified against @supabase/supabase-js@2.110.

export const MISTAKE_CATEGORIES = [
	'subject_verb_agreement',
	'comma_splice',
	'run_on_sentence',
	'tense_consistency',
	'thesis_clarity',
	'weak_evidence',
	'paragraph_structure',
	'logical_flow'
] as const;

export type MistakeCategory = (typeof MISTAKE_CATEGORIES)[number];

export const GRAMMAR_CATEGORIES = [
	'subject_verb_agreement',
	'comma_splice',
	'run_on_sentence',
	'tense_consistency'
] as const satisfies readonly MistakeCategory[];

export const STRUCTURE_CATEGORIES = [
	'thesis_clarity',
	'weak_evidence',
	'paragraph_structure',
	'logical_flow'
] as const satisfies readonly MistakeCategory[];

export type SubmissionStatus = 'pending' | 'graded' | 'failed';
export type QuestionType = 'multiple_choice' | 'short_response';

export type Submission = {
	id: string;
	session_id: string;
	essay_text: string;
	overall_feedback: string | null;
	status: SubmissionStatus;
	error_message: string | null;
	created_at: string;
	class_id: string | null;
};

export type Class = {
	id: string;
	session_id: string;
	name: string | null;
	created_at: string;
};

export type Mistake = {
	id: string;
	submission_id: string;
	category: MistakeCategory;
	quote: string;
	explanation: string;
	created_at: string;
};

export type PracticeQuestion = {
	id: string;
	submission_id: string;
	category: MistakeCategory;
	question_type: QuestionType;
	prompt: string;
	choices: string[] | null;
	correct_choice_index: number | null;
	model_answer_notes: string | null;
	created_at: string;
};

export type PracticeAnswer = {
	id: string;
	practice_question_id: string;
	session_id: string;
	answer_text: string;
	is_correct: boolean | null;
	feedback: string | null;
	created_at: string;
};

export type Database = {
	public: {
		Tables: {
			submissions: {
				Row: Submission;
				Insert: Omit<Submission, 'id' | 'created_at' | 'class_id'> & {
					id?: string;
					created_at?: string;
					class_id?: string | null;
				};
				Update: Partial<Submission>;
				Relationships: [];
			};
			classes: {
				Row: Class;
				Insert: Omit<Class, 'id' | 'created_at'> & { id?: string; created_at?: string };
				Update: Partial<Class>;
				Relationships: [];
			};
			mistakes: {
				Row: Mistake;
				Insert: Omit<Mistake, 'id' | 'created_at'> & { id?: string; created_at?: string };
				Update: Partial<Mistake>;
				Relationships: [];
			};
			practice_questions: {
				Row: PracticeQuestion;
				Insert: Omit<PracticeQuestion, 'id' | 'created_at'> & {
					id?: string;
					created_at?: string;
				};
				Update: Partial<PracticeQuestion>;
				Relationships: [];
			};
			practice_answers: {
				Row: PracticeAnswer;
				Insert: Omit<PracticeAnswer, 'id' | 'created_at'> & { id?: string; created_at?: string };
				Update: Partial<PracticeAnswer>;
				Relationships: [];
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
};
