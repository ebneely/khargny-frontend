import { gql } from "@apollo/client";

/**
 * GraphQL Fragments
 * 
 * Reusable field sets to avoid duplication and ensure consistency.
 * Following GraphQL best practices for DRY (Don't Repeat Yourself).
 */

/**
 * Basic Place Fields
 * Common fields used across multiple place queries
 */
export const PLACE_BASIC_FIELDS = gql`
  fragment PlaceBasicFields on Place {
    id
    name
    placeId
    city
    area
    address
    phone
    rating
    price
    description
  }
`;

/**
 * Place Media Fields
 * Photos and videos for places
 */
export const PLACE_MEDIA_FIELDS = gql`
  fragment PlaceMediaFields on Place {
    photos {
      url
      public_id
    }
    videos {
      url
      public_id
    }
  }
`;

/**
 * Place Extended Fields
 * Additional metadata fields
 */
export const PLACE_EXTENDED_FIELDS = gql`
  fragment PlaceExtendedFields on Place {
    age
    map
    user_ratings_total
    price_level
    createdAt
    updatedAt
  }
`;

/**
 * Complete Place Fields
 * All fields for a full place object
 * Note: Fragments are composed in queries, not nested here
 */

/**
 * Google Place Photo Fields
 * Standard photo fields from Google Places API
 */
export const GOOGLE_PLACE_PHOTO_FIELDS = gql`
  fragment GooglePlacePhotoFields on GooglePlacePhoto {
    photo_reference
    height
    width
    photo_url
    html_attributions
  }
`;

/**
 * Google Place Geometry Fields
 * Location and viewport information
 */
export const GOOGLE_PLACE_GEOMETRY_FIELDS = gql`
  fragment GooglePlaceGeometryFields on GooglePlaceGeometry {
    location {
      lat
      lng
    }
    viewport {
      northeast {
        lat
        lng
      }
      southwest {
        lat
        lng
      }
    }
  }
`;

/**
 * Google Place Opening Hours Fields
 * Business hours information
 */
export const GOOGLE_PLACE_OPENING_HOURS_FIELDS = gql`
  fragment GooglePlaceOpeningHoursFields on GooglePlaceOpeningHours {
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
`;

/**
 * Google Place Review Fields
 * Review information from Google Places
 */
export const GOOGLE_PLACE_REVIEW_FIELDS = gql`
  fragment GooglePlaceReviewFields on GooglePlaceReview {
    author_name
    author_url
    language
    profile_photo_url
    rating
    relative_time_description
    text
    time
  }
`;

/**
 * Google Find Place Basic Fields
 * Minimal fields for place search results
 */
export const GOOGLE_FIND_PLACE_FIELDS = gql`
  fragment GoogleFindPlaceFields on GoogleFindPlace {
    id
    name
    placeId
    address
    rating
  }
`;

/**
 * Google Place Basic Info Fields
 * Core information fields for Google Places
 */
export const GOOGLE_PLACE_BASIC_FIELDS = gql`
  fragment GooglePlaceBasicFields on GooglePlaceDetails {
    place_id
    name
    phone
    address
    formatted_address
    formatted_phone_number
    international_phone_number
    website
    rating
    user_ratings_total
    price_level
    types
    vicinity
    url
    adr_address
    business_status
    icon
    icon_background_color
    icon_mask_base_uri
    isOpenNow
    openStatus {
      isOpen
      closesAt
      opensAt {
        day
        time
      }
    }
  }
`;

/**
 * Google Place Address Components Fields
 * Address breakdown information
 */
export const GOOGLE_PLACE_ADDRESS_COMPONENTS_FIELDS = gql`
  fragment GooglePlaceAddressComponentsFields on GooglePlaceAddressComponent {
    long_name
    short_name
    types
  }
`;

/**
 * Google Place Plus Code Fields
 * Plus code location information
 */
export const GOOGLE_PLACE_PLUS_CODE_FIELDS = gql`
  fragment GooglePlacePlusCodeFields on GooglePlacePlusCode {
    compound_code
    global_code
  }
`;

/**
 * Place Summary Fields (for lists)
 * Minimal fields for place listings
 */
export const PLACE_SUMMARY_FIELDS = gql`
  fragment PlaceSummaryFields on Place {
    name
    city
    placeId
    user_ratings_total
    price_level
  }
`;

/**
 * User Basic Fields
 * Basic user information
 */
export const USER_BASIC_FIELDS = gql`
  fragment UserBasicFields on User {
    id
    email
    name
    emailVerified
    createdAt
  }
`;

/**
 * Health Check Port Fields
 * Port information for health check
 */
export const HEALTH_CHECK_PORT_FIELDS = gql`
  fragment HealthCheckPortFields on HealthCheckPort {
    http
  }
`;

/**
 * Health Check Memory Fields
 * Memory information for health check
 */
export const HEALTH_CHECK_MEMORY_FIELDS = gql`
  fragment HealthCheckMemoryFields on HealthCheckMemory {
    rss
  }
`;

/**
 * Health Check Fields
 * Complete health check information
 * Note: Fragments cannot be nested, so ports and memory are inline
 */
export const HEALTH_CHECK_FIELDS = gql`
  fragment HealthCheckFields on HealthCheck {
    status
    timestamp
    ports {
      ...HealthCheckPortFields
    }
    memory {
      ...HealthCheckMemoryFields
    }
  }
`;

/**
 * Logs Response Fields
 * Logs query response structure
 */
export const LOGS_RESPONSE_FIELDS = gql`
  fragment LogsResponseFields on LogsResponse {
    logs
    total
  }
`;

/**
 * System Status DB Fields
 * Database status information
 */
export const SYSTEM_STATUS_DB_FIELDS = gql`
  fragment SystemStatusDbFields on SystemStatusDb {
    status
    latency
    message
  }
`;

/**
 * System Status Redis Fields
 * Redis status information
 */
export const SYSTEM_STATUS_REDIS_FIELDS = gql`
  fragment SystemStatusRedisFields on SystemStatusRedis {
    connected
    ready
    latency
    status
    message
  }
`;

/**
 * System Status Fields
 * Complete system status information
 * Note: Fragments cannot be nested, so db and redis are inline
 */
export const SYSTEM_STATUS_FIELDS = gql`
  fragment SystemStatusFields on SystemStatus {
    db {
      ...SystemStatusDbFields
    }
    redis {
      ...SystemStatusRedisFields
    }
    latency
    timestamp
  }
`;

/**
 * Contact Response Fields
 * Contact form submission response
 */
export const CONTACT_RESPONSE_FIELDS = gql`
  fragment ContactResponseFields on Contact {
    id
    createdAt
  }
`;

