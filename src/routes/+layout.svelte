<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/styles/theme.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
	<nav class="topbar">
		<a href="/" class="topbar-wordmark">Lexora <em>AI</em></a>
		<span class="topbar-tagline">feedback, not a grade</span>
	</nav>
	<div class="page-body">
		{@render children()}
	</div>
</div>

<style>
	.app-shell {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	.page-body {
		flex: 1;
		display: flex;
		flex-direction: column;
	}
</style>
