<script lang="ts">
	import type { PageData } from './$types';
	import type { Mistake, MistakeCategory } from '$lib/types/db';
	import { CATEGORY_LABELS, GROUP_LABELS, categoryGroup } from '$lib/categories';

	let { data }: { data: PageData } = $props();
	let { submission, mistakes } = $derived(data);

	type Group = { category: MistakeCategory; items: Mistake[] };

	function buildGroups(items: Mistake[], group: 'grammar' | 'structure'): Group[] {
		const byCategory = new Map<MistakeCategory, Mistake[]>();
		for (const m of items) {
			if (categoryGroup(m.category) !== group) continue;
			const existing = byCategory.get(m.category);
			if (existing) existing.push(m);
			else byCategory.set(m.category, [m]);
		}
		return Array.from(byCategory.entries()).map(([cat, its]) => ({ category: cat, items: its }));
	}

	let grammarGroups = $derived(buildGroups(mistakes, 'grammar'));
	let structureGroups = $derived(buildGroups(mistakes, 'structure'));
	let hasMistakes = $derived(mistakes.length > 0);
</script>

<svelte:head>
	<title>Results — Lexora AI</title>
</svelte:head>

<main class="page">
	<a href="/" class="back-link">← New essay</a>

	{#if submission.status === 'failed'}
		<section class="state-block failed">
			<p class="state-eyebrow">Grading failed</p>
			<h1>Couldn't finish grading</h1>
			<p class="state-body">
				{submission.error_message ?? 'The AI service returned an unexpected error.'}
			</p>
			<a href="/" class="cta-btn">Try again</a>
		</section>

	{:else if submission.status === 'pending'}
		<section class="state-block pending">
			<span class="spinner" aria-hidden="true"></span>
			<h1>Still grading…</h1>
			<p class="state-body">Refresh in a moment — feedback will appear here once ready.</p>
		</section>

	{:else}
		<header class="masthead">
			<p class="eyebrow">Your feedback</p>
			<h1>{hasMistakes ? 'Here\'s what to work on' : 'Clean writing'}</h1>
		</header>

		<!-- Overall feedback as pull-quote -->
		<blockquote class="overall-feedback">
			{submission.overall_feedback}
		</blockquote>

		{#if !hasMistakes}
			<section class="empty-state">
				<div class="empty-icon" aria-hidden="true">✓</div>
				<h2>No major issues found</h2>
				<p>This essay reads cleanly. Nothing significant to flag.</p>
			</section>
		{:else}
			<div class="mistake-groups">

				{#if grammarGroups.length > 0}
					<section class="group-section">
						<header class="group-header">
							<span class="group-dot grammar" aria-hidden="true"></span>
							<h2 class="group-label">{GROUP_LABELS.grammar}</h2>
							<span class="group-count">{grammarGroups.reduce((s, g) => s + g.items.length, 0)}</span>
						</header>

						{#each grammarGroups as group (group.category)}
							<div class="category-block">
								<h3 class="category-label grammar">{CATEGORY_LABELS[group.category]}</h3>
								<ul class="mistake-list">
									{#each group.items as mistake (mistake.id)}
										<li class="mistake-item">
											<p class="mistake-quote">&ldquo;{mistake.quote}&rdquo;</p>
											<p class="mistake-explanation">{mistake.explanation}</p>
										</li>
									{/each}
								</ul>
							</div>
						{/each}
					</section>
				{/if}

				{#if grammarGroups.length > 0 && structureGroups.length > 0}
					<hr class="group-divider" />
				{/if}

				{#if structureGroups.length > 0}
					<section class="group-section">
						<header class="group-header">
							<span class="group-dot structure" aria-hidden="true"></span>
							<h2 class="group-label">{GROUP_LABELS.structure}</h2>
							<span class="group-count">{structureGroups.reduce((s, g) => s + g.items.length, 0)}</span>
						</header>

						{#each structureGroups as group (group.category)}
							<div class="category-block">
								<h3 class="category-label structure">{CATEGORY_LABELS[group.category]}</h3>
								<ul class="mistake-list">
									{#each group.items as mistake (mistake.id)}
										<li class="mistake-item">
											<p class="mistake-quote">&ldquo;{mistake.quote}&rdquo;</p>
											<p class="mistake-explanation">{mistake.explanation}</p>
										</li>
									{/each}
								</ul>
							</div>
						{/each}
					</section>
				{/if}

			</div>
		{/if}

		<a href="/submissions/{submission.id}/practice" class="practice-cta">
			<span class="cta-label">
				{hasMistakes ? 'Practice these categories' : 'Try practice questions'}
			</span>
			<span class="cta-arrow" aria-hidden="true">→</span>
		</a>
	{/if}
</main>

<style>
	.page {
		flex: 1;
		width: 100%;
		max-width: var(--max-width);
		margin: 0 auto;
		padding: clamp(2rem, 5vw, 3.5rem) 1.5rem 5rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		text-decoration: none;
		font-size: 0.85rem;
		color: var(--ink-500);
		transition: color 0.14s ease;
		align-self: flex-start;
		margin-bottom: -0.5rem;
	}

	.back-link:hover {
		color: var(--accent-600);
	}

	/* ─── Masthead ─── */

	.masthead {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.eyebrow {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--accent-600);
	}

	h1 {
		font-size: clamp(1.85rem, 4.5vw, 2.5rem);
	}

	/* ─── Overall feedback ─── */

	.overall-feedback {
		margin: 0;
		padding: 1.35rem 1.6rem;
		background: var(--paper-50);
		border: 1px solid var(--paper-300);
		border-left: 3.5px solid var(--accent-500);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		box-shadow: var(--shadow-sm);
		font-family: var(--font-serif);
		font-style: italic;
		font-size: 1.12rem;
		line-height: 1.65;
		color: var(--ink-800);
	}

	/* ─── Empty state ─── */

	.empty-state {
		text-align: center;
		padding: 3.5rem 2rem;
		background: var(--good-100);
		border: 1px solid var(--good-200);
		border-radius: var(--radius-lg);
	}

	.empty-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 52px;
		height: 52px;
		border-radius: 50%;
		background: var(--good-500);
		color: white;
		font-size: 1.4rem;
		margin-bottom: 1rem;
	}

	.empty-state h2 {
		font-size: 1.4rem;
		margin-bottom: 0.4rem;
	}

	.empty-state p {
		color: var(--good-700);
		font-size: 0.95rem;
	}

	/* ─── Mistake groups ─── */

	.mistake-groups {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.group-divider {
		border: none;
		border-top: 1.5px dashed var(--paper-300);
		margin: 0.25rem 0;
	}

	.group-section {
		padding: 1.5rem 0;
	}

	.group-header {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-bottom: 1.25rem;
	}

	.group-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.group-dot.grammar { background: var(--accent-500); }
	.group-dot.structure { background: var(--ink-500); }

	.group-label {
		font-family: var(--font-sans);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		margin: 0;
		flex: 1;
	}

	.group-label + .group-count {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--ink-400);
		background: var(--paper-200);
		padding: 0.15em 0.55em;
		border-radius: 99px;
		font-variant-numeric: tabular-nums;
	}

	.category-block {
		margin-bottom: 1.5rem;
	}

	.category-block:last-child {
		margin-bottom: 0;
	}

	.category-label {
		font-size: 0.95rem;
		font-weight: 600;
		margin-bottom: 0.85rem;
		font-family: var(--font-sans);
	}

	.category-label.grammar { color: var(--accent-700); }
	.category-label.structure { color: var(--ink-700); }

	.mistake-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.mistake-item {
		background: var(--paper-50);
		border: 1px solid var(--paper-300);
		border-radius: var(--radius-md);
		padding: 1rem 1.1rem 1rem 1.4rem;
		position: relative;
		box-shadow: var(--shadow-sm);
	}

	/* The editorial left-margin mark */
	.mistake-item::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3.5px;
		border-radius: var(--radius-sm) 0 0 var(--radius-sm);
		background: var(--paper-300);
	}

	.mistake-item + .mistake-item {
		margin-top: 0.6rem;
	}

	.mistake-item::before {
		background: var(--accent-300, var(--paper-300));
	}

	.mistake-quote {
		font-family: var(--font-serif);
		font-style: italic;
		font-size: 1rem;
		color: var(--ink-800);
		line-height: 1.55;
		margin-bottom: 0.45rem;
	}

	.mistake-explanation {
		font-size: 0.88rem;
		color: var(--ink-600);
		line-height: 1.55;
	}

	/* ─── CTA ─── */

	.practice-cta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		text-decoration: none;
		background: var(--ink-900);
		color: var(--paper-50);
		padding: 1.1rem 1.5rem;
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-md);
		transition:
			background-color 0.16s ease,
			transform 0.12s ease,
			box-shadow 0.16s ease;
		margin-top: 0.5rem;
	}

	.practice-cta:hover {
		background: var(--accent-700);
		box-shadow: var(--shadow-lg);
		transform: translateY(-1px);
	}

	.cta-label {
		font-weight: 600;
		font-size: 1rem;
	}

	.cta-arrow {
		font-size: 1.1rem;
		transition: transform 0.16s ease;
	}

	.practice-cta:hover .cta-arrow {
		transform: translateX(4px);
	}

	/* ─── State blocks (failed / pending) ─── */

	.state-block {
		text-align: center;
		padding: 4rem 2rem;
		border-radius: var(--radius-lg);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.state-block.failed {
		background: var(--bad-100);
		border: 1px solid var(--bad-200);
	}

	.state-block.pending {
		background: var(--paper-50);
		border: 1px solid var(--paper-300);
	}

	.state-eyebrow {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--bad-600);
	}

	.state-block h1 {
		font-size: 1.7rem;
	}

	.state-body {
		color: var(--ink-600);
		max-width: 44ch;
		font-size: 0.95rem;
		line-height: 1.6;
	}

	.cta-btn {
		display: inline-block;
		text-decoration: none;
		background: var(--ink-900);
		color: var(--paper-50);
		padding: 0.7rem 1.5rem;
		border-radius: var(--radius-md);
		font-weight: 600;
		font-size: 0.92rem;
		margin-top: 0.5rem;
		transition: background-color 0.16s;
	}

	.cta-btn:hover { background: var(--accent-700); }

	.spinner {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 2.5px solid var(--paper-300);
		border-top-color: var(--accent-600);
		animation: spin 0.85s linear infinite;
		margin-bottom: 0.5rem;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
