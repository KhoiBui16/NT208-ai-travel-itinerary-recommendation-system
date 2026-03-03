"""
test_full_api.py — Comprehensive API test script for MVP #1
Tests all endpoints sequentially with detailed output.
"""

import json
import time
import urllib.request
import urllib.error
import sys

BASE = "http://localhost:8000"
RESULTS = []
TOKEN = None
USER_ID = None
ITINERARY_ID = None
ACTIVITY_ID = None


def req(method, path, body=None, token=None, expect_status=None):
    """Make HTTP request and return (status_code, response_dict)"""
    url = BASE + path
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    data = json.dumps(body).encode() if body else None
    request = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        response = urllib.request.urlopen(request, timeout=15)
        status = response.status
        content = response.read().decode()
        result = json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        status = e.code
        content = e.read().decode()
        try:
            result = json.loads(content)
        except:
            result = {"raw": content}
    except Exception as e:
        return (-1, {"error": str(e)})

    return (status, result)


def test(name, method, path, body=None, token=None, expect_status=200):
    global TOKEN, USER_ID, ITINERARY_ID, ACTIVITY_ID

    status, data = req(method, path, body, token)
    passed = status == expect_status

    icon = "PASS" if passed else "FAIL"
    print(f"  [{icon}] {name}")
    print(f"         {method} {path} -> {status} (expected {expect_status})")

    if not passed:
        detail = json.dumps(data, ensure_ascii=False)[:200]
        print(f"         Response: {detail}")

    RESULTS.append(
        {
            "name": name,
            "method": method,
            "path": path,
            "status": status,
            "expected": expect_status,
            "passed": passed,
            "response_preview": json.dumps(data, ensure_ascii=False)[:300],
        }
    )

    return (status, data)


print("=" * 60)
print("  MVP #1 — Full API Test Suite")
print("=" * 60)

# === 1. Health Check ===
print("\n--- 1. Health Check ---")
test("GET /", "GET", "/")
test("GET /health", "GET", "/health")

# === 2. Destinations (seed data) ===
print("\n--- 2. Destinations ---")
s, d = test("GET destinations list", "GET", "/api/v1/destinations/")
if s == 200 and "destinations" in d:
    count = len(d["destinations"])
    names = [x["name"] for x in d["destinations"]]
    print(f"         Found {count} destinations: {names}")

# === 3. Auth — Register ===
print("\n--- 3. Auth — Register ---")
ts = int(time.time())
test_email = f"test_{ts}@example.com"
s, d = test(
    "Register new user",
    "POST",
    "/api/v1/auth/register",
    body={"email": test_email, "password": "Test123456", "name": "Test User MVP1"},
    expect_status=201,
)

if s == 201 and d.get("access_token"):
    TOKEN = d["access_token"]
    USER_ID = d.get("user", {}).get("id")
    print(f"         Token: {TOKEN[:30]}...")
    print(f"         User ID: {USER_ID}")

# Register duplicate — should fail
test(
    "Register duplicate email",
    "POST",
    "/api/v1/auth/register",
    body={"email": test_email, "password": "Test123456", "name": "Dup User"},
    expect_status=400,
)

# === 4. Auth — Login ===
print("\n--- 4. Auth — Login ---")
s, d = test(
    "Login with registered user",
    "POST",
    "/api/v1/auth/login",
    body={"email": test_email, "password": "Test123456"},
)

if s == 200 and d.get("access_token"):
    TOKEN = d["access_token"]
    print(f"         Token refreshed: {TOKEN[:30]}...")

# Login wrong password
test(
    "Login wrong password",
    "POST",
    "/api/v1/auth/login",
    body={"email": test_email, "password": "WrongPassword"},
    expect_status=401,
)

# === 5. User Profile (protected) ===
print("\n--- 5. User Profile ---")
s, d = test("GET profile (with token)", "GET", "/api/v1/users/profile", token=TOKEN)
if s == 200:
    print(
        f"         Profile: {d.get('name', d.get('full_name', '?'))}, {d.get('email','?')}"
    )

test("GET profile (no token)", "GET", "/api/v1/users/profile", expect_status=401)

s, d = test(
    "UPDATE profile",
    "PUT",
    "/api/v1/users/profile",
    body={
        "name": "Updated Name",
        "phone": "0912345678",
        "interests": ["culture", "food"],
    },
    token=TOKEN,
)
if s == 200:
    print(
        f"         Updated: name={d.get('name', d.get('full_name'))}, phone={d.get('phone')}"
    )

# === 6. Generate Itinerary ===
print("\n--- 6. Generate Itinerary ---")
s, d = test(
    "Generate itinerary (with token)",
    "POST",
    "/api/v1/itineraries/generate",
    body={
        "destination": "Hà Nội",
        "startDate": "2025-06-01",
        "endDate": "2025-06-03",
        "budget": 5000000,
        "interests": ["culture", "food"],
    },
    token=TOKEN,
    expect_status=201,
)

if s == 201 and d.get("id"):
    ITINERARY_ID = d["id"]
    print(f"         Itinerary ID: {ITINERARY_ID}")
    print(
        f"         Destination: {d.get('destination')}, Days: {len(d.get('days',[]))}"
    )
    print(f"         Total cost: {d.get('totalCost')}")
    # Get first activity ID for later tests
    for day in d.get("days", []):
        for act in day.get("activities", []):
            if not ACTIVITY_ID:
                ACTIVITY_ID = act["id"]
                print(f"         First activity ID: {ACTIVITY_ID}")

# Generate as guest (no token)
s, d = test(
    "Generate itinerary (guest)",
    "POST",
    "/api/v1/itineraries/generate",
    body={
        "destination": "Đà Nẵng",
        "startDate": "2025-07-01",
        "endDate": "2025-07-02",
        "budget": 3000000,
        "interests": ["beach"],
    },
    expect_status=201,
)
GUEST_ITINERARY_ID = d.get("id") if s == 201 else None

# === 7. List Itineraries (protected) ===
print("\n--- 7. List Itineraries ---")
s, d = test("GET itineraries list", "GET", "/api/v1/itineraries/", token=TOKEN)
if s == 200:
    print(
        f"         Total: {d.get('total', '?')}, Count: {len(d.get('itineraries',[]))}"
    )

test("GET itineraries (no token)", "GET", "/api/v1/itineraries/", expect_status=401)

# === 8. Get Itinerary Detail ===
print("\n--- 8. Itinerary Detail ---")
if ITINERARY_ID:
    s, d = test("GET itinerary by ID", "GET", f"/api/v1/itineraries/{ITINERARY_ID}")
    if s == 200:
        print(f"         Dest: {d.get('destination')}, Days: {len(d.get('days',[]))}")

# === 9. Rate Itinerary ===
print("\n--- 9. Rate Itinerary ---")
if ITINERARY_ID:
    s, d = test(
        "Rate itinerary",
        "PUT",
        f"/api/v1/itineraries/{ITINERARY_ID}/rating",
        body={"rating": 5, "feedback": "Tuyệt vời!"},
        token=TOKEN,
    )
    if s == 200:
        print(f"         Rating: {d.get('rating')}, Feedback: {d.get('feedback')}")

# === 10. Remove Activity ===
print("\n--- 10. Remove Activity ---")
if ITINERARY_ID and ACTIVITY_ID:
    s, d = test(
        "Remove activity",
        "DELETE",
        f"/api/v1/itineraries/{ITINERARY_ID}/activities/{ACTIVITY_ID}",
        token=TOKEN,
    )
    if s == 200:
        print(f"         Remaining days: {len(d.get('days',[]))}")

# === 11. Delete Itinerary ===
print("\n--- 11. Delete Itinerary ---")
if ITINERARY_ID:
    test(
        "Delete itinerary",
        "DELETE",
        f"/api/v1/itineraries/{ITINERARY_ID}",
        token=TOKEN,
        expect_status=204,
    )

    test(
        "GET deleted itinerary (should 404)",
        "GET",
        f"/api/v1/itineraries/{ITINERARY_ID}",
        expect_status=404,
    )

# === Summary ===
print("\n" + "=" * 60)
passed = sum(1 for r in RESULTS if r["passed"])
failed = sum(1 for r in RESULTS if not r["passed"])
total = len(RESULTS)
print(f"  RESULTS: {passed}/{total} passed, {failed} failed")
print("=" * 60)

if failed > 0:
    print("\n  FAILED TESTS:")
    for r in RESULTS:
        if not r["passed"]:
            print(
                f"    - {r['name']}: {r['method']} {r['path']} -> {r['status']} (expected {r['expected']})"
            )
            print(f"      Response: {r['response_preview'][:150]}")

# Save results
with open("test_full_results.json", "w", encoding="utf-8") as f:
    json.dump(RESULTS, f, ensure_ascii=False, indent=2)
print(f"\nResults saved to test_full_results.json")
