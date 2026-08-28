'use client';

import { useActionState, useEffect, useState } from 'react';
import { submitClassBatchAction } from '@/app/class/actions';
import { initialClassFormState } from '@/app/class/class-form-state';
import styles from './ClassComposer.module.css';

const MIN_ESSAYS = 2;
const MAX_ESSAYS = 10;
const MIN_WORDS = 50;
const PHASE_SWITCH_MS = 4500;

type EssaySlot = { id: number; text: string };

function countWords(text: string): number {
	const trimmed = text.trim();
	return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

export default function ClassComposer() {
	const [state, formAction, isPending] = useActionState(
		submitClassBatchAction,
		initialClassFormState
	);

	// Stable ids rather than array indices: removing a slot from the middle would otherwise
	// make React reuse the wrong textarea and move the caret.
	const [essays, setEssays] = useState<EssaySlot[]>([
		{ id: 0, text: '' },
		{ id: 1, text: '' }
	]);
	const [nextId, setNextId] = useState(2);
	const [className, setClassName] = useState('');
	const [loadingPhase, setLoadingPhase] = useState<'grading' | 'aggregating'>('grading');

	useEffect(() => {
		if (!isPending) {
			setLoadingPhase('grading');
			return;
		}
		const timer = setTimeout(() => setLoadingPhase('aggregating'), PHASE_SWITCH_MS);
		return () => clearTimeout(timer);
	}, [isPending]);

	const validEssayCount = essays.filter((essay) => countWords(essay.text) >= MIN_WORDS).length;
	const filledEssayCount = essays.filter((essay) => essay.text.trim().length > 0).length;
	const canSubmit =
		validEssayCount >= MIN_ESSAYS && validEssayCount === filledEssayCount && !isPending;

	function addEssay() {
		if (essays.length >= MAX_ESSAYS) return;
		setEssays((current) => [...current, { id: nextId, text: '' }]);
		setNextId((id) => id + 1);
	}

	function removeEssay(id: number) {
		if (essays.length <= MIN_ESSAYS) return;
		setEssays((current) => current.filter((essay) => essay.id !== id));
	}

	function updateEssay(id: number, text: string) {
		setEssays((current) =>
			current.map((essay) => (essay.id === id ? { ...essay, text } : essay))
		);
	}

	return (
		<main className={styles.page}>
			<header className={styles.masthead}>
				<p className={styles.eyebrow}>For teachers</p>
				<h1>Grade a whole class at once</h1>
				<p className={styles.lede}>
					Paste {MIN_ESSAYS}–{MAX_ESSAYS} essays. Each one is graded individually, then you
					get a class-wide dashboard of mistake patterns — plus a question box to ask things
					like <em>&ldquo;what grammar issues are most common?&rdquo;</em> in plain English.
				</p>
			</header>

			<form action={formAction} className={styles.classForm} aria-busy={isPending}>
				<label className={styles.classNameField}>
					<span className={styles.fieldLabel}>
						Class name <span className={styles.optional}>(optional)</span>
					</span>
					<input
						type="text"
						name="className"
						value={className}
						onChange={(event) => setClassName(event.target.value)}
						placeholder="e.g. Period 3 — Persuasive Essays"
						disabled={isPending}
					/>
				</label>

				<div className={styles.essayList}>
					{essays.map((essay, i) => {
						const words = countWords(essay.text);
						const isTooShort = words > 0 && words < MIN_WORDS;

						return (
							<div className={styles.essayBlock} key={essay.id}>
								<div className={styles.essayBlockHeader}>
									<span className={styles.essayLabel}>Student {i + 1}</span>
									<span
										className={`${styles.essayWordcount} ${
											isTooShort ? styles.warn : ''
										}`}
									>
										{words} word{words !== 1 ? 's' : ''}
										{isTooShort && (
											<span className={styles.warnText}> — needs {MIN_WORDS}+</span>
										)}
									</span>
									{essays.length > MIN_ESSAYS && (
										<button
											type="button"
											className={styles.removeBtn}
											onClick={() => removeEssay(essay.id)}
											disabled={isPending}
											aria-label={`Remove Student ${i + 1}`}
										>
											×
										</button>
									)}
								</div>
								<textarea
									name="essay"
									value={essay.text}
									onChange={(event) => updateEssay(essay.id, event.target.value)}
									placeholder={`Paste Student ${i + 1}'s essay here…`}
									disabled={isPending}
									spellCheck={false}
									rows={8}
								/>
							</div>
						);
					})}
				</div>

				{essays.length < MAX_ESSAYS && (
					<button
						type="button"
						className={styles.addBtn}
						onClick={addEssay}
						disabled={isPending}
					>
						+ Add another essay ({essays.length}/{MAX_ESSAYS})
					</button>
				)}

				<div className={styles.formFooter}>
					<span className={styles.footerStatus}>
						{validEssayCount} of {essays.length} ready
					</span>
					<button type="submit" className={styles.submitBtn} disabled={!canSubmit}>
						{isPending ? 'Working…' : `Grade ${essays.length} essays →`}
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

				{isPending && (
					<div className={styles.loadingOverlay}>
						<div className={styles.loadingCard}>
							<span className={styles.spinner} aria-hidden="true" />
							<div className={styles.loadingText}>
								<p className={styles.loadingPhase}>
									{loadingPhase === 'grading'
										? `Grading ${essays.length} essays in parallel…`
										: 'Aggregating class patterns…'}
								</p>
								<p className={styles.loadingSub}>
									This can take 15–30 seconds for a full class
								</p>
							</div>
						</div>
					</div>
				)}
			</form>
		</main>
	);
}
