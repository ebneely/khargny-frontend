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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CREATE_PLACE } from '@/graphql/mutations';
import { GET_CITIES } from '@/graphql/queries';
import { Plus } from 'lucide-react';

export function AddCityButton() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [cityName, setCityName] = useState('');
  const [createPlace, { loading }] = useMutation(CREATE_PLACE, {
    refetchQueries: [
      { query: GET_CITIES },
    ],
    awaitRefetchQueries: true,
  });

  const handleAddCity = async () => {
    if (!cityName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a city name',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create a placeholder place with the city name to add the city to the list
      await createPlace({
        variables: {
          input: {
            name: `City: ${cityName.trim()}`,
            city: cityName.trim(),
            placeId: null,
            address: null,
            phone: null,
            description: null,
            age: null,
            price: null,
            rating: null,
            area: null,
            map: null,
          },
        },
      });

      toast({
        title: 'City added',
        description: `City "${cityName.trim()}" has been added. You can now add places to it.`,
      });

      setCityName('');
      setShowDialog(false);
    } catch (error: any) {
      toast({
        title: 'Error adding city',
        description: error.message || 'Failed to add city',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowDialog(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add City
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New City</DialogTitle>
            <DialogDescription>
              Enter a city name to add it to the list. A placeholder place will be created for this city.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="cityName">City Name</Label>
              <Input
                id="cityName"
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                placeholder="Enter city name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCity();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCityName('');
                setShowDialog(false);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleAddCity} disabled={loading || !cityName.trim()}>
              {loading ? 'Adding...' : 'Add City'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
