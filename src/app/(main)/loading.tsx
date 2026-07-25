import React from 'react';
import { CardSkeleton, Skeleton } from '@/components/ui/skeleton';

export default function MainLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-3/4 max-w-sm rounded-lg" />
        <Skeleton className="h-4 w-1/2 max-w-xs" />
      </div>

      <div className="border-b border-dashed border-outline-variant/30 w-full" />

      {/* Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
