'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth, getAdminUserDb, SubscriptionTier, AuthUser } from '@/providers/AuthProvider';
import { AdminForbiddenView } from './AdminForbiddenView';

export default function AdminDashboardPage() {
  const { user, loading, updateSubscription } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);

  useEffect(() => {
    // Read the mock DB from the DOM bridge to avoid exporting massive context
    setUsers(getAdminUserDb());

    // Periodically sync in case of changes in another tab or context
    const interval = setInterval(() => {
      setUsers(getAdminUserDb());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div data-testid="admin-loading" className="min-h-[50vh] flex items-center justify-center">
        <p className="spec-label text-primary animate-pulse">Verifying Admin Access...</p>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <AdminForbiddenView />;
  }

  const handleTierChange = (userId: string, newTier: SubscriptionTier) => {
    updateSubscription(userId, newTier);
    // Optimistically update local view
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, subscriptionTier: newTier } : u))
    );
  };

  const calculateRevenue = () => {
    const prices = { solo: 0, couple: 15, family: 29, max: 99 };
    return users.reduce((acc, user) => acc + (prices[user.subscriptionTier] || 0), 0);
  };

  return (
    <div data-testid="admin-dashboard" className="space-y-8 max-w-7xl mx-auto">
      {/* Header Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800 p-6 rounded-xl border border-slate-700/50 shadow-lg"
        >
          <p className="spec-label text-slate-400 text-xs mb-1">Total Users</p>
          <h3 className="font-display text-4xl text-white font-bold">{users.length}</h3>
          <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">trending_up</span> +12% this
            week
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800 p-6 rounded-xl border border-slate-700/50 shadow-lg"
        >
          <p className="spec-label text-slate-400 text-xs mb-1">Monthly Recurring Revenue</p>
          <h3 className="font-display text-4xl text-white font-bold">${calculateRevenue()}</h3>
          <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">trending_up</span> +5% this
            week
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800 p-6 rounded-xl border border-slate-700/50 shadow-lg"
        >
          <p className="spec-label text-slate-400 text-xs mb-1">Active QuickCodes</p>
          <h3 className="font-display text-4xl text-white font-bold">
            {users.filter((u) => u.quickCode).length}
          </h3>
          <p className="text-slate-400 text-xs mt-2">Codes securing active sessions</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Management Table */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-display text-xl text-white font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">group</span>
            User Management & Access Control
          </h2>
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/50 text-xs uppercase spec-label text-slate-400">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">QuickCode</th>
                    <th className="px-6 py-4">Subscription Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {users.map((u, i) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{u.name}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-mono uppercase ${
                            u.role === 'admin'
                              ? 'bg-secondary/20 text-secondary border border-secondary/30'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-emerald-400 tracking-wider">
                        {u.quickCode || 'NONE'}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={u.subscriptionTier}
                          onChange={(e) =>
                            handleTierChange(u.id, e.target.value as SubscriptionTier)
                          }
                          className="bg-slate-900 border border-slate-700 text-white text-xs rounded focus:ring-secondary focus:border-secondary block w-full p-2 outline-none"
                        >
                          <option value="solo">Solo (Free)</option>
                          <option value="couple">Couple ($15/mo)</option>
                          <option value="family">Family ($29/mo)</option>
                          <option value="max">Max ($99/mo)</option>
                        </select>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Subscription Plan Configurator */}
        <div className="space-y-4">
          <h2 className="font-display text-xl text-white font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">tune</span>
            Plan Configuration
          </h2>
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 shadow-lg p-6 space-y-6">
            <div className="border-l-2 border-slate-600 pl-4">
              <h4 className="text-white font-bold text-sm">
                Solo Tier <span className="text-slate-400 font-normal">($0/mo)</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1">Access: Solo Mode only. Limit 1 user.</p>
            </div>

            <div className="border-l-2 border-emerald-500 pl-4">
              <h4 className="text-white font-bold text-sm">
                Couple Tier <span className="text-emerald-400 font-normal">($15/mo)</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Access: Solo + Couple Modes. Advanced twinning logic enabled.
              </p>
            </div>

            <div className="border-l-2 border-amber-500 pl-4">
              <h4 className="text-white font-bold text-sm">
                Family Tier <span className="text-amber-400 font-normal">($29/mo)</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Access: Solo + Couple + Custom Family Matching.
              </p>
            </div>

            <div className="border-l-2 border-secondary pl-4">
              <h4 className="text-white font-bold text-sm">
                Max Tier <span className="text-secondary font-normal">($99/mo)</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Access: Unlimited everything, early access to NLP features, priority queue.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
