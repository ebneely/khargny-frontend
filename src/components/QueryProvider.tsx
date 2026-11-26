"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useState } from "react";
import { subscribeToGuestAdoption } from "@/lib/api/guest-handover";
import { installBrowseSession, prepareBrowseQueries } from '@/lib/use-browse-session';
import { LikeFeedback } from '@/components/ds/LikeButton';
import { SaveFeedback } from '@/components/ds/SaveFeedback';
import { saveStore } from '@/lib/saves';
import { retryQuery } from '@5argny/core/rules';

export const QueryProvider = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(() => {
    // one quiet retry for the network and the server, none for a 4xx that will not change (src/5argny/rules/loading.ts)
    // a browse list never re-asks the server because a tab came back into focus (the person kept it open), and it stays
    // in memory for half an hour so Back and a revisit show it at once; the public catalogue keeps its own Infinity.
    const client = new QueryClient({ defaultOptions: { queries: { retry: retryQuery, staleTime: 30_000, gcTime: 30 * 60_000, refetchOnWindowFocus: false } } });
    prepareBrowseQueries(client);
    return client;
  });

  useLayoutEffect(() => installBrowseSession(queryClient), [queryClient]);
  useEffect(() => saveStore.subscribeSettled(() => {
    void queryClient.invalidateQueries({ queryKey: ['saved-places'] });
  }), [queryClient]);

  useEffect(() => subscribeToGuestAdoption(() => {
    void queryClient.invalidateQueries({ queryKey: ['saved-places'] });
  }), [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}<LikeFeedback /><SaveFeedback /></QueryClientProvider>
  );
};
