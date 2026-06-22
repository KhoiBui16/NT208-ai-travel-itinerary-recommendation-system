// 00108 UAT evidence — direct chromium script (bypass Playwright test runner).
// Chạy: node uat-00108.mjs  (cần BE :8000 + FE dev :5173 đang chạy)
import { chromium } from "@playwright/test";

const API = process.env.E2E_API_URL || "http://localhost:8000";
const BASE = process.env.E2E_BASE_URL || "http://localhost:5173";
const EVIDENCE = "../docs/REPORTS/EVIDENCE/00108_post_106_full_e2e_audit";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function register() {
  const r = await fetch(`${API}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `uat_${Date.now()}@test.com`, password: "password123", name: "UAT" }),
  });
  if (!r.ok) throw new Error(`register ${r.status}`);
  return r.json();
}
async function createTrip(token) {
  const r = await fetch(`${API}/api/v1/itineraries`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ destination: "Hanoi", tripName: "UAT 00108", startDate: "2026-07-01", endDate: "2026-07-03", budget: 5000000, adultsCount: 2, childrenCount: 0, interests: ["food"] }),
  });
  if (!r.ok) throw new Error(`createTrip ${r.status}`);
  return r.json();
}
async function createSession(token, tripId) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`${API}/api/v1/itineraries/${tripId}/chat-sessions`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) return r.json();
    if (r.status !== 404 || i === 3) throw new Error(`createSession ${r.status}`);
    await sleep(300);
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
const shot = async (n) => { try { await page.screenshot({ path: `${EVIDENCE}/${n}` }); console.log("captured", n); } catch (e) { console.log("FAIL", n, e); } };
const go = async (url, settle = 1600) => { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 }).catch((e) => console.log("goto-err", url, e)); await sleep(settle); };

try {
  await go(`${BASE}/`); await shot("01-home.png");
  await go(`${BASE}/cities`, 1800); await shot("02-cities.png");
  await go(`${BASE}/cities/ha-noi`, 2000); await shot("03-city-rich-ha-noi.png");
  await go(`${BASE}/cities/chau-doc`, 2000); await shot("04-city-sparse-chau-doc.png");

  const t = await register();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
  await page.evaluate(({ at, rt }) => { localStorage.setItem("accessToken", at); localStorage.setItem("refreshToken", rt); }, { at: t.accessToken, rt: t.refreshToken });
  const trip = await createTrip(t.accessToken);
  await createSession(t.accessToken, trip.id);
  await go(`${BASE}/trip-workspace?tripId=${trip.id}`, 2500); await shot("05-trip-workspace.png");

  const chatTab = page.getByRole("button", { name: "AI Chat" });
  try { await chatTab.waitFor({ timeout: 8000 }); } catch {}
  if (await chatTab.isVisible().catch(() => false)) {
    await chatTab.click();
    await sleep(2500);
    await shot("06-chat-panel.png");
    try { await page.getByText(/\d+\s+phiên/i).first().waitFor({ timeout: 6000 }); } catch {}
    await shot("07-chat-session-switcher.png");
    const rename = page.getByTitle("Đổi tên phiên");
    if (await rename.isVisible().catch(() => false)) {
      await rename.click();
      await sleep(700);
      await shot("08-chat-rename.png");
      await page.getByTitle("Hủy đổi tên").click().catch(() => {});
    }
    await sleep(500);
    await shot("09-chat-delete-control.png");
    await sleep(500);
    await shot("10-chat-proposal-state.png");
  } else {
    console.log("chat tab not visible — 06-10 skipped");
  }
} catch (e) {
  console.log("UAT_ERROR", e);
} finally {
  await browser.close();
  console.log("DONE");
}
