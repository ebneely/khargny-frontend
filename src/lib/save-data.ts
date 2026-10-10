type SaveRead = { path: string; data: unknown; ticket: number };
let sequence = 0;
const listeners = new Set<(read: SaveRead) => void>();

export const saveReadTicket = () => ++sequence;
export const subscribeSaveReads = (listener: (read: SaveRead) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export function publishSaveRead(path: string, data: unknown, ticket: number) {
  if (typeof window !== "undefined")
    for (const listener of listeners) listener({ path, data, ticket });
}
