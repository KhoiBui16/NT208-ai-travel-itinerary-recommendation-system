/**
 * C3B ChatPanel UI spec.
 *
 * Mục tiêu:
 * - Giữ trip/session thật từ backend để panel mount đúng runtime path
 * - Route-mock message/history APIs để khóa UI contract mà không phụ thuộc Gemini
 */

import { expect, test } from "@playwright/test";
import { apiRegister, injectAuth } from "./helpers/auth";

const API_URL = process.env.E2E_API_URL || "http://localhost:8000";

async function isBackendAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function createTripViaAPI(accessToken: string) {
  const res = await fetch(`${API_URL}/api/v1/itineraries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      destination: "Hanoi",
      tripName: "E2E C3B Chat Trip",
      startDate: "2026-07-01",
      endDate: "2026-07-03",
      budget: 5000000,
      adultsCount: 2,
      childrenCount: 0,
      interests: ["food"],
    }),
  });
  if (!res.ok) throw new Error(`Create trip failed: ${res.status}`);
  return res.json() as Promise<{ id: number }>;
}

async function createChatSessionViaAPI(accessToken: string, tripId: number) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${API_URL}/api/v1/itineraries/${tripId}/chat-sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (res.ok) {
      return res.json() as Promise<{ id: number; status: string }>;
    }
    if (res.status !== 404 || attempt === 3) {
      throw new Error(`Create chat session failed: ${res.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("Create chat session failed after retries");
}

test.beforeAll(async () => {
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    test.skip(
      true,
      "Backend API not available. This UI contract spec still needs backend auth/trip/session setup.",
    );
  }
});

test("ChatPanel renders real session and appends mocked C3B reply contract", async ({
  page,
}) => {
  const email = `e2e_c3b_chat_${Date.now()}@test.com`;
  const tokens = await apiRegister(email, "password123", "C3B Chat Tester");
  await injectAuth(page, tokens.accessToken, tokens.refreshToken);

  const trip = await createTripViaAPI(tokens.accessToken);
  const session = await createChatSessionViaAPI(tokens.accessToken, trip.id);

  await page.route(
    `${API_URL}/api/v1/itineraries/chat-sessions/${session.id}/messages?skip=0&limit=50`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [],
          total: 0,
          skip: 0,
          limit: 50,
        }),
      });
    },
  );

  await page.route(
    `${API_URL}/api/v1/itineraries/chat-sessions/${session.id}/messages`,
    async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": "20",
          "X-RateLimit-Remaining": "19",
          "X-RateLimit-Reset": "2026-07-02T00:00:00Z",
        },
        body: JSON.stringify({
          sessionId: session.id,
          userMessage: {
            id: 101,
            sessionId: session.id,
            role: "user",
            content: "Thêm giúp mình một điểm tham quan lịch sử",
            proposedOperations: [],
            requiresConfirmation: false,
            createdAt: "2026-07-01T09:00:00Z",
          },
          assistantMessage: {
            id: 102,
            sessionId: session.id,
            role: "assistant",
            content: "Mình đề xuất thêm Văn Miếu vào ngày 2.",
            proposedOperations: [
              {
                type: "add_activity",
                description: "Thêm Văn Miếu vào ngày 2",
                target: { dayId: 2 },
              },
            ],
            requiresConfirmation: true,
            createdAt: "2026-07-01T09:00:05Z",
          },
          message: "Mình đề xuất thêm Văn Miếu vào ngày 2.",
          requiresConfirmation: true,
          proposedOperations: [
            {
              type: "add_activity",
              description: "Thêm Văn Miếu vào ngày 2",
              target: { dayId: 2 },
            },
          ],
        }),
      });
    },
  );

  await page.goto(`/trip-workspace?tripId=${trip.id}`);
  await page.getByRole("button", { name: "AI Chat" }).click();

  await expect(page.getByText(`Session #${session.id}`)).toBeVisible();
  await expect(
    page.getByText(/AI companion chưa có tin nhắn nào trong phiên này/i),
  ).toBeVisible();

  const composer = page.getByPlaceholder(
    "Hỏi về lịch trình hiện tại hoặc đề xuất thay đổi...",
  );
  await composer.fill("Thêm giúp mình một điểm tham quan lịch sử");
  await page.getByRole("button", { name: "Gửi" }).click();

  await expect(page.getByText("Thêm giúp mình một điểm tham quan lịch sử")).toBeVisible();
  await expect(page.getByText("Mình đề xuất thêm Văn Miếu vào ngày 2.")).toBeVisible();
  await expect(page.getByText(/Cần xác nhận trước khi áp dụng/i)).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Thêm Văn Miếu vào ngày 2" }),
  ).toBeVisible();
});
