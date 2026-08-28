'use server';

import { PipelineStageError } from '@/lib/server/ai/client';
import { runClassQuery } from '@/lib/server/ai/stage4-class-query';
import { buildClassAggregate } from '@/lib/server/db/class-aggregation';
import { getClassForSession } from '@/lib/server/db/queries';
import { getSessionId } from '@/lib/session';
import type { ClassQueryState } from './query-state';

const NO_DATA_ANSWER =
	"There's no mistake data yet for this class — once essays are graded, you'll be able to ask questions about the patterns.";

/**
 * Keeping the Q&A log in the action state means the server owns the append, so there is no
 * client-side list to keep in step with the action result.
 */
export async function askClassAction(
	previous: ClassQueryState,
	formData: FormData
): Promise<ClassQueryState> {
	const classId = String(formData.get('classId') ?? '');
	const question = String(formData.get('question') ?? '').trim();

	if (!question) {
		return { ...previous, error: 'Please enter a question.' };
	}

	// The class id arrives from the form, so ownership is re-checked rather than assumed.
	const sessionId = await getSessionId();
	const classRow = await getClassForSession(classId, sessionId);
	if (!classRow) {
		return { ...previous, error: 'Class not found.' };
	}

	const aggregate = await buildClassAggregate(classRow.id);

	if (aggregate.totalMistakes === 0) {
		return {
			history: [{ question, answer: NO_DATA_ANSWER }, ...previous.history],
			error: null
		};
	}

	try {
		const answer = await runClassQuery(aggregate, question);
		return { history: [{ question, answer }, ...previous.history], error: null };
	} catch (err) {
		const message =
			err instanceof PipelineStageError
				? 'AI service timed out answering that question. Please try again.'
				: 'Something went wrong answering that question. Please try again.';
		return { ...previous, error: message };
	}
}
