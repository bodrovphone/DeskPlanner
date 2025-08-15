import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataMigration } from './DataMigration';

interface DataMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DataMigrationModal({ isOpen, onClose }: DataMigrationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Database Migration</DialogTitle>
          <DialogDescription>
            Transfer your data from browser storage to Supabase cloud database
          </DialogDescription>
        </DialogHeader>
        <DataMigration />
      </DialogContent>
    </Dialog>
  );
}