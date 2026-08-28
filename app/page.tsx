import type { Metadata } from 'next';
import EssayComposer from '@/components/EssayComposer';

export const metadata: Metadata = {
	title: 'Essay Feedback & Practice'
};

export default function HomePage() {
	return <EssayComposer />;
}
