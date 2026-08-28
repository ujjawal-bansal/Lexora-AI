import { z } from 'zod';
import { MISTAKE_CATEGORIES, type MistakeCategory } from '@/lib/types/db';

// --- Stage 1: grade & extract mistakes ---

export const Stage1MistakeSchema = z.object({
	category: z.string(),
	quote: z.string().min(1),
	explanation: z.string().min(1)
});

export const Stage1ResultSchema = z.object({
	overall_feedback: z.string().min(1),
	mistakes: z.array(Stage1MistakeSchema)
});

export type Stage1Result = z.infer<typeof Stage1ResultSchema>;
export type Stage1Mistake = z.infer<typeof Stage1MistakeSchema>;

// A mistake after dropping invalid/hallucinated categories (see lib/server/ai/pipeline.ts).
export type ValidatedMistake = {
	category: MistakeCategory;
	quote: string;
	explanation: string;
};

export function isValidMistakeCategory(value: string): value is MistakeCategory {
	return (MISTAKE_CATEGORIES as readonly string[]).includes(value);
}

// --- Stage 2: group & generate practice questions ---

export const Stage2QuestionSchema = z.discriminatedUnion('question_type', [
	z.object({
		question_type: z.literal('multiple_choice'),
		prompt: z.string().min(1),
		choices: z.array(z.string().min(1)).min(2),
		correct_choice_index: z.number().int().min(0)
	}),
	z.object({
		question_type: z.literal('short_response'),
		prompt: z.string().min(1),
		model_answer_notes: z.string().min(1)
	})
]);

export const Stage2CategoryResultSchema = z.object({
	category: z.string(),
	questions: z.array(Stage2QuestionSchema)
});

export const Stage2ResultSchema = z.object({
	results: z.array(Stage2CategoryResultSchema)
});

export const Stage2RawResultSchema = z.object({
	results: z.array(z.unknown())
});

export type Stage2Question = z.infer<typeof Stage2QuestionSchema>;
export type Stage2CategoryResult = z.infer<typeof Stage2CategoryResultSchema>;
export type Stage2Result = z.infer<typeof Stage2ResultSchema>;
export type Stage2RawResult = z.infer<typeof Stage2RawResultSchema>;

// --- Stage 3: grade a short-response answer ---

export const Stage3ResultSchema = z.object({
	is_correct: z.boolean(),
	feedback: z.string().min(1)
});

export type Stage3Result = z.infer<typeof Stage3ResultSchema>;

// --- Stage 4: answer a free-text question over aggregated class data ---

export const ClassQueryResultSchema = z.object({
	answer: z.string().min(1)
});

export type ClassQueryResult = z.infer<typeof ClassQueryResultSchema>;
