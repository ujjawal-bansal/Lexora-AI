import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getMistakesForSubmission, getSubmissionForSession } from '$lib/server/db/queries';

export const load: PageServerLoad = async ({ params, locals }) => {
	const submission = await getSubmissionForSession(params.id, locals.sessionId);

	if (!submission) {
		error(404, 'Submission not found');
	}

	const mistakes = await getMistakesForSubmission(submission.id);

	return { submission, mistakes };
};
