import { Place, PendingOperation } from '@/types';

// Generate unique ID for pending operations
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Format place data for display
export function formatPlaceData(place: Place): Place {
  return {
    ...place,
    phone: place.phone || '-',
    address: place.address || '-',
    description: place.description || '-',
    age: place.age || '-',
    price: place.price || '-',
    rating: place.rating || 0,
    area: place.area || '-',
  };
}

// Validate place data
export function validatePlace(place: Partial<Place>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!place.name || place.name.trim() === '') {
    errors.push('Name is required');
  }
  if (!place.city || place.city.trim() === '') {
    errors.push('City is required');
  }
  if (!place.placeId || place.placeId.trim() === '') {
    errors.push('Place ID is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Group pending operations by type
export function groupPendingOperations(operations: PendingOperation[]) {
  return {
    adds: operations.filter((op) => op.type === 'add'),
    edits: operations.filter((op) => op.type === 'edit'),
    deletes: operations.filter((op) => op.type === 'delete'),
  };
}

// Check if access code is valid
export function validateAccessCode(code: string): boolean {
  return code === 'DASHBOARD2025';
}

// Session storage keys
export const STORAGE_KEYS = {
  ACCESS_CODE: 'dashboard_access_code',
  PENDING_OPERATIONS: 'dashboard_pending_operations',
} as const;
