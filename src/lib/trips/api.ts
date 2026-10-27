'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, ApiError, type HttpMethod } from '@/lib/api/client';
import { fetchApi } from '@/lib/api/transport';
import { getApiBaseUrl } from '@/lib/config';

export type Bilingual = { ar: string; en: string };
export type TripAgency = {
  id: string;
  name: string;
  kind: string;
  verified: boolean;
  rating: number | null;
  ratingCount: number;
};
export type Trip = {
  id: string;
  kind: 'trip' | 'event';
  title: string;
  titleEn: string | null;
  destination: string;
  departureCity: string;
  startsAt: string;
  endsAt: string;
  priceEgp: number;
  seatsTotal: number;
  seatsBooked: number;
  seatsLeft: number;
  monitored: boolean;
  level: 'free' | 'monitored';
  status: string;
  likeCount: number;
  viewCount: number;
  ratingCount: number;
  rating: number | null;
  liked: boolean;
  coverUrl: string | null;
  agency: TripAgency;
  disclaimer: Bilingual | null;
  earlyBird: number | null;
  description?: string;
  includes?: string | null;
};
export type Rating = { id: string; stars: number; comment: string | null; name: string; createdAt: string };
export type Lister = {
  id: string;
  name: string;
  kind: string;
  city: string | null;
  verified: boolean;
  metrics: {
    trips: number;
    likeCount: number;
    viewCount: number;
    ratingCount: number;
    rating: number | null;
    seatsBooked: number;
  };
  trips: Trip[];
};
export type Booking = {
  id: string;
  seats: number;
  status: 'booked' | 'cancelled';
  createdAt: string;
  trip: {
    id: string;
    title: string;
    titleEn: string | null;
    destination: string;
    startsAt: string;
    priceEgp: number;
    monitored: boolean;
  };
  agency: { id: string; name: string };
};
export type RewardStatus = 'waiting' | 'cash_given' | 'confirmed' | 'disputed' | 'reimbursed';
export type Reward = {
  id: string;
  kind: 'early_bird' | 'invite_welcome' | 'invite_bonus';
  amountEgp: number;
  status: RewardStatus;
  sourceBookingId: string | null;
  agencyName: string | null;
  cashGivenAt: string | null;
  answeredAt: string | null;
};
export type Me = {
  user: { id: string; name: string; email: string; kind: string; phone: string };
  profile: { inviteCode: string; nationalIdLast4: string } | null;
  bookings: Booking[];
  rewards: Reward[];
  invites: { code: string; friendsJoined: number; rewardsEarned: number; cap: number; amountEgp: number } | null;
};
export type Message = { id: string; sender: 'customer' | 'agency'; body: string; masked: boolean; createdAt: string };

// The tourism bearer token. shortcut: kept in localStorage like any bearer-token SPA; move to an
// httpOnly cookie on the website's own origin if the site ever ships third-party scripts.
const TOKEN_KEY = 'khg.trips.token';
const INVITE_KEY = 'khg.trips.invite';
const listeners = new Set<() => void>();
const read = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null) => {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {}
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const tripsToken = () => (typeof window === 'undefined' ? null : read(TOKEN_KEY));
export const savedInvite = () => (typeof window === 'undefined' ? null : read(INVITE_KEY));
export const saveInvite = (code: string) => write(INVITE_KEY, code.trim().toUpperCase());

/** `undefined` until the browser has read storage, so pages don't flash the signed-out state. */
export function useTripsToken(): string | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => tripsToken(),
    () => undefined,
  );
}

export function tripsRequest<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const token = tripsToken();
  return apiRequest<T>(method, `/v1/tourism${path}`, {
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

/** Better Auth routes answer unwrapped JSON ({ token, user } or { code, message }). */
async function auth(path: string, body: unknown) {
  const res = await fetchApi(`/v1/tourism/auth/${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.token)
    throw new ApiError(res.status, {
      success: false,
      error: { code: json?.code ?? 'UNKNOWN_ERROR', message: json?.message ?? '' },
      timestamp: '',
    });
  write(TOKEN_KEY, json.token);
  return json;
}

export async function signIn(email: string, password: string) {
  const json = await auth('sign-in/email', { email, password });
  if (json.user?.kind !== 'customer') {
    await signOut(); // a lister account belongs on tourism.5argny.com, not here
    throw new ApiError(403, { success: false, error: { code: 'WRONG_ACCOUNT_KIND', message: '' }, timestamp: '' });
  }
  return json;
}
export const signUp = (input: { name: string; email: string; phone: string; password: string }) =>
  auth('sign-up/email', { ...input, kind: 'customer' });
export async function signOut() {
  const token = tripsToken();
  write(TOKEN_KEY, null);
  if (token)
    await fetchApi('/v1/tourism/auth/sign-out', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
}

export const coverSrc = (trip: Pick<Trip, 'coverUrl'>) =>
  trip.coverUrl ? `${getApiBaseUrl()}${trip.coverUrl}` : undefined;

export function useMe(refetchInterval?: number) {
  const token = useTripsToken();
  const query = useQuery({
    queryKey: ['trips', 'me', token],
    queryFn: async () => {
      try {
        return await tripsRequest<Me>('GET', '/customer/me');
      } catch (error) {
        // An expired or foreign (lister) token: forget it so the visitor can sign in again.
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) write(TOKEN_KEY, null);
        throw error;
      }
    },
    enabled: Boolean(token),
    refetchInterval,
    retry: false,
  });
  return { token, ...query };
}

export const useTrips = (params: { kind?: string; level?: string; q?: string }) =>
  useQuery({
    queryKey: ['trips', 'list', params],
    queryFn: () =>
      tripsRequest<Trip[]>(
        'GET',
        `/trips?${new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][])}`,
      ),
    placeholderData: (previous) => previous,
  });
export const useTrip = (id: string) =>
  useQuery({
    queryKey: ['trips', 'one', id],
    queryFn: () => tripsRequest<Trip>('GET', `/trips/${encodeURIComponent(id)}`),
  });
export const useRatings = (id: string) =>
  useQuery({
    queryKey: ['trips', 'ratings', id],
    queryFn: () => tripsRequest<Rating[]>('GET', `/trips/${encodeURIComponent(id)}/ratings`),
  });
export const useLister = (id: string) =>
  useQuery({
    queryKey: ['trips', 'lister', id],
    queryFn: () => tripsRequest<Lister>('GET', `/listers/${encodeURIComponent(id)}`),
  });

/** The error's code in the visitor's language, falling back to the server's own words. */
export function useErrorText() {
  return useCallback((error: unknown, t: (key: string) => string) => {
    const code = error instanceof ApiError ? error.code : 'UNKNOWN_ERROR';
    const known = t(`tripsErrors.${code}`);
    return known.startsWith('tripsErrors.') ? t('tripsErrors.UNKNOWN_ERROR') : known;
  }, []);
}
