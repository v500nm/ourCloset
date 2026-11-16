'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { exportAllUserData, deleteUserAccount } from '@/services/accountService';
import { Card, Button } from '@/components';

export const AccountDataManagement: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportAllUserData(user?.id || 'guest');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ourcloset-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export data', err);
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      await deleteUserAccount(user?.id);
      router.push('/');
    } catch (err) {
      console.error('Failed to delete account', err);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <Card className="p-6 mt-10 border border-outline-variant/40 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-surface-container flex items-center justify-center text-primary">
          <span className="material-symbols-outlined">shield_person</span>
        </div>
        <div>
          <h3 className="font-display text-headline-md text-primary">Data Ownership & Privacy</h3>
          <p className="text-xs text-on-surface-variant font-body">
            Export a full offline backup of your wardrobe or permanently wipe your local IndexedDB storage.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-2">
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exporting}
          className="flex-1 justify-center text-xs"
        >
          <span className="material-symbols-outlined text-sm mr-1">download</span>
          {exporting ? 'Generating JSON Bundle...' : 'Export Closet Data (JSON)'}
        </Button>

        <div className="flex-1">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 justify-center bg-sindoor text-on-primary hover:bg-sindoor/90 text-xs"
              >
                {deleting ? 'Purging...' : 'Confirm Permanent Deletion'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              className="w-full justify-center text-sindoor border-sindoor/40 hover:bg-sindoor/10 text-xs"
            >
              <span className="material-symbols-outlined text-sm mr-1">delete_forever</span>
              Delete Account & Data
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

