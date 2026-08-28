'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { submitEssayAction } from '@/app/actions';
import { initialEssayFormState } from '@/app/essay-form-state';
import styles from './EssayComposer.module.css';

const MIN_WORDS = 50;
const MAX_WORDS = 5000;
const PHASE_SWITCH_MS = 3500;

// Fixed locale: this component also renders on the server, and a locale-dependent
// separator would differ between the two passes and trip hydration.
const numberFormat = new Intl.NumberFormat('en-US');

function countWords(text: string): number {
	const trimmed = text.trim();
	return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

export default function EssayComposer() {
	const [state, formAction, isPending] = useActionState(submitEssayAction, initialEssayFormState);
	const [essayText, setEssayText] = useState('');
	const [loadingPhase, setLoadingPhase] = useState<'grading' | 'questions'>('grading');

	// The pipeline is one round trip with no progress events, so the phase label is
	// driven by a timer sized to roughly when Stage 2 takes over from Stage 1.
	useEffect(() => {
		if (!isPending) {
			setLoadingPhase('grading');
			return;
		}
		const timer = setTimeout(() => setLoadingPhase('questions'), PHASE_SWITCH_MS);
		return () => clearTimeout(timer);
	}, [isPending]);

	const wordCount = countWords(essayText);
	const isTooShort = wordCount > 0 && wordCount < MIN_WORDS;
	const isTooLong = wordCount > MAX_WORDS;
	const canSubmit = wordCount >= MIN_WORDS && wordCount <= MAX_WORDS && !isPending;
	const progressWidth = !isPending ? '0%' : loadingPhase === 'grading' ? '45%' : '90%';

	const wordCountClass = [
		styles.wordCount,
		isTooShort || isTooLong ? styles.warn : '',
		wordCount >= MIN_WORDS && !isTooLong ? styles.ok : ''
	]
		.filter(Boolean)
		.join(' ');

	return (
		<main className={styles.page}>
			<header className={styles.masthead}>
				<p className={styles.eyebrow}>Lexora AI feedback</p>
				<h1>
					Paste your essay.
					<br />
					Get feedback, not a grade.
				</h1>
				<p className={styles.lede}>
					The tool reads your essay, flags specific grammar and argument issues with exact
					quotes, then generates practice questions built from your own mistakes.
				</p>
			</header>

			<form action={formAction} className={styles.composer} aria-busy={isPending}>
				<div className={styles.composerFrame}>
					{isPending && <div className={styles.progressBar} style={{ width: progressWidth }} />}

					<textarea
						name="essay"
						value={essayText}
						onChange={(event) => setEssayText(event.target.value)}
						placeholder="Paste your essay here…"
						disabled={isPending}
						spellCheck={false}
						aria-label="Essay text"
					/>

					{isPending && (
						<div className={styles.loadingVeil}>
							<div className={styles.loadingInner}>
								<span className={styles.spinner} aria-hidden="true" />
								<div className={styles.loadingText}>
									<p className={styles.loadingPhase}>
										{loadingPhase === 'grading'
											? 'Grading your essay…'
											: 'Generating practice questions…'}
									</p>
									<p className={styles.loadingSub}>
										{loadingPhase === 'grading'
											? 'Reading for grammar and argument issues'
											: 'Building questions from your specific mistakes'}
									</p>
								</div>
							</div>
						</div>
					)}
				</div>

				<div className={styles.composerFooter}>
					<div className={styles.wordCountGroup}>
						<span className={wordCountClass}>
							{numberFormat.format(wordCount)}
							{' '}/{' '}
							{numberFormat.format(MAX_WORDS)} words
						</span>
						{isTooShort && (
							<span className={styles.countHint}>Need at least {MIN_WORDS} words</span>
						)}
						{isTooLong && (
							<span className={`${styles.countHint} ${styles.warn}`}>
								Over the limit — please trim
							</span>
						)}
					</div>

					<button type="submit" className={styles.submitBtn} disabled={!canSubmit}>
						{isPending ? 'Working…' : 'Get feedback →'}
					</button>
				</div>

				{state.errorMessage && (
					<div className={styles.errorBanner} role="alert">
						<span className={styles.errorIcon} aria-hidden="true">
							!
						</span>
						{state.errorMessage}
					</div>
				)}
			</form>

			<div className={styles.featureRow}>
				<div className={styles.feature}>
					<span className={styles.featureIcon} aria-hidden="true">
						◈
					</span>
					<span>Pinpoints exact quotes</span>
				</div>
				<div className={styles.feature}>
					<span className={styles.featureIcon} aria-hidden="true">
						◈
					</span>
					<span>Grammar &amp; structure</span>
				</div>
				<div className={styles.feature}>
					<span className={styles.featureIcon} aria-hidden="true">
						◈
					</span>
					<span>Personalized practice</span>
				</div>
			</div>

			<Link href="/class" className={styles.classModeLink}>
				<span className={styles.classModeText}>
					<strong>Grading for a class?</strong> Batch-submit essays and get a class-wide
					analytics dashboard.
				</span>
				<span className={styles.classModeArrow} aria-hidden="true">
					→
				</span>
			</Link>
		</main>
	);
}
