/**
 * Chat domain type definitions for the frontend.
 *
 * These types represent the companion chat session and message data structures.
 * They align with the BE CamelCaseModel chat schemas.
 *
 * Used by: ChatPanel, future chat components, and chat API services.
 */

// ===================================================================
// Chat Session — Trip-bound companion conversation
// ===================================================================

/**
 * Chat session linked to a specific trip.
 *
 * Represents a companion chat session created for a trip.
 * The threadId is used for AI context tracking.
 * Status can be "active", "archived", or similar values.
 */
export interface ChatSession {
  id: number; // Unique session ID
  tripId: number; // Associated trip ID
  userId: number | null; // User ID (null for guest sessions before claim)
  threadId: string; // AI thread identifier for context tracking
  status: string; // Session status: "active", "archived", etc.
  createdAt: string; // ISO datetime string
  updatedAt: string; // ISO datetime string
}

/**
 * Paginated list response for chat session listing.
 */
export interface ChatSessionListResponse {
  items: ChatSession[]; // Session summaries
  total: number; // Total matching sessions
  skip: number; // Number of skipped items (pagination offset)
  limit: number; // Page size (max items per page)
}

// ===================================================================
// Chat Message — Individual messages within a session
// ===================================================================

/**
 * Chat message within a session.
 *
 * Represents a single message exchanged between user and AI companion.
 * Messages can require confirmation before applying proposed operations.
 */
export interface ChatMessage {
  id: number; // Unique message ID
  sessionId: number; // Parent chat session ID
  role: "user" | "assistant" | "system"; // Message sender role
  content: string; // Message text content
  proposedOperations: Record<string, unknown>[]; // Proposed itinerary changes (if requiresConfirmation)
  requiresConfirmation: boolean; // Whether user must confirm before applying changes
  createdAt: string; // ISO datetime string
}
