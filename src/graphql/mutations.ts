import { gql } from "@apollo/client";
import {
  PLACE_BASIC_FIELDS,
  PLACE_EXTENDED_FIELDS,
  PLACE_MEDIA_FIELDS,
  CONTACT_RESPONSE_FIELDS,
} from "./fragments";

/**
 * Create Place Mutation
 * 
 * Returns full place object using fragments for proper cache updates.
 */
export const CREATE_PLACE = gql`
  mutation CreatePlace($input: CreatePlaceInput!) {
    createPlace(input: $input) {
      ...PlaceBasicFields
      ...PlaceExtendedFields
      ...PlaceMediaFields
    }
  }
  ${PLACE_BASIC_FIELDS}
  ${PLACE_EXTENDED_FIELDS}
  ${PLACE_MEDIA_FIELDS}
`;

/**
 * Update Place Mutation
 * 
 * Returns full place object using fragments for proper cache updates.
 */
export const UPDATE_PLACE = gql`
  mutation UpdatePlace($id: ID!, $input: UpdatePlaceInput!) {
    updatePlace(id: $id, input: $input) {
      ...PlaceBasicFields
      ...PlaceExtendedFields
      ...PlaceMediaFields
    }
  }
  ${PLACE_BASIC_FIELDS}
  ${PLACE_EXTENDED_FIELDS}
  ${PLACE_MEDIA_FIELDS}
`;

/**
 * Delete Place Mutation
 * 
 * Returns boolean indicating success.
 */
export const DELETE_PLACE = gql`
  mutation DeletePlace($id: ID!) {
    deletePlace(id: $id)
  }
`;

/**
 * Add Photo to Place Mutation
 * 
 * Returns place with updated photos using fragments.
 */
export const ADD_PHOTO = gql`
  mutation AddPhotoToPlace($input: AddPhotoInput!) {
    addPhotoToPlace(input: $input) {
      id
      ...PlaceMediaFields
    }
  }
  ${PLACE_MEDIA_FIELDS}
`;

/**
 * Submit Contact Form Mutation
 * 
 * Returns contact submission using fragments.
 */
export const SUBMIT_CONTACT = gql`
  mutation SubmitContact($input: ContactInput!) {
    submitContact(input: $input) {
      ...ContactResponseFields
    }
  }
  ${CONTACT_RESPONSE_FIELDS}
`;

/**
 * Delete City Mutation
 * 
 * Deletes an entire city and all its associated places.
 * Returns the count of deleted places.
 */
export const DELETE_CITY = gql`
  mutation DeleteCity($city: String!) {
    deleteCity(city: $city) {
      success
      deletedPlacesCount
      message
    }
  }
`;

/**
 * IMPORTANT: Authentication is REST-only via Better Auth
 * 
 * Do NOT use GraphQL mutations for authentication (login/register).
 * All authentication operations must use Better Auth REST endpoints:
 * - POST /api/auth/sign-in/email
 * - POST /api/auth/sign-up/email
 * - POST /api/auth/sign-out
 * - GET /api/auth/session
 * 
 * GraphQL is for business logic only (places, contacts, etc.).
 * Authentication uses HttpOnly cookies managed by the backend.
 */
