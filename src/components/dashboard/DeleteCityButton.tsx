'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { DELETE_CITY } from '@/graphql/mutations';
import { GET_CITIES, GET_PLACES_BY_CITY } from '@/graphql/queries';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteCityButtonProps {
  selectedCity: string | null;
  placesCount: number;
  onCityDeleted: () => void;
}

export function DeleteCityButton({
  selectedCity,
  placesCount,
  onCityDeleted,
}: DeleteCityButtonProps) {
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deleteCity, { loading }] = useMutation(DELETE_CITY, {
    // Refetch cities list after deletion; places for the deleted city
    // will no longer be queried since the city is removed.
    refetchQueries: [{ query: GET_CITIES }],
    awaitRefetchQueries: true,
  });

  const handleDelete = async () => {
    if (!selectedCity) return;

    try {
      const result = await deleteCity({
        variables: { city: selectedCity },
      });

      const data = result.data as any;

      if (data?.deleteCity?.success) {
        toast({
          title: 'City deleted successfully',
          description: data.deleteCity.message,
        });
        setShowConfirmDialog(false);
        onCityDeleted();
      } else {
        throw new Error('Delete operation failed');
      }
    } catch (error: any) {
      toast({
        title: 'Error deleting city',
        description: error.message || 'Failed to delete city and its places',
        variant: 'destructive',
      });
    }
  };

  if (!selectedCity) {
    return null;
  }

  return (
    <>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setShowConfirmDialog(true)}
        disabled={loading}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete City
      </Button>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete City
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete <strong>{selectedCity}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This will permanently delete:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground ml-2">
              <li>
                <strong>{placesCount}</strong> place{placesCount !== 1 ? 's' : ''} in{' '}
                {selectedCity}
              </li>
              <li>All associated Google Place Details</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              <strong className="text-destructive">
                This action cannot be undone.
              </strong>
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete City'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
