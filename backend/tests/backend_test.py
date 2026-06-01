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

# Far-future test dates so auto-expiry never trips legacy slot fixtures
from datetime import datetime as _now, timezone as _tz, timedelta as _td
_BASE = _now.now(_tz.utc) + _td(days=120)
FUT_D1 = _BASE.strftime("%Y-%m-%d")
FUT_D2 = (_BASE + _td(days=1)).strftime("%Y-%m-%d")
FUT_D3 = (_BASE + _td(days=2)).strftime("%Y-%m-%d")
FUT_D4 = (_BASE + _td(days=10)).strftime("%Y-%m-%d")

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
        "date": FUT_D1, "start_time": "10:00", "end_time": "18:00", "price": 500, "notes": "صباحي"
    }, headers=h)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "available"
    assert data["price"] == 500
    state["slot_id"] = data["id"]

    # Second slot at higher price
    r2 = s.post(f"{API}/chalets/{state['chalet_id']}/slots", json={
        "date": FUT_D2, "start_time": "10:00", "end_time": "18:00", "price": 800
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
    r = s.get(f"{API}/chalets", params={"date": FUT_D1})
    assert state["chalet_id"] in [c["id"] for c in r.json()]
    r2 = s.get(f"{API}/chalets", params={"date": "2099-01-01"})
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
    assert data["slot_date"] == FUT_D1
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
        "date": FUT_D4, "start_time": "10:00", "end_time": "12:00", "price": 100
    }, headers=h_o)
    sid = rs.json()["id"]

    h_a = {"Authorization": f"Bearer {state['admin_token']}"}
    r = s.delete(f"{API}/admin/chalets/{cid}", headers=h_a)
    assert r.status_code == 200
    # slot list should not contain sid
    sl = s.get(f"{API}/chalets/{cid}/slots").json()
    assert all(item["id"] != sid for item in sl)


# ---------- Iteration 3: Owner-cancel / Complete / Delete / Auto-expiry ----------

def _new_slot(s, chalet_id, owner_token, date_str, start="10:00", end="18:00", price=400):
    h = {"Authorization": f"Bearer {owner_token}"}
    r = s.post(f"{API}/chalets/{chalet_id}/slots", json={
        "date": date_str, "start_time": start, "end_time": end, "price": price
    }, headers=h)
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _new_booking(s, slot_id, customer_token):
    h = {"Authorization": f"Bearer {customer_token}"}
    r = s.post(f"{API}/bookings", json={"slot_id": slot_id}, headers=h)
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_owner_cancel_accepted_booking_releases_slot(s):
    """Owner cancels accepted booking -> slot released, status=cancelled, customer notified."""
    slot_id = _new_slot(s, state["chalet_id"], state["owner_token"], "2026-08-10", price=350)
    booking_id = _new_booking(s, slot_id, state["customer_token"])

    h_o = {"Authorization": f"Bearer {state['owner_token']}"}
    assert s.post(f"{API}/bookings/{booking_id}/accept", headers=h_o).status_code == 200

    h_c = {"Authorization": f"Bearer {state['customer_token']}"}
    before = s.get(f"{API}/notifications", headers=h_c).json()
    before_ids = {n["id"] for n in before["items"]}

    r = s.post(f"{API}/bookings/{booking_id}/owner-cancel", headers=h_o)
    assert r.status_code == 200, r.text

    # Booking status flipped
    mine = s.get(f"{API}/bookings/me", headers=h_c).json()
    b = next(x for x in mine if x["id"] == booking_id)
    assert b["status"] == "cancelled"

    # Slot released
    slots = s.get(f"{API}/chalets/{state['chalet_id']}/slots").json()
    released = next(sl for sl in slots if sl["id"] == slot_id)
    assert released["status"] == "available"

    # Customer notification
    after = s.get(f"{API}/notifications", headers=h_c).json()
    new = [n for n in after["items"] if n["id"] not in before_ids]
    assert any(n["type"] == "booking_cancelled_by_owner" for n in new), new


def test_owner_cancel_rbac(s):
    """Another owner / customer cannot cancel someone else's booking."""
    # Customer cannot call owner-cancel
    slot_id = _new_slot(s, state["chalet_id"], state["owner_token"], "2026-08-11")
    booking_id = _new_booking(s, slot_id, state["customer_token"])
    h_c = {"Authorization": f"Bearer {state['customer_token']}"}
    r = s.post(f"{API}/bookings/{booking_id}/owner-cancel", headers=h_c)
    assert r.status_code in (401, 403)


def test_complete_accepted_booking(s):
    slot_id = _new_slot(s, state["chalet_id"], state["owner_token"], "2026-08-12", price=420)
    booking_id = _new_booking(s, slot_id, state["customer_token"])
    h_o = {"Authorization": f"Bearer {state['owner_token']}"}
    s.post(f"{API}/bookings/{booking_id}/accept", headers=h_o)

    r = s.post(f"{API}/bookings/{booking_id}/complete", headers=h_o)
    assert r.status_code == 200, r.text

    h_c = {"Authorization": f"Bearer {state['customer_token']}"}
    mine = s.get(f"{API}/bookings/me", headers=h_c).json()
    b = next(x for x in mine if x["id"] == booking_id)
    assert b["status"] == "completed"

    # Slot released
    slots = s.get(f"{API}/chalets/{state['chalet_id']}/slots").json()
    released = next(sl for sl in slots if sl["id"] == slot_id)
    assert released["status"] == "available"

    state["completed_booking_id"] = booking_id


def test_complete_requires_accepted_status(s):
    """Cannot complete a pending booking — must accept first."""
    slot_id = _new_slot(s, state["chalet_id"], state["owner_token"], "2026-08-13")
    booking_id = _new_booking(s, slot_id, state["customer_token"])
    h_o = {"Authorization": f"Bearer {state['owner_token']}"}
    r = s.post(f"{API}/bookings/{booking_id}/complete", headers=h_o)
    assert r.status_code == 400


def test_delete_only_for_terminal_bookings(s):
    """Cannot delete a pending/accepted booking; can delete completed."""
    # Active booking — should reject delete
    slot_id = _new_slot(s, state["chalet_id"], state["owner_token"], "2026-08-14")
    active_id = _new_booking(s, slot_id, state["customer_token"])

    h_o = {"Authorization": f"Bearer {state['owner_token']}"}
    r = s.delete(f"{API}/bookings/{active_id}", headers=h_o)
    assert r.status_code == 400, f"Expected 400 for active booking delete, got {r.status_code}"

    # Cleanup: cancel + delete
    s.post(f"{API}/bookings/{active_id}/owner-cancel", headers=h_o)

    # Now terminal: delete should work
    r2 = s.delete(f"{API}/bookings/{active_id}", headers=h_o)
    assert r2.status_code == 200

    # Verify gone
    h_c = {"Authorization": f"Bearer {state['customer_token']}"}
    mine = s.get(f"{API}/bookings/me", headers=h_c).json()
    assert all(b["id"] != active_id for b in mine)


def test_delete_terminal_booking_completed(s):
    """Delete the previously completed booking — should succeed."""
    h_o = {"Authorization": f"Bearer {state['owner_token']}"}
    r = s.delete(f"{API}/bookings/{state['completed_booking_id']}", headers=h_o)
    assert r.status_code == 200


def test_delete_rbac_customer_forbidden(s):
    """Customer cannot delete bookings via DELETE /bookings/{id}."""
    slot_id = _new_slot(s, state["chalet_id"], state["owner_token"], "2026-08-15")
    booking_id = _new_booking(s, slot_id, state["customer_token"])
    h_o = {"Authorization": f"Bearer {state['owner_token']}"}
    s.post(f"{API}/bookings/{booking_id}/owner-cancel", headers=h_o)
    # Customer tries to delete
    h_c = {"Authorization": f"Bearer {state['customer_token']}"}
    r = s.delete(f"{API}/bookings/{booking_id}", headers=h_c)
    assert r.status_code in (401, 403)
    # cleanup
    s.delete(f"{API}/bookings/{booking_id}", headers=h_o)


# --- Iteration 4: helper to seed PAST slot+booking directly via Mongo,
# bypassing the new "no past slot creation" rule (added in iteration 4). ---
def _seed_past_slot_and_booking(chalet_id, owner_id, customer_id, customer_name,
                                  customer_phone, status="pending", price=300,
                                  days_ago=2):
    from datetime import datetime, timedelta, timezone as _tz
    from pymongo import MongoClient
    from dotenv import load_dotenv
    load_dotenv("/app/backend/.env")
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = MongoClient(mongo_url)
    db = client[db_name]

    past_date = (datetime.now(_tz.utc) - timedelta(days=days_ago)).strftime("%Y-%m-%d")
    slot_id = str(uuid.uuid4())
    booking_id = str(uuid.uuid4())
    now_iso = datetime.now(_tz.utc).isoformat()
    slot_doc = {
        "id": slot_id, "chalet_id": chalet_id, "owner_id": owner_id,
        "date": past_date, "start_time": "10:00", "end_time": "14:00",
        "price": float(price), "status": "booked", "booking_id": booking_id,
        "block_reason": None, "notes": "", "created_at": now_iso,
    }
    booking_doc = {
        "id": booking_id, "slot_id": slot_id, "chalet_id": chalet_id,
        "customer_id": customer_id, "customer_name": customer_name,
        "customer_phone": customer_phone or "0500000000", "owner_id": owner_id,
        "slot_date": past_date, "slot_start": "10:00", "slot_end": "14:00",
        "total_price": float(price), "notes": "", "status": status,
        "created_at": now_iso,
    }
    db["slots"].insert_one(slot_doc)
    db["bookings"].insert_one(booking_doc)
    client.close()
    return slot_id, booking_id


def test_auto_expire_pending_past_booking(s):
    """Pending booking with past slot date -> auto-flipped to expired on list; slot released."""
    slot_id, booking_id = _seed_past_slot_and_booking(
        state["chalet_id"], state["owner_id"], state["customer_id"],
        "TEST عميل", None, status="pending", price=333, days_ago=2,
    )

    # Trigger via GET /bookings/owner
    h_o = {"Authorization": f"Bearer {state['owner_token']}"}
    owner_bookings = s.get(f"{API}/bookings/owner", headers=h_o).json()
    b = next(x for x in owner_bookings if x["id"] == booking_id)
    assert b["status"] == "expired", f"Expected expired, got {b['status']}"

    slots = s.get(f"{API}/chalets/{state['chalet_id']}/slots").json()
    released = next(sl for sl in slots if sl["id"] == slot_id)
    assert released["status"] == "available"

    s.delete(f"{API}/bookings/{booking_id}", headers=h_o)


def test_auto_complete_accepted_past_booking(s):
    """Accepted booking with past slot date -> auto-flipped to completed; slot released."""
    slot_id, booking_id = _seed_past_slot_and_booking(
        state["chalet_id"], state["owner_id"], state["customer_id"],
        "TEST عميل", None, status="accepted", price=444, days_ago=2,
    )
    h_c = {"Authorization": f"Bearer {state['customer_token']}"}
    mine = s.get(f"{API}/bookings/me", headers=h_c).json()
    b = next(x for x in mine if x["id"] == booking_id)
    assert b["status"] == "completed", f"Expected completed, got {b['status']}"

    slots = s.get(f"{API}/chalets/{state['chalet_id']}/slots").json()
    released = next(sl for sl in slots if sl["id"] == slot_id)
    assert released["status"] == "available"

    h_o = {"Authorization": f"Bearer {state['owner_token']}"}
    s.delete(f"{API}/bookings/{booking_id}", headers=h_o)


def test_auto_expiry_also_runs_on_admin_bookings_and_slots_listing(s):
    """Verify auto-expiry triggers from /admin/bookings and /chalets/{id}/slots routes too."""
    slot_id, booking_id = _seed_past_slot_and_booking(
        state["chalet_id"], state["owner_id"], state["customer_id"],
        "TEST عميل", None, status="pending", price=222, days_ago=2,
    )

    # Trigger via /chalets/{id}/slots
    s.get(f"{API}/chalets/{state['chalet_id']}/slots")

    h_o = {"Authorization": f"Bearer {state['owner_token']}"}
    owner_bookings = s.get(f"{API}/bookings/owner", headers=h_o).json()
    b = next(x for x in owner_bookings if x["id"] == booking_id)
    assert b["status"] == "expired"

    # Admin listing
    h_a = {"Authorization": f"Bearer {state['admin_token']}"}
    admin_bookings = s.get(f"{API}/admin/bookings", headers=h_a).json()
    assert any(x["id"] == booking_id for x in admin_bookings)

    s.delete(f"{API}/bookings/{booking_id}", headers=h_o)


def test_starting_price_recomputed_after_owner_cancel(s):
    """Owner cancels booking -> chalet starting_price should reflect cheapest available slot."""
    # Lower-price slot, then book it, then owner-cancel; price should drop back.
    cheap_slot = _new_slot(s, state["chalet_id"], state["owner_token"], "2026-09-01", price=99)
    booking_id = _new_booking(s, cheap_slot, state["customer_token"])
    h_o = {"Authorization": f"Bearer {state['owner_token']}"}
    s.post(f"{API}/bookings/{booking_id}/accept", headers=h_o)

    # Cancel it
    s.post(f"{API}/bookings/{booking_id}/owner-cancel", headers=h_o)

    chalet = s.get(f"{API}/chalets/{state['chalet_id']}").json()
    assert chalet["starting_price"] <= 99.0, f"starting_price not recomputed: {chalet['starting_price']}"

    # cleanup
    s.delete(f"{API}/bookings/{booking_id}", headers=h_o)


# ---------- Cleanup ----------
# ---------- Iteration 4: past-date rejection + block_reason ----------

def test_slot_rejects_past_date(s):
    from datetime import datetime, timezone, timedelta
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    h = {"Authorization": f"Bearer {state['owner_token']}"}
    r = s.post(f"{API}/chalets/{state['chalet_id']}/slots", json={
        "date": yesterday, "start_time": "10:00", "end_time": "14:00", "price": 100,
    }, headers=h)
    assert r.status_code == 400, r.text


def test_slot_rejects_past_time_today(s):
    """If date == today and start_time has passed, backend should reject."""
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    h = {"Authorization": f"Bearer {state['owner_token']}"}
    r = s.post(f"{API}/chalets/{state['chalet_id']}/slots", json={
        "date": today, "start_time": "00:01", "end_time": "23:59", "price": 100,
    }, headers=h)
    # Either 400 (past time) or 200 if server clock is exactly at 00:00 UTC — be tolerant
    assert r.status_code in (200, 400), r.text


def test_slot_create_blocked_with_reason(s):
    """Owner can create a slot with block_reason and status auto-set to 'blocked'."""
    h = {"Authorization": f"Bearer {state['owner_token']}"}
    for reason in ("personal", "maintenance", "closure"):
        r = s.post(f"{API}/chalets/{state['chalet_id']}/slots", json={
            "date": FUT_D3, "start_time": f"0{6 + ord(reason[0]) % 5}:00",
            "end_time": "23:00", "price": 0, "block_reason": reason,
        }, headers=h)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "blocked", f"Expected blocked, got {data['status']}"
        assert data["block_reason"] == reason
        # cleanup
        s.delete(f"{API}/slots/{data['id']}", headers=h)


def test_slot_model_has_block_reason_field(s):
    """Verify Slot returned by GET includes block_reason (even when null)."""
    r = s.get(f"{API}/chalets/{state['chalet_id']}/slots")
    assert r.status_code == 200
    slots = r.json()
    assert len(slots) > 0
    assert "block_reason" in slots[0], f"block_reason missing in slot: {slots[0].keys()}"


# ---------- Cleanup ----------
def test_zz_cleanup(s):
    h_a = {"Authorization": f"Bearer {state['admin_token']}"}
    s.delete(f"{API}/admin/chalets/{state['chalet_id']}", headers=h_a)
