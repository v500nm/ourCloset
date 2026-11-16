import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AdminLayout from '@/app/admin/layout';
import { AdminForbiddenView } from '@/app/admin/AdminForbiddenView';
import AdminDashboardPage from '@/app/admin/page';

// Router mock
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock AuthProvider state variable
let mockAuthState = {
  user: null as { id: string; email: string; name: string; role: 'admin' | 'user'; subscriptionTier: string } | null,
  loading: false,
  updateSubscription: vi.fn(),
};

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: () => mockAuthState,
  getAdminUserDb: () => [
    { id: 'u-1', email: 'admin@ourcloset.com', name: 'Admin', role: 'admin', subscriptionTier: 'max', quickCode: 'ADMINX' },
  ],
}));

describe('Admin Route Gating & 403 Forbidden Screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AdminForbiddenView Component', () => {
    it('renders the 403 Forbidden screen with atelier warning and recovery actions', () => {
      const html = renderToStaticMarkup(React.createElement(AdminForbiddenView));

      expect(html).toContain('data-testid="admin-403-forbidden"');
      expect(html).toContain('403');
      expect(html).toContain('Admin Role Required');
      expect(html).toContain('Sign In as Admin');
      expect(html).toContain('Return Home');
    });
  });

  describe('AdminLayout Component', () => {
    it('renders loading state when auth state is resolving', () => {
      mockAuthState = {
        user: null,
        loading: true,
        updateSubscription: vi.fn(),
      };

      const html = renderToStaticMarkup(
        React.createElement(AdminLayout, null, React.createElement('div', null, 'Secret Content'))
      );

      expect(html).toContain('Verifying Credentials...');
      expect(html).not.toContain('Secret Content');
    });

    it('renders 403 Forbidden screen when unauthenticated (user is null)', () => {
      mockAuthState = {
        user: null,
        loading: false,
        updateSubscription: vi.fn(),
      };

      const html = renderToStaticMarkup(
        React.createElement(AdminLayout, null, React.createElement('div', null, 'Secret Content'))
      );

      expect(html).toContain('data-testid="admin-403-forbidden"');
      expect(html).not.toContain('Secret Content');
    });

    it('renders 403 Forbidden screen when user is logged in as a non-admin role', () => {
      mockAuthState = {
        user: {
          id: 'u-regular',
          email: 'user@example.com',
          name: 'Regular User',
          role: 'user',
          subscriptionTier: 'solo',
        },
        loading: false,
        updateSubscription: vi.fn(),
      };

      const html = renderToStaticMarkup(
        React.createElement(AdminLayout, null, React.createElement('div', null, 'Secret Content'))
      );

      expect(html).toContain('data-testid="admin-403-forbidden"');
      expect(html).not.toContain('Secret Content');
    });

    it('renders admin layout with children when authenticated as an admin', () => {
      mockAuthState = {
        user: {
          id: 'u-admin',
          email: 'admin@ourcloset.com',
          name: 'Chief Admin',
          role: 'admin',
          subscriptionTier: 'max',
        },
        loading: false,
        updateSubscription: vi.fn(),
      };

      const html = renderToStaticMarkup(
        React.createElement(AdminLayout, null, React.createElement('div', null, 'Secret Content'))
      );

      expect(html).toContain('Secret Content');
      expect(html).not.toContain('data-testid="admin-403-forbidden"');
    });
  });

  describe('AdminDashboardPage Component', () => {
    it('renders 403 screen if user does not possess admin role', () => {
      mockAuthState = {
        user: {
          id: 'u-user',
          email: 'member@ourcloset.com',
          name: 'Member',
          role: 'user',
          subscriptionTier: 'couple',
        },
        loading: false,
        updateSubscription: vi.fn(),
      };

      const html = renderToStaticMarkup(React.createElement(AdminDashboardPage));

      expect(html).toContain('data-testid="admin-403-forbidden"');
      expect(html).not.toContain('data-testid="admin-dashboard"');
    });

    it('renders admin dashboard metrics when user is verified admin', () => {
      mockAuthState = {
        user: {
          id: 'u-admin',
          email: 'admin@ourcloset.com',
          name: 'Chief Admin',
          role: 'admin',
          subscriptionTier: 'max',
        },
        loading: false,
        updateSubscription: vi.fn(),
      };

      const html = renderToStaticMarkup(React.createElement(AdminDashboardPage));

      expect(html).toContain('data-testid="admin-dashboard"');
      expect(html).toContain('Monthly Recurring Revenue');
      expect(html).toContain('User Management &amp; Access Control');
    });
  });
});
