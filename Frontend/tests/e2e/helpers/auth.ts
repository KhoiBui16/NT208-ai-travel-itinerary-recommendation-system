import { Page } from "@playwright/test";

const API_URL = process.env.E2E_API_URL || "http://localhost:8000";

/** Register a user via API and return tokens. */
export async function apiRegister(
  email: string,
  password: string,
  name: string,
) {
  const res = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Register failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<{
    accessToken: string;
    refreshToken: string;
  }>;
}

/** Login via API and return tokens. */
export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<{
    accessToken: string;
    refreshToken: string;
  }>;
}

/** Inject auth tokens into localStorage so the app thinks user is logged in. */
export async function injectAuth(
  page: Page,
  accessToken: string,
  refreshToken: string,
) {
  await page.goto("/");
  await page.evaluate(
    ({ at, rt }) => {
      localStorage.setItem("accessToken", at);
      localStorage.setItem("refreshToken", rt);
    },
    { at: accessToken, rt: refreshToken },
  );
}

/** Full login helper: register + inject tokens. */
export async function loginAs(
  page: Page,
  email: string,
  password: string,
  name: string,
) {
  const tokens = await apiRegister(email, password, name);
  await injectAuth(page, tokens.accessToken, tokens.refreshToken);
  return tokens;
}
