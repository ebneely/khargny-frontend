'use client';

import { useLayoutEffect } from 'react';
import { dehydrate, hydrate, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { createBrowseSession } from '@/lib/browse-session';

const storageKey = 'khargny:browse-session:v1';
const historyKey = '__khgBrowse';
const publicKeys = new Set(['cities', 'categories', 'amenities', 'tags', 'places', 'search', 'home']);
const isPublic = (key: QueryKey) => publicKeys.has(String(key[0]));
const fullAddress = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;
const ownedPath = (path: string) => /^\/(ar|en)(\/|$)/.test(path);
let session: ReturnType<typeof createBrowseSession> | undefined;
let initialQueries: unknown;
let installed = false;
let restoring = false;

function browserSession() {
  if (session) return session;
  let saved;
  try {
    saved = JSON.parse(window.sessionStorage.getItem(storageKey) ?? 'null');
  } catch { saved = null; }
  const marker = window.history.state?.[historyKey]?.index;
  session = createBrowseSession(typeof marker === 'number' ? saved?.navigation : undefined);
  const position = typeof marker === 'number' ? marker : 0;
  const address = fullAddress();
  const backForward = window.performance?.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (backForward?.type === 'back_forward') {
    session.traverse(position, address);
    if (session.isBack(address)) initialQueries = saved?.queries;
  } else session.visit(address, position);
  return session;
}

export function prepareBrowseQueries(client: QueryClient) {
  for (const key of publicKeys) client.setQueryDefaults([key], { gcTime: Infinity });
  if (typeof window === 'undefined' || !window.location || !window.history) return;
  browserSession();
  if (initialQueries) hydrate(client, initialQueries);
  if (browserSession().isBack(fullAddress())) {
    window.document?.documentElement?.setAttribute('data-browse-back', 'true');
    for (const query of client.getQueryCache().getAll()) {
      if (isPublic(query.queryKey) && query.state.data !== undefined) client.setQueryData(query.queryKey, query.state.data);
    }
  }
  initialQueries = undefined;
}

export function installBrowseSession(client: QueryClient) {
  if (typeof window === 'undefined' || !window.document?.addEventListener || !window.history?.pushState || installed) return;
  const navigation = browserSession();
  installed = true;
  let active = fullAddress();
  let capturedTarget: string | undefined;
  const history = window.history;
  const push = history.pushState.bind(history);
  const replace = history.replaceState.bind(history);
  const restoration = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  const stamp = () => replace({ ...history.state, [historyKey]: { index: navigation.export().index } }, '', fullAddress());
  stamp();
  const persist = () => {
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify({ navigation: navigation.export(), queries: dehydrate(client, { shouldDehydrateQuery: query => query.state.status === 'success' && isPublic(query.queryKey) }) }));
    } catch {}
  };
  const save = () => {
    if (restoring || !ownedPath(active.split('?')[0])) return;
    navigation.save({ address: active, top: window.scrollY, header: window.document.documentElement.getAttribute('data-header') ?? 'shown', stuck: window.document.querySelector('.khg-browse-sticky')?.getAttribute('data-stuck') === 'true', queryKeys: client.getQueryCache().getAll().filter(query => isPublic(query.queryKey) && query.state.data !== undefined).map(query => [...query.queryKey]) });
    persist();
  };
  const addressFor = (url?: string | URL | null) => {
    const target = new URL(url?.toString() ?? fullAddress(), window.location.href);
    return `${target.pathname}${target.search}${target.hash}`;
  };
  history.pushState = (data, unused, url) => {
    const address = addressFor(url);
    if (capturedTarget !== address) save();
    capturedTarget = undefined;
    window.document.documentElement.removeAttribute('data-browse-back');
    const index = navigation.push(address);
    push({ ...data, [historyKey]: { index } }, unused, url);
    active = address;
    persist();
  };
  history.replaceState = (data, unused, url) => {
    const address = addressFor(url);
    const index = navigation.replace(address);
    replace({ ...data, [historyKey]: { index } }, unused, url);
    active = address;
  };
  const pop = (event: PopStateEvent) => {
    save();
    const address = fullAddress();
    const index = event.state?.[historyKey]?.index;
    if (typeof index === 'number') navigation.traverse(index, address);
    else navigation.visit(address, navigation.export().index + 1);
    if (navigation.isBack(address)) window.document.documentElement.setAttribute('data-browse-back', 'true');
    else window.document.documentElement.removeAttribute('data-browse-back');
    active = address;
    for (const query of client.getQueryCache().getAll()) {
      if (isPublic(query.queryKey) && query.state.data !== undefined) client.setQueryData(query.queryKey, query.state.data);
    }
  };
  const click = (event: MouseEvent) => {
    const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchor.target === '_blank') return;
    const target = new URL(anchor.href, window.location.href);
    if (target.origin === window.location.origin && target.pathname !== window.location.pathname) {
      save();
      capturedTarget = `${target.pathname}${target.search}${target.hash}`;
    }
  };
  const hash = () => {
    const address = fullAddress();
    if (address === active) return;
    save();
    navigation.push(address);
    active = address;
    stamp();
    persist();
  };
  window.document.addEventListener('click', click, true);
  window.addEventListener('popstate', pop, true);
  window.addEventListener('pagehide', save);
  window.addEventListener('hashchange', hash);
  return () => {
    save();
    history.pushState = push;
    history.replaceState = replace;
    history.scrollRestoration = restoration;
    window.document.removeEventListener('click', click, true);
    window.removeEventListener('popstate', pop, true);
    window.removeEventListener('pagehide', save);
    window.removeEventListener('hashchange', hash);
    installed = false;
  };
}

export function useBrowseRestore(path?: string, search?: string) {
  useLayoutEffect(() => {
    if (!path || typeof window === 'undefined' || !window.location || !window.document?.documentElement || window.location.pathname.replace(/\/$/, '') !== path.replace(/\/$/, '')) return;
    if (search !== undefined && new URLSearchParams(window.location.search).toString() !== search) return;
    const snapshot = browserSession().restore(fullAddress());
    if (!snapshot) return;
    restoring = true;
    const root = window.document.documentElement;
    root.setAttribute('data-browse-restoring', 'true');
    root.setAttribute('data-header', snapshot.header);
    root.style.setProperty('--header-offset', snapshot.header === 'hidden' ? '0px' : window.getComputedStyle(root).getPropertyValue('--site-header-height'));
    window.document.querySelector('.khg-browse-sticky')?.setAttribute('data-stuck', String(snapshot.stuck));
    const behavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo({ top: snapshot.top, behavior: 'instant' });
    root.style.scrollBehavior = behavior;
    if (window.Event && window.dispatchEvent) window.dispatchEvent(new window.Event('khg:browse-restore'));
    const settled = () => {
      root.removeAttribute('data-browse-restoring');
      root.removeAttribute('data-browse-back');
    };
    if (window.requestAnimationFrame) window.requestAnimationFrame(() => window.requestAnimationFrame(settled));
    else settled();
    restoring = false;
  });
}

export function backToBrowse(router: { back: () => void; push: (href: string) => void }, fallback: string) {
  if (typeof window !== 'undefined' && window.location && window.history && browserSession().hasPrevious()) router.back();
  else router.push(fallback);
}
