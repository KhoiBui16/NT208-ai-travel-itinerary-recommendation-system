"""Test script - outputs results to JSON file."""
import sys, io, json, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import httpx

BASE = "http://127.0.0.1:8001"
RESULTS = []

def call(method, url, **kwargs):
    with httpx.Client(
        timeout=15,
        limits=httpx.Limits(max_connections=1, max_keepalive_connections=0),
    ) as client:
        return getattr(client, method)(url, **kwargs)

def test(name, method, url, expect_status=None, **kwargs):
    try:
        r = call(method, url, **kwargs)
        passed = True if (expect_status is None or r.status_code == expect_status) else False
        result = {"name": name, "status": r.status_code, "pass": passed, "body": r.text[:500]}
        RESULTS.append(result)
        mark = "PASS" if passed else "FAIL"
        print(f"  [{mark}] [{r.status_code}] {name}")
        return r
    except Exception as e:
        RESULTS.append({"name": name, "status": 0, "pass": False, "body": str(e)})
        print(f"  [ERROR] {name}: {e}")
        return None

print("Starting API Tests...")

# Health
test("GET /", "get", f"{BASE}/", expect_status=200)
test("GET /health", "get", f"{BASE}/health", expect_status=200)

# Destinations
r = test("GET /destinations", "get", f"{BASE}/api/v1/destinations/", expect_status=200)
if r:
    dest = r.json().get("destinations", [])
    RESULTS[-1]["extra"] = f"{len(dest)} dests: {[d['name'] for d in dest]}"

# Register (fresh email)
import uuid
email = f"test_{uuid.uuid4().hex[:6]}@test.com"
r = test("POST /auth/register", "post", f"{BASE}/api/v1/auth/register",
         json={"email": email, "password": "test123456", "name": "Test User"},
         expect_status=201)
token = ""
if r and r.status_code == 201:
    data = r.json()
    token = data.get("access_token", "")
    RESULTS[-1]["extra"] = f"success={data.get('success')}, token_len={len(token)}"

# If register didn't give token, try login
if not token:
    r = test("POST /auth/login", "post", f"{BASE}/api/v1/auth/login",
             json={"email": email, "password": "test123456"},
             expect_status=200)
    if r and r.status_code == 200:
        token = r.json().get("access_token", "")

headers = {"Authorization": f"Bearer {token}"} if token else {}
RESULTS.append({"name": "TOKEN_CHECK", "status": 0, "pass": bool(token), "body": f"token_len={len(token)}, first20={token[:20]}"})

# Profile with auth
r = test("GET /users/profile (auth)", "get", f"{BASE}/api/v1/users/profile",
         headers=headers, expect_status=200)
if r:
    RESULTS[-1]["extra"] = r.text[:200]

# Profile without auth
test("GET /users/profile (no auth)", "get", f"{BASE}/api/v1/users/profile",
     expect_status=401)

# Wrong password
test("POST /auth/login (wrong pw)", "post", f"{BASE}/api/v1/auth/login",
     json={"email": email, "password": "wrongpass"},
     expect_status=401)

# Generate itinerary
r = test("POST /itineraries/generate", "post", f"{BASE}/api/v1/itineraries/generate",
         json={"destination": "Ha Noi", "startDate": "2025-06-01", "endDate": "2025-06-03",
               "budget": 5000000, "interests": ["culture", "food"]},
         headers=headers, expect_status=201)
itin_id = ""
if r and r.status_code == 201:
    itin_data = r.json()
    itin_id = itin_data.get("id", "")
    days = itin_data.get("days", [])
    RESULTS[-1]["extra"] = f"id={itin_id[:20]}, days={len(days)}, cost={itin_data.get('totalCost', 0)}"

# Get itineraries list
r = test("GET /itineraries (list)", "get", f"{BASE}/api/v1/itineraries/",
         headers=headers, expect_status=200)
if r and r.status_code == 200:
    RESULTS[-1]["extra"] = f"total={r.json().get('total', 0)}"

# Get single itinerary
if itin_id:
    test("GET /itineraries/{id}", "get", f"{BASE}/api/v1/itineraries/{itin_id}",
         expect_status=200)

# Rate itinerary
if itin_id:
    test("PUT /itineraries/{id}/rating", "put",
         f"{BASE}/api/v1/itineraries/{itin_id}/rating",
         json={"rating": 4, "feedback": "Great trip!"},
         headers=headers, expect_status=200)

# Delete itinerary
if itin_id:
    test("DELETE /itineraries/{id}", "delete",
         f"{BASE}/api/v1/itineraries/{itin_id}",
         headers=headers, expect_status=204)

# Summary
passed = sum(1 for r in RESULTS if r["pass"])
total = len(RESULTS)
print(f"\nRESULTS: {passed}/{total} passed")

# Write to JSON file
output_path = os.path.join(os.path.dirname(__file__), "test_results.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump({"passed": passed, "total": total, "results": RESULTS}, f, ensure_ascii=False, indent=2)
print(f"Results written to {output_path}")
