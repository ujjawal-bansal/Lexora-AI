<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let essayText = $state('');

	$effect(() => {
		if (form?.essayText !== undefined) {
			essayText = form.essayText;
		}
	});

	let isSubmitting = $state(false);
	let loadingPhase = $state<'grading' | 'questions'>('grading');
	let loadingTimer: ReturnType<typeof setTimeout> | undefined;

	const MIN_WORDS = 50;
	const MAX_WORDS = 5000;

	let wordCount = $derived(
		essayText.trim().length === 0 ? 0 : essayText.trim().split(/\s+/).length
	);
	let isTooShort = $derived(wordCount > 0 && wordCount < MIN_WORDS);
	let isTooLong = $derived(wordCount > MAX_WORDS);
	let canSubmit = $derived(wordCount >= MIN_WORDS && wordCount <= MAX_WORDS && !isSubmitting);

	// Progress bar width 0→50% during grading, 50→95% during questions
	let progressWidth = $derived(
		!isSubmitting ? '0%' : loadingPhase === 'grading' ? '45%' : '90%'
	);

	function handleSubmit() {
		isSubmitting = true;
		loadingPhase = 'grading';
		loadingTimer = setTimeout(() => {
			loadingPhase = 'questions';
		}, 3500);

		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			isSubmitting = false;
			clearTimeout(loadingTimer);
		};
	}
</script>

<svelte:head>
	<title>Essay Feedback &amp; Practice — Lexora AI</title>
</svelte:head>

<main class="page">
	<header class="masthead">
		<p class="eyebrow">Lexora AI feedback</p>
		<h1>Paste your essay.<br />Get feedback, not a grade.</h1>
		<p class="lede">
			The tool reads your essay, flags specific grammar and argument issues with exact quotes,
			then generates practice questions built from your own mistakes.
		</p>
	</header>

	<form method="POST" use:enhance={handleSubmit} class="composer" aria-busy={isSubmitting}>
		<div class="composer-frame" class:focused-frame={!isSubmitting}>
			{#if isSubmitting}
				<div class="progress-bar" style="width: {progressWidth}"></div>
			{/if}

			<textarea
				name="essay"
				bind:value={essayText}
				placeholder="Paste your essay here…"
				disabled={isSubmitting}
				spellcheck="false"
				aria-label="Essay text"
			></textarea>

			{#if isSubmitting}
				<div class="loading-veil">
					<div class="loading-inner">
						<span class="spinner" aria-hidden="true"></span>
						<div class="loading-text">
							<p class="loading-phase">
								{loadingPhase === 'grading'
									? 'Grading your essay…'
									: 'Generating practice questions…'}
							</p>
							<p class="loading-sub">
								{loadingPhase === 'grading'
									? 'Reading for grammar and argument issues'
									: 'Building questions from your specific mistakes'}
							</p>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<div class="composer-footer">
			<div class="word-count-group">
				<span class="word-count" class:warn={isTooShort || isTooLong} class:ok={wordCount >= MIN_WORDS && !isTooLong}>
					{wordCount.toLocaleString()}&thinsp;/&thinsp;{MAX_WORDS.toLocaleString()} words
				</span>
				{#if isTooShort}
					<span class="count-hint">Need at least {MIN_WORDS} words</span>
				{:else if isTooLong}
					<span class="count-hint warn">Over the limit — please trim</span>
				{/if}
			</div>

			<button type="submit" class="submit-btn" disabled={!canSubmit}>
				{isSubmitting ? 'Working…' : 'Get feedback →'}
			</button>
		</div>

		{#if form?.errorMessage}
			<div class="error-banner" role="alert">
				<span class="error-icon" aria-hidden="true">!</span>
				{form.errorMessage}
			</div>
		{/if}
	</form>

	<div class="feature-row">
		<div class="feature">
			<span class="feature-icon" aria-hidden="true">◈</span>
			<span>Pinpoints exact quotes</span>
		</div>
		<div class="feature">
			<span class="feature-icon" aria-hidden="true">◈</span>
			<span>Grammar &amp; structure</span>
		</div>
		<div class="feature">
			<span class="feature-icon" aria-hidden="true">◈</span>
			<span>Personalized practice</span>
		</div>
	</div>

	<a href="/class" class="class-mode-link">
		<span class="class-mode-text">
			<strong>Grading for a class?</strong> Batch-submit essays and get a class-wide analytics dashboard.
		</span>
		<span class="class-mode-arrow" aria-hidden="true">→</span>
	</a>
</main>

<style>
	.page {
		flex: 1;
		width: 100%;
		max-width: var(--max-width);
		margin: 0 auto;
		padding: clamp(2.75rem, 6vw, 4.5rem) 1.5rem clamp(2rem, 4vw, 3.5rem);
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.masthead {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.eyebrow {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--accent-600);
	}

	h1 {
		font-size: clamp(2.1rem, 5.5vw, 3rem);
		max-width: 13ch;
		font-variation-settings: 'SOFT' 0, 'WONK' 0;
	}

	.lede {
		max-width: 50ch;
		color: var(--ink-600);
		font-size: 1rem;
		line-height: 1.65;
	}

	/* ─── Composer ─── */

	.composer {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.composer-frame {
		position: relative;
		border-radius: var(--radius-lg);
		background: var(--paper-50);
		border: 1.5px solid var(--paper-300);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.composer-frame:focus-within {
		border-color: var(--accent-400);
		box-shadow: var(--shadow-md), 0 0 0 3px var(--accent-100);
	}

	.progress-bar {
		position: absolute;
		top: 0;
		left: 0;
		height: 2.5px;
		background: linear-gradient(90deg, var(--accent-400), var(--accent-600));
		border-radius: 0 2px 0 0;
		transition: width 1.8s cubic-bezier(0.25, 1, 0.5, 1);
		z-index: 1;
	}

	textarea {
		display: block;
		width: 100%;
		min-height: clamp(280px, 40vh, 420px);
		resize: vertical;
		border: none;
		background: transparent;
		padding: 1.5rem 1.6rem;
		font-family: var(--font-serif);
		font-size: 1.08rem;
		line-height: 1.7;
		color: var(--ink-800);
		caret-color: var(--accent-600);
	}

	textarea::placeholder {
		color: var(--ink-400);
		font-style: italic;
	}

	textarea:focus {
		outline: none;
	}

	textarea:disabled {
		opacity: 0.6;
	}

	.loading-veil {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(253, 251, 246, 0.85);
		backdrop-filter: blur(3px);
		-webkit-backdrop-filter: blur(3px);
	}

	.loading-inner {
		display: flex;
		align-items: center;
		gap: 1.1rem;
	}

	.spinner {
		flex-shrink: 0;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		border: 2.5px solid var(--accent-200);
		border-top-color: var(--accent-600);
		animation: spin 0.85s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.loading-text {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.loading-phase {
		font-size: 0.98rem;
		font-weight: 600;
		color: var(--ink-800);
	}

	.loading-sub {
		font-size: 0.82rem;
		color: var(--ink-500);
	}

	/* ─── Composer footer ─── */

	.composer-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0 0.25rem;
	}

	.word-count-group {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}

	.word-count {
		font-size: 0.82rem;
		font-variant-numeric: tabular-nums;
		color: var(--ink-500);
		transition: color 0.15s;
	}

	.word-count.ok { color: var(--good-600); }
	.word-count.warn { color: var(--bad-600); }

	.count-hint {
		font-size: 0.8rem;
		color: var(--ink-500);
		font-style: italic;
	}

	.count-hint.warn { color: var(--bad-600); }

	.submit-btn {
		appearance: none;
		border: none;
		background: var(--ink-900);
		color: var(--paper-50);
		font-size: 0.9rem;
		font-weight: 600;
		letter-spacing: 0.01em;
		padding: 0.7rem 1.5rem;
		border-radius: var(--radius-md);
		cursor: pointer;
		box-shadow: 0 1px 3px rgba(33, 28, 20, 0.18), 0 1px 0 rgba(255,255,255,0.08) inset;
		transition:
			background-color 0.16s ease,
			transform 0.1s ease,
			box-shadow 0.16s ease;
		white-space: nowrap;
	}

	.submit-btn:hover:not(:disabled) {
		background: var(--accent-700);
		box-shadow: var(--shadow-md);
		transform: translateY(-1px);
	}

	.submit-btn:active:not(:disabled) {
		transform: translateY(0);
		box-shadow: var(--shadow-sm);
	}

	.submit-btn:disabled {
		background: var(--paper-300);
		color: var(--ink-400);
		cursor: not-allowed;
		box-shadow: none;
	}

	/* ─── Error ─── */

	.error-banner {
		display: flex;
		align-items: flex-start;
		gap: 0.65rem;
		padding: 0.85rem 1.1rem;
		background: var(--bad-100);
		color: var(--bad-700);
		border: 1px solid var(--bad-200);
		border-radius: var(--radius-md);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.error-icon {
		flex-shrink: 0;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: 1.5px solid currentColor;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 700;
		margin-top: 1px;
	}

	/* ─── Feature hints ─── */

	.feature-row {
		display: flex;
		gap: 1.75rem;
		flex-wrap: wrap;
		margin-top: 0.25rem;
	}

	.feature {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.82rem;
		color: var(--ink-500);
	}

	.feature-icon {
		color: var(--accent-500);
		font-size: 0.65rem;
	}

	/* ─── Class mode link ─── */

	.class-mode-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		text-decoration: none;
		background: var(--paper-50);
		border: 1px dashed var(--paper-400);
		border-radius: var(--radius-md);
		padding: 0.9rem 1.2rem;
		margin-top: 0.5rem;
		transition: border-color 0.16s ease, background-color 0.16s ease;
	}

	.class-mode-link:hover {
		border-color: var(--accent-500);
		border-style: solid;
		background: var(--accent-100);
	}

	.class-mode-text {
		font-size: 0.88rem;
		color: var(--ink-600);
		line-height: 1.45;
	}

	.class-mode-text strong {
		color: var(--ink-800);
	}

	.class-mode-arrow {
		flex-shrink: 0;
		color: var(--accent-600);
		font-size: 1rem;
		transition: transform 0.16s ease;
	}

	.class-mode-link:hover .class-mode-arrow {
		transform: translateX(3px);
	}

	/* ─── Responsive ─── */

	@media (max-width: 540px) {
		.composer-footer {
			flex-direction: column;
			align-items: stretch;
		}

		.submit-btn {
			width: 100%;
			text-align: center;
		}

		.feature-row {
			gap: 1rem;
		}
	}
</style>
