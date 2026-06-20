/**
 * Chat API service — FE client for companion chat session operations.
 *
 * Communicates with the Backend chat endpoints:
 *   - Create Session:     POST /api/v1/itineraries/:tripId/chat-sessions
 *   - List Sessions:      GET /api/v1/itineraries/:tripId/chat-sessions
 *   - Get Session:        GET /api/v1/itineraries/chat-sessions/:sessionId
 *
 * All types are aligned with the BE CamelCaseModel chat schemas.
 */

import { api } from "./api";
import type {
  ChatMessageListResponse,
  ChatSession,
  ChatSessionListResponse,
  SendChatMessageRequest,
  SendChatMessageResponse,
} from "../types/chat.types";

// ===================================================================
// Chat Session API — Trip-bound companion chat operations
// ===================================================================

/**
 * Create a new chat session for a trip.
 *
 * Initializes a new companion chat thread linked to the specific trip.
 * Returns the created session with threadId for AI context tracking.
 */
export async function createChatSession(tripId: number): Promise<ChatSession> {
  return api.post<ChatSession>(`/api/v1/itineraries/${tripId}/chat-sessions`);
}

/**
 * List all chat sessions for a trip (paginated).
 *
 * Returns paginated list of chat sessions for the specified trip.
 * Sessions are ordered by most recently updated.
 */
export async function listChatSessions(
  tripId: number,
  skip = 0,
  limit = 20,
): Promise<ChatSessionListResponse> {
  return api.get<ChatSessionListResponse>(
    `/api/v1/itineraries/${tripId}/chat-sessions?skip=${skip}&limit=${limit}`,
  );
}

/**
 * Get a specific chat session by ID.
 *
 * Returns full session details including threadId and status.
 * Used to verify session access or retrieve session metadata.
 */
export async function getChatSession(sessionId: number): Promise<ChatSession> {
  return api.get<ChatSession>(`/api/v1/itineraries/chat-sessions/${sessionId}`);
}

/**
 * Load persisted message history for a specific chat session.
 *
 * Messages are returned in chronological order so the FE can render
 * the conversation naturally without re-sorting.
 */
export async function listChatMessages(
  sessionId: number,
  skip = 0,
  limit = 50,
): Promise<ChatMessageListResponse> {
  return api.get<ChatMessageListResponse>(
    `/api/v1/itineraries/chat-sessions/${sessionId}/messages?skip=${skip}&limit=${limit}`,
  );
}

/**
 * Send a new user message to the companion chat API.
 *
 * Backend will persist both user + assistant messages and return the
 * structured assistant reply together with the persisted rows.
 */
export async function sendChatMessage(
  sessionId: number,
  payload: SendChatMessageRequest,
): Promise<SendChatMessageResponse> {
  return api.post<SendChatMessageResponse>(
    `/api/v1/itineraries/chat-sessions/${sessionId}/messages`,
    payload,
  );
}
