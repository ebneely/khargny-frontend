import type { Metadata } from 'next';
import { currentLocale, pageMetadata } from '@/lib/seo';
import { SettingsView } from '@/components/k/settings';

// Settings (spec 002 T026): Appearance, Language, Help. No account, sign-in or notification switches (owner rule).
export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  return pageMetadata({ path: '/settings', locale, title: locale === 'ar' ? 'الإعدادات' : 'Settings', description: locale === 'ar' ? 'الشكل واللغة والمساعدة.' : 'Appearance, language and help.', noindex: true });
}
export default function SettingsPage() { return <SettingsView />; }
