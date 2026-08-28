'use server';

import { redirect } from 'next/navigation';
import { submitEssay } from '@/lib/server/ai/pipeline';
import { getSessionId } from '@/lib/session';
import type { EssayFormState } from './essay-form-state';

export async function submitEssayAction(
	_previous: EssayFormState,
	formData: FormData
): Promise<EssayFormState> {
	const essayText = String(formData.get('essay') ?? '');
	const sessionId = await getSessionId();

	const result = await submitEssay({ sessionId, essayText });

	if (!result.ok) {
		return { errorMessage: result.errorMessage };
	}

	// Throws internally — anything after this is unreachable, which is why the
	// success branch has no return value.
	redirect(`/submissions/${result.submissionId}`);
}
