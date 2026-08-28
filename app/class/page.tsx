import type { Metadata } from 'next';
import ClassComposer from '@/components/ClassComposer';

export const metadata: Metadata = {
	title: 'Class Mode'
};

export default function ClassPage() {
	return <ClassComposer />;
}
