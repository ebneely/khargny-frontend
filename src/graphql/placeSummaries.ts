import { gql } from '@apollo/client';

/**
 * Lightweight place summaries query
 * Returns minimal data for fast initial render
 * Used for place card listings
 */
export const GET_PLACE_SUMMARIES = gql`
  query GetPlaceSummaries($city: String!, $limit: Int, $offset: Int) {
    placeSummaries(city: $city, limit: $limit, offset: $offset) {
      id
      name
      placeId
      city
      area
    }
  }
`;

/**
 * Place summary fragment for reuse
 */
export const PLACE_SUMMARY_FRAGMENT = gql`
  fragment PlaceSummaryFields on PlaceSummary {
    id
    name
    placeId
    city
    area
  }
`;
