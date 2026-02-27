import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabaseClient } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, RefreshCw } from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface FloorPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FloorPlanModal({ isOpen, onClose }: FloorPlanModalProps) {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const floorPlanUrl = currentOrg?.floorPlanUrl ?? null;

  async function handleUpload(file: File) {
    if (!currentOrg) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please upload a JPEG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File must be under 5MB.');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${currentOrg.id}/plan.${ext}`;

      // Remove old file if exists (different extension)
      if (floorPlanUrl) {
        const oldPath = floorPlanUrl.split('/floor-plans/')[1];
        if (oldPath && oldPath !== path) {
          await supabaseClient.storage.from('floor-plans').remove([oldPath]);
        }
      }

      const { error: uploadError } = await supabaseClient.storage
        .from('floor-plans')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseClient.storage
        .from('floor-plans')
        .getPublicUrl(path);

      // Add cache-buster to force reload
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabaseClient
        .from('organizations')
        .update({ floor_plan_url: urlWithCacheBust })
        .eq('id', currentOrg.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete() {
    if (!currentOrg || !floorPlanUrl) return;

    setDeleting(true);
    setError(null);

    try {
      const pathPart = floorPlanUrl.split('/floor-plans/')[1]?.split('?')[0];
      if (pathPart) {
        await supabaseClient.storage.from('floor-plans').remove([pathPart]);
      }

      const { error: updateError } = await supabaseClient
        .from('organizations')
        .update({ floor_plan_url: null })
        .eq('id', currentOrg.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[90vw] max-h-[90vh] p-4">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-semibold">Floor Plan</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 mb-3">
            {error}
          </div>
        )}

        {floorPlanUrl ? (
          <div className="flex flex-col gap-3">
            <div
              className="flex items-center justify-center overflow-auto"
              style={{ height: 'calc(90vh - 160px)' }}
            >
              <img
                src={floorPlanUrl}
                alt="Floor Plan"
                className="w-auto h-auto max-w-full max-h-full object-contain rounded-md shadow-lg"
                style={{ minWidth: '400px', minHeight: '300px' }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                {uploading ? 'Uploading...' : 'Replace'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {deleting ? 'Removing...' : 'Remove'}
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            <Upload className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium mb-1">Upload your floor plan</p>
            <p className="text-sm text-muted-foreground mb-4">
              Drag & drop or click to select. JPEG, PNG, WebP, or GIF up to 5MB.
            </p>
            <Button variant="outline" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Choose File'}
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onFileChange}
        />
      </DialogContent>
    </Dialog>
  );
}
