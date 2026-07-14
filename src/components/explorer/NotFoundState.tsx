'use client';

import { FileQuestion } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface NotFoundStateProps {
  backHref: string;
  backLabel: string;
}

export function NotFoundState({ backHref, backLabel }: NotFoundStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <FileQuestion className="w-16 h-16 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-2">Place not found</h2>
      <p className="text-muted-foreground mb-6">This place doesn&apos;t exist or has been removed.</p>
      <Link href={backHref}>
        <Button variant="outline">{backLabel}</Button>
      </Link>
    </div>
  );
}
