import React from 'react';
import { Card } from '@/components';

export const SharedCloset: React.FC = () => {
  return (
    <Card className="py-4">
      <h3 className="text-sm font-semibold text-slate-200 mb-1">Partner Shared Closet</h3>
      <p className="text-xs text-slate-400">View public wardrobe items shared across your household bond.</p>
    </Card>
  );
};
