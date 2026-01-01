/**
 * Unified Type Definitions
 * 
 * Following TypeScript/Next.js best practices:
 * - Use `interface` for object shapes (extendable)
 * - Use `type` for unions, primitives, and computed types
 * - Single source of truth for all types
 */

// ============================================================================
// Place Types (Dashboard)
// ============================================================================

export interface Place {
  id: string;
  name: string;
  city: string;
  phone?: string | null;
  placeId?: string | null;
  map?: string | null;
  address?: string | null;
  description?: string | null;
  age?: string | null;
  price?: string | null;
  rating?: number | null;
  area?: string | null;
  photos?: Photo[];
  videos?: Video[];
}

export interface Photo {
  url?: string | null;
  public_id?: string | null;
  uploadedAt?: string | null;
}

export interface Video {
  url?: string | null;
  public_id?: string | null;
  uploadedAt?: string | null;
}

export type OperationType = 'add' | 'edit' | 'delete';

export interface PendingOperation {
  id: string;
  type: OperationType;
  data: Partial<Place>;
  originalData?: Place; // For edits, keep original data
}

export interface BulkUpdateInput {
  ids: string[];
  updates: Partial<Place>;
}

// ============================================================================
// Outing Types (Public/Explorer)
// ============================================================================

export interface Outing {
  title: string;
  image: string;
  images?: string[];
  rating: number;
  reviewCount?: number;
  user_ratings_total?: number;
  price: string;
  price_level?: number;
  area: string;
  location: string;
  category: string;
  description: string;
  open_now: boolean;
  vicinity?: string;
  address?: string;
  types?: PlaceType[];
  mapLink?: string;
  periods?: Period[];
  weekday_text?: string[];
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url?: string;
  wheelchair_accessible_entrance?: boolean;
  delivery?: boolean;
  dine_in?: boolean;
  takeout?: boolean;
  curbside_pickup?: boolean;
  reviews?: Review[];
  placeId?: string;
}

export interface PlaceType {
  name: string;
  icon?: string;
}

export interface Period {
  open: {
    date: string;
    time: string;
  };
  close: {
    date: string;
    time: string;
  };
}

export interface Review {
  author: string;
  rating: number;
  time: string;
  text: string;
  profilePhoto?: string;
}

// ============================================================================
// Filter & View Types
// ============================================================================

export interface FilterOptions {
  location: string;
  area: string;
  category: string[];
  priceRange: [number, number];
  rating: number;
  openNow: boolean;
}

export interface Area {
  [key: string]: string[];
}

export type ViewMode = 'list' | 'map';

export type TabKey = 'info' | 'hours' | 'reviews' | 'photos';

// ============================================================================
// Form & Action Types
// ============================================================================

export interface PlaceFormData {
  name: string;
  price: number;
  location: {
    lat: number;
    lng: number;
  };
  photos: string[];
}

export type PlaceAction = {
  type: 'add' | 'edit' | 'delete';
  place: Place;
  previousPlace?: Place;
  timestamp: Date;
  rowNumber?: number;
};

export type ModalType = 'add' | 'edit' | 'delete' | null;

