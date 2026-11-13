'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useI18n } from '@/i18n/LocaleProvider';
import { savedInvite, signIn, signOut, signUp, tripsRequest, useErrorText, useMe } from '@/lib/trips/api';
import { TripsShell, useTripText } from '@/components/trips/TripsUi';
import { LoadingSkeleton } from '@/components/explorer/LoadingSkeleton';
import s from '@/components/trips/Trips.module.css';

export default function SignInPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}

function SignIn() {
  const { t } = useI18n();
  const { href } = useTripText();
  const router = useRouter();
  const params = useSearchParams();
  const me = useMe();
  const [authed, setAuthed] = useState<'in' | 'up' | null>(null);
  // Only same-site paths: never bounce a visitor to another origin after sign-in.
  const raw = params.get('next') ?? '';
  const next = raw.startsWith('/') && !raw.startsWith('//') ? raw : href('/trips/me');
  const finish = () => router.push(next);
  const ready = Boolean(authed && me.data?.profile);
  useEffect(() => {
    if (ready) router.push(next);
  }, [ready, next, router]);

  if (me.token === undefined || (me.token && me.isPending) || ready)
    return (
      <TripsShell active="account">
        <LoadingSkeleton count={1} />
      </TripsShell>
    );
  if (me.token && me.data && !me.data.profile) {
    return (
      <TripsShell active="account">
        <ProfileForm
          invite={params.get('invite') ?? savedInvite() ?? ''}
          termsAccepted={authed === 'up'}
          onDone={finish}
        />
      </TripsShell>
    );
  }
  if (me.token && me.data && !ready) {
    return (
      <TripsShell active="account">
        <div className={`${s.panel} ${s.narrow} ${s.form}`}>
          <p style={{ margin: 0, fontWeight: 600 }}>{t('tripsAuth.signedInAs', { name: me.data.user.name })}</p>
          <Link href={next} className={`${s.primary} ${s.wide}`}>
            {t('trips.seeMyTrips')}
          </Link>
          <button type="button" className={`${s.secondary} ${s.wide}`} onClick={() => void signOut()}>
            {t('tripsAuth.signOut')}
          </button>
        </div>
      </TripsShell>
    );
  }
  return (
    <TripsShell active="account">
      <AuthForm initialMode={params.get('mode') === 'up' || params.get('invite') ? 'up' : 'in'} onAuthed={setAuthed} />
    </TripsShell>
  );
}

function AuthForm({ initialMode, onAuthed }: { initialMode: 'in' | 'up'; onAuthed: (mode: 'in' | 'up') => void }) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const queries = useQueryClient();
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (mode === 'up' && !terms) return setError(t('tripsAuth.termsRequired'));
    setBusy(true);
    try {
      if (mode === 'up') await signUp(form);
      else await signIn(form.email, form.password);
      onAuthed(mode);
      await queries.invalidateQueries({ queryKey: ['trips', 'me'] });
    } catch (failure) {
      setError(errorText(failure, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.narrow}>
      <h1 className={s.h1}>{t(mode === 'up' ? 'tripsAuth.signUp' : 'tripsAuth.signIn')}</h1>
      {mode === 'up' && (
        <p className={s.lead} style={{ marginBlockEnd: 'var(--space-5)' }}>
          {t('trips.hero')}
        </p>
      )}
      <form className={`${s.panel} ${s.form}`} onSubmit={submit}>
        {mode === 'up' && (
          <label className={s.field}>
            {t('tripsAuth.name')}
            <input className={s.input} autoComplete="name" required {...field('name')} />
          </label>
        )}
        <label className={s.field}>
          {t('tripsAuth.email')}
          <input className={s.input} type="email" autoComplete="email" dir="ltr" required {...field('email')} />
        </label>
        {mode === 'up' && (
          <label className={s.field}>
            {t('tripsAuth.phone')}
            <input
              className={s.input}
              type="tel"
              autoComplete="tel"
              dir="ltr"
              inputMode="tel"
              required
              {...field('phone')}
            />
          </label>
        )}
        <div className={s.field}>
          <label className={s.field}>
            {t('tripsAuth.password')}
            <input
              className={s.input}
              type="password"
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
              minLength={8}
              required
              aria-describedby={mode === 'up' ? 'password-hint' : undefined}
              {...field('password')}
            />
          </label>
          {mode === 'up' && (
            <span className={s.hint} id="password-hint">
              {t('tripsAuth.passwordHint')}
            </span>
          )}
        </div>
        {mode === 'up' && (
          <label className={s.check}>
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
            <span>{t('tripsAuth.acceptTerms')}</span>
          </label>
        )}
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        <button type="submit" className={`${s.primary} ${s.wide}`} disabled={busy}>
          {t(mode === 'up' ? 'tripsAuth.signUp' : 'tripsAuth.signIn')}
        </button>
        <button
          type="button"
          className={`${s.secondary} ${s.wide}`}
          onClick={() => {
            setMode(mode === 'up' ? 'in' : 'up');
            setError('');
          }}
        >
          {t(mode === 'up' ? 'tripsAuth.haveAccount' : 'tripsAuth.noAccount')}
        </button>
      </form>
    </div>
  );
}

function ProfileForm({
  invite,
  termsAccepted,
  onDone,
}: {
  invite: string;
  termsAccepted: boolean;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const queries = useQueryClient();
  const [nationalId, setNationalId] = useState('');
  const [code, setCode] = useState(invite);
  const [terms, setTerms] = useState(termsAccepted);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!/^\d{14}$/.test(nationalId)) return setError(t('tripsAuth.nationalIdError'));
    if (!terms) return setError(t('tripsAuth.termsRequired'));
    setBusy(true);
    try {
      await tripsRequest('POST', '/customer/profile', {
        nationalId,
        acceptTerms: true,
        ...(code.trim() ? { inviteCode: code.trim().toUpperCase() } : {}),
      });
      await queries.invalidateQueries({ queryKey: ['trips', 'me'] });
      onDone();
    } catch (failure) {
      setError(errorText(failure, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={s.narrow}>
      <h1 className={s.h1}>{t('tripsAuth.finishTitle')}</h1>
      <p className={s.lead} style={{ marginBlockEnd: 'var(--space-5)' }}>
        {t('tripsAuth.finishSub')}
      </p>
      <form className={`${s.panel} ${s.form}`} onSubmit={submit}>
        <label className={s.field}>
          {t('tripsAuth.nationalId')}
          {/* Arabic-Indic digits typed on an Arabic keyboard become Latin digits. */}
          <input
            className={s.input}
            dir="ltr"
            inputMode="numeric"
            autoComplete="off"
            maxLength={14}
            required
            value={nationalId}
            onChange={(e) =>
              setNationalId(e.target.value.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, ''))
            }
          />
        </label>
        <label className={s.field}>
          {t('tripsAuth.inviteCode')}
          <input
            className={s.input}
            dir="ltr"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        {!termsAccepted && (
          <label className={s.check}>
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
            <span>{t('tripsAuth.acceptTerms')}</span>
          </label>
        )}
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        <button type="submit" className={`${s.primary} ${s.wide}`} disabled={busy}>
          {t('tripsAuth.save')}
        </button>
      </form>
    </div>
  );
}
