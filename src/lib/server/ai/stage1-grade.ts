import { MISTAKE_CATEGORIES } from '$lib/types/db';
import { callGroqForJson } from './client';
import { Stage1ResultSchema, isValidMistakeCategory, type ValidatedMistake } from './schemas';

const SYSTEM_PROMPT = `You are an essay grading assistant. You give formative feedback to help a student improve — you do not assign a grade or score.

Analyze the essay for two kinds of issues:
1. Grammar/mechanics: subject_verb_agreement, comma_splice, run_on_sentence, tense_consistency
2. Structure/argument: thesis_clarity, weak_evidence, paragraph_structure, logical_flow

For each mistake you find, quote the EXACT excerpt from the essay where it occurs (copy the text verbatim, do not paraphrase), and explain briefly why it's a mistake.

The "category" field for each mistake MUST be exactly one of these 8 values: ${MISTAKE_CATEGORIES.join(', ')}.

If the essay is well-written with no significant issues, return an empty mistakes array — that is a valid and good outcome, not a failure.

Respond with ONLY a JSON object in this exact shape, no other text:
{
  "overall_feedback": "2-4 sentences of holistic, qualitative feedback (not a grade)",
  "mistakes": [
    { "category": "comma_splice", "quote": "exact excerpt from the essay", "explanation": "why this is a mistake" }
  ]
}`;

export async function runStage1Grade(essayText: string): Promise<{
	overallFeedback: string;
	mistakes: ValidatedMistake[];
}> {
	const result = await callGroqForJson({
		stage: 'stage1',
		systemPrompt: SYSTEM_PROMPT,
		userPrompt: `Essay:\n\n${essayText}`,
		schema: Stage1ResultSchema
	});

	const mistakes: ValidatedMistake[] = [];
	for (const mistake of result.mistakes) {
		if (!isValidMistakeCategory(mistake.category)) {
			console.warn(`[stage1] dropping mistake with invalid category: ${mistake.category}`);
			continue;
		}
		if (!essayText.includes(mistake.quote)) {
			console.warn(`[stage1] quote not found verbatim in essay, keeping anyway: ${mistake.quote}`);
		}
		mistakes.push({
			category: mistake.category,
			quote: mistake.quote,
			explanation: mistake.explanation
		});
	}

	return { overallFeedback: result.overall_feedback, mistakes };
}
