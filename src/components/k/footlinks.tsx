'use client';
// Quiet links for the sidebar and Settings: privacy policy, our social pages (from the site settings, shown only when set),
// the two app stores and the contact email. External links open in a new tab.
import Link from 'next/link';
import { langPrefix } from '@5argny/core/rules/locale';
import { L, Ic } from './icons';
import { useK } from './KProvider';
import { useSiteSettings } from '@/lib/api/hooks/use-site-settings';

const APP_STORE = 'https://apps.apple.com/app/id6752574374';
const GOOGLE_PLAY = 'https://play.google.com/store/apps/details?id=com.khargny.app';
const EMAIL = '5argny.eg@gmail.com';

export function FootLinks({ cls, skipPrivacy }: { cls: string; skipPrivacy?: boolean }) {
  const { lang, c } = useK();
  const { data: s } = useSiteSettings();
  const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;
  const socials = [
    { k: 'instagram', href: s?.instagram, label: 'Instagram', icon: <Ic n="insta" /> },
    { k: 'facebook', href: s?.facebook, label: 'Facebook', icon: <L n="globe" /> },
    { k: 'tiktok', href: s?.tiktok, label: 'TikTok', icon: <L n="music" /> },
    { k: 'youtube', href: s?.youtube, label: 'YouTube', icon: <L n="globe" /> },
  ].filter((x) => x.href);
  return (
    <>
      {skipPrivacy ? null : <Link className={cls} href={`${langPrefix(lang)}/privacy/`}><L n="lock" />{c.sidebar.privacy}</Link>}
      {socials.map((x) => <a key={x.k} className={cls} href={x.href!} {...ext}>{x.icon}{x.label}</a>)}
      <a className={cls} href={APP_STORE} {...ext}><L n="smartphone" />{c.sidebar.getTheApp}: App Store</a>
      <a className={cls} href={GOOGLE_PLAY} {...ext}><L n="smartphone" />{c.sidebar.getTheApp}: Google Play</a>
      <a className={cls} href={`mailto:${EMAIL}`}><L n="message-circle" />{EMAIL}</a>
    </>
  );
}
