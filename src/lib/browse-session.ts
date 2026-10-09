export type BrowseSnapshot = { address: string; top: number; header: string; stuck: boolean; queryKeys?: readonly unknown[][] };
type SavedSession = { index: number; entries: [number, string][]; snapshots: BrowseSnapshot[] };

export function createBrowseSession(saved?: SavedSession) {
  let index = saved?.index ?? 0;
  const entries = new Map<number, string>(saved?.entries);
  const snapshots = new Map((saved?.snapshots ?? []).map(snapshot => [snapshot.address, snapshot]));
  let pending: string | undefined;
  return {
    visit(address: string, position = index) { index = position; entries.set(index, address); },
    push(address: string) {
      index += 1;
      for (const position of entries.keys()) if (position >= index) entries.delete(position);
      entries.set(index, address);
      pending = undefined;
      return index;
    },
    replace(address: string) {
      if (entries.get(index) !== address) pending = undefined;
      entries.set(index, address);
      return index;
    },
    save(snapshot: BrowseSnapshot) {
      snapshots.delete(snapshot.address);
      snapshots.set(snapshot.address, snapshot);
    },
    traverse(position: number, address: string) {
      pending = position < index && entries.get(position) === address ? address : undefined;
      index = position;
      entries.set(index, address);
    },
    restore(address: string) {
      if (pending !== address) return;
      pending = undefined;
      return snapshots.get(address);
    },
    isBack(address: string) { return pending === address; },
    hasPrevious() { return /^\/(ar|en)(\/|$)/.test(entries.get(index - 1) ?? ''); },
    export(): SavedSession { return { index, entries: [...entries], snapshots: [...snapshots.values()] }; },
  };
}
