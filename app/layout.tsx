import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import '@fontsource-variable/fraunces/standard.css';
import '@fontsource-variable/inter';
import './globals.css';
import styles from './layout.module.css';

export const metadata: Metadata = {
	title: {
		default: 'Lexora AI',
		template: '%s — Lexora AI'
	},
	description:
		'Lexora AI gives formative essay feedback and targeted practice from specific mistakes.',
	applicationName: 'Lexora AI',
	other: { 'text-scale': 'scale' }
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body>
				<div className={styles.appShell}>
					<nav className={styles.topbar}>
						<Link href="/" className={styles.wordmark}>
							Lexora <em>AI</em>
						</Link>
						<span className={styles.tagline}>feedback, not a grade</span>
					</nav>
					<div className={styles.pageBody}>{children}</div>
				</div>
			</body>
		</html>
	);
}
