import {
	GRAMMAR_CATEGORIES,
	type MistakeCategory,
	type QuestionType
} from '$lib/types/db';
import { callGroqForJson, PipelineStageError } from './client';
import { Stage2QuestionSchema, Stage2RawResultSchema } from './schemas';
import type { ValidatedMistake } from './schemas';

export type QuestionDraft =
	| {
			category: MistakeCategory;
			question_type: 'multiple_choice';
			prompt: string;
			choices: string[];
			correct_choice_index: number;
			model_answer_notes: null;
	  }
	| {
			category: MistakeCategory;
			question_type: 'short_response';
			prompt: string;
			choices: null;
			correct_choice_index: null;
			model_answer_notes: string;
	  };

// Deterministic routing rule from the spec: grammar/mechanics -> multiple_choice,
// structure/argument -> short_response. Not left to the model.
function questionTypeForCategory(category: MistakeCategory): QuestionType {
	return (GRAMMAR_CATEGORIES as readonly string[]).includes(category)
		? 'multiple_choice'
		: 'short_response';
}

function groupMistakesByCategory(
	mistakes: ValidatedMistake[]
): Map<MistakeCategory, ValidatedMistake[]> {
	const groups = new Map<MistakeCategory, ValidatedMistake[]>();
	for (const mistake of mistakes) {
		const existing = groups.get(mistake.category);
		if (existing) {
			existing.push(mistake);
		} else {
			groups.set(mistake.category, [mistake]);
		}
	}
	return groups;
}

const SYSTEM_PROMPT = `You generate personalized practice questions for a student based on mistakes found in their essay.

You will be given one or more mistake categories, each with the category's required question_type and the specific mistakes (with quoted excerpts from the student's own essay) found in that category.

Rules:
- Generate 1-2 questions per category provided.
- A category's question_type is fixed and given to you — do not change it. If question_type is "multiple_choice", produce exactly that shape (with "choices" and "correct_choice_index"); if "short_response", produce that shape (with "model_answer_notes" describing what a correct answer should contain).
- Reference the student's actual essay content where natural (e.g. quote their own sentence in a "fix this" question) so questions feel personalized, not generic.
- multiple_choice: provide exactly 4 choices, with correct_choice_index as a 0-based index into the choices array.
- short_response: model_answer_notes should describe what a correct answer needs to contain, for later grading — it is never shown to the student.

Respond with ONLY a JSON object in this exact shape, no other text:
{
  "results": [
    {
      "category": "comma_splice",
      "questions": [
        { "question_type": "multiple_choice", "prompt": "string", "choices": ["A", "B", "C", "D"], "correct_choice_index": 2 }
      ]
    },
    {
      "category": "thesis_clarity",
      "questions": [
        { "question_type": "short_response", "prompt": "string", "model_answer_notes": "what a correct answer should contain" }
      ]
    }
  ]
}`;

function buildUserPrompt(
	essayText: string,
	groups: Map<MistakeCategory, ValidatedMistake[]>
): string {
	const sections = Array.from(groups.entries()).map(([category, mistakes]) => {
		const questionType = questionTypeForCategory(category);
		const mistakeLines = mistakes
			.map((m, i) => `  ${i + 1}. Quote: "${m.quote}"\n     Why: ${m.explanation}`)
			.join('\n');
		return `Category: ${category}\nRequired question_type: ${questionType}\nMistakes in this category:\n${mistakeLines}`;
	});

	return `Essay:\n\n${essayText}\n\n---\n\nCategories to generate questions for:\n\n${sections.join('\n\n')}`;
}

function toQuestionDraft(category: MistakeCategory, rawQuestion: unknown): QuestionDraft | null {
	const parsed = Stage2QuestionSchema.safeParse(rawQuestion);
	if (!parsed.success) {
		console.warn('[stage2] dropping invalid question payload:', parsed.error.issues);
		return null;
	}

	const q = parsed.data;
	const expectedType = questionTypeForCategory(category);
	if (q.question_type !== expectedType) {
		console.warn(
			`[stage2] dropping question with wrong type for category ${category}: expected ${expectedType}, got ${q.question_type}`
		);
		return null;
	}

	if (q.question_type === 'multiple_choice') {
		if (q.correct_choice_index < 0 || q.correct_choice_index >= q.choices.length) {
			console.warn(`[stage2] dropping multiple_choice question with out-of-range correct_choice_index`);
			return null;
		}
		return {
			category,
			question_type: 'multiple_choice',
			prompt: q.prompt,
			choices: q.choices,
			correct_choice_index: q.correct_choice_index,
			model_answer_notes: null
		};
	}

	return {
		category,
		question_type: 'short_response',
		prompt: q.prompt,
		choices: null,
		correct_choice_index: null,
		model_answer_notes: q.model_answer_notes
	};
}

type Stage2NormalizedCategory = {
	category: string;
	questions: unknown[];
};

function isString(value: unknown): value is string {
	return typeof value === 'string';
}

function isUnknownArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

function asNormalizedCategory(value: unknown): Stage2NormalizedCategory | null {
	if (!value || typeof value !== 'object') return null;
	const record = value as Record<string, unknown>;
	if (!isString(record.category) || !isUnknownArray(record.questions)) return null;
	return { category: record.category, questions: record.questions };
}

function normalizeCategoryResults(results: unknown[]): Stage2NormalizedCategory[] {
	const normalized: Stage2NormalizedCategory[] = [];

	for (let i = 0; i < results.length; i++) {
		const entry = results[i];

		const direct = asNormalizedCategory(entry);
		if (direct) {
			normalized.push(direct);
			continue;
		}

		if (
			entry === 'category' &&
			results[i + 1] === ':' &&
			isString(results[i + 2]) &&
			results[i + 3] === 'questions' &&
			results[i + 4] === ':' &&
			isUnknownArray(results[i + 5])
		) {
			normalized.push({ category: results[i + 2], questions: results[i + 5] });
			i += 5;
			continue;
		}

		console.warn('[stage2] dropping unrecognized category result entry:', entry);
	}

	return normalized;
}

export async function runStage2Questions(
	essayText: string,
	mistakes: ValidatedMistake[]
): Promise<QuestionDraft[]> {
	if (mistakes.length === 0) {
		return [];
	}

	const groups = groupMistakesByCategory(mistakes);

	const result = await callGroqForJson({
		stage: 'stage2',
		systemPrompt: SYSTEM_PROMPT,
		userPrompt: buildUserPrompt(essayText, groups),
		schema: Stage2RawResultSchema
	});

	const normalizedResults = normalizeCategoryResults(result.results);

	const drafts: QuestionDraft[] = [];
	for (const categoryResult of normalizedResults) {
		if (!groups.has(categoryResult.category as MistakeCategory)) {
			console.warn(`[stage2] dropping questions for unrequested category: ${categoryResult.category}`);
			continue;
		}
		const category = categoryResult.category as MistakeCategory;
		for (const q of categoryResult.questions) {
			const draft = toQuestionDraft(category, q);
			if (draft) drafts.push(draft);
		}
	}

	if (drafts.length === 0) {
		throw new PipelineStageError('Groq response did not contain valid practice questions (stage2)', 'stage2');
	}

	return drafts;
}
