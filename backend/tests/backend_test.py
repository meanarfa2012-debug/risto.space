"""Backend regression tests for Resto chalet booking platform — Iteration 2 (slot-based)."""
import os
import time
import uuid
import pytest
import requests

def _read_frontend_env():
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip()
    except Exception:
        return None


BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _read_frontend_env()).rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "meanarfa2012@gmail.com"
ADMIN_PASSWORD = "maen1029384756"

RUN = uuid.uuid4().hex[:8]
OWNER_EMAIL = f"TEST_owner_{RUN}@resto.test"
OWNER_PASSWORD = "Owner12345"
CUSTOMER_PHONE = f"05000{RUN[:5]}"

state = {}


@pytest.fixture(scope="session")
def s():
    return requests.Session()


# ---------- Health ----------
def test_health(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# ---------- Auth ----------
def test_admin_login(s):
    r = s.post(f"{API}/auth/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["role"] == "admin"
    state["admin_token"] = data["token"]
    state["admin_id"] = data["user"]["id"]


def test_admin_login_invalid(s):
    r = s.post(f"{API}/auth/admin/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_owner_register(s):
    # Snapshot admin notifs to detect owner_registered notification
    h_admin = {"Authorization": f"Bearer {state['admin_token']}"}
    before = s.get(f"{API}/notifications", headers=h_admin).json()
    before_ids = {n["id"] for n in before["items"]}

    r = s.post(f"{API}/auth/owner/register", json={
        "name": "TEST Owner", "email": OWNER_EMAIL, "password": OWNER_PASSWORD, "phone": "0590000000"
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["role"] == "owner"
    state["owner_token"] = data["token"]
    state["owner_id"] = data["user"]["id"]

    # Verify admin received owner_registered notification
    after = s.get(f"{API}/notifications", headers=h_admin).json()
    new = [n for n in after["items"] if n["id"] not in before_ids]
    assert any(n["type"] == "owner_registered" for n in new), f"No owner_registered notification: {new}"


def test_owner_register_duplicate(s):
    r = s.post(f"{API}/auth/owner/register", json={"name": "Dup", "email": OWNER_EMAIL, "password": "x"})
    assert r.status_code == 400


def test_owner_login(s):
    r = s.post(f"{API}/auth/owner/login", json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD})
    assert r.status_code == 200


def test_customer_login_auto_register(s):
    r = s.post(f"{API}/auth/customer/login", json={"phone": CUSTOMER_PHONE, "name": "TEST عميل"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["role"] == "customer"
    state["customer_token"] = data["token"]
    state["customer_id"] = data["user"]["id"]


def test_auth_me(s):
    h = {"Authorization": f"Bearer {state['owner_token']}"}
    r = s.get(f"{API}/auth/me", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert body["role"] == "owner"
    assert "password_hash" not in body


def test_auth_me_unauthorized(s):
    r = s.get(f"{API}/auth/me")
    assert r.status_code == 401


# ---------- Chalets: new schema ----------
def test_create_chalet_pending_and_admin_notified(s):
    h_admin = {"Authorization": f"Bearer {state['admin_token']}"}
    before = s.get(f"{API}/notifications", headers=h_admin).json()
    before_ids = {n["id"] for n in before["items"]}

    h = {"Authorization": f"Bearer {state['owner_token']}"}
    payload = {
        "name": f"TEST شاليه {RUN}",
        "description": "شاليه فاخر للاختبار",
        "phone": "0599999999",
        "google_maps_url": "https://maps.google.com/?q=31.9,35.2",
        "rooms": 3,
        "capacity": 8,
        "features": ["مسبح", "واي فاي", "حديقة"],
        "images": [],
        "videos": [],
    }
    r = s.post(f"{API}/chalets", json=payload, headers=h)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "pending", f"Expected pending, got {data['status']}"
    assert data["google_maps_url"] == payload["google_maps_url"]
    assert data["features"] == payload["features"]
    assert "videos" in data
    assert "location" not in data and "address" not in data and "price_per_night" not in data
    state["chalet_id"] = data["id"]
    state["chalet_slug"] = data["slug"]

    # Verify admin notification fired
    after = s.get(f"{API}/notifications", headers=h_admin).json()
    new = [n for n in after["items"] if n["id"] not in before_ids]
    assert any(n["type"] == "chalet_registered" for n in new), f"No chalet_registered: {new}"

    # Owner pending notification
    h_o = {"Authorization": f"Bearer {state['owner_token']}"}
    owner_notifs = s.get(f"{API}/notifications", headers=h_o).json()
    assert any(n["type"] == "chalet_pending" for n in owner_notifs["items"])


def test_pending_chalet_not_in_public_list(s):
    r = s.get(f"{API}/chalets")
    assert r.status_code == 200
    ids = [c["id"] for c in r.json()]
    assert state["chalet_id"] not in ids, "Pending chalet must NOT appear in public list"


def test_admin_approves_chalet(s):
    h = {"Authorization": f"Bearer {state['admin_token']}"}
    r = s.post(f"{API}/admin/chalets/{state['chalet_id']}/status", params={"status": "approved"}, headers=h)
    assert r.status_code == 200

    # Owner notified of approval
    h_o = {"Authorization": f"Bearer {state['owner_token']}"}
    notifs = s.get(f"{API}/notifications", headers=h_o).json()
    assert any(n["type"] == "chalet_approved" for n in notifs["items"])

    # Now in public list
    r = s.get(f"{API}/chalets")
    assert any(c["id"] == state["chalet_id"] for c in r.json())


def test_admin_invalid_status(s):
    h = {"Authorization": f"Bearer {state['admin_token']}"}
    r = s.post(f"{API}/admin/chalets/{state['chalet_id']}/status", params={"status": "garbage"}, headers=h)
    assert r.status_code == 400


def test_get_chalet_by_id_and_slug(s):
    r = s.get(f"{API}/chalets/{state['chalet_id']}")
    assert r.status_code == 200
    assert r.json()["id"] == state["chalet_id"]
    r2 = s.get(f"{API}/chalets/by-slug/{state['chalet_slug']}")
    assert r2.status_code == 200
    assert r2.json()["slug"] == state["chalet_slug"]


# ---------- Slots ----------
def test_customer_cannot_create_slot(s):
    h = {"Authorization": f"Bearer {state['customer_token']}"}
    r = s.post(f"{API}/chalets/{state['chalet_id']}/slots", json={
        "date": "2026-06-01", "start_time": "10:00", "end_time": "18:00", "price": 500
    }, headers=h)
    assert r.status_code == 403


def test_create_slot(s):
    h = {"Authorization": f"Bearer {state['owner_token']}"}
    r = s.post(f"{API}/chalets/{state['chalet_id']}/slots", json={
        "date": "2026-06-01", "start_time": "10:00", "end_time": "18:00", "price": 500, "notes": "صباحي"
    }, headers=h)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "available"
    assert data["price"] == 500
    state["slot_id"] = data["id"]

    # Second slot at higher price
    r2 = s.post(f"{API}/chalets/{state['chalet_id']}/slots", json={
        "date": "2026-06-02", "start_time": "10:00", "end_time": "18:00", "price": 800
    }, headers=h)
    assert r2.status_code == 200
    state["slot2_id"] = r2.json()["id"]


def test_starting_price_recomputed(s):
    r = s.get(f"{API}/chalets/{state['chalet_id']}")
    assert r.status_code == 200
    assert r.json()["starting_price"] == 500.0


def test_list_slots(s):
    r = s.get(f"{API}/chalets/{state['chalet_id']}/slots")
    assert r.status_code == 200
    assert len(r.json()) >= 2


def test_update_slot(s):
    h = {"Authorization": f"Bearer {state['owner_token']}"}
    r = s.put(f"{API}/slots/{state['slot2_id']}", json={"price": 700}, headers=h)
    assert r.status_code == 200
    assert r.json()["price"] == 700


def test_list_chalets_price_filter(s):
    # min_price=600 should exclude chalet (slot1 is 500, slot2 is 700 -> matches 600 limit)
    r = s.get(f"{API}/chalets", params={"min_price": 600})
    assert r.status_code == 200
    ids = [c["id"] for c in r.json()]
    assert state["chalet_id"] in ids  # has slot2 at 700

    r2 = s.get(f"{API}/chalets", params={"min_price": 9999})
    assert state["chalet_id"] not in [c["id"] for c in r2.json()]


def test_date_filter(s):
    r = s.get(f"{API}/chalets", params={"date": "2026-06-01"})
    assert state["chalet_id"] in [c["id"] for c in r.json()]
    r2 = s.get(f"{API}/chalets", params={"date": "2030-01-01"})
    assert state["chalet_id"] not in [c["id"] for c in r2.json()]


# ---------- Bookings ----------
def test_create_booking_with_slot_and_three_notifications(s):
    """CRITICAL: verifies fix — admin must receive notification on new booking."""
    h_admin = {"Authorization": f"Bearer {state['admin_token']}"}
    before_admin = s.get(f"{API}/notifications", headers=h_admin).json()
    before_admin_ids = {n["id"] for n in before_admin["items"]}

    h_owner = {"Authorization": f"Bearer {state['owner_token']}"}
    before_owner = s.get(f"{API}/notifications", headers=h_owner).json()
    before_owner_ids = {n["id"] for n in before_owner["items"]}

    h = {"Authorization": f"Bearer {state['customer_token']}"}
    r = s.post(f"{API}/bookings", json={"slot_id": state["slot_id"], "notes": "اختبار"}, headers=h)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "pending"
    assert data["slot_id"] == state["slot_id"]
    assert data["total_price"] == 500.0
    assert data["slot_date"] == "2026-06-01"
    assert "check_in" not in data and "check_out" not in data and "nights" not in data
    state["booking_id"] = data["id"]

    # Slot must be locked to booked
    slots = s.get(f"{API}/chalets/{state['chalet_id']}/slots").json()
    booked = next(sl for sl in slots if sl["id"] == state["slot_id"])
    assert booked["status"] == "booked"

    # Customer notif
    cn = s.get(f"{API}/notifications", headers=h).json()
    assert any(n["type"] == "booking_submitted" for n in cn["items"])

    # Owner notif (new)
    after_owner = s.get(f"{API}/notifications", headers=h_owner).json()
    new_owner = [n for n in after_owner["items"] if n["id"] not in before_owner_ids]
    assert any(n["type"] == "new_booking" for n in new_owner), f"Owner missing new_booking: {new_owner}"

    # Admin notif (CRITICAL FIX)
    after_admin = s.get(f"{API}/notifications", headers=h_admin).json()
    new_admin = [n for n in after_admin["items"] if n["id"] not in before_admin_ids]
    assert any(n["type"] == "new_booking" for n in new_admin), f"Admin missing new_booking: {new_admin}"


def test_booking_conflict_409(s):
    h = {"Authorization": f"Bearer {state['customer_token']}"}
    r = s.post(f"{API}/bookings", json={"slot_id": state["slot_id"]}, headers=h)
    assert r.status_code in (400, 409), r.text  # slot already booked


def test_cannot_edit_booked_slot(s):
    h = {"Authorization": f"Bearer {state['owner_token']}"}
    r = s.put(f"{API}/slots/{state['slot_id']}", json={"price": 999}, headers=h)
    assert r.status_code == 400


def test_cannot_delete_booked_slot(s):
    h = {"Authorization": f"Bearer {state['owner_token']}"}
    r = s.delete(f"{API}/slots/{state['slot_id']}", headers=h)
    assert r.status_code == 400


def test_my_bookings_and_owner_bookings(s):
    h = {"Authorization": f"Bearer {state['customer_token']}"}
    r = s.get(f"{API}/bookings/me", headers=h)
    assert any(b["id"] == state["booking_id"] for b in r.json())
    h2 = {"Authorization": f"Bearer {state['owner_token']}"}
    r2 = s.get(f"{API}/bookings/owner", headers=h2)
    assert any(b["id"] == state["booking_id"] for b in r2.json())


def test_accept_booking_keeps_slot_booked(s):
    h = {"Authorization": f"Bearer {state['owner_token']}"}
    r = s.post(f"{API}/bookings/{state['booking_id']}/accept", headers=h)
    assert r.status_code == 200
    slots = s.get(f"{API}/chalets/{state['chalet_id']}/slots").json()
    booked = next(sl for sl in slots if sl["id"] == state["slot_id"])
    assert booked["status"] == "booked"


# ---------- Reviews ----------
def test_create_review_after_accept_and_admin_report(s):
    h = {"Authorization": f"Bearer {state['customer_token']}"}
    r = s.post(f"{API}/reviews", json={
        "chalet_id": state["chalet_id"], "booking_id": state["booking_id"], "rating": 5, "comment": "ممتاز"
    }, headers=h)
    assert r.status_code == 200, r.text
    state["review_id"] = r.json()["id"]

    time.sleep(0.3)
    chalet = s.get(f"{API}/chalets/{state['chalet_id']}").json()
    assert chalet["avg_rating"] == 5.0
    assert chalet["reviews_count"] == 1

    # Report review -> admin notification
    h_admin = {"Authorization": f"Bearer {state['admin_token']}"}
    before = s.get(f"{API}/notifications", headers=h_admin).json()
    before_ids = {n["id"] for n in before["items"]}
    rr = s.post(f"{API}/reviews/{state['review_id']}/report", headers=h)
    assert rr.status_code == 200
    after = s.get(f"{API}/notifications", headers=h_admin).json()
    new = [n for n in after["items"] if n["id"] not in before_ids]
    assert any(n["type"] == "review_reported" for n in new)


# ---------- Upload ----------
def test_upload_image(s):
    h = {"Authorization": f"Bearer {state['owner_token']}"}
    png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xfc\xcf\xc0"
        b"\x00\x00\x00\x03\x00\x01\xa3\n\xf3\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    r = s.post(f"{API}/upload", files={"file": ("t.png", png, "image/png")}, headers=h)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["kind"] == "image"
    assert "path" in data and data["url"].startswith("/api/files/")


def test_upload_unsupported_ext(s):
    h = {"Authorization": f"Bearer {state['owner_token']}"}
    r = s.post(f"{API}/upload", files={"file": ("t.exe", b"x", "application/octet-stream")}, headers=h)
    assert r.status_code == 400


# ---------- RBAC ----------
def test_customer_cannot_create_chalet(s):
    h = {"Authorization": f"Bearer {state['customer_token']}"}
    r = s.post(f"{API}/chalets", json={"name": "x", "description": "x", "rooms": 1, "capacity": 1}, headers=h)
    assert r.status_code == 403


def test_owner_cannot_approve_chalet(s):
    h = {"Authorization": f"Bearer {state['owner_token']}"}
    r = s.post(f"{API}/admin/chalets/{state['chalet_id']}/status", params={"status": "approved"}, headers=h)
    assert r.status_code == 403


# ---------- Admin ----------
def test_admin_stats_includes_pending(s):
    h = {"Authorization": f"Bearer {state['admin_token']}"}
    r = s.get(f"{API}/admin/stats", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert "pending_chalets" in body


def test_admin_feature_chalet(s):
    h = {"Authorization": f"Bearer {state['admin_token']}"}
    r = s.post(f"{API}/admin/chalets/{state['chalet_id']}/feature", params={"featured": True}, headers=h)
    assert r.status_code == 200
    assert r.json()["featured"] is True


def test_admin_suspend_chalet_hides_from_public(s):
    h = {"Authorization": f"Bearer {state['admin_token']}"}
    r = s.post(f"{API}/admin/chalets/{state['chalet_id']}/status", params={"status": "suspended"}, headers=h)
    assert r.status_code == 200
    pub = s.get(f"{API}/chalets").json()
    assert state["chalet_id"] not in [c["id"] for c in pub]
    # restore
    s.post(f"{API}/admin/chalets/{state['chalet_id']}/status", params={"status": "approved"}, headers=h)


def test_admin_delete_chalet_cascades_slots(s):
    """Create a sacrificial chalet+slot, then admin-delete and verify slot gone."""
    h_o = {"Authorization": f"Bearer {state['owner_token']}"}
    rc = s.post(f"{API}/chalets", json={
        "name": f"TEST_DEL {RUN}", "description": "x", "rooms": 1, "capacity": 1, "features": [],
    }, headers=h_o)
    cid = rc.json()["id"]
    rs = s.post(f"{API}/chalets/{cid}/slots", json={
        "date": "2026-07-01", "start_time": "10:00", "end_time": "12:00", "price": 100
    }, headers=h_o)
    sid = rs.json()["id"]

    h_a = {"Authorization": f"Bearer {state['admin_token']}"}
    r = s.delete(f"{API}/admin/chalets/{cid}", headers=h_a)
    assert r.status_code == 200
    # slot list should not contain sid
    sl = s.get(f"{API}/chalets/{cid}/slots").json()
    assert all(item["id"] != sid for item in sl)


# ---------- Cleanup ----------
def test_zz_cleanup(s):
    h_a = {"Authorization": f"Bearer {state['admin_token']}"}
    s.delete(f"{API}/admin/chalets/{state['chalet_id']}", headers=h_a)
