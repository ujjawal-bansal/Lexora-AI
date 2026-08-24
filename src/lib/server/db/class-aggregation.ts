import { createSupabaseServerClient } from './client';
import type { Mistake, MistakeCategory, Submission } from '$lib/types/db';
import { CATEGORY_LABELS } from '$lib/categories';

export type CategoryFrequency = {
	category: MistakeCategory;
	label: string;
	count: number;
	studentCount: number;
};

export type TopExcerpt = {
	category: MistakeCategory;
	quote: string;
	explanation: string;
	occurrences: number;
};

export type StudentSummary = {
	label: string;
	submissionId: string;
	status: Submission['status'];
	mistakeCount: number;
	topCategories: MistakeCategory[];
};

export type ClassAggregate = {
	classId: string;
	totalSubmissions: number;
	gradedSubmissions: number;
	totalMistakes: number;
	categoryFrequency: CategoryFrequency[];
	topExcerpts: TopExcerpt[];
	students: StudentSummary[];
};

/**
 * Pulls every submission + mistake in a class and reduces them into a compact summary
 * used both for the dashboard UI and as the only context given to the NL query Groq call.
 * All aggregation is plain JS over already-fetched rows — no AI involved.
 */
export async function buildClassAggregate(classId: string): Promise<ClassAggregate> {
	const supabase = createSupabaseServerClient();

	const { data: submissions } = await supabase
		.from('submissions')
		.select('*')
		.eq('class_id', classId)
		.order('created_at', { ascending: true });

	const subs = submissions ?? [];
	const submissionIds = subs.map((s) => s.id);

	const { data: mistakeRows } =
		submissionIds.length > 0
			? await supabase.from('mistakes').select('*').in('submission_id', submissionIds)
			: { data: [] as Mistake[] };

	const mistakes = mistakeRows ?? [];

	const byCategory = new Map<MistakeCategory, { count: number; submissionIds: Set<string> }>();
	const byQuote = new Map<string, TopExcerpt>();

	for (const m of mistakes) {
		const existing = byCategory.get(m.category);
		if (existing) {
			existing.count += 1;
			existing.submissionIds.add(m.submission_id);
		} else {
			byCategory.set(m.category, { count: 1, submissionIds: new Set([m.submission_id]) });
		}

		const quoteKey = `${m.category}::${m.quote}`;
		const existingQuote = byQuote.get(quoteKey);
		if (existingQuote) {
			existingQuote.occurrences += 1;
		} else {
			byQuote.set(quoteKey, {
				category: m.category,
				quote: m.quote,
				explanation: m.explanation,
				occurrences: 1
			});
		}
	}

	const categoryFrequency: CategoryFrequency[] = Array.from(byCategory.entries())
		.map(([category, stats]) => ({
			category,
			label: CATEGORY_LABELS[category],
			count: stats.count,
			studentCount: stats.submissionIds.size
		}))
		.sort((a, b) => b.count - a.count);

	const topExcerpts: TopExcerpt[] = Array.from(byQuote.values())
		.sort((a, b) => b.occurrences - a.occurrences)
		.slice(0, 8);

	const mistakesBySubmission = new Map<string, Mistake[]>();
	for (const m of mistakes) {
		const existing = mistakesBySubmission.get(m.submission_id);
		if (existing) existing.push(m);
		else mistakesBySubmission.set(m.submission_id, [m]);
	}

	const students: StudentSummary[] = subs.map((s, i) => {
		const subMistakes = mistakesBySubmission.get(s.id) ?? [];
		const catCounts = new Map<MistakeCategory, number>();
		for (const m of subMistakes) {
			catCounts.set(m.category, (catCounts.get(m.category) ?? 0) + 1);
		}
		const topCategories = Array.from(catCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 3)
			.map(([cat]) => cat);

		return {
			label: `Student ${i + 1}`,
			submissionId: s.id,
			status: s.status,
			mistakeCount: subMistakes.length,
			topCategories
		};
	});

	return {
		classId,
		totalSubmissions: subs.length,
		gradedSubmissions: subs.filter((s) => s.status === 'graded').length,
		totalMistakes: mistakes.length,
		categoryFrequency,
		topExcerpts,
		students
	};
}
