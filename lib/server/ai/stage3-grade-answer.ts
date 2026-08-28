import { callGroqForJson } from './client';
import { Stage3ResultSchema } from './schemas';

const SYSTEM_PROMPT = `You grade a student's short-response answer to a practice question. You give pass/fail feedback, never a numeric score or grade.

You will be given the question prompt, notes on what a correct answer should contain, and the student's answer. Decide if the answer is correct (it doesn't need to be perfectly worded, but it must demonstrate understanding of what the notes describe) and give a short, encouraging 1-2 sentence explanation.

Respond with ONLY a JSON object in this exact shape, no other text:
{ "is_correct": true, "feedback": "1-2 sentence explanation" }`;

export async function runStage3GradeAnswer(args: {
	prompt: string;
	modelAnswerNotes: string;
	answerText: string;
}): Promise<{ isCorrect: boolean; feedback: string }> {
	const userPrompt = `Question: ${args.prompt}\n\nWhat a correct answer should contain: ${args.modelAnswerNotes}\n\nStudent's answer: ${args.answerText}`;

	const result = await callGroqForJson({
		stage: 'stage3',
		systemPrompt: SYSTEM_PROMPT,
		userPrompt,
		schema: Stage3ResultSchema
	});

	return { isCorrect: result.is_correct, feedback: result.feedback };
}

/** Multiple-choice grading is pure index comparison — no AI call needed. */
export function gradeMultipleChoiceAnswer(
	correctChoiceIndex: number,
	selectedChoiceIndex: number
): { isCorrect: boolean } {
	return { isCorrect: selectedChoiceIndex === correctChoiceIndex };
}
