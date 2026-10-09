'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { normalizeBrowseFilters, readBrowseAddress, writeBrowseAddress, type BrowseState } from '@/lib/browse-address';
import { searchTerm } from '@/lib/place-search';

export function useBrowseAddress(initialPage = 1) {
  const params = useSearchParams();
  const router = useRouter();
  const observed = params.toString();
  const [draft, setDraft] = useState(() => {
    const state = readBrowseAddress(observed);
    if (!params.has('page')) state.page = initialPage;
    return { observed, state, settled: searchTerm(state.q) };
  });
  const latest = useRef(draft);
  const writtenSearch = useRef(draft.state.q);
  const pending = useRef(new Set<string>());
  const state = draft.state;
  const publish = (next: BrowseState) => {
    writtenSearch.current = next.q;
    const location = window.location;
    const actual = `${location.pathname}${location.search}${location.hash}`;
    const address = writeBrowseAddress(actual, next);
    if (address === actual) return;
    pending.current.add(new URL(address, location.href).searchParams.toString());
    window.history.replaceState(window.history.state, '', address);
    router.replace(address, { scroll: false });
  };
  const update = (change: Partial<BrowseState>, write = true) => {
    const next = { ...latest.current, state: { ...latest.current.state, ...change } };
    latest.current = next;
    setDraft(next);
    if (write) publish(next.state);
  };

  if (observed !== draft.observed) {
    const actual = typeof window !== 'undefined' && window.location ? new URLSearchParams(window.location.search).toString() : observed;
    let next = { ...draft, observed };
    if (!pending.current.delete(observed) && observed === actual) {
      const restored = readBrowseAddress(observed);
      writtenSearch.current = restored.q;
      next = { observed, state: restored, settled: searchTerm(restored.q) };
      pending.current.clear();
    }
    latest.current = next;
    setDraft(next);
  }

  const term = searchTerm(state.q);
  useEffect(() => {
    const restore = () => {
      const restored = readBrowseAddress(window.location.search);
      writtenSearch.current = restored.q;
      const next = { observed: latest.current.observed, state: restored, settled: searchTerm(restored.q) };
      pending.current.clear();
      latest.current = next;
      setDraft(next);
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  useEffect(() => {
    if (term === draft.settled && state.q === writtenSearch.current) return;
    const timer = setTimeout(() => {
      const next = { ...latest.current, settled: term };
      latest.current = next;
      setDraft(next);
      publish(next.state);
    }, 250);
    return () => clearTimeout(timer);
  }, [state.q, term, draft.settled]);

  return {
    state,
    debouncedSearch: term ? draft.settled : '',
    isDebouncing: Boolean(term) && term !== draft.settled,
    setSearch: (value: string) => update({ q: value, page: 1 }, !value || (!searchTerm(value) && Boolean(latest.current.settled))),
    setCategory: (category: string | null) => update({ category, page: 1 }),
    setArea: (area: string | null) => update({ area, page: 1 }),
    setFilters: (filters: BrowseState['filters'] | ((previous: BrowseState['filters']) => BrowseState['filters'])) => update({ filters: normalizeBrowseFilters(typeof filters === 'function' ? filters(latest.current.state.filters) : filters), page: 1 }),
    clearFilters: () => update({ category: null, filters: {}, page: 1 }),
    setPage: (page: number, push: boolean) => {
      const next = { ...latest.current, state: { ...latest.current.state, page } };
      latest.current = next;
      setDraft(next);
      if (!push) publish(next.state);
      else {
        const { pathname, search, hash } = window.location;
        router.push(writeBrowseAddress(`${pathname}${search}${hash}`, next.state), { scroll: false });
      }
    },
  };
}
