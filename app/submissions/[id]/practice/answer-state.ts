// Kept out of actions.ts on purpose: a 'use server' module turns every export into a
// server-action reference, so a plain constant exported from there arrives on the client
// as a function rather than the object it looks like.

import type { MistakeCategory, QuestionType } from '@/lib/types/db';

export type AnswerState =
	| { status: 'idle' }
	| { status: 'error'; message: string }
	| {
			status: 'graded';
			answerText: string;
			isCorrect: boolean;
			feedback: string | null;
			correctChoiceIndex: number | null;
	  };

export const initialAnswerState: AnswerState = { status: 'idle' };

/**
 * What the practice card is allowed to receive. Props handed to a client component are
 * serialized into the RSC payload and end up in the page source, so the full
 * `practice_questions` row must never be passed straight through:
 *
 * - `model_answer_notes` is documented as never shown to the student — it is omitted
 *   entirely, and the grading action reads it from the database instead.
 * - `correct_choice_index` is filled in only once the question has been answered, so an
 *   unanswered multiple-choice question does not carry its own answer key.
 */
export type PracticeQuestionView = {
	id: string;
	category: MistakeCategory;
	question_type: QuestionType;
	prompt: string;
	choices: string[] | null;
	correct_choice_index: number | null;
};
