import { gql } from "@apollo/client";
import {
  // Business Logic Fragments (Places)
  PLACE_BASIC_FIELDS,
  PLACE_MEDIA_FIELDS,
  PLACE_EXTENDED_FIELDS,
  PLACE_SUMMARY_FIELDS,
  // Google Places Fragments
  GOOGLE_PLACE_BASIC_FIELDS,
  GOOGLE_PLACE_PHOTO_FIELDS,
  GOOGLE_PLACE_GEOMETRY_FIELDS,
  GOOGLE_PLACE_OPENING_HOURS_FIELDS,
  GOOGLE_PLACE_REVIEW_FIELDS,
  GOOGLE_PLACE_ADDRESS_COMPONENTS_FIELDS,
  GOOGLE_PLACE_PLUS_CODE_FIELDS,
  GOOGLE_FIND_PLACE_FIELDS,
  // User Fragments
  USER_BASIC_FIELDS,
  // System Fragments
  HEALTH_CHECK_FIELDS,
  HEALTH_CHECK_PORT_FIELDS,
  HEALTH_CHECK_MEMORY_FIELDS,
  LOGS_RESPONSE_FIELDS,
} from "./fragments";

export const GET_PLACES = gql`
  query GetPlaces($filters: PlaceFilters) {
    places(filters: $filters) {
      ...PlaceBasicFields
      ...PlaceExtendedFields
      ...PlaceMediaFields
    }
  }
  ${PLACE_BASIC_FIELDS}
  ${PLACE_EXTENDED_FIELDS}
  ${PLACE_MEDIA_FIELDS}
`;

export const GET_PLACES_BY_CITY = gql`
  query GetPlacesByCity($filters: PlaceFilters) {
    places(filters: $filters) {
      ...PlaceSummaryFields
    }
  }
  ${PLACE_SUMMARY_FIELDS}
`;

export const GET_PLACE = gql`
  query GetPlace($id: ID!) {
    place(id: $id) {
      ...PlaceBasicFields
      ...PlaceExtendedFields
      ...PlaceMediaFields
    }
  }
  ${PLACE_BASIC_FIELDS}
  ${PLACE_EXTENDED_FIELDS}
  ${PLACE_MEDIA_FIELDS}
`;

export const GET_PLACE_BY_PLACE_ID = gql`
  query GetPlaceByPlaceId($placeId: String!) {
    placeByPlaceId(placeId: $placeId) {
      ...PlaceBasicFields
      ...PlaceExtendedFields
      ...PlaceMediaFields
    }
  }
  ${PLACE_BASIC_FIELDS}
  ${PLACE_EXTENDED_FIELDS}
  ${PLACE_MEDIA_FIELDS}
`;

export const GOOGLE_PLACE_DETAILS = gql`
  query GooglePlaceDetails($placeId: String!) {
    googlePlaceDetails(placeId: $placeId) {
      ...GooglePlaceBasicFields
      photos {
        ...GooglePlacePhotoFields
      }
      geometry {
        ...GooglePlaceGeometryFields
      }
      opening_hours {
        ...GooglePlaceOpeningHoursFields
      }
      reviews {
        ...GooglePlaceReviewFields
      }
      address_components {
        ...GooglePlaceAddressComponentsFields
      }
      plus_code {
        ...GooglePlacePlusCodeFields
      }
    }
  }
  ${GOOGLE_PLACE_BASIC_FIELDS}
  ${GOOGLE_PLACE_PHOTO_FIELDS}
  ${GOOGLE_PLACE_GEOMETRY_FIELDS}
  ${GOOGLE_PLACE_OPENING_HOURS_FIELDS}
  ${GOOGLE_PLACE_REVIEW_FIELDS}
  ${GOOGLE_PLACE_ADDRESS_COMPONENTS_FIELDS}
  ${GOOGLE_PLACE_PLUS_CODE_FIELDS}
`;

export const GOOGLE_FIND_PLACE = gql`
  query GoogleFindPlace($searchQuery: String!) {
    googleFindPlace(searchQuery: $searchQuery) {
      ...GoogleFindPlaceFields
    }
  }
  ${GOOGLE_FIND_PLACE_FIELDS}
`;

/**
 * Cities Query
 * 
 * Get all distinct city names.
 * Note: Returns array of strings, no fragment needed for scalar types.
 */
export const GET_CITIES = gql`
  query GetCities {
    cities
  }
`;

export const GET_ME = gql`
  query GetMe {
    me {
      ...UserBasicFields
    }
  }
  ${USER_BASIC_FIELDS}
`;

/**
 * Health Check Query
 * 
 * Get system health status including memory usage and server info.
 * 
 * NOTE: Currently not actively used in the application.
 * Keep for future system monitoring features.
 */
export const HEALTH_CHECK = gql`
  query HealthCheck {
    health {
      ...HealthCheckFields
    }
  }
  ${HEALTH_CHECK_FIELDS}
  ${HEALTH_CHECK_PORT_FIELDS}
  ${HEALTH_CHECK_MEMORY_FIELDS}
`;

/**
 * Logs Query
 * 
 * Get logs with optional filtering by time period and limit.
 * 
 * NOTE: Currently not actively used in the application.
 * Keep for future system monitoring features.
 */
export const GET_LOGS = gql`
  query GetLogs($filter: String, $limit: Int) {
    logs(filter: $filter, limit: $limit) {
      ...LogsResponseFields
    }
  }
  ${LOGS_RESPONSE_FIELDS}
`;

/**
 * Get Current User Query
 * 
 * Get authenticated user information.
 * 
 * NOTE: Currently not actively used in the application.
 * User session is managed via Better Auth REST API.
 */