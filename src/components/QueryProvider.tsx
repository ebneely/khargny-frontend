"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useState } from "react";
import { subscribeToGuestAdoption } from "@/lib/api/guest-handover";
import { installBrowseSession, prepareBrowseQueries } from '@/lib/use-browse-session';
import { LikeFeedback } from '@/components/ds/LikeButton';

export const QueryProvider = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(() => {
    const client = new QueryClient();
    prepareBrowseQueries(client);
    return client;
  });

  useLayoutEffect(() => installBrowseSession(queryClient), [queryClient]);

  useEffect(() => subscribeToGuestAdoption(() => {
    void queryClient.invalidateQueries({ queryKey: ['saved-places'] });
  }), [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}<LikeFeedback /></QueryClientProvider>
  );
};
