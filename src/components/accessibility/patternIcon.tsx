import React from 'react';

export const PatternIcon: React.FC<{ pattern?: string }> = ({ pattern = 'solid' }) => {
  switch (pattern) {
    case 'striped':
      return <span className="text-[10px] opacity-70 font-bold">||</span>;
    case 'checkered':
      return <span className="text-[10px] opacity-70 font-bold">::</span>;
    case 'floral':
      return <span className="text-[10px] opacity-70 font-bold">*</span>;
    case 'solid':
    default:
      return null;
  }
};
