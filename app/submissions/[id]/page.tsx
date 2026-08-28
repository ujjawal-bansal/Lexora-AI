import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CATEGORY_LABELS, GROUP_LABELS, categoryGroup } from '@/lib/categories';
import { getMistakesForSubmission, getSubmissionForSession } from '@/lib/server/db/queries';
import { getSessionId } from '@/lib/session';
import type { Mistake, MistakeCategory } from '@/lib/types/db';
import styles from './results.module.css';

export const metadata: Metadata = { title: 'Results' };

type Group = { category: MistakeCategory; items: Mistake[] };

function buildGroups(items: Mistake[], group: 'grammar' | 'structure'): Group[] {
	const byCategory = new Map<MistakeCategory, Mistake[]>();
	for (const mistake of items) {
		if (categoryGroup(mistake.category) !== group) continue;
		const existing = byCategory.get(mistake.category);
		if (existing) existing.push(mistake);
		else byCategory.set(mistake.category, [mistake]);
	}
	return Array.from(byCategory.entries()).map(([category, its]) => ({ category, items: its }));
}

function MistakeGroupSection({
	groups,
	group
}: {
	groups: Group[];
	group: 'grammar' | 'structure';
}) {
	const total = groups.reduce((sum, g) => sum + g.items.length, 0);

	return (
		<section className={styles.groupSection}>
			<header className={styles.groupHeader}>
				<span className={`${styles.groupDot} ${styles[group]}`} aria-hidden="true" />
				<h2 className={styles.groupLabel}>{GROUP_LABELS[group]}</h2>
				<span className={styles.groupCount}>{total}</span>
			</header>

			{groups.map((entry) => (
				<div className={styles.categoryBlock} key={entry.category}>
					<h3 className={`${styles.categoryLabel} ${styles[group]}`}>
						{CATEGORY_LABELS[entry.category]}
					</h3>
					<ul className={styles.mistakeList}>
						{entry.items.map((mistake) => (
							<li className={styles.mistakeItem} key={mistake.id}>
								<p className={styles.mistakeQuote}>&ldquo;{mistake.quote}&rdquo;</p>
								<p className={styles.mistakeExplanation}>{mistake.explanation}</p>
							</li>
						))}
					</ul>
				</div>
			))}
		</section>
	);
}

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const sessionId = await getSessionId();

	const submission = await getSubmissionForSession(id, sessionId);
	if (!submission) {
		notFound();
	}

	const mistakes = await getMistakesForSubmission(submission.id);
	const grammarGroups = buildGroups(mistakes, 'grammar');
	const structureGroups = buildGroups(mistakes, 'structure');
	const hasMistakes = mistakes.length > 0;

	if (submission.status === 'failed') {
		return (
			<main className={styles.page}>
				<Link href="/" className={styles.backLink}>
					← New essay
				</Link>
				<section className={`${styles.stateBlock} ${styles.failed}`}>
					<p className={styles.stateEyebrow}>Grading failed</p>
					<h1>Couldn&rsquo;t finish grading</h1>
					<p className={styles.stateBody}>
						{submission.error_message ?? 'The AI service returned an unexpected error.'}
					</p>
					<Link href="/" className={styles.ctaBtn}>
						Try again
					</Link>
				</section>
			</main>
		);
	}

	if (submission.status === 'pending') {
		return (
			<main className={styles.page}>
				<Link href="/" className={styles.backLink}>
					← New essay
				</Link>
				<section className={`${styles.stateBlock} ${styles.pending}`}>
					<span className={styles.spinner} aria-hidden="true" />
					<h1>Still grading…</h1>
					<p className={styles.stateBody}>
						Refresh in a moment — feedback will appear here once ready.
					</p>
				</section>
			</main>
		);
	}

	return (
		<main className={styles.page}>
			<Link href="/" className={styles.backLink}>
				← New essay
			</Link>

			<header className={styles.masthead}>
				<p className={styles.eyebrow}>Your feedback</p>
				<h1>{hasMistakes ? "Here's what to work on" : 'Clean writing'}</h1>
			</header>

			<blockquote className={styles.overallFeedback}>{submission.overall_feedback}</blockquote>

			{!hasMistakes ? (
				<section className={styles.emptyState}>
					<div className={styles.emptyIcon} aria-hidden="true">
						✓
					</div>
					<h2>No major issues found</h2>
					<p>This essay reads cleanly. Nothing significant to flag.</p>
				</section>
			) : (
				<div className={styles.mistakeGroups}>
					{grammarGroups.length > 0 && (
						<MistakeGroupSection groups={grammarGroups} group="grammar" />
					)}

					{grammarGroups.length > 0 && structureGroups.length > 0 && (
						<hr className={styles.groupDivider} />
					)}

					{structureGroups.length > 0 && (
						<MistakeGroupSection groups={structureGroups} group="structure" />
					)}
				</div>
			)}

			<Link href={`/submissions/${submission.id}/practice`} className={styles.practiceCta}>
				<span className={styles.ctaLabel}>
					{hasMistakes ? 'Practice these categories' : 'Try practice questions'}
				</span>
				<span className={styles.ctaArrow} aria-hidden="true">
					→
				</span>
			</Link>
		</main>
	);
}
