'use server';

import { redirect } from 'next/navigation';
import { submitClassBatch } from '@/lib/server/ai/pipeline';
import { getSessionId } from '@/lib/session';
import type { ClassFormState } from './class-form-state';

export async function submitClassBatchAction(
	_previous: ClassFormState,
	formData: FormData
): Promise<ClassFormState> {
	const className = String(formData.get('className') ?? '').trim() || undefined;
	const essays = formData
		.getAll('essay')
		.map((value) => String(value))
		.filter((text) => text.trim().length > 0);

	const sessionId = await getSessionId();
	const result = await submitClassBatch({ sessionId, essays, className });

	if (!result.ok) {
		return { errorMessage: result.errorMessage };
	}

	redirect(`/class/${result.classId}`);
}
