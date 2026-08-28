import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ClassQuery from '@/components/ClassQuery';
import { GROUP_LABELS, categoryGroup } from '@/lib/categories';
import { buildClassAggregate } from '@/lib/server/db/class-aggregation';
import { getClassForSession } from '@/lib/server/db/queries';
import { getSessionId } from '@/lib/session';
import type { Submission } from '@/lib/types/db';
import styles from './dashboard.module.css';

type PageProps = { params: Promise<{ id: string }> };

const STATUS_CLASS: Record<Submission['status'], string> = {
	graded: styles.statusGraded,
	pending: styles.statusPending,
	failed: styles.statusFailed
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { id } = await params;
	const sessionId = await getSessionId();
	const classRow = await getClassForSession(id, sessionId);

	return { title: classRow?.name ?? 'Class Dashboard' };
}

export default async function ClassDashboardPage({ params }: PageProps) {
	const { id } = await params;
	const sessionId = await getSessionId();

	const classRow = await getClassForSession(id, sessionId);
	if (!classRow) {
		notFound();
	}

	const aggregate = await buildClassAggregate(classRow.id);
	const maxCategoryCount =
		aggregate.categoryFrequency.length > 0 ? aggregate.categoryFrequency[0].count : 1;

	return (
		<main className={styles.page}>
			<Link href="/class" className={styles.backLink}>
				← New class batch
			</Link>

			<header className={styles.masthead}>
				<p className={styles.eyebrow}>Class analytics</p>
				<h1>{classRow.name ?? 'Class results'}</h1>
				<p className={styles.subtitle}>
					{aggregate.gradedSubmissions} of {aggregate.totalSubmissions} essays graded ·{' '}
					{aggregate.totalMistakes} mistakes found
				</p>
			</header>

			<ClassQuery classId={classRow.id} />

			{aggregate.totalMistakes === 0 ? (
				<section className={styles.emptyState}>
					<div className={styles.emptyIcon} aria-hidden="true">
						✓
					</div>
					<h2>No mistake patterns yet</h2>
					<p>
						Either grading is still in progress, or this class wrote cleanly across the
						board.
					</p>
				</section>
			) : (
				<>
					<section>
						<h2 className={styles.sectionTitle}>Mistake frequency by category</h2>
						<div className={styles.freqList}>
							{aggregate.categoryFrequency.map((cat) => {
								const widthPct = Math.max(8, (cat.count / maxCategoryCount) * 100);
								const group = categoryGroup(cat.category);

								return (
									<div className={styles.freqRow} key={cat.category}>
										<div className={styles.freqLabelRow}>
											<span className={styles.freqLabel}>{cat.label}</span>
											<span className={styles.freqMeta}>
												{cat.count} occurrence{cat.count !== 1 ? 's' : ''} ·{' '}
												{cat.studentCount} student
												{cat.studentCount !== 1 ? 's' : ''}
											</span>
										</div>
										<div className={styles.freqBarTrack}>
											<div
												className={`${styles.freqBarFill} ${styles[group]}`}
												style={{ width: `${widthPct}%` }}
											/>
										</div>
									</div>
								);
							})}
						</div>
					</section>

					{aggregate.topExcerpts.length > 0 && (
						<section>
							<h2 className={styles.sectionTitle}>Most common patterns</h2>
							<div className={styles.excerptList}>
								{aggregate.topExcerpts.map((excerpt, i) => (
									<article className={styles.excerptCard} key={`${excerpt.category}-${i}`}>
										<div className={styles.excerptHeader}>
											<span className={styles.excerptCategory}>
												{GROUP_LABELS[categoryGroup(excerpt.category)]}
											</span>
											{excerpt.occurrences > 1 && (
												<span className={styles.excerptCount}>
													{excerpt.occurrences}× seen
												</span>
											)}
										</div>
										<p className={styles.excerptQuote}>&ldquo;{excerpt.quote}&rdquo;</p>
										<p className={styles.excerptExplanation}>{excerpt.explanation}</p>
									</article>
								))}
							</div>
						</section>
					)}

					<section>
						<h2 className={styles.sectionTitle}>By student</h2>
						<div className={styles.studentList}>
							{aggregate.students.map((student) => (
								<Link
									href={`/submissions/${student.submissionId}`}
									className={styles.studentRow}
									key={student.submissionId}
								>
									<span className={styles.studentLabel}>{student.label}</span>
									<span
										className={`${styles.studentStatus} ${STATUS_CLASS[student.status]}`}
									>
										{student.status}
									</span>
									<span className={styles.studentCount}>
										{student.mistakeCount} mistake{student.mistakeCount !== 1 ? 's' : ''}
									</span>
								</Link>
							))}
						</div>
					</section>
				</>
			)}
		</main>
	);
}
