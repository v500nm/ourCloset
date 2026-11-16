import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccountDataManagement } from '@/features/household/components/AccountDataManagement';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock useAuth
vi.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'u-test', name: 'Test User', email: 'test@example.com' },
    loading: false,
    isGuest: false,
  }),
}));

describe('AccountDataManagement Component', () => {
  it('renders data export and account deletion controls properly', () => {
    const html = renderToStaticMarkup(React.createElement(AccountDataManagement));

    expect(html).toContain('Data Ownership');
    expect(html).toContain('Export Closet Data (JSON)');
    expect(html).toContain('Delete Account');
  });
});
