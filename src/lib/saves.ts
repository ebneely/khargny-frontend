import { apiRequest, type HttpMethod } from "./api/client";
import { saveReadTicket, subscribeSaveReads } from "./save-data";

type RequestSave = (
  method: HttpMethod,
  path: string,
  options?: { body?: unknown },
) => Promise<unknown>;
type Entry = {
  count?: number;
  baseline: boolean;
  confirmed: boolean;
  desired: boolean;
  intent: number;
  changedAt: number;
  readAt: number;
  running?: Promise<void>;
  error?: unknown;
};
type Feedback = {
  kind: "rate" | "busy" | "unavailable";
  seconds: number;
  sequence: number;
};

export function createSaveStore(request: RequestSave = apiRequest) {
  const entries = new Map<string, Entry>();
  const listeners = new Set<() => void>();
  const settledListeners = new Set<() => void>();
  let version = 0;
  let loaded = false;
  let reading: Promise<unknown> | undefined;
  let feedback: Feedback | null = null;
  let feedbackSequence = 0;
  const refuse = (error: unknown) => {
    const refusal = error as { status?: number; retryAfter?: number };
    feedback = {
      sequence: ++feedbackSequence,
      kind:
        refusal.status === 429
          ? "rate"
          : refusal.status === 503
            ? "busy"
            : "unavailable",
      seconds: refusal.retryAfter ?? 0,
    };
  };
  const emit = () => {
    version++;
    for (const listener of listeners) listener();
  };
  const entryFor = (placeId: string) => {
    let entry = entries.get(placeId);
    if (!entry) {
      entry = {
        baseline: false,
        confirmed: false,
        desired: false,
        intent: 0,
        changedAt: 0,
        readAt: 0,
      };
      entries.set(placeId, entry);
    }
    return entry;
  };
  const observe = (path: string, data: unknown, ticket: number) => {
    if (path === "/v1/saved-places" && Array.isArray(data)) {
      const initial = !loaded;
      const ids = new Set(data.map((row) => row.placeId as string));
      for (const placeId of ids) entryFor(placeId);
      for (const [placeId, entry] of entries) {
        if (!initial && (ticket < entry.changedAt || entry.running)) continue;
        entry.confirmed = ids.has(placeId);
        if (initial || !entry.intent) entry.baseline = entry.confirmed;
        if (!entry.intent || !entry.running) entry.desired = entry.confirmed;
      }
      loaded = true;
    }
    const visit = (value: unknown) => {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      const record = value as Record<string, unknown>;
      if (
        typeof record.id === "string" &&
        typeof record.saveCount === "number"
      ) {
        const entry = entryFor(record.id);
        if (
          !entry.running &&
          ticket >= entry.changedAt &&
          ticket >= entry.readAt
        ) {
          entry.count = Math.max(
            0,
            Number.isFinite(record.saveCount) ? record.saveCount : 0,
          );
          entry.baseline = entry.confirmed;
          entry.readAt = ticket;
        }
      }
      Object.values(record).forEach(visit);
    };
    visit(data);
    emit();
  };
  const read = () => {
    if (reading) return reading;
    const ticket = saveReadTicket();
    reading = request("GET", "/v1/saved-places")
      .then((data) => {
        observe("/v1/saved-places", data, ticket);
        return data;
      })
      .finally(() => {
        reading = undefined;
      });
    return reading;
  };
  const start = () =>
    loaded ? Promise.resolve() : read().then(() => undefined);
  const flush = (placeId: string, entry: Entry) => {
    if (entry.running) return entry.running;
    entry.running = Promise.resolve().then(async () => {
      let attempted = false;
      try {
        await start();
        while (entry.desired !== entry.confirmed) {
          attempted = true;
          const desired = entry.desired;
          const intent = entry.intent;
          try {
            await request(
              desired ? "POST" : "DELETE",
              desired ? "/v1/saved-places" : `/v1/saved-places/${placeId}`,
              desired ? { body: { placeId } } : undefined,
            );
            entry.confirmed = desired;
            entry.error = undefined;
            entry.changedAt = saveReadTicket();
          } catch (error) {
            entry.error = error;
            refuse(error);
            if (intent === entry.intent) entry.desired = entry.confirmed;
          }
          emit();
        }
      } catch (error) {
        entry.error = error;
        entry.desired = entry.confirmed;
        refuse(error);
      } finally {
        entry.running = undefined;
        emit();
        if (attempted) for (const listener of settledListeners) listener();
      }
    });
    emit();
    return entry.running;
  };
  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    subscribeSettled: (listener: () => void) => {
      settledListeners.add(listener);
      return () => {
        settledListeners.delete(listener);
      };
    },
    snapshot: () => version,
    start,
    read,
    observe,
    readTicket: saveReadTicket,
    seed: (placeId: string, count?: number) => {
      const entry = entryFor(placeId);
      if (entry.count !== undefined || count === undefined) return;
      entry.count = Math.max(0, Number.isFinite(count) ? count : 0);
      emit();
    },
    saved: (placeId: string) => entryFor(placeId).desired,
    action: (placeId: string) => entries.get(placeId)?.intent ?? 0,
    count: (placeId: string, fallback = 0) => {
      const entry = entryFor(placeId);
      const baseline =
        entry.count ?? Math.max(0, Number.isFinite(fallback) ? fallback : 0);
      return Math.max(
        entry.desired ? 1 : 0,
        baseline + Number(entry.desired) - Number(entry.baseline),
      );
    },
    settled: (placeId: string) => !entries.get(placeId)?.running,
    failure: (placeId: string) => entries.get(placeId)?.error,
    set: (placeId: string, desired: boolean) => {
      const entry = entryFor(placeId);
      if (entry.desired === desired && loaded) {
        if (!entry.running) entry.error = undefined;
        return entry.running ?? Promise.resolve();
      }
      entry.desired = desired;
      entry.error = undefined;
      entry.intent++;
      entry.changedAt = saveReadTicket();
      emit();
      return flush(placeId, entry);
    },
    feedback: () => feedback,
    dismiss: () => {
      feedback = null;
      emit();
    },
  };
}

export const saveStore = createSaveStore();
subscribeSaveReads(({ path, data, ticket }) =>
  saveStore.observe(path, data, ticket),
);
