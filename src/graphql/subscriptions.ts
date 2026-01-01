import { gql } from "@apollo/client";
import {
  SYSTEM_STATUS_FIELDS,
  SYSTEM_STATUS_DB_FIELDS,
  SYSTEM_STATUS_REDIS_FIELDS,
} from "./fragments";

/**
 * GraphQL Subscriptions
 * 
 * Real-time subscriptions for live data updates.
 * All subscriptions use GraphQL WS (WebSocket) protocol.
 */

/**
 * System Status Subscription
 * 
 * Real-time system status updates including:
 * - Database connection status
 * - Redis connection status
 * - Latency measurements
 */
export const SYSTEM_STATUS_SUBSCRIPTION = gql`
  subscription SystemStatus {
    systemStatus {
      ...SystemStatusFields
    }
  }
  ${SYSTEM_STATUS_FIELDS}
  ${SYSTEM_STATUS_DB_FIELDS}
  ${SYSTEM_STATUS_REDIS_FIELDS}
`;

/**
 * Live Logs Subscription
 * 
 * Real-time log streaming from the server.
 * Receives new log entries as they are generated.
 * 
 * Note: Returns scalar string, no fragment needed.
 */
export const LIVE_LOGS_SUBSCRIPTION = gql`
  subscription LiveLogs {
    liveLogs
  }
`;

