import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './not-found.module.css';

export const metadata: Metadata = { title: 'Not found' };

export default function NotFound() {
	return (
		<main className={styles.page}>
			<p className={styles.eyebrow}>404</p>
			<h1>Nothing here</h1>
			<p className={styles.body}>
				This page doesn&rsquo;t exist, or it belongs to a different browser session — results
				are tied to the session that submitted them.
			</p>
			<Link href="/" className={styles.cta}>
				Start a new essay
			</Link>
		</main>
	);
}
