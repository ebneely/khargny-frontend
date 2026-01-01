import { DashboardContent } from '@/components/dashboard/DashboardContent';

/**
 * Dashboard Page (Server Component)
 *
 * ARCHITECTURE:
 * - Server component that renders dashboard content
 * - Dashboard authorization is handled by layout.tsx guard
 * - Backend is single source of truth for authentication
 */
export default async function DashboardPage() {
  return <DashboardContent />;
}

