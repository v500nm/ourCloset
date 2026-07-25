'use client';

import React from 'react';

export const Skeleton: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-outline-variant/30 rounded ${className}`}
    />
  );
};

export const CardSkeleton: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  return (
    <div className={`bg-surface/50 backdrop-blur-sm border border-outline-variant/20 rounded-2xl p-6 ${className}`}>
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
};
