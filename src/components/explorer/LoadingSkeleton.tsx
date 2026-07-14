import { Skeleton } from '@/components/ui/skeleton';

interface LoadingSkeletonProps {
  count?: number;
  variant?: 'card' | 'detail';
}

export function LoadingSkeleton({ count = 6, variant = 'card' }: LoadingSkeletonProps) {
  if (variant === 'detail') {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-[300px] shrink-0 space-y-3">
          <Skeleton className="aspect-square rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
