import { getApiBaseUrl } from '@/lib/config';

const MARKER = 'khg_guest_adopted';
const DEADLINE_MS = 2500;

type HandoverOptions = {
  storage: () => Pick<Storage, 'getItem' | 'setItem'> | null;
  fetch: typeof fetch;
  onAdopted?: () => void;
};

export function createGuestHandoverGate(options: HandoverOptions): () => Promise<void> {
  let pending: Promise<void> | undefined;

  return () => {
    if (pending) return pending;
    pending = new Promise<void>((resolve) => {
      const controller = new AbortController();
      let expired = false;
      const timer = setTimeout(() => {
        expired = true;
        controller.abort();
        resolve();
      }, DEADLINE_MS);

      const attempt = async () => {
        let storage: ReturnType<HandoverOptions['storage']> = null;
        try {
          storage = options.storage();
          if (storage && storage.getItem(MARKER) !== null) return;
        } catch {
          storage = null;
        }

        const handover = await options.fetch(`${getApiBaseUrl({ browser: false })}/v1/guest/handover`, {
          method: 'POST', credentials: 'include', cache: 'no-store', signal: controller.signal,
        });
        if (expired || !handover.ok) return;
        const payload = await handover.json();
        if (expired || payload?.success !== true) return;
        const token = payload.data?.token;
        if (token !== null && (typeof token !== 'string' || !token)) return;

        if (token !== null) {
          const adoption = await options.fetch('/api/v1/guest/adopt', {
            method: 'POST', credentials: 'include', cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }), signal: controller.signal,
          });
          if (expired || !adoption.ok) return;
          const adopted = await adoption.json();
          if (expired || adopted?.success !== true || adopted.data?.adopted !== true) return;
        }

        try {
          storage?.setItem(MARKER, '1');
        } catch {}
        if (token !== null) options.onAdopted?.();
      };

      void attempt().catch(() => {}).finally(() => {
        clearTimeout(timer);
        resolve();
      });
    });
    return pending;
  };
}

const adoptionListeners = new Set<() => void>();
let adoptedOnPage = false;

export function subscribeToGuestAdoption(listener: () => void): () => void {
  adoptionListeners.add(listener);
  if (adoptedOnPage) listener();
  return () => { adoptionListeners.delete(listener); };
}

export const waitForGuestHandover = createGuestHandoverGate({
  storage: () => window.localStorage,
  fetch: (...args) => fetch(...args),
  onAdopted: () => {
    adoptedOnPage = true;
    for (const listener of adoptionListeners) listener();
  },
});
