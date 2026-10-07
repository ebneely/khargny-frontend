'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { searchAddress, searchTerm } from '@/lib/place-search';

function useSearchDebounce(value: string) {
  const term = searchTerm(value);
  const [state, setState] = useState({ input: value, settled: '', pending: Boolean(term) });
  if (state.input !== value) setState({ input: value, settled: state.settled, pending: Boolean(term) });
  useEffect(() => {
    const timer = setTimeout(() => setState({ input: value, settled: term, pending: false }), 250);
    return () => clearTimeout(timer);
  }, [term, value]);
  return { debouncedSearch: term ? state.settled : '', isDebouncing: Boolean(term) && (state.input !== value || state.pending) };
}

export function useDebouncedSearch(value: string): string {
  return useSearchDebounce(value).debouncedSearch;
}

export function useSearchTerm() {
  const addressSearch = useSearchParams().get('q') ?? '';
  const [search, setSearchState] = useState(addressSearch);
  const latestInput = useRef(search);
  const lastObserved = useRef(addressSearch);
  const lastWritten = useRef<string | null>(null);
  const debounce = useSearchDebounce(search);

  const writeAddress = useCallback((value: string) => {
    const { pathname, search: query, hash } = window.location;
    const address = `${pathname}${query}${hash}`;
    const next = searchAddress(address, value);
    if (next === address) return;
    lastWritten.current = value;
    window.history.replaceState(window.history.state, '', next);
  }, []);

  const restoreAddress = useCallback((value: string, navigation: boolean) => {
    const actual = new URLSearchParams(window.location.search).get('q') ?? '';
    if (!navigation && value !== actual) return;
    if (!navigation && value === lastWritten.current) {
      lastObserved.current = value;
      lastWritten.current = null;
      return;
    }
    if (!navigation && value === lastObserved.current) return;
    lastWritten.current = null;
    lastObserved.current = actual;
    latestInput.current = actual;
    setSearchState(actual);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) restoreAddress(addressSearch, false); });
    return () => { active = false; };
  }, [addressSearch, restoreAddress]);

  useEffect(() => {
    const restore = () => restoreAddress(new URLSearchParams(window.location.search).get('q') ?? '', true);
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [restoreAddress]);

  const setSearch = useCallback((value: string) => {
    latestInput.current = value;
    setSearchState(value);
    if (!searchTerm(value)) writeAddress('');
  }, [writeAddress]);

  useEffect(() => {
    if (!debounce.isDebouncing && latestInput.current === search && searchTerm(search) === debounce.debouncedSearch) {
      writeAddress(debounce.debouncedSearch);
    }
  }, [search, debounce.debouncedSearch, debounce.isDebouncing, writeAddress]);

  return { search, setSearch, ...debounce };
}
