'use client';

import { HomeRails } from './Home';
import { useHomeDiscovery } from './useHomeDiscovery';
import { Toast } from '@/components/ds/Toast';

export function HomeRailsClient() {
  const discovery = useHomeDiscovery();
  return <><HomeRails d={discovery} />{discovery.toast && <Toast message={discovery.toast.message} tone={discovery.toast.tone} onDismiss={discovery.dismissToast} />}</>;
}
