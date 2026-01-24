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
  fragment PlaceBasicFields on KhargnyPlace {
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
  fragment PlaceMediaFields on KhargnyPlace {
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
  fragment PlaceExtendedFields on KhargnyPlace {
    age
    map
    user_ratings_total
    price_level
    createdAt
    updatedAt
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
 * Contact Response Fields
 * Contact form submission response
 */
export const CONTACT_RESPONSE_FIELDS = gql`
  fragment ContactResponseFields on Contact {
    id
    createdAt
  }
`;
