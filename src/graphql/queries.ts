import { gql } from "@apollo/client";
import {
  // Business Logic Fragments (Places)
  PLACE_BASIC_FIELDS,
  PLACE_MEDIA_FIELDS,
  PLACE_EXTENDED_FIELDS,
  // Google Places Fragments
  GOOGLE_FIND_PLACE_FIELDS,
} from "./fragments";

/**
 * Dashboard Queries
 */

export const GET_PLACES = gql`
  query GetPlaces($filter: KhargnyPlaceFilter) {
    khargnyPlaces(filter: $filter) {
      ...PlaceBasicFields
      ...PlaceExtendedFields
      ...PlaceMediaFields
    }
  }
  ${PLACE_BASIC_FIELDS}
  ${PLACE_EXTENDED_FIELDS}
  ${PLACE_MEDIA_FIELDS}
`;

export const GET_PLACE = gql`
  query GetPlace($id: ID!) {
    khargnyPlace(id: $id) {
      ...PlaceBasicFields
      ...PlaceExtendedFields
      ...PlaceMediaFields
    }
  }
  ${PLACE_BASIC_FIELDS}
  ${PLACE_EXTENDED_FIELDS}
  ${PLACE_MEDIA_FIELDS}
`;

export const GOOGLE_FIND_PLACE = gql`
  query GoogleFindPlace($searchQuery: String!) {
    googleFindPlace(searchQuery: $searchQuery) {
      ...GoogleFindPlaceFields
    }
  }
  ${GOOGLE_FIND_PLACE_FIELDS}
`;

export const GET_CITIES = gql`
  query GetCities {
    getCityNames
  }
`;

/**
 * Public/Explorer Queries
 */

export const GET_PLACE_DETAILS = gql`
  query GetPlaceDetails($city: String!) {
    getPlaceDetails(city: $city)
  }
`;

export const GET_CITY_NAMES = gql`
  query GetCityNames {
    getCityNames
  }
`;
