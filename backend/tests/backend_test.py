"""Backend regression tests for Resto chalet booking platform."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://chalet-booking-8.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "meanarfa2012@gmail.com"
ADMIN_PASSWORD = "maen1029384756"

# Unique per-session data
RUN = uuid.uuid4().hex[:8]
OWNER_EMAIL = f"TEST_owner_{RUN}@resto.test"
OWNER_PASSWORD = "Owner12345"
CUSTOMER_PHONE = f"05000{RUN[:5]}"


@pytest.fixture(scope="session")
def s():
    return requests.Session()


# Shared state between tests
state = {}


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
    assert "token" in data and data["user"]["role"] == "admin"
    state["admin_token"] = data["token"]


def test_admin_login_invalid(s):
    r = s.post(f"{API}/auth/admin/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_owner_register(s):
    r = s.post(f"{API}/auth/owner/register", json={
        "name": "TEST Owner", "email": OWNER_EMAIL, "password": OWNER_PASSWORD, "phone": "0590000000"
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["role"] == "owner"
    state["owner_token"] = data["token"]
    state["owner_id"] = data["user"]["id"]


def test_owner_register_duplicate(s):
    r = s.post(f"{API}/auth/owner/register", json={
        "name": "Dup", "email": OWNER_EMAIL, "password": "x"
    })
    assert r.status_code == 400


def test_owner_login(s):
    r = s.post(f"{API}/auth/owner/login", json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD})
    assert r.status_code == 200
    assert "token" in r.json()


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
    assert r.json()["role"] == "owner"
    assert "password_hash" not in r.json()


def test_auth_me_unauthorized(s):
    r = s.get(f"{API}/auth/me")
    assert r.status_code == 401


# ---------- Chalets ----------
def test_create_chalet_owner(s):
    h = {"Authorization": f"Bearer {state['owner_token']}"}
    payload = {
        "name": f"TEST شاليه الفخامة {RUN}",
        "description": "شاليه فاخر للاختبار",
        "location": "الرياض",
        "address": "حي النخيل",
        "price_per_night": 500,
        "rooms": 3,
        "capacity": 8,
        "amenities": ["مسبح", "واي فاي"],
        "images": []
    }
    r = s.post(f"{API}/chalets", json=payload, headers=h)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["owner_id"] == state["owner_id"]
    assert data["slug"]
    state["chalet_id"] = data["id"]
    state["chalet_slug"] = data["slug"]


def test_get_chalet_by_id(s):
    r = s.get(f"{API}/chalets/{state['chalet_id']}")
    assert r.status_code == 200
    assert r.json()["id"] == state["chalet_id"]


def test_get_chalet_by_slug(s):
    r = s.get(f"{API}/chalets/by-slug/{state['chalet_slug']}")
    assert r.status_code == 200
    assert r.json()["slug"] == state["chalet_slug"]


def test_list_chalets_with_filters(s):
    r = s.get(f"{API}/chalets", params={"location": "الرياض", "min_price": 100, "max_price": 1000, "rooms": 2, "capacity": 4, "sort": "newest"})
    assert r.status_code == 200
    ids = [c["id"] for c in r.json()]
    assert state["chalet_id"] in ids


def test_homepage_data(s):
    r = s.get(f"{API}/chalets/homepage")
    assert r.status_code == 200
    d = r.json()
    for k in ("featured", "new", "top_rated", "latest_reviews"):
        assert k in d


def test_update_chalet(s):
    h = {"Authorization": f"Bearer {state['owner_token']}"}
    r = s.put(f"{API}/chalets/{state['chalet_id']}", json={"price_per_night": 600}, headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["price_per_night"] == 600


def test_update_chalet_forbidden_for_customer(s):
    h = {"Authorization": f"Bearer {state['customer_token']}"}
    r = s.put(f"{API}/chalets/{state['chalet_id']}", json={"price_per_night": 999}, headers=h)
    assert r.status_code == 403


def test_owner_chalets_list(s):
    h = {"Authorization": f"Bearer {state['owner_token']}"}
    r = s.get(f"{API}/owner/chalets", headers=h)
    assert r.status_code == 200
    assert any(c["id"] == state["chalet_id"] for c in r.json())


def test_customer_cannot_create_chalet(s):
    h = {"Authorization": f"Bearer {state['customer_token']}"}
    r = s.post(f"{API}/chalets", json={"name": "x", "description": "x", "location": "x", "price_per_night": 1, "rooms": 1, "capacity": 1}, headers=h)
    assert r.status_code == 403


# ---------- Bookings ----------
def test_create_booking(s):
    h = {"Authorization": f"Bearer {state['customer_token']}"}
    payload = {
        "chalet_id": state["chalet_id"],
        "check_in": "2026-06-01",
        "check_out": "2026-06-04",
        "guests": 4,
        "notes": "اختبار"
    }
    r = s.post(f"{API}/bookings", json=payload, headers=h)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["nights"] == 3
    assert data["total_price"] == 3 * 600
    assert data["status"] == "pending"
    state["booking_id"] = data["id"]


def test_booking_conflict(s):
    h = {"Authorization": f"Bearer {state['customer_token']}"}
    payload = {
        "chalet_id": state["chalet_id"],
        "check_in": "2026-06-03",
        "check_out": "2026-06-06",
        "guests": 2
    }
    r = s.post(f"{API}/bookings", json=payload, headers=h)
    assert r.status_code == 400


def test_my_bookings(s):
    h = {"Authorization": f"Bearer {state['customer_token']}"}
    r = s.get(f"{API}/bookings/me", headers=h)
    assert r.status_code == 200
    assert any(b["id"] == state["booking_id"] for b in r.json())


def test_owner_bookings(s):
    h = {"Authorization": f"Bearer {state['owner_token']}"}
    r = s.get(f"{API}/bookings/owner", headers=h)
    assert r.status_code == 200
    assert any(b["id"] == state["booking_id"] for b in r.json())


def test_accept_booking(s):
    h = {"Authorization": f"Bearer {state['owner_token']}"}
    r = s.post(f"{API}/bookings/{state['booking_id']}/accept", headers=h)
    assert r.status_code == 200


def test_accept_already_accepted(s):
    h = {"Authorization": f"Bearer {state['owner_token']}"}
    r = s.post(f"{API}/bookings/{state['booking_id']}/accept", headers=h)
    assert r.status_code == 400


# ---------- Reviews ----------
def test_create_review_after_accept(s):
    h = {"Authorization": f"Bearer {state['customer_token']}"}
    payload = {"chalet_id": state["chalet_id"], "booking_id": state["booking_id"], "rating": 5, "comment": "ممتاز جداً"}
    r = s.post(f"{API}/reviews", json=payload, headers=h)
    assert r.status_code == 200, r.text
    state["review_id"] = r.json()["id"]


def test_review_recomputes_avg_rating(s):
    time.sleep(0.5)
    r = s.get(f"{API}/chalets/{state['chalet_id']}")
    assert r.status_code == 200
    assert r.json()["avg_rating"] == 5.0
    assert r.json()["reviews_count"] == 1


def test_review_invalid_rating(s):
    h = {"Authorization": f"Bearer {state['customer_token']}"}
    r = s.post(f"{API}/reviews", json={"chalet_id": state["chalet_id"], "rating": 9, "comment": "x"}, headers=h)
    assert r.status_code == 400


def test_reviews_list(s):
    r = s.get(f"{API}/reviews/chalet/{state['chalet_id']}")
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_report_review(s):
    h = {"Authorization": f"Bearer {state['customer_token']}"}
    r = s.post(f"{API}/reviews/{state['review_id']}/report", headers=h)
    assert r.status_code == 200


# ---------- Notifications ----------
def test_list_notifications_owner(s):
    h = {"Authorization": f"Bearer {state['owner_token']}"}
    r = s.get(f"{API}/notifications", headers=h)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data and "unread" in data
    # owner should have at least new_booking + new_review
    types = [n["type"] for n in data["items"]]
    assert "new_booking" in types
    state["notif_id"] = data["items"][0]["id"]


def test_mark_notification_read(s):
    h = {"Authorization": f"Bearer {state['owner_token']}"}
    r = s.post(f"{API}/notifications/{state['notif_id']}/read", headers=h)
    assert r.status_code == 200


def test_mark_all_read(s):
    h = {"Authorization": f"Bearer {state['customer_token']}"}
    r = s.post(f"{API}/notifications/read-all", headers=h)
    assert r.status_code == 200


# ---------- Admin ----------
def test_admin_stats(s):
    h = {"Authorization": f"Bearer {state['admin_token']}"}
    r = s.get(f"{API}/admin/stats", headers=h)
    assert r.status_code == 200
    assert "users" in r.json()


def test_admin_chalets(s):
    h = {"Authorization": f"Bearer {state['admin_token']}"}
    r = s.get(f"{API}/admin/chalets", headers=h)
    assert r.status_code == 200


def test_admin_feature_chalet(s):
    h = {"Authorization": f"Bearer {state['admin_token']}"}
    r = s.post(f"{API}/admin/chalets/{state['chalet_id']}/feature", params={"featured": True}, headers=h)
    assert r.status_code == 200
    assert r.json()["featured"] is True


def test_admin_set_status(s):
    h = {"Authorization": f"Bearer {state['admin_token']}"}
    r = s.post(f"{API}/admin/chalets/{state['chalet_id']}/status", params={"status": "approved"}, headers=h)
    assert r.status_code == 200


def test_admin_users(s):
    h = {"Authorization": f"Bearer {state['admin_token']}"}
    r = s.get(f"{API}/admin/users", headers=h)
    assert r.status_code == 200


def test_admin_bookings(s):
    h = {"Authorization": f"Bearer {state['admin_token']}"}
    r = s.get(f"{API}/admin/bookings", headers=h)
    assert r.status_code == 200


def test_admin_reviews(s):
    h = {"Authorization": f"Bearer {state['admin_token']}"}
    r = s.get(f"{API}/admin/reviews", headers=h)
    assert r.status_code == 200


def test_admin_delete_review(s):
    h = {"Authorization": f"Bearer {state['admin_token']}"}
    r = s.delete(f"{API}/reviews/{state['review_id']}", headers=h)
    assert r.status_code == 200


def test_customer_cannot_admin_stats(s):
    h = {"Authorization": f"Bearer {state['customer_token']}"}
    r = s.get(f"{API}/admin/stats", headers=h)
    assert r.status_code == 403


# ---------- Cleanup ----------
def test_zz_cleanup_cancel_and_delete(s):
    # Customer cancels (already accepted, allowed)
    h_c = {"Authorization": f"Bearer {state['customer_token']}"}
    s.post(f"{API}/bookings/{state['booking_id']}/cancel", headers=h_c)
    # Owner deletes chalet
    h_o = {"Authorization": f"Bearer {state['owner_token']}"}
    r = s.delete(f"{API}/chalets/{state['chalet_id']}", headers=h_o)
    assert r.status_code == 200
