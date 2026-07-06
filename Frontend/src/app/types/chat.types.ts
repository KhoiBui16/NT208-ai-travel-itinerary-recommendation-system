/**
 * Chat domain type definitions for the frontend.
 *
 * These types represent the companion chat session and message data structures.
 * They align with the BE CamelCaseModel chat schemas.
 *
 * Used by: ChatPanel, future chat components, and chat API services.
 */

import type { ItineraryResponse } from "../services/itinerary";

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
  title: string | null; // Tên phiên do user đặt (null -> FE dùng fallback)
  createdAt: string; // ISO datetime string
  updatedAt: string; // ISO datetime string
}

/**
 * Payload rename một chat session (C4 history-management UX).
 */
export interface UpdateChatSessionRequest {
  title: string;
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
  confirmationStatus: "not_required" | "pending" | "applied" | "cancelled" | "stale";
  tripSnapshotUpdatedAt: string | null;
  resolvedAt: string | null;
  createdAt: string; // ISO datetime string
}

/**
 * Paginated message history response for one chat session.
 */
export interface ChatMessageListResponse {
  items: ChatMessage[]; // Ordered message history slice
  total: number; // Total messages in the session
  skip: number; // Number of skipped items
  limit: number; // Requested page size
}

/**
 * Request payload for sending a new user message.
 */
export interface SendChatMessageRequest {
  content: string; // Raw user input text
}

/**
 * Structured C3B response returned after sending a message.
 *
 * Backend persists both the user message and the assistant reply, then returns
 * the assistant summary fields at the top level for easier FE rendering.
 */
export interface SendChatMessageResponse {
  sessionId: number; // Current session ID
  userMessage: ChatMessage; // Persisted user message row
  assistantMessage: ChatMessage; // Persisted assistant reply row
  message: string; // Assistant reply text (top-level shortcut)
  requiresConfirmation: boolean; // Whether proposed operations need user confirm
  proposedOperations: Record<string, unknown>[]; // Suggested itinerary changes
}

export interface ApplyChatPatchRequest {
  assistantMessageId: number;
  action: "apply" | "cancel";
}

export interface ApplyChatPatchResponse {
  applied: boolean;
  status: "not_required" | "pending" | "applied" | "cancelled" | "stale";
  message: string;
  trip: ItineraryResponse | null;
  assistantMessage: ChatMessage;
}
