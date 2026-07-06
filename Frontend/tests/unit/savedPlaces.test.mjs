/**
 * Unit tests for savedPlaces.ts utility (plain Node.js — no vitest required).
 *
 * Run: node tests/unit/savedPlaces.test.mjs
 */

// ── Inline the normalizer logic (no TypeScript build needed for this test) ──

function normalizeSavedPlace(raw) {
  if (!raw || typeof raw !== "object") return null;
  const r = raw;
  const savedId = typeof r.id === "number" ? r.id : null;
  const place = r.place && typeof r.place === "object" ? r.place : null;
  if (!savedId || !place) return null;
  const placeId = typeof place.id === "number" ? place.id : null;
  if (!placeId) return null;
  return {
    savedId,
    placeId,
    name: typeof place.name === "string" ? place.name : "",
    image: typeof place.image === "string" ? place.image : null,
    location: typeof place.location === "string" ? place.location : null,
    category: typeof place.type === "string" ? place.type : null,
    city: typeof place.city === "string" ? place.city : null,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : undefined,
  };
}

// ── Test helpers ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(
      msg || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function assertNull(actual, msg) {
  if (actual !== null) {
    throw new Error(msg || `Expected null, got ${JSON.stringify(actual)}`);
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

console.log("normalizeSavedPlace:");

test(
  "handles correct BE shape { id: 1, place: { id: 100, name: 'X' } }",
  () => {
    const result = normalizeSavedPlace({ id: 1, place: { id: 100, name: "X" } });
    assertEqual(result.savedId, 1);
    assertEqual(result.placeId, 100);
    assertEqual(result.name, "X");
  }
);

test("handles full place data correctly", () => {
  const result = normalizeSavedPlace({
    id: 5,
    place: {
      id: 200,
      name: "Hồ Hoàn Kiếm",
      type: "attraction",
      image: "https://example.com/img.jpg",
      location: "Hà Nội, Việt Nam",
      city: "Hà Nội",
    },
    createdAt: "2024-01-01T00:00:00Z",
  });
  assertEqual(result.savedId, 5);
  assertEqual(result.placeId, 200);
  assertEqual(result.name, "Hồ Hoàn Kiếm");
  assertEqual(result.category, "attraction");
  assertEqual(result.city, "Hà Nội");
  assertEqual(result.createdAt, "2024-01-01T00:00:00Z");
});

test("returns null for null input", () => {
  assertNull(normalizeSavedPlace(null));
});

test("returns null for undefined input", () => {
  assertNull(normalizeSavedPlace(undefined));
});

test("returns null when id is missing", () => {
  assertNull(normalizeSavedPlace({ place: { id: 100, name: "X" } }));
});

test("returns null when place is missing", () => {
  assertNull(normalizeSavedPlace({ id: 1 }));
});

test("returns null when place.id is missing", () => {
  assertNull(normalizeSavedPlace({ id: 1, place: { name: "X" } }));
});

test("returns null for string id (wrong type)", () => {
  assertNull(normalizeSavedPlace({ id: "abc", place: { id: 100, name: "X" } }));
});

test("image defaults to null when missing from place", () => {
  const result = normalizeSavedPlace({ id: 1, place: { id: 100, name: "X" } });
  assertEqual(result.image, null);
});

test("location defaults to null when missing from place", () => {
  const result = normalizeSavedPlace({ id: 1, place: { id: 100, name: "X" } });
  assertEqual(result.location, null);
});

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
