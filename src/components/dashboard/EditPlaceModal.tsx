'use client';

import { useState, useEffect } from 'react';
import { Place } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@apollo/client/react';
import { GET_CITIES } from '@/graphql/queries';

interface EditPlaceModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Place>) => void;
  place: Place | null;
  isBulk?: boolean;
  selectedCount?: number;
}

export function EditPlaceModal({
  open,
  onClose,
  onSave,
  place,
  isBulk = false,
  selectedCount = 0,
}: EditPlaceModalProps) {
  const [formData, setFormData] = useState<Partial<Place>>({});
  const { data: citiesData } = useQuery<{ cities: string[] }>(GET_CITIES);
  const cities = citiesData?.cities || [];

  useEffect(() => {
    if (place && !isBulk) {
      setFormData(place);
    } else if (isBulk) {
      setFormData({});
    }
  }, [place, isBulk]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty values for bulk edit
    const updates = isBulk
      ? Object.fromEntries(
          Object.entries(formData).filter(([_, value]) => value !== '' && value !== undefined)
        )
      : formData;

    if (place) {
      onSave(place.id, updates);
    }
    handleClose();
  };

  const handleClose = () => {
    setFormData({});
    onClose();
  };

  const handleChange = (field: keyof Place, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[95vh]">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">
            {isBulk ? `Bulk Edit ${selectedCount} Places` : `Edit ${place?.name}`}
          </DialogTitle>
          {isBulk && (
            <p className="text-xs text-muted-foreground">
              Only fill in the fields you want to update. Empty fields will not be changed.
            </p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-1.5">
          <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
            <div>
              <Label htmlFor="name" className="text-xs mb-0.5 block">
                Name
              </Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className="h-7 text-sm"
                placeholder={isBulk ? 'Leave empty to keep unchanged' : ''}
              />
            </div>

            <div>
              <Label htmlFor="city" className="text-xs mb-0.5 block">
                City
              </Label>
              <Select
                value={formData.city || undefined}
                onValueChange={(value) => handleChange('city', value)}
              >
                <SelectTrigger className="h-7 text-sm">
                  <SelectValue placeholder={isBulk ? 'Leave empty' : 'Select city'} />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {cities.map((city: string) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="placeId" className="text-xs mb-0.5 block">
                Place ID
              </Label>
              <Input
                id="placeId"
                value={formData.placeId || ''}
                onChange={(e) => handleChange('placeId', e.target.value)}
                className="h-7 text-sm"
                placeholder={isBulk ? 'Leave empty' : ''}
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-xs mb-0.5 block">
                Phone
              </Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="h-7 text-sm"
                placeholder={isBulk ? 'Leave empty' : ''}
              />
            </div>

            <div>
              <Label htmlFor="area" className="text-xs mb-0.5 block">
                Area
              </Label>
              <Input
                id="area"
                value={formData.area || ''}
                onChange={(e) => handleChange('area', e.target.value)}
                className="h-7 text-sm"
                placeholder={isBulk ? 'Leave empty' : ''}
              />
            </div>

            <div>
              <Label htmlFor="price" className="text-xs mb-0.5 block">
                Price
              </Label>
              <Input
                id="price"
                value={formData.price || ''}
                onChange={(e) => handleChange('price', e.target.value)}
                className="h-7 text-sm"
                placeholder={isBulk ? 'Leave empty' : ''}
              />
            </div>

            <div>
              <Label htmlFor="rating" className="text-xs mb-0.5 block">
                Rating
              </Label>
              <Input
                id="rating"
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={formData.rating || ''}
                onChange={(e) =>
                  handleChange('rating', e.target.value ? parseFloat(e.target.value) : '')
                }
                className="h-7 text-sm"
                placeholder={isBulk ? 'Leave empty' : ''}
              />
            </div>

            <div>
              <Label htmlFor="age" className="text-xs mb-0.5 block">
                Age
              </Label>
              <Input
                id="age"
                value={formData.age || ''}
                onChange={(e) => handleChange('age', e.target.value)}
                className="h-7 text-sm"
                placeholder={isBulk ? 'Leave empty' : ''}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
            <div className="col-span-2">
              <Label htmlFor="address" className="text-xs mb-0.5 block">
                Address
              </Label>
              <Input
                id="address"
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                className="h-7 text-sm"
                placeholder={isBulk ? 'Leave empty' : ''}
              />
            </div>

            <div>
              <Label htmlFor="map" className="text-xs mb-0.5 block">
                Map URL
              </Label>
              <Input
                id="map"
                value={formData.map || ''}
                onChange={(e) => handleChange('map', e.target.value)}
                className="h-7 text-sm"
                placeholder={isBulk ? 'Leave empty' : ''}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-xs mb-0.5 block">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className="min-h-[40px] resize-none text-sm"
              placeholder={isBulk ? 'Leave empty' : ''}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} size="sm">
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
