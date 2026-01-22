import { gql } from '@apollo/client';

/**
 * Tab 1: Google Place Info
 * Basic information only - no photos, reviews, or hours
 */
export const GET_GOOGLE_PLACE_INFO = gql`
  query GetGooglePlaceInfo($placeId: String!) {
    googlePlaceInfo(placeId: $placeId) {
      place_id
      name
      formatted_address
      formatted_phone_number
      website
      rating
      user_ratings_total
      price_level
      types
      business_status
    }
  }
`;

/**
 * Tab 2: Google Place Hours
 * Opening hours only
 */
export const GET_GOOGLE_PLACE_HOURS = gql`
  query GetGooglePlaceHours($placeId: String!) {
    googlePlaceHours(placeId: $placeId) {
      periods {
        open {
          day
          time
        }
        close {
          day
          time
        }
      }
      weekday_text
    }
  }
`;

/**
 * Tab 3: Google Place Reviews (Paginated)
 * Reviews with pagination support
 */
export const GET_GOOGLE_PLACE_REVIEWS = gql`
  query GetGooglePlaceReviews($placeId: String!, $limit: Int, $offset: Int) {
    googlePlaceReviews(placeId: $placeId, limit: $limit, offset: $offset) {
      author_name
      rating
      text
      relative_time_description
      profile_photo_url
      time
    }
  }
`;

/**
 * Tab 4: Google Place Photos (Paginated)
 * Photos with pagination support
 */
export const GET_GOOGLE_PLACE_PHOTOS = gql`
  query GetGooglePlacePhotos($placeId: String!, $limit: Int, $offset: Int) {
    googlePlacePhotos(placeId: $placeId, limit: $limit, offset: $offset) {
      photo_reference
      height
      width
      photo_url
    }
  }
`;

/**
 * Thumbnail for place card
 * Minimal data for card display
 */
export const GET_GOOGLE_PLACE_THUMBNAIL = gql`
  query GetGooglePlaceThumbnail($placeId: String!) {
    googlePlaceThumbnail(placeId: $placeId) {
      photo_reference
      photo_url
      height
      width
    }
  }
`;
