'use client';

import { useState } from 'react';
import { Place } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { validatePlace } from '@/lib/dashboard-utils';

interface AddPlaceModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (place: Partial<Place>) => void;
  cities: string[];
}

export function AddPlaceModal({ open, onClose, onAdd, cities }: AddPlaceModalProps) {
  const [formData, setFormData] = useState<Partial<Place>>({
    name: '',
    city: cities[0] || '',
    placeId: '',
    phone: '',
    address: '',
    description: '',
    age: '',
    price: '',
    rating: undefined,
    area: '',
    map: '',
  });
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validatePlace(formData);

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    onAdd(formData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      city: cities[0] || '',
      placeId: '',
      phone: '',
      address: '',
      description: '',
      age: '',
      price: '',
      rating: undefined,
      area: '',
      map: '',
    });
    setErrors([]);
    onClose();
  };

  const handleChange = (field: keyof Place, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Place</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-2">
              {errors.map((error, i) => (
                <p key={i} className="text-sm text-red-600">
                  {error}
                </p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="h-8"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="city" className="text-xs">
                City <span className="text-red-500">*</span>
              </Label>
              <select
                id="city"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="placeId" className="text-xs">
                Place ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="placeId"
                value={formData.placeId || ''}
                onChange={(e) => handleChange('placeId', e.target.value)}
                className="h-8"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone" className="text-xs">
                Phone
              </Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="h-8"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="area" className="text-xs">
                Area
              </Label>
              <Input
                id="area"
                value={formData.area || ''}
                onChange={(e) => handleChange('area', e.target.value)}
                className="h-8"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="price" className="text-xs">
                Price
              </Label>
              <Input
                id="price"
                value={formData.price || ''}
                onChange={(e) => handleChange('price', e.target.value)}
                className="h-8"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="rating" className="text-xs">
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
                className="h-8"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="age" className="text-xs">
                Age
              </Label>
              <Input
                id="age"
                value={formData.age || ''}
                onChange={(e) => handleChange('age', e.target.value)}
                className="h-8"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="address" className="text-xs">
              Address
            </Label>
            <Input
              id="address"
              value={formData.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
              className="h-8"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="map" className="text-xs">
              Map URL
            </Label>
            <Input
              id="map"
              value={formData.map || ''}
              onChange={(e) => handleChange('map', e.target.value)}
              className="h-8"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="description" className="text-xs">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className="min-h-[60px] resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} size="sm">
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Add Place
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
