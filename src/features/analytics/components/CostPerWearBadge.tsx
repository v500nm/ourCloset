import React from 'react';
import { Badge } from '@/components';
import { calculateCostPerWear } from '@/utils';

export const CostPerWearBadge: React.FC<{ price?: number; wearCount: number }> = ({ price, wearCount }) => {
  const cpwText = calculateCostPerWear(price, wearCount);
  return <Badge variant="default">CPW: {cpwText}</Badge>;
};
