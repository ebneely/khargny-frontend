import type { Metadata } from 'next';
import { localeOf, pageMetadata } from '@/lib/seo';
import { SettingsView } from '@/components/k/settings';

// Settings (spec 002 T026): Appearance, Language, Help. No account, sign-in or notification switches (owner rule).
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const locale = localeOf((await params).lang);
  return pageMetadata({ path: '/settings', locale, title: locale === 'ar' ? 'الإعدادات' : 'Settings', description: locale === 'ar' ? 'الشكل واللغة والمساعدة.' : 'Appearance, language and help.', noindex: true });
}
export default function SettingsPage() { return <SettingsView />; }
