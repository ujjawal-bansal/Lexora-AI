<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	const MIN_ESSAYS = 2;
	const MAX_ESSAYS = 10;
	const MIN_WORDS = 50;

	let essays = $state<string[]>(['', '']);
	let className = $state('');
	let isSubmitting = $state(false);
	let loadingPhase = $state<'grading' | 'aggregating'>('grading');
	let loadingTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		if (form?.essays) {
			essays = form.essays;
		}
		if (form?.className !== undefined) {
			className = form.className ?? '';
		}
	});

	function wordCount(text: string): number {
		const trimmed = text.trim();
		return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
	}

	let validEssayCount = $derived(essays.filter((e) => wordCount(e) >= MIN_WORDS).length);
	let canSubmit = $derived(
		validEssayCount >= MIN_ESSAYS && validEssayCount === essays.filter((e) => e.trim()).length && !isSubmitting
	);

	function addEssay() {
		if (essays.length < MAX_ESSAYS) essays = [...essays, ''];
	}

	function removeEssay(index: number) {
		if (essays.length > MIN_ESSAYS) essays = essays.filter((_, i) => i !== index);
	}

	function handleSubmit() {
		isSubmitting = true;
		loadingPhase = 'grading';
		loadingTimer = setTimeout(() => {
			loadingPhase = 'aggregating';
		}, 4500);

		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			isSubmitting = false;
			clearTimeout(loadingTimer);
		};
	}
</script>

<svelte:head>
	<title>Class Mode — Lexora AI</title>
</svelte:head>

<main class="page">
	<header class="masthead">
		<p class="eyebrow">For teachers</p>
		<h1>Grade a whole class at once</h1>
		<p class="lede">
			Paste {MIN_ESSAYS}–{MAX_ESSAYS} essays. Each one is graded individually, then you get a
			class-wide dashboard of mistake patterns — plus a question box to ask things like
			<em>"what grammar issues are most common?"</em> in plain English.
		</p>
	</header>

	<form method="POST" use:enhance={handleSubmit} class="class-form" aria-busy={isSubmitting}>
		<label class="class-name-field">
			<span class="field-label">Class name <span class="optional">(optional)</span></span>
			<input
				type="text"
				name="className"
				bind:value={className}
				placeholder="e.g. Period 3 — Persuasive Essays"
				disabled={isSubmitting}
			/>
		</label>

		<div class="essay-list">
			{#each essays as _, i (i)}
				{@const wc = wordCount(essays[i])}
				{@const isTooShort = wc > 0 && wc < MIN_WORDS}
				<div class="essay-block">
					<div class="essay-block-header">
						<span class="essay-label">Student {i + 1}</span>
						<span class="essay-wordcount" class:warn={isTooShort}>
							{wc} word{wc !== 1 ? 's' : ''}
							{#if isTooShort}<span class="warn-text">— needs {MIN_WORDS}+</span>{/if}
						</span>
						{#if essays.length > MIN_ESSAYS}
							<button
								type="button"
								class="remove-btn"
								onclick={() => removeEssay(i)}
								disabled={isSubmitting}
								aria-label="Remove Student {i + 1}"
							>
								&times;
							</button>
						{/if}
					</div>
					<textarea
						name="essay"
						bind:value={essays[i]}
						placeholder="Paste Student {i + 1}'s essay here…"
						disabled={isSubmitting}
						spellcheck="false"
						rows="8"
					></textarea>
				</div>
			{/each}
		</div>

		{#if essays.length < MAX_ESSAYS}
			<button type="button" class="add-btn" onclick={addEssay} disabled={isSubmitting}>
				+ Add another essay ({essays.length}/{MAX_ESSAYS})
			</button>
		{/if}

		<div class="form-footer">
			<span class="footer-status">
				{validEssayCount} of {essays.length} ready
			</span>
			<button type="submit" class="submit-btn" disabled={!canSubmit}>
				{isSubmitting ? 'Working…' : `Grade ${essays.length} essays →`}
			</button>
		</div>

		{#if form?.errorMessage}
			<div class="error-banner" role="alert">
				<span class="error-icon" aria-hidden="true">!</span>
				{form.errorMessage}
			</div>
		{/if}

		{#if isSubmitting}
			<div class="loading-overlay">
				<div class="loading-card">
					<span class="spinner" aria-hidden="true"></span>
					<div class="loading-text">
						<p class="loading-phase">
							{loadingPhase === 'grading'
								? `Grading ${essays.length} essays in parallel…`
								: 'Aggregating class patterns…'}
						</p>
						<p class="loading-sub">This can take 15–30 seconds for a full class</p>
					</div>
				</div>
			</div>
		{/if}
	</form>
</main>

<style>
	.page {
		flex: 1;
		width: 100%;
		max-width: 820px;
		margin: 0 auto;
		padding: clamp(2.5rem, 6vw, 4.5rem) 1.5rem clamp(2rem, 4vw, 3.5rem);
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
		font-size: clamp(1.9rem, 4.5vw, 2.6rem);
		max-width: 16ch;
	}

	.lede {
		max-width: 58ch;
		color: var(--ink-600);
		font-size: 0.98rem;
		line-height: 1.65;
	}

	.lede em {
		color: var(--ink-800);
		font-style: italic;
	}

	.class-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		position: relative;
	}

	.class-name-field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.field-label {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--ink-700);
	}

	.optional {
		font-weight: 400;
		color: var(--ink-400);
	}

	.class-name-field input {
		border: 1.5px solid var(--paper-300);
		border-radius: var(--radius-md);
		padding: 0.65rem 0.9rem;
		font-size: 0.95rem;
		font-family: var(--font-sans);
		background: var(--paper-50);
		color: var(--ink-800);
		transition: border-color 0.16s ease;
	}

	.class-name-field input:focus {
		outline: none;
		border-color: var(--accent-400);
		box-shadow: 0 0 0 3px var(--accent-100);
	}

	.essay-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.essay-block {
		border: 1.5px solid var(--paper-300);
		border-radius: var(--radius-lg);
		background: var(--paper-50);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
		transition: border-color 0.16s ease;
	}

	.essay-block:focus-within {
		border-color: var(--accent-400);
		box-shadow: var(--shadow-md);
	}

	.essay-block-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.7rem 1rem;
		background: var(--paper-100);
		border-bottom: 1px solid var(--paper-300);
	}

	.essay-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--ink-700);
	}

	.essay-wordcount {
		font-size: 0.78rem;
		color: var(--ink-500);
		margin-left: auto;
		font-variant-numeric: tabular-nums;
	}

	.essay-wordcount.warn {
		color: var(--bad-600);
	}

	.warn-text {
		font-style: italic;
	}

	.remove-btn {
		appearance: none;
		border: none;
		background: transparent;
		color: var(--ink-400);
		font-size: 1.2rem;
		line-height: 1;
		cursor: pointer;
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
		transition: color 0.14s, background 0.14s;
	}

	.remove-btn:hover {
		color: var(--bad-600);
		background: var(--bad-100);
	}

	textarea {
		display: block;
		width: 100%;
		border: none;
		background: transparent;
		padding: 1rem 1.1rem;
		font-family: var(--font-serif);
		font-size: 0.98rem;
		line-height: 1.6;
		color: var(--ink-800);
		resize: vertical;
		min-height: 140px;
	}

	textarea:focus {
		outline: none;
	}

	textarea::placeholder {
		color: var(--ink-400);
		font-style: italic;
	}

	.add-btn {
		appearance: none;
		align-self: flex-start;
		border: 1.5px dashed var(--paper-400);
		background: transparent;
		color: var(--ink-600);
		font-size: 0.88rem;
		font-weight: 600;
		padding: 0.6rem 1.1rem;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: border-color 0.14s, color 0.14s, background 0.14s;
	}

	.add-btn:hover:not(:disabled) {
		border-color: var(--accent-500);
		color: var(--accent-700);
		background: var(--accent-100);
	}

	.add-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.form-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding-top: 0.25rem;
	}

	.footer-status {
		font-size: 0.85rem;
		color: var(--ink-500);
		font-variant-numeric: tabular-nums;
	}

	.submit-btn {
		appearance: none;
		border: none;
		background: var(--ink-900);
		color: var(--paper-50);
		font-size: 0.92rem;
		font-weight: 600;
		padding: 0.75rem 1.6rem;
		border-radius: var(--radius-md);
		cursor: pointer;
		box-shadow: var(--shadow-sm);
		transition: background-color 0.16s ease, transform 0.1s ease, box-shadow 0.16s ease;
		white-space: nowrap;
	}

	.submit-btn:hover:not(:disabled) {
		background: var(--accent-700);
		box-shadow: var(--shadow-md);
		transform: translateY(-1px);
	}

	.submit-btn:disabled {
		background: var(--paper-300);
		color: var(--ink-400);
		cursor: not-allowed;
		box-shadow: none;
	}

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
	}

	.loading-overlay {
		position: fixed;
		inset: 0;
		background: rgba(33, 28, 20, 0.35);
		backdrop-filter: blur(2px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
	}

	.loading-card {
		display: flex;
		align-items: center;
		gap: 1.1rem;
		background: var(--paper-50);
		padding: 1.5rem 1.8rem;
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		max-width: 380px;
	}

	.spinner {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
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
		gap: 0.25rem;
	}

	.loading-phase {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--ink-800);
	}

	.loading-sub {
		font-size: 0.82rem;
		color: var(--ink-500);
	}

	@media (max-width: 540px) {
		.form-footer {
			flex-direction: column;
			align-items: stretch;
		}
		.submit-btn {
			width: 100%;
		}
	}
</style>
